import { getStore, onFluxEventDispatched } from '@valenced/discord/flux'
import { getModules } from '@valenced/modules/finders'
import { withName, withProps } from '@valenced/modules/finders/filters'
import { after, instead } from '@valenced/patcher'
import { constants } from './discord'
import { channelLabel, compareIds, getChannels, stores } from './feed'
import type { PluginCleanupApi } from '@valenced/plugins/types'
import type {
	Channel,
	ChannelMessages,
	HttpClient,
	Message,
	MessageActions,
	PendingReply,
	RowManager,
} from './discord'

/**
 * The feed renders Discord's own chat view for this made-up channel. Its messages are copies of
 * the feed channels' messages, and anything sent to it is routed to each message's real channel.
 */
export const FEED_ID = '1000000000000000001'

const PAGE = 50

const feed = {
	// A message the feed's list should jump to, and a sequence the chat view sees change per jump.
	jump: undefined as { messageId: string; sequence: number } | undefined,
	target: undefined as string | undefined,
	reply: undefined as string | undefined,
	onTarget: new Set<() => void>(),
}

// Copies keep row identity stable between merges and mark rows that belong to the feed.
const copies = new WeakMap<Message, Message>()
const feedMessages = new WeakSet<Message>()
let merged:
	| {
			sources: ChannelMessages[]
			jump: typeof feed.jump
			value: ChannelMessages
			order: Message[]
			index: Map<string, number>
			limiting: string[]
	  }
	| undefined
const labels = new Map<string, string>()

// Unpatched lookups, filled in as each store or module is found.
const originals = {} as {
	getMessages(channelId: string): ChannelMessages
	getChannel(id: string): Channel | undefined
	fetchMessages: MessageActions['fetchMessages']
}

function copyOf(message: Message) {
	let copy = copies.get(message)
	if (!copy) {
		copy = Object.assign(
			Object.create(Object.getPrototypeOf(message)) as Message,
			message,
		)
		copies.set(message, copy)
		feedMessages.add(copy)
	}
	return copy
}

/**
 * Newest window across the feed channels: messages older than the oldest loaded message of a
 * channel that still has more history are left out, so the merged order never has gaps.
 */
function getMerged() {
	const sources = getChannels().map(id => originals.getMessages(id))
	if (
		merged &&
		merged.sources.length === sources.length &&
		merged.sources.every((source, i) => source === sources[i]) &&
		merged.jump === feed.jump
	)
		return merged
	let cutoff: string | undefined
	let limiting: string[] = []
	for (const source of sources) {
		const messages = source.toArray()
		if (!source.ready || !source.hasMoreBefore || !messages.length) continue
		const oldest = messages[0].id
		const order = cutoff ? compareIds(oldest, cutoff) : 1
		if (order > 0) {
			cutoff = oldest
			limiting = [source.channelId]
		} else if (order === 0) limiting.push(source.channelId)
	}
	const order = sources
		.flatMap(source => (source.ready ? source.toArray() : []))
		.filter(message => !cutoff || compareIds(message.id, cutoff) >= 0)
		.sort((a, b) => compareIds(a.id, b.id))
		.map(copyOf)
	// Discord's own empty list for the feed id; it is never fetched, so it only holds the merge.
	let value = originals
		.getMessages(FEED_ID)
		.merge(order)
		.mutate({
			ready: sources.every(source => source.ready),
			loadingMore: sources.some(source => source.loadingMore),
			hasMoreBefore: limiting.length > 0,
		})
	const { jump } = feed
	if (jump && order.some(message => message.id === jump.messageId))
		value = value
			.jumpToMessage({ messageId: jump.messageId, flash: true })
			.mutate({ jumpSequenceId: jump.sequence })
	merged = {
		sources,
		jump,
		value,
		order,
		index: new Map(order.map((message, i) => [message.id, i])),
		limiting,
	}
	return merged
}

let jumps = 1000

/** Scrolls the feed to one of its messages and flashes it, like a jump in a channel. */
function jumpInFeed(messageId: string) {
	if (!getMerged().index.has(messageId)) return false
	feed.jump = { messageId, sequence: ++jumps }
	stores.messages.emitChange()
	return true
}

