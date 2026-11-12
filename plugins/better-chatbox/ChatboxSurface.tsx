import { Tokens } from '@valenced/discord/common/tokens'
import { Design } from '@valenced/discord/design'
import { Fragment } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { defaults, toHex } from './Settings'
import type { JsonStorage } from '@valenced/json-storage'
import type { ComponentType, ReactNode } from 'react'
import type { Settings } from './Settings'

// Present on Discord's Design module but missing from its typings.
interface Theming {
	ThemeContextProvider: ComponentType<{ theme: string; children?: ReactNode }>
	useThemeContext(): { theme: string }
	isThemeDark(theme: string): boolean
}

// Wraps the chatbox's contents. With "Invert icons and text" on, they render
// with the opposite light/dark theme, so Discord itself recolours the icons,
// text and placeholder. Some Discord builds keep icon colours from first
// render, so the contents remount when the setting flips. That only happens
// from the settings screen, never while typing.
export default function ChatboxSurface({
	storage,
	radius,
	children,
}: {
	storage: JsonStorage<Settings>
	/** The chatbox's inner corner radius; the background clips itself to it. */
	radius: number
	children?: ReactNode
}) {
	const { ThemeContextProvider, useThemeContext, isThemeDark } =
		Design as unknown as Theming
	const settings = { ...defaults, ...storage.use() }
	const { theme } = useThemeContext()
	const invert = settings.background !== 'none' && settings.invertContent
	return (
		<ThemeContextProvider
			theme={invert ? (isThemeDark(theme) ? 'light' : 'dark') : theme}
		>
			<ChatboxBackground settings={settings} radius={radius} />
			<Fragment key={invert ? 'inverted' : 'normal'}>{children}</Fragment>
		</ThemeContextProvider>
	)
}

// Drawn first, so the rounded, clipped chatbox shapes it and everything else
// draws on top. The dim layer is the chatbox's own theme colour, so text keeps
// the theme's contrast.
function ChatboxBackground({
	settings,
	radius,
}: {
	settings: Settings
	radius: number
}) {
	// Resolved against the theme this subtree renders with, which differs from
	// the app's theme while inverted.
	const { theme } = (Design as unknown as Theming).useThemeContext()
	const { colors, internal } = Tokens.default as unknown as {
		colors: Record<string, unknown>
		internal: { resolveSemanticColor(theme: string, token: unknown): string }
	}
	const tint = internal.resolveSemanticColor(
		theme,
		colors.CHAT_INPUT_BACKGROUND,
	)
	const background =
		settings.background === 'colour' ? (
			<View
				style={[
					StyleSheet.absoluteFill,
					{ backgroundColor: toHex(settings.backgroundColour) },
				]}
			/>
		) : settings.background === 'image' && settings.backgroundImage ? (
			<Image
				source={{ uri: settings.backgroundImage }}
				resizeMode="cover"
				blurRadius={settings.blur}
				style={StyleSheet.absoluteFill}
			/>
		) : null
	if (!background) return null
	return (
		<View
			pointerEvents="none"
			style={[
				StyleSheet.absoluteFill,
				{ borderRadius: radius, overflow: 'hidden' },
			]}
		>
			{background}
			{settings.dim > 0 && (
				<View
					style={[
						StyleSheet.absoluteFill,
						{ backgroundColor: tint, opacity: settings.dim },
					]}
				/>
			)}
		</View>
	)
}
