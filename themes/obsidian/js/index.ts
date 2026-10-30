/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Every surface is pure black, or pure white on Light. Panels, cards and menus are told apart by
// hairline borders alone.
const tone: Tone = {
	greys: [
		['#000000', '#000000'],
		// Everything up to Discord's popup menus collapses to black.
		['#41434a', '#000000'],
		['#4e5058', '#18181b'],
		['#595a63', '#26262a'],
		['#81828a', '#64646b'],
		['#97979f', '#86868e'],
		['#abacb2', '#a1a1a8'],
		['#c5c6ca', '#c3c3c9'],
		// Light's surfaces and Ash's text both collapse to white.
		['#efeff1', '#f7f7f8'],
		['#f3f3f4', '#ffffff'],
	],
	// Status and feedback colours stay recognisable, slightly softened for black.
	hues: {
		red: '#c9343c',
		orange: '#e2702a',
		yellow: '#e3a52a',
		green: '#2e9a5c',
		teal: '#3fa2aa',
		blue: '#3a7fd2',
		// Discord's blurple becomes graphite, so brand surfaces stay monochrome.
		blurple: '#2c2c31',
		purple: '#8a5ad0',
		pink: '#cf58a4',
	},
}

const black: Palette = {
	rail: '#000000',
	floor: '#000000',
	panel: '#000000',
	page: '#000000',
	card: '#000000',
	popup: '#000000',
	input: '#000000',
	control: '#000000',
	pressed: '#141416',

	heading: '#ffffff',
	strong: '#f2f2f4',
	text: '#d6d6db',
	subtle: '#a3a3ab',
	muted: '#7c7c85',
	faint: '#5c5c64',

	divider: '#ffffff12',
	border: '#ffffff1f',
	borderStrong: '#ffffff38',

	accent: '#f2f2f4',
	accentPress: '#cdcdd2',
	onAccent: '#000000',
	accentSoft: '#ffffff1a',
	accentText: '#ffffff',
	brand: '#2c2c31',
	rowIcon: '#e4e4e8',
	selection: '#ffffff17',

	link: '#a9c6f2',
	mentionText: '#ffffff',
	mentionPill: '#ffffff26',
	mentionBg: '#ffffff0f',
	replyBg: '#a9c6f212',
	keyword: '#ffffff2e',
	code: '#0d0d0f',
	codeText: '#e8e8ec',
	spoiler: '#232327',
	spoilerRevealed: '#111113',

	positive: '#5fc48a',
	warning: '#e3b456',
	danger: '#f07c7c',
	dangerFill: '#c9343c',
	scrim: '#000000d9',
}

// The same idea inverted: pure white with ink hairlines.
const white: Palette = {
	rail: '#ffffff',
	floor: '#ffffff',
	panel: '#ffffff',
	page: '#ffffff',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#ffffff',
	control: '#ffffff',
	pressed: '#f0f0f2',

	heading: '#000000',
	strong: '#0a0a0b',
	text: '#26262a',
	subtle: '#55555c',
	muted: '#6e6e76',
	faint: '#9a9aa1',

	divider: '#00000012',
	border: '#0000001f',
	borderStrong: '#00000038',

	accent: '#0a0a0b',
	accentPress: '#2a2a2e',
	onAccent: '#ffffff',
	accentSoft: '#0000000f',
	accentText: '#000000',
	brand: '#2c2c31',
	rowIcon: '#1c1c1f',
	selection: '#0000000d',

	link: '#2f62b8',
	mentionText: '#000000',
	mentionPill: '#0000001a',
	mentionBg: '#0000000a',
	replyBg: '#2f62b80f',
	keyword: '#0000001f',
	code: '#f3f3f5',
	codeText: '#1c1c1f',
	spoiler: '#d8d8dc',
	spoilerRevealed: '#f0f0f2',

	positive: '#1f8a52',
	warning: '#a87a12',
	danger: '#c9343c',
	dangerFill: '#c9343c',
	scrim: '#00000059',
}

const dark: Look = {
	palette: black,
	extra: {
		// A grey edge keeps white primary buttons crisp against black.
		CONTROL_PRIMARY_BORDER_DEFAULT: '#ffffff33',
		MOBILE_BACKGROUND_SCRIM_OPAQUE: '#000000',
		BACKGROUND_SCRIM_LIGHTBOX: '#000000f2',
		OVERLAY_BACKDROP_LIGHTBOX: '#000000f2',
	},
}

const light: Look = {
	palette: white,
	extra: {
		CONTROL_PRIMARY_BORDER_DEFAULT: '#00000033',
	},
}

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('obsidian', {
			name: 'Obsidian',
			description: 'Pure black, hairline borders and quiet silver accents.',
		})
		themes.registerTheme('obsidian', 'obsidian', {
			name: 'Obsidian',
			description:
				'True black on every surface for OLED screens, or crisp white on Light.',
			getColors: lazyColors(tone, {
				dark,
				darker: dark,
				midnight: dark,
				light,
			}),
		})
	},
})
