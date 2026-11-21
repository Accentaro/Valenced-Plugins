import { onComponentPatch } from '../modules'
import { getSettings } from '../state'
import type { PluginCleanupApi } from '@valenced/plugins/types'

export function patchAddServerButton(cleanup: PluginCleanupApi): void {
	// Only the button is removed: other plugins add their own controls to the
	// server list footer, so the footer itself has to stay.
	onComponentPatch(
		cleanup,
		'modules/guilds_bar/native/GuildsBarCreateJoinButton.tsx',
		(args, jsx) => {
			if (getSettings().addServerButton) return null
			return jsx(...args)
		},
	)
}
