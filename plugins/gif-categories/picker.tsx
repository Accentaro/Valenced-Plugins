import { Design } from '@valenced/discord/design'
import { lookupModule } from '@valenced/modules/finders'
import { withName, withProps } from '@valenced/modules/finders/filters'
import { lookupGeneratedIconComponent } from '@valenced/utils/discord'
import { findInTree } from '@valenced/utils/tree'
import {
	Children,
	cloneElement,
	isValidElement,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'
import { Animated, BackHandler, View } from 'react-native'
import { preview, refreshGifs, reorder, storage } from './data'
import { chooseCategory, editCategory } from './ui'
import type {
	ComponentProps,
	ComponentType,
	ReactElement,
	ReactNode,
} from 'react'
import type { Category, Gif } from './data'

export interface Tree {
	children?: ReactNode
}
export interface PickerProps {
	onPressGIF(gif: Gif, index: number): void
	inActionSheet?: boolean
	selectedGifSrc?: string
	keyboardDismissMode?: 'none' | 'on-drag' | 'interactive'
}
interface ResultsProps extends PickerProps {
	columns: number
	columnWidth: number
	resultItems: Gif[]
	loading: boolean
}
interface TileProps {
	item: { type: string; name: string; src?: string; format?: number }
	onSelectCategory(): void
}
export interface CategoriesProps {
	columns: number
	onSelectCategory(type: string, name: string): void
	favoritesCategory: { type: string; name: string }
	gifCategories?: {
		items: Category[]
		onlyMine?: boolean
		select(id: string): void
	}
}
export interface ListProps {
	itemSize?: number
	sections: number[]
	renderItem(section: number, row: number): ReactElement<Tree>
}
let active = false
const listeners = new Set<() => void>()
export function setActive(value: boolean) {
	active = value
	for (const listener of listeners) listener()
}
function subscribe(listener: () => void) {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}
function useActive() {
	return useSyncExternalStore(subscribe, () => active)
}

export function SearchControls({ original }: { original: ReactElement }) {
	const enabled = useActive()
	if (!enabled) return original
	// Keep the providers wrapper outside this row, regardless of plugin start order.
	if (
		isValidElement<{ header?: ReactElement }>(original) &&
		isValidElement(original.props.header)
	)
		return cloneElement(original, {
			header: <SearchControls original={original.props.header} />,
		})
	const PlusIcon = lookupGeneratedIconComponent('PlusSmallIcon')!
	const IconButton = Design.IconButton as ComponentType<
		Omit<ComponentProps<typeof Design.IconButton>, 'icon'> & { icon: ReactNode }
	>
	return (
		<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
			<View style={{ flex: 1, minWidth: 0 }}>{original}</View>
			<IconButton
				icon={<PlusIcon size="sm" />}
				size="md"
				variant="secondary"
				style={{ width: 40, height: 40, borderRadius: 8 }}
				accessibilityLabel="New category"
				onPress={() => editCategory()}
			/>
		</View>
	)
}

export interface HeaderProps {
	categoryType: string
	gifCategory?: Category
}
// Discord's Favourites header (back arrow, title, search), retitled for an
// open category with Edit in place of the favourites search.
export function CategoryHeader({
	original,
	category,
}: {
	original: ReactElement
	category: Category
}) {
	const PencilIcon = lookupGeneratedIconComponent('PencilIcon')!
	const IconButton = Design.IconButton as ComponentType<
		Omit<ComponentProps<typeof Design.IconButton>, 'icon'> & { icon: ReactNode }
	>
	function replace(node: ReactNode): ReactNode {
		if (!isValidElement<Tree & Record<string, unknown>>(node)) return node
		const { props } = node
		if (
			typeof props.onQueryChange === 'function' &&
			typeof props.columnWidth === 'number'
		)
			return (
				<IconButton
					key="gif-categories-edit"
					icon={<PencilIcon size="sm" />}
					size="sm"
					variant="tertiary"
					accessibilityLabel="Edit category"
					onPress={() => editCategory(category)}
				/>
			)
		if (typeof props.variant === 'string' && typeof props.children === 'string')
			return cloneElement(node, {}, category.name)
		if (props.children === undefined) return node
		return cloneElement(node, {}, Children.map(props.children, replace))
	}
	return replace(original) as ReactElement
}

interface DragEvent {
	absoluteX: number
	absoluteY: number
	y: number
}
interface PanGesture {
	runOnJS(enabled: boolean): this
	activateAfterLongPress(duration: number): this
	shouldCancelWhenOutside(cancel: boolean): this
	onStart(callback: (event: DragEvent) => void): this
	onUpdate(callback: (event: DragEvent) => void): this
	onEnd(callback: (event: DragEvent, success: boolean) => void): this
	onFinalize(callback: (event: DragEvent, success: boolean) => void): this
}
interface Gestures {
	Gesture: { Pan(): PanGesture }
	GestureDetector: ComponentType<{ gesture: PanGesture; children: ReactNode }>
}
interface Slot {
	x: number
	y: number
	width: number
	height: number
}
interface Drag {
	from: number
	to: number
	startX: number
	startY: number
	moved: boolean
	ready: boolean
	origin: Slot
	slots: (Slot | undefined)[]
}
interface DragTileProps {
	gestures: Gestures
	children: ReactNode
	start(event: DragEvent): void
	move(event: DragEvent): void
	finish(commit: boolean): void
}
function DragTile(props: DragTileProps) {
	const latest = useRef(props)
	latest.current = props
	const { Gesture, GestureDetector } = props.gestures
	const gesture = useMemo(
		() =>
			Gesture.Pan()
				.runOnJS(true)
				.activateAfterLongPress(400)
				.shouldCancelWhenOutside(false)
				.onStart(event => latest.current.start(event))
				.onUpdate(event => latest.current.move(event))
				.onEnd((_, success) => latest.current.finish(success))
				.onFinalize((_, success) => {
					if (!success) latest.current.finish(false)
				}),
		[Gesture],
	)
	return <GestureDetector gesture={gesture}>{props.children}</GestureDetector>
}

export function Categories({
	original,
	page,
}: {
	original: ReactElement<ListProps>
	page: CategoriesProps
}) {
	const enabled = useActive()
	const ui = page.gifCategories!
	const frame = useRef<View>(null)
	const views = useRef(new Map<number, View>())
	const drag = useRef<Drag | null>(null)
	const [dragging, setDragging] = useState<{ from: number; to: number } | null>(
		null,
	)
	const [position] = useState(() => new Animated.ValueXY())
	useEffect(() => {
		void refreshGifs(ui.items.flatMap(category => category.gifs.slice(0, 1)))
	}, [ui.items])
	// Saved changes move tiles, so measurements from before them are stale.
	useEffect(() => {
		drag.current = null
		setDragging(null)
	}, [ui.items])
	if (!enabled || !original.props.sections[0]) return original
	const rowTemplate = original.props.renderItem(0, 0)
	// Discord's tiles, so ours can flow between them without gaps.
	const native: ReactElement<TileProps>[] = []
	for (let row = 0; row < original.props.sections[0]; row++)
		for (const child of Children.toArray(
			original.props.renderItem(0, row).props.children,
		))
			if (isValidElement<TileProps>(child) && child.props.item)
				native.push(child)
	const tile = native[0]
	if (!tile) return original
	const { itemSize } = original.props
	const [gestures] = lookupModule(
		withProps<Gestures>('Gesture', 'GestureDetector'),
		{ initialize: false },
	)
	const { columns } = page
	const items = ui.items
	// Favourites (and Trending) lead; Discord's suggestions follow unless hidden.
	const before = native.filter(item =>
		ui.onlyMine
			? item.props.item.type === 'Favorites'
			: item.props.item.type !== 'Category',
	)
	const after = ui.onlyMine
		? []
		: native.filter(item => item.props.item.type === 'Category')
	const rows = Math.ceil(
		(before.length + items.length + after.length) / columns,
	)

	function start(index: number, event: DragEvent) {
		if (typeof itemSize !== 'number') return
		const state: Drag = {
			from: index,
			to: index,
			startX: event.absoluteX,
			startY: event.absoluteY,
			moved: false,
			ready: false,
			origin: { x: 0, y: 0, width: 0, height: 0 },
			slots: [],
		}
		drag.current = state
		// The list positions rows natively, so window measurements miss the row
		// offset. Rows are placed from the pressed tile instead.
		const top = event.absoluteY - event.y
		const row = (slot: number) => Math.floor((before.length + slot) / columns)
		const targets = [
			frame.current,
			...items.map((_, slot) => views.current.get(slot)),
		]
		let pending = targets.length
		targets.forEach((view, slot) => {
			const done = (x = 0, y = 0, width = 0, height = 0) => {
				if (view && slot)
					state.slots[slot - 1] = {
						x,
						y: top + (row(slot - 1) - row(index)) * itemSize,
						width,
						height,
					}
				else if (view) state.origin = { x, y, width, height }
				if (--pending || drag.current !== state || !state.slots[index]) return
				state.ready = true
				move(event)
				setDragging({ from: index, to: state.to })
			}
			if (view) view.measureInWindow(done)
			else done()
		})
	}
	function move(event: DragEvent) {
		const state = drag.current
		if (!state?.ready) return
		const dx = event.absoluteX - state.startX
		const dy = event.absoluteY - state.startY
		state.moved ||= Math.hypot(dx, dy) > 10
		const from = state.slots[state.from]!
		position.setValue({
			x: from.x - state.origin.x + dx,
			y: from.y - state.origin.y + dy,
		})
		const x = from.x + from.width / 2 + dx
		const y = from.y + from.height / 2 + dy
		let best = Number.POSITIVE_INFINITY
		let to = state.to
		state.slots.forEach((slot, index) => {
			if (!slot) return
			const distance = Math.hypot(
				slot.x + slot.width / 2 - x,
				slot.y + slot.height / 2 - y,
			)
			if (distance < best) {
				best = distance
				to = index
			}
		})
		if (to === state.to) return
		state.to = to
		setDragging({ from: state.from, to })
	}
	function finish(commit: boolean) {
		const state = drag.current
		if (!state) return
		drag.current = null
		setDragging(null)
		if (!commit) return
		if (!state.moved) editCategory(items[state.from])
		else if (state.to !== state.from)
			void reorder(items[state.from].id, state.to)
	}
	function categoryTile(category: Category) {
		const cover = category.gifs[0] && preview(category.gifs[0])
		return cloneElement(tile as ReactElement<TileProps>, {
			key: category.id,
			item: {
				type: 'Category',
				name: category.name,
				src: cover?.src,
				format: cover?.format ?? 1,
			},
			onSelectCategory: () => {
				ui.select(category.id)
				page.onSelectCategory(
					page.favoritesCategory.type,
					page.favoritesCategory.name,
				)
			},
		})
	}
	function cell(index: number) {
		if (index < before.length) return before[index]
		const slot = index - before.length
		// Rows clip their tiles, so the preview reorders cells instead of moving
		// them. Cells are keyed by position to keep the held tile's gesture alive.
		const order = dragging ? [...items] : items
		if (dragging)
			order.splice(dragging.to, 0, ...order.splice(dragging.from, 1))
		const category = order[slot]
		if (!category)
			return (
				after[slot - items.length] ?? (
					<View key={`empty-${index}`} style={{ flex: 1 }} />
				)
			)
		const content = categoryTile(category)
		return (
			<View
				key={`gif-categories-${slot}`}
				ref={view => {
					if (view) views.current.set(slot, view)
					else views.current.delete(slot)
				}}
				collapsable={false}
				style={{ flex: 1, opacity: dragging?.to === slot ? 0 : 1 }}
			>
				{gestures && typeof itemSize === 'number' ? (
					<DragTile
						gestures={gestures}
						start={event => start(slot, event)}
						move={move}
						finish={finish}
					>
						<View collapsable={false} style={{ flex: 1 }}>
							{content}
						</View>
					</DragTile>
				) : (
					content
				)}
			</View>
		)
	}
	const lifted = dragging && drag.current?.slots[dragging.from]
	// A member name matching an imported View is rewritten by the JSX transform.
	const Lifted = Animated.View
	const list = cloneElement(original, {
		sections: [rows, ...original.props.sections.slice(1)],
		renderItem(section, row) {
			if (section) return original.props.renderItem(section, row)
			return cloneElement(
				rowTemplate,
				{},
				Array.from({ length: columns }, (_, column) =>
					cell(row * columns + column),
				),
			)
		},
	})
	return (
		<View ref={frame} collapsable={false} style={{ flex: 1 }}>
			{list}
			{lifted && dragging && items[dragging.from] && (
				<Lifted
					pointerEvents="none"
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						width: lifted.width,
						height: lifted.height,
						transform: [...position.getTranslateTransform(), { scale: 1.04 }],
					}}
				>
					{categoryTile(items[dragging.from])}
				</Lifted>
			)}
		</View>
	)
}

