import type { PluginApi } from '@valenced/plugins/types'
import type { ThemesState } from '@valenced/themes-api/types'
import type { ReactElement } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

interface RootThemeContextModule {
	RootThemeContextProvider(props: unknown): unknown
	DisableCustomTheme: unknown
}

interface TokensModule {
	RawColor: unknown
	SemanticColor: unknown
	default: {
		internal: {
			getSemanticColorName(color: object): string
			resolveSemanticColor(
				theme: string,
				color: object,
				context?: { gradient?: object | null; isProfileTheme?: boolean },
			): string
		}
	}
}

interface TypingIndicatorModule {
	hasTypingIndicatorContent(...args: unknown[]): boolean
}

interface ChatInputScrimModule {
	ChatInputScrimGradient(props: {
		gradientHeight?: number
		inline?: boolean
		scrimBase?: string
	}): ReactElement<{ style: StyleProp<ViewStyle> }>
}

export function fixChatBackground({ cleanup, plugin, unscoped }: PluginApi) {
	const { modules, patcher, react } = unscoped
	const { native, finders } = modules
	const { withProps } = finders.filters
	let selected: ThemesState = JSON.parse(
		native.callNativeMethodSync('valenced.themes.getState', []),
	)
	const active = () =>
		selected.colors?.plugin === plugin.manifest.id &&
		(selected.background?.source === 'custom'
			? Boolean(selected.background.path)
			: selected.background?.source !== 'none')

	cleanup(
		finders.getModules(
			withProps<TokensModule>('RawColor', 'SemanticColor'),
			module => {
				const { internal } = module.default
				cleanup(
					patcher.instead(
						internal,
						'resolveSemanticColor',
						function (args, original) {
							const result = Reflect.apply(original, this, args)
							const [theme, color, context] = args
							if (
								active() &&
								context?.gradient &&
								!context.isProfileTheme &&
								/^#[0-9a-f]{6}00$/i.test(result) &&
								internal.getSemanticColorName(color) ===
									'MOBILE_FLOATINGBAR_BACKGROUND'
							) {
								// The wallpaper renderer clears this surface; keep the You bar's own color.
								return Reflect.apply(original, this, [
									theme,
									color,
									{ ...context, gradient: null },
								])
							}
							return result
						},
					),
				)
			},
			{ cached: true },
		),
		finders.getModules(
			withProps<RootThemeContextModule>(
				'RootThemeContextProvider',
				'DisableCustomTheme',
			),
			module => {
				cleanup(
					patcher.before(module, 'RootThemeContextProvider', args => {
						// Theme selections refresh this provider before chat renders.
						selected = JSON.parse(
							native.callNativeMethodSync('valenced.themes.getState', []),
						)
						return args
					}),
				)
			},
			{ cached: true },
		),
		finders.getModules(
			withProps<TypingIndicatorModule>('hasTypingIndicatorContent'),
			module => {
				cleanup(
					patcher.after(module, 'hasTypingIndicatorContent', result => {
						// Keep the solid chat background when the typing row disappears.
						return active() || result
					}),
				)
			},
			{ cached: true },
		),
		finders.getModules(
			withProps<ChatInputScrimModule>('ChatInputScrimGradient'),
			module => {
				cleanup(
					patcher.after(module, 'ChatInputScrimGradient', result => {
						if (!active()) return result
						// Overlap the solid background to cover the pixel-rounding seam.
						return react.React.cloneElement(result, {
							style: [
								result.props.style,
								{
									transform: [
										{ translateY: react.ReactNative.StyleSheet.hairlineWidth },
									],
								},
							],
						})
					}),
				)
			},
			{ cached: true },
		),
	)
}

declare module '@valenced/modules/native' {
	interface NativeMethods {
		'valenced.themes.getState': [[], string]
	}
}
