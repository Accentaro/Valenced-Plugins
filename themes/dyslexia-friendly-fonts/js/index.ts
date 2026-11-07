/// <reference types="@valenced/themes-api" />

import type { FontVariant } from '@valenced/themes-api/types'

const Weights: Record<string, number> = {
	Normal: 400,
	Medium: 500,
	Semibold: 600,
	Bold: 700,
	ExtraBold: 800,
}

function staticFamilies(directory: string, prefix: string, extension: string) {
	const families: Record<string, FontVariant[]> = {}
	for (const [style, weight] of Object.entries(Weights)) {
		// These families provide regular and bold, so use the nearest real weight.
		const bold = weight >= 600
		const path = `assets/fonts/${directory}/${prefix}`
		families[`ggsans-${style}`] = [
			{ path: `${path}-${bold ? 'Bold' : 'Regular'}.${extension}`, weight },
			{
				path: `${path}-${bold ? 'BoldItalic' : 'Italic'}.${extension}`,
				weight,
				italic: true,
			},
		]
	}
	return families
}

const lexend: Record<string, FontVariant[]> = {}
for (const [style, weight] of Object.entries(Weights))
	lexend[`ggsans-${style}`] = [
		{
			path: 'assets/fonts/lexend/Lexend[wght].ttf',
			weight,
			axes: { wght: weight },
		},
	]

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('dyslexia-friendly', {
			name: 'Dyslexia Friendly Fonts',
			description:
				'Fonts designed for reading comfort and distinct letter shapes.',
		})
		themes.registerFontPack('dyslexia-friendly', 'opendyslexic', {
			name: 'OpenDyslexic',
			description:
				'Distinctive, bottom-weighted letters designed for dyslexic readers.',
			families: staticFamilies('opendyslexic', 'OpenDyslexic', 'otf'),
		})
		themes.registerFontPack('dyslexia-friendly', 'lexend', {
			name: 'Lexend',
			description:
				'Open letter shapes and generous spacing designed for reading comfort.',
			families: lexend,
		})
		themes.registerFontPack('dyslexia-friendly', 'atkinson-hyperlegible', {
			name: 'Atkinson Hyperlegible',
			description:
				'Distinct letter shapes designed by Braille Institute for low-vision readers.',
			families: staticFamilies(
				'atkinsonhyperlegible',
				'AtkinsonHyperlegible',
				'ttf',
			),
		})
	},
})
