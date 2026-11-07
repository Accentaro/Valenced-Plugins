import Page from '@valenced/components/Page'
import {
	callNativeMethod,
	callNativeMethodSync,
} from '@valenced/modules/native'
import { reloadApp } from '@valenced/modules/native/app'
import { accents, colorsOf, flavourIds, mocha } from '.'
import type { PluginSettingsComponent } from '@valenced/plugins/types'
import type { ColorsSelection, ThemesState } from '@valenced/themes-api/types'
import type { ComponentProps } from 'react'
import type { Accent, CatppuccinStorage } from '.'

declare module '@valenced/modules/native' {
	export interface NativeMethods {
		'valenced.themes.getState': [[], string]
		'valenced.themes.setColors': [
			args: [selection: string | null],
			returnValue: unknown,
		]
	}
}

const title = (s: string) => s[0]!.toUpperCase() + s.slice(1)

function selectedFlavour(plugin: string): ColorsSelection | undefined {
	const state = callNativeMethodSync('valenced.themes.getState', [])
	const sel = state ? (JSON.parse(state) as ThemesState).colors : undefined
	if (sel?.plugin === plugin && flavourIds.includes(sel.theme as never))
		return sel
}

type Props = ComponentProps<
	PluginSettingsComponent<{ jsonStorage: CatppuccinStorage }>
>

export default function Settings({ api }: Props) {
	const { TableRadioGroup, TableRadioRow, TableRowGroup, TableRow } =
		valenced.discord.design.Design
	const { View } = valenced.react.ReactNative
	const { React } = valenced.react
	const storage = api.jsonStorage
	const accent = storage.use()?.accent ?? 'mauve'
	const [note, setNote] = React.useState<string>()

	async function pick(next: Accent) {
		storage.set({ ...storage.cache, accent: next } as CatppuccinStorage)
		try {
			const sel = selectedFlavour(api.plugin.manifest.id)
			if (!sel) {
				setNote(
					'Saved. Pick a Catppuccin flavour on the Themes page to use it.',
				)
				return
			}
			const raw = storage.cache?.raw
			if (!raw) {
				setNote(
					'Saved. Re-pick your Catppuccin flavour on the Themes page to apply it.',
				)
				return
			}
			const values = colorsOf(sel.theme, next, { raw })
			await callNativeMethod('valenced.themes.setColors', [
				JSON.stringify({ ...sel, values }),
			])
			setNote(`${title(next)} applied. Reload Discord to see it everywhere.`)
		} catch (e) {
			api.plugin.reportError(e)
			setNote(
				'Saved. Re-pick your Catppuccin flavour on the Themes page to apply it.',
			)
		}
	}

	return (
		<Page>
			{note ? (
				<TableRowGroup>
					<TableRow
						label={note}
						arrow={note.includes('Reload')}
						onPress={note.includes('Reload') ? reloadApp : undefined}
					/>
				</TableRowGroup>
			) : null}
			<TableRadioGroup title="Accent" value={accent} onChange={pick}>
				{accents.map(a => (
					<TableRadioRow
						key={a}
						value={a}
						label={title(a)}
						icon={
							<View
								style={{
									width: 20,
									height: 20,
									borderRadius: 10,
									backgroundColor: mocha[a],
								}}
							/>
						}
					/>
				))}
			</TableRadioGroup>
		</Page>
	)
}
