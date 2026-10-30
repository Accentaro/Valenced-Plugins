/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

const ink = '#2d2a32'

// One scale from indigo ink to cream paper. Dark appearances land on the ink end, Light on the paper end.
const tone: Tone = {
	greys: [
		['#000000', '#100d16'],
		['#28282d', '#1f1b29'],
		['#2c2d32', '#17151f'],
		['#323339', '#1e1b28'],
		['#393a41', '#282435'],
		['#41434a', '#2f2a3e'],
		['#595a63', '#4a4458'],
		['#81828a', '#7d7392'],
		['#97979f', '#9e93b3'],
		['#abacb2', '#b3a9c6'],
		['#c5c6ca', '#d4c8d6'],
		['#efeff1', '#f7ecee'],
		['#f3f3f4', '#f3e8e6'],
		['#fbfbfb', '#fffaf5'],
		['#ffffff', '#fffdfb'],
	],
	// Pastel fills in the sakura, mint, butter and sky of a shoujo cover.
	hues: {
		red: '#d9546a',
		orange: '#e8875a',
		yellow: '#e0a82e',
		green: '#3fa877',
		teal: '#3fa6a8',
		blue: '#4a86d6',
		blurple: '#d9739a',
		purple: '#9a74d6',
		pink: '#e06cb0',
	},
}

// Day: cream manga paper, ink outlines and sakura pink.
const paper: Palette = {
	rail: '#f3e8e6',
	floor: '#fffaf5',
	panel: '#fbf2ee',
	page: '#fbf2ee',
	card: '#fffdfb',
	popup: '#fffdfb',
	input: '#f7eef0',
	control: '#f6e9ed',
	pressed: '#f0dfe5',

	heading: ink,
	strong: ink,
	text: '#4a4250',
	subtle: '#6f6577',
	muted: '#7d7388',
	faint: '#a89eb0',

	// Ink outlines, like the panels on a manga page.
	divider: `${ink}1f`,
	border: `${ink}33`,
	borderStrong: `${ink}73`,

	accent: '#f2a7bf',
	accentPress: '#ec92b0',
	onAccent: '#3a2530',
	accentSoft: '#f2a7bf40',
	accentText: '#b84874',
	brand: '#d9739a',
	rowIcon: '#d0668f',
	selection: '#f2a7bf33',

	link: '#3f73bd',
	mentionText: '#a83c66',
	mentionPill: '#f2a7bf59',
	mentionBg: '#f2a7bf2e',
	replyBg: '#b8a6f02e',
	keyword: '#ffd98a80',
	// Inline code reads like screentone.
	code: '#f1e6ea',
	codeText: '#a83c66',
	// Hidden spoilers are solid ink, like censored lettering.
	spoiler: ink,
	spoilerRevealed: '#f1e6ea',

	positive: '#2f8a5c',
	warning: '#b8801a',
	danger: '#d24b63',
	dangerFill: '#dc5a73',
	scrim: `${ink}66`,
}

// Night: an indigo evening with the same pastels glowing softly.
const night: Palette = {
	rail: '#17151f',
	floor: '#1e1b28',
	panel: '#1b1925',
	page: '#1b1925',
	card: '#262233',
	popup: '#2b2739',
	input: '#262233',
	control: '#2f2a3e',
	pressed: '#3a3449',

	heading: '#fff7fb',
	strong: '#f8f3ff',
	text: '#e6dff0',
	subtle: '#c3b8d6',
	muted: '#9e93b3',
	faint: '#7d7392',

	divider: '#f5e9ff12',
	border: '#f5e9ff21',
	borderStrong: '#f5e9ff40',

	accent: '#f5b8cc',
	accentPress: '#f0a3bd',
	onAccent: '#2a1a22',
	accentSoft: '#f5b8cc2e',
	accentText: '#f7bfd2',
	brand: '#c86a8e',
	rowIcon: '#f5b8cc',
	selection: '#f5b8cc24',

	link: '#9cc8ff',
	mentionText: '#ffd0de',
	mentionPill: '#f5b8cc40',
	mentionBg: '#f5b8cc1c',
	replyBg: '#c8b6ff1a',
	keyword: '#ffd98a40',
	code: '#2f2a3e',
	codeText: '#f7bfd2',
	spoiler: '#4a4260',
	spoilerRevealed: '#2f2a3e',

	positive: '#9fe0bf',
	warning: '#f6d38f',
	danger: '#ff9fae',
	dangerFill: '#d9546a',
	scrim: '#0d0b12cc',
}

const day: Look = {
	palette: paper,
	extra: {
		// Ink-outlined buttons, like a speech bubble.
		CONTROL_PRIMARY_BORDER_DEFAULT: `${ink}59`,
		CONTROL_PRIMARY_BORDER_ACTIVE: `${ink}80`,
		CONTROL_SECONDARY_BORDER_DEFAULT: `${ink}40`,
		REACTION_BORDER_DEFAULT: `${ink}33`,
		STATUS_ONLINE: '#3fa877',
	},
}

const evening: Look = {
	palette: night,
	extra: {
		CONTROL_PRIMARY_BORDER_DEFAULT: '#ffffff40',
		STATUS_ONLINE: '#6fd0a0',
	},
}

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('sakura', {
			name: 'Sakura',
			description: 'Cozy pastel pages with sakura pink and soft ink lines.',
		})
		themes.registerTheme('sakura', 'sakura', {
			name: 'Sakura',
			description:
				'Cream paper pages on Light, a calm indigo night on dark appearances.',
			// "Kitchen, Sakura, Sunny" by Tangereni on Pixabay (Pixabay Content License):
			// https://pixabay.com/illustrations/kitchen-sakura-sunny-vibe-tree-8544377/
			background: {
				path: 'assets/sakura-kitchen.webp',
				// A soft blur keeps the busy kitchen readable behind text.
				opacity: 0.24,
				blur: 4,
				dimming: 0,
			},
			getColors: lazyColors(tone, {
				light: day,
				dark: evening,
				darker: evening,
				midnight: evening,
			}),
		})
	},
})
