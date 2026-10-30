/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Sampled from the background: plum night sky warming to a coral horizon.
const tone: Tone = {
	greys: [
		['#000000', '#07040b'],
		['#2c2d32', '#0b0810'],
		['#323339', '#110c18'],
		['#393a41', '#21162d'],
		['#41434a', '#2b1c39'],
		['#595a63', '#4a3256'],
		['#81828a', '#7d6278'],
		['#97979f', '#a3879c'],
		['#abacb2', '#b99cae'],
		['#c5c6ca', '#d4b9c6'],
		['#efeff1', '#f6e3e0'],
		['#f3f3f4', '#fbebe6'],
		['#fbfbfb', '#fff4ef'],
		['#ffffff', '#fffaf7'],
	],
	// Sunset light: everything warms toward coral and rose.
	hues: {
		red: '#c23548',
		orange: '#e0603f',
		yellow: '#e09a3e',
		green: '#4f9e74',
		teal: '#4c9c9c',
		blue: '#6a6fc9',
		blurple: '#c0445a',
		purple: '#9a4fb8',
		pink: '#d2508f',
	},
}

const coral = '#ff8a6b'
const rose = '#e0609f'
const amber = '#ffb35c'

const night: Palette = {
	rail: '#0b0810',
	floor: '#110c18',
	panel: '#140e1d',
	page: '#160f20',
	card: '#21162d',
	popup: '#261a33',
	input: '#1d1428',
	control: '#2b1c39',
	pressed: '#352245',

	heading: '#fff4f2',
	strong: '#fbecef',
	text: '#ead3dc',
	subtle: '#c9a7ba',
	muted: '#a6879e',
	faint: '#765d72',

	// Rose-lit edges, like the planet's ring.
	divider: '#ffb5a014',
	border: '#ffb5a026',
	borderStrong: '#ff9c8a4d',

	accent: coral,
	accentPress: '#f67558',
	onAccent: '#2a0c14',
	accentSoft: `${coral}2e`,
	accentText: '#ffa486',
	brand: '#c0445a',
	rowIcon: '#ff9878',
	selection: `${coral}1f`,

	link: '#f2a6d6',
	// Mentions glow magenta, replies amber, like the two ends of the sunset.
	mentionText: '#ffd0e4',
	mentionPill: `${rose}40`,
	mentionBg: `${rose}1a`,
	replyBg: `${amber}14`,
	keyword: `${amber}40`,
	code: '#1a1124',
	codeText: '#ffb59a',
	spoiler: '#4a2a52',
	spoilerRevealed: '#1d1428',

	positive: '#a6dcb0',
	warning: '#ffcf8a',
	danger: '#ff8f98',
	dangerFill: '#c23548',
	scrim: '#07040bcc',
}

// Light: the same sky at dawn, peach and rose with plum ink.
const dawn: Palette = {
	rail: '#f7e4df',
	floor: '#fff4ef',
	panel: '#fbebe6',
	page: '#fbebe6',
	card: '#fffaf7',
	popup: '#fffaf7',
	input: '#f6e3e0',
	control: '#f3dcd8',
	pressed: '#ebcdcb',

	heading: '#2a1626',
	strong: '#2a1626',
	text: '#4a3044',
	subtle: '#6e5068',
	muted: '#8a6b80',
	faint: '#b096a8',

	divider: '#2a16261a',
	border: '#2a16262b',
	borderStrong: '#c0445a59',

	accent: '#e0603f',
	accentPress: '#c9502f',
	onAccent: '#ffffff',
	accentSoft: '#e0603f26',
	accentText: '#b8432a',
	brand: '#c0445a',
	rowIcon: '#d0583c',
	selection: '#e0603f1f',

	link: '#a8407e',
	mentionText: '#9c2f6a',
	mentionPill: `${rose}33`,
	mentionBg: `${rose}17`,
	replyBg: '#e09a3e1f',
	keyword: `${amber}59`,
	code: '#f6e3e0',
	codeText: '#a8407e',
	spoiler: '#4a2a52',
	spoilerRevealed: '#f3dcd8',

	positive: '#2f8a5c',
	warning: '#b0741a',
	danger: '#c23548',
	dangerFill: '#c23548',
	scrim: '#2a162666',
}

const dark: Look = {
	palette: night,
	extra: {
		MOBILE_CHATINPUT_BORDER_DEFAULT: `${coral}33`,
		MOBILE_CHATINPUT_BORDER_ACTIVE: `${coral}80`,
		CONTROL_PRIMARY_BORDER_DEFAULT: '#ffffff33',
		STATUS_ONLINE: '#5fbf86',
	},
}

const light: Look = {
	palette: dawn,
	extra: {
		MOBILE_CHATINPUT_BORDER_DEFAULT: '#e0603f40',
		MOBILE_CHATINPUT_BORDER_ACTIVE: '#e0603f80',
	},
}

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('celestia', {
			name: 'Celestia',
			description: 'Plum night and a coral horizon beneath a ringed planet.',
		})
		themes.registerTheme('celestia', 'celestia', {
			name: 'Celestia',
			description:
				'A ringed planet rising over a coral sunset, or a peach dawn on Light.',
			background: {
				path: 'assets/saturn-dusk.webp',
				opacity: 0.35,
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
