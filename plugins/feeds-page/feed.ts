import { Stores } from '@valenced/discord/flux'
import { useEffect, useState } from 'react'
import type { JsonStorage } from '@valenced/json-storage'
import type {
	Channel,
	ChannelMessages,
	Message,
	PendingReply,
	User,
} from './discord'

export interface Settings {
	channels: string[]
}

export const defaults: Settings = { channels: [] }

interface ChangeStore {
	addChangeListener(listener: () => void): void
	removeChangeListener(listener: () => void): void
	emitChange(): void
}

// Getters: stores can't be looked up before Discord's init phase, when this file loads.
export const stores = {
	get messages() {
		return Stores.MessageStore as unknown as ChangeStore & {
			getMessages(channelId: string): ChannelMessages
			getMessage(channelId: string, id: string): Message | undefined
		}
	},
	get channels() {
		return Stores.ChannelStore as unknown as ChangeStore & {
			getChannel(id: string): Channel | undefined
		}
	},
	get guilds() {
		return Stores.GuildStore as unknown as {
			getGuild(id: string): { name: string } | undefined
		}
	},
	get users() {
		return Stores.UserStore as unknown as {
			getUser(id: string): User | undefined
		}
	},
	get permissions() {
		return Stores.PermissionStore as unknown as {
			can(permission: bigint, channel: Channel): boolean
		}
	},
	get selected() {
		return Stores.SelectedChannelStore as unknown as {
			getChannelId(): string | undefined
		}
	},
	get replies() {
		return Stores.PendingReplyStore as unknown as ChangeStore & {
			getPendingReply(channelId: string): PendingReply | undefined
		}
	},
}

let storage: JsonStorage<Settings> | undefined
export function setStorage(value: JsonStorage<Settings> | undefined) {
	storage = value
}

export function getChannels(): string[] {
	return storage?.cache?.channels ?? defaults.channels
}

export function useChannels(): string[] {
	return storage?.use()?.channels ?? defaults.channels
}

export function isInFeed(id: string) {
	return getChannels().includes(id)
}

export function toggleFeed(id: string) {
	const channels = getChannels()
	storage?.set({
		channels: channels.includes(id)
			? channels.filter((channel: string) => channel !== id)
			: [...channels, id],
	})
}

export function compareIds(a: string, b: string) {
	return a.length - b.length || (a < b ? -1 : a > b ? 1 : 0)
}

export function channelLabel(channel: Channel) {
	if (channel.guild_id)
		return {
			name: `#${channel.name}`,
			place: stores.guilds.getGuild(channel.guild_id)?.name,
		}
	const names = (channel.recipients ?? []).map(id => {
		const user = stores.users.getUser(id)
		return user?.globalName || user?.username || 'Unknown'
	})
	return { name: channel.name || names.join(', '), place: 'Direct Messages' }
}

export function useStoreVersion(store: ChangeStore) {
	const [version, setVersion] = useState(0)
	useEffect(() => {
		const listener = () => setVersion(value => value + 1)
		store.addChangeListener(listener)
		return () => store.removeChangeListener(listener)
	}, [store])
	return version
}
