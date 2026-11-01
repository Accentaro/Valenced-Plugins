import { Tokens } from '@valenced/discord/common/tokens'
import { Design } from '@valenced/discord/design'
import { Stores } from '@valenced/discord/flux'
import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	Animated,
	Image,
	Modal,
	PanResponder,
	Pressable,
	useWindowDimensions,
	View,
} from 'react-native'
import { lazyStyles } from './discord'
import { channelLabel, getChannels, stores } from './feed'
import { sendTarget, setTarget } from './virtual'
import type { ComponentType } from 'react'
import type { Channel } from './discord'

interface SendButtonProps {
	onSendMessage(): void
	canSendVoiceMessage?: boolean
	feedsPageInner?: boolean
}

const ITEM = 52
const VISIBLE = 5
const HOLD = 350
// Finger travel per row while still holding the send button; the same as the row height.
const DRAG = ITEM

const useStyles = lazyStyles(colors => ({
	wheel: {
		position: 'absolute',
		width: 280,
		height: ITEM * VISIBLE,
		borderRadius: 20,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: colors.BORDER_SUBTLE,
		elevation: 12,
	},
	selection: {
		position: 'absolute',
		left: 8,
		right: 8,
		top: ITEM * Math.floor(VISIBLE / 2),
		height: ITEM,
		borderRadius: 14,
		backgroundColor: colors.BACKGROUND_MOD_NORMAL,
	},
	item: {
		position: 'absolute',
		left: 0,
		right: 0,
		height: ITEM,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		gap: 10,
	},
	icon: {
		width: 30,
		height: 30,
		borderRadius: 15,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.BACKGROUND_MOD_STRONG,
	},
	text: { flex: 1 },
}))

interface Haptics {
	HapticFeedbackTypes: { IMPACT_LIGHT: number }
	triggerHapticFeedback(type: number): void
}

interface GuildUtils {
	getGuildIconURL(guild: {
		id: string
		icon?: string | null
		size: number
	}): string | null
	getGuildAcronym(guild: { name: string }): string
}

/**
 * Image themes make Discord's surfaces see-through so their wallpaper shows. The wheel floats over
 * messages, so it resolves its colours without the theme gradient to stay solid.
 */
function solid(name: 'BACKGROUND_SURFACE_HIGHEST' | 'BACKGROUND_SCRIM') {
	const tokens = Tokens.default as unknown as {
		colors: Record<string, object>
		internal: { resolveSemanticColor(theme: string, color: object): string }
	}
	const theme = (Stores.ThemeStore as unknown as { theme: string }).theme
	return tokens.internal.resolveSemanticColor(theme, tokens.colors[name])
}

function tick() {
	const [haptics] = lookupModule(
		withProps<Haptics>('triggerHapticFeedback', 'HapticFeedbackTypes'),
		{ initialize: false },
	)
	// Discord's trigger respects its enabled state and Android's system setting.
	haptics?.triggerHapticFeedback(haptics.HapticFeedbackTypes.IMPACT_LIGHT)
}

let utils: GuildUtils | undefined
const guildUtils = () =>
	(utils ??= lookupModule(
		withProps<GuildUtils>('getGuildIconURL', 'getGuildAcronym'),
	)[0])

function ChannelIcon({ channel }: { channel: Channel }) {
	const styles = useStyles()
	const guild = channel.guild_id
		? (stores.guilds.getGuild(channel.guild_id) as
				| { id: string; name: string; icon?: string | null }
				| undefined)
		: undefined
	const utils = guildUtils()
	const uri = guild
		? utils?.getGuildIconURL({ ...guild, size: 64 })
		: (
				stores.users.getUser(channel.recipients?.[0] ?? '') as
					| { getAvatarURL?(guild: undefined, size: number): string }
					| undefined
			)?.getAvatarURL?.(undefined, 64)
	if (uri) return <Image source={{ uri }} style={styles.icon} />
	return (
		<View style={styles.icon}>
			<Design.Text variant="text-xs/bold">
				{guild ? (utils?.getGuildAcronym(guild) ?? '') : '@'}
			</Design.Text>
		</View>
	)
}

