import { Design } from '@valenced/discord/design'
import { getModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import { getModules } from '@valenced/modules/finders'
import { withName } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'
import { insteadJSX } from '@valenced/react/jsx-runtime'
import { lookupGeneratedIconComponent } from '@valenced/utils/discord'
import { createElement, isValidElement } from 'react'
import { iconButton, withMemoName } from './discord'
import { closeFeed, FeedHeader, openChannel, openFeed } from './FeedPage'
import { defaults, isInFeed, setStorage, toggleFeed } from './feed'
import { makeSendButton } from './SendWheel'
import SettingsComponent from './Settings'
import { FEED_ID, installVirtualChannel } from './virtual'
import type { FC, ReactElement, ReactNode } from 'react'
import type { Channel } from './discord'
import type { Settings } from './feed'

interface SheetProps {
	channel: Channel
	onClose?(): void
}
type Sheet = FC<SheetProps>
type SendButtonProps = {
	channel?: { id: string }
	onSendMessage(): void
	feedsPageInner?: boolean
}
type Element = ReactElement<{ children?: ReactNode }>

function findActionSheet(element: unknown): Element | undefined {
	if (Array.isArray(element)) {
		for (const child of element) {
			const found = findActionSheet(child)
			if (found) return found
		}
		return
	}
	if (!isValidElement<{ children?: ReactNode }>(element)) return
	if (element.type === Design.ActionSheet) return element
	return findActionSheet(element.props.children)
}

function FeedRows({ channel, onClose }: SheetProps) {
	const { ActionSheetRow } = Design
	const inFeed = isInFeed(channel.id)
	const close = (action: () => void) => () => {
		onClose?.()
		action()
	}
	return (
		<ActionSheetRow.Group>
			<ActionSheetRow
				label={inFeed ? 'Remove from Feed' : 'Add to Feed'}
				icon={
					<ActionSheetRow.Icon
						IconComponent={lookupGeneratedIconComponent(
							inFeed ? 'TrashIcon' : 'ChatPlusIcon',
						)}
					/>
				}
				onPress={close(() => toggleFeed(channel.id))}
			/>
			{inFeed && (
				<ActionSheetRow
					label="Open Feed"
					icon={
						<ActionSheetRow.Icon
							IconComponent={lookupGeneratedIconComponent('ChatIcon')}
						/>
					}
					onPress={close(openFeed)}
				/>
			)}
		</ActionSheetRow.Group>
	)
}

export default plugin<{ jsonStorage: Settings }>({
	jsonStorage: { load: true, default: defaults },
	SettingsComponent,
	start({ cleanup, plugin, jsonStorage }) {
		setStorage(jsonStorage)
		cleanup(() => {
			closeFeed()
			setStorage(undefined)
		})
		installVirtualChannel(cleanup, openChannel)
		cleanup(
			getModules(
				// modules/chat_input/native/ChatInputSendButton.tsx
				withMemoName('ChatInputSendButton'),
				module => {
					const Original = (
						module as unknown as { default: FC<SendButtonProps> }
					).default
					const FeedSendButton = makeSendButton(Original)
					cleanup(
						insteadJSX(Original, (args, jsx) =>
							args[1]?.channel?.id === FEED_ID && !args[1].feedsPageInner
								? jsx(FeedSendButton, args[1], args[2])
								: jsx(...args),
						),
					)
				},
				{ returnNamespace: true },
			),
		)
		cleanup(
			getModules(
				// modules/channel/native/ChannelHeader.tsx
				withName<FC<{ channelId: string }>>('ChannelHeader'),
				module =>
					cleanup(
						insteadJSX(
							(module as unknown as { default: FC<{ channelId: string }> })
								.default,
							(args, jsx) =>
								args[1]?.channelId === FEED_ID
									? jsx(FeedHeader, {})
									: jsx(...args),
						),
					),
				{ returnNamespace: true },
			),
		)

		// The exported sheet renders a connected inner sheet; run that inside a wrapper so its hooks keep working.
		const wrappers = new WeakMap<Sheet, Sheet>()
		const wrap = (Inner: Sheet) => {
			let Wrapper = wrappers.get(Inner)
			if (!Wrapper) {
				Wrapper = props => {
					const tree = Inner(props)
					const sheet = findActionSheet(tree)
					if (sheet) {
						const children = [sheet.props.children].flat().filter(Boolean)
						// Directly below Discord's favourites group.
						children.splice(
							Math.min(1, children.length),
							0,
							<FeedRows key="feeds-page" {...props} />,
						)
						sheet.props.children = children
					}
					return tree
				}
				wrappers.set(Inner, Wrapper)
			}
			return Wrapper
		}
		cleanup(
			getModules(
				// modules/channel/native/ChannelLongPressActionSheet.tsx
				withName<Sheet>('ChannelLongPressActionSheet'),
				module =>
					cleanup(
						instead(
							module as unknown as { default: Sheet },
							'default',
							(args, original) => {
								const tree = Reflect.apply(
									original,
									undefined,
									args,
								) as ReactElement<SheetProps> | null
								const Inner = tree?.type
								if (
									!tree ||
									typeof Inner !== 'function' ||
									Inner.name !== 'ChannelLongPressActionSheetConnected'
								)
									return tree
								return createElement(wrap(Inner as Sheet), {
									...tree.props,
									key: tree.key,
								})
							},
						),
					),
				{ returnNamespace: true },
			),
		)

		cleanup(
			getModuleWithImportedPath<{
				default: { type(props: { hasNameplate?: boolean }): ReactNode }
			}>(
				'modules/main_tabs_v2/native/you_bar/YouBarNotificationsButton.tsx',
				module => {
					const FeedIcon = lookupGeneratedIconComponent('ChatIcon')
					const IconButton = iconButton()
					if (typeof module.default?.type !== 'function' || !FeedIcon) {
						plugin.reportError('The You bar feed button is unavailable.')
						return
					}
					cleanup(
						instead(module.default, 'type', function (args, original) {
							const notification = Reflect.apply(original, this, args)
							if (notification == null) return notification
							return (
								<>
									<IconButton
										size="sm"
										variant={
											args[0].hasNameplate ? 'secondary-overlay' : 'tertiary'
										}
										icon={
											<FeedIcon
												size="xs"
												color={args[0].hasNameplate ? 'white' : undefined}
												style={{ width: 18, height: 18 }}
											/>
										}
										accessibilityLabel="Feed"
										onPress={openFeed}
									/>
									{notification}
								</>
							)
						}),
					)
				},
			),
		)
	},
})
