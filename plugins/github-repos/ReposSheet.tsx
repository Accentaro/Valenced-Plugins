import { Tokens } from '@valenced/discord/common/tokens'
import { Design } from '@valenced/discord/design'
import { ReactNativeSafeAreaContext } from '@valenced/externals/react-native-safe-area-context'
import { FlashList as Shopify } from '@valenced/externals/shopify'
import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
	ActivityIndicator,
	BackHandler,
	Linking,
	Pressable,
	useWindowDimensions,
	View,
} from 'react-native'
import AnimatedTile from './AnimatedTile'
import Contributions, { useReducedMotion } from './Contributions'
import {
	getCachedProfile,
	getCalendar,
	getRepositories,
	sortLabels,
	sortRepositories,
} from './data'
import RepoPreview from './RepoPreview'
import type { ComponentType } from 'react'
import type { Day, RepoSort, Repository } from './data'

const key = 'dev.benjii.github-repos'
interface ModalNavigation {
	pushModal(options: {
		key: string
		modal: {
			key: string
			modal: ComponentType<{ login: string }>
			animation: string
			shouldPersistUnderModals: boolean
			props: { login: string }
			closable: boolean
		}
	}): void
	popModal(key: string): void
}
let navigation: ModalNavigation | undefined
export function closeRepos() {
	navigation?.popModal(key)
}
export function openRepos(login: string) {
	navigation ??= lookupModule(
		withProps<ModalNavigation>('pushModal', 'popModal'),
		{ initialize: false },
	)[0]
	if (!navigation)
		throw new Error('GitHub Repos: screen navigation unavailable.')
	navigation.pushModal({
		key,
		modal: {
			key,
			modal: ReposSheet,
			animation: 'slide-up',
			shouldPersistUnderModals: false,
			props: { login },
			closable: true,
		},
	})
}

