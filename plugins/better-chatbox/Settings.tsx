import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { Image, ScrollView, View } from 'react-native'
import { deleteImage, pickImage, showColourPicker } from './discord'
import type { PluginSettingsComponent } from '@valenced/plugins/types'
import type { ComponentProps } from 'react'

export type AvatarAction = 'profile' | 'status' | 'account'

export interface Settings {
	pressAction: AvatarAction
	longPressAction: AvatarAction
	showStatus: boolean
	collapseWhileTyping: boolean
	background: 'none' | 'colour' | 'image'
	backgroundColour: number
	backgroundImage: string
	/** Opacity of the theme's chatbox colour drawn over the background. */
	dim: number
	blur: number
	invertContent: boolean
}

export const defaults: Settings = {
	pressAction: 'profile',
	longPressAction: 'status',
	showStatus: false,
	collapseWhileTyping: false,
	background: 'none',
	backgroundColour: 0x5865f2,
	backgroundImage: '',
	dim: 0.5,
	blur: 0,
	invertContent: false,
}

export const toHex = (colour: number) =>
	`#${colour.toString(16).padStart(6, '0')}`

// Matches the chatbox's shape on a phone; the image is drawn with cover.
const imageWidth = 1200
const imageHeight = 300

const actions: Record<AvatarAction, string> = {
	profile: 'Open profile',
	status: 'Set status',
	account: 'Open account sheet',
}

const { TableRadioGroup, TableRadioRow } = Design

const levels = ['Off', 'Light', 'Medium', 'Strong']

// Preset levels rather than a slider: Discord 353's slider never reports
// changes. A saved value between presets shows as the nearest one.
function LevelGroup({
	title,
	values,
	value,
	onChange,
}: {
	title: string
	values: number[]
	value: number
	onChange(value: number): void
}) {
	const nearest = values.reduce((a, b) =>
		Math.abs(b - value) < Math.abs(a - value) ? b : a,
	)
	return (
		<TableRadioGroup
			title={title}
			value={String(nearest)}
			onChange={(next: string) => onChange(Number(next))}
		>
			{values.map((level, i) => (
				<TableRadioRow key={level} value={String(level)} label={levels[i]} />
			))}
		</TableRadioGroup>
	)
}

export default function SettingsComponent({
	api: { jsonStorage, plugin },
}: ComponentProps<PluginSettingsComponent<{ jsonStorage: Settings }>>) {
	const settings = { ...defaults, ...jsonStorage.use() }

	const setImage = async () => {
		try {
			const path = await pickImage(imageWidth, imageHeight)
			if (!path) return
			if (settings.backgroundImage) deleteImage(settings.backgroundImage)
			await jsonStorage.set({ background: 'image', backgroundImage: path })
		} catch (error) {
			plugin.reportError(error)
		}
	}

	const removeBackground = async () => {
		if (settings.backgroundImage) deleteImage(settings.backgroundImage)
		await jsonStorage.set({ background: 'none', backgroundImage: '' })
	}

	return (
		<ScrollView
			style={{ flex: 1 }}
			contentContainerStyle={{ paddingBottom: 38 }}
		>
			<Page>
				{(['pressAction', 'longPressAction'] as const).map(key => (
					<TableRadioGroup
						key={key}
						title={key === 'pressAction' ? 'Avatar press' : 'Avatar long press'}
						value={settings[key]}
						onChange={(value: AvatarAction) =>
							jsonStorage.set({ [key]: value })
						}
					>
						{(Object.keys(actions) as AvatarAction[]).map(action => (
							<TableRadioRow
								key={action}
								value={action}
								label={actions[action]}
							/>
						))}
					</TableRadioGroup>
				))}
				<Design.TableRowGroup title="Avatar">
					<Design.TableSwitchRow
						label="Show status"
						value={settings.showStatus}
						onValueChange={showStatus => jsonStorage.set({ showStatus })}
					/>
					<Design.TableSwitchRow
						label="Collapse while typing"
						value={settings.collapseWhileTyping}
						onValueChange={collapseWhileTyping =>
							jsonStorage.set({ collapseWhileTyping })
						}
					/>
				</Design.TableRowGroup>
				<Design.TableRowGroup title="Background">
					<Design.TableRow
						label="Colour"
						subLabel="Pick a colour with Discord's colour picker"
						trailing={
							<View
								style={{
									width: 24,
									height: 24,
									borderRadius: 6,
									backgroundColor: toHex(settings.backgroundColour),
									opacity: settings.background === 'colour' ? 1 : 0.4,
								}}
							/>
						}
						onPress={() => {
							try {
								showColourPicker(settings.backgroundColour, backgroundColour =>
									jsonStorage.set({ background: 'colour', backgroundColour }),
								)
							} catch (error) {
								plugin.reportError(error)
							}
						}}
					/>
					<Design.TableRow
						label="Image"
						subLabel="Choose an image and crop it to the chatbox"
						trailing={
							settings.backgroundImage ? (
								<Image
									source={{ uri: settings.backgroundImage }}
									style={{
										width: 64,
										height: 16,
										borderRadius: 4,
										opacity: settings.background === 'image' ? 1 : 0.4,
									}}
								/>
							) : undefined
						}
						onPress={setImage}
					/>
					{settings.background !== 'none' && (
						<Design.TableRow
							label="Remove background"
							variant="danger"
							onPress={removeBackground}
						/>
					)}
				</Design.TableRowGroup>
				{settings.background !== 'none' && (
					<Design.TableRowGroup title="Readability">
						<Design.TableSwitchRow
							label="Invert icons and text"
							subLabel="Use the opposite light or dark theme inside the chatbox"
							value={settings.invertContent}
							onValueChange={invertContent =>
								jsonStorage.set({ invertContent })
							}
						/>
					</Design.TableRowGroup>
				)}
				{settings.background !== 'none' && (
					<LevelGroup
						title="Dim"
						values={[0, 0.25, 0.5, 0.75]}
						value={settings.dim}
						onChange={dim => jsonStorage.set({ dim })}
					/>
				)}
				{settings.background === 'image' && (
					<LevelGroup
						title="Blur"
						values={[0, 4, 8, 16]}
						value={settings.blur}
						onChange={blur => jsonStorage.set({ blur })}
					/>
				)}
			</Page>
		</ScrollView>
	)
}
