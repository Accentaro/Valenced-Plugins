/// <reference types="@valenced/themes-api" />

import { lazyColors, mix } from '../../../shared/theme-kit'
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

const mocha: Flavour = {
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

/** Discord's greys and hues as Catppuccin colours. Each Discord hue takes its nearest Catppuccin colour. */
/**
 * Discord's greys and hues as Catppuccin colours, with `night` on dark appearances and Latte on Light.
 * Each Discord hue takes its nearest Catppuccin colour, from the theme's own flavour.
 */
function toneOf(night: Flavour, own: Flavour): Tone {
	const light = own === latte
	// Dark flavours darken the pastels so Discord's white text and icons stay readable on fills.
	const fill = (c: string, t = 0.3) => (light ? c : mix(c, own.crust, t))
	return {
		greys: [
			['#000000', mix(night.crust, '#000000', 0.4)],
			['#2c2d32', night.crust],
			['#323339', night.base],
			['#393a41', night.surface0],
			['#41434a', night.surface0],
			['#4e5058', night.surface1],
			['#595a63', night.surface2],
			['#81828a', night.overlay0],
			['#97979f', night.overlay1],
			['#abacb2', night.overlay2],
			['#c5c6ca', night.subtext0],
			['#efeff1', latte.crust],
			['#f3f3f4', latte.mantle],
			['#fbfbfb', latte.base],
			['#ffffff', mix(latte.base, '#ffffff', 0.5)],
		],
		hues: {
			red: fill(own.red),
			orange: fill(own.peach, 0.15),
			yellow: fill(own.yellow, 0.1),
			green: fill(own.green, 0.2),
			teal: fill(own.teal, 0.25),
			blue: fill(own.blue),
			blurple: fill(own.mauve, 0.45),
			purple: fill(own.lavender),
			pink: fill(own.pink),
		},
	}
}

function lookOf(f: Flavour, light: boolean): Look {
	const palette: Palette = {
		rail: f.crust,
		floor: f.base,
		panel: f.mantle,
		// Latte lifts cards above the page instead of greying them with surface0.
		page: light ? f.mantle : f.base,
		card: light ? f.base : f.surface0,
		popup: light ? f.base : f.surface0,
		input: light ? f.crust : f.surface0,
		control: light ? f.surface0 : f.surface1,
		pressed: light ? f.surface1 : f.surface2,

		heading: f.text,
		strong: f.text,
		text: f.subtext1,
		subtle: f.subtext0,
		// overlay2 is too faint on Latte's surfaces for timestamps and hints.
		muted: light ? f.subtext0 : f.overlay2,
		faint: f.overlay1,

		divider: `${f.overlay0}33`,
		border: `${f.overlay0}4d`,
		borderStrong: `${f.overlay0}99`,

		accent: f.mauve,
		accentPress: mix(f.mauve, f.base, 0.15),
		onAccent: light ? f.base : f.crust,
		accentSoft: `${f.mauve}33`,
		accentText: f.mauve,
		// Discord draws white icons on the brand fill, so darken pastel mauve under them.
		brand: light ? f.mauve : mix(f.mauve, f.crust, 0.45),
		rowIcon: f.mauve,
		// Catppuccin's selection colour: overlay2 at 25%.
		selection: `${f.overlay2}40`,

		link: f.blue,
		mentionText: f.mauve,
		mentionPill: `${f.mauve}33`,
		mentionBg: `${f.yellow}1a`,
		replyBg: `${f.blue}1a`,
		keyword: `${f.peach}40`,
		code: f.mantle,
		codeText: f.pink,
		spoiler: f.surface2,
		spoilerRevealed: f.surface0,

		positive: f.green,
		warning: f.yellow,
		danger: f.red,
		dangerFill: light ? f.red : mix(f.red, f.crust, 0.4),
		scrim: `${f.crust}cc`,
	}
	return {
		palette,
		extra: {
			// Catppuccin's status colours.
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

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('catppuccin', {
			name: 'Catppuccin',
			description: 'Soothing pastel theme, with mauve accents.',
		})

		for (const [id, name, flavour, about] of flavours) {
			const night = flavour === latte ? mocha : flavour
			const dark = lookOf(night, false)

			themes.registerTheme('catppuccin', id, {
				name: `Catppuccin ${name}`,
				description: about,
				getColors: lazyColors(toneOf(night, flavour), {
					dark,
					darker: dark,
					midnight: dark,
					light: lookOf(latte, true),
				}),
			})
		}
	},
})
