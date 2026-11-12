import { getModules, lookupModule } from '@valenced/modules/finders'
import {
	createFilterGenerator,
	FilterScopes,
	withName,
	withProps,
} from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'
import { Children, cloneElement, isValidElement } from 'react'
import { configure } from './data'
import { addMediaAction, messageGif } from './media'
import {
	Categories,
	CategoryHeader,
	Frame,
	GifAction,
	SearchControls,
	setActive,
} from './picker'
import BackupSettings, { closeSheets } from './ui'
import type { Filter } from '@valenced/modules/finders/filters'
import type { ReactNode } from 'react'
import type { Gif, Settings } from './data'
import type { GifMessage } from './media'
import type {
	CategoriesProps,
	HeaderProps,
	ListProps,
	PickerProps,
	Tree,
} from './picker'

export default plugin<{ jsonStorage: Settings }>({
	jsonStorage: { default: { categories: [] } },
	SettingsComponent: BackupSettings,
	async start({ cleanup, jsonStorage, plugin }) {
		let stopped = false
		cleanup(() => {
			stopped = true
			setActive(false)
			closeSheets()
		})
		if (plugin.startedLate) plugin.requireReload()
		configure(jsonStorage)
		try {
			await jsonStorage.get()
		} catch (error) {
			plugin.reportError(error)
			return
		}
		if (stopped) return
		setActive(true)
		const memoName = createFilterGenerator<[string]>(
			([name], _, value) =>
				value != null && typeof value === 'object' && value.type?.name === name,
			([name]) => `dev.benjii.gif-categories.memo(${name})`,
			FilterScopes.Initialized,
		)
		function patch<P>(
			filter: Filter,
			key: string,
			transform: (props: P, result: ReactNode) => ReactNode,
		) {
			cleanup(
				getModules(
					filter,
					target => {
						if (stopped) return
						try {
							cleanup(
								instead(
									target as Record<string, (...args: unknown[]) => ReactNode>,
									key,
									function (args, original) {
										const result = Reflect.apply(original, this, args)
										return stopped ? result : transform(args[0] as P, result)
									},
								),
							)
						} catch (error) {
							plugin.reportError(error)
						}
					},
					{ returnNamespace: key === 'default' },
				),
			)
		}
		patch<PickerProps>(memoName('GIFPicker'), 'type', (props, result) =>
			isValidElement<Tree>(result) ? (
				<Frame original={result} picker={props} />
			) : (
				result
			),
		)
		patch<HeaderProps>(memoName('GIFPickerHeader'), 'type', (props, result) => {
			if (!isValidElement(result)) return result
			if (props.gifCategory)
				return <CategoryHeader original={result} category={props.gifCategory} />
			return props.categoryType === 'Search' ? (
				<SearchControls original={result} />
			) : (
				result
			)
		})
		patch<CategoriesProps>(
			memoName('GIFPickerCategoriesPage'),
			'type',
			(props, result) =>
				props.gifCategories &&
				isValidElement<ListProps>(result) &&
				Array.isArray(result.props.sections) &&
				typeof result.props.renderItem === 'function' ? (
					<Categories original={result} page={props} />
				) : (
					result
				),
		)
		patch<{ item: Gif }>(
			withName('GIFPickerItemActionSheet'),
			'default',
			({ item }, result) => {
				if (!item?.url || !item.src) return result
				const [buttons] = lookupModule(withProps('ButtonGroup'), {
					initialize: false,
				})
				if (!buttons) return result
				const ButtonGroup = buttons.ButtonGroup
				const gif: Gif = {
					id: item.id,
					url: item.url,
					src: item.src,
					width: item.width,
					height: item.height,
					format: item.format,
				}
				function append(node: ReactNode): ReactNode {
					if (!isValidElement<Tree>(node)) return node
					if (node.type === ButtonGroup)
						return cloneElement(
							node,
							{},
							node.props.children,
							<GifAction key="gif-categories" gif={gif} />,
						)
					return cloneElement(
						node,
						{},
						Children.map(node.props.children, append),
					)
				}
				return append(result)
			},
		)
		patch<{ message: GifMessage }>(
			withName('LongPressMessageActionSheet'),
			'default',
			({ message }, result) => {
				const gif = message && messageGif(message)
				return gif ? addMediaAction(result, gif) : result
			},
		)
	},
})
