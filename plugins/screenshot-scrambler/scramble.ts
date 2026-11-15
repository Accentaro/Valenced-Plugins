import { Stores } from '@valenced/discord/flux'
import { debounce } from '@valenced/utils/callback'
import { createContext } from 'react'
import { settings } from './storage'
import type { Category } from './storage'

// Scramble state. Text components subscribe to `version` so they re-render on toggle.
let active = false
let version = 0
let seed = 0
const listeners = new Set<() => void>()

// The plugin's own UI shares words with channel names, so it opts out.
export const Unscrambled = createContext(false)

export const isActive = () => active
export const getVersion = () => version

export function subscribeScramble(listener: () => void) {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

function publish() {
	version++
	for (const listener of listeners) listener()
}

export function setScrambled(value: boolean) {
	if (active === value) return
	if (value) {
		buildDictionary()
		seed = (Math.random() * 0x7fffffff) | 0
	} else dictionary.clear()
	active = value
	revealed.clear()
	cache.clear()
	publish()
	for (const name of WATCHED_STORES) {
		const store = (Stores as unknown as Record<string, AnyRecord>)[name]!
		if (value) store.addChangeListener(refresh)
		else store.removeChangeListener(refresh)
	}
}

// Members, profiles and notes load while browsing, so keep the dictionary current.
const WATCHED_STORES = [
	'UserStore',
	'GuildMemberStore',
	'UserProfileStore',
	'NoteStore',
]
const refresh = debounce(() => {
	if (!active) return
	buildDictionary()
	cache.clear()
	publish()
}, 500)

// Re-renders with the current categories after they change.
export function rescramble() {
	if (!active) return
	cache.clear()
	publish()
}

// Messages tapped while scrambled show their real content, like a spoiler.
const revealed = new Set<string>()

export function toggleReveal(messageId: string) {
	if (revealed.has(messageId)) revealed.delete(messageId)
	else revealed.add(messageId)
	publish()
}

// Deterministic per string within one session, so the same name jumbles the same way everywhere.
export function jumble(text: string) {
	let h = (seed ^ 0x811c9dc5) >>> 0
	for (let i = 0; i < text.length; i++)
		h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0
	let out = ''
	for (const char of text) {
		const code = char.codePointAt(0)!
		h ^= h << 13
		h ^= h >>> 17
		h ^= h << 5
		h >>>= 0
		const range = SCRIPTS.find(([from, to]) => code >= from && code <= to)
		if (range)
			out += String.fromCharCode(range[0] + (h % (range[1] - range[0] + 1)))
		// Any other letter (accented Latin, Greek, styled "𝕒𝕓𝕔" and so on) becomes a Latin one.
		else if (isLetter(char))
			out += String.fromCharCode(
				(char === char.toUpperCase() && char !== char.toLowerCase() ? 65 : 97) +
					(h % 26),
			)
		else out += char
	}
	return out
}

// Letters are swapped for random letters from the same script.
const SCRIPTS: [number, number][] = [
	[97, 122], // a-z
	[65, 90], // A-Z
	[48, 57], // 0-9
	[0x0430, 0x044f], // Cyrillic lowercase
	[0x0410, 0x042f], // Cyrillic uppercase
	[0x3041, 0x3096], // Hiragana
	[0x30a1, 0x30fa], // Katakana
	[0x4e00, 0x9fff], // CJK ideographs
	[0xac00, 0xd7a3], // Hangul syllables
	[0x05d0, 0x05ea], // Hebrew
	[0x0621, 0x064a], // Arabic
	[0x0905, 0x0939], // Devanagari
	[0x0e01, 0x0e2e], // Thai
]

function isLetter(char: string) {
	const code = char.codePointAt(0)!
	return (
		char.toLowerCase() !== char.toUpperCase() ||
		SCRIPTS.some(([from, to]) => code >= from && code <= to) ||
		(code >= 0x1d400 && code <= 0x1d7ff) || // styled "𝕒𝕓𝕔" and "𝟙𝟚𝟛"
		(code >= 0x1f130 && code <= 0x1f189) // boxed "🄰🅐"
	)
}

const dictionary = new Map<string, Category>()
const messageContents = new Set<string>()
const cache = new Map<string, string>()

// Channel names often start with an emoji and a separator that render outside the text.
function strip(text: string) {
	const chars = Array.from(text.trim())
	let start = 0
	while (start < chars.length && !isLetter(chars[start]!)) start++
	return chars.slice(start).join('')
}

function add(value: unknown, category: Category) {
	if (typeof value !== 'string') return
	for (const key of [value.trim(), strip(value)])
		if (key.length >= 2 && !dictionary.has(key)) dictionary.set(key, category)
}

type AnyRecord = Record<string, any>

function buildDictionary() {
	dictionary.clear()
	messageContents.clear()
	const S = Stores as unknown as Record<string, AnyRecord>
	const me = S.UserStore.getCurrentUser()
	add(me?.email, 'names')
	add(me?.phone, 'names')
	const users = S.UserStore.getUsers() as Record<string, AnyRecord>
	for (const id in users) {
		const user = users[id]!
		add(user.globalName, 'names')
		add(user.username, 'names')
		add(S.RelationshipStore.getNickname(id), 'names')
		add(user.primaryGuild?.tag, 'tags')
		add(user.clan?.tag, 'tags')
		add(S.NoteStore.getNote(id)?.note, 'names')
		for (const account of S.UserProfileStore.getUserProfile(id)
			?.connectedAccounts ?? [])
			add(account.name, 'names')
		for (const activity of S.PresenceStore.getActivities(id) as AnyRecord[])
			for (const key of ['state', 'details', 'name'])
				if (activity.type === 4 ? key === 'state' : key !== 'name')
					add(activity[key], 'statuses')
	}
	const all = S.GuildMemberStore.getMutableAllGuildsAndMembers() as Record<
		string,
		Record<string, AnyRecord>
	>
	for (const guildId in all)
		for (const userId in all[guildId]) add(all[guildId]![userId]!.nick, 'names')
	const guilds = S.GuildStore.getGuilds() as Record<string, AnyRecord>
	for (const id in guilds) {
		add(guilds[id]!.name, 'servers')
		const channels = S.ChannelStore.getMutableGuildChannelsForGuild(
			id,
		) as Record<string, AnyRecord>
		for (const channelId in channels) add(channels[channelId]!.name, 'servers')
	}
	const channelIds = new Set<string>()
	for (const channel of S.ChannelStore.getSortedPrivateChannels() as AnyRecord[]) {
		add(channel.name, 'servers')
		channelIds.add(channel.id)
	}
	const selected = S.SelectedChannelStore.getChannelId() as string | undefined
	if (selected) channelIds.add(selected)
	for (const id of channelIds)
		for (const message of S.MessageStore.getMessages(
			id,
		).toArray() as AnyRecord[])
			if (typeof message.content === 'string' && message.content.trim())
				messageContents.add(message.content.trim())
}

const TIMESTAMP =
	/^(?:\d{1,2}:\d{2}(?:\s?[AaPp][Mm])?|\d+\s?(?:s|m|h|d|w|mo|y|min|mins|hr|hrs)|(?:Today|Yesterday)(?: at .+)?|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}(?:,? \d{1,2}:\d{2}(?:\s?[AaPp][Mm])?)?)$/