export default function ReposSheet({ login }: { login: string }) {
	const { width, fontScale } = useWindowDimensions()
	const insets = ReactNativeSafeAreaContext.useSafeAreaInsets()
	const useStyles = useMemo(
		() =>
			Design.createStyles({
				root: {
					flex: 1,
					backgroundColor: Tokens.default.colors.BACKGROUND_BASE_LOWEST,
				},
			}),
		[],
	)
	const styles = useStyles()
	const [selected, setSelected] = useState<Repository>()
	const reduced = useReducedMotion()
	const previousPositions = useRef(new Map<number, number>())
	const sortStarted = useRef(0)
	const [cached] = useState(() => getCachedProfile(login))
	const [sort, setSort] = useState<RepoSort>('updated')
	const [repos, setRepos] = useState<Repository[]>(cached.repos)
	const [days, setDays] = useState<Day[] | undefined>(cached.days)
	const [calendarError, setCalendarError] = useState(false)
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(cached.more)
	const [more, setMore] = useState(cached.more)
	const page = useRef(cached.page)
	const pending = useRef(false)
	const mounted = useRef(false)
	const columns = width >= 360 && fontScale < 1.4 ? 2 : 1

	const sorted = useMemo(() => sortRepositories(repos, sort), [repos, sort])

	async function loadMore() {
		if (pending.current) return
		pending.current = true
		setLoading(true)
		setError('')
		try {
			let remaining = true
			while (remaining && mounted.current) {
				const result = await getRepositories(login, page.current)
				if (!mounted.current) return
				setRepos(previous => {
					const ids = new Set(previous.map(repo => repo.id))
					return [
						...previous,
						...result.repos.filter(repo => !ids.has(repo.id)),
					]
				})
				page.current++
				remaining = result.more
				setMore(remaining)
			}
		} catch (failure) {
			if (mounted.current)
				setError(
					failure instanceof Error
						? failure.message
						: 'Could not load repositories.',
				)
		} finally {
			pending.current = false
			if (mounted.current) setLoading(false)
		}
	}

	useEffect(() => {
		const subscription = BackHandler.addEventListener(
			'hardwareBackPress',
			() => {
				if (selected) setSelected(undefined)
				else closeRepos()
				return true
			},
		)
		return () => subscription.remove()
	}, [selected])
	function cycleSort() {
		previousPositions.current = new Map(
			sorted.map((repo, index) => [repo.id, index]),
		)
		sortStarted.current = reduced ? 0 : Date.now()
		setSort(current =>
			current === 'updated'
				? 'stars'
				: current === 'stars'
					? 'name'
					: 'updated',
		)
	}
	useEffect(() => {
		mounted.current = true
		if (cached.more) void loadMore()
		if (!cached.days)
			void getCalendar(login)
				.then(value => {
					if (mounted.current) setDays(value)
				})
				.catch(() => {
					if (mounted.current) setCalendarError(true)
				})
		return () => {
			mounted.current = false
		}
	}, [])

	function openUrl(url: string) {
		void Linking.openURL(url).catch(() => {
			if (mounted.current) setError('Could not open GitHub in your browser.')
		})
	}

	return (
		<View
			style={[
				styles.root,
				{
					paddingTop: insets.top,
					paddingBottom: insets.bottom,
				},
			]}
		>
			<View
				style={{
					padding: 16,
					flexDirection: 'row',
					alignItems: 'center',
					gap: 12,
				}}
			>
				<Design.Text variant="heading-lg/bold" style={{ flex: 1 }}>
					{login}'s GitHub Repositories
				</Design.Text>
				<Design.Button
					text="Close"
					variant="tertiary"
					size="sm"
					accessibilityLabel="Close GitHub repositories"
					onPress={closeRepos}
				/>
			</View>
			<Shopify.FlashList
				key={columns}
				extraData={sort}
				maintainVisibleContentPosition={{ disabled: true }}
				style={{ flex: 1 }}
				data={sorted}
				numColumns={columns}
				keyExtractor={repo => String(repo.id)}
				contentContainerStyle={{ padding: 8 }}
				ListHeaderComponent={
					<View>
						<View style={{ height: 190 + 32 * fontScale }}>
							{days ? (
								<Contributions days={days} reduced={reduced} />
							) : calendarError ? (
								<Design.Text variant="text-sm/normal">
									Contributions unavailable
								</Design.Text>
							) : (
								<Design.Card
									style={{
										marginVertical: 16,
										flex: 1,
										justifyContent: 'center',
										alignItems: 'center',
										gap: 12,
									}}
								>
									<ActivityIndicator />
									<Design.Text variant="text-sm/normal">
										Loading contributions
									</Design.Text>
								</Design.Card>
							)}
						</View>
						<View
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								justifyContent: 'space-between',
								marginVertical: 12,
								gap: 8,
							}}
						>
							<Design.Text variant="text-sm/semibold" style={{ flex: 1 }}>
								Public repositories
							</Design.Text>
							<Design.Button
								text={`Sort: ${sortLabels[sort]}`}
								variant="secondary"
								size="sm"
								accessibilityHint="Tap to cycle repository sort order"
								disabled={!repos.length}
								onPress={cycleSort}
							/>
						</View>
					</View>
				}
				renderItem={({ item, index }) => (
					<AnimatedTile
						from={previousPositions.current.get(item.id) ?? index}
						index={index}
						columns={columns}
						width={(width - 16) / columns}
						height={112 * fontScale + 8}
						started={sortStarted.current}
					>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={`${item.name}, ${item.stargazers_count} stars`}
							onPress={() => setSelected(item)}
							style={({ pressed }) => ({
								flex: 1,
								padding: 4,
								opacity: pressed ? 0.65 : 1,
							})}
						>
							<Design.Card
								style={{ height: 112 * fontScale, padding: 10, gap: 6 }}
							>
								<View
									style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
								>
									<Design.Text
										variant="text-md/semibold"
										numberOfLines={2}
										style={{ flex: 1 }}
									>
										{item.name}
									</Design.Text>
									<Design.Text
										variant="text-md/semibold"
										style={{ color: '#e3b341' }}
									>
										{'\u2605'} {item.stargazers_count.toLocaleString()}
									</Design.Text>
								</View>
								{item.description ? (
									<Design.Text variant="text-sm/normal" numberOfLines={2}>
										{item.description}
									</Design.Text>
								) : null}
								{item.language ? (
									<Design.Text variant="text-xs/normal" numberOfLines={1}>
										{item.language}
									</Design.Text>
								) : null}
							</Design.Card>
						</Pressable>
					</AnimatedTile>
				)}
				ListEmptyComponent={
					!loading && !error ? (
						<Design.Text variant="text-md/normal">
							No public repositories yet.
						</Design.Text>
					) : null
				}
				ListFooterComponent={
					<View style={{ gap: 12, paddingVertical: 12 }}>
						{error ? (
							<Design.Text
								variant="text-sm/normal"
								accessibilityLiveRegion="polite"
							>
								{error}
							</Design.Text>
						) : null}
						{loading ? (
							<ActivityIndicator accessibilityLabel="Loading repositories" />
						) : (
							more && (
								<Design.Button
									text={error ? 'Retry' : 'Load more'}
									variant="secondary"
									onPress={loadMore}
								/>
							)
						)}
					</View>
				}
			/>
			<View style={{ padding: 12 }}>
				<Design.Button
					text="View on GitHub"
					variant="secondary"
					onPress={() => openUrl(`https://github.com/${login}`)}
				/>
			</View>
			{selected && (
				<View
					style={{
						position: 'absolute',
						top: 0,
						bottom: 0,
						left: 0,
						right: 0,
						justifyContent: 'center',
						padding: 20,
						backgroundColor: '#0009',
					}}
					accessibilityViewIsModal
				>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Close repository preview"
						onPress={() => setSelected(undefined)}
						style={{
							position: 'absolute',
							top: 0,
							bottom: 0,
							left: 0,
							right: 0,
						}}
					/>
					<RepoPreview
						repo={selected}
						reduced={reduced}
						onBack={() => setSelected(undefined)}
						onOpen={() =>
							openUrl(
								`https://github.com/${selected.owner.login}/${selected.name}`,
							)
						}
					/>
				</View>
			)}
		</View>
	)
}
