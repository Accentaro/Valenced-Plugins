import { Design } from '@valenced/discord/design'
import { useEffect } from 'react'
import { ScrollView } from 'react-native'
import { ScrambleOptions, stopScramble } from './overlay'
import { Unscrambled } from './scramble'
import {
	configureStorage,
	loadSettings,
	updateSettings,
	useSettings,
} from './storage'
import type { PluginSettingsComponent } from '@valenced/plugins/types'
import type { ComponentProps } from 'react'
import type { ScramblerSettings } from './storage'

export default function Settings({
	api: { jsonStorage, plugin },
}: ComponentProps<
	PluginSettingsComponent<{ jsonStorage: ScramblerSettings }>
>) {
	configureStorage(jsonStorage)
	jsonStorage.use()
	useEffect(() => {
		void loadSettings().catch(error => plugin.reportError(error))
	}, [plugin])
	const settings = useSettings()

	return (
		<Unscrambled.Provider value={true}>
			<ScrollView
				style={{ flex: 1 }}
				contentContainerStyle={{ paddingBottom: 38 }}
			>
				<Design.Stack
					style={{ paddingVertical: 24, paddingHorizontal: 12 }}
					spacing={24}
				>
					<Design.TableRowGroup title="Button">
						<Design.TableSwitchRow
							label="Show floating button"
							subLabel="Tap to scramble or restore, long press for options, drag to move."
							value={settings.showButton}
							onValueChange={(showButton: boolean) => {
								updateSettings({ showButton })
								// Without the button there is no way to restore.
								if (!showButton) stopScramble()
							}}
						/>
						<Design.TableRow
							label="Reset button position"
							onPress={() => updateSettings({ buttonX: -1, buttonY: -1 })}
						/>
					</Design.TableRowGroup>
					<ScrambleOptions />
				</Design.Stack>
			</ScrollView>
		</Unscrambled.Provider>
	)
}
