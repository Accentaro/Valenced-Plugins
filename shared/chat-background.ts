import type { PluginApi } from '@valenced/plugins/types'
import type { ThemesState } from '@valenced/themes-api/types'
import type { ReactElement } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

interface RootThemeContextModule {
	RootThemeContextProvider(props: unknown): unknown
	DisableCustomTheme: unknown
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
