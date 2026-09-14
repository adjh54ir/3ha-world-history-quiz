import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { FAVORITE_TOAST_IMAGES } from '@/src/const/data/life/ConstFeedbackImages';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils/DementionUtils';
import { Typography, FontWeight, Spacing, SpacingV, Radius } from '@/src/four/const/ConstDesign';
import { Colors } from '@/src/four/const/ConstColors';
import useAnimationCleanup from '@/src/four/hooks/useAnimationCleanup';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';

interface Props {
	visible: boolean;
	message?: string;
	showScrollHint?: boolean;
	bottom?: number; // 추가
	/** 즐겨찾기를 빼는 동작인지 — 넘기지 않으면 문구로 판단한다 */
	removed?: boolean;
	onHide: () => void;
}

/** 화면에 머무는 시간 */
const HOLD_MS = 1500;

/**
 * 모달 전용 즐겨찾기 토스트
 * -------------------------------------------------
 * 일반 화면은 전역 토스트(@/components/AppToast)를 쓴다. 다만 RN Modal 은 안드로이드에서
 * 별도 네이티브 창으로 뜨기 때문에, 앱 루트에 있는 전역 토스트는 모달 창 뒤에 깔려 보이지 않는다.
 * 모달 안에서 띄워야 하는 토스트만 이 컴포넌트를 모달 트리 안에 직접 렌더링해서 쓴다.
 *
 * 생김새
 * - 폭을 못 박은 납작한 띠 대신, 문구 길이에 맞는 알약으로 둔다.
 * - 넣을 때는 금빛 그라데이션 + 꽉 찬 별, 뺄 때는 차분한 잉크색 + 빈 별.
 *   같은 회색 띠로 두 동작을 다 알리면 무엇이 일어났는지 글자를 읽어야만 알 수 있었다.
 * - 별은 알약보다 한 박자 늦게 튀어 올라 눈이 별로 먼저 간다.
 */
const FavoriteToast = ({ visible, message, bottom = scaleHeight(30), removed, onHide }: Props) => {
	/** 알약 등장 — 위로 떠오르며 제 크기를 살짝 지나친다 */
	const enter = useRef(new Animated.Value(0)).current;
	/** 별 — 알약이 자리를 잡은 뒤 한 번 튄다 */
	const star = useRef(new Animated.Value(0)).current;

	// 토스트가 사라지는 도중 언마운트되면 onHide 가 늦게 호출되는 것을 막는다
	useAnimationCleanup(enter, star);

	useEffect(() => {
		if (!visible) {
			return;
		}
		enter.setValue(0);
		star.setValue(0);
		Animated.parallel([
			Animated.spring(enter, { toValue: 1, friction: 7, tension: 120, useNativeDriver: true }),
			Animated.spring(star, { toValue: 1, delay: 90, friction: 5, tension: 180, useNativeDriver: true }),
		]).start();

		const timer = setTimeout(() => {
			Animated.timing(enter, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
				// stopAnimation() 은 완료 콜백을 finished:false 로 부른다 — 언마운트 중이면 부모를 건드리지 않는다
				if (finished) {
					onHide();
				}
			});
		}, HOLD_MS);

		return () => clearTimeout(timer);
	}, [visible, onHide, enter, star]);

	if (!visible) {
		return null;
	}

	// ponytail: 호출하는 세 자리 모두 '추가'/'제거' 문구를 쓴다. 문구가 늘어나면 removed 를 직접 넘긴다
	const isRemove = removed ?? !!message?.includes('제거');
	const ink = isRemove ? Colors.textInverse : '#4A2F02';
	const statusBackground = isRemove ? Colors.surfaceAlt : '#4A2F02';
	const statusInk = isRemove ? Colors.textStrong : Colors.textInverse;

	return (
		<Animated.View
			pointerEvents="none"
			style={[
				styles.wrap,
				{
					bottom,
					opacity: enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
					transform: [
						{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(26), 0] }) },
						{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
					],
				},
			]}>
			<LinearGradient
				colors={isRemove ? [Colors.textStrong, Colors.textSecondary] : ['#FFE08A', '#F3A712']}
				start={{ x: 0.1, y: 0 }}
				end={{ x: 0.9, y: 1 }}
				style={styles.pill}>
				{/* 별 + 작은 상태 배지를 하나의 그래픽으로 묶어 Toast 안에서 떠 보이지 않게 한다 */}
				<Animated.View
					style={[
						styles.starPlate,
						{
							transform: [
								{ scale: star.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
								{ rotate: star.interpolate({ inputRange: [0, 1], outputRange: ['-35deg', '0deg'] }) },
							],
						},
					]}>
					<Image source={isRemove ? FAVORITE_TOAST_IMAGES.removed : FAVORITE_TOAST_IMAGES.added} style={styles.character} contentFit="contain" accessible={false} />
					<View style={[styles.statusBadge, { backgroundColor: statusBackground }]}>
						<IconComponent type="materialCommunityIcons" name={isRemove ? 'minus' : 'plus'} size={scaledSize(10)} color={statusInk} />
					</View>
				</Animated.View>

				<View style={styles.textWrapper}>
					{/* message 를 넘기면 그 문구를 쓴다 — 예전엔 문구가 박혀 있어 즐겨찾기를 '뺄' 때도 '추가'라고 떴다 */}
					<Text style={[styles.text, { color: ink }]} numberOfLines={1}>
						{message ?? '즐겨찾기 추가'}
					</Text>
					<Text style={[styles.subText, { color: ink }]} numberOfLines={1}>
						{isRemove ? '즐겨찾기 목록에서 빼 뒀어요' : '즐겨찾기 목록에 담았어요'}
					</Text>
				</View>
			</LinearGradient>
		</Animated.View>
	);
};

export default FavoriteToast;

const makeStyles = () =>
	StyleSheet.create({
		// 폭을 못 박지 않는다 — 문구가 짧아도 320 짜리 띠가 통째로 떠서 허전했다
		wrap: {
			position: 'absolute',
			alignSelf: 'center',
			maxWidth: scaleWidth(330),
			borderRadius: Radius.pill,
			zIndex: 999999,
		},
		pill: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			paddingVertical: SpacingV.sm,
			paddingLeft: Spacing.sm,
			paddingRight: Spacing.xl,
			borderRadius: Radius.pill,
			borderWidth: 1,
			borderColor: 'rgba(255, 255, 255, 0.35)',
		},
		starPlate: {
			width: scaleWidth(58),
			height: scaleWidth(58),
			alignItems: 'center',
			justifyContent: 'center',
		},
		character: { width: '100%', height: '100%' },
		statusBadge: {
			position: 'absolute',
			right: -Spacing.xxs,
			bottom: -Spacing.xxs,
			width: scaleWidth(17),
			height: scaleWidth(17),
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			borderWidth: 2,
			borderColor: 'rgba(255,255,255,0.82)',
		},
		textWrapper: { flexShrink: 1, gap: scaleHeight(1) },
		text: { fontSize: Typography.callout, fontWeight: FontWeight.heavy, letterSpacing: -0.2 },
		subText: { fontSize: Typography.caption, fontWeight: FontWeight.medium, opacity: 0.8, letterSpacing: -0.1 },
	});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
