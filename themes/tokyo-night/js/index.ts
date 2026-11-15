/// <reference types="@valenced/themes-api" />

import { accentTheme } from '../../../shared/accent-theme'
import { fixChatBackground } from '../../../shared/chat-background'
import { themeOwnProfile } from '../../../shared/own-profile-theme'
import { mix, themeColors } from '../../../shared/theme-kit'
import type { AccentStorage } from '../../../shared/accent-theme'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Tokyo Night palettes (Apache-2.0) from folke/tokyonight.nvim: https://github.com/folke/tokyonight.nvim
interface Variant {
	bgDark1: string
	bgDark: string
	bg: string
	bgHighlight: string
	bgVisual: string
	fgGutter: string
	terminalBlack: string
	dark3: string
	comment: string
	dark5: string
	fgDark: string
	fg: string
	blue0: string
	blue: string
	cyan: string
	blue1: string
	magenta: string
	magenta2: string
	purple: string
	orange: string
	yellow: string
	green: string
	green1: string
	teal: string
	red: string
	red1: string
}

const night: Variant = {
	bgDark1: '#0c0e14',
	bgDark: '#16161e',
	bg: '#1a1b26',
	bgHighlight: '#292e42',
	bgVisual: '#283457',
	fgGutter: '#3b4261',
	terminalBlack: '#414868',
	dark3: '#545c7e',
	comment: '#565f89',
	dark5: '#737aa2',
	fgDark: '#a9b1d6',
	fg: '#c0caf5',
	blue0: '#3d59a1',
	blue: '#7aa2f7',
	cyan: '#7dcfff',
	blue1: '#2ac3de',
	magenta: '#bb9af7',
	magenta2: '#ff007c',
	purple: '#9d7cd8',
	orange: '#ff9e64',
	yellow: '#e0af68',
	green: '#9ece6a',
	green1: '#73daca',
	teal: '#1abc9c',
	red: '#f7768e',
	red1: '#db4b4b',
}

const storm: Variant = {
	...night,
	bgDark1: '#1b1e2d',
	bgDark: '#1f2335',
	bg: '#24283b',
	bgVisual: '#2e3c64',
}

const moon: Variant = {
	bgDark1: '#191b29',
	bgDark: '#1e2030',
	bg: '#222436',
	bgHighlight: '#2f334d',
	bgVisual: '#2d3f76',
	fgGutter: '#3b4261',
	terminalBlack: '#444a73',
	dark3: '#545c7e',
	comment: '#636da6',
	dark5: '#737aa2',
	fgDark: '#828bb8',
	fg: '#c8d3f5',
	blue0: '#3e68d7',
	blue: '#82aaff',
	cyan: '#86e1fc',
	blue1: '#65bcff',
	magenta: '#c099ff',
	magenta2: '#ff007c',
	purple: '#fca7ea',
	orange: '#ff966c',
	yellow: '#ffc777',
	green: '#c3e88d',
	green1: '#4fd6be',
	teal: '#4fd6be',
	red: '#ff757f',
	red1: '#c53b53',
}

const day: Variant = {
	bgDark1: '#c1c9df',
	bgDark: '#d0d5e3',
	bg: '#e1e2e7',
	bgHighlight: '#c4c8da',
	bgVisual: '#b7c1e3',
	fgGutter: '#a8aecb',
	terminalBlack: '#a1a6c5',
	dark3: '#8990b3',
	comment: '#848cb5',
	dark5: '#68709a',
	fgDark: '#6172b0',
	fg: '#3760bf',
	blue0: '#7890dd',
	blue: '#2e7de9',
	cyan: '#007197',
	blue1: '#188092',
	magenta: '#9854f1',
	magenta2: '#d20065',
	purple: '#7847bd',
	orange: '#b15c00',
	yellow: '#8c6c3e',
	green: '#587539',
	green1: '#387068',
	teal: '#118c74',
	red: '#f52a65',
	red1: '#c64343',
}

/** Tokyo Night's accent colours, as pickable accents. */
const accents = [
	'blue',
	'cyan',
	'teal',
	'green',
	'yellow',
	'orange',
	'red',
	'magenta',
	'purple',
] as const
type Accent = (typeof accents)[number]

function accentOf(v: Variant, a: Accent) {
	const colours: Record<Accent, string> = {
		blue: v.blue,
		cyan: v.cyan,
		teal: v.green1,
		green: v.green,
		yellow: v.yellow,
		orange: v.orange,
		red: v.red,
		magenta: v.magenta,
		purple: v.purple,
	}
	return colours[a]
}

