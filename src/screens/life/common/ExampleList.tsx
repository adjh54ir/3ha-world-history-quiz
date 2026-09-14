import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { ColorToken, Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useAnimationRunner } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import type { LifeType } from '@/src/types/data/LifeType';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

interface Props {
	word: LifeType.Word;
	/** 순번 배지와 단어를 칠할 색 — 보통 분야 색을 넘긴다 */
	accent?: ColorToken;
}

/**
 * 예문 목록 — 한 단어에 두 문장을 나란히 보여 준다.
 * 쓰임이 다른 두 문장을 함께 봐야 뜻이 몸에 붙기 때문에, 하나만 보여 주지 않는다.
 * 단어가 바뀔 때마다 위에서부터 차례로 떠오른다.
 */
const ExampleList = ({ word, accent = 'secondaryDark' }: Props) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const run = useAnimationRunner();
	const enter = useRef(word.examples.map(() => new Animated.Value(0))).current;

	useEffect(() => {
		enter.forEach((value) => value.setValue(0));
		run(
			Animated.stagger(
				90,
				enter.map((value) => Animated.timing(value, { toValue: 1, duration: 260, useNativeDriver: true })),
			),
		);
	}, [word.id, enter, run]);

	return (
		<View style={styles.list}>
			{word.examples.map((example, at) => {
				const [before, after] = example.split('{}');
				return (
					<Animated.View
						key={`${word.id}-example-${at}`}
						style={[
							styles.box,
							{
								opacity: enter[at],
								transform: [{ translateY: enter[at].interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(8), 0] }) }],
							},
						]}>
						<Text style={[styles.order, { backgroundColor: Colors[accent] }]}>{at + 1}</Text>
						<Text style={styles.text}>
							{before}
							<Text style={[styles.word, { color: Colors[accent] }]}>{word.reading}</Text>
							{after}
						</Text>
					</Animated.View>
				);
			})}
		</View>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		list: { width: '100%', gap: SpacingV.sm },
		box: {
			flexDirection: 'row',
			alignItems: 'flex-start',
			gap: Spacing.sm,
			paddingHorizontal: Spacing.lg,
			paddingVertical: SpacingV.md,
			borderRadius: Radius.md,
			backgroundColor: Colors.surfaceAlt,
		},
		order: {
			width: scaleWidth(18),
			height: scaleWidth(18),
			borderRadius: Radius.pill,
			marginTop: scaleHeight(2),
			textAlign: 'center',
			lineHeight: scaleWidth(18),
			fontSize: Typography.caption,
			fontWeight: FontWeight.bold,
			color: Colors.textInverse,
			overflow: 'hidden',
		},
		text: { flex: 1, fontSize: Typography.body, color: Colors.text, lineHeight: scaledSize(22) },
		word: { fontWeight: FontWeight.bold },
	});

export default ExampleList;
