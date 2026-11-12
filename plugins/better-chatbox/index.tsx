import {
	getModuleWithImportedPath,
	lookupModuleWithImportedPath,
} from '@valenced/discord/utils/modules/finders'
import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'
import { isValidElement } from 'react'
import { StyleSheet } from 'react-native'
import ChatboxAvatar from './ChatboxAvatar'
import ChatboxSurface from './ChatboxSurface'
import SettingsComponent, { defaults } from './Settings'
import type { ReactElement, ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import type { AvatarModule, FluxUtils } from './discord'
import type { Settings } from './Settings'

type Memo = { type(...args: unknown[]): ReactNode }
type Element = ReactElement<{
	style?: unknown
	children?: ReactNode
	channel?: { id: string; guild_id?: string }
}>

// Returns the elements from `node` down to the first element matching `match`.
function pathTo(
	node: ReactNode,
	match: (element: Element) => boolean,
	depth = 0,
): Element[] | undefined {
	if (depth > 24 || !node || typeof node !== 'object') return
	if (Array.isArray(node)) {
		for (const child of node) {
			const path = pathTo(child, match, depth)
			if (path) return path
		}
		return
	}
	if (!isValidElement(node)) return
	const element = node as Element
	if (match(element)) return [element]
	const path = pathTo(element.props.children, match, depth + 1)
	return path && [element, ...path]
}

const styleOf = (element: Element): ViewStyle =>
	StyleSheet.flatten(element.props.style as StyleProp<ViewStyle>) ?? {}

function closest(path: Element[], match: (style: ViewStyle) => boolean) {
	for (let i = path.length - 2; i >= 0; i--)
		if (match(styleOf(path[i]))) return i
	return -1
}

const toArray = (children: ReactNode) =>
	Array.isArray(children) ? children : [children]

export default plugin<{ jsonStorage: Settings }>({
	jsonStorage: { load: true, default: defaults },
	SettingsComponent,
	start({ cleanup, plugin, jsonStorage }) {
		// ChatInput is memoised, so mounted chatboxes keep the unpatched render.
		if (plugin.startedLate) {
			plugin.requireReload()
			return
		}
		const onError = (error: unknown) => plugin.reportError(error)
		// Patch ChatInput as soon as it finishes importing, before its first
		// render. Discord requires its dependencies inline, so they are looked
		// up on the first render instead.
		let deps:
			| { actions: Memo; flux: FluxUtils; avatar: AvatarModule }
			| undefined
		const resolve = () => {
			const [actions] = lookupModuleWithImportedPath<{ default: Memo }>(
				'modules/chat_input/native/action_buttons/ChatInputActions.tsx',
			)
			const [flux] = lookupModule(
				withProps<FluxUtils>('useStateFromStoresObject'),
			)
			const [avatar] = lookupModule(
				withProps<AvatarModule>('AvatarSizes', 'getStatusSize'),
			)
			if (actions?.default && flux && avatar)
				return { actions: actions.default, flux, avatar }
		}
		let reported = false
		const report = (message: string) => {
			if (!reported) plugin.reportError(message)
			reported = true
		}
		cleanup(
			getModuleWithImportedPath<{ default: Memo }>(
				'modules/chat_input/native/ChatInput.tsx',
				({ default: chatInput }) => {
					if (typeof chatInput?.type !== 'function') {
						plugin.reportError('The chatbox is unavailable.')
						return
					}
					cleanup(
						instead(chatInput, 'type', function (args, original) {
							const tree = Reflect.apply(original, this, args)
							deps ??= resolve()
							if (!deps) {
								report('The chatbox is unavailable.')
								return tree
							}
							const { actions, flux, avatar } = deps
							const path = pathTo(tree, el => (el.type as unknown) === actions)
							const row = path && closest(path, s => s.flexDirection === 'row')
							const box = path && closest(path, s => s.overflow === 'hidden')
							const channel = path?.at(-1)?.props.channel
							if (!path || !channel || row! < 0 || box! < 0) {
								report('Could not find the chatbox layout.')
								return tree
							}
							// Discord builds these elements fresh on every render.
							path[row!].props.children = [
								<ChatboxAvatar
									key="vc-better-chatbox-avatar"
									channel={channel}
									storage={jsonStorage}
									flux={flux}
									avatar={avatar}
									onError={onError}
								/>,
								...toArray(path[row!].props.children),
							]
							// The avatar spills over the chatbox's edges, so the chatbox
							// stops clipping and its background clips itself instead.
							const boxStyle = styleOf(path[box!])
							path[box!].props.style = [
								path[box!].props.style,
								{ overflow: 'visible' },
							]
							path[box!].props.children = (
								<ChatboxSurface
									storage={jsonStorage}
									radius={
										(typeof boxStyle.borderRadius === 'number'
											? boxStyle.borderRadius
											: 0) - (boxStyle.borderWidth ?? 0)
									}
								>
									{path[box!].props.children}
								</ChatboxSurface>
							)
							return tree
						}),
					)
				},
			),
		)
	},
	stop({ plugin }) {
		plugin.requireReload()
	},
})
