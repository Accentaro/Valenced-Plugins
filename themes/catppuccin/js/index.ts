/// <reference types="@valenced/themes-api" />

import { mix, themeColors } from '../../../shared/theme-kit'
import Settings from './settings'
import type { JsonStorage } from '@valenced/json-storage'
import type { ThemeColors } from '@valenced/themes-api/types'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Official Catppuccin palette (MIT): https://github.com/catppuccin/palette
interface Flavour {
	rosewater: string
	flamingo: string
	pink: string
	mauve: string
	red: string
	maroon: string
	peach: string
	yellow: string
	green: string
	teal: string
	sky: string
	sapphire: string
	blue: string
	lavender: string
	text: string
	subtext1: string
	subtext0: string
	overlay2: string
	overlay1: string
	overlay0: string
	surface2: string
	surface1: string
	surface0: string
	base: string
	mantle: string
	crust: string
}

const latte: Flavour = {
	rosewater: '#dc8a78',
	flamingo: '#dd7878',
	pink: '#ea76cb',
	mauve: '#8839ef',
	red: '#d20f39',
	maroon: '#e64553',
	peach: '#fe640b',
	yellow: '#df8e1d',
	green: '#40a02b',
	teal: '#179299',
	sky: '#04a5e5',
	sapphire: '#209fb5',
	blue: '#1e66f5',
	lavender: '#7287fd',
	text: '#4c4f69',
	subtext1: '#5c5f77',
	subtext0: '#6c6f85',
	overlay2: '#7c7f93',
	overlay1: '#8c8fa1',
	overlay0: '#9ca0b0',
	surface2: '#acb0be',
	surface1: '#bcc0cc',
	surface0: '#ccd0da',
	base: '#eff1f5',
	mantle: '#e6e9ef',
	crust: '#dce0e8',
}

const frappe: Flavour = {
	rosewater: '#f2d5cf',
	flamingo: '#eebebe',
	pink: '#f4b8e4',
	mauve: '#ca9ee6',
	red: '#e78284',
	maroon: '#ea999c',
	peach: '#ef9f76',
	yellow: '#e5c890',
	green: '#a6d189',
	teal: '#81c8be',
	sky: '#99d1db',
	sapphire: '#85c1dc',
	blue: '#8caaee',
	lavender: '#babbf1',
	text: '#c6d0f5',
	subtext1: '#b5bfe2',
	subtext0: '#a5adce',
	overlay2: '#949cbb',
	overlay1: '#838ba7',
	overlay0: '#737994',
	surface2: '#626880',
	surface1: '#51576d',
	surface0: '#414559',
	base: '#303446',
	mantle: '#292c3c',
	crust: '#232634',
}

const macchiato: Flavour = {
	rosewater: '#f4dbd6',
	flamingo: '#f0c6c6',
	pink: '#f5bde6',
	mauve: '#c6a0f6',
	red: '#ed8796',
	maroon: '#ee99a0',
	peach: '#f5a97f',
	yellow: '#eed49f',
	green: '#a6da95',
	teal: '#8bd5ca',
	sky: '#91d7e3',
	sapphire: '#7dc4e4',
	blue: '#8aadf4',
	lavender: '#b7bdf8',
	text: '#cad3f5',
	subtext1: '#b8c0e0',
	subtext0: '#a5adcb',
	overlay2: '#939ab7',
	overlay1: '#8087a2',
	overlay0: '#6e738d',
	surface2: '#5b6078',
	surface1: '#494d64',
	surface0: '#363a4f',
	base: '#24273a',
	mantle: '#1e2030',
	crust: '#181926',
}

export const mocha: Flavour = {
	rosewater: '#f5e0dc',
	flamingo: '#f2cdcd',
	pink: '#f5c2e7',
	mauve: '#cba6f7',
	red: '#f38ba8',
	maroon: '#eba0ac',
	peach: '#fab387',
	yellow: '#f9e2af',
	green: '#a6e3a1',
	teal: '#94e2d5',
	sky: '#89dceb',
	sapphire: '#74c7ec',
	blue: '#89b4fa',
	lavender: '#b4befe',
	text: '#cdd6f4',
	subtext1: '#bac2de',
	subtext0: '#a6adc8',
	overlay2: '#9399b2',
	overlay1: '#7f849c',
	overlay0: '#6c7086',
	surface2: '#585b70',
	surface1: '#45475a',
	surface0: '#313244',
	base: '#1e1e2e',
	mantle: '#181825',
	crust: '#11111b',
}

