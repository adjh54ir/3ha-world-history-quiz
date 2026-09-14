import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import CoinIcon from './CoinIcon';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

/** 연출이 화면에 머무는 시간 */
const HOLD_MS = 1100;

/**
 * 연출에 세우는 것 한 개 — 그림이 있으면 그림을, 없으면(꾸미기) 아이콘을 세운다.
 * price 는 나간 코인이다. 광고 보상처럼 **들어온** 코인은 음수로 넘긴다.
 */
export interface PurchaseBurstItem {
	label: string;
	price: number;
	image?: number;
	icon?: string;
}

/** 사방으로 뻗는 빛줄기 여덟 갈래 */
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];
/** 튀어 오르는 금화 — 좌우로 흩어지는 정도와 높이를 미리 정해 둔다 */
const COINS = [
	{ x: -62, y: -96 },
	{ x: -28, y: -124 },
	{ x: 22, y: -118 },
	{ x: 58, y: -88 },
];

/**
 * 구매 연출 — 확인을 누른 순간 화면 한가운데에서 한 번 터진다.
 * -------------------------------------------------
 * 예전에는 사장 말풍선 글만 바뀌어서 "샀다"는 느낌이 남지 않았다.
 * 빛줄기 · 물건 · 튀는 금화 세 겹을 겹쳐 게임에서 아이템을 얻은 순간처럼 만든다.
 *
 * 화면을 덮기만 하고 누를 수는 없다(pointerEvents="none") — 연출이 도는 동안에도 상점을 계속 만질 수 있다.
 */
const PurchaseBurst = ({ item, onDone }: { item: PurchaseBurstItem | null; onDone: () => void }) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	/** 0 → 1 한 번 도는 값. 등장·유지·퇴장을 구간으로 나눠 쓴다 */
	const play = useRef(new Animated.Value(0)).current;
	const doneRef = useRef(onDone);
	doneRef.current = onDone;

	useEffect(() => {
		if (!item) {
			return;
		}
		play.setValue(0);
		const anim = Animated.timing(play, { toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: true });
		anim.start(({ finished }) => {
			if (finished) {
				doneRef.current();
			}
		});
		return () => anim.stop();
	}, [item, play]);

	if (!item) {
		return null;
	}

	/** 코인이 들어온 연출인지 — 광고 보상처럼 값이 음수면 '+' 로 읽어 준다 */
	const gained = item.price < 0;
	/** 물건 — 작게 들어와 제 크기를 지나쳤다가 자리를 잡고, 끝에 살짝 떠오르며 사라진다 */
	const cardStyle = {
		opacity: play.interpolate({ inputRange: [0, 0.08, 0.75, 1], outputRange: [0, 1, 1, 0] }),
		transform: [
			{ scale: play.interpolate({ inputRange: [0, 0.18, 0.32, 0.75, 1], outputRange: [0.4, 1.12, 1, 1, 1.04] }) },
			{ translateY: play.interpolate({ inputRange: [0, 0.75, 1], outputRange: [0, 0, -scaleHeight(18)] }) },
		],
	};
	/** 빛줄기 — 한 번 크게 퍼지고 옅어진다 */
	const burstStyle = {
		opacity: play.interpolate({ inputRange: [0, 0.1, 0.5], outputRange: [0.85, 0.7, 0] }),
		transform: [
			{ scale: play.interpolate({ inputRange: [0, 0.5], outputRange: [0.5, 1.5] }) },
			{ rotate: play.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '26deg'] }) },
		],
	};

	return (
		<View style={styles.overlay} pointerEvents="none">
			{/* 빛줄기 여덟 갈래 — 물건보다 먼저 그려 뒤로 들어간다 */}
			<Animated.View style={[styles.burst, burstStyle]}>
				{RAYS.map((deg) => (
					<LinearGradient
						key={deg}
						colors={[Colors.accentAmber, 'rgba(255,255,255,0)']}
						start={{ x: 0.5, y: 0 }}
						end={{ x: 0.5, y: 1 }}
						style={[styles.ray, { transform: [{ rotate: `${deg}deg` }] }]}
					/>
				))}
			</Animated.View>

			{/* 튀어 오르는 금화 — 값을 치른 것이 눈에 보이게 한다 */}
			{COINS.map((coin) => {
				const at = play.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] });
				return (
					<Animated.View
						key={`${coin.x}-${coin.y}`}
						style={[
							styles.coin,
							{
								opacity: play.interpolate({ inputRange: [0, 0.1, 0.5, 0.7], outputRange: [0, 1, 1, 0] }),
								transform: [
									{ translateX: at.interpolate({ inputRange: [0, 1], outputRange: [0, scaleWidth(coin.x)] }) },
									{ translateY: at.interpolate({ inputRange: [0, 1], outputRange: [0, scaleHeight(coin.y)] }) },
									{ scale: at.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
								],
							},
						]}>
						<CoinIcon size={scaleWidth(20)} />
					</Animated.View>
				);
			})}

			<Animated.View style={[styles.card, cardStyle]}>
				<View style={styles.assetBox}>
					{item.image ? (
						<Image source={item.image} style={styles.asset} contentFit="contain" accessible={false} />
					) : (
						<IconComponent type="materialCommunityIcons" name={item.icon ?? 'shopping'} size={scaleWidth(46)} color={Colors.primaryDark} />
					)}
				</View>
				<Text style={styles.label} numberOfLines={1}>
					{item.label}
				</Text>
				<View style={styles.priceTag}>
					<IconComponent type="materialCommunityIcons" name="circle-multiple" size={13} color={Colors.accentAmber} />
					<Text style={styles.priceText}>{gained ? `+${(-item.price).toLocaleString()}` : `-${item.price.toLocaleString()}`}</Text>
				</View>
				<Text style={styles.done}>{gained ? '보상 획득!' : '구매 완료!'}</Text>
			</Animated.View>
		</View>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 30 },
		burst: { position: 'absolute', width: scaleWidth(260), height: scaleWidth(260), alignItems: 'center', justifyContent: 'center' },
		// 한 갈래는 가운데를 지나는 긴 띠 — 회전만 달리해 여덟 갈래를 만든다
		ray: { position: 'absolute', width: scaleWidth(14), height: scaleWidth(260), borderRadius: Radius.pill },
		coin: { position: 'absolute' },
		card: {
			alignItems: 'center',
			gap: SpacingV.xs,
			paddingHorizontal: Spacing.xl,
			paddingVertical: SpacingV.lg,
			borderRadius: Radius.xl,
			borderWidth: 1,
			borderColor: Colors.accentAmber,
			backgroundColor: Colors.surface,
		},
		assetBox: {
			width: scaleWidth(78),
			height: scaleWidth(78),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.lg,
			backgroundColor: Colors.accentAmberSoft,
		},
		asset: { width: scaleWidth(62), height: scaleWidth(62) },
		label: { fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: Colors.textStrong },
		priceTag: { flexDirection: 'row', alignItems: 'center', gap: scaleWidth(3) },
		priceText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textSecondary, fontVariant: ['tabular-nums'] },
		done: { marginTop: scaleHeight(2), fontSize: scaledSize(11), fontWeight: FontWeight.bold, color: Colors.accentAmber },
	});

export default PurchaseBurst;
