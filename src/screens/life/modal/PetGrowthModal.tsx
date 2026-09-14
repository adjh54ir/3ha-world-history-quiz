import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useDispatch } from 'react-redux';
import AppModal from '@/src/screens/common/atomic/AppModal';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Confetti from '@/src/four/components/Confetti';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useLife } from '@/src/hooks/useLife';
import { FontWeight, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { ATTENDANCE_PET_STAGES } from '@/src/const/data/life/ConstLifeRewards';
import { ATTENDANCE_PET_IMAGES } from '@/src/const/data/life/ConstPetImages';
import { clearPetGrowth } from '@/src/store/slice/LifeSlice';
import { playComplete, playPop } from '@/src/utils/SoundUtils';
import { scaleHeight, scaleWidth } from '@/src/utils';

/** 뒤에서 도는 빛줄기 개수 — 홀수라야 회전이 대칭으로 겹쳐 보이지 않는다 */
const RAY_COUNT = 9;

const HANGUL_BASE = 0xac00;

/** 받침이 있으면 '을', 없으면 '를' */
const objectParticle = (text: string): string => {
	const code = text.charCodeAt(text.length - 1) - HANGUL_BASE;
	return code >= 0 && code < 11172 && code % 28 !== 0 ? '을' : '를';
};

/**
 * 수호신 성장 — 먹이를 줘서 단계가 오르면 화면 전체가 까매지고 새 모습이 떠오른다.
 * -------------------------------------------------
 * 루트 레이아웃에 한 번만 올린다. 먹이는 어느 화면에서 줘도 되므로 경로를 가리지 않는다.
 * 검은 배경 위에 빛줄기·후광·컨페티만 남겨, 이 순간에는 수호신 말고 볼 것이 없게 만든다.
 */
const PetGrowthModal = () => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const dispatch = useDispatch();
	const { pendingPetGrowth } = useLife();
	const level = pendingPetGrowth ?? null;
	const stage = level !== null ? ATTENDANCE_PET_STAGES[level] : null;
	const image = level !== null ? ATTENDANCE_PET_IMAGES[level] : null;
	const visible = level !== null && !!stage && !!image;

	/** 등장(작게 → 제 크기) · 빛줄기 회전 · 후광 호흡 */
	const pop = useRef(new Animated.Value(0)).current;
	const spin = useRef(new Animated.Value(0)).current;
	const glow = useRef(new Animated.Value(0)).current;
	const copy = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!visible) {
			return;
		}
		playComplete();
		pop.setValue(0);
		copy.setValue(0);
		spin.setValue(0);
		glow.setValue(0);
		// 수호신이 먼저 떠오르고, 글자는 한 박자 늦게 따라 올라온다
		const enter = Animated.sequence([
			Animated.spring(pop, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
			Animated.timing(copy, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
		]);
		const rays = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true }));
		const breathe = Animated.loop(
			Animated.sequence([
				Animated.timing(glow, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
				Animated.timing(glow, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
			]),
		);
		enter.start();
		rays.start();
		breathe.start();
		return () => {
			enter.stop();
			rays.stop();
			breathe.stop();
		};
	}, [copy, glow, pop, spin, visible]);

	const onClose = useCallback(() => {
		playPop();
		dispatch(clearPetGrowth());
	}, [dispatch]);

	if (!visible || !stage || !image) {
		return null;
	}

	const copyStyle = {
		opacity: copy,
		transform: [{ translateY: copy.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(14), 0] }) }],
	};

	return (
		<AppModal visible onClose={onClose} backdropStyle={styles.blackout}>
			<Confetti
				count={110}
				origin={{ x: Dimensions.get('window').width / 2, y: 0 }}
				fadeOut
				explosionSpeed={420}
				fallSpeed={2800}
				colors={[Colors.accentAmber, Colors.primary, Colors.secondary, Colors.success]}
			/>

			<View style={styles.body} pointerEvents="box-none">
				<Animated.View style={[styles.eyebrow, copyStyle]}>
					<IconComponent type="materialCommunityIcons" name="shimmer" size={13} color={Colors.accentAmber} />
					<Text style={styles.eyebrowText}>PET EVOLUTION</Text>
				</Animated.View>

				<View style={styles.stage}>
					{/* 빛줄기 — 긴 막대 하나를 각도만 바꿔 겹치고, 회전은 부모가 한 번에 한다 */}
					<Animated.View
						pointerEvents="none"
						style={[styles.rays, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
						{Array.from({ length: RAY_COUNT }).map((_, at) => (
							<View key={at} style={[styles.ray, { transform: [{ rotate: `${(180 / RAY_COUNT) * at}deg` }] }]} />
						))}
					</Animated.View>

					{/* 후광 — 숨 쉬듯 커졌다 작아진다 */}
					<Animated.View
						pointerEvents="none"
						style={[
							styles.halo,
							{
								opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.5] }),
								transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.14] }) }],
							},
						]}
					/>

					<Animated.View
						style={{
							opacity: pop,
							transform: [
								{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) },
								{ translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(28), 0] }) },
							],
						}}>
						<Image source={image} style={styles.pet} contentFit="contain" accessible={false} />
					</Animated.View>
				</View>

				<Animated.View style={[styles.copyBox, copyStyle]}>
					<View style={styles.stageChip}>
						<Text style={styles.stageChipText}>{`${level + 1}단계 / ${ATTENDANCE_PET_STAGES.length}단계`}</Text>
					</View>
					<Text style={styles.name}>{stage.label}</Text>
					<Text style={styles.gotIt}>{`${stage.label}${objectParticle(stage.label)} 획득했습니다!`}</Text>
					<Text style={styles.hint}>
						{level === ATTENDANCE_PET_STAGES.length - 1 ? '최종 진화를 완료했어요!' : '먹이를 더 주면 다음 모습으로 자라요'}
					</Text>
				</Animated.View>

				<PressableScale style={styles.button} onPress={onClose} scaleTo={0.96} accessibilityRole="button">
					<Text style={styles.buttonText}>확인</Text>
				</PressableScale>
			</View>
		</AppModal>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		// 성장 순간에는 화면을 통째로 검게 덮는다 — 뒤 화면이 비치면 축하가 묻힌다
		blackout: { backgroundColor: '#000000', paddingHorizontal: Spacing.xl },
		body: { width: '100%', alignItems: 'center', gap: SpacingV.md },

		eyebrow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
		eyebrowText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: Colors.accentAmber, letterSpacing: scaleWidth(2) },

		stage: { width: scaleWidth(260), height: scaleWidth(260), alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
		rays: { position: 'absolute', width: scaleWidth(260), height: scaleWidth(260), alignItems: 'center', justifyContent: 'center' },
		ray: { position: 'absolute', width: scaleWidth(520), height: scaleHeight(14), backgroundColor: 'rgba(255,255,255,0.07)' },
		halo: { position: 'absolute', width: scaleWidth(210), height: scaleWidth(210), borderRadius: scaleWidth(105), backgroundColor: Colors.accentAmber },
		pet: { width: scaleWidth(190), height: scaleWidth(190) },

		copyBox: { alignItems: 'center', gap: SpacingV.xs },
		stageChip: {
			paddingHorizontal: Spacing.md,
			height: scaleHeight(24),
			justifyContent: 'center',
			borderRadius: Radius.pill,
			backgroundColor: 'rgba(255,255,255,0.14)',
		},
		stageChipText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: '#FFFFFF' },
		name: { marginTop: SpacingV.xs, fontSize: Typography.h1, fontWeight: FontWeight.heavy, color: '#FFFFFF', textAlign: 'center' },
		gotIt: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.accentAmber, textAlign: 'center' },
		hint: { marginTop: scaleHeight(2), fontSize: Typography.caption, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },

		button: {
			marginTop: SpacingV.lg,
			width: '100%',
			maxWidth: scaleWidth(300),
			height: scaleHeight(50),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.pill,
			backgroundColor: Colors.accentAmber,
		},
		buttonText: { fontSize: Typography.subtitle, fontWeight: FontWeight.heavy, color: '#1A1206' },
	});

export default PetGrowthModal;
