import { Stores } from '@valenced/discord/flux'
import {
	getPropsFilter,
	onImportedPath,
	onModule,
	safeInstead,
} from '../modules'
import { getSettings } from '../state'
import type { PluginCleanupApi } from '@valenced/plugins/types'

interface TokensModule {
	default: {
		colors: Record<string, object>
		internal: { resolveSemanticColor(theme: string, color: object): string }
	}
}

export function patchProfileThemes(cleanup: PluginCleanupApi): void {
	let tokens: TokensModule | undefined

	// Without theme colors Discord samples the avatar instead, so the app
	// theme's own surfaces are passed as the profile's theme colors.
	function surfaces(): [number, number] | null {
		if (!getSettings().profileThemes || !tokens) return null
		try {
			const { colors, internal } = tokens.default
			const theme = (Stores.ThemeStore as unknown as { theme: string }).theme
			const [top, bottom] = [
				'BACKGROUND_BASE_LOWER',
				'BACKGROUND_BASE_LOWEST',
			].map(key =>
				Number.parseInt(
					internal.resolveSemanticColor(theme, colors[key]!).slice(1, 7),
					16,
				),
			)
			return Number.isFinite(top) && Number.isFinite(bottom)
				? [top!, bottom!]
				: null
		} catch {
			return null
		}
	}

	cleanup(
		onModule<TokensModule>(
			getPropsFilter('RawColor', 'SemanticColor'),
			module => {
				tokens = module
			},
		),
	)

	cleanup(
		onImportedPath<any>('modules/user_profile/DisplayProfile.tsx', ns => {
			const proto = ns?.default?.prototype
			if (!proto) return
			const primary = Object.getOwnPropertyDescriptor(proto, 'primaryColor')
			if (primary?.get) {
				const original = primary.get
				const get = function (this: unknown) {
					return surfaces()?.[0] ?? original.call(this)
				}
				Object.defineProperty(proto, 'primaryColor', { ...primary, get })
				cleanup(() => {
					if (
						Object.getOwnPropertyDescriptor(proto, 'primaryColor')?.get === get
					)
						Object.defineProperty(proto, 'primaryColor', primary)
				})
			}
			cleanup(
				safeInstead(
					proto,
					'hasThemeColors',
					function (this: unknown, args, original) {
						return surfaces() ? true : Reflect.apply(original, this, args)
					},
				),
				safeInstead(
					proto,
					'getPreviewThemeColors',
					function (this: unknown, args, original) {
						// A pending edit is a preview of unsaved colors; leave it alone.
						const colors = args[0] == null ? surfaces() : null
						return colors ? [...colors] : Reflect.apply(original, this, args)
					},
				),
			)
		}),
	)

	// The strip shown in place of a banner is colored separately, and before
	// the profile has loaded it would briefly show the user's own color.
	cleanup(
		onImportedPath<any>(
			'modules/profile_customization/native/ProfileCustomizationUtils.tsx',
			ns => {
				if (typeof ns?.useUserProfileBannerBackgroundColor !== 'function')
					return
				cleanup(
					safeInstead(
						ns,
						'useUserProfileBannerBackgroundColor',
						function (this: unknown, args, original) {
							const color = Reflect.apply(original, this, args)
							return surfaces()?.[0] ?? color
						},
					),
				)
			},
		),
	)
}