/** Catppuccin's accent colours, in the order of its style guide. */
export const accents = [
	'rosewater',
	'flamingo',
	'pink',
	'mauve',
	'red',
	'maroon',
	'peach',
	'yellow',
	'green',
	'teal',
	'sky',
	'sapphire',
	'blue',
	'lavender',
] as const
export type Accent = (typeof accents)[number]

/**
 * Discord's greys and hues as colours of one flavour, mapped from Ash on dark flavours and from Light on
 * Latte. Each Discord hue takes its nearest Catppuccin colour, and blurple the accent.
 */
function toneOf(f: Flavour, accent: Accent): Tone {
	const light = f === latte
	// Dark flavours darken the pastels so Discord's white text and icons stay readable on fills.
	const fill = (c: string, t = 0.3) => (light ? c : mix(c, f.crust, t))
	const greys: Tone['greys'] = light
		? [
				// Light: dark greys are text, light greys are surfaces.
				['#000000', mix(f.text, '#000000', 0.5)],
				['#28282d', f.text],
				['#2e2e34', f.text],
				['#595a63', f.subtext1],
				['#6c6d76', f.subtext0],
				['#81828a', f.overlay2],
				['#97979f', f.overlay1],
				['#abacb2', f.overlay0],
				['#c5c6ca', f.surface2],
				['#dbdcdf', f.surface1],
				['#e6e7e9', f.surface0],
				['#f3f3f4', f.crust],
				['#fbfbfb', f.base],
				['#ffffff', mix(f.base, '#ffffff', 0.5)],
			]
		: [
				// Ash: dark greys are surfaces, light greys are text. Discord's white is Catppuccin's text, as
				// in Catppuccin's own Discord ports, never Latte.
				['#000000', mix(f.crust, '#000000', 0.4)],
				['#2c2d32', f.crust],
				['#323339', f.base],
				['#393a41', f.surface0],
				['#41434a', f.surface0],
				['#4e5058', f.surface1],
				['#595a63', f.surface2],
				['#81828a', f.overlay0],
				['#97979f', f.overlay1],
				['#abacb2', f.overlay2],
				['#c5c6ca', f.subtext0],
				['#dbdcdf', f.subtext1],
				['#f3f3f4', f.text],
				['#ffffff', f.text],
			]
	return {
		greys,
		hues: {
			red: fill(f.red),
			orange: fill(f.peach, 0.15),
			yellow: fill(f.yellow, 0.1),
			green: fill(f.green, 0.2),
			teal: fill(f.teal, 0.25),
			blue: fill(f.blue),
			blurple: fill(f[accent], 0.45),
			purple: fill(f.lavender),
			pink: fill(f.pink),
		},
	}
}

