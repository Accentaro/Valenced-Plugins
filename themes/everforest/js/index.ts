/// <reference types="@valenced/themes-api" />

import { accentTheme } from '../../../shared/accent-theme'
import { fixChatBackground } from '../../../shared/chat-background'
import { themeOwnProfile } from '../../../shared/own-profile-theme'
import { mix, themeColors } from '../../../shared/theme-kit'
import type { AccentStorage } from '../../../shared/accent-theme'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Everforest palettes (MIT) from sainnhe/everforest: https://github.com/sainnhe/everforest
interface Background {
	dim: string
	bg0: string
	bg1: string
	bg2: string
	bg3: string
	bg4: string
	bg5: string
	green: string
}

interface Foreground {
	fg: string
	red: string
	orange: string
	yellow: string
	green: string
	aqua: string
	blue: string
	purple: string
	grey0: string
	grey1: string
	grey2: string
}

const darkFg: Foreground = {
	fg: '#d3c6aa',
	red: '#e67e80',
	orange: '#e69875',
	yellow: '#dbbc7f',
	green: '#a7c080',
	aqua: '#83c092',
	blue: '#7fbbb3',
	purple: '#d699b6',
	grey0: '#7a8478',
	grey1: '#859289',
	grey2: '#9da9a0',
}

const lightFg: Foreground = {
	fg: '#5c6a72',
	red: '#f85552',
	orange: '#f57d26',
	yellow: '#dfa000',
	green: '#8da101',
	aqua: '#35a77c',
	blue: '#3a94c5',
	purple: '#df69ba',
	grey0: '#a6b0a0',
	grey1: '#939f91',
	grey2: '#829181',
}

type Contrast = 'hard' | 'medium' | 'soft'

const darkBg: Record<Contrast, Background> = {
	hard: {
		dim: '#1e2326',
		bg0: '#272e33',
		bg1: '#2e383c',
		bg2: '#374145',
		bg3: '#414b50',
		bg4: '#495156',
		bg5: '#4f5b58',
		green: '#3c4841',
	},
	medium: {
		dim: '#232a2e',
		bg0: '#2d353b',
		bg1: '#343f44',
		bg2: '#3d484d',
		bg3: '#475258',
		bg4: '#4f585e',
		bg5: '#56635f',
		green: '#425047',
	},
	soft: {
		dim: '#293136',
		bg0: '#333c43',
		bg1: '#3a464c',
		bg2: '#434f55',
		bg3: '#4d5960',
		bg4: '#555f66',
		bg5: '#5d6b66',
		green: '#48584e',
	},
}

const lightBg: Record<Contrast, Background> = {
	hard: {
		dim: '#f2efdf',
		bg0: '#fffbef',
		bg1: '#f8f5e4',
		bg2: '#f2efdf',
		bg3: '#edeada',
		bg4: '#e8e5d5',
		bg5: '#bec5b2',
		green: '#f3f5d9',
	},
	medium: {
		dim: '#efebd4',
		bg0: '#fdf6e3',
		bg1: '#f4f0d9',
		bg2: '#efebd4',
		bg3: '#e6e2cc',
		bg4: '#e0dcc7',
		bg5: '#bdc3af',
		green: '#f0f1d2',
	},
	soft: {
		dim: '#e5dfc5',
		bg0: '#f3ead3',
		bg1: '#eae4ca',
		bg2: '#e5dfc5',
		bg3: '#ddd8be',
		bg4: '#d8d3ba',
		bg5: '#b9c0ab',
		green: '#e5e6c5',
	},
}

/** Everforest's accent colours, as pickable accents. */
const accents = [
	'green',
	'aqua',
	'blue',
	'purple',
	'red',
	'orange',
	'yellow',
] as const
type Accent = (typeof accents)[number]

/** The fill under Discord's white icons: the accent, deepened towards the ink on Light and the shade on dark. */
function brandOf(b: Background, f: Foreground, a: Accent, light: boolean) {
	return light ? mix(f[a], f.fg, 0.3) : mix(f[a], b.dim, 0.45)
}