export function Frame({
	original,
	picker,
}: {
	original: ReactElement<Tree>
	picker: PickerProps
}) {
	const enabled = useActive()
	const { categories, onlyMine } = storage.use()!
	const [selected, setSelected] = useState<{
		id: string
		columns: number
	} | null>(null)
	const category = categories.find(item => item.id === selected?.id)
	useEffect(() => {
		if (category) void refreshGifs(category.gifs)
	}, [category])
	const header = findInTree(
		original,
		(
			node,
		): node is ReactElement<
			HeaderProps & { columnWidth: number; onQueryClear(): void }
		> => typeof node?.props?.onFavoritesQueryChange === 'function',
		{ walkable: new Set(['props', 'children']) },
	)
	const page = findInTree(
		original,
		(node): node is ReactElement<CategoriesProps> =>
			!!node?.props?.favoritesCategory &&
			typeof node.props.onSelectCategory === 'function',
		{ walkable: new Set(['props', 'children']) },
	)
	useEffect(() => {
		if (!enabled || !selected || !header) return
		const back = () => {
			setSelected(null)
			header.props.onQueryClear()
			return true
		}
		if (!category) {
			back()
			return
		}
		const subscription = BackHandler.addEventListener('hardwareBackPress', back)
		return () => subscription.remove()
	}, [enabled, selected, category, header])
	// Discord's back arrow leaves Favourites, which closes the category too.
	const type = header?.props.categoryType
	const lastType = useRef(type)
	useEffect(() => {
		if (lastType.current === 'Favorites' && type !== 'Favorites')
			setSelected(null)
		lastType.current = type
	}, [type])
	if (!enabled || !header) return original
	if (category && selected) {
		const [Results] = lookupModule(
			withName<ComponentType<ResultsProps>>('GIFPickerResultsList'),
			{ initialize: false },
		)
		return cloneElement(
			original,
			{},
			<View style={{ flex: 1 }}>
				{cloneElement(header, { gifCategory: category })}
				{category.gifs.length && Results ? (
					<Results
						{...picker}
						inActionSheet
						columns={selected.columns}
						columnWidth={header.props.columnWidth}
						resultItems={category.gifs.map(preview)}
						loading={false}
					/>
				) : (
					<Design.Text style={{ padding: 16 }}>
						{category.gifs.length
							? 'Close and reopen the GIF picker to load this category.'
							: 'Long-press a GIF and choose Categories to add it here.'}
					</Design.Text>
				)}
			</View>,
		)
	}
	if (!page) return original
	function replace(node: ReactNode): ReactNode {
		if (!isValidElement<Tree>(node)) return node
		if (node === page)
			return cloneElement(page, {
				gifCategories: {
					items: categories,
					onlyMine,
					select: id => setSelected({ id, columns: page!.props.columns }),
				},
			})
		return cloneElement(node, {}, Children.map(node.props.children, replace))
	}
	return cloneElement(
		original,
		{},
		Children.map(original.props.children, replace),
	)
}

export function GifAction({ gif }: { gif: Gif }) {
	const enabled = useActive()
	return enabled ? (
		<Design.Button
			text="Categories"
			variant="secondary"
			onPress={() => chooseCategory(gif)}
		/>
	) : null
}
