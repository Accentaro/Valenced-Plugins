import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { useEffect, useRef, useState } from 'react'
import {
	ActivityIndicator,
	FlatList,
	Linking,
	Pressable,
	useWindowDimensions,
	View,
} from 'react-native'
import Contributions from './Contributions'
import { getCalendar, getRepositories } from './data'
import type { Day, Repository } from './data'

const key = 'dev.benjii.github-repos'
export const closeRepos = () => ActionSheetActionCreators.hideActionSheet(key)
export function openRepos(login: string) {
	ActionSheetActionCreators.openLazy(
		Promise.resolve({ default: ReposSheet }),
		key,
		{ login },
	)
}

export default function ReposSheet({ login }: { login: string }) {
	const { height, width, fontScale } = useWindowDimensions()
	const [repos, setRepos] = useState<Repository[]>([])
	const [days, setDays] = useState<Day[]>()
	const [calendarError, setCalendarError] = useState(false)
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(true)
	const [more, setMore] = useState(true)
	const page = useRef(1)
	const pending = useRef(false)
	const mounted = useRef(false)
	const columns = width >= 360 && fontScale < 1.4 ? 2 : 1

	async function loadMore() {
		if (pending.current) return
		pending.current = true
		setLoading(true)
		setError('')
		try {
			const result = await getRepositories(login, page.current)
			if (!mounted.current) return
			setRepos(previous => {
				const ids = new Set(previous.map(repo => repo.id))
				return [...previous, ...result.repos.filter(repo => !ids.has(repo.id))]
			})
			setMore(result.more)
			page.current++
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
		mounted.current = true
		void loadMore()
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
		<Design.ActionSheet
			scrollable={false}
			startExpanded
			header={
				<Design.BottomSheetTitleHeader
					title={`${login}'s GitHub Repositories`}
				/>
			}
			footer={
				<View style={{ padding: 16, gap: 8 }}>
					<Design.Button
						text="View on GitHub"
						variant="secondary"
						onPress={() => openUrl(`https://github.com/${login}`)}
					/>
					<Design.Button
						text="Close"
						variant="secondary"
						onPress={closeRepos}
					/>
				</View>
			}
		>
			<FlatList
				key={columns}
				style={{ height: height * 0.58 }}
				data={repos}
				numColumns={columns}
				keyExtractor={repo => String(repo.id)}
				initialNumToRender={10}
				windowSize={5}
				contentContainerStyle={{ gap: 10, padding: 12 }}
				columnWrapperStyle={columns === 2 ? { gap: 10 } : undefined}
				ListHeaderComponent={
					<View>
						{days ? (
							<Contributions days={days} />
						) : calendarError ? (
							<Design.Text variant="text-sm/normal">
								Contributions unavailable
							</Design.Text>
						) : (
							<ActivityIndicator accessibilityLabel="Loading contributions" />
						)}
						<Design.Text
							variant="text-sm/semibold"
							style={{ marginVertical: 12 }}
						>
							Public repositories · recently updated
						</Design.Text>
					</View>
				}
				renderItem={({ item }) => (
					<Pressable
						accessibilityRole="link"
						accessibilityLabel={`${item.name}, ${item.stargazers_count} stars`}
						onPress={() =>
							openUrl(`https://github.com/${item.owner.login}/${item.name}`)
						}
						style={({ pressed }) => ({
							flex: 1,
							maxWidth: columns === 2 ? '50%' : '100%',
							opacity: pressed ? 0.65 : 1,
						})}
					>
						<Design.Card
							style={{ flex: 1, padding: 14, gap: 8, minHeight: 142 }}
						>
							<Design.Text variant="text-md/semibold" numberOfLines={2}>
								{item.name}
							</Design.Text>
							<Design.Text variant="text-sm/normal" numberOfLines={2}>
								{item.description || 'No description'}
							</Design.Text>
							<Design.Text variant="text-xs/normal" numberOfLines={1}>
								{item.language ?? 'Code'} · ★{' '}
								{item.stargazers_count.toLocaleString()}
							</Design.Text>
						</Design.Card>
					</Pressable>
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
		</Design.ActionSheet>
	)
}
