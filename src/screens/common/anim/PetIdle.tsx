import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useIsFocused } from '@react-navigation/native';
import { useReducedMotion } from '@/src/screens/common/anim/Motion';
import { hapticLight } from '@/src/utils/HapticUtils';

/**
 * 살아 있는 펫 — 가만히 있을 때도 숨 쉬듯 몸이 부풀고 천천히 흔들리며,
 * 몇 초마다 깡충 뛰기 · 뒤돌아보기 · 날개 파닥이기 중 하나를 무작위로 한다.
 * - 누르면 깡충 뛰며 반응한다 (진동 포함)
 * - 바닥 그림자는 뛰어오르면 작고 옅어져 땅에 서 있는 느낌을 준다
 * - 동작 줄이기 설정 · still · 화면이 가려진 상태면 멈춘 채로 그린다. 언마운트 시 타이머·루프를 모두 정리한다.
 */

interface Props {
	source: ImageSourcePropType;
	/** 그림 한 변(px) */
	size: number;
	/** 잠긴 단계 미리보기 등 — 움직이지 않는다 */
	still?: boolean;
	/** 잠긴 단계 실루엣 색 */
	tintColor?: string;
	shadowColor: string;
	style?: StyleProp<ViewStyle>;
}

type Act = 'hop' | 'look' | 'flap';
const pickAct = (): Act => {
	const r = Math.random();
	return r < 0.45 ? 'hop' : r < 0.75 ? 'look' : 'flap';
};

const PetIdle: React.FC<Props> = ({ source, size, still = false, tintColor, shadowColor, style }) => {
	const reduced = useReducedMotion();
	// 다른 화면이 위에 덮여 있으면 멈춘다 — 안 보이는 동안 타이머·루프를 돌리지 않는다
	const focused = useIsFocused();
	const frozen = still || reduced || !focused;
	const breathe = useRef(new Animated.Value(0)).current;
	const sway = useRef(new Animated.Value(0)).current;
	const hopY = useRef(new Animated.Value(0)).current;
	const squash = useRef(new Animated.Value(1)).current;
	const face = useRef(new Animated.Value(1)).current;
	const flap = useRef(new Animated.Value(0)).current;
	const busy = useRef(false);
	const hopH = size * 0.14;

	const run = useCallback(
		(act: Act) => {
			if (busy.current) return;
			busy.current = true;
			const t = (v: Animated.Value, toValue: number, duration: number, easing = Easing.inOut(Easing.quad)) =>
				Animated.timing(v, { toValue, duration, easing, useNativeDriver: true });
			const anim =
				act === 'hop'
					? Animated.sequence([
							t(squash, 0.9, 110),
							Animated.parallel([t(hopY, -hopH, 230, Easing.out(Easing.quad)), t(squash, 1.06, 230)]),
							Animated.parallel([t(hopY, 0, 200, Easing.in(Easing.quad)), t(squash, 1, 200)]),
							t(squash, 0.92, 80),
							Animated.spring(squash, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
						])
					: act === 'look'
						? Animated.sequence([t(face, -1, 220), Animated.delay(1300), t(face, 1, 220)])
						: Animated.sequence([t(flap, 1, 70), t(flap, -1, 90), t(flap, 1, 90), t(flap, -1, 90), t(flap, 0, 70)]);
			anim.start(() => {
				busy.current = false;
			});
		},
		[hopH, hopY, squash, face, flap],
	);

	useEffect(() => {
		if (frozen) {
			[breathe, sway, hopY, flap].forEach((v) => v.setValue(0));
			[squash, face].forEach((v) => v.setValue(1));
			return;
		}
		const loopOf = (v: Animated.Value, half: number) =>
			Animated.loop(
				Animated.sequence([
					Animated.timing(v, { toValue: 1, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
					Animated.timing(v, { toValue: 0, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
				]),
			);
		// 숨쉬기와 흔들림의 주기를 어긋나게 해 기계적으로 맞물리지 않게 한다
		const loops = [loopOf(breathe, 1100), loopOf(sway, 1700)];
		loops.forEach((l) => l.start());
		let timer: ReturnType<typeof setTimeout>;
		const schedule = () => {
			timer = setTimeout(() => {
				run(pickAct());
				schedule();
			}, 3200 + Math.random() * 3000);
		};
		schedule();
		return () => {
			clearTimeout(timer);
			loops.forEach((l) => l.stop());
			[breathe, sway, hopY, squash, face, flap].forEach((v) => v.stopAnimation());
			busy.current = false;
		};
	}, [frozen, run, breathe, sway, hopY, squash, face, flap]);

	const onPress = () => {
		if (frozen) return;
		hapticLight();
		run('hop');
	};

	const scaleY = Animated.multiply(squash, breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }));
	const scaleX = Animated.multiply(face, breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] }));
	const rotate = Animated.add(sway.interpolate({ inputRange: [0, 1], outputRange: [-2, 2] }), Animated.multiply(flap, 7)).interpolate({
		inputRange: [-10, 10],
		outputRange: ['-10deg', '10deg'],
	});
	const shadowScale = hopY.interpolate({ inputRange: [-hopH, 0], outputRange: [0.6, 1], extrapolate: 'clamp' });

	return (
		// 장식 + 놀이 반응 — 스크린리더는 감싼 행(버튼)의 설명을 읽는다
		<Pressable onPress={onPress} accessible={false} style={[{ width: size, height: size }, style]}>
			<Animated.View
				style={[
					styles.shadow,
					{ width: size * 0.5, height: size * 0.08, borderRadius: size, backgroundColor: shadowColor, bottom: size * 0.03 },
					{ opacity: frozen ? 0.3 : Animated.multiply(shadowScale, 0.5), transform: [{ scaleX: shadowScale }] },
				]}
			/>
			<Animated.View style={{ transform: [{ translateY: hopY }] }}>
				{/* 몸 변형은 발밑을 기준으로 — 숨쉬기·흔들림이 땅에서 떠 보이지 않는다 */}
				<Animated.View style={[styles.origin, { transform: [{ rotate }, { scaleX }, { scaleY }] }]}>
					<ExpoImage source={source} style={{ width: size, height: size }} tintColor={tintColor} contentFit="contain" />
				</Animated.View>
			</Animated.View>
		</Pressable>
	);
};

export default PetIdle;

const styles = StyleSheet.create({
	shadow: { position: 'absolute', alignSelf: 'center' },
	origin: { transformOrigin: 'bottom' },
});
