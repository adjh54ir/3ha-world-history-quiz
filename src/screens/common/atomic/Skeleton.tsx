/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle, DimensionValue } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Colors from '@/src/const/ConstColors';
import { Radius, Spacing, SpacingV } from '@/src/const/ConstDesign';
import { scaleHeight, scaleWidth } from '@/src/utils';
import { themed } from '@/src/utils/ThemedStyles';

interface SkeletonProps {
	/** 너비 (숫자=px, '60%' 등 문자열 가능) */
	width?: DimensionValue;
	/** 높이 */
	height?: number;
	/** 모서리 반경 */
	radius?: number;
	style?: ViewStyle;
}

/**
 * 공용 스켈레톤 (Shimmer)
 * - 콘텐츠 로딩 중 자리표시자. 은은한 밝기 펄스로 "불러오는 중"을 표현한다.
 * - 모션 최소화 설정 시 애니메이션을 끄고 정적 회색 블록으로 표시(접근성).
 */
const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = scaleHeight(16), radius = Radius.sm, style }) => {
	const pulse = useRef(new Animated.Value(0)).current;
	const reduceMotion = useReducedMotion();

	useEffect(() => {
		if (reduceMotion) return;
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
				Animated.timing(pulse, { toValue: 0, duration: 650, useNativeDriver: true }),
			]),
		);
		loop.start();
		return () => loop.stop();
	}, [pulse, reduceMotion]);

	const opacity = reduceMotion ? 0.6 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] });

	return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: Colors.surfaceAlt, opacity }, style]} />;
};

/**
 * 퀴즈 문제 카드 스켈레톤 — 문제 준비 중 표시용.
 * 태그 · 문제 · 보기 4개의 실제 레이아웃을 흉내내어 체감 대기감을 줄인다.
 */
export const QuizCardSkeleton: React.FC = () => (
	<View style={styles.card}>
		<View style={styles.tagRow}>
			<Skeleton width={scaleWidth(64)} height={scaleHeight(22)} radius={Radius.md} />
			<Skeleton width={scaleWidth(48)} height={scaleHeight(22)} radius={Radius.md} />
		</View>
		<Skeleton width={'70%'} height={scaleHeight(26)} radius={Radius.sm} style={styles.prompt} />
		<Skeleton width={'45%'} height={scaleHeight(18)} radius={Radius.sm} style={styles.promptSub} />
		{[0, 1, 2, 3].map((i) => (
			<Skeleton key={i} height={scaleHeight(52)} radius={Radius.lg} style={styles.option} />
		))}
	</View>
);

export default Skeleton;

const styles = themed(() => StyleSheet.create({
	card: { alignSelf: 'stretch', alignItems: 'center' },
	tagRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: SpacingV.lg },
	prompt: { marginBottom: SpacingV.sm },
	promptSub: { marginBottom: SpacingV.xl },
	option: { alignSelf: 'stretch', marginBottom: SpacingV.md },
}));
