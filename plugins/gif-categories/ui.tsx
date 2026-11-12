import {
	ActionSheetActionCreators,
	AlertActionCreators,
	ToastActionCreators,
} from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { FileModule } from '@valenced/discord/native'
import { getNativeModule } from '@valenced/modules/native'
import { readFile, rm } from '@valenced/modules/native/fs'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Keyboard, Platform, ScrollView } from 'react-native'
import { configure, getCategories, parseBackup, storage, update } from './data'
import type { PluginSettingsComponent } from '@valenced/plugins/types'
import type { ComponentProps } from 'react'
import type { Category, Gif, Settings } from './data'

const sheet = 'dev.benjii.gif-categories'
const editorSheet = `${sheet}.editor`
export function closeSheets() {
	ActionSheetActionCreators.hideActionSheet(editorSheet)
	ActionSheetActionCreators.hideActionSheet(sheet)
	AlertActionCreators.dismissAlert(sheet)
}
export function confirm(
	title: string,
	action: () => void,
	content = 'This cannot be undone.',
) {
	AlertActionCreators.openAlert(
		sheet,
		<Design.AlertModal
			title={title}
			content={content}
			actions={
				<Fragment>
					<Design.AlertActionButton
						text="Confirm"
						variant="destructive"
						onPress={() => {
							AlertActionCreators.dismissAlert(sheet)
							action()
						}}
					/>
					<Design.AlertActionButton
						text="Cancel"
						variant="secondary"
						onPress={() => AlertActionCreators.dismissAlert(sheet)}
					/>
				</Fragment>
			}
		/>,
	)
}
export function editCategory(category?: Category, gif?: Gif) {
	ActionSheetActionCreators.hideActionSheet(sheet)
	ActionSheetActionCreators.openLazy(
		Promise.resolve({ default: Editor }),
		editorSheet,
		{ category, gif },
	)
}
function Editor({ category, gif }: { category?: Category; gif?: Gif }) {
	const [name, setName] = useState(category?.name ?? '')
	const [id] = useState(
		() =>
			category?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
	)
	const saving = useRef(false)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState('')
	return (
		<Design.ActionSheet keyboardShouldPersistTaps="handled">
			<Design.Stack spacing={16} style={{ padding: 16 }}>
				<Design.TextInput
					label="Category name"
					value={name}
					maxLength={60}
					onChange={setName}
				/>
				<Design.Button
					text="Save"
					disabled={busy || !name.trim()}
					onPress={async () => {
						if (saving.current || !name.trim()) return
						saving.current = true
						setBusy(true)
						setError('')
						const categories = getCategories()
						try {
							await update(
								categories.some(item => item.id === id)
									? categories.map(item =>
											item.id === id ? { ...item, name: name.trim() } : item,
										)
									: [
											...categories,
											{
												id,
												name: name.trim(),
												gifs: gif ? [gif] : [],
											},
										],
							)
							Keyboard.dismiss()
							ActionSheetActionCreators.hideActionSheet(editorSheet)
						} catch (error) {
							saving.current = false
							setBusy(false)
							setError(
								error instanceof Error
									? error.message
									: 'Could not save category.',
							)
						}
					}}
				/>
				{!!error && (
					<Design.Text color="text-feedback-critical">{error}</Design.Text>
				)}
				{category && (
					<Design.Button
						text="Delete category"
						variant="destructive"
						onPress={() =>
							confirm(
								`Delete ${category.name}?`,
								() => {
									void update(
										getCategories().filter(item => item.id !== category.id),
									)
									ActionSheetActionCreators.hideActionSheet(editorSheet)
								},
								category.gifs.length
									? `The ${category.gifs.length} saved ${category.gifs.length === 1 ? 'GIF' : 'GIFs'} in this category will be removed too. This cannot be undone.`
									: undefined,
							)
						}
					/>
				)}
			</Design.Stack>
		</Design.ActionSheet>
	)
}
export function chooseCategory(gif: Gif) {
	ActionSheetActionCreators.openLazy(
		Promise.resolve({ default: CategoryChoices }),
		sheet,
		{ gif },
	)
}
function CategoryChoices({ gif }: { gif: Gif }) {
	const { categories } = storage.use()!
	return (
		<Design.ActionSheet>
			<ScrollView>
				<Design.Stack spacing={16} style={{ padding: 16 }}>
					<Design.TableRowGroup title="GIF categories">
						{categories.map(category => (
							<Design.TableCheckboxRow
								key={category.id}
								value={category.id}
								label={category.name}
								checked={category.gifs.some(item => item.url === gif.url)}
								onPress={() => {
									void update(
										getCategories().map(item =>
											item.id !== category.id
												? item
												: {
														...item,
														gifs: item.gifs.some(saved => saved.url === gif.url)
															? item.gifs.filter(saved => saved.url !== gif.url)
															: [...item.gifs, gif],
													},
										),
									)
								}}
							/>
						))}
					</Design.TableRowGroup>
					<Design.Button
						text="New category"
						variant="secondary"
						onPress={() => editCategory(undefined, gif)}
					/>
					<Design.Button
						text="Done"
						onPress={() => ActionSheetActionCreators.hideActionSheet(sheet)}
					/>
				</Design.Stack>
			</ScrollView>
		</Design.ActionSheet>
	)
}

