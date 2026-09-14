import React, { useMemo } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import BottomHomeButton from '@/src/four/screens/common/BottomHomeButton';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useScreenEnter } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { WORLD_TOPICS } from '@/src/const/data/world/ConstWorldTopics';
import { WORLD_ENTRIES } from '@/src/const/data/world/ConstWorldEntries';
import { Paths } from '@/src/navigation/conf/Paths';
import { playPop } from '@/src/utils/SoundUtils';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

/**
 * 세계 상식 — 주제 고르기.
 *
 * 주제마다 카드 한 장이고, 카드 안에서 바로 "카드 학습" 과 "퀴즈" 를 고른다.
 * 카드 전체를 누르게 하고 안에 버튼을 또 넣으면 어디를 눌렀는지 헷갈려서,
 * 누르는 자리를 아래 두 버튼으로만 못 박았다.
 */
const WorldTopicsScreen = () => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const enterStyle = useScreenEnter();

	/** 주제별 항목 수 — 데이터가 안 바뀌므로 한 번만 센다 */
	const counts = useMemo(
		() => WORLD_TOPICS.map((topic) => ({ topic, count: WORLD_ENTRIES[topic.key].length })),
		[],
	);
	const total = counts.reduce((sum, item) => sum + item.count, 0);

	const go = (pathname: string, topic: string) => {
		playPop();
		router.push({ pathname: `/${pathname}`, params: { topic } } as never);
	};

	return (
		<SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<Animated.View style={[styles.stack, enterStyle]}>
					<View style={styles.header}>
						<Text style={styles.title}>세계 상식</Text>
						<Text style={styles.subtitle}>{`${WORLD_TOPICS.length}개 주제 · ${total.toLocaleString()}개 항목`}</Text>
					</View>

					<View style={styles.grid}>
						{counts.map(({ topic, count }) => (
							<View key={topic.key} style={[styles.card, { backgroundColor: Colors.surface }]}>
								<View style={[styles.cardArt, { backgroundColor: Colors[topic.tint] }]}>
									<IconComponent type="materialcommunityicons" name={topic.icon} size={30} color={Colors[topic.color]} />
								</View>
								<View style={styles.cardBody}>
									<Text style={styles.cardLabel} numberOfLines={1}>
										{topic.label}
									</Text>
									<Text style={styles.cardDesc} numberOfLines={2}>
										{topic.description}
									</Text>
									<Text style={[styles.cardCount, { color: Colors[topic.color] }]}>{`${count}개 · ${topic.modes.length}가지 유형`}</Text>
								</View>
								<View style={styles.cardActions}>
									<PressableScale
										style={[styles.action, { backgroundColor: Colors[topic.tint] }]}
										onPress={() => go(Paths.WORLD_STUDY, topic.key)}
										accessibilityRole="button"
										accessibilityLabel={`${topic.label} 카드 학습`}>
										<IconComponent type="materialcommunityicons" name="cards-outline" size={15} color={Colors[topic.color]} />
										<Text style={[styles.actionText, { color: Colors[topic.color] }]}>학습</Text>
									</PressableScale>
									<PressableScale
										style={[styles.action, styles.actionFilled, { backgroundColor: Colors[topic.color] }]}
										onPress={() => go(Paths.WORLD_QUIZ, topic.key)}
										accessibilityRole="button"
										accessibilityLabel={`${topic.label} 퀴즈`}>
										<IconComponent type="materialcommunityicons" name="help-circle-outline" size={15} color={Colors.textInverse} />
										<Text style={[styles.actionText, { color: Colors.textInverse }]}>퀴즈</Text>
									</PressableScale>
								</View>
							</View>
						))}
					</View>
				</Animated.View>
			</ScrollView>
			<BottomHomeButton />
		</SafeAreaView>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: Colors.background },
		content: { ...Layout.column, paddingHorizontal: Spacing.lg, paddingTop: SpacingV.md, paddingBottom: SpacingV.xxl },
		stack: { gap: SpacingV.lg },

		header: { gap: SpacingV.xs },
		title: { fontSize: Typography.h2, fontWeight: FontWeight.bold, color: Colors.textStrong },
		subtitle: { fontSize: Typography.bodySm, color: Colors.textSecondary },

		// 한 줄에 두 칸 — 더 좁히면 주제 이름이 두 줄로 접힌다
		grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
		card: {
			flexBasis: '47%',
			flexGrow: 1,
			borderRadius: Radius.xl,
			overflow: 'hidden',
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: Colors.border,
			...Shadow.card,
		},
		cardArt: { height: scaleHeight(72), alignItems: 'center', justifyContent: 'center' },
		cardBody: { paddingHorizontal: Spacing.md, paddingTop: SpacingV.sm, gap: SpacingV.xs },
		cardLabel: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textStrong },
		cardDesc: { fontSize: Typography.footnote, color: Colors.textSecondary, lineHeight: scaledSize(17) },
		cardCount: { fontSize: Typography.caption, fontWeight: FontWeight.semibold },

		cardActions: { flexDirection: 'row', gap: Spacing.xs, padding: Spacing.md },
		action: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: scaleWidth(4),
			paddingVertical: SpacingV.xs,
			borderRadius: Radius.pill,
		},
		actionFilled: {},
		actionText: { fontSize: Typography.caption, fontWeight: FontWeight.semibold },
	});

export default WorldTopicsScreen;
