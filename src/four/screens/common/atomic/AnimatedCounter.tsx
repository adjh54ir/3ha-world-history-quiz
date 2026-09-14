import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleProp, Text, TextStyle } from 'react-native';

interface AnimatedCounterProps {
	/** 목표 값 */
	value: number;
	/** 애니메이션 시간(ms) */
	duration?: number;
	/** 접미사 (예: '%', '점') */
	suffix?: string;
	/** 천단위 콤마 */
	useComma?: boolean;
	style?: StyleProp<TextStyle>;
}

/**
 * 숫자가 0 → value 까지 카운트업되는 텍스트 컴포넌트.
 */
const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, duration = 900, suffix = '', useComma = false, style }) => {
	const anim = useRef(new Animated.Value(0)).current;
	const [display, setDisplay] = useState(0);

	useEffect(() => {
		anim.setValue(0);
		const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
		const counting = Animated.timing(anim, {
			toValue: value,
			duration,
			useNativeDriver: false,
		});
		counting.start();
		return () => {
			counting.stop();
			anim.removeListener(id);
		};
	}, [value, duration, anim]);

	const text = useComma ? display.toLocaleString() : String(display);
	return <Text style={style}>{text}{suffix}</Text>;
};

export default AnimatedCounter;
