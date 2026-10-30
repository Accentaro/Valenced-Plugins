/// <reference types="@valenced/themes-api" />

import { fixChatBackground } from '../../../shared/chat-background'
import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Sampled from the background: near-black with a cold slate cast, and frost on everything raised.
// Light is a snow day: white drifts and slate ink.
const tone: Tone = {
	greys: [
		['#000000', '#020303'],
		['#2c2d32', '#050607'],
		['#323339', '#07090a'],
		['#393a41', '#0f1316'],
		['#41434a', '#151a1e'],
		['#595a63', '#2a3238'],
		['#81828a', '#64707a'],
		['#97979f', '#8e9aa3'],
		['#abacb2', '#a9b4bb'],
		['#c5c6ca', '#c6d0d6'],
		['#efeff1', '#e8eef2'],
		['#f3f3f4', '#f2f6f8'],
		['#fbfbfb', '#f7fafc'],
		['#ffffff', '#ffffff'],
	],
	// Colours seen through frosted glass: desaturated and cool.
	hues: {
		red: '#c4505c',
		orange: '#cc8a5e',
		yellow: '#d4b061',
		green: '#4fa58a',
		teal: '#4fa9b5',
		blue: '#5a9fd6',
		blurple: '#4b7c99',
		purple: '#8a86c9',
		pink: '#c47aa8',
	},
}

const frost = '#bfe6f5'

const night: Palette = {
	rail: '#050607',
	floor: '#07090a',
	panel: '#08090b',
	page: '#090c0e',
	card: '#0f1316',
	popup: '#121619',
	input: '#0c0f12',
	control: '#151a1e',
	pressed: '#1c2228',

	heading: '#ffffff',
	strong: '#eef4f7',
	text: '#d3dce1',
	subtle: '#a3afb6',
	muted: '#7e8a92',
	faint: '#5b666e',

	divider: '#d8eef712',
	border: '#d8eef721',
	borderStrong: '#d8eef740',

	// Snow-white buttons with frost-blue highlights.
	accent: '#e9f6fb',
	accentPress: '#c9dfe8',
	onAccent: '#06090b',
	accentSoft: `${frost}26`,
	accentText: frost,
	brand: '#4b7c99',
	rowIcon: frost,
	selection: `${frost}1a`,

	link: '#9fd6ec',
	mentionText: '#dff4fc',
	mentionPill: `${frost}33`,
	mentionBg: `${frost}14`,
	replyBg: '#ffffff0d',
	keyword: `${frost}40`,
	code: '#0d1114',
	codeText: frost,
	// Hidden spoilers sit under a snowdrift.
	spoiler: '#d6e2e8',
	spoilerRevealed: '#0f1316',

	positive: '#7fd1b3',
	warning: '#e8cf8f',
	danger: '#f0a0a8',
	dangerFill: '#b8434f',
	scrim: '#020304cc',
}

const day: Palette = {
	rail: '#edf2f5',
	floor: '#f7fafc',
	panel: '#f2f6f8',
	page: '#f2f6f8',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#e8eef2',
	control: '#e3eaef',
	pressed: '#d6dfe5',

	heading: '#0b1114',
	strong: '#0f171c',
	text: '#2a363e',
	subtle: '#4c5a63',
	muted: '#66747d',
	faint: '#98a5ad',

	divider: '#0f171c14',
	border: '#0f171c21',
	borderStrong: '#0f171c40',

	// Slate-ink buttons with steel-blue highlights.
	accent: '#2b4a5c',
	accentPress: '#203a49',
	onAccent: '#ffffff',
	accentSoft: '#4b7c9926',
	accentText: '#3c6e8c',
	brand: '#4b7c99',
	rowIcon: '#4b7c99',
	selection: '#4b7c991a',

	link: '#2f72a0',
	mentionText: '#2b5f80',
	mentionPill: '#4b7c992e',
	mentionBg: '#9fd6ec2e',
	replyBg: '#0f171c0a',
	keyword: '#9fd6ec66',
	code: '#eaf0f4',
	codeText: '#2f6a8c',
	spoiler: '#b8c8d2',
	spoilerRevealed: '#e3eaef',

	positive: '#1f8a62',
	warning: '#a07a1c',
	danger: '#c0414f',
	dangerFill: '#b8434f',
	scrim: '#0f171c59',
}

const dark: Look = {
	palette: night,
	extra: {
		// A thin frosted rim on raised surfaces.
		CARD_BORDER_DEFAULT: '#d8eef72b',
		MOBILE_CHATINPUT_BORDER_DEFAULT: '#d8eef72b',
		STATUS_ONLINE: '#5fbf9a',
	},
}

const light: Look = {
	palette: day,
	extra: {
		CARD_BORDER_DEFAULT: '#2b4a5c26',
		MOBILE_CHATINPUT_BORDER_DEFAULT: '#2b4a5c26',
	},
}

export default plugin({
	start: fixChatBackground,
	preInit({ themes }) {
		themes.registerGroup('frostfall', {
			name: 'Frostfall',
			description: 'Midnight snowfall, near-black with frosted white.',
		})
		themes.registerTheme('frostfall', 'frostfall', {
			name: 'Frostfall',
			description:
				'Soft snow drifting through a black night, or a bright snow day on Light.',
			background: {
				path: 'assets/first-snow.webp',
				opacity: 0.7,
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
