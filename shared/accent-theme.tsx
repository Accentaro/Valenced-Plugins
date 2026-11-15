/**
 * Accent choices for theme plugins, like Catppuccin's: the accent is kept in the plugin's JSON storage, each
 * theme's colours are cached per accent, and the settings page re-applies the active theme when it changes.
 */

import Page from '@valenced/components/Page'
import {
	callNativeMethod,
	callNativeMethodSync,
} from '@valenced/modules/native'
import { reloadApp } from '@valenced/modules/native/app'
import { OwnProfileSwitch } from './own-profile-setting'
import type { JsonStorage } from '@valenced/json-storage'
import type { PluginSettingsComponent } from '@valenced/plugins/types'
import type {
	ColorsSelection,
	ThemeColors,
	ThemesState,
} from '@valenced/themes-api/types'
import type { ComponentProps } from 'react'
import type { OwnProfileStorage } from './own-profile-theme'

declare module '@valenced/modules/native' {
	export interface NativeMethods {
		'valenced.themes.getState': [[], string]
		'valenced.themes.setColors': [
			args: [selection: string | null],
			returnValue: unknown,
		]
	}
}

export interface AccentStorage<A extends string> extends OwnProfileStorage {
	accent: A
	/** Discord's raw palette, kept so accent changes can re-apply the theme. */
	raw?: Record<string, string>
}

type Discord = { raw: Record<string, string> }

export interface AccentThemeOptions<A extends string> {
	/** Shown in the settings notes, such as "Tokyo Night". */
	name: string
	accents: readonly A[]
	fallback: A
	/** Swatch colour for each accent in the settings list. */
	swatch: Record<A, string>
	themeIds: readonly string[]
	colorsOf(id: string, accent: A, discord: Discord): ThemeColors
}

const title = (s: string) => s[0]!.toUpperCase() + s.slice(1)

export function accentTheme<A extends string>(options: AccentThemeOptions<A>) {
	const { name, accents, fallback, swatch, themeIds, colorsOf } = options
	let storage: JsonStorage<AccentStorage<A>> | undefined
	const valid = (a: A | undefined): A =>
		a && accents.includes(a) ? a : fallback

	function selected(plugin: string): ColorsSelection | undefined {
		const state = callNativeMethodSync('valenced.themes.getState', [])
		const sel = state ? (JSON.parse(state) as ThemesState).colors : undefined
		if (sel?.plugin === plugin && themeIds.includes(sel.theme)) return sel
	}

	type Props = ComponentProps<
		PluginSettingsComponent<{ jsonStorage: AccentStorage<A> }>
	>

	function Settings({ api }: Props) {
		const { TableRadioGroup, TableRadioRow, TableRowGroup, TableRow } =
			valenced.discord.design.Design
		const { View } = valenced.react.ReactNative
		const { React } = valenced.react
		const store = api.jsonStorage
		const accent = valid(store.use()?.accent)
		const [note, setNote] = React.useState<string>()
		const retry = `Saved. Re-pick your ${name} theme on the Themes page to apply it.`

		async function pick(next: A) {
			store.set({ ...store.cache, accent: next } as AccentStorage<A>)
			try {
				const sel = selected(api.plugin.manifest.id)
				if (!sel) {
					setNote(`Saved. Pick a ${name} theme on the Themes page to use it.`)
					return
				}
				const raw = store.cache?.raw
				if (!raw) {
					setNote(retry)
					return
				}
				const values = colorsOf(sel.theme, next, { raw })
				await callNativeMethod('valenced.themes.setColors', [
					JSON.stringify({ ...sel, values }),
				])
				setNote(`${title(next)} applied. Reload Discord to see it everywhere.`)
			} catch (e) {
				api.plugin.reportError(e)
				setNote(retry)
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
				<OwnProfileSwitch storage={store} />
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
										backgroundColor: swatch[a],
									}}
								/>
							}
						/>
					))}
				</TableRadioGroup>
			</Page>
		)
	}

	return {
		/** Call from the plugin's `init` with its JSON storage. */
		bind(jsonStorage: JsonStorage<AccentStorage<A>>) {
			storage = jsonStorage
		},
		/** A theme's `getColors`, following the stored accent. */
		getColors(id: string) {
			const cache = new Map<A, ThemeColors>()
			return (discord: Discord) => {
				if (storage && !storage.cache?.raw)
					storage.set({
						...storage.cache,
						raw: discord.raw,
					} as AccentStorage<A>)
				const accent = valid(storage?.cache?.accent)
				let colors = cache.get(accent)
				if (!colors) cache.set(accent, (colors = colorsOf(id, accent, discord)))
				return colors
			}
		},
		Settings,
	}
}
