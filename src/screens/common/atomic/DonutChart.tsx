/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { scaleWidth } from '@/src/utils';
import Colors from '@/src/const/ConstColors';

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
	/** 트랙(배경 링) 색상. 없으면 tone 기본값 */
	trackColor?: string;
	/** 링 경계선 색상. 없으면 tone 기본값, null 이면 경계선 미표시 */
	outlineColor?: string | null;
	/** 배경 톤 프리셋 — 'light'(흰 카드 위, 기본) / 'dark'(브랜드·어두운 배경 위) */
	tone?: 'light' | 'dark';
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
	color = Colors.success,
	trackColor,
	outlineColor,
	tone = 'light',
	children,
}) => {
	// 어두운/브랜드 배경에서는 Colors.border 가 묻힌다 — 톤별 기본색을 따로 둔다
	const toneColor = tone === 'dark' ? Colors.onBrandBorderSoft : Colors.border;
	const track = trackColor ?? toneColor;
	const outline = outlineColor === undefined ? toneColor : outlineColor;
	const dimension = scaleWidth(size);
	const stroke = scaleWidth(strokeWidth);
	const radius = (dimension - stroke) / 2;
	const circumference = 2 * Math.PI * radius;

	const progress = useRef(new Animated.Value(0)).current;
	const clamped = Number.isFinite(percent) ? Math.min(Math.max(percent, 0), 100) : 0;

	useEffect(() => {
		const a = Animated.timing(progress, {
			toValue: clamped,
			duration: 900,
			useNativeDriver: false, // SVG strokeDashoffset 애니메이션은 네이티브 드라이버 미지원
		});
		a.start();
		return () => a.stop();
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
						stroke={track}
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
					{/* 링의 바깥·안쪽 경계선 — 전체 테두리 안에서 진행률 색이 차오르는 형태로 읽히게 (진행 링 위에 그린다) */}
					{!!outline && (
						<>
							<Circle cx={dimension / 2} cy={dimension / 2} r={radius + stroke / 2 - 0.5} stroke={outline} strokeWidth={1} fill="transparent" />
							<Circle cx={dimension / 2} cy={dimension / 2} r={Math.max(radius - stroke / 2 + 0.5, 0)} stroke={outline} strokeWidth={1} fill="transparent" />
						</>
					)}
				</G>
			</Svg>
			<View style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</View>
		</View>
	);
};

export default DonutChart;
