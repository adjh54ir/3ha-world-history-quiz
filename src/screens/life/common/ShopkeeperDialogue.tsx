import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import MascotImage from '@/src/screens/common/atomic/MascotImage';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import { SHOPKEEPER_IMAGES } from '@/src/const/data/life/ConstShopImages';
import { Palette } from '@/src/const/ConstColors';
import { FontWeight, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

export interface ShopkeeperMessage {
	id: number;
	text: string;
	icon: string;
	mood: ShopkeeperMood;
}

export type ShopkeeperMood = 'default' | 'offer' | 'success' | 'short' | 'info';

/** 사장이 대신 읽어 주는 상품 한 줄 — 구매 확인 팝업을 이 대화로 대신한다 */
export interface ShopkeeperOffer {
	label: string;
	description: string;
	/** 상품 그림 — 미리보기(preview)를 넘기면 없어도 된다 */
	image?: number;
	price: number;
	/** 보유 수 등 한 줄 — 없으면 그리지 않는다 */
	owned?: string;
	/**
	 * 그림 대신 세우는 "적용된 모습" — 꾸미기처럼 물건 사진만 봐서는 알 수 없는 상품에 쓴다.
	 * 넘기면 카드가 가로 줄에서 세로 한 장으로 바뀌어 미리보기가 위에 크게 선다.
	 */
	preview?: React.ReactNode;
}

/** 말이 한 글자씩 찍히는 속도 (ms) — 게임 대사창 느낌 */
const TYPE_SPEED = 18;
/** 그냥 건네는 말은 스스로 사라진다. 구매처럼 결정이 필요한 말은 사라지지 않는다 */
const AUTO_HIDE_MS = 2600;

/**
 * 뿔 사장 대화 무대
 * -------------------------------------------------
 * 진열대 위를 검은 막으로 덮고 그 앞에 사장을 세운다. 상점에서 벌어지는 모든 말
 * (안내 · 코인 부족 · 구매 확인 · 구매 완료)이 이 한 자리에서 나온다.
 *
 * - 구매 확인 팝업을 따로 두지 않는다. 사장이 값을 읽어 주고 그 자리에서 사고 만다.
 * - 결정이 필요 없는 말은 다 읽어 준 뒤 스스로 사라진다 (AUTO_HIDE_MS).
 * - 화면을 덮는 건 상점 본문뿐이다 — 위쪽 배너 광고는 가리지 않는다 (모달 대신 절대배치).
 */
const ShopkeeperDialogue = ({
	message,
	offer,
	coins,
	onConfirm,
	onWish,
	onClose,
}: {
	message: ShopkeeperMessage | null;
	offer?: ShopkeeperOffer | null;
	coins: number;
	onConfirm?: () => void;
	/** 코인이 모자랄 때 — 사장이 적어 뒀다가 값이 모이면 알려 준다. 없으면 그냥 닫는다 */
	onWish?: () => void;
	onClose: () => void;
}) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const focused = useIsFocused();
	const fade = useRef(new Animated.Value(0)).current;
	const rise = useRef(new Animated.Value(0)).current;
	const text = message?.text ?? '';
	const messageId = message?.id ?? 0;
	/** 지금까지 찍은 글자 수 — 말이 바뀌면 렌더 중에 0으로 되돌린다 (effect 로 되돌리면 이전 말이 한 프레임 남는다) */
	const [typing, setTyping] = useState({ id: messageId, count: 0 });
	if (typing.id !== messageId) {
		setTyping({ id: messageId, count: 0 });
	}
	const typed = text.slice(0, typing.id === messageId ? typing.count : 0);
	const done = typed.length >= text.length;

	/** 한 글자씩 찍기 — 다 찍으면 타이머를 끊는다 (돌게 두면 대화가 떠 있는 내내 헛돈다) */
	useEffect(() => {
		const timer = setInterval(() => {
			setTyping((previous) => {
				if (previous.count >= text.length) {
					clearInterval(timer);
					return previous;
				}
				return { ...previous, count: previous.count + 1 };
			});
		}, TYPE_SPEED);
		return () => clearInterval(timer);
	}, [messageId, text.length]);

	/** 막이 내리고 대사창이 아래에서 올라온다 */
	useEffect(() => {
		if (!message) {
			return;
		}
		fade.setValue(0);
		rise.setValue(0);
		const enter = Animated.parallel([
			Animated.timing(fade, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
			Animated.spring(rise, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }),
		]);
		enter.start();
		return () => enter.stop();
	}, [fade, message, messageId, rise]);

	/** 결정이 필요 없는 말은 다 읽은 뒤 스스로 물러난다 */
	useEffect(() => {
		if (!message || offer) {
			return;
		}
		const wait = AUTO_HIDE_MS + text.length * TYPE_SPEED;
		const timer = setTimeout(onClose, wait);
		return () => clearTimeout(timer);
	}, [message, messageId, offer, onClose, text.length]);

	/**
	 * 안드로이드 하드웨어 뒤로가기 — 대화가 떠 있으면 이 대화만 접는다.
	 * 걸어 두지 않으면 구매 확인 중에 뒤로가기를 눌러 상점이 통째로 닫혔다.
	 */
	useEffect(() => {
		if (!message) {
			return;
		}
		const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
			onClose();
			return true;
		});
		return () => subscription.remove();
	}, [message, onClose]);

	/** 아직 찍는 중이면 한 번 눌러 전부 보여 주고, 다 찍혔으면 닫는다 */
	const onBackdrop = useCallback(() => {
		if (!done) {
			setTyping({ id: messageId, count: text.length });
			return;
		}
		if (!offer) {
			onClose();
		}
	}, [done, messageId, offer, onClose, text.length]);

	if (!focused || !message) {
		return null;
	}

	const short = offer ? Math.max(0, offer.price - coins) : 0;
	const affordable = short === 0;
	const rest = offer ? Math.max(0, coins - offer.price) : 0;

	return (
		<View style={StyleSheet.absoluteFill} pointerEvents="box-none">
			<Animated.View style={[StyleSheet.absoluteFill, styles.shade, { opacity: fade }]}>
				<Pressable style={StyleSheet.absoluteFill} onPress={onBackdrop} accessible={false} />
			</Animated.View>

			<Animated.View
				style={[
					styles.stage,
					{ opacity: fade, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(40), 0] }) }] },
				]}
				pointerEvents="box-none">
				{/* 사장이 값을 읽어 주는 상품 — 구매 확인 팝업 자리를 그대로 대신한다 */}
				{!!offer && (
					<View style={[styles.offerCard, !!offer.preview && styles.offerCardStacked]}>
						{offer.preview ? (
							// 꾸미기처럼 "놓아 보면" 알 수 있는 상품 — 적용된 화면을 그대로 세운다
							<View style={styles.offerPreview}>{offer.preview}</View>
						) : (
							<View style={styles.offerStage}>
								<Image source={offer.image} style={styles.offerImage} contentFit="contain" accessible={false} />
							</View>
						)}
						<View style={styles.offerBody}>
							<Text style={styles.offerName} numberOfLines={1}>
								{offer.label}
							</Text>
							<Text style={styles.offerDesc} numberOfLines={2}>
								{offer.description}
							</Text>
							{!!offer.owned && (
								<Text style={styles.offerOwned} numberOfLines={1}>
									{offer.owned}
								</Text>
							)}
							<View style={styles.ledger}>
								<LedgerCell label="가격" value={offer.price} tone="spend" />
								<View style={styles.ledgerBar} />
								{affordable ? <LedgerCell label="구매 후" value={rest} /> : <LedgerCell label="부족" value={short} tone="short" />}
							</View>
						</View>
					</View>
				)}

				<View style={styles.speaker} pointerEvents="none">
					<MascotImage
						key={messageId}
						source={SHOPKEEPER_IMAGES[offer ? 'offer' : message.mood]}
						size={scaleWidth(116)}
						motion="float"
						popIn
						shadow={false}
						accessibilityLabel="코뿔소 상점 주인, 뿔 사장"
					/>
				</View>

				<View style={styles.box} accessibilityLiveRegion="polite" accessible accessibilityLabel={`뿔 사장: ${text}`}>
					<View style={styles.namePlate}>
						<IconComponent type="materialCommunityIcons" name={message.icon} size={13} color="#2A1A05" />
						<Text style={styles.name}>뿔 사장</Text>
					</View>
					<Text style={styles.line}>{typed}</Text>

					{offer ? (
						<View style={styles.buttonRow}>
							<PressableScale style={styles.cancel} onPress={onClose} scaleTo={0.96} accessibilityRole="button">
								<Text style={styles.cancelText}>둘러볼게요</Text>
							</PressableScale>
							{/*
							 * 코인이 모자라면 그냥 닫히던 자리를 "적어 두기" 로 바꾼다.
							 * 값이 모이는 순간 알려 주므로, 못 사고 나간 뒤 다시 들를 이유가 생긴다.
							 */}
							<PressableScale
								style={[styles.confirm, !affordable && styles.confirmWish]}
								onPress={affordable ? onConfirm : (onWish ?? onClose)}
								scaleTo={0.96}
								accessibilityRole="button"
								accessibilityLabel={affordable ? '구매하기' : '모이면 알려 달라고 적어 두기'}>
								<IconComponent
									type="materialCommunityIcons"
									name={affordable ? 'cart-check' : 'bookmark-plus-outline'}
									size={17}
									color={affordable ? '#2A1A05' : '#2A1A05'}
								/>
								<Text style={styles.confirmText}>{affordable ? '구매하기' : '모이면 알려줘'}</Text>
							</PressableScale>
						</View>
					) : (
						<View style={styles.tapHint}>
							<IconComponent type="materialCommunityIcons" name="gesture-tap" size={12} color={Colors.textMuted} />
							<Text style={styles.tapHintText}>아무 곳이나 누르면 닫혀요</Text>
						</View>
					)}
				</View>
			</Animated.View>
		</View>
	);
};

