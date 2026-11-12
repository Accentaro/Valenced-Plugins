import { Stores } from '@valenced/discord/flux'
import { RootNavigationRef } from '@valenced/discord/modules/main_tabs_v2'
import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable } from 'react-native'
import { showAccountSheet } from './discord'
import { defaults } from './Settings'
import type { JsonStorage } from '@valenced/json-storage'
import type { AvatarModule, FluxUtils, Store } from './discord'
import type { AvatarAction, Settings } from './Settings'

interface Props {
	channel: { id: string; guild_id?: string }
	storage: JsonStorage<Settings>
	flux: FluxUtils
	avatar: AvatarModule
	onError(error: unknown): void
}

// The avatar sits first in the chatbox row, larger than the chatbox, like the
// avatar in the You bar. It overhangs the chatbox's left edge to cover it,
// and grows upward past the top edge. It can't spill below: Discord's chat
// screen ends just under the chatbox and clips it.
// The row's spacing between items, pulled back while collapsed.
const gap = 8
// How far left of the row's content the avatar starts (row padding + border + a bit).
const overhang = 18
// Height of the row's icon buttons; the avatar takes the same room in the row.
const slot = 26
// How far the avatar sinks into the row's bottom padding.
const sink = 10
// DraftType.ChannelMessage
const channelMessageDraft = 0

export default function ChatboxAvatar({
	channel,
	storage,
	flux,
	avatar: { default: Avatar, AvatarSizes },
	onError,
}: Props) {
	const settings = { ...defaults, ...storage.use() }
	const { UserStore, SelfPresenceStore, DraftStore } = Stores as {
		UserStore: Store<{
			getCurrentUser(): { id: string; avatarDecoration?: unknown } | undefined
		}>
		SelfPresenceStore: Store<{ getStatus(): string }>
		DraftStore: Store<{ getDraft(channelId: string, type: number): string }>
	}
	const { user, status, typing } = flux.useStateFromStoresObject(
		[UserStore, SelfPresenceStore, DraftStore],
		() => ({
			user: UserStore.getCurrentUser(),
			status: SelfPresenceStore.getStatus(),
			typing: !!DraftStore.getDraft(channel.id, channelMessageDraft),
		}),
		[channel.id],
	)

	const collapsed = settings.collapseWhileTyping && typing
	const progress = useRef(new Animated.Value(collapsed ? 1 : 0)).current
	// The avatar's own size, so the layout and animation know where to start.
	const [size, setSize] = useState<{ width: number; height: number }>()
	useEffect(() => {
		Animated.timing(progress, {
			toValue: collapsed ? 1 : 0,
			duration: 200,
			useNativeDriver: false,
		}).start()
	}, [collapsed, progress])

	if (!user) return null

	const run = (action: AvatarAction) => {
		try {
			if (action === 'profile')
				RootNavigationRef.getRootNavigationRef().navigate('you')
			else showAccountSheet(action === 'status')
		} catch (error) {
			onError(error)
		}
	}

	const shrink = (from: number, to = 0) =>
		progress.interpolate({ inputRange: [0, 1], outputRange: [from, to] })

	return (
		<Animated.View
			style={{
				alignSelf: 'flex-end',
				marginTop: size ? -(size.height - slot - sink) : 0,
				marginBottom: -sink,
				marginLeft: shrink(-overhang),
				marginRight: shrink(0, -gap),
				width: size ? shrink(size.width) : undefined,
				opacity: shrink(1),
			}}
		>
			<Pressable
				onLayout={({ nativeEvent: { layout } }) =>
					setSize(size ?? { width: layout.width, height: layout.height })
				}
				accessibilityRole="button"
				accessibilityLabel="Your avatar"
				onPress={() => run(settings.pressAction)}
				onLongPress={() => run(settings.longPressAction)}
			>
				<Avatar
					user={user}
					guildId={channel.guild_id}
					size={AvatarSizes.YOUBAR_60}
					status={settings.showStatus ? status : undefined}
					avatarDecoration={user.avatarDecoration}
					animate={!collapsed}
				/>
			</Pressable>
		</Animated.View>
	)
}