/** The fill under Discord's white icons: Tokyo Night's search blue, or the accent deepened on dark. */
function brandOf(v: Variant, a: Accent, light: boolean) {
	if (light) return accentOf(v, a)
	return a === 'blue' ? v.blue0 : mix(accentOf(v, a), v.bgDark1, 0.45)
}

/** Discord's greys and hues as Tokyo Night colours, mapped from Ash on dark variants and from Light on Day. */
function toneOf(v: Variant, light: boolean, a: Accent): Tone {
	// Dark variants darken the bright accents so Discord's white text and icons stay readable on fills.
	const fill = (c: string, t = 0.3) => (light ? c : mix(c, v.bgDark1, t))
	const greys: Tone['greys'] = light
		? [
				['#000000', mix(v.fg, '#000000', 0.5)],
				['#28282d', v.fg],
				['#2e2e34', v.fg],
				['#595a63', v.fgDark],
				['#6c6d76', v.dark5],
				['#81828a', v.comment],
				['#97979f', v.dark3],
				['#abacb2', v.terminalBlack],
				['#c5c6ca', v.fgGutter],
				['#dbdcdf', v.bgHighlight],
				['#e6e7e9', v.bgDark1],
				['#f3f3f4', v.bgDark],
				['#fbfbfb', v.bg],
				['#ffffff', mix(v.bg, '#ffffff', 0.5)],
			]
		: [
				['#000000', v.bgDark1],
				['#2c2d32', v.bgDark],
				['#323339', v.bg],
				['#393a41', v.bgHighlight],
				['#41434a', mix(v.bgHighlight, v.fgGutter, 0.5)],
				['#4e5058', v.fgGutter],
				['#595a63', v.terminalBlack],
				['#81828a', v.comment],
				['#97979f', v.dark5],
				['#abacb2', mix(v.dark5, v.fgDark, 0.5)],
				['#c5c6ca', v.fgDark],
				['#dbdcdf', mix(v.fgDark, v.fg, 0.5)],
				['#f3f3f4', v.fg],
				['#ffffff', v.fg],
			]
	return {
		greys,
		hues: {
			red: fill(v.red1, 0.1),
			orange: fill(v.orange, 0.15),
			yellow: fill(v.yellow, 0.1),
			green: fill(v.green, 0.2),
			teal: fill(v.teal, 0.2),
			blue: fill(v.blue),
			// Discord's blurple follows the accent.
			blurple: brandOf(v, a, light),
			purple: fill(v.magenta),
			pink: fill(v.magenta2, 0.35),
		},
	}
}

