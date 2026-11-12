import { ActionSheetActionCreatorsModuleId } from '@valenced/discord/actions'
import { lookupModule } from '@valenced/modules/finders'
import {
	allOf,
	withDependencies,
	withProps,
} from '@valenced/modules/finders/filters'
import { TurboModuleRegistry } from 'react-native'
import type { DiscordModules } from '@valenced/discord/types'
import type { ComponentType } from 'react'
import type { TurboModule } from 'react-native'

const { relative } = withDependencies

export type Store<T> = DiscordModules.Flux.Store<T>

export interface FluxUtils {
	useStateFromStoresObject<T>(
		stores: Store<unknown>[],
		factory: () => T,
		deps?: readonly unknown[],
	): T
}

export interface AvatarModule {
	default: ComponentType<{
		user: object
		guildId?: string
		size?: string
		status?: string
		avatarDecoration?: unknown
		animate?: boolean
	}>
	AvatarSizes: Record<string, string>
	getStatusSize: unknown
}

// Both sheets live in lazily loaded modules, so they are matched by their
// dependency shape and only initialised when first opened.
export function showAccountSheet(statusOnly: boolean) {
	const [sheet] = lookupModule(
		allOf(
			withDependencies([
				relative(1),
				ActionSheetActionCreatorsModuleId,
				relative(2),
				null,
				2,
			]),
			withProps<{
				showYouAccountActionSheet(
					statusOnly: boolean,
					disableHapticOnOpen: boolean,
				): void
			}>('showYouAccountActionSheet'),
		),
	)
	if (!sheet) throw new Error('The account sheet is unavailable.')
	sheet.showYouAccountActionSheet(statusOnly, false)
}

export function showColourPicker(
	color: number,
	onSelect: (color: number) => void,
) {
	const [picker] = lookupModule(
		allOf(
			withDependencies([
				ActionSheetActionCreatorsModuleId,
				relative(1),
				null,
				2,
			]),
			withProps<{
				default(props: { color: number; onSelect(color: number): void }): void
				CUSTOM_COLOR_PICKER_KEY: string
			}>('CUSTOM_COLOR_PICKER_KEY'),
		),
	)
	if (!picker) throw new Error('The colour picker is unavailable.')
	picker.default({ color, onSelect })
}

interface CropPicker extends TurboModule {
	openPicker(options: object): Promise<{ path: string }>
	cleanSingle(path: string): Promise<void>
}

// Discord's avatar and upload cropper (react-native-image-crop-picker).
const cropPicker = () =>
	TurboModuleRegistry.get<CropPicker>('RNCImageCropPicker')

export async function pickImage(width: number, height: number) {
	const picker = cropPicker()
	if (!picker) throw new Error('The image cropper is unavailable.')
	try {
		const { path } = await picker.openPicker({
			mediaType: 'photo',
			cropping: true,
			width,
			height,
			cropperToolbarTitle: 'Chatbox background',
		})
		return path
	} catch (error) {
		// Backing out of the picker or cropper rejects with E_PICKER_CANCELLED.
		if ((error as { code?: string })?.code === 'E_PICKER_CANCELLED') return
		throw error
	}
}

// The old image may already be gone (cleared app data), which is fine.
export function deleteImage(path: string) {
	cropPicker()
		?.cleanSingle(path)
		.catch(() => {})
}
