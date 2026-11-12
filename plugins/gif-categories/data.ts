import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import type { JsonStorage } from '@valenced/json-storage'
import { Dimensions, PixelRatio } from 'react-native'

export interface Gif {
	id?: string
	url: string
	src: string
	width: number
	height: number
	format: number
}
export interface Category {
	id: string
	name: string
	gifs: Gif[]
}
export interface Settings {
	categories: Category[]
	onlyMine?: boolean
}
export let storage: JsonStorage<Settings>
export function configure(instance: JsonStorage<Settings>) {
	storage = instance
}
export function getCategories(): Category[] {
	return (storage.cache as Settings).categories
}

export function parseBackup(text: string): Settings {
	if (text.length > 8 * 1024 * 1024) throw new Error('Backup exceeds 8 MB.')
	const data = JSON.parse(text)
	if (
		data?.version !== 1 ||
		!Array.isArray(data.categories) ||
		data.categories.length > 500
	)
		throw new Error('Not a GIF Categories backup.')
	const ids = new Set<string>()
	const url = (value: unknown): value is string =>
		typeof value === 'string' &&
		value.length <= 8192 &&
		/^https?:\/\/[^\s]+$/i.test(value)
	return {
		categories: data.categories.map((category: Category) => {
			if (
				!category ||
				typeof category.id !== 'string' ||
				!category.id ||
				category.id.length > 100 ||
				ids.has(category.id) ||
				typeof category.name !== 'string' ||
				!category.name.trim() ||
				category.name.length > 60 ||
				!Array.isArray(category.gifs) ||
				category.gifs.length > 10000
			)
				throw new Error('Invalid category in backup.')
			ids.add(category.id)
			return {
				id: category.id,
				name: category.name.trim(),
				gifs: category.gifs.map((gif: Gif) => {
					if (
						!gif ||
						!url(gif.url) ||
						!url(gif.src) ||
						!Number.isFinite(gif.width) ||
						!Number.isFinite(gif.height) ||
						gif.width <= 0 ||
						gif.height <= 0 ||
						![1, 2].includes(gif.format)
					)
						throw new Error('Invalid GIF in backup.')
					return {
						url: gif.url,
						src: gif.src,
						width: gif.width,
						height: gif.height,
						format: gif.format,
						...(typeof gif.id === 'string' ? { id: gif.id } : {}),
					}
				}),
			}
		}),
	}
}

interface AttachmentUrls {
	isRefreshableAttachmentUrl(url: URL): boolean
	getSignedAttachmentExpiration(url: URL): number | null
	maybeRefreshAttachmentUrl(url: string): Promise<string>
}
function expired(helpers: AttachmentUrls, value: string) {
	try {
		const url = new URL(value)
		return (
			helpers.isRefreshableAttachmentUrl(url) &&
			(helpers.getSignedAttachmentExpiration(url) ?? 0) <= Date.now()
		)
	} catch {
		return false
	}
}
const refreshing = new Set<string>()
// Discord attachment links expire; chat renews them with the same helper.
export async function refreshGifs(gifs: Gif[]) {
	const [helpers] = lookupModule(
		withProps<AttachmentUrls>(
			'maybeRefreshAttachmentUrl',
			'getSignedAttachmentExpiration',
		),
	)
	if (!helpers) return
	const stale = new Set<string>()
	for (const gif of gifs)
		for (const value of [gif.url, gif.src])
			if (!refreshing.has(value) && expired(helpers, value)) stale.add(value)
	if (!stale.size) return
	const fresh = new Map<string, string>()
	await Promise.all(
		[...stale].map(async value => {
			refreshing.add(value)
			try {
				const next = await helpers.maybeRefreshAttachmentUrl(value)
				if (typeof next === 'string' && next !== value) fresh.set(value, next)
			} catch {
				// Deleted attachments cannot be renewed; keep the saved link.
			} finally {
				refreshing.delete(value)
			}
		}),
	)
	if (!fresh.size) return
	await update(
		getCategories().map(category => ({
			...category,
			gifs: category.gifs.map(gif =>
				fresh.has(gif.url) || fresh.has(gif.src)
					? {
							...gif,
							url: fresh.get(gif.url) ?? gif.url,
							src: fresh.get(gif.src) ?? gif.src,
						}
					: gif,
			),
		})),
	)
}
interface MediaProxy {
	convertVideoToFirstFrameImageWithMediaProxy(
		url: string,
		size: { width: number; height: number },
	): string
}
// Tenor media IDs end in a rendition code; AAAA1 is the small animated WebP
// Discord's own favourites use. Chat embeds sometimes carry only the video
// (AAAPo) or a still poster (AAAAe).
const tenor =
	/\/media\.tenor\.com\/([\w-]{11})[\w-]{5}\/([^/?#]+)\.(?:mp4|png)(?:[?#]|$)/
function proxied(src: string) {
	try {
		return new URL(src).hostname.endsWith('.discordapp.net')
	} catch {
		return false
	}
}
// Long side of a picker tile in pixels; full-size originals (some chat GIFs
// are tens of MB) exhaust the image decoder and tiles fail at random.
function tileSize() {
	return Math.min(
		400,
		PixelRatio.getPixelSizeForLayoutSize(Dimensions.get('window').width / 2),
	)
}
function fit(gif: Gif) {
	const scale = Math.min(1, tileSize() / Math.max(gif.width, gif.height))
	return {
		width: Math.max(1, Math.round(gif.width * scale)),
		height: Math.max(1, Math.round(gif.height * scale)),
	}
}
// The picker draws every item as an image, so items are shown the way
// Discord's favourites are: small animated WebPs from the media proxy, and a
// still frame for videos.
export function preview(gif: Gif): Gif {
	const match = gif.src.match(tenor)
	if (match)
		return {
			...gif,
			src: `https://media.tenor.com/${match[1]}AAAA1/${match[2]}.webp`,
			format: 1,
		}
	// Attachment links saved without the proxy load the full original.
	if (/^https:\/\/cdn\.discordapp\.com\/attachments\//.test(gif.src))
		gif = {
			...gif,
			src: gif.src.replace('cdn.', 'media.').replace('.com/', '.net/'),
		}
	if (!proxied(gif.src)) return gif
	const size = fit(gif)
	if (gif.format === 2) {
		const [proxy] = lookupModule(
			withProps<MediaProxy>('convertVideoToFirstFrameImageWithMediaProxy'),
		)
		return proxy
			? {
					...gif,
					src: proxy.convertVideoToFirstFrameImageWithMediaProxy(gif.src, size),
					format: 1,
				}
			: gif
	}
	const base = gif.src
		.replace(/([?&])(?:format|animated|width|height|quality)=[^&#]*&?/g, '$1')
		.replace(/[?&]+$/, '')
	const query = `format=webp&animated=true&width=${size.width}&height=${size.height}`
	return {
		...gif,
		src: `${base}${base.includes('?') ? '&' : '?'}${query}`,
	}
}
export function reorder(id: string, target: number) {
	const categories = [...getCategories()]
	const from = categories.findIndex(item => item.id === id)
	if (from === -1 || from === target) return
	const [item] = categories.splice(from, 1)
	categories.splice(target, 0, item)
	return update(categories)
}
export function update(categories: Category[]) {
	return storage.set({ ...(storage.cache as Settings), categories }, true)
}
