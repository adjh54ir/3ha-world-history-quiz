/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleProp, TextStyle, ViewStyle, GestureResponderEvent } from 'react-native';

/**
 * 공통 애니메이션 프리미티브
 * - 모든 효과는 마운트 시 start(), 언마운트 시 stop()/stopAnimation() 으로 정리하여 메모리 누수를 방지합니다.
 * - useNativeDriver로 JS 스레드 부하를 줄입니다.
 * - 무한 반복 연출은 반드시 useReducedMotion() 을 확인해 '동작 줄이기' 설정을 존중합니다.
 */

/**
 * 기기의 '동작 줄이기(Reduce Motion)' 설정 여부.
 * 무한 루프·타이핑처럼 계속 움직이는 연출은 이 값이 true 면 재생하지 않는다.
 */
export const useReducedMotion = (): boolean => {
	const [reduced, setReduced] = useState(false);
	useEffect(() => {
		let alive = true;
		AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduced(v));
		const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
		return () => {
			alive = false;
			sub.remove();
		};
	}, []);
	return reduced;
};

interface FadeInUpProps {
	children: React.ReactNode;
	/** 시작 지연(ms) — 스태거 효과용 */
	delay?: number;
	duration?: number;
	/** 아래에서 올라오는 거리(px) */
	distance?: number;
	style?: StyleProp<ViewStyle>;
}

/** 페이드 + 아래→위 슬라이드 진입 (마운트 1회) */
export const FadeInUp: React.FC<FadeInUpProps> = ({ children, delay = 0, duration = 380, distance = 14, style }) => {
	const progress = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		const anim = Animated.timing(progress, {
			toValue: 1,
			duration,
			delay,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: true,
		});
		anim.start();
		return () => {
			anim.stop();
			progress.stopAnimation();
		};
	}, [delay, duration, progress]);

	return (
		<Animated.View
			style={[
				style,
				{
					opacity: progress,
					transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
				},
			]}>
			{children}
		</Animated.View>
	);
};

interface ScalePressableProps {
	children: React.ReactNode;
	onPress?: (e: GestureResponderEvent) => void;
	disabled?: boolean;
	scaleTo?: number;
	style?: StyleProp<ViewStyle>;
	hitSlop?: number;
}

/** 누를 때 살짝 줄어드는 버튼 래퍼 (스프링) */
export const ScalePressable: React.FC<ScalePressableProps> = ({ children, onPress, disabled, scaleTo = 0.96, style, hitSlop }) => {
	const scale = useRef(new Animated.Value(1)).current;

	useEffect(() => () => scale.stopAnimation(), [scale]);

	const animateTo = (v: number) => {
		Animated.spring(scale, { toValue: v, useNativeDriver: true, friction: 7, tension: 140 }).start();
	};

	return (
		<Pressable
			disabled={disabled}
			onPress={onPress}
			hitSlop={hitSlop}
			onPressIn={() => animateTo(scaleTo)}
			onPressOut={() => animateTo(1)}>
			<Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
		</Pressable>
	);
};

interface CountUpProps {
	/** 목표 숫자 */
	value: number;
	duration?: number;
	/** 숫자 → 문자열 변환 (기본: 천단위 콤마) */
	format?: (v: number) => string;
	/** 값이 오를 때 살짝 커졌다 돌아오는 팝 효과 */
	pop?: boolean;
	style?: StyleProp<TextStyle>;
}

/**
 * 숫자 카운트업 (0 → value)
 * - 값이 바뀔 때마다 이전 값에서 새 값으로 이어서 센다.
 * - listener/애니메이션 모두 정리한다(리스너 누수 방지).
 */
export const CountUp: React.FC<CountUpProps> = ({ value, duration = 900, format = (v) => v.toLocaleString(), pop = false, style }) => {
	const anim = useRef(new Animated.Value(value)).current;
	const scale = useRef(new Animated.Value(1)).current;
	const prev = useRef(value);
	const [display, setDisplay] = useState(value);

	useEffect(() => {
		const from = prev.current;
		prev.current = value;
		if (from === value) {
			setDisplay(value);
			return;
		}
		anim.setValue(from);
		const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
		const count = Animated.timing(anim, { toValue: value, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false });
		count.start();

		const popAnim = pop
			? Animated.sequence([
					Animated.spring(scale, { toValue: 1.14, useNativeDriver: true, friction: 4, tension: 120 }),
					Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 120 }),
			  ])
			: null;
		popAnim?.start();

		return () => {
			anim.removeListener(id);
			count.stop();
			popAnim?.stop();
			scale.stopAnimation();
		};
	}, [value, duration, pop, anim, scale]);

	return <Animated.Text style={[style, pop && { transform: [{ scale }] }]}>{format(display)}</Animated.Text>;
};