function Wheel({
	channels,
	position,
	appear,
	anchor,
	onPick,
	onClose,
}: {
	channels: Channel[]
	position: Animated.Value
	appear: Animated.Value
	anchor: { right: number; bottom: number }
	onPick(channel: Channel): void
	onClose(): void
}) {
	const styles = useStyles()
	const center = ITEM * Math.floor(VISIBLE / 2)
	const colors = useMemo(
		() => ({
			surface: solid('BACKGROUND_SURFACE_HIGHEST'),
			scrim: solid('BACKGROUND_SCRIM'),
		}),
		[],
	)
	const latest = useRef({ channels, onPick })
	latest.current = { channels, onPick }
	const wheel = useRef<View>(null)
	const top = useRef(0)

	const responder = useMemo(() => {
		const last = () => latest.current.channels.length - 1
		const clamp = (value: number) => Math.min(last(), Math.max(0, value))
		let start = 0
		return PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponder: () => true,
			onPanResponderGrant: () => {
				position.stopAnimation(value => {
					start = value
				})
			},
			// Dragging up brings later channels to the centre.
			onPanResponderMove: (_, gesture) =>
				position.setValue(clamp(start - gesture.dy / ITEM)),
			onPanResponderRelease: (_, gesture) => {
				position.stopAnimation(value => {
					if (Math.abs(gesture.dy) < 8 && Math.abs(gesture.dx) < 8) {
						// A tap picks the row under the finger, from window coordinates.
						const row = Math.round(
							value + (gesture.y0 - top.current - center - ITEM / 2) / ITEM,
						)
						const channel = latest.current.channels[row]
						if (channel) latest.current.onPick(channel)
						return
					}
					// A slow release settles on the nearest row; only a real flick carries on, and
					// never more than a few rows, so the wheel lands where the finger left it.
					const fling =
						Math.abs(gesture.vy) > 0.8
							? Math.max(-3, Math.min(3, -gesture.vy * 2))
							: 0
					Animated.spring(position, {
						toValue: Math.round(clamp(value + fling)),
						friction: 10,
						tension: 70,
						overshootClamping: true,
						useNativeDriver: false,
					}).start()
				})
			},
		})
	}, [center, position])

	return (
		<>
			<Pressable
				accessibilityLabel="Close channel picker"
				onPress={onClose}
				style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
			>
				<Animated.View
					style={{ flex: 1, backgroundColor: colors.scrim, opacity: appear }}
				/>
			</Pressable>
			<Animated.View
				ref={wheel}
				onLayout={() =>
					wheel.current?.measureInWindow((_, y) => {
						top.current = y
					})
				}
				{...responder.panHandlers}
				accessibilityLabel="Channel to send to"
				style={[
					styles.wheel,
					anchor,
					{
						backgroundColor: colors.surface,
						opacity: appear,
						transform: [
							{
								translateY: appear.interpolate({
									inputRange: [0, 1],
									outputRange: [16, 0],
								}),
							},
							{
								scale: appear.interpolate({
									inputRange: [0, 1],
									outputRange: [0.92, 1],
								}),
							},
						],
					},
				]}
			>
				<View pointerEvents="none" style={styles.selection} />
				{channels.map((channel, i) => {
					// Distance from the centre slot, in rows.
					const distance = Animated.subtract(i, position)
					const { name, place } = channelLabel(channel)
					return (
						<Animated.View
							key={channel.id}
							pointerEvents="none"
							style={[
								styles.item,
								{
									top: center,
									opacity: distance.interpolate({
										inputRange: [-3, -2, 0, 2, 3],
										outputRange: [0, 0.35, 1, 0.35, 0],
										extrapolate: 'clamp',
									}),
									transform: [
										{ translateY: Animated.multiply(distance, ITEM) },
										{
											scale: distance.interpolate({
												inputRange: [-2, 0, 2],
												outputRange: [0.86, 1, 0.86],
												extrapolate: 'clamp',
											}),
										},
									],
								},
							]}
						>
							<ChannelIcon channel={channel} />
							<View style={styles.text}>
								<Design.Text variant="text-md/semibold" lineClamp={1}>
									{name}
								</Design.Text>
								{place && (
									<Design.Text
										variant="text-xs/medium"
										color="text-muted"
										lineClamp={1}
									>
										{place}
									</Design.Text>
								)}
							</View>
						</Animated.View>
					)
				})}
			</Animated.View>
		</>
	)
}

/**
 * The feed's send button. A tap sends as usual; holding it opens a wheel of the feed channels.
 * The wheel stays open to be flicked through, and tapping a row picks where new messages go.
 */
