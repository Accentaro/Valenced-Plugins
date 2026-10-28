import { Design } from '@valenced/discord/design'
import { useEffect, useRef } from 'react'
import { Animated, ScrollView, useWindowDimensions, View } from 'react-native'
import type { Repository } from './data'

export default function RepoPreview({
	repo,
	reduced,
	onBack,
	onOpen,
}: {
	repo: Repository
	reduced: boolean
	onBack(): void
	onOpen(): void
}) {
	const { fontScale } = useWindowDimensions()
	const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current
	useEffect(() => {
		if (reduced) {
			progress.setValue(1)
			return
		}
		const animation = Animated.timing(progress, {
			toValue: 1,
			duration: 180,
			useNativeDriver: true,
		})
		animation.start()
		return () => animation.stop()
	}, [progress, reduced])
	const details = [
		['Language', repo.language],
		['Default branch', repo.default_branch],
		['License', repo.license?.name],
		[
			'Created',
			repo.created_at && new Date(repo.created_at).toLocaleDateString(),
		],
		['Updated', new Date(repo.updated_at).toLocaleDateString()],
		[
			'Last push',
			repo.pushed_at && new Date(repo.pushed_at).toLocaleDateString(),
		],
	]
	return (
		<Animated.View
			style={{
				maxHeight: '85%',
				width: '100%',
				maxWidth: 560,
				alignSelf: 'center',
				opacity: progress,
				transform: [
					{
						scale: progress.interpolate({
							inputRange: [0, 1],
							outputRange: [0.85, 1],
						}),
					},
				],
			}}
		>
			<Design.Card style={{ flexShrink: 1, padding: 0, overflow: 'hidden' }}>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						padding: 16,
						gap: 12,
					}}
				>
					<View style={{ flex: 1, gap: 4 }}>
						<Design.Text variant="text-sm/normal" style={{ opacity: 0.7 }}>
							{repo.owner.login}
						</Design.Text>
						<Design.Text variant="heading-xl/bold" selectable>
							{repo.name}
						</Design.Text>
					</View>
					<Design.Button
						text="Close"
						variant="tertiary"
						size="sm"
						accessibilityLabel="Close repository preview"
						onPress={onBack}
					/>
				</View>
				<ScrollView
					style={{ flexGrow: 0 }}
					contentContainerStyle={{ padding: 16, gap: 16 }}
				>
					<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
						{[
							['Stars', repo.stargazers_count],
							['Forks', repo.forks_count],
							['Issues / PRs', repo.open_issues_count],
						]
							.filter(([, value]) => value !== undefined)
							.map(([label, value]) => (
								<Design.Card
									variant="secondary"
									key={label}
									style={{
										flexGrow: 1,
										padding: 12,
										borderRadius: 12,
										gap: 4,
									}}
								>
									<Design.Text
										variant="text-lg/semibold"
										style={label === 'Stars' ? { color: '#e3b341' } : undefined}
									>
										{label === 'Stars' ? '\u2605 ' : ''}
										{value?.toLocaleString()}
									</Design.Text>
									<Design.Text
										variant="text-xs/normal"
										style={{ opacity: 0.7 }}
									>
										{label}
									</Design.Text>
								</Design.Card>
							))}
					</View>
					{repo.description && (
						<Design.Text variant="text-md/normal" selectable>
							{repo.description}
						</Design.Text>
					)}
					{(repo.fork || repo.archived) && (
						<Design.Text variant="text-sm/semibold">
							{[repo.fork && 'Fork', repo.archived && 'Archived']
								.filter(Boolean)
								.join(' · ')}
						</Design.Text>
					)}
					<View
						style={{
							flexDirection: 'row',
							flexWrap: 'wrap',
							gap: 16,
							paddingTop: 4,
						}}
					>
						{details
							.filter(([, value]) => value)
							.map(([label, value]) => (
								<Design.Card
									variant="secondary"
									key={label}
									style={{ gap: 4, width: fontScale >= 1.4 ? '100%' : '47%' }}
								>
									<Design.Text
										variant="text-xs/normal"
										style={{ opacity: 0.65 }}
									>
										{label}
									</Design.Text>
									<Design.Text variant="text-md/semibold" selectable>
										{value}
									</Design.Text>
								</Design.Card>
							))}
					</View>
					{!!repo.topics?.length && (
						<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
							{repo.topics.map(topic => (
								<Design.Card
									variant="secondary"
									key={topic}
									style={{
										borderRadius: 16,
										paddingHorizontal: 10,
										paddingVertical: 6,
									}}
								>
									<Design.Text variant="text-xs/normal">{topic}</Design.Text>
								</Design.Card>
							))}
						</View>
					)}
				</ScrollView>
				<View style={{ padding: 16, paddingTop: 8 }}>
					<Design.Button
						text="Open repository on GitHub"
						variant="primary"
						onPress={onOpen}
					/>
				</View>
			</Design.Card>
		</Animated.View>
	)
}
