import { useSyncExternalStore } from 'react'
import type { JsonStorage } from '@valenced/json-storage'

export const CATEGORIES = [
	{
		key: 'names',
		label: 'Names',
		subLabel:
			'Display names, usernames, nicknames, mentions, connections, notes, your email and phone',
	},
	{
		key: 'servers',
		label: 'Servers and channels',
		subLabel: 'Server, channel and group DM names',
	},
	{
		key: 'messages',
		label: 'Messages',
		subLabel: 'Message text, replies and DM previews',
	},
	{
		key: 'statuses',
		label: 'Statuses and activities',
		subLabel: 'Custom statuses, bios, pronouns and what people are playing',
	},
	{
		key: 'timestamps',
		label: 'Timestamps',
		subLabel: 'Message times and "5m" style ages',
	},
	{
		key: 'tags',
		label: 'Tags',
		subLabel: 'Server tags shown next to names',
	},
] as const

export type Category = (typeof CATEGORIES)[number]['key']

export interface ScramblerSettings {
	categories: Record<Category, boolean>
	showButton: boolean
	buttonX: number
	buttonY: number
}

export const defaults: ScramblerSettings = {
	categories: {
		names: true,
		servers: true,
		messages: true,
		statuses: true,
		timestamps: true,
		tags: true,
	},
	showButton: true,
	buttonX: -1,
	buttonY: -1,
}

export let settings = defaults
let storage: JsonStorage<ScramblerSettings> | undefined
const listeners = new Set<() => void>()

function publish() {
	for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

function apply(value: Partial<ScramblerSettings>) {
	settings = {
		...defaults,
		...value,
		categories: { ...defaults.categories, ...value.categories },
	}
}

export function configureStorage(instance: JsonStorage<ScramblerSettings>) {
	storage = instance
	if (instance.cache) apply(instance.cache)
}

export async function loadSettings() {
	if (!storage) return
	const value = storage.cache ?? (await storage.get())
	if (!value) return
	apply(value)
	publish()
}

export function updateSettings(update: Partial<ScramblerSettings>) {
	settings = { ...settings, ...update }
	void storage?.set(settings, true)
	publish()
}

export function useSettings() {
	return useSyncExternalStore(subscribe, () => settings)
}
