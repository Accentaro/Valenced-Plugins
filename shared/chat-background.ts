import type { PluginApi } from '@valenced/plugins/types'
import type { ThemesState } from '@valenced/themes-api/types'
import type { ReactElement } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

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
	let running = true
	const active = () =>
		selected.colors?.plugin === plugin.manifest.id &&
		(selected.background?.source === 'custom'
			? Boolean(selected.background.path)
			: selected.background?.source !== 'none')

	cleanup(
		() => {
			running = false
		},
		// Track successful selections; never read native storage during rendering.
		patcher.instead(native, 'callNativeMethod', function (args, original) {
			const result = Reflect.apply(original, this, args)
			const [name, params] = args
			if (
				name !== 'valenced.themes.setColors' &&
				name !== 'valenced.themes.setBackground'
			)
				return result
			const json = params[0] as string | null
			return result.then(value => {
				if (running) {
					const field =
						name === 'valenced.themes.setColors' ? 'colors' : 'background'
					selected = {
						...selected,
						[field]: json === null ? undefined : JSON.parse(json),
					}
				}
				return value
			})
		}),
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
		'valenced.themes.setColors': [[json: string | null], null]
		'valenced.themes.setBackground': [[json: string | null], null]
	}
}
