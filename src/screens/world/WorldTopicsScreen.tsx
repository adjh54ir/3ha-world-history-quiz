import React, { useMemo } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import BottomHomeButton from '@/src/four/screens/common/BottomHomeButton';
import { useWorldGuide } from './common/WorldGuide';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useScreenEnter } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { WORLD_TOPICS } from '@/src/const/data/world/ConstWorldTopics';
import { WORLD_ENTRIES } from '@/src/const/data/world/ConstWorldEntries';
import { selectEntryImage } from '@/src/const/data/world/ConstWorldImages';
import { Paths } from '@/src/navigation/conf/Paths';
import { playPop } from '@/src/utils/SoundUtils';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

/** 카드 머리에 세우는 미리보기 장수 — 넉 장을 넣으면 한 장이 손톱만 해진다 */
const PREVIEW_COUNT = 3;
/** 미리보기 칸이 작다 — 받아 오는 그림(위인 초상)도 그 크기로만 받는다 */
const PREVIEW_WIDTH = 160;

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

	const { button, guide } = useWorldGuide('world-topics', [
		'주제를 고르면 그 안에서 학습과 퀴즈를 바로 시작할 수 있어요.',
		'카드 아래 왼쪽은 학습, 오른쪽은 퀴즈예요.',
		'주제마다 묻는 방식이 여러 가지라 같은 주제도 매번 다르게 나와요.',
	]);

	/**
	 * 주제별 항목 수와 카드 머리에 걸 미리보기 — 데이터가 안 바뀌므로 한 번만 센다.
	 * 그림이 없는 주제(랜드마크·별자리·대회)는 빈 배열이고, 그 자리는 주제 아이콘이 대신한다.
	 */
	const counts = useMemo(
		() =>
			WORLD_TOPICS.map((topic) => {
				const pool = WORLD_ENTRIES[topic.key];
				const previews: NonNullable<ReturnType<typeof selectEntryImage>>[] = [];
				for (const entry of pool) {
					if (previews.length >= PREVIEW_COUNT) {
						break;
					}
					const image = selectEntryImage(topic.key, entry, PREVIEW_WIDTH);
					if (image) {
						previews.push(image);
					}
				}
				return { topic, count: pool.length, previews };
			}),
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
						<View style={styles.headerText}>
							<Text style={styles.title}>세계 상식</Text>
							<Text style={styles.subtitle}>{`${WORLD_TOPICS.length}개 주제 · ${total.toLocaleString()}개 항목`}</Text>
						</View>
						{button}
					</View>

					<View style={styles.grid}>
						{counts.map(({ topic, count, previews }) => (
							<View key={topic.key} style={[styles.card, { backgroundColor: Colors.surface }]}>
								<View style={[styles.cardArt, { backgroundColor: Colors[topic.tint] }]}>
									{previews.length > 0 ? (
										<View style={styles.previewRow}>
											{previews.map((image, at) => (
												<Image key={at} source={image} style={styles.preview} contentFit="contain" transition={160} />
											))}
										</View>
									) : (
										<IconComponent type="materialcommunityicons" name={topic.icon} size={30} color={Colors[topic.color]} />
									)}
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
			{guide}
		</SafeAreaView>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: Colors.background },
		content: { ...Layout.column, paddingHorizontal: Spacing.lg, paddingTop: SpacingV.md, paddingBottom: SpacingV.xxl },
		stack: { gap: SpacingV.lg },

		header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md },
		headerText: { flex: 1, gap: SpacingV.xs },
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
		cardArt: { height: scaleHeight(72), alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.sm },
		// 석 장을 겹치지 않고 나란히 — 칸이 좁아 간격은 4 로 못 박는다
		previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scaleWidth(6) },
		preview: { width: scaledSize(32), height: scaledSize(32), borderRadius: Radius.sm },
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
