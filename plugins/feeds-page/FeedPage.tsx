import { Design } from '@valenced/discord/design'
import { RootNavigationRef } from '@valenced/discord/modules/main_tabs_v2'
import { useSyncExternalStore } from 'react'
import { View } from 'react-native'
import { lazyStyles, router } from './discord'
import { channelLabel, useChannels } from './feed'
import {
	FEED_ID,
	feedChannel,
	isFeedOpen,
	prefetch,
	subscribeTarget,
} from './virtual'
import type { Channel } from './discord'

const useStyles = lazyStyles(() => ({
	// Fills the header like Discord's channel title, so the search button sits on the right.
	title: { flex: 1, minWidth: 0 },
}))

interface Navigation {
	navigate(route: string, params: object): void
	goBack(): void
}

const navigation = () =>
	RootNavigationRef.getRootNavigationRef() as unknown as Navigation

/** Opens Discord's own channel screen on the feed. */
export function openFeed() {
	prefetch()
	navigation().navigate('channel', {
		channelId: FEED_ID,
		guildId: feedChannel()?.guild_id ?? undefined,
	})
}

export function closeFeed() {
	if (isFeedOpen()) navigation().goBack()
}

export function openChannel(channel: Channel, messageId?: string) {
	router().transitionTo(
		`/channels/${channel.guild_id ?? '@me'}/${channel.id}${messageId ? `/${messageId}` : ''}`,
	)
}

function label(channel: Channel) {
	const { name, place } = channelLabel(channel)
	return place ? `${name} · ${place}` : name
}

/** Replaces the channel title in Discord's header while the feed is shown. */
export function FeedHeader() {
	const styles = useStyles()
	useChannels()
	const target = useSyncExternalStore(subscribeTarget, feedChannel)
	return (
		<View
			accessible
			accessibilityLabel={
				target
					? `Feed, sending to ${label(target)}. Hold the send button to change channel`
					: 'Feed. Add channels from their long-press menu'
			}
			style={styles.title}
		>
			<Design.Text variant="heading-md/bold" lineClamp={1}>
				Feed
			</Design.Text>
			<Design.Text variant="text-xs/medium" color="text-muted" lineClamp={1}>
				{target
					? `Sending to ${label(target)}`
					: 'Long-press a channel to add it'}
			</Design.Text>
		</View>
	)
}