interface DocumentPicker {
	pick(options: {
		mode: string
		type: string[]
		allowMultiSelection: boolean
	}): Promise<{ uri: string; size?: number }[]>
	saveDocument(options: unknown): Promise<unknown>
	writeDocuments(options: unknown): Promise<{ error?: string }[]>
	keepLocalCopy(options: {
		files: { uri: string; fileName: string }[]
		destination: 'cachesDirectory'
	}): Promise<
		(
			| { status: 'success'; localUri: string }
			| { status: 'error'; copyError: string }
		)[]
	>
}
export default function BackupSettings({
	api: { jsonStorage },
}: ComponentProps<PluginSettingsComponent<{ jsonStorage: Settings }>>) {
	configure(jsonStorage)
	const settings = jsonStorage.use()
	useEffect(() => {
		if (!jsonStorage.loaded) void jsonStorage.get()
	}, [jsonStorage])
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState('')
	async function run(restore: boolean) {
		setBusy(true)
		setError('')
		try {
			const picker = getNativeModule<DocumentPicker>('RNDocumentPicker')
			if (!picker) throw new Error('File picker unavailable.')
			if (!storage.loaded) await storage.get()
			if (restore) {
				const files = await picker.pick({
					mode: 'open',
					type: ['application/json'],
					allowMultiSelection: false,
				})
				if (!files.length) return
				if (files[0].size && files[0].size > 8 * 1024 * 1024)
					throw new Error('Backup exceeds 8 MB.')
				const [copy] = await picker.keepLocalCopy({
					files: [
						{ uri: files[0].uri, fileName: 'gif-categories-import.json' },
					],
					destination: 'cachesDirectory',
				})
				if (!copy || copy.status === 'error')
					throw new Error(copy?.copyError || 'Could not read backup.')
				if (!copy.localUri.startsWith('file://'))
					throw new Error('File picker did not return a local file.')
				const path = decodeURIComponent(copy.localUri.slice(7))
				let data: Settings
				try {
					data = parseBackup(await readFile(path))
				} finally {
					await rm(path)
				}
				confirm(
					`Replace categories with ${data.categories.length} from backup?`,
					() => {
						void update(data.categories)
					},
				)
			} else {
				const fileName = 'gif-categories-backup.json'
				const value = JSON.stringify({
					version: 1,
					categories: storage.cache!.categories,
				})
				parseBackup(value)
				const path = await FileModule.writeFile(
					'cache',
					fileName,
					value,
					'utf8',
				)
				const options = {
					sourceUris: [encodeURI(`file://${path}`)],
					fileName,
					mimeType: 'application/json',
					copy: true,
				}
				const result = await picker.writeDocuments(
					Platform.OS === 'android'
						? await picker.saveDocument(options)
						: options,
				)
				if (result.length !== 1 || result[0].error)
					throw new Error(result[0]?.error || 'Could not save backup.')
				ToastActionCreators.open(sheet, { text: 'Backup saved.' })
			}
		} catch (error) {
			if (
				!(
					error &&
					typeof error === 'object' &&
					'code' in error &&
					error.code === 'OPERATION_CANCELED'
				)
			)
				setError(error instanceof Error ? error.message : String(error))
		} finally {
			setBusy(false)
		}
	}
	return (
		<ScrollView>
			<Design.Stack spacing={16} style={{ padding: 16 }}>
				<Design.TableRowGroup title="GIF picker">
					<Design.TableSwitchRow
						label="Only show my categories"
						subLabel="Hide Discord's trending and suggested categories."
						value={!!settings?.onlyMine}
						disabled={!settings}
						onValueChange={value => void jsonStorage.set({ onlyMine: value })}
					/>
				</Design.TableRowGroup>
				<Design.Button
					text="Back up to file"
					disabled={busy}
					onPress={() => void run(false)}
				/>
				<Design.Button
					text="Restore from file"
					disabled={busy}
					variant="secondary"
					onPress={() => void run(true)}
				/>
				{!!error && (
					<Design.Text color="text-feedback-critical">{error}</Design.Text>
				)}
			</Design.Stack>
		</ScrollView>
	)
}
