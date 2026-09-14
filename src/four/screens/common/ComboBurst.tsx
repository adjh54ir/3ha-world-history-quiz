import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import IconComponent from './atomic/IconComponent';
import { Colors, withAlpha } from '@/src/four/const/ConstColors';
import { FontWeight, Radius, Spacing, SpacingV, Typography } from '@/src/four/const/ConstDesign';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils/DementionUtils';

interface Props {
	/** 지금까지 연속으로 맞힌 수. 이 값이 오를 때마다 한 번 터진다 */
	combo: number;
	/** 이 콤보부터 연출을 띄운다 (그 아래는 조용히 넘긴다) */
	minCombo?: number;
	/** 이 콤보부터 보상이 두 배 — 문구에 배수를 덧붙인다 */
	doubleFrom?: number;
	/** 이번 콤보로 얹힌 보너스 점수 — 있으면 함께 띄운다 */
	bonus?: number;
	/** 화면에서 세로로 어디쯤에 띄울지 (0~1) */
	top?: string;
}

/**
 * 연속 정답 보상 연출
 * -------------------------------------------------
 * 콤보로 보상이 늘어나는데 화면이 조용하면 그 사실이 전달되지 않는다.
 * 숫자가 한 번 크게 튀어 오르며 위로 흩어진다 — 손이 멈추는 순간이 없도록 터치는 그대로 통과시킨다.
 *
 * 퀴즈와 타임 챌린지가 같은 연출을 쓴다. 두 화면에 따로 두면 한쪽만 고쳐져 조금씩 달라진다.
 */
const ComboBurst = ({ combo, minCombo = 2, doubleFrom, bonus = 0, top = '40%' }: Props) => {
	const anim = useRef(new Animated.Value(0)).current;
	/** 연출이 도는 동안 붙잡아 두는 값 — combo 가 0 으로 끊겨도 문구가 사라지지 않게 한다 */
	const [shown, setShown] = useState<{ combo: number; bonus: number } | null>(null);
	/** 직전에 터뜨린 콤보 — 같은 값으로 다시 렌더돼도 두 번 터지지 않는다 */
	const fired = useRef(0);

	useEffect(() => {
		if (combo < minCombo || combo === fired.current) {
			// 연속이 끊기면 다음 콤보에서 다시 터질 수 있게 되돌려 둔다
			if (combo < minCombo) {
				fired.current = 0;
			}
			return;
		}
		fired.current = combo;
		setShown({ combo, bonus });
		anim.setValue(0);
		const burst = Animated.timing(anim, {
			toValue: 1,
			duration: 1000,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: true,
		});
		burst.start(({ finished }) => {
			// 화면을 벗어나 끊긴 경우엔 이미 사라진 뒤라 상태를 건드리지 않는다
			if (finished) {
				setShown(null);
			}
		});
		return () => burst.stop();
	}, [anim, bonus, combo, minCombo]);

	useEffect(() => () => anim.stopAnimation(), [anim]);

	if (!shown) {
		return null;
	}

	const doubled = doubleFrom !== undefined && shown.combo >= doubleFrom;

	return (
		<Animated.View
			pointerEvents="none"
			style={[
				styles.wrap,
				{
					top: top as never,
					opacity: anim.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
					transform: [
						{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -scaleHeight(46)] }) },
						{ scale: anim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.6, 1.15, 1] }) },
					],
				},
			]}>
			<View style={styles.badge}>
				<IconComponent type="materialCommunityIcons" name="fire" size={scaledSize(26)} color={Colors.accentOrange} />
				<Text style={styles.count}>{shown.combo}</Text>
				<Text style={styles.label}>Combo</Text>
			</View>
			{(doubled || shown.bonus > 0) && (
				<View style={styles.rewardChip}>
					<Text style={styles.rewardText}>{doubled ? (shown.bonus > 0 ? `보상 ×2 · +${shown.bonus}점` : '보상 ×2') : `+${shown.bonus}점`}</Text>
				</View>
			)}
		</Animated.View>
	);
};

const makeStyles = () =>
	StyleSheet.create({
		wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: SpacingV.xs, zIndex: 20 },
		badge: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.xs,
			paddingHorizontal: Spacing.lg,
			paddingVertical: SpacingV.sm,
			borderRadius: Radius.pill,
			backgroundColor: withAlpha(Colors.darkPanelDeep, 0.88),
		},
		count: { fontSize: Typography.display, fontWeight: FontWeight.heavy, color: Colors.textInverse },
		label: { marginTop: scaleHeight(6), fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: Colors.accentOrangeMid },
		rewardChip: {
			paddingHorizontal: Spacing.md,
			height: scaleHeight(24),
			justifyContent: 'center',
			borderRadius: Radius.pill,
			backgroundColor: Colors.accentOrange,
			minWidth: scaleWidth(64),
		},
		rewardText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: Colors.textInverse, textAlign: 'center' },
	});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});

export default ComboBurst;
