import React, { useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useHanjaFont } from '@/src/hooks/useHanjaFont';

/**
 * 코인 에셋 — 아이콘 글리프 대신 "물건"으로 읽히는 금화 한 장.
 * -------------------------------------------------
 * 상점 아이템처럼 그림 파일로 두지 않고 코드로 그린다.
 * - 어느 크기에서도 획이 무너지지 않는다 (한 자리에서 12~120px 까지 쓴다)
 * - 차오르는 연출을 하려면 금빛 면을 따로 가려야 하는데, 한 장짜리 PNG 로는 못 한다
 *
 * 금색은 라이트·다크 어디서나 같은 금색이다 — 상점 아이템 그림과 같은 취급이라 테마를 타지 않는다.
 */

/** 금화 앞면 — 왼쪽 위에서 빛이 들어온다 */
const GOLD = ['#FFF0BF', '#FBC02D', '#D98B0B'] as const;
/** 아직 안 채워진 면 — 같은 금화의 그늘진 상태 */
const EMPTY = ['#E8E2D2', '#CFC6B0', '#B4A98E'] as const;

interface Props {
	/** 지름(px) */
	size: number;
	/**
	 * 0~1 로 차오르는 금빛. 넘기지 않으면 처음부터 가득 찬 금화다.
	 * 아래에서 위로 금빛이 올라온다 — 높이를 애니메이션하므로 네이티브 드라이버를 쓸 수 없다.
	 */
	fill?: Animated.Value;
}

/** 금화 한 장 — 테두리·면·글자를 한 덩어리로 그린다 */
const CoinFace = ({ size, colors }: { size: number; colors: readonly [string, string, string] }) => {
	const { style: hanjaFont } = useHanjaFont();
	const gold = colors === GOLD;
	return (
		<LinearGradient
			colors={[...colors]}
			locations={[0, 0.55, 1]}
			start={{ x: 0.15, y: 0 }}
			end={{ x: 0.85, y: 1 }}
			style={[
				styles.face,
				{
					width: size,
					height: size,
					borderRadius: size / 2,
					borderWidth: Math.max(1, size * 0.06),
					borderColor: gold ? '#B57505' : '#9C9179',
				},
			]}>
			{/* 안쪽 테 — 두 겹으로 둘러 실제 주화의 두께감을 만든다 */}
			<View
				style={[
					styles.ring,
					{
						width: size * 0.7,
						height: size * 0.7,
						borderRadius: size * 0.35,
						borderWidth: Math.max(1, size * 0.035),
						borderColor: gold ? 'rgba(181, 117, 5, 0.45)' : 'rgba(120, 111, 92, 0.4)',
					},
				]}
			/>
			{/* 새김 글자 — 한자 앱이니 돈 대신 金 을 새긴다 */}
			<Text
				allowFontScaling={false}
				style={[hanjaFont, styles.glyph, { fontSize: size * 0.46, color: gold ? '#8A5A04' : '#7C7259' }]}
				accessible={false}>
				金
			</Text>
			{/* 광택 — 왼쪽 위 하이라이트 한 점 */}
			<View
				style={[
					styles.shine,
					{ width: size * 0.26, height: size * 0.16, borderRadius: size * 0.13, top: size * 0.12, left: size * 0.16 },
				]}
			/>
		</LinearGradient>
	);
};

const CoinIcon = ({ size, fill }: Props) => {
	const clipHeight = useMemo(() => fill?.interpolate({ inputRange: [0, 1], outputRange: [0, size] }), [fill, size]);

	if (!clipHeight) {
		return <CoinFace size={size} colors={GOLD} />;
	}

	return (
		<View style={{ width: size, height: size }} accessible={false}>
			<CoinFace size={size} colors={EMPTY} />
			{/* 아래에서 차오르는 금빛 — 창(clip)만 자라고 금화 자체는 제자리에 붙어 있어 찌그러지지 않는다 */}
			<Animated.View style={[styles.clip, { height: clipHeight }]}>
				<View style={[styles.clipInner, { width: size, height: size }]}>
					<CoinFace size={size} colors={GOLD} />
				</View>
			</Animated.View>
		</View>
	);
};

/**
 * 튀어 오르는 코인 — 보상을 받은 자리에서 위로 흩어져 사라진다.
 * `progress` 0→1 한 번에 전부 올라가고, 코인마다 시작 시점과 좌우 흔들림이 다르다.
 */
export const CoinRise = ({ progress, size = 18, count = 5 }: { progress: Animated.Value; size?: number; count?: number }) => {
	const coins = useMemo(
		() =>
			Array.from({ length: count }, (_, at) => {
				// 가운데를 기준으로 좌우로 번갈아 퍼진다 — 매 렌더 난수를 쓰면 프레임마다 자리가 바뀐다
				const spread = (at - (count - 1) / 2) * size * 1.15;
				const start = at * 0.09;
				return { spread, start, rise: size * (3.4 + (at % 2) * 0.9) };
			}),
		[count, size],
	);

	return (
		<View style={styles.burst} pointerEvents="none">
			{coins.map((coin, at) => {
				const range = [coin.start, Math.min(1, coin.start + 0.7)];
				return (
					<Animated.View
						key={at}
						style={{
							position: 'absolute',
							opacity: progress.interpolate({ inputRange: [range[0], (range[0] + range[1]) / 2, range[1]], outputRange: [0, 1, 0], extrapolate: 'clamp' }),
							transform: [
								{ translateX: coin.spread },
								{ translateY: progress.interpolate({ inputRange: range, outputRange: [0, -coin.rise], extrapolate: 'clamp' }) },
								{ scale: progress.interpolate({ inputRange: range, outputRange: [0.6, 1.1], extrapolate: 'clamp' }) },
							],
						}}>
						<CoinFace size={size} colors={GOLD} />
					</Animated.View>
				);
			})}
		</View>
	);
};

const styles = StyleSheet.create({
	face: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
	ring: { position: 'absolute' },
	// 한자 서체는 굵기 변형이 없다 — fontWeight 를 얹으면 iOS 에서 기본 서체로 떨어진다
	glyph: { includeFontPadding: false, textAlign: 'center' },
	shine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.55)', transform: [{ rotate: '-28deg' }] },
	clip: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
	clipInner: { position: 'absolute', bottom: 0 },
	burst: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});

export default CoinIcon;
