import { Tokens } from '@valenced/discord/common/tokens'
import { Design } from '@valenced/discord/design'
import { lookupModule } from '@valenced/modules/finders'
import {
	createFilterGenerator,
	withProps,
} from '@valenced/modules/finders/filters'
import type { ComponentProps, ComponentType, ReactNode } from 'react'

export interface User {
	id: string
	username: string
	globalName?: string | null
}

export interface Channel {
	id: string
	name: string
	type: number
	guild_id?: string | null
	recipients?: string[]
}

export interface Message {
	id: string
	channel_id: string
	author: User
}

/** Discord's immutable per-channel message list. */
export interface ChannelMessages {
	channelId: string
	ready: boolean
	loadingMore: boolean
	hasMoreBefore: boolean
	toArray(): Message[]
	merge(messages: Message[]): ChannelMessages
	mutate(changes: Partial<ChannelMessages>): ChannelMessages
	jumpToMessage(options: { messageId: string; flash: boolean }): ChannelMessages
	jumpSequenceId: number
}

export interface PendingReply {
	message: Message
	channel: Channel
}

export interface MessageActions {
	fetchMessages(options: {
		channelId: string
		limit: number
		before?: string
		messageId?: string
	}): unknown
	sendMessage(channelId: string, ...rest: unknown[]): unknown
	getSendMessageOptionsForReply(reply: PendingReply): object
	editMessage(channelId: string, messageId: string, ...rest: unknown[]): unknown
	jumpToMessage(options: { channelId: string; messageId: string }): unknown
	jumpToPresent(channelId: string, ...rest: unknown[]): unknown
}

export interface RowInput {
	message: Message
	isFirst: boolean
}

export interface Row {
	message?: { timestamp?: string; opTagText?: string | null }
}

export interface RowManager {
	prototype: { generate(input: RowInput): Row }
}

export type HttpMethod = (request: string | { url: string }) => Promise<unknown>
export type HttpClient = Record<
	'get' | 'post' | 'put' | 'patch' | 'del',
	HttpMethod
>

// Looked up on first use: plugin scripts load before Discord's modules.
function lazy<T extends Record<string, any>>(...props: string[]) {
	let cached: T | undefined
	return () => {
		cached ??= lookupModule(withProps<T>(...(props as [string])))[0]
		if (!cached) throw new Error(`Feeds Page: ${props[0]} is unavailable.`)
		return cached
	}
}

export const router = lazy<{ transitionTo(path: string): void }>(
	'transitionTo',
	'transitionToGuild',
)
export const constants = lazy<{ Permissions: Record<string, bigint> }>(
	'Permissions',
	'ChannelTypes',
)
/** Matches a module whose default export is a memo of a component with this name. */
export const withMemoName = createFilterGenerator<[name: string]>(
	([name], _, exports) => exports?.default?.type?.name === name,
	([name]) => `dev.benjii.feeds-page.memoName(${name})`,
)

// Discord 351 accepts icon elements; the API declaration only lists asset IDs.
export const iconButton = () =>
	Design.IconButton as ComponentType<
		Omit<ComponentProps<typeof Design.IconButton>, 'icon'> & { icon: ReactNode }
	>

type Colors = typeof Tokens.default.colors
type StyleSheet = Parameters<typeof Design.createStyles>[0]

// Plugin scripts load before Discord's design system and tokens, so styles are created on first render.
export function lazyStyles<T extends StyleSheet>(
	create: (colors: Colors) => T,
) {
	let useStyles: (() => T) | undefined
	return () => {
		useStyles ??= Design.createStyles(create(Tokens.default.colors)) as () => T
		return useStyles()
	}
}