function enabled(category: Category | undefined) {
	return !!category && settings.categories[category]
}

function lookup(text: string) {
	const key = text.trim()
	const direct = dictionary.get(key)
	if (direct) return direct
	if (key.length > 2 && (key[0] === '@' || key[0] === '#')) {
		const handle = dictionary.get(key.slice(1))
		if (handle) return handle
	}
	const stripped = strip(key)
	return stripped && stripped !== key ? dictionary.get(stripped) : undefined
}

// Replace dictionary names that appear inside a longer string, longest word run first.
function replaceInline(text: string) {
	const parts = text.split(/(\s+)/)
	const words: number[] = []
	for (let i = 0; i < parts.length; i += 2) words.push(i)
	let changed = false
	const out = parts.slice()
	for (let w = 0; w < words.length; w++) {
		for (let n = Math.min(6, words.length - w); n >= 1; n--) {
			const start = words[w]!
			const end = words[w + n - 1]!
			const candidate = parts.slice(start, end + 1).join('')
			if (n === 1 && candidate.length < 4) continue
			const category = lookup(candidate.replace(/[,.!?:;)]+$/, ''))
			if (!enabled(category)) continue
			// Channels are often plain words like "about", so only "#about" counts inside a sentence.
			if (n === 1 && category === 'servers' && candidate[0] !== '#') continue
			out[start] = jumble(candidate)
			for (let k = start + 1; k <= end; k++) out[k] = ''
			w += n - 1
			changed = true
			break
		}
	}
	return changed ? out.join('') : text
}