function channelOfMessage(id: string) {
	const i = getMerged().index.get(id)
	return i === undefined ? undefined : getMerged().order[i].channel_id
}

function labelFor(channelId: string) {
	let label = labels.get(channelId)
	if (!label) {
		const channel = originals.getChannel(channelId)
		if (!channel) return
		const { name, place } = channelLabel(channel)
		label = place ? `${name} · ${place}` : name
		labels.set(channelId, label)
	}
	return label
}

/** The channel new messages go to: the one picked in the header, else the first one that allows sending. */
export function sendTarget() {
	const channels = getChannels()
	if (feed.target && channels.includes(feed.target)) return feed.target
	const { SEND_MESSAGES } = constants().Permissions
	return (
		channels.find(id => {
			const channel = originals.getChannel(id)
			return channel && stores.permissions.can(SEND_MESSAGES, channel)
		}) ?? channels[0]
	)
}

export function setTarget(id: string) {
	feed.target = id
	for (const listener of feed.onTarget) listener()
	// The feed channel is shaped like its target; the chat input re-reads it on a store change.
	stores.channels.emitChange()
}

export function subscribeTarget(listener: () => void) {
	feed.onTarget.add(listener)
	return () => {
		feed.onTarget.delete(listener)
	}
}

export function isFeedOpen() {
	return stores.selected.getChannelId() === FEED_ID
}

/** Loads the newest messages of feed channels that have none yet. */
export function prefetch() {
	labels.clear()
	for (const channelId of getChannels()) {
		const loaded = originals.getMessages(channelId)
		if (!loaded.ready && !loaded.loadingMore)
			originals.fetchMessages({ channelId, limit: PAGE })
	}
}

export function feedChannel() {
	return originals.getChannel(sendTarget() ?? '')
}

function loadOlder() {
	for (const channelId of getMerged().limiting) {
		const loaded = originals.getMessages(channelId)
		if (loaded.loadingMore || !loaded.hasMoreBefore) continue
		originals.fetchMessages({
			channelId,
			limit: PAGE,
			before: loaded.toArray()[0]?.id,
		})
	}
}

