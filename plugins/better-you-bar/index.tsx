import { Design } from '@valenced/discord/design'
import { Stores } from '@valenced/discord/flux'
import { RootNavigationRef } from '@valenced/discord/modules/main_tabs_v2'
import {
	getModuleWithImportedPath,
	lookupModuleWithImportedPath,
} from '@valenced/discord/utils/modules/finders'
import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'
import { lookupGeneratedIconComponent } from '@valenced/utils/discord'
import { View } from 'react-native'
import { patchLocalFavorites } from './favorites'
import SettingsComponent, { defaults } from './Settings'
import type { DiscordModules } from '@valenced/discord/types'
import type * as React from 'react'
import type { Settings } from './Settings'

type Notifications = {
	type(props: { hasNameplate?: boolean }): React.ReactNode
}

type Store<T> = DiscordModules.Flux.Store<T>

let returnTo: { guildId?: string; channelId?: string } | undefined

// First tap opens Favorites and remembers where you were; tapping again while still there goes back and so on.
function toggleFavorites(guilds: { transitionToGuild(id: string): void }) {
	const { SelectedGuildStore, SelectedChannelStore, ChannelStore } = Stores as {
		SelectedGuildStore: Store<{ getGuildId(): string | undefined }>
		SelectedChannelStore: Store<{ getChannelId(): string | undefined }>
		ChannelStore: Store<{ getChannel(id: string): object | undefined }>
	}
	const guildId = SelectedGuildStore.getGuildId() ?? undefined
	if (guildId !== '@favorites') {
		returnTo = { guildId, channelId: SelectedChannelStore.getChannelId() }
		guilds.transitionToGuild('@favorites')
		return
	}
	const previous = returnTo
	returnTo = undefined
	if (!previous) return
	if (previous.guildId) return guilds.transitionToGuild(previous.guildId)
	// DM or group dm, reopen it, otherwise fall back to the dm list.
	const [channels] = lookupModule(
		withProps<{ transitionToChannel(id: string, options: object): void }>(
			'transitionToChannel',
		),
	)
	if (
		previous.channelId &&
		ChannelStore.getChannel(previous.channelId) &&
		channels
	)
		channels.transitionToChannel(previous.channelId, {})
	else guilds.transitionToGuild('@me')
}

type Search = { focus(): void; blur(): void }
type SearchRef = { current: Search | null }

let launchpadSearch: SearchRef | undefined
// The search bar this plugin focused, which Discord then doesn't blur when the launchpad closes.
let focusedSearch: Search | undefined
let focusUntil = 0
const watched = new WeakSet<object>()

function findSearchRef(node: unknown, depth = 0): SearchRef | undefined {
	if (!node || typeof node !== 'object' || depth > 6) return
	if (Array.isArray(node)) {
		for (const child of node) {
			const found = findSearchRef(child, depth + 1)
			if (found) return found
		}
		return
	}
	const props = (
		node as { props?: { searchRef?: SearchRef; children?: unknown } }
	).props
	if (!props) return
	if (props.searchRef && 'current' in props.searchRef) return props.searchRef
	return findSearchRef(props.children, depth + 1)
}

function focusSearch(search: Search) {
	focusUntil = 0
	search.focus()
	focusedSearch = search
}

function blurSearch() {
	const search = focusedSearch
	if (!search) return
	focusedSearch = undefined
	search.blur()
}

type SharedState = { value: unknown }

// Discord sets this to 0 as the launchpad starts closing, well before it reports it as no longer visible.
function watchSharedState(state: SharedState | undefined) {
	if (!state || watched.has(state)) return
	const value = Object.getOwnPropertyDescriptor(state, 'value')
	if (!value?.get || !value.set || !value.configurable) return
	watched.add(state)
	const { get, set } = value
	Object.defineProperty(state, 'value', {
		...value,
		get() {
			return get.call(this)
		},
		set(next: unknown) {
			set.call(this, next)
			if (next === 0) blurSearch()
		},
	})
}

// Discord focuses the search bar as the launchpad opens, but the launchpad is frozen while closed and its
// search ref is only attached again once it thaws. A press gets there first, so focus it as it attaches.
function watchSearchRef(ref: SearchRef) {
	if (watched.has(ref)) return
	watched.add(ref)
	let search = ref.current
	Object.defineProperty(ref, 'current', {
		configurable: true,
		enumerable: true,
		get: () => search,
		set(next: Search | null) {
			search = next
			if (next && Date.now() < focusUntil) focusSearch(next)
		},
	})
}

function showLaunchpad() {
	lookupModuleWithImportedPath<{ default(): void }>(
		'modules/launchpad/native/showLaunchPad.tsx',
	)[0]?.default()
	const search = launchpadSearch?.current
	if (search) focusSearch(search)
	else focusUntil = Date.now() + 1000
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
			getModuleWithImportedPath<{
				default: { type(props: object): React.ReactNode }
			}>('modules/launchpad/native/LaunchPadPullTab.tsx', module => {
				if (typeof module.default?.type !== 'function') {
					plugin.reportError('Launchpad pull tab is unavailable.')
					return
				}
				cleanup(
					instead(module.default, 'type', function (args, original) {
						const { showLaunchpad } = { ...defaults, ...jsonStorage.use() }
						const pullTab = Reflect.apply(original, this, args)
						return showLaunchpad ? (
							<View style={{ display: 'none' }}>{pullTab}</View>
						) : (
							pullTab
						)
					}),
				)
			}),
		)
		cleanup(
			getModuleWithImportedPath<{
				default: { type(props: object): React.ReactNode }
			}>('modules/launchpad/native/LaunchPad.tsx', module => {
				if (typeof module.default?.type !== 'function') return
				cleanup(
					instead(module.default, 'type', function (args, original) {
						const launchpad = Reflect.apply(original, this, args)
						const ref = findSearchRef(launchpad)
						if (ref) {
							watchSearchRef(ref)
							launchpadSearch = ref
						}
						const props = args[0] as {
							visible?: boolean
							sharedState?: SharedState
						}
						watchSharedState(props.sharedState)
						// Closing by gesture doesn't go through the shared state's setter here.
						if (!props.visible) blurSearch()
						return launchpad
					}),
				)
			}),
		)
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
					const AppsIcon = lookupGeneratedIconComponent('AppsIcon')
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
											onPress={() => toggleFavorites(guilds)}
										/>
									)}
									{settings.showLaunchpad && AppsIcon && (
										<IconButton
											size="sm"
											variant={variant}
											icon={
												<AppsIcon
													size="xs"
													color={args[0].hasNameplate ? 'white' : undefined}
													style={{ width: 18, height: 18 }}
												/>
											}
											accessibilityLabel="Launchpad"
											onPress={showLaunchpad}
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
