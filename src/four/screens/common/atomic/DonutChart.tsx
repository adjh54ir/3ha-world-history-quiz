/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { scaleWidth } from '@/src/four/utils';
import { Colors } from '@/src/four/const/ConstColors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface DonutChartProps {
	/** 차트 지름(px, scaleWidth 적용 전 값) */
	size?: number;
	/** 링 두께 */
	strokeWidth?: number;
	/** 0~100 진행률 */
	percent: number;
	/** 진행 링 색상 */
	color?: string;
	/** 트랙(배경 링) 색상 */
	trackColor?: string;
	/** 중앙 컨텐츠 */
	children?: React.ReactNode;
}

/**
 * react-native-svg 기반 도넛(원형 진행률) 차트.
 * 마운트 시 0 → percent 까지 부드럽게 채워지는 애니메이션을 제공합니다.
 */
const DonutChart: React.FC<DonutChartProps> = ({
	size = 110,
	strokeWidth = 12,
	percent,
	color = Colors.primary,
	trackColor = Colors.border,
	children,
}) => {
	const dimension = scaleWidth(size);
	const stroke = scaleWidth(strokeWidth);
	const radius = (dimension - stroke) / 2;
	const circumference = 2 * Math.PI * radius;

	const progress = useRef(new Animated.Value(0)).current;
	const clamped = Math.min(Math.max(percent, 0), 100);

	useEffect(() => {
		const anim = Animated.timing(progress, {
			toValue: clamped,
			duration: 900,
			useNativeDriver: false, // SVG strokeDashoffset 애니메이션은 네이티브 드라이버 미지원
		});
		anim.start();
		// JS 드라이버라 언마운트 후에도 프레임이 돌 수 있어 반드시 정리한다
		return () => anim.stop();
	}, [clamped, progress]);

	const strokeDashoffset = progress.interpolate({
		inputRange: [0, 100],
		outputRange: [circumference, 0],
	});

	return (
		<View style={{ width: dimension, height: dimension, alignItems: 'center', justifyContent: 'center' }}>
			<Svg width={dimension} height={dimension} style={{ position: 'absolute' }}>
				<G rotation="-90" origin={`${dimension / 2}, ${dimension / 2}`}>
					<Circle
						cx={dimension / 2}
						cy={dimension / 2}
						r={radius}
						stroke={trackColor}
						strokeWidth={stroke}
						fill="transparent"
					/>
					<AnimatedCircle
						cx={dimension / 2}
						cy={dimension / 2}
						r={radius}
						stroke={color}
						strokeWidth={stroke}
						fill="transparent"
						strokeLinecap="round"
						strokeDasharray={circumference}
						strokeDashoffset={strokeDashoffset}
					/>
				</G>
			</Svg>
			<View style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</View>
		</View>
	);
};

export default DonutChart;