/** 가격 한 칸 — 값이 커도 자리가 흔들리지 않게 숫자는 고정폭으로 */
const LedgerCell = ({ label, value, tone }: { label: string; value: number; tone?: 'spend' | 'short' }) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const color = tone === 'short' ? Colors.error : tone === 'spend' ? Colors.accentAmber : Colors.textInverse;
	return (
		<View style={styles.ledgerCell}>
			<Text style={styles.ledgerLabel}>{label}</Text>
			<View style={styles.ledgerValue}>
				<IconComponent type="materialCommunityIcons" name="circle-multiple" size={13} color={color} />
				<Text style={[styles.ledgerValueText, { color }]}>{value.toLocaleString()}</Text>
			</View>
		</View>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		shade: { backgroundColor: 'rgba(4, 10, 24, 0.88)' },
		stage: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Spacing.lg, paddingBottom: scaleHeight(72) },

		offerCard: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			padding: Spacing.md,
			marginBottom: SpacingV.md,
			borderRadius: Radius.xl,
			borderWidth: 1,
			borderColor: 'rgba(245, 158, 11, 0.45)',
			backgroundColor: 'rgba(12, 22, 44, 0.96)',
		},
		// 미리보기를 얹는 상품은 가로 줄이 아니라 세로 한 장 — 그림이 커야 "적용된 모습"이 읽힌다
		offerCardStacked: { flexDirection: 'column', alignItems: 'stretch', gap: SpacingV.sm },
		offerPreview: { alignSelf: 'stretch', alignItems: 'center' },
		offerStage: {
			width: scaleWidth(78),
			height: scaleWidth(78),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.lg,
			backgroundColor: 'rgba(255, 255, 255, 0.08)',
		},
		offerImage: { width: scaleWidth(62), height: scaleWidth(62) },
		offerBody: { flex: 1, gap: SpacingV.xs },
		offerName: { fontSize: Typography.subtitle, fontWeight: FontWeight.heavy, color: '#FFFFFF' },
		offerDesc: { fontSize: Typography.caption, lineHeight: scaledSize(16), color: '#BFD2FA' },
		offerOwned: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.accentAmber },
		ledger: { flexDirection: 'row', alignItems: 'center', marginTop: SpacingV.xs },
		ledgerCell: { flex: 1, gap: scaleHeight(2) },
		ledgerBar: { width: 1, height: scaleHeight(22), marginHorizontal: Spacing.sm, backgroundColor: 'rgba(255, 255, 255, 0.18)' },
		ledgerLabel: { fontSize: Typography.caption, color: '#8FA6CE' },
		ledgerValue: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
		ledgerValueText: { fontSize: Typography.callout, fontWeight: FontWeight.heavy, fontVariant: ['tabular-nums'] },

		// 사장은 대사창 위에 걸쳐 선다 — 말풍선 안에 가두면 무대가 아니라 목록처럼 보인다
		speaker: { alignItems: 'flex-start', marginLeft: Spacing.sm, marginBottom: scaleHeight(-14) },

		box: {
			borderRadius: Radius.xl,
			borderWidth: scaleWidth(2),
			borderColor: Colors.accentAmber,
			backgroundColor: 'rgba(12, 22, 44, 0.98)',
			paddingHorizontal: Spacing.lg,
			paddingTop: SpacingV.lg,
			paddingBottom: Spacing.lg,
			gap: SpacingV.md,
		},
		namePlate: {
			position: 'absolute',
			top: scaleHeight(-13),
			left: Spacing.lg,
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.xs,
			height: scaleHeight(26),
			paddingHorizontal: Spacing.md,
			borderRadius: Radius.pill,
			backgroundColor: Colors.accentAmber,
		},
		name: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: '#2A1A05' },
		line: { minHeight: scaleHeight(44), fontSize: Typography.callout, lineHeight: scaledSize(22), color: '#F1F5F9' },

		tapHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.xxs },
		tapHintText: { fontSize: Typography.caption, color: Colors.textMuted },

		buttonRow: { flexDirection: 'row', gap: Spacing.sm },
		cancel: {
			flex: 1,
			height: scaleHeight(46),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.pill,
			borderWidth: 1,
			borderColor: 'rgba(255, 255, 255, 0.22)',
		},
		cancelText: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: '#BFD2FA' },
		confirm: {
			flex: 1.4,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: Spacing.xs,
			height: scaleHeight(46),
			borderRadius: Radius.pill,
			backgroundColor: Colors.accentAmber,
		},
		// 코인이 모자랄 때 — 눌리지 않는 버튼처럼 꺼뜨리지 않는다. 할 수 있는 일(적어 두기)이 있기 때문이다
		confirmWish: { backgroundColor: Colors.accentAmberSoft },
		confirmText: { fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: '#2A1A05' },
	});

export default ShopkeeperDialogue;
