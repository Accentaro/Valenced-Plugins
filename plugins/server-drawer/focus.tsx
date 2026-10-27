import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { beforeJSX } from '@valenced/react/jsx-runtime'
import { Pressable, StyleSheet } from 'react-native'
import type { MenuItem } from './types'

export const focusMenus = new WeakSet<MenuItem[]>()

export function patchFocusMenu() {
	const [context] = lookupModule(
		withProps<{
			ContextMenuStore: { getState(): { menu?: { items: MenuItem[] } } }
			hideContextMenu(): void
		}>('ContextMenuStore', 'hideContextMenu'),
	)
	// The host caches its container element before plugin startup. Its hidden,
	// full-screen dismiss target is the remaining boundary for our menu's scrim.
	return beforeJSX(Pressable, ([type, props, key]) => {
		const menu = context?.ContextMenuStore.getState().menu
		if (
			!menu ||
			!focusMenus.has(menu.items) ||
			!props['aria-hidden'] ||
			typeof props.style === 'function'
		)
			return [type, props, key]
		const style = StyleSheet.flatten(props.style)
		if (
			style?.position !== 'absolute' ||
			style.top !== 0 ||
			style.bottom !== 0 ||
			style.left !== 0 ||
			style.right !== 0 ||
			!style.backgroundColor
		)
			return [type, props, key]
		return [
			type,
			{ ...props, style: [props.style, { backgroundColor: 'transparent' }] },
			key,
		]
	})
}
