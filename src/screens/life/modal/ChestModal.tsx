import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import { useDispatch } from 'react-redux';
import { usePathname } from 'expo-router';
import AppModal from '@/src/screens/common/atomic/AppModal';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Confetti from '@/src/four/components/Confetti';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useLife } from '@/src/hooks/useLife';
import { useAnimationRunner } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { openChest } from '@/src/store/slice/LifeSlice';
import { playComplete, playPop } from '@/src/utils/SoundUtils';
import { MODAL_MAX_WIDTH, scaleHeight, scaleWidth } from '@/src/utils';

const CLOSED_CHEST = require('@/src/assets/illustrations/game-chest-closed.webp');
const OPEN_CHEST = require('@/src/assets/illustrations/game-chest-open.webp');

/**
 * 보물상자 — 안 연 상자가 있으면 탭 화면으로 돌아왔을 때 떠오른다 (루트 레이아웃에 한 번만 올린다).
 * 흔들리는 상자를 누르면 뚜껑이 열리고 코인이 튀어 나온다. 코인은 여는 순간 붙는다.
 * 상자가 여러 개면 하나 열고 닫힐 때 다음 상자가 이어서 뜬다.
 */
const ChestModal = () => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const dispatch = useDispatch();
	const { pendingChests, pendingLevelUp } = useLife();
	const run = useAnimationRunner();
	const pathname = usePathname();
	const amount = pendingChests?.[0];
	// 퀴즈 완료 모달·뱃지 모달 위에 겹치지 않게, 탭 화면(홈 등)으로 돌아왔을 때만 뜬다
	// 레벨업 팝업이 먼저다 — 둘이 겹치면 상자가 뒤로 밀린다
	// 상점에서 열쇠를 사면 홈까지 돌아가지 않아도 그 자리에서 상자가 뜬다
	const visible = amount !== undefined && !pendingLevelUp && (pathname.startsWith('/main') || pathname.startsWith('/shop'));

	const [opened, setOpened] = useState(false);
	const shake = useRef(new Animated.Value(0)).current;
	const pop = useRef(new Animated.Value(0)).current;
	const coin = useRef(new Animated.Value(0)).current;
	const glow = useRef(new Animated.Value(0)).current;

	// 상자 뒤 빛무리가 천천히 커졌다 작아진다 — 보상 연출의 "반짝임"
	useEffect(() => {
		if (!visible) {
			return;
		}
		glow.setValue(0);
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(glow, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
				Animated.timing(glow, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
			]),
		);
		loop.start();
		return () => loop.stop();
	}, [glow, visible]);

	// 열기 전에는 상자가 좌우로 계속 흔들린다 — "눌러 보라"는 신호
	useEffect(() => {
		if (!visible || opened) {
			return;
		}
		shake.setValue(0);
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(shake, { toValue: 1, duration: 90, easing: Easing.linear, useNativeDriver: true }),
				Animated.timing(shake, { toValue: -1, duration: 90, easing: Easing.linear, useNativeDriver: true }),
				Animated.timing(shake, { toValue: 1, duration: 90, easing: Easing.linear, useNativeDriver: true }),
				Animated.timing(shake, { toValue: 0, duration: 90, easing: Easing.linear, useNativeDriver: true }),
				Animated.delay(900),
			]),
		);
		loop.start();
		return () => loop.stop();
	}, [opened, shake, visible]);

	// 카드가 살짝 커지며 떠오른다
	useEffect(() => {
		if (!visible) {
			return;
		}
		pop.setValue(0);
		const anim = Animated.spring(pop, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true });
		anim.start();
		return () => anim.stop();
	}, [pop, visible]);

	const onOpen = useCallback(() => {
		if (opened) {
			return;
		}
		setOpened(true);
		playComplete();
		coin.setValue(0);
		run(Animated.spring(coin, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }));
	}, [coin, opened, run]);

	const onClose = useCallback(() => {
		playPop();
		dispatch(openChest());
		// 다음 상자는 다시 닫힌 채로 시작한다
		setOpened(false);
	}, [dispatch]);

	if (!visible) {
		return null;
	}

	const shakeStyle = {
		transform: [
			{ rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] }) },
			{ translateY: shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-scaleHeight(3), 0, -scaleHeight(3)] }) },
		],
	};
	const coinStyle = {
		opacity: coin,
		transform: [
			{ translateY: coin.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(24), 0] }) },
			{ scale: coin.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.4, 1.15, 1] }) },
		],
	};

	return (
		<AppModal visible={visible} onClose={opened ? onClose : onOpen}>
			{opened && (
				<Confetti
					count={80}
					origin={{ x: Dimensions.get('window').width / 2, y: 0 }}
					fadeOut
					explosionSpeed={400}
					fallSpeed={2600}
					colors={[Colors.accentAmber, Colors.primary, Colors.secondary, Colors.error]}
				/>
			)}
			<Animated.View style={[styles.card, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
				<Text style={styles.title}>{opened ? '상자가 열렸어요!' : '보물상자가 나왔어요!'}</Text>
				<Text style={styles.subtitle}>{opened ? '코인은 한자 상회에서 쓸 수 있어요' : '상자를 눌러 열어 보세요'}</Text>

				<PressableScale style={styles.stage} onPress={onOpen} disabled={opened} scaleTo={0.94} accessibilityRole="button" accessibilityLabel="보물상자 열기">
					<Animated.View
						pointerEvents="none"
						style={[
							styles.glow,
							{
								opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.8] }),
								transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] }) }],
							},
						]}
					/>
					{opened ? (
						<Animated.View style={[styles.rewardReveal, coinStyle]}>
							<Image source={OPEN_CHEST} style={styles.openChest} contentFit="contain" accessible={false} />
							<Animated.View style={styles.coinBox}>
								<IconComponent type="materialCommunityIcons" name="circle-multiple" size={24} color={Colors.accentAmber} />
								<Text style={styles.coinText}>{`+${amount}`}</Text>
								<Text style={styles.coinUnit}>코인</Text>
							</Animated.View>
						</Animated.View>
					) : (
						<Animated.View style={shakeStyle}>
							<Image source={CLOSED_CHEST} style={styles.closedChest} contentFit="contain" accessible={false} />
						</Animated.View>
					)}
				</PressableScale>

				<PressableScale style={[styles.button, !opened && styles.buttonGhost]} onPress={opened ? onClose : onOpen} accessibilityRole="button">
					<Text style={[styles.buttonText, !opened && styles.buttonTextGhost]}>{opened ? '받기' : '열기'}</Text>
				</PressableScale>
			</Animated.View>
		</AppModal>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		card: {
			width: '100%',
			maxWidth: Math.min(scaleWidth(320), MODAL_MAX_WIDTH),
			alignSelf: 'center',
			alignItems: 'center',
			gap: SpacingV.sm,
			paddingHorizontal: Spacing.xl,
			paddingVertical: SpacingV.xxl,
			borderRadius: Radius.xl,
			backgroundColor: Colors.surface,
			...Shadow.floating,
		},
		title: { fontSize: Typography.h3, fontWeight: FontWeight.heavy, color: Colors.textStrong, textAlign: 'center' },
		subtitle: { fontSize: Typography.bodySm, color: Colors.textSecondary, textAlign: 'center' },
		stage: {
			width: scaleWidth(190),
			height: scaleWidth(178),
			marginVertical: SpacingV.md,
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			overflow: 'hidden',
			backgroundColor: Colors.accentAmberSoft,
		},
		glow: { position: 'absolute', width: scaleWidth(148), height: scaleWidth(148), borderRadius: Radius.pill, backgroundColor: Colors.accentAmber },
		closedChest: { width: scaleWidth(148), height: scaleWidth(148) },
		rewardReveal: { alignItems: 'center', justifyContent: 'center' },
		openChest: { width: scaleWidth(164), height: scaleWidth(132) },
		coinBox: { flexDirection: 'row', alignItems: 'center', gap: scaleWidth(4), marginTop: -SpacingV.md },
		coinText: { fontSize: Typography.h3, fontWeight: FontWeight.heavy, color: Colors.textStrong },
		coinUnit: { fontSize: Typography.bodySm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
		button: {
			width: '100%',
			height: scaleHeight(48),
			marginTop: SpacingV.sm,
			borderRadius: Radius.lg,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.primarySurface,
		},
		buttonGhost: { backgroundColor: Colors.primarySoft },
		buttonText: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.textInverse },
		buttonTextGhost: { color: Colors.primaryDark },
	});

export default ChestModal;
