import { getModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import { getModules } from '@valenced/modules/finders'
import {
	createFilterGenerator,
	withName,
} from '@valenced/modules/finders/filters'
import { after, instead } from '@valenced/patcher'
import { beforeJSX } from '@valenced/react/jsx-runtime'
import {
	Children,
	Component,
	cloneElement,
	Fragment,
	isValidElement,
	useContext,
	useSyncExternalStore,
} from 'react'
import { closeOptions, Overlay, stopScramble } from './overlay'
import {
	getVersion,
	isActive,
	scrambleAs,
	scrambleChildren,
	scrambleRow,
	scrambleString,
	subscribeScramble,
	toggleReveal,
	Unscrambled,
} from './scramble'
import Settings from './settings'
import { configureStorage, defaults, loadSettings } from './storage'
import type { ReactNode } from 'react'
import type { ScramblerSettings } from './storage'

type Props = Record<string, any>
type Render = (props: Props, ...rest: unknown[]) => ReactNode

// Matches a module whose default export is React.memo(<function named `name`>).
const withMemoOf = createFilterGenerator<[name: string]>(
	([name], _id, exports) =>
		(exports as { default?: { type?: { name?: string } } } | undefined)?.default
			?.type?.name === name,
	([name]) => `screenshot-scrambler.memoOf(${name})`,
)

// DM list previews put a markup renderer inside the Text, and its output never
// reaches a Text patch, so scramble the markup it is given.
function withScrambledMarkup(node: unknown) {
	if (!isValidElement<Props>(node) || typeof node.props.markup !== 'string')
		return node
	return cloneElement(node, {
		markup: scrambleAs(node.props.markup, 'messages'),
	})
}

// Passes through untouched unless scrambling is active.
function scrambledText(
	this: unknown,
	args: Parameters<Render>,
	original: Render,
): ReactNode {
	useSyncExternalStore(subscribeScramble, getVersion)
	const unscrambled = useContext(Unscrambled)
	const [props, ...rest] = args
	if (!isActive() || unscrambled) return Reflect.apply(original, this, args)
	const children = scrambleChildren(props.children)
	return Reflect.apply(original, this, [
		{
			...props,
			children: Array.isArray(children)
				? children.map(withScrambledMarkup)
				: withScrambledMarkup(children),
		},
		...rest,
	])
}

// React Native's Text renders almost every string outside the chat list. Discord's own
// Text components capture it before plugins start, so patch it while this script is
// evaluated.
getModules(
	withName('TextImpl'),
	module => {
		instead(module as { default: Render }, 'default', scrambledText)
	},
	{ returnNamespace: true },
)

// While scrambled, tapping a message reveals it like a spoiler instead of opening it.
function withRevealOnTap(node: ReactNode): ReactNode {
	if (!isValidElement<Props>(node)) return node
	const onTapMessage = node.props.onTapMessage
	if (typeof onTapMessage === 'function')
		return cloneElement(node, {
			onTapMessage: (event: { nativeEvent?: Props }) => {
				const id = event?.nativeEvent?.messageId
				if (isActive() && id != null) toggleReveal(String(id))
				else onTapMessage(event)
			},
		})
	if (node.type !== Fragment) return node
	return cloneElement(
		node,
		undefined,
		Children.map(node.props.children, withRevealOnTap),
	)
}

class OverlayBoundary extends Component<{ children: ReactNode }> {
	state = { failed: false }
	static getDerivedStateFromError() {
		return { failed: true }
	}
	render() {
		return this.state.failed ? null : this.props.children
	}
}

export default plugin<{ jsonStorage: ScramblerSettings }>({
	jsonStorage: { load: true, default: defaults },
	SettingsComponent: Settings,
	stop({ plugin }) {
		plugin.requireReload()
	},
	start({ cleanup, jsonStorage, plugin }) {
		if (plugin.startedLate) {
			plugin.requireReload()
			return
		}
		configureStorage(jsonStorage)
		void loadSettings().catch(error => plugin.reportError(error))
		cleanup(() => {
			stopScramble()
			closeOptions()
		})

		// Discord's design Text (server, channel and category names) renders the native
		// text view directly instead of going through React Native's Text.
		cleanup(
			getModuleWithImportedPath<{ Text: Render }>(
				'design/components/Text/native/Text.tsx',
				module => {
					cleanup(instead(module, 'Text', scrambledText))
				},
			),
		)

		// Bios and pronouns are free text, so they are never in the dictionary.
		for (const [name, prop] of [
			['BioText', 'bio'],
			['UserProfilePrimaryInfo', 'pronouns'],
		] as const)
			cleanup(
				getModules(
					withName(name),
					module => {
						cleanup(
							instead(
								module as { default: Render },
								'default',
								function (this: unknown, args, original) {
									useSyncExternalStore(subscribeScramble, getVersion)
									const [props, ...rest] = args
									const text = props[prop]
									if (!isActive() || typeof text !== 'string')
										return Reflect.apply(original, this, args)
									return Reflect.apply(original, this, [
										{ ...props, [prop]: scrambleAs(text, 'statuses') },
										...rest,
									])
								},
							),
						)
					},
					{ returnNamespace: true },
				),
			)

		// The chat screen keeps its own reference to the input, so swap it where the
		// element is created to scramble the "Message @name" placeholder.
		cleanup(
			getModules(
				withName('ChatInputNativeComponent'),
				module => {
					const ChatInput = (module as { default: Render }).default
					function ScrambledChatInput(props: Props) {
						useSyncExternalStore(subscribeScramble, getVersion)
						const { placeholder } = props
						return ChatInput(
							typeof placeholder === 'string'
								? { ...props, placeholder: scrambleString(placeholder) }
								: props,
						)
					}
					cleanup(
						beforeJSX(ChatInput, ([, props, key]) => [
							ScrambledChatInput,
							props,
							key,
						]),
					)
				},
				{ returnNamespace: true },
			),
		)

		// Chat messages are native rows built from data.
		cleanup(
			getModules(
				withName('RowManager'),
				module => {
					const proto = (
						module as {
							default: { prototype: { generate(...args: unknown[]): unknown } }
						}
					).default.prototype
					cleanup(after(proto, 'generate', row => scrambleRow(row)))
				},
				{ returnNamespace: true },
			),
		)

		// The chat only rebuilds rows when its options change. Nudge the width by a
		// fraction of a pixel on every toggle, and make taps reveal a message.
		cleanup(
			getModules(
				withMemoOf('MessagesRenderer'),
				module => {
					const memo = (module as { default: { type: Render } }).default
					cleanup(
						instead(memo, 'type', function (this: unknown, args, original) {
							const version = useSyncExternalStore(
								subscribeScramble,
								getVersion,
							)
							const [props, ...rest] = args as [Props, ...unknown[]]
							const width = props.containerWidth
							const result = Reflect.apply(original, this, [
								typeof width === 'number'
									? { ...props, containerWidth: width + (version % 2) * 0.001 }
									: props,
								...rest,
							]) as ReactNode
							return withRevealOnTap(result)
						}),
					)
				},
				{ returnNamespace: true },
			),
		)

		cleanup(
			getModules(
				withName('AppContainer'),
				module => {
					cleanup(
						after(
							module as { default: (...args: unknown[]) => ReactNode },
							'default',
							result => (
								<Fragment>
									{result}
									<OverlayBoundary>
										<Overlay />
									</OverlayBoundary>
								</Fragment>
							),
						),
					)
				},
				{ returnNamespace: true },
			),
		)
	},
})
