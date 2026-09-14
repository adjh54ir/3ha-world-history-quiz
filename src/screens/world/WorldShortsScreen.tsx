import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import BottomHomeButton from '@/src/four/screens/common/BottomHomeButton';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { ALL_WORLD_ENTRIES, WORLD_ENTRIES } from '@/src/const/data/world/ConstWorldEntries';
import { selectTopic } from '@/src/const/data/world/ConstWorldTopics';
import { selectEntryImage } from '@/src/const/data/world/ConstWorldImages';
import { pickEntries } from '@/src/services/world/WorldRules';
import { bridgeWorldStudied } from '@/src/services/world/WorldBridge';
import { useLife } from '@/src/hooks/useLife';
import type { WorldType } from '@/src/types/data/WorldType';
import { playSwipe } from '@/src/utils/SoundUtils';
import { scaledSize, scaleHeight } from '@/src/utils';

/** 한 장이 화면을 꽉 채워야 다음 장이 살짝 보이지 않는다 */
const PAGE = Dimensions.get('window').height;

/**
 * 숏폼 학습 — 세로로 넘기며 한 화면에 한 항목.
 *
 * 카드 학습과 같은 내용을 보여 주지만 넘기는 맛이 다르다.
 * 주제를 고르지 않고 들어오면 전체에서 섞어 낸다 (심심할 때 훑어보는 자리).
 * 화면에 머문 항목은 배운 것으로 친다 — 진도·코인·미션이 카드 학습과 똑같이 오른다.
 */
const WorldShortsScreen = () => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const params = useLocalSearchParams<{ topic?: string }>();
	const life = useLife();
	const [at, setAt] = useState(0);

	const cards = useMemo(() => {
		const pool = params.topic ? (WORLD_ENTRIES[params.topic as WorldType.TopicKey] ?? ALL_WORLD_ENTRIES) : ALL_WORLD_ENTRIES;
		return pickEntries(pool, life.learned.length, pool.length);
		// 넘기는 도중에 순서가 바뀌면 보던 자리를 잃는다 — 첫 렌더의 값만 쓴다
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.topic]);

	const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
		const first = viewableItems[0];
		if (!first || first.index === null) {
			return;
		}
		setAt(first.index);
		playSwipe();
		bridgeWorldStudied((first.item as WorldType.Entry).id);
	}).current;

	const renderItem = useCallback(
		({ item }: { item: WorldType.Entry }) => {
			const topic = selectTopic(item.id.split('-')[0] as WorldType.TopicKey);
			const image = selectEntryImage(topic.key, item);
			return (
				<View style={styles.page}>
					<View style={[styles.art, { backgroundColor: Colors[topic.tint] }]}>
						{image ? (
							<Image source={image} style={styles.image} contentFit="contain" transition={200} />
						) : (
							<IconComponent type="materialcommunityicons" name={topic.icon} size={58} color={Colors[topic.color]} />
						)}
					</View>
					<View style={styles.body}>
						<View style={[styles.chip, { backgroundColor: Colors[topic.tint] }]}>
							<Text style={[styles.chipText, { color: Colors[topic.color] }]}>{topic.label}</Text>
						</View>
						<Text style={styles.name}>{item.name}</Text>
						<Text style={styles.summary}>{item.summary}</Text>
						{item.facts.map((fact) => (
							<View key={fact} style={styles.factRow}>
								<View style={[styles.dot, { backgroundColor: Colors[topic.color] }]} />
								<Text style={styles.factText}>{fact}</Text>
							</View>
						))}
					</View>
				</View>
			);
		},
		[Colors, styles],
	);

	return (
		<SafeAreaView style={styles.safe} edges={['left', 'right']}>
			<FlatList
				data={cards}
				keyExtractor={(item) => item.id}
				renderItem={renderItem}
				pagingEnabled
				showsVerticalScrollIndicator={false}
				snapToInterval={PAGE}
				decelerationRate="fast"
				getItemLayout={(_, index) => ({ length: PAGE, offset: PAGE * index, index })}
				onViewableItemsChanged={onViewable}
				viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
				initialNumToRender={2}
				windowSize={3}
			/>
			<View style={styles.counter} pointerEvents="none">
				<Text style={styles.counterText}>{`${at + 1} / ${cards.length}`}</Text>
			</View>
			<BottomHomeButton />
		</SafeAreaView>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: Colors.background },
		page: { height: PAGE, paddingHorizontal: Spacing.lg, paddingTop: SpacingV.xxl, gap: SpacingV.lg },
		art: { height: scaleHeight(230), borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
		image: { width: '100%', height: '100%' },

		body: { gap: SpacingV.sm },
		chip: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: scaleHeight(3), borderRadius: Radius.pill },
		chipText: { fontSize: Typography.caption, fontWeight: FontWeight.semibold },
		name: { fontSize: Typography.h1, fontWeight: FontWeight.bold, color: Colors.textStrong },
		summary: { fontSize: Typography.body, color: Colors.text, lineHeight: scaledSize(24) },
		factRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
		dot: { width: scaledSize(5), height: scaledSize(5), borderRadius: scaledSize(3), marginTop: scaledSize(8) },
		factText: { flex: 1, fontSize: Typography.bodySm, color: Colors.textSecondary, lineHeight: scaledSize(20) },

		counter: {
			position: 'absolute',
			top: scaleHeight(12),
			alignSelf: 'center',
			paddingHorizontal: Spacing.md,
			paddingVertical: scaleHeight(4),
			borderRadius: Radius.pill,
			backgroundColor: Colors.overlay,
		},
		counterText: { fontSize: Typography.caption, fontWeight: FontWeight.semibold, color: '#FFFFFF' },
	});

export default WorldShortsScreen;