/** Discord's greys and hues as Everforest colours, mapped from Ash on dark and from Light on Light. */
function toneOf(b: Background, f: Foreground, light: boolean, a: Accent): Tone {
	// Dark appearances darken the pastels so Discord's white text and icons stay readable on fills.
	const fill = (c: string, t = 0.3) => (light ? c : mix(c, b.dim, t))
	const greys: Tone['greys'] = light
		? [
				['#000000', mix(f.fg, '#000000', 0.5)],
				['#28282d', f.fg],
				['#2e2e34', f.fg],
				['#595a63', mix(f.fg, f.grey2, 0.35)],
				['#6c6d76', mix(f.fg, f.grey2, 0.7)],
				['#81828a', f.grey2],
				['#97979f', f.grey1],
				['#abacb2', f.grey0],
				['#c5c6ca', b.bg5],
				['#dbdcdf', b.bg4],
				['#e6e7e9', b.bg3],
				['#f3f3f4', b.bg2],
				['#fbfbfb', b.bg0],
				['#ffffff', mix(b.bg0, '#ffffff', 0.5)],
			]
		: [
				['#000000', mix(b.dim, '#000000', 0.4)],
				['#2c2d32', b.dim],
				['#323339', b.bg0],
				['#393a41', b.bg1],
				['#41434a', b.bg2],
				['#4e5058', b.bg3],
				['#595a63', b.bg4],
				['#81828a', f.grey0],
				['#97979f', f.grey1],
				['#abacb2', f.grey2],
				['#c5c6ca', mix(f.grey2, f.fg, 0.5)],
				['#f3f3f4', f.fg],
				['#ffffff', f.fg],
			]
	return {
		greys,
		hues: {
			red: fill(f.red),
			orange: fill(f.orange, 0.15),
			yellow: fill(f.yellow, 0.1),
			green: fill(f.green, 0.25),
			teal: fill(f.aqua, 0.25),
			blue: fill(f.blue),
			// Discord's blurple follows the accent.
			blurple: brandOf(b, f, a, light),
			purple: fill(f.purple),
			pink: fill(mix(f.purple, f.red, 0.4)),
		},
	}
}

