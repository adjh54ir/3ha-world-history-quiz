import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useReducedMotion } from '@/src/screens/common/anim/Motion';
import { scaleArt } from '@/src/utils/DementionUtils';

/**
 * 정글 캐노피 — 히어로 카드 모서리에 매달린 잎사귀들이 바람에 천천히 흔들린다.
 * - 앱의 '정글 탐험' 테마를 한 곳에서 보여 주는 장식. 정보가 아니므로 접근성 트리에서 뺀다.
 * - 잎마다 주기를 달리해 기계적으로 맞춰 흔들리지 않게 한다.
 * - 동작 줄이기 설정이면 멈춘 채로 그린다. 언마운트 시 루프를 멈춘다.
 */

/** 줄기(위) → 잎끝(아래)로 매달린 잎. 가운데 잎맥 하나 */
const LEAF = 'M20 0 C34 14 40 44 20 92 C0 44 6 14 20 0 Z';
const RIB = 'M20 4 L20 86';

type Leaf = { x: number; y: number; size: number; tilt: number; swing: number; ms: number; color: string };

interface Props {
	/** 잎 색 (진한 잎 → 옅은 잎 순서로 겹친다) */
	colors: [string, string, string];
	/** 잎맥 색 */
	ribColor: string;
	style?: StyleProp<ViewStyle>;
}

const SwayLeaf: React.FC<{ leaf: Leaf; ribColor: string; still: boolean }> = ({ leaf, ribColor, still }) => {
	const t = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (still) return;
		const half = { duration: leaf.ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true };
		const loop = Animated.loop(
			Animated.sequence([Animated.timing(t, { toValue: 1, ...half }), Animated.timing(t, { toValue: 0, ...half })]),
		);
		loop.start();
		return () => {
			loop.stop();
			t.stopAnimation();
		};
	}, [still, leaf.ms, t]);

	const rotate = t.interpolate({ inputRange: [0, 1], outputRange: [`${leaf.tilt - leaf.swing}deg`, `${leaf.tilt + leaf.swing}deg`] });
	const w = scaleArt(leaf.size * 0.44);
	const h = scaleArt(leaf.size);

	return (
		<Animated.View
			style={[
				styles.leaf,
				{ left: scaleArt(leaf.x), top: scaleArt(leaf.y), width: w, height: h, transform: [{ rotate: still ? `${leaf.tilt}deg` : rotate }] },
			]}>
			<Svg width={w} height={h} viewBox="0 0 40 92">
				<Path d={LEAF} fill={leaf.color} />
				<Path d={RIB} stroke={ribColor} strokeWidth={1.4} strokeLinecap="round" />
			</Svg>
		</Animated.View>
	);
};

const JungleCanopy: React.FC<Props> = ({ colors, ribColor, style }) => {
	const still = useReducedMotion();
	// 뒤(크고 진한 잎) → 앞(작고 옅은 잎). 좌표는 캐노피 상자(160×120) 기준
	const leaves: Leaf[] = [
		{ x: 104, y: -18, size: 104, tilt: 28, swing: 4, ms: 2600, color: colors[0] },
		{ x: 70, y: -26, size: 92, tilt: -6, swing: 5, ms: 3100, color: colors[1] },
		{ x: 128, y: -10, size: 78, tilt: 52, swing: 6, ms: 2300, color: colors[1] },
		{ x: 40, y: -30, size: 70, tilt: -26, swing: 7, ms: 2800, color: colors[2] },
	];
	return (
		<View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.box, style]}>
			{leaves.map((leaf, i) => (
				<SwayLeaf key={i} leaf={leaf} ribColor={ribColor} still={still} />
			))}
		</View>
	);
};

export default JungleCanopy;

const styles = StyleSheet.create({
	box: { position: 'absolute', top: 0, right: 0, width: scaleArt(160), height: scaleArt(120) },
	// 줄기 끝(위 가운데)을 축으로 흔든다
	leaf: { position: 'absolute', transformOrigin: 'top center' },
});
