import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { lookupGeneratedIconComponent } from '@valenced/utils/discord'
import { Children, cloneElement, isValidElement } from 'react'
import { chooseCategory } from './ui'
import type { ReactNode } from 'react'
import type { Gif } from './data'
import type { Tree } from './picker'

interface Image {
	url: string
	proxyURL?: string
	width: number
	height: number
	contentType?: string
	srcIsAnimated?: boolean
	flags?: number
}
interface Attachment {
	url: string
	proxy_url?: string
	width?: number
	height?: number
	content_type?: string
	flags?: number
}
export interface GifMessage {
	attachments?: Attachment[]
	embeds?: {
		type: string
		url?: string
		image?: Image
		thumbnail?: Image
		video?: Image
	}[]
	messageSnapshots?: { message?: GifMessage }[]
}
// Discord's IS_ANIMATED media flag.
const animatedFlag = 1 << 5
function animated(type?: string, url?: string, flags = 0) {
	return (
		type === 'image/gif' ||
		!!type?.startsWith('video/') ||
		(flags & animatedFlag) !== 0 ||
		/\.gif(?:[?#]|$)/i.test(url ?? '')
	)
}
function sized(gif: Gif) {
	return gif.width > 0 && gif.height > 0 ? gif : undefined
}
export function messageGif(message: GifMessage): Gif | undefined {
	for (const embed of message.embeds ?? []) {
		if (embed.type === 'gifv' && embed.url && embed.video) {
			// The picker draws images; a GIF embed's thumbnail is its animated image.
			const thumbnail = embed.thumbnail
			return sized(
				thumbnail
					? {
							url: embed.url,
							src: thumbnail.proxyURL ?? thumbnail.url,
							width: thumbnail.width,
							height: thumbnail.height,
							format: 1,
						}
					: {
							url: embed.url,
							src: embed.video.url,
							width: embed.video.width,
							height: embed.video.height,
							format: 2,
						},
			)
		}
		const image = embed.image
		if (
			image &&
			(image.srcIsAnimated ||
				animated(image.contentType, image.url, image.flags))
		)
			return sized({
				url: embed.url ?? image.url,
				// Chat shows embeds through the proxy; some hosts block direct loads.
				src: image.proxyURL ?? image.url,
				width: image.width,
				height: image.height,
				format: 1,
			})
		// Linked video files; player embeds such as YouTube have no video type.
		const video = embed.video
		if (video?.contentType?.startsWith('video/')) {
			// Chat shows the embed's poster; first frames of external videos
			// often fail to render through the proxy.
			const poster = embed.thumbnail
			return sized({
				url: embed.url ?? video.url,
				src: poster
					? (poster.proxyURL ?? poster.url)
					: (video.proxyURL ?? video.url),
				width: video.width,
				height: video.height,
				format: poster ? 1 : 2,
			})
		}
	}
	for (const file of message.attachments ?? []) {
		if (!animated(file.content_type, file.url, file.flags)) continue
		const video = !!file.content_type?.startsWith('video/')
		return sized({
			url: file.url,
			src: file.proxy_url ?? file.url,
			width: file.width ?? 0,
			height: file.height ?? 0,
			format: video ? 2 : 1,
		})
	}
	// Forwarded messages keep their media in a snapshot.
	for (const snapshot of message.messageSnapshots ?? []) {
		const gif = snapshot.message && messageGif(snapshot.message)
		if (gif) return gif
	}
}

export function addMediaAction(original: ReactNode, gif: Gif): ReactNode {
	let added = false
	function append(node: ReactNode): ReactNode {
		if (!isValidElement<Tree & { hasIcons?: boolean }>(node)) return node
		if (!added && node.props.hasIcons) {
			added = true
			const FolderIcon = lookupGeneratedIconComponent('FolderIcon')
			return cloneElement(
				node,
				{},
				node.props.children,
				<Design.ActionSheetRow
					key="gif-categories"
					label="Add to GIF category"
					icon={<Design.ActionSheetRow.Icon IconComponent={FolderIcon} />}
					onPress={() => {
						ActionSheetActionCreators.hideAllActionSheets()
						chooseCategory(gif)
					}}
				/>,
			)
		}
		return cloneElement(node, {}, Children.map(node.props.children, append))
	}
	return append(original)
}
