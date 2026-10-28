import { Design } from '@valenced/discord/design'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, ScrollView, View } from 'react-native'
import type { Day } from './data'

const months = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
]
const colors = ['#29332d', '#0e4429', '#006d32', '#26a641', '#39d353']

function Contributions({ days, reduced }: { days: Day[]; reduced: boolean }) {
	const scroll = useRef<ScrollView>(null)
	const motion = !reduced
	const progress = useMemo(() => new Animated.Value(1), [])
	const weeks = useMemo(() => {
		const offset = new Date(`${days[0].date}T00:00:00Z`).getUTCDay()
		const cells: (Day | null)[] = [...Array<null>(offset).fill(null), ...days]
		return Array.from({ length: Math.ceil(cells.length / 7) }, (_, i) =>
			cells.slice(i * 7, i * 7 + 7),
		)
	}, [days])

	useEffect(() => {
		if (!motion) {
			progress.setValue(1)
			return
		}
		progress.setValue(0)
		const animation = Animated.timing(progress, {
			toValue: 1,
			duration: 450,
			useNativeDriver: true,
			isInteraction: false,
		})
		animation.start()
		return () => animation.stop()
	}, [motion, progress])
	return (
		<View style={{ gap: 10, paddingVertical: 16 }}>
			<Design.Text variant="text-sm/semibold">
				Contributions · past year
			</Design.Text>
			<ScrollView
				ref={scroll}
				onContentSizeChange={() =>
					scroll.current?.scrollToEnd({ animated: false })
				}
				horizontal
				nestedScrollEnabled
				directionalLockEnabled
				showsHorizontalScrollIndicator
			>
				<View style={{ width: weeks.length * 12, paddingBottom: 8 }}>
					<View style={{ height: 20 }}>
						{weeks.map((week, index) => {
							const date =
								week.find(day => day?.date.endsWith('-01'))?.date ??
								(index === 0 ? week.find(day => day)?.date : undefined)
							if (!date || index > weeks.length - 3) return null
							return (
								<Design.Text
									key={date}
									variant="text-xs/normal"
									style={{ position: 'absolute', left: index * 12, width: 36 }}
								>
									{months[Number(date.slice(5, 7)) - 1]}
								</Design.Text>
							)
						})}
					</View>
					<View style={{ flexDirection: 'row', gap: 3, paddingVertical: 8 }}>
						{weeks.map((week, index) => {
							const start = (index / weeks.length) * 0.65
							return (
								<Animated.View
									key={week.find(day => day)?.date}
									style={{
										gap: 3,
										opacity: progress.interpolate({
											inputRange: [start, start + 0.35],
											outputRange: [0.2, 1],
											extrapolate: 'clamp',
										}),
										transform: [
											{
												translateY: progress.interpolate({
													inputRange: [start, start + 0.35],
													outputRange: [8, 0],
													extrapolate: 'clamp',
												}),
											},
										],
									}}
								>
									{week.map((day, row) => (
										<View
											key={day?.date ?? `empty-${row}`}
											accessible={!!day}
											accessibilityLabel={
												day
													? `${day.date}: contribution intensity ${day.level} of 4`
													: undefined
											}
											style={{
												width: 9,
												height: 9,
												borderRadius: 2,
												backgroundColor: day
													? colors[day.level]
													: 'transparent',
											}}
										/>
									))}
								</Animated.View>
							)
						})}
					</View>
				</View>
			</ScrollView>
			<View
				style={{
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 5,
				}}
			>
				<Design.Text variant="text-xs/normal">Less</Design.Text>
				{colors.map(color => (
					<View
						key={color}
						style={{
							width: 9,
							height: 9,
							borderRadius: 2,
							backgroundColor: color,
						}}
					/>
				))}
				<Design.Text variant="text-xs/normal">More</Design.Text>
			</View>
		</View>
	)
}

export default memo(Contributions)

export function useReducedMotion() {
	const [reduced, setReduced] = useState(true)
	useEffect(() => {
		let mounted = true
		void AccessibilityInfo.isReduceMotionEnabled()
			.then(reduced => {
				if (mounted) setReduced(reduced)
			})
			.catch(() => {})
		const subscription = AccessibilityInfo.addEventListener(
			'reduceMotionChanged',
			reduced => setReduced(reduced),
		)
		return () => {
			mounted = false
			subscription.remove()
		}
	}, [])
	return reduced
}
