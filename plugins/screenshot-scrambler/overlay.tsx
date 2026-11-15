import { getAssetIdByName } from '@valenced/assets'
import {
	AlertActionCreators,
	ToastActionCreators,
} from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
	Animated,
	Image,
	PanResponder,
	ScrollView,
	StyleSheet,
	useWindowDimensions,
	View,
} from 'react-native'
import {
	getVersion,
	isActive,
	rescramble,
	setScrambled,
	subscribeScramble,
	Unscrambled,
} from './scramble'
import { CATEGORIES, settings, updateSettings, useSettings } from './storage'

const ALERT_KEY = 'dev.benjii.screenshot-scrambler.options'
const BUTTON_SIZE = 52

// The floating button hides while the options alert is open.
let optionsOpen = false
const optionsListeners = new Set<() => void>()
function setOptionsOpen(value: boolean) {
	optionsOpen = value
	for (const listener of optionsListeners) listener()
}
function subscribeOptions(listener: () => void) {
	optionsListeners.add(listener)
	return () => {
		optionsListeners.delete(listener)
	}
}

export function startScramble() {
	setScrambled(true)
	ToastActionCreators.open('SCREENSHOT_SCRAMBLER', {
		text: 'Tap a message to reveal it. Tap the button again to restore.',
	})
}

export function stopScramble() {
	setScrambled(false)
}

function toggleScramble() {
	if (isActive()) stopScramble()
	else startScramble()
}

export function closeOptions() {
	AlertActionCreators.dismissAlert(ALERT_KEY)
}

export function ScrambleOptions() {
	const current = useSettings()
	return (
		<Design.TableRowGroup title="Scramble">
			{CATEGORIES.map(category => (
				<Design.TableSwitchRow
					key={category.key}
					label={category.label}
					subLabel={category.subLabel}
					value={current.categories[category.key]}
					onValueChange={(value: boolean) => {
						updateSettings({
							categories: { ...current.categories, [category.key]: value },
						})
						rescramble()
					}}
				/>
			))}
		</Design.TableRowGroup>
	)
}

function OptionsAlert() {
	const { height } = useWindowDimensions()
	useEffect(() => {
		setOptionsOpen(true)
		return () => setOptionsOpen(false)
	}, [])
	return (
		<Unscrambled.Provider value={true}>
			<Design.AlertModal
				title="Screenshot Scrambler"
				content="Pick what to scramble. Tap the button to scramble, long press it to come back here."
				extraContent={
					<ScrollView style={{ maxHeight: Math.max(200, height - 420) }}>
						<ScrambleOptions />
					</ScrollView>
				}
				actions={
					<Design.AlertActionButton
						text="Done"
						variant="primary"
						onPress={closeOptions}
					/>
				}
			/>
		</Unscrambled.Provider>
	)
}

function openOptions() {
	AlertActionCreators.openAlert(ALERT_KEY, <OptionsAlert />)
}

function FloatingButton({ active }: { active: boolean }) {
	const { width, height } = useWindowDimensions()
	const clamp = (x: number, y: number) => ({
		x: Math.min(Math.max(x, 8), width - BUTTON_SIZE - 8),
		y: Math.min(Math.max(y, 48), height - BUTTON_SIZE - 48),
	})
	const [initial] = useState(() =>
		clamp(
			settings.buttonX < 0 ? width - BUTTON_SIZE - 12 : settings.buttonX,
			settings.buttonY < 0 ? height * 0.6 : settings.buttonY,
		),
	)
	const position = useRef(new Animated.ValueXY(initial)).current
	const origin = useRef(initial)
	const clampRef = useRef(clamp)
	clampRef.current = clamp

	useEffect(() => {
		origin.current = clamp(origin.current.x, origin.current.y)
		position.setValue(origin.current)
	}, [width, height])

	// Tap toggles the scramble, long press opens the options, drag moves the button.
	const longPress = useRef<{
		timer?: ReturnType<typeof setTimeout>
		fired: boolean
	}>({ fired: false })
	const cancelLongPress = () => clearTimeout(longPress.current.timer)

	const responder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onPanResponderGrant: () => {
				longPress.current.fired = false
				longPress.current.timer = setTimeout(() => {
					longPress.current.fired = true
					openOptions()
				}, 500)
			},
			onPanResponderMove: (_, gesture) => {
				if (Math.abs(gesture.dx) + Math.abs(gesture.dy) >= 6) cancelLongPress()
				position.setValue({
					x: origin.current.x + gesture.dx,
					y: origin.current.y + gesture.dy,
				})
			},
			onPanResponderRelease: (_, gesture) => {
				cancelLongPress()
				if (Math.abs(gesture.dx) + Math.abs(gesture.dy) < 6) {
					position.setValue(origin.current)
					if (!longPress.current.fired) toggleScramble()
					return
				}
				origin.current = clampRef.current(
					origin.current.x + gesture.dx,
					origin.current.y + gesture.dy,
				)
				Animated.spring(position, {
					toValue: origin.current,
					useNativeDriver: false,
				}).start()
				updateSettings({ buttonX: origin.current.x, buttonY: origin.current.y })
			},
			onPanResponderTerminate: () => {
				cancelLongPress()
				position.setValue(origin.current)
			},
		}),
	).current
	useEffect(() => cancelLongPress, [])

	return (
		<Animated.View
			{...responder.panHandlers}
			style={[
				styles.button,
				active && styles.active,
				{ transform: position.getTranslateTransform() },
			]}
		>
			<Image source={getAssetIdByName('EyeSlashIcon')} style={styles.icon} />
		</Animated.View>
	)
}

export function Overlay() {
	const current = useSettings()
	useSyncExternalStore(subscribeScramble, getVersion)
	const open = useSyncExternalStore(subscribeOptions, () => optionsOpen)
	const active = isActive()

	if (open || !current.showButton) return null
	return (
		<View style={StyleSheet.absoluteFill} pointerEvents="box-none">
			<FloatingButton
				key={current.buttonX < 0 ? 'default' : 'placed'}
				active={active}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	button: {
		position: 'absolute',
		left: 0,
		top: 0,
		width: BUTTON_SIZE,
		height: BUTTON_SIZE,
		borderRadius: BUTTON_SIZE / 2,
		backgroundColor: 'rgba(30, 31, 34, 0.85)',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(255, 255, 255, 0.25)',
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 6,
	},
	active: { backgroundColor: 'rgba(88, 101, 242, 0.95)' },
	icon: { width: 24, height: 24, tintColor: '#ffffff' },
})
