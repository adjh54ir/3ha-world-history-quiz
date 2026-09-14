import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useLife } from '@/src/hooks/useLife';
import { useAnimationRunner } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Radius, Spacing, Typography } from '@/src/const/ConstDesign';
import { Paths } from '@/src/navigation/conf/Paths';
import { playPop } from '@/src/utils/SoundUtils';
import { scaleHeight, scaleWidth } from '@/src/utils';

interface Props {
	/** 누르면 상점으로 — 상점 화면 자신의 헤더에서는 끈다 (같은 화면이 겹쳐 쌓인다) */
	pressable?: boolean;
}

/** 보유 코인 — 헤더 오른쪽에 붙인다. 값이 오르면 한 번 튀고, 누르면 상점이 열린다 */
const CoinChip = ({ pressable = true }: Props) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const { coins } = useLife();
	const run = useAnimationRunner();
	const pop = useRef(new Animated.Value(1)).current;
	const prev = useRef(coins);

	useEffect(() => {
		if (coins > prev.current) {
			pop.setValue(1.3);
			run(Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true }));
		}
		prev.current = coins;
	}, [coins, pop, run]);

	const body = (
		<>
			<IconComponent type="materialCommunityIcons" name="circle-multiple" size={15} color={Colors.accentAmber} />
			<Text style={styles.text}>{coins.toLocaleString()}</Text>
			{pressable && <IconComponent type="materialCommunityIcons" name="storefront-outline" size={13} color={Colors.textSecondary} />}
		</>
	);

	if (!pressable) {
		return (
			<Animated.View style={[styles.chip, { transform: [{ scale: pop }] }]} accessibilityLabel={`코인 ${coins}개`}>
				{body}
			</Animated.View>
		);
	}

	return (
		<Animated.View style={{ transform: [{ scale: pop }] }}>
			<PressableScale
				style={styles.chip}
				scaleTo={0.94}
				accessibilityRole="button"
				accessibilityLabel={`코인 ${coins}개 · 상점 열기`}
				onPress={() => {
					playPop();
					router.push(`/${Paths.SHOP}` as never);
				}}>
				{body}
			</PressableScale>
		</Animated.View>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		chip: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(5),
			paddingHorizontal: Spacing.md,
			height: scaleHeight(32),
			borderRadius: Radius.pill,
			backgroundColor: Colors.accentAmberSoft,
		},
		text: { fontSize: Typography.bodySm, fontWeight: FontWeight.bold, color: Colors.textStrong },
	});

export default CoinChip;
