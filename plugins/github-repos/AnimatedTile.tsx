import { useLayoutEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'
import type { ReactNode } from 'react'

export default function AnimatedTile({
	children,
	from,
	index,
	columns,
	width,
	height,
	started,
}: {
	children: ReactNode
	from: number
	index: number
	columns: number
	width: number
	height: number
	started: number
}) {
	const progress = useRef(new Animated.Value(1)).current
	useLayoutEffect(() => {
		// Only animate this reorder, not recycled cards appearing during later scrolling.
		if (!started || from === index || Date.now() - started > 350) {
			progress.setValue(1)
			return
		}
		progress.setValue(0)
		const animation = Animated.timing(progress, {
			toValue: 1,
			duration: 520,
			delay: (index % 6) * 18,
			easing: Easing.inOut(Easing.cubic),
			useNativeDriver: true,
			isInteraction: false,
		})
		animation.start()
		return () => animation.stop()
	}, [progress, from, index, started])
	return (
		<Animated.View
			style={{
				transform: [
					{
						translateX: progress.interpolate({
							inputRange: [0, 1],
							outputRange: [((from % columns) - (index % columns)) * width, 0],
						}),
					},
					{
						translateY: progress.interpolate({
							inputRange: [0, 1],
							outputRange: [
								(Math.floor(from / columns) - Math.floor(index / columns)) *
									height,
								0,
							],
						}),
					},
					{
						scale: progress.interpolate({
							inputRange: [0, 0.4, 1],
							outputRange: [1, 0.94, 1],
						}),
					},
					{
						rotate: progress.interpolate({
							inputRange: [0, 0.4, 1],
							outputRange: ['0deg', index % 2 ? '1.5deg' : '-1.5deg', '0deg'],
						}),
					},
				],
			}}
		>
			{children}
		</Animated.View>
	)
}