function transform(text: string): string {
	const key = text.trim()
	if (!key) return text
	const category = lookup(key)
	if (category) return enabled(category) ? jumble(text) : text
	if (TIMESTAMP.test(key)) return enabled('timestamps') ? jumble(text) : text
	// DM list previews look like "Name: message".
	const colon = text.indexOf(': ')
	if (colon > 0 && colon <= 64) {
		const prefix = text.slice(0, colon)
		const prefixCategory = lookup(prefix)
		if (prefixCategory === 'names' || prefix === 'You') {
			const rest = text.slice(colon + 2)
			return `${enabled(prefixCategory) ? jumble(prefix) : prefix}: ${
				enabled('messages') ? jumble(rest) : rest
			}`
		}
	}
	if (messageContents.has(key)) return enabled('messages') ? jumble(text) : text
	return replaceInline(text)
}

export function scrambleString(text: string) {
	if (!active) return text
	let result = cache.get(text)
	if (result === undefined) {
		result = transform(text)
		if (cache.size > 5000) cache.clear()
		cache.set(text, result)
	}
	return result
}

// For free text with a known category, such as message previews and bios.
export function scrambleAs(text: string, category: Category) {
	return enabled(category) ? jumble(text) : text
}

export function scrambleChildren(children: unknown): unknown {
	if (typeof children === 'string') return scrambleString(children)
	if (!Array.isArray(children)) return children
	if (
		children.every(
			child => typeof child === 'string' || typeof child === 'number',
		)
	)
		return scrambleString(children.join(''))
	return children.map(child =>
		typeof child === 'string' ? scrambleString(child) : child,
	)
}

// Chat rows are rendered natively from row data, so they are scrambled field by field.
function scrambleContent(nodes: unknown, category: Category): unknown {
	if (!Array.isArray(nodes)) return nodes
	return nodes.map(node => {
		if (!node || typeof node !== 'object') return node
		const record = node as AnyRecord
		const type = String(record.type ?? '')
		const nodeCategory: Category = /mention|channel|role/i.test(type)
			? type.toLowerCase().includes('channel')
				? 'servers'
				: 'names'
			: /timestamp/i.test(type)
				? 'timestamps'
				: category
		const next: AnyRecord = { ...record }
		if (typeof record.content === 'string') {
			if (enabled(nodeCategory)) next.content = jumble(record.content)
		} else if (Array.isArray(record.content))
			next.content = scrambleContent(record.content, nodeCategory)
		if (Array.isArray(record.items))
			next.items = scrambleContent(record.items, nodeCategory)
		return next
	})
}

function scrambleMessageRow(message: AnyRecord): AnyRecord {
	const next: AnyRecord = { ...message }
	const swap = (key: string, category: Category) => {
		if (typeof next[key] === 'string' && next[key] && enabled(category))
			next[key] = jumble(next[key])
	}
	swap('username', 'names')
	swap('timestamp', 'timestamps')
	swap('timestampAccessibilityLabel', 'timestamps')
	next.content = scrambleContent(message.content, 'messages')
	if (Array.isArray(message.embeds) && enabled('messages'))
		next.embeds = message.embeds.map((embed: AnyRecord) => {
			const copy = { ...embed }
			for (const key of ['title', 'description', 'authorName', 'footerText'])
				if (typeof copy[key] === 'string') copy[key] = jumble(copy[key])
			if (Array.isArray(copy.content))
				copy.content = scrambleContent(copy.content, 'messages')
			return copy
		})
	const reply = message.referencedMessage
	if (reply?.message)
		next.referencedMessage = {
			...reply,
			message: scrambleMessageRow(reply.message),
		}
	return next
}

export function scrambleRow(row: unknown): unknown {
	if (!active || !row || typeof row !== 'object') return row
	const record = row as AnyRecord
	if (!record.message || typeof record.message !== 'object') return row
	if (revealed.has(record.message.id)) return row
	return { ...record, message: scrambleMessageRow(record.message) }
}
