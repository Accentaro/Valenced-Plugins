import Page from '@valenced/components/Page'
import { ToastActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { Clipboard } from '@valenced/externals/react-native-clipboard'
import type { PluginSettingsComponent } from '@valenced/plugins/types'
import type { ComponentProps } from 'react'

export interface Settings {
	showFavorites: boolean
	showSettings: boolean
	localFavorites: boolean
	favorites: string[]
	favoriteDetails: Record<
		string,
		{ parentId?: string | null; order?: number } | null
	>
}

export const defaults: Settings = {
	showFavorites: true,
	showSettings: true,
	localFavorites: false,
	favorites: [],
	favoriteDetails: {},
}

const toast = (text: string) =>
	ToastActionCreators.open('BETTER_YOU_BAR_FAVORITES', { text })

export default function SettingsComponent({
	api: { jsonStorage },
}: ComponentProps<PluginSettingsComponent<{ jsonStorage: Settings }>>) {
	const settings = { ...defaults, ...jsonStorage.use() }
	return (
		<Page>
			<Design.TableRowGroup title="You bar shortcuts">
				<Design.TableSwitchRow
					label="Favorites"
					value={settings.showFavorites}
					onValueChange={showFavorites => jsonStorage.set({ showFavorites })}
				/>
				<Design.TableSwitchRow
					label="Settings"
					value={settings.showSettings}
					onValueChange={showSettings => jsonStorage.set({ showSettings })}
				/>
			</Design.TableRowGroup>
			<Design.TableRowGroup title="Favorites">
				<Design.TableSwitchRow
					label="Local favorites"
					subLabel="Save new favorites on this device, past Discord's limit"
					value={settings.localFavorites}
					onValueChange={localFavorites => jsonStorage.set({ localFavorites })}
				/>
				<Design.TableRow
					label="Export favorites"
					subLabel="Copy local favorites to the clipboard"
					onPress={() => {
						Clipboard.setString(JSON.stringify(settings.favorites))
						toast(`Copied ${settings.favorites.length} favorites`)
					}}
				/>
				<Design.TableRow
					label="Import favorites"
					subLabel="Replace local favorites with the clipboard"
					onPress={async () => {
						try {
							const favorites: unknown = JSON.parse(await Clipboard.getString())
							if (
								!Array.isArray(favorites) ||
								!favorites.every(
									id => typeof id === 'string' && /^\d+$/.test(id),
								)
							)
								throw new TypeError()
							await jsonStorage.set({ favorites })
							toast(`Imported ${favorites.length} favorites`)
						} catch {
							toast('Clipboard has no exported favorites')
						}
					}}
				/>
			</Design.TableRowGroup>
		</Page>
	)
}