interface AnimatedProgressProps {
	/** 진행률 0~1 (범위 밖은 잘라냄) */
	ratio: number;
	/** 채움 색 */
	color: string;
	/** 트랙(배경) 색 */
	trackColor: string;
	height: number;
	radius?: number;
	duration?: number;
	style?: StyleProp<ViewStyle>;
}

/**
 * 진행바 — 값이 바뀌면 채움이 부드럽게 늘어난다.
 * - width(%) 는 네이티브 드라이버 대상이 아니므로 useNativeDriver:false 사용(막대 하나라 비용 미미).
 */
export const AnimatedProgress: React.FC<AnimatedProgressProps> = ({ ratio, color, trackColor, height, radius, duration = 620, style }) => {
	const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
	const anim = useRef(new Animated.Value(clamped)).current;

	useEffect(() => {
		const a = Animated.timing(anim, { toValue: clamped, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false });
		a.start();
		return () => {
			a.stop();
			anim.stopAnimation();
		};
	}, [clamped, duration, anim]);

	const r = radius ?? height / 2;
	return (
		<Animated.View style={[{ height, borderRadius: r, backgroundColor: trackColor, overflow: 'hidden' }, style]}>
			<Animated.View
				style={{
					height: '100%',
					borderRadius: r,
					backgroundColor: color,
					width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
				}}
			/>
		</Animated.View>
	);
};

interface PulseProps {
	children: React.ReactNode;
	/** false 면 애니메이션을 멈추고 정지 상태로 렌더 */
	active?: boolean;
	duration?: number;
	minOpacity?: number;
	minScale?: number;
	maxScale?: number;
	style?: StyleProp<ViewStyle>;
}

/** 주목시켜야 하는 배지·점 등에 쓰는 반복 펄스 (active=false 로 즉시 정지) */
export const Pulse: React.FC<PulseProps> = ({ children, active = true, duration = 650, minOpacity = 0.72, minScale = 0.92, maxScale = 1.16, style }) => {
	const anim = useRef(new Animated.Value(0)).current;
	const reduced = useReducedMotion();

	useEffect(() => {
		// '동작 줄이기'가 켜져 있으면 반복 펄스는 재생하지 않는다
		if (!active || reduced) {
			anim.stopAnimation();
			anim.setValue(0);
			return;
		}
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(anim, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
				Animated.timing(anim, { toValue: 0, duration, easing: Easing.in(Easing.quad), useNativeDriver: true }),
			]),
		);
		loop.start();
		return () => {
			loop.stop();
			anim.stopAnimation();
		};
	}, [active, reduced, duration, anim]);

	return (
		<Animated.View
			style={[
				style,
				{
					opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [minOpacity, 1] }),
					transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [minScale, maxScale] }) }],
				},
			]}>
			{children}
		</Animated.View>
	);
};

interface SheetInProps {
	children: React.ReactNode;
	/** 모달의 visible — true 로 바뀔 때마다 처음부터 다시 올라온다 */
	visible: boolean;
	/** 올라오는 거리(px) */
	distance?: number;
	duration?: number;
	style?: StyleProp<ViewStyle>;
}

/**
 * 바텀시트 진입 (아래→위 슬라이드 + 페이드)
 * - 앱의 모든 바텀시트가 같은 속도·거리로 열리도록 이 컴포넌트로 통일한다.
 * - visible=false 로 닫힐 때는 AppModal 의 fade 로 사라지므로 별도 종료 연출을 두지 않는다.
 */
export const SheetIn: React.FC<SheetInProps> = ({ children, visible, distance = 80, duration = 220, style }) => {
	const anim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!visible) {
			anim.setValue(0);
			return;
		}
		const a = Animated.timing(anim, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true });
		a.start();
		return () => {
			a.stop();
			anim.stopAnimation();
		};
	}, [visible, duration, anim]);

	return (
		<Animated.View
			style={[
				style,
				{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] },
			]}>
			{children}
		</Animated.View>
	);
};

export default { FadeInUp, ScalePressable, CountUp, AnimatedProgress, Pulse, SheetIn };