function lookOf(b: Background, f: Foreground, light: boolean, a: Accent): Look {
	// The light accents are bright, so deepen them towards the ink for buttons and text.
	const accent = light ? mix(f[a], f.fg, 0.25) : f[a]
	const ink = light ? mix(f[a], f.fg, 0.4) : f[a]
	const leaf = light ? mix(f.green, f.fg, 0.4) : f.green
	const brand = brandOf(b, f, a, light)
	// Aqua is the second voice for mentions; an aqua accent swaps it for blue.
	const second = a === 'aqua' ? f.blue : f.aqua
	const line = light ? f.grey1 : f.grey0
	const panel = light ? b.bg1 : mix(b.dim, b.bg0, 0.5)
	// Glassy cards, so the misty pines show through.
	const card = light ? b.bg0 : b.bg1
	const palette: Palette = {
		rail: b.dim,
		floor: b.bg0,
		panel,
		page: panel,
		card: `${card}cc`,
		popup: light ? `${b.bg0}f2` : `${b.bg2}f2`,
		input: `${b.bg1}cc`,
		control: b.bg3,
		pressed: b.bg4,

		heading: f.fg,
		strong: f.fg,
		text: f.fg,
		subtle: mix(f.fg, f.grey2, 0.3),
		muted: light ? mix(f.fg, f.grey2, 0.6) : f.grey2,
		faint: light ? f.grey2 : f.grey1,

		divider: `${line}33`,
		border: `${line}55`,
		borderStrong: `${line}99`,

		accent,
		accentPress: mix(accent, b.bg0, 0.15),
		onAccent: light ? b.bg0 : b.dim,
		accentSoft: `${accent}33`,
		accentText: ink,
		brand,
		rowIcon: ink,
		// Everforest's green line highlight on dark, tinted by the accent; a soft wash on Light.
		selection: light
			? `${accent}2e`
			: a === 'green'
				? b.green
				: mix(b.bg0, f[a], 0.16),

		link: f.blue,
		mentionText: second,
		mentionPill: `${second}33`,
		mentionBg: `${f.yellow}1a`,
		replyBg: `${accent}1a`,
		keyword: `${f.orange}40`,
		code: light ? b.bg2 : b.dim,
		codeText: leaf,
		spoiler: b.bg5,
		spoilerRevealed: `${b.bg5}40`,

		positive: leaf,
		warning: light ? mix(f.yellow, f.fg, 0.3) : f.yellow,
		danger: f.red,
		dangerFill: light ? f.red : mix(f.red, b.dim, 0.3),
		scrim: light ? `${darkBg.medium.dim}66` : `${b.dim}cc`,
	}
	return {
		palette,
		tone: toneOf(b, f, light, a),
		extra: {
			INPUT_BACKGROUND_DEFAULT: light ? b.bg1 : b.dim,
			// Discord draws some primary button icons in white, so they sit on the deeper brand fill.
			CONTROL_PRIMARY_BACKGROUND_DEFAULT: brand,
			CONTROL_PRIMARY_BACKGROUND_ACTIVE: mix(brand, b.dim, 0.15),
			CONTROL_PRIMARY_TEXT_DEFAULT: '#ffffff',
			// A soft accent edge on the chat box and cards, like light through the leaves.
			MOBILE_CHATINPUT_BORDER_DEFAULT: `${accent}33`,
			MOBILE_CHATINPUT_BORDER_ACTIVE: `${accent}80`,
			CARD_BORDER_DEFAULT: `${accent}1f`,
			STATUS_ONLINE: f.green,
			ICON_STATUS_ONLINE: f.green,
			TEXT_STATUS_ONLINE: leaf,
			ICON_STATUS_IDLE: f.yellow,
			TEXT_STATUS_IDLE: palette.warning,
			ICON_STATUS_DND: f.red,
			TEXT_STATUS_DND: f.red,
			ICON_STATUS_OFFLINE: f.grey1,
			TEXT_STATUS_OFFLINE: f.grey1,
			ICON_VOICE_CONNECTED: f.green,
			TEXT_VOICE_CONNECTED: leaf,
			TEXT_FEEDBACK_INFO: f.blue,
			ICON_FEEDBACK_INFO: f.blue,
			BADGE_PRIMARY_BACKGROUND: brand,
			BADGE_PRIMARY_BORDER: brand,
			POLLS_VICTOR_FILL: `${f.green}33`,
		},
	}
}

// Each contrast pairs Everforest Dark on dark appearances with Everforest Light on Light.
const contrasts = [
	['medium', 'Medium', 'The default contrast.'],
	['hard', 'Hard', 'Deeper backgrounds and crisper contrast.'],
	['soft', 'Soft', 'Lighter, gentler backgrounds.'],
] as const

const theme = accentTheme<Accent>({
	name: 'Everforest',
	accents,
	fallback: 'green',
	swatch: darkFg,
	themeIds: contrasts.map(c => c[0]),
	colorsOf(id, a, discord) {
		const c = id as Contrast
		const dark = lookOf(darkBg[c], darkFg, false, a)
		return themeColors(discord, toneOf(darkBg[c], darkFg, false, a), {
			dark,
			darker: dark,
			midnight: dark,
			light: lookOf(lightBg[c], lightFg, true, a),
		})
	},
})

export default plugin<{ jsonStorage: AccentStorage<Accent> }>({
	jsonStorage: { load: true, default: { accent: 'green' } },
	preInit({ themes }) {
		themes.registerGroup('everforest', {
			name: 'Everforest',
			description:
				'Warm forest greens and soft parchment. Pick a contrast here and an accent in the plugin settings.',
		})
		for (const [id, name, about] of contrasts)
			themes.registerTheme('everforest', id, {
				name: `Everforest ${name}`,
				description: `${about} Everforest Light on Light.`,
				// Drawn for this theme in the Everforest palette: pines fading into morning mist.
				background: {
					path: 'assets/misty-pines.webp',
					opacity: 0.42,
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
