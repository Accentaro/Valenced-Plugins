import { onImportedPath, safeInstead } from '../modules'
import { getSettings } from '../state'
import type { PluginCleanupApi } from '@valenced/plugins/types'

export function patchProfileBanners(cleanup: PluginCleanupApi): void {
	cleanup(
		onImportedPath<any>('modules/user_profile/DisplayProfile.tsx', ns => {
			const proto = ns?.default?.prototype
			if (typeof proto?.getBannerURL !== 'function') return
			cleanup(
				safeInstead(
					proto,
					'getBannerURL',
					function (this: unknown, args, original) {
						if (getSettings().profileBanners) return null
						return Reflect.apply(original, this, args)
					},
				),
			)
		}),
	)
}