export function installVirtualChannel(
	cleanup: PluginCleanupApi,
	onJump: (channel: Channel, messageId: string) => void,
) {
	cleanup(
		getStore<{ getChannel(id: string): Channel | undefined }>(
			'ChannelStore',
			store => {
				const proto: typeof store = Object.getPrototypeOf(store)
				const getChannel = proto.getChannel
				originals.getChannel = id => Reflect.apply(getChannel, store, [id])
				let base: Channel | undefined
				let fake: Channel | undefined
				cleanup(
					instead(proto, 'getChannel', function (args, original) {
						if (args[0] !== FEED_ID) return Reflect.apply(original, this, args)
						// Shaped like the channel being sent to, so the input reads "Message #name".
						const target = Reflect.apply(original, this, [sendTarget()])
						if (target && target !== base) {
							base = target
							fake = Object.assign(
								Object.create(Object.getPrototypeOf(target)) as Channel,
								target,
								{ id: FEED_ID },
							)
						}
						return fake
					}),
				)
			},
		),
		getStore<{
			getMessages(channelId: string): ChannelMessages
			getMessage(channelId: string, id: string): Message | undefined
		}>('MessageStore', store => {
			const proto = Object.getPrototypeOf(store)
			const getMessages = proto.getMessages
			originals.getMessages = id => Reflect.apply(getMessages, store, [id])
			cleanup(
				instead(proto, 'getMessages', function (args, original) {
					return args[0] === FEED_ID
						? getMerged().value
						: Reflect.apply(original, this, args)
				}),
				instead(proto, 'getMessage', function (args, original) {
					if (args[0] !== FEED_ID) return Reflect.apply(original, this, args)
					const i = getMerged().index.get(args[1])
					return i === undefined ? undefined : getMerged().order[i]
				}),
			)
		}),
		getStore<{ getPendingReply(channelId: string): PendingReply | undefined }>(
			'PendingReplyStore',
			store => {
				cleanup(
					instead(
						Object.getPrototypeOf(store),
						'getPendingReply',
						function (args, original) {
							if (args[0] !== FEED_ID)
								return Reflect.apply(original, this, args)
							return feed.reply
								? Reflect.apply(original, this, [feed.reply])
								: undefined
						},
					),
				)
			},
		),
		// Replies are kept on the replied message's channel; the feed's input shows the newest one.
		onFluxEventDispatched<{ channel?: Channel; message?: Message }>(
			'CREATE_PENDING_REPLY',
			payload => {
				if (!isFeedOpen() || !payload.message) return payload
				const channelId = payload.message.channel_id
				if (!getChannels().includes(channelId)) return payload
				if (payload.channel?.id === FEED_ID)
					payload.channel = originals.getChannel(channelId) ?? payload.channel
				feed.reply = channelId
				return payload
			},
		),
		onFluxEventDispatched<{ channelId?: string }>(
			'DELETE_PENDING_REPLY',
			payload => {
				if (payload.channelId === FEED_ID) {
					if (!feed.reply) return payload
					payload.channelId = feed.reply
				}
				if (payload.channelId === feed.reply) feed.reply = undefined
				return payload
			},
		),
		// Edits start on the message's own channel; while the feed is open its input takes them.
		onFluxEventDispatched<{ channelId?: string; messageId?: string }>(
			'MESSAGE_START_EDIT',
			payload => {
				if (
					isFeedOpen() &&
					payload.messageId &&
					getMerged().index.has(payload.messageId)
				)
					payload.channelId = FEED_ID
				return payload
			},
		),
		// Never restore the feed as the last channel: it only exists while this plugin runs.
		...(['SAVE_LAST_ROUTE', 'SAVE_LAST_NON_VOICE_ROUTE'] as const).map(type =>
			onFluxEventDispatched<{ path?: string }>(type, payload =>
				payload.path?.includes(FEED_ID) ? undefined : payload,
			),
		),
		getModules(
			withProps<MessageActions>(
				'sendMessage',
				'fetchMessages',
				'getSendMessageOptionsForReply',
			),
			actions => {
				const fetchMessages = actions.fetchMessages
				originals.fetchMessages = options =>
					Reflect.apply(fetchMessages, actions, [options])
				cleanup(
					instead(actions, 'fetchMessages', function (args, original) {
						if (args[0]?.channelId !== FEED_ID)
							return Reflect.apply(original, this, args)
						if (args[0].before) loadOlder()
						return Promise.resolve(true)
					}),
					instead(actions, 'sendMessage', function (args, original) {
						if (args[0] === FEED_ID) {
							const options = args[3] as
								| { messageReference?: { channel_id?: string } }
								| undefined
							const target =
								options?.messageReference?.channel_id ?? sendTarget()
							if (!target) return Promise.resolve()
							args[0] = target
						}
						return Reflect.apply(original, this, args)
					}),
					instead(actions, 'editMessage', function (args, original) {
						if (args[0] === FEED_ID) {
							const channelId = channelOfMessage(args[1])
							if (!channelId) return Promise.resolve()
							args[0] = channelId
						}
						return Reflect.apply(original, this, args)
					}),
					instead(actions, 'jumpToMessage', function (args, original) {
						if (args[0]?.channelId !== FEED_ID)
							return Reflect.apply(original, this, args)
						if (jumpInFeed(args[0].messageId)) return
						// Messages outside the loaded feed open their own channel on top of it.
						const channel = originals.getChannel(
							channelOfMessage(args[0].messageId) ?? '',
						)
						if (channel) onJump(channel, args[0].messageId)
					}),
					instead(actions, 'jumpToPresent', function (args, original) {
						if (args[0] === FEED_ID) {
							feed.jump = undefined
							stores.messages.emitChange()
						}
						return Reflect.apply(original, this, args)
					}),
				)
			},
		),
		getModules(
			withProps<{
				handleAddOrRemoveReaction(
					messageId: string,
					channel: Channel,
					...rest: unknown[]
				): unknown
			}>('handleAddOrRemoveReaction'),
			chat => {
				cleanup(
					instead(chat, 'handleAddOrRemoveReaction', function (args, original) {
						if (args[1]?.id === FEED_ID) {
							const channel = originals.getChannel(
								channelOfMessage(args[0]) ?? '',
							)
							if (!channel) return
							args[1] = channel
						}
						return Reflect.apply(original, this, args)
					}),
				)
			},
		),
		// Feed rows: start a new group when the channel changes and tag headers with their origin.
		getModules(withName<RowManager>('RowManager'), Manager => {
			cleanup(
				instead(Manager.prototype, 'generate', function (args, original) {
					const input = args[0]
					if (!input?.message || !feedMessages.has(input.message))
						return Reflect.apply(original, this, args)
					const { order, index } = getMerged()
					const older = order[(index.get(input.message.id) ?? 0) - 1]
					if (
						!input.isFirst &&
						older &&
						older.channel_id !== input.message.channel_id
					)
						args[0] = { ...input, isFirst: true }
					const row = Reflect.apply(original, this, args)
					if (row?.message?.timestamp)
						row.message.opTagText = labelFor(input.message.channel_id) ?? null
					return row
				}),
			)
		}),
		// Screens opened from the feed, such as search with its members list, show the channel being
		// sent to. Opening the feed itself is the one route that keeps the feed's id.
		getModules(
			withProps<{
				CommonActions: {
					navigate(...args: unknown[]): {
						payload?: { name?: string; params?: { channelId?: string } }
					}
				}
				useLinkTo: unknown
			}>('CommonActions', 'useLinkTo'),
			navigation => {
				cleanup(
					after(navigation.CommonActions, 'navigate', action => {
						const payload = action?.payload
						if (
							payload?.params?.channelId !== FEED_ID ||
							payload.name === 'channel'
						)
							return action
						const target = sendTarget()
						if (target)
							payload.params = { ...payload.params, channelId: target }
						return action
					}),
				)
			},
		),
		// Message links (such as a tapped reply) for a feed channel jump within the feed.
		getModules(
			withProps<{
				transitionTo(path: string, ...rest: unknown[]): unknown
				transitionToGuild: unknown
			}>('transitionTo', 'transitionToGuild'),
			router => {
				cleanup(
					instead(router, 'transitionTo', function (args, original) {
						const [, channelId, messageId] =
							/^\/channels\/[^/]+\/(\d+)\/(\d+)/.exec(String(args[0])) ?? []
						if (
							messageId &&
							isFeedOpen() &&
							getChannels().includes(channelId) &&
							jumpInFeed(messageId)
						)
							return
						return Reflect.apply(original, this, args)
					}),
				)
			},
		),
		// Last line of defence: requests for the made-up channel go to a real one, or nowhere.
		getModules(
			withProps<HttpClient & { HTTP: HttpClient; getAPIBaseURL: unknown }>(
				'HTTP',
				'getAPIBaseURL',
			),
			http => {
				const route = (method: string, request: string | { url: string }) => {
					const url = typeof request === 'string' ? request : request?.url
					const path = `/channels/${FEED_ID}`
					if (!url?.includes(path)) return request
					const messageId = /\/messages\/(\d+)/.exec(url)?.[1]
					const channelId = messageId
						? channelOfMessage(messageId)
						: method === 'get'
							? undefined
							: sendTarget()
					if (!channelId) return
					const routed = url.replace(path, `/channels/${channelId}`)
					return typeof request === 'string'
						? routed
						: { ...request, url: routed }
				}
				for (const target of [http, http.HTTP] as HttpClient[])
					for (const method of ['get', 'post', 'put', 'patch', 'del'] as const)
						if (typeof target?.[method] === 'function')
							cleanup(
								instead(target, method, function (args, original) {
									const request = route(method, args[0])
									if (!request)
										return Promise.reject(
											new Error('Feeds Page: request has no real channel.'),
										)
									args[0] = request
									return Reflect.apply(original, this, args)
								}),
							)
			},
		),
	)
}
