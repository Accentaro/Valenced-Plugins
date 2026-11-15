import type { PluginApi } from '@valenced/plugins/types'
import type { ThemesState } from '@valenced/themes-api/types'
import type { ComponentType, Context, ElementType, Key } from 'react'

interface DisplayProfile {
	userId: string
	primaryColor: number | null
	hasThemeColors(): boolean
	getPreviewThemeColors(pending?: unknown): number[] | null | undefined
}

interface TokensModule {
	RawColor: unknown
	SemanticColor: unknown
	default: {
		colors: Record<string, object>
		internal: {
			resolveSemanticColor(theme: string, color: object): string
		}
	}
}

interface RootThemeContextModule {
	RootThemeContextProvider(props: unknown): unknown
	DisableCustomTheme: unknown
}

type ProfileColors = [number, number]

const onYouScreenKey = Symbol.for('benjii.dev.theme.onYouScreen')

/**
 * Profile themes are for other people viewing your profile. On your own You page, Discord would paint them
 * over the app theme, so while this theme is selected the page uses the theme's own surfaces instead.
 *
 * Discord reads the colours from `DisplayProfile` (`primaryColor`, `hasThemeColors`, `getPreviewThemeColors`).
 * Without theme colours it samples the avatar instead, so the theme's surfaces are passed as theme colours.
 * Only the You screen's tree gets them: Edit Profile keeps the real colours, so its Profile Theme swatches
 * and Save stay correct.
 */
export function themeOwnProfile(api: PluginApi) {
	const { cleanup, plugin, unscoped } = api
	const { modules, patcher, react, discord } = unscoped
	const { native, finders } = modules
	const { withName, withProps } = finders.filters
	const { React } = react
	const { ThemeStore, UserStore } = discord.flux.Stores as unknown as {
		ThemeStore: { theme: string }
		UserStore: { getCurrentUser(): { id: string } | undefined }
	}
	// Every theme bundles its own copy of this file, but only one theme's wrapper ends up around the You
	// screen, so they all share one context.
	const shared = globalThis as unknown as Record<
		symbol,
		Context<boolean> | undefined
	>
	const OnYouScreen = (shared[onYouScreenKey] ??= React.createContext(false))
	const readSelected = (): ThemesState =>
		JSON.parse(native.callNativeMethodSync('valenced.themes.getState', []))
	let selected = readSelected()
	let tokens: TokensModule | undefined
	let enabled = true
	cleanup(() => {
		enabled = false
	})

	function surfaces(): ProfileColors | null {
		if (selected.colors?.plugin !== plugin.manifest.id || !tokens) return null
		const { colors, internal } = tokens.default
		const [top, bottom] = [
			'BACKGROUND_BASE_LOWER',
			'BACKGROUND_BASE_LOWEST',
		].map(key =>
			Number.parseInt(
				internal
					.resolveSemanticColor(ThemeStore.theme, colors[key]!)
					.slice(1, 7),
				16,
			),
		)
		return Number.isFinite(top) && Number.isFinite(bottom)
			? [top!, bottom!]
			: null
	}

	/** This theme's colours when `profile` is yours and is rendering inside the You screen. */
	function override(profile: DisplayProfile): ProfileColors | null {
		if (!enabled || profile.userId !== UserStore.getCurrentUser()?.id)
			return null
		try {
			// `use` may be called conditionally; outside a render it throws.
			if (!React.use(OnYouScreen)) return null
		} catch {
			return null
		}
		// Worked out on every read, so switching themes doesn't need the You screen to remount.
		return surfaces()
	}

	cleanup(
		finders.getModules(
			withProps<TokensModule>('RawColor', 'SemanticColor'),
			module => {
				tokens = module
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
						// Theme selections rerender this provider, and the profile rerenders under it.
						selected = readSelected()
						return args
					}),
				)
			},
			{ cached: true },
		),
		finders.getModules(
			withName<ComponentType<object>>('YouScreen'),
			YouScreen => {
				cleanup(
					react.jsxRuntime.insteadJSX(YouScreen, (args, jsx) => {
						const [type, props, key] = args as [
							ElementType,
							object,
							Key | undefined,
						]
						if (!enabled) return jsx(...args)
						return jsx(
							OnYouScreen.Provider,
							{ value: true, children: jsx(type, props) },
							key,
						)
					}),
				)
			},
			{ cached: true },
		),
		finders.getModules(
			withName<new (...args: never[]) => DisplayProfile>('DisplayProfile'),
			DisplayProfile => {
				const proto = DisplayProfile.prototype
				const primary = Object.getOwnPropertyDescriptor(proto, 'primaryColor')
				if (primary?.get) {
					const original = primary.get
					const get = function (this: DisplayProfile) {
						return override(this)?.[0] ?? original.call(this)
					}
					Object.defineProperty(proto, 'primaryColor', { ...primary, get })
					cleanup(() => {
						// Another theme may have wrapped it since; then this one just stays inert.
						if (
							Object.getOwnPropertyDescriptor(proto, 'primaryColor')?.get ===
							get
						)
							Object.defineProperty(proto, 'primaryColor', primary)
					})
				}
				cleanup(
					patcher.instead(proto, 'hasThemeColors', function (args, original) {
						return override(this as DisplayProfile)
							? true
							: Reflect.apply(original, this, args)
					}),
					patcher.instead(
						proto,
						'getPreviewThemeColors',
						function (args, original) {
							// A pending edit is a preview of unsaved colours; leave it alone.
							const colors =
								args[0] == null ? override(this as DisplayProfile) : null
							return colors ? [...colors] : Reflect.apply(original, this, args)
						},
					),
				)
			},
			{ cached: true },
		),
	)
}