function lookOf(f: Flavour, light: boolean, accent: Accent): Look {
	const a = f[accent]
	// Surfaces follow Catppuccin's Vendetta port: crust, mantle and base, with surface0 kept for embeds
	// and secondary buttons.
	const palette: Palette = {
		rail: f.crust,
		floor: f.base,
		panel: f.mantle,
		page: f.mantle,
		card: f.base,
		popup: light ? f.base : f.mantle,
		input: f.mantle,
		control: f.surface0,
		pressed: f.surface1,

		heading: f.text,
		strong: f.text,
		text: f.text,
		subtle: f.subtext1,
		muted: f.subtext0,
		faint: f.overlay2,

		divider: `${f.overlay0}33`,
		border: `${f.overlay0}4d`,
		borderStrong: `${f.overlay0}99`,

		accent: a,
		accentPress: mix(a, f.base, 0.15),
		onAccent: light ? f.base : f.crust,
		accentSoft: `${a}33`,
		accentText: a,
		// Discord draws white icons on the brand fill, so darken the pastel accent under them.
		brand: light ? a : mix(a, f.crust, 0.45),
		rowIcon: a,
		// Catppuccin's selection colour: overlay2 at 25%.
		selection: `${f.overlay2}40`,

		link: a,
		mentionText: a,
		mentionPill: `${a}4d`,
		mentionBg: `${f.yellow}17`,
		replyBg: `${f.blue}1a`,
		keyword: `${f.peach}40`,
		code: f.mantle,
		codeText: f.pink,
		spoiler: f.surface2,
		spoilerRevealed: `${f.surface2}40`,

		positive: f.green,
		warning: f.yellow,
		danger: f.red,
		dangerFill: light ? f.red : mix(f.red, f.crust, 0.4),
		scrim: `${f.crust}cc`,
	}
	return {
		palette,
		tone: toneOf(f, accent),
		extra: {
			// Text fields sit on crust and embeds on surface0, as in the Vendetta port.
			INPUT_BACKGROUND_DEFAULT: f.crust,
			EMBED_BACKGROUND: f.surface0,
			EMBED_BACKGROUND_ALTERNATE: f.surface0,
			MOBILE_EMBED_BACKGROUND_DEFAULT: f.surface0,
			MOBILE_THREAD_EMBED_BACKGROUND: f.surface0,
			SPINE_DEFAULT: f.surface2,
			THREAD_CHANNEL_SPINE: f.surface2,
			STATUS_ONLINE: f.green,
			ICON_STATUS_ONLINE: f.green,
			TEXT_STATUS_ONLINE: f.green,
			ICON_STATUS_IDLE: f.yellow,
			TEXT_STATUS_IDLE: f.yellow,
			ICON_STATUS_DND: f.red,
			TEXT_STATUS_DND: f.red,
			ICON_STATUS_OFFLINE: f.overlay1,
			TEXT_STATUS_OFFLINE: f.overlay1,
			ICON_VOICE_CONNECTED: f.green,
			TEXT_VOICE_CONNECTED: f.green,
			TEXT_FEEDBACK_INFO: f.sapphire,
			ICON_FEEDBACK_INFO: f.sapphire,
			// Tags and pills: blue, per Catppuccin's style guide.
			BADGE_PRIMARY_BACKGROUND: light ? f.blue : mix(f.blue, f.crust, 0.3),
			BADGE_PRIMARY_BORDER: light ? f.blue : mix(f.blue, f.crust, 0.3),
			POLLS_VICTOR_FILL: `${f.green}33`,
		},
	}
}

// Like Catppuccin's own ports, each theme follows Discord's appearance: dark flavours switch to Latte on
// Light, and Latte switches to Mocha on dark appearances.
const flavours = [
	['mocha', 'Mocha', mocha, 'The original, darkest flavour. Latte on Light.'],
	[
		'macchiato',
		'Macchiato',
		macchiato,
		'Medium contrast with gentle colours. Latte on Light.',
	],
	['frappe', 'Frappé', frappe, 'Muted and subdued dark. Latte on Light.'],
	['latte', 'Latte', latte, 'The light flavour. Mocha on dark appearances.'],
] as const

export interface CatppuccinStorage {
	accent: Accent
	/** Discord's raw palette retained for accent changes. */
	raw?: Record<string, string>
}

let storage: JsonStorage<CatppuccinStorage> | undefined

export const accentOf = (): Accent => storage?.cache?.accent ?? 'mauve'

export function colorsOf(
	id: string,
	accent: Accent,
	discord: { raw: Record<string, string> },
): ThemeColors {
	const [, , flavour] = flavours.find(f => f[0] === id)!
	const night = flavour === latte ? mocha : flavour
	const dark = lookOf(night, false, accent)
	// Each look maps Discord's colours with its own flavour's tone; the raw palette follows the theme's own.
	return themeColors(discord, toneOf(flavour, accent), {
		dark,
		darker: dark,
		midnight: dark,
		light: lookOf(latte, true, accent),
	})
}

export const flavourIds = flavours.map(f => f[0])

export default plugin<{ jsonStorage: CatppuccinStorage }>({
	jsonStorage: { load: true, default: { accent: 'mauve' } },
	preInit({ themes }) {
		themes.registerGroup('catppuccin', {
			name: 'Catppuccin',
			description:
				'Soothing pastel theme. Pick a flavour here and an accent in the plugin settings.',
		})

		for (const [id, name, , about] of flavours) {
			const cache = new Map<Accent, ThemeColors>()
			themes.registerTheme('catppuccin', id, {
				name: `Catppuccin ${name}`,
				description: about,
				getColors(discord) {
					if (storage && !storage.cache?.raw)
						storage.set({
							...storage.cache,
							raw: discord.raw,
						} as CatppuccinStorage)
					const accent = accentOf()
					let colors = cache.get(accent)
					if (!colors)
						cache.set(accent, (colors = colorsOf(id, accent, discord)))
					return colors
				},
			})
		}
	},
	init({ jsonStorage }) {
		storage = jsonStorage
	},
	// Valenced only opens the settings page of started plugins.
	start() {},
	SettingsComponent: Settings,
})
