import { onImportedPath, safeInstead } from '../modules'
import { getSettings } from '../state'
import type { PluginCleanupApi } from '@valenced/plugins/types'

// EmojiIntention.REACTION
const REACTION = 0

export function patchNitroLockedEmojis(cleanup: PluginCleanupApi): void {
	cleanup(
		onImportedPath<any>('utils/EmojiUtils.tsx', ns => {
			const utils = ns?.default
			if (
				typeof utils?.getEmojiUnavailableReasons !== 'function' ||
				typeof utils.isEmojiPremiumLocked !== 'function'
			)
				return
			cleanup(
				safeInstead(
					utils,
					'getEmojiUnavailableReasons',
					function (this: unknown, args, original) {
						const result: any = Reflect.apply(original, this, args)
						const query = args[0]
						if (
							!getSettings().nitroLockedEmojis ||
							query?.intention !== REACTION ||
							!result?.emojisPremiumLockedCount ||
							!Array.isArray(result.emojisUnfiltered)
						)
							return result
						return {
							...result,
							emojisUnfiltered: result.emojisUnfiltered.filter(
								(emoji: unknown) =>
									!utils.isEmojiPremiumLocked({
										emoji,
										channel: query.channel,
										guildId: query.guildId,
										intention: query.intention,
									}),
							),
							emojisPremiumLockedCount: 0,
							emojiNitroLocked: false,
						}
					},
				),
			)
		}),
	)
}
