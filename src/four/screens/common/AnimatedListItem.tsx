import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { scaleHeight } from '@/src/four/utils/DementionUtils';

/**
 * 리스트 아이템 진입 애니메이션 래퍼 (fade + slide-up)
 *
 * - 앞쪽 30개까지만 순차(stagger) 등장시키고 이후는 즉시 표시해 스크롤 성능을 지킨다.
 * - 언마운트 시 애니메이션을 stop() 해 메모리 누수를 막는다.
 * - opacity/transform만 사용하므로 useNativeDriver 로 메인 스레드를 점유하지 않는다.
 * - style 은 그리드(numColumns)처럼 래퍼가 폭을 잡아야 할 때 쓴다.
 */
const AnimatedListItem = React.memo(({
	children,
	index,
	style,
}: {
	children: React.ReactNode;
	index: number;
	style?: StyleProp<ViewStyle>;
}) => {
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const translateY = useRef(new Animated.Value(scaleHeight(16))).current;

	useEffect(() => {
		const delay = Math.min(index, 30) * 30;
		const anim = Animated.parallel([
			Animated.timing(fadeAnim, { toValue: 1, duration: 250, delay, useNativeDriver: true }),
			Animated.timing(translateY, { toValue: 0, duration: 250, delay, useNativeDriver: true }),
		]);
		anim.start();
		return () => anim.stop();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return <Animated.View style={[style, { opacity: fadeAnim, transform: [{ translateY }] }]}>{children}</Animated.View>;
});

export default AnimatedListItem;
