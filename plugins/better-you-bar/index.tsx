import { Design } from '@valenced/discord/design'
import { RootNavigationRef } from '@valenced/discord/modules/main_tabs_v2'
import { getModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'
import { lookupGeneratedIconComponent } from '@valenced/utils/discord'
import { patchLocalFavorites } from './favorites'
import SettingsComponent, { defaults } from './Settings'
import type * as React from 'react'
import type { Settings } from './Settings'

type Notifications = {
	type(props: { hasNameplate?: boolean }): React.ReactNode
}

export default plugin<{ jsonStorage: Settings }>({
	jsonStorage: { load: true, default: defaults },
	SettingsComponent,
	start({ cleanup, plugin, jsonStorage }) {
		if (plugin.startedLate) {
			plugin.requireReload()
			return
		}
		patchLocalFavorites(jsonStorage, cleanup)
		cleanup(
			getModuleWithImportedPath<{ default: Notifications }>(
				'modules/main_tabs_v2/native/you_bar/YouBarNotificationsButton.tsx',
				module => {
					const [guilds] = lookupModule(
						withProps<{ transitionToGuild(id: string): void }>(
							'transitionToGuild',
						),
					)
					const StarIcon = lookupGeneratedIconComponent('StarIcon')
					const SettingsIcon = lookupGeneratedIconComponent('SettingsIcon')
					// Discord 351 accepts icon elements; the API declaration only lists asset IDs.
					const IconButton = Design.IconButton as React.ComponentType<
						Omit<React.ComponentProps<typeof Design.IconButton>, 'icon'> & {
							icon: React.ReactNode
						}
					>
					if (
						typeof module.default?.type !== 'function' ||
						!guilds ||
						!StarIcon ||
						!SettingsIcon
					) {
						plugin.reportError('Native shortcuts are unavailable.')
						return
					}
					cleanup(
						instead(module.default, 'type', function (args, original) {
							const settings = { ...defaults, ...jsonStorage.use() }
							const notification = Reflect.apply(original, this, args)
							if (notification == null) return notification
							const variant = args[0].hasNameplate
								? 'secondary-overlay'
								: 'tertiary'
							return (
								<>
									{settings.showFavorites && (
										<IconButton
											size="sm"
											variant={variant}
											icon={
												<StarIcon
													size="xs"
													color={args[0].hasNameplate ? 'white' : undefined}
													style={{ width: 18, height: 18 }}
												/>
											}
											accessibilityLabel="Favorites"
											onPress={() => guilds.transitionToGuild('@favorites')}
										/>
									)}
									{notification}
									{settings.showSettings && (
										<IconButton
											size="sm"
											variant={variant}
											icon={
												<SettingsIcon
													color={args[0].hasNameplate ? 'white' : undefined}
													size="xs"
													style={{ width: 18, height: 18 }}
												/>
											}
											accessibilityLabel="Settings"
											onPress={() =>
												RootNavigationRef.getRootNavigationRef().navigate(
													'settings',
												)
											}
										/>
									)}
								</>
							)
						}),
					)
				},
			),
		)
	},
	stop({ plugin }) {
		plugin.requireReload()
	},
})
