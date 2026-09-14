import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

type Props = {
	children: React.ReactNode;
	style?: StyleProp<ViewStyle>;
	/** 시작 스케일 (기본 0.94) */
	from?: number;
	/** 애니메이션 시간(ms) */
	duration?: number;
};

/**
 * 모달 카드 등장 애니메이션 (fade + scale pop-in)
 *
 * - RN Modal 은 visible=false 일 때 children 을 렌더하지 않으므로 마운트 시 1회 실행하면 충분하다.
 * - opacity/transform 만 사용해 useNativeDriver 로 동작한다(메인 스레드 미점유).
 * - 언마운트 시 stopAnimation() 으로 진행 중인 애니메이션을 정리해 누수를 막는다.
 */
const PopInView = ({ children, style, from = 0.94, duration = 180 }: Props) => {
	const progress = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		const anim = Animated.timing(progress, {
			toValue: 1,
			duration,
			useNativeDriver: true,
		});
		anim.start();
		return () => {
			anim.stop();
			progress.stopAnimation();
		};
	}, [progress, duration]);

	const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [from, 1] });

	return <Animated.View style={[style, { opacity: progress, transform: [{ scale }] }]}>{children}</Animated.View>;
};

export default PopInView;
