import Page from '@valenced/components/Page'
import type { JsonStorage } from '@valenced/json-storage'
import type { PluginSettingsComponent } from '@valenced/plugins/types'
import type { ComponentProps } from 'react'
import type { OwnProfileStorage } from './own-profile-theme'

/** The switch for {@link OwnProfileStorage.themeOwnProfile}, for a theme's settings page. */
export function OwnProfileSwitch({
	storage,
}: {
	storage: JsonStorage<OwnProfileStorage>
}) {
	const { TableRowGroup, TableSwitchRow } = valenced.discord.design.Design
	const value = storage.use()?.themeOwnProfile !== false
	return (
		<TableRowGroup title="Your profile">
			<TableSwitchRow
				label="Theme my profile"
				subLabel="Show this theme on your You page. Turn off to keep your own profile theme there."
				value={value}
				onValueChange={(themeOwnProfile: boolean) =>
					storage.set({ ...storage.cache, themeOwnProfile })
				}
			/>
		</TableRowGroup>
	)
}

/** A settings page with only {@link OwnProfileSwitch}, for themes without other settings. */
export function OwnProfileSettings({
	api,
}: ComponentProps<
	PluginSettingsComponent<{ jsonStorage: OwnProfileStorage }>
>) {
	return (
		<Page>
			<OwnProfileSwitch storage={api.jsonStorage} />
		</Page>
	)
}
