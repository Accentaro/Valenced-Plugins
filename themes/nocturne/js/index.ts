/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Sampled from the background: deep navy sky fading to rain-lit cyan.
const tone: Tone = {
	greys: [
		['#000000', '#010818'],
		['#2c2d32', '#020f26'],
		['#323339', '#031634'],
		['#393a41', '#0a2650'],
		['#41434a', '#0f2f5e'],
		['#595a63', '#2a5487'],
		['#81828a', '#5f86ad'],
		['#97979f', '#7ea6cc'],
		['#abacb2', '#93b8d8'],
		['#c5c6ca', '#b5d3ea'],
		['#efeff1', '#dcf0fb'],
		['#f3f3f4', '#e8f6fe'],
		['#fbfbfb', '#eef9ff'],
		['#ffffff', '#f8fdff'],
	],
	// Everything leans cool, as if seen through rain.
	hues: {
		red: '#c94a6b',
		orange: '#d98a5a',
		yellow: '#d9b85a',
		green: '#2fa889',
		teal: '#22a8b8',
		blue: '#1f7fd6',
		blurple: '#1a6fc9',
		purple: '#6a6ad9',
		pink: '#c25aa8',
	},
}

const rain = '#7fe3fd'
const moon = '#e6f0ff'

const night: Palette = {
	rail: '#020f26',
	floor: '#031634',
	panel: '#04193a',
	page: '#051a3c',
	// Glassy cards let the rain show through.
	card: '#0a2650cc',
	popup: '#0c2a56f2',
	input: '#08224acc',
	control: '#0f2f5e',
	pressed: '#143a70',

	heading: '#f6fcff',
	strong: '#e8f7ff',
	text: '#cfe6f7',
	subtle: '#9fc3e0',
	muted: '#86abcc',
	faint: '#5a7fa3',

	divider: '#8fdcff14',
	border: '#8fdcff2b',
	borderStrong: '#8fdcff4d',

	accent: rain,
	accentPress: '#5fd3f5',
	onAccent: '#021a3a',
	accentSoft: `${rain}29`,
	accentText: '#9eeaff',
	brand: '#1a6fc9',
	rowIcon: rain,
	selection: `${rain}1f`,

	link: '#8fd8ff',
	// Mentions glow like moonlight; replies like rain.
	mentionText: '#ffffff',
	mentionPill: `${moon}33`,
	mentionBg: `${moon}17`,
	replyBg: `${rain}14`,
	keyword: `${rain}40`,
	code: '#06204a',
	codeText: '#9eeaff',
	// Hidden spoilers are storm clouds.
	spoiler: '#1d4f8f',
	spoilerRevealed: '#08224a',

	positive: '#8de3c4',
	warning: '#f3d995',
	danger: '#ff9fb0',
	dangerFill: '#c73d5c',
	scrim: '#010818cc',
}

// Light: a pale rain-washed sky with navy ink.
const day: Palette = {
	rail: '#e1f2fc',
	floor: '#eef9ff',
	panel: '#e8f6fe',
	page: '#e8f6fe',
	card: '#f8fdffcc',
	popup: '#f8fdfff2',
	input: '#dcf0fbcc',
	control: '#d4ecfa',
	pressed: '#c3e2f5',

	heading: '#04193a',
	strong: '#04193a',
	text: '#1b3a63',
	subtle: '#3d5f88',
	muted: '#5a7ba3',
	faint: '#8aa6c4',

	divider: '#04193a17',
	border: '#04193a26',
	borderStrong: '#04193a4d',

	accent: '#1a6fc9',
	accentPress: '#155ca8',
	onAccent: '#ffffff',
	accentSoft: '#1a6fc926',
	accentText: '#155ca8',
	brand: '#1a6fc9',
	rowIcon: '#1f7fd6',
	selection: '#1a6fc91f',

	link: '#0d63b8',
	mentionText: '#0d4f99',
	mentionPill: '#1a6fc92e',
	mentionBg: `${rain}29`,
	replyBg: '#1a6fc914',
	keyword: `${rain}66`,
	code: '#dcf0fb',
	codeText: '#155ca8',
	spoiler: '#1d4f8f',
	spoilerRevealed: '#dcf0fb',

	positive: '#16865f',
	warning: '#a8780f',
	danger: '#c2365a',
	dangerFill: '#c73d5c',
	scrim: '#04193a59',
}

const dark: Look = {
	palette: night,
	extra: {
		// Cyan rims on the chat box and cards, like light catching rain.
		MOBILE_CHATINPUT_BORDER_DEFAULT: `${rain}33`,
		MOBILE_CHATINPUT_BORDER_ACTIVE: `${rain}80`,
		CARD_BORDER_DEFAULT: `${rain}26`,
		CONTROL_PRIMARY_BORDER_DEFAULT: '#ffffff40',
		STATUS_ONLINE: '#3cc9a0',
	},
}

const light: Look = {
	palette: day,
	extra: {
		MOBILE_CHATINPUT_BORDER_DEFAULT: '#1a6fc933',
		MOBILE_CHATINPUT_BORDER_ACTIVE: '#1a6fc980',
		CARD_BORDER_DEFAULT: '#1a6fc926',
	},
}

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('nocturne', {
			name: 'Nocturne',
			description: 'Navy skies and rain-lit cyan under a crescent moon.',
		})
		themes.registerTheme('nocturne', 'nocturne', {
			name: 'Nocturne',
			description:
				'A quiet walk through blue rain under a crescent moon, or a rain-washed sky on Light.',
			background: {
				path: 'assets/moonlit-rain.webp',
				opacity: 0.31,
				dimming: 0,
			},
			getColors: lazyColors(tone, {
				dark,
				darker: dark,
				midnight: dark,
				light,
			}),
		})
	},
})
