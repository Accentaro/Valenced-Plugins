import type { PluginApi } from '@valenced/plugins/types'
import type { ThemesState } from '@valenced/themes-api/types'
import type { ReactElement } from 'react'
import type { StyleProp, ViewProps, ViewStyle } from 'react-native'

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

export interface ChatBackgroundOptions {
	/** Lets the background run behind the chat box and the bottom safe area, instead of a solid band. */
	seamless?: boolean
}

export function fixChatBackground(
	api: PluginApi,
	options: ChatBackgroundOptions = {},
) {
	const { cleanup, plugin, unscoped } = api
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
								// Seamless: no scrim fading the messages into the chat box.
								options.seamless && { opacity: 0 },
							],
						})
					}),
				)
			},
			{ cached: true },
		),
	)
	if (options.seamless) seeThroughChatInput(api, active)
}

/** `rgb(r,g,b)` or `#rrggbb` as lowercase `#rrggbb`. */
function toHex(color: string) {
	const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color)
	if (rgb)
		return `#${rgb
			.slice(1, 4)
			.map(c => Number(c).toString(16).padStart(2, '0'))
			.join('')}`
	if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase()
}

interface ForwardRefView {
	render(props: ViewProps, ref: unknown): unknown
}

/**
 * With a theme background, Discord fills the chat box's surroundings and the bottom safe area with a solid
 * colour it blends from the theme (ChatInputGuardWrapper and ChannelSafeAreaBottom). Discord holds those
 * components directly, so their exports can't be patched; instead, childless full-size views filled with
 * that blended colour render transparent. Discord produces it as an `rgb()` string, which theme tokens
 * never are, so it's learned from those views as they render.
 */
function seeThroughChatInput(
	{ cleanup, unscoped }: PluginApi,
	active: () => boolean,
) {
	const { View, StyleSheet } = unscoped.react.ReactNative
	const view = View as unknown as ForwardRefView
	const original = view.render
	const blended = new Set<string>()
	let enabled = true
	const render: ForwardRefView['render'] = function (
		this: unknown,
		props,
		ref,
	) {
		if (enabled && props?.children == null && active()) {
			const style = StyleSheet.flatten(props.style)
			const fill = style?.backgroundColor
			const hex = typeof fill === 'string' ? toHex(fill) : undefined
			if (hex) {
				if ((fill as string).startsWith('rgb(')) blended.add(hex)
				if (
					style.position === 'absolute' &&
					style.top === 0 &&
					style.bottom === 0 &&
					style.left === 0 &&
					style.right === 0 &&
					blended.has(hex)
				)
					props = {
						...props,
						style: [props.style, { backgroundColor: 'transparent' }],
					}
			}
		}
		return Reflect.apply(original, this, [props, ref])
	}
	view.render = render
	cleanup(() => {
		enabled = false
		// Another plugin may have wrapped View since; then this wrapper just stays inert.
		if (view.render === render) view.render = original
	})
}

declare module '@valenced/modules/native' {
	interface NativeMethods {
		'valenced.themes.getState': [[], string]
	}
}