function lookOf(v: Variant, light: boolean, a: Accent): Look {
	const accent = accentOf(v, a)
	// Magenta is Tokyo Night's second voice; magenta and purple accents swap it for blue.
	const second = a === 'magenta' || a === 'purple' ? v.blue : v.magenta
	const brand = brandOf(v, a, light)
	// Day lifts cards and fields towards white; dark variants raise cards halfway to the highlight
	// colour. Both are glassy, so the neon alley shows through.
	const lift = light ? mix(v.bg, '#ffffff', 0.4) : mix(v.bg, v.bgHighlight, 0.5)
	const palette: Palette = {
		rail: v.bgDark1,
		floor: v.bg,
		panel: v.bgDark,
		page: v.bgDark,
		card: `${lift}cc`,
		popup: `${lift}f2`,
		input: light ? `${lift}cc` : `${v.bgDark}cc`,
		control: v.bgHighlight,
		pressed: light ? mix(v.bgHighlight, v.fgGutter, 0.5) : v.fgGutter,

		heading: v.fg,
		strong: v.fg,
		text: v.fg,
		subtle: v.fgDark,
		muted: v.dark5,
		faint: v.comment,

		divider: `${v.fgGutter}66`,
		border: `${v.fgGutter}aa`,
		borderStrong: `${v.dark3}cc`,

		accent,
		accentPress: mix(accent, v.bg, 0.15),
		onAccent: light ? '#ffffff' : v.bgDark1,
		accentSoft: `${accent}33`,
		accentText: accent,
		brand,
		rowIcon: accent,
		selection: a === 'blue' ? v.bgVisual : `${accent}2e`,

		link: a === 'cyan' ? v.blue : v.cyan,
		mentionText: second,
		mentionPill: `${second}33`,
		mentionBg: `${v.yellow}17`,
		replyBg: `${accent}1a`,
		keyword: `${v.orange}40`,
		// Inline code sits a step darker, like a terminal pane.
		code: light ? v.bgDark : v.bgDark1,
		codeText: v.green1,
		spoiler: v.terminalBlack,
		spoilerRevealed: `${v.terminalBlack}40`,

		positive: v.green,
		warning: v.yellow,
		danger: v.red,
		dangerFill: v.red1,
		scrim: light ? `${night.bgDark1}66` : `${v.bgDark1}cc`,
	}
	return {
		palette,
		tone: toneOf(v, light, a),
		extra: {
			INPUT_BACKGROUND_DEFAULT: light ? lift : v.bgDark1,
			// Discord draws some primary button icons in white, so primary buttons use the deeper brand fill.
			CONTROL_PRIMARY_BACKGROUND_DEFAULT: brand,
			CONTROL_PRIMARY_BACKGROUND_ACTIVE: mix(brand, v.bgDark1, 0.15),
			CONTROL_PRIMARY_TEXT_DEFAULT: '#ffffff',
			// Neon rims on the chat box and cards.
			MOBILE_CHATINPUT_BORDER_DEFAULT: `${accent}40`,
			MOBILE_CHATINPUT_BORDER_ACTIVE: `${accent}99`,
			CARD_BORDER_DEFAULT: `${accent}26`,
			STATUS_ONLINE: v.green,
			ICON_STATUS_ONLINE: v.green,
			TEXT_STATUS_ONLINE: v.green,
			ICON_STATUS_IDLE: v.yellow,
			TEXT_STATUS_IDLE: v.yellow,
			ICON_STATUS_DND: v.red,
			TEXT_STATUS_DND: v.red,
			ICON_STATUS_OFFLINE: v.comment,
			TEXT_STATUS_OFFLINE: v.comment,
			ICON_VOICE_CONNECTED: v.green,
			TEXT_VOICE_CONNECTED: v.green,
			TEXT_FEEDBACK_INFO: v.cyan,
			ICON_FEEDBACK_INFO: v.cyan,
			BADGE_PRIMARY_BACKGROUND: brand,
			BADGE_PRIMARY_BORDER: brand,
			POLLS_VICTOR_FILL: `${v.green}33`,
		},
	}
}

// Each dark variant switches to Day on Light, and Day switches to Night on dark appearances.
const variants = [
	['night', 'Night', night, 'The original deep navy. Day on Light.'],
	['storm', 'Storm', storm, 'A lighter, stormy slate. Day on Light.'],
	['moon', 'Moon', moon, 'Softer contrast with warmer accents. Day on Light.'],
	['day', 'Day', day, 'The light variant. Night on dark appearances.'],
] as const

const theme = accentTheme<Accent>({
	name: 'Tokyo Night',
	accents,
	fallback: 'blue',
	swatch: Object.fromEntries(
		accents.map(a => [a, accentOf(night, a)]),
	) as Record<Accent, string>,
	themeIds: variants.map(v => v[0]),
	colorsOf(id, a, discord) {
		const [, , variant] = variants.find(v => v[0] === id)!
		const dark = lookOf(variant === day ? night : variant, false, a)
		return themeColors(discord, toneOf(variant, variant === day, a), {
			dark,
			darker: dark,
			midnight: dark,
			light: lookOf(day, true, a),
		})
	},
})

export default plugin<{ jsonStorage: AccentStorage<Accent> }>({
	jsonStorage: { load: true, default: { accent: 'blue' } },
	preInit({ themes }) {
		themes.registerGroup('tokyonight', {
			name: 'Tokyo Night',
			description:
				'Neon city lights after dark. Pick a variant here and an accent in the plugin settings.',
		})
		for (const [id, name, , about] of variants)
			themes.registerTheme('tokyonight', id, {
				name: `Tokyo Night ${name}`,
				description: about,
				// Drawn for this theme in the Tokyo Night palette: a rainy neon alley at night.
				background: {
					path: 'assets/neon-alley.webp',
					opacity: 0.38,
					dimming: 0,
				},
				getColors: theme.getColors(id),
			})
	},
	init({ jsonStorage }) {
		theme.bind(jsonStorage)
	},
	start(api) {
		fixChatBackground(api as never, { seamless: true })
		themeOwnProfile(api as never)
	},
	SettingsComponent: theme.Settings,
})