export function makeSendButton(Original: ComponentType<SendButtonProps>) {
	return function FeedSendButton(props: SendButtonProps) {
		const [open, setOpen] = useState(false)
		const [channels, setChannels] = useState<Channel[]>([])
		const position = useRef(new Animated.Value(0)).current
		const appear = useRef(new Animated.Value(0)).current
		const state = useRef({
			timer: undefined as ReturnType<typeof setTimeout> | undefined,
			open: false,
			start: 0,
			count: 0,
		}).current
		const latest = useRef(props)
		latest.current = props
		const button = useRef<View>(null)
		const window = useWindowDimensions()
		const [anchor, setAnchor] = useState({ right: 12, bottom: 120 })

		// A tick each time a new channel reaches the centre.
		useEffect(() => {
			let index = -1
			const id = position.addListener(({ value }) => {
				const next = Math.round(value)
				if (index !== -1 && next !== index) tick()
				index = next
			})
			return () => position.removeListener(id)
		}, [position])

		const close = useCallback(() => {
			state.open = false
			Animated.timing(appear, {
				toValue: 0,
				duration: 140,
				useNativeDriver: true,
			}).start(() => setOpen(false))
		}, [appear, state])

		const pick = useCallback(
			(channel: Channel) => {
				setTarget(channel.id)
				close()
			},
			[close],
		)

		const responder = useMemo(() => {
			const show = () => {
				const list = getChannels().flatMap(id => {
					const channel = stores.channels.getChannel(id)
					return channel ? [channel] : []
				})
				if (list.length < 2) return
				const index = Math.max(
					0,
					list.findIndex(channel => channel.id === sendTarget()),
				)
				state.open = true
				state.start = index
				state.count = list.length
				position.setValue(index)
				// Above the button, measured in window coordinates for the overlay.
				button.current?.measureInWindow((x, y, width) =>
					setAnchor({
						right: Math.max(8, window.width - x - width),
						bottom: window.height - y + 12,
					}),
				)
				setChannels(list)
				setOpen(true)
				tick()
				Animated.spring(appear, {
					toValue: 1,
					friction: 7,
					tension: 120,
					useNativeDriver: true,
				}).start()
			}
			return PanResponder.create({
				// The button's own press never runs, so a hold can't also send.
				onStartShouldSetPanResponderCapture: () => true,
				// Android doesn't end a touch that opened an overlay window, so always let the wheel
				// take over; otherwise this button would keep every later touch.
				onPanResponderTerminationRequest: () => true,
				onPanResponderGrant: () => {
					state.timer = setTimeout(show, HOLD)
				},
				onPanResponderMove: (_, gesture) => {
					if (!state.open) {
						if (Math.abs(gesture.dy) > 10 || Math.abs(gesture.dx) > 10)
							clearTimeout(state.timer)
						return
					}
					// The hold can carry straight into scrolling; the wheel stays open after.
					position.setValue(
						Math.min(
							state.count - 1,
							Math.max(0, state.start - gesture.dy / DRAG),
						),
					)
				},
				onPanResponderRelease: (_, gesture) => {
					clearTimeout(state.timer)
					if (state.open) {
						position.stopAnimation(value =>
							Animated.spring(position, {
								toValue: Math.round(value),
								friction: 10,
								overshootClamping: true,
								useNativeDriver: false,
							}).start(),
						)
						return
					}
					if (Math.abs(gesture.dy) < 10 && Math.abs(gesture.dx) < 10)
						latest.current.onSendMessage()
				},
				onPanResponderTerminate: () => clearTimeout(state.timer),
			})
		}, [appear, position, state, window])

		return (
			<>
				{/* A separate window, so the chat input's clipping can't cut the wheel off. It sits
			    outside the button because touches follow the React tree, and the button captures them. */}
				<Modal
					transparent
					visible={open}
					animationType="none"
					statusBarTranslucent
					onRequestClose={close}
				>
					<Wheel
						channels={channels}
						position={position}
						appear={appear}
						anchor={anchor}
						onPick={pick}
						onClose={close}
					/>
				</Modal>
				<View ref={button} collapsable={false} {...responder.panHandlers}>
					<View pointerEvents="none">
						{/* Marked so the plugin's JSX hook renders Discord's button instead of this one again. */}
						<Original {...props} canSendVoiceMessage={false} feedsPageInner />
					</View>
				</View>
			</>
		)
	}
}
