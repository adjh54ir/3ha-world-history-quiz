import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useColors } from '@/src/hooks/useTheme';
import { Radius } from '@/src/const/ConstDesign';
import { scaleHeight } from '@/src/utils';

interface Props {
	/** 0~1 */
	ratio: number;
	height?: number;
	color?: string;
	trackColor?: string;
	/** 게임 경험치 바처럼 빛줄기가 훑고 지나간다 — 히어로처럼 강조할 자리에만 켠다 */
	shine?: boolean;
}

/**
 * 채워지는 막대 — 값이 바뀌면 부드럽게 따라간다.
 * 채워진 부분 위쪽에 옅은 광택을 깔아 납작한 띠가 아니라 볼록한 게이지로 보이게 한다.
 * `shine` 을 켜면 그 위를 빛줄기가 주기적으로 지나간다(경험치 바 연출).
 */
const ProgressBar = ({ ratio, height = scaleHeight(8), color, trackColor, shine = false }: Props) => {
	const Colors = useColors();
	const width = useRef(new Animated.Value(0)).current;
	const sweep = useRef(new Animated.Value(0)).current;
	/** 빛줄기가 지나갈 거리 — 막대 실제 폭을 알아야 정해진다 */
	const [trackWidth, setTrackWidth] = useState(0);

	useEffect(() => {
		const anim = Animated.timing(width, {
			toValue: Math.min(1, Math.max(0, ratio)),
			duration: 500,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: false,
		});
		anim.start();
		return () => anim.stop();
	}, [ratio, width]);

	useEffect(() => {
		if (!shine || trackWidth === 0) {
			return;
		}
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(sweep, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
				// 쉼 없이 계속 훑으면 정신없다 — 한 번 지나가고 잠깐 쉰다
				Animated.delay(1600),
			]),
		);
		loop.start();
		return () => loop.stop();
	}, [shine, sweep, trackWidth]);

	const onLayout = (event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width);
	const band = Math.max(height * 5, 36);

	return (
		<View style={[styles.track, { height, borderRadius: height, backgroundColor: trackColor ?? Colors.surfaceAlt }]} onLayout={onLayout}>
			<Animated.View
				style={[
					styles.fill,
					{
						borderRadius: height,
						backgroundColor: color ?? Colors.primary,
						width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
					},
				]}>
				{/* 위쪽 광택 — 게이지가 볼록해 보이게 한다 */}
				<View style={[styles.gloss, { borderRadius: height }]} pointerEvents="none" />
				{shine && trackWidth > 0 && (
					<Animated.View
						pointerEvents="none"
						style={[
							styles.shine,
							{
								width: band,
								transform: [
									{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-band, trackWidth] }) },
									{ skewX: '-20deg' },
								],
							},
						]}
					/>
				)}
			</Animated.View>
		</View>
	);
};

const styles = StyleSheet.create({
	track: { width: '100%', overflow: 'hidden', borderRadius: Radius.pill },
	fill: { height: '100%', overflow: 'hidden' },
	gloss: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%', backgroundColor: 'rgba(255,255,255,0.28)' },
	shine: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.35)' },
});

export default ProgressBar;
