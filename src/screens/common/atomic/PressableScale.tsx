import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

// 래퍼 View 를 하나 더 두면 flex/row 레이아웃이 어긋나므로, Pressable 자체를 애니메이션한다
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style'> {
	style?: StyleProp<ViewStyle>;
	children: React.ReactNode;
	/** 눌렀을 때 줄어드는 비율 — 작은 칩은 0.96, 큰 카드는 0.98 정도가 자연스럽다 */
	scaleTo?: number;
	/** 눌렀을 때 흐려지는 정도 */
	opacityTo?: number;
}

/**
 * 누르면 살짝 눌리는 버튼/카드.
 * -------------------------------------------------
 * 화면마다 activeOpacity 값이 0.7~0.9 로 제각각이라 손맛이 달랐다. 주요 버튼·카드는 이 컴포넌트로 통일한다.
 */
const PressableScale = ({ style, children, scaleTo = 0.97, opacityTo = 0.9, disabled, ...rest }: Props) => {
	const anim = useRef(new Animated.Value(0)).current;
	/** 진행 중인 스프링 — 누르는 도중 화면이 닫히면 여기서 멈춘다 */
	const running = useRef<Animated.CompositeAnimation | null>(null);

	// 뗄 때는 탄성을 키워 원래 크기를 살짝 지나쳤다가 돌아온다 — 게임 버튼 같은 손맛
	const animate = (toValue: number) => {
		running.current?.stop();
		running.current =
			toValue === 1
				? Animated.spring(anim, { toValue, useNativeDriver: true, friction: 9, tension: 320 })
				: Animated.spring(anim, { toValue, useNativeDriver: true, friction: 5, tension: 300 });
		running.current.start();
	};

	// 눌린 상태에서 언마운트되면(모달 닫힘·화면 전환) 스프링이 사라진 뷰를 계속 물고 있는다
	useEffect(() => () => running.current?.stop(), []);

	return (
		<AnimatedPressable
			disabled={disabled}
			onPressIn={() => !disabled && animate(1)}
			onPressOut={() => !disabled && animate(0)}
			style={[
				style,
				{
					// 스프링이 0 아래로 지나가는 구간이 튀어오르는 느낌을 만든다 — 크기는 그대로 두고 투명도만 clamp 한다
					opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, opacityTo], extrapolate: 'clamp' }),
					transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, scaleTo] }) }],
				},
			]}
			{...rest}>
			{children}
		</AnimatedPressable>
	);
};

export default PressableScale;
