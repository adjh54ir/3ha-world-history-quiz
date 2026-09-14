import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useDispatch } from 'react-redux';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { WORLD_TOPICS } from '@/src/const/data/world/ConstWorldTopics';
import { WORLD_ENTRIES, ALL_WORLD_ENTRIES } from '@/src/const/data/world/ConstWorldEntries';
import { selectEntryImage } from '@/src/const/data/world/ConstWorldImages';
import { setFavorite } from '@/src/store/slice/LifeSlice';
import { useLife } from '@/src/hooks/useLife';
import type { WorldType } from '@/src/types/data/WorldType';
import { playPop } from '@/src/utils/SoundUtils';
import { scaledSize, scaleHeight } from '@/src/utils';

/** 주제를 고르지 않은 상태 */
const ALL = 'all';

/**
 * 세계 상식 항목 목록 — 찾아보는 사전.
 *
 * 560개를 한 줄씩 세우면 스크롤만 하다 끝나므로 주제 칩과 검색으로 좁힌다.
 * 배운 항목에는 표시가 붙고, 별을 눌러 즐겨찾기에 담는다 (홈·나의 활동이 같은 목록을 본다).
 */
const WorldListScreen = () => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const dispatch = useDispatch();
	const life = useLife();
	const [topicKey, setTopicKey] = useState<string>(ALL);
	const [keyword, setKeyword] = useState('');

	const learned = useMemo(() => new Set(life.learned), [life.learned]);
	const favorites = useMemo(() => new Set(life.favorites ?? []), [life.favorites]);

	const rows = useMemo(() => {
		const base = topicKey === ALL ? ALL_WORLD_ENTRIES : (WORLD_ENTRIES[topicKey as WorldType.TopicKey] ?? []);
		const word = keyword.trim();
		if (!word) {
			return base;
		}
		// 표제뿐 아니라 설명·값까지 훑는다 — '수도' 로 찾으면 수도 항목이, '베를린' 으로 찾으면 독일이 나와야 한다
		return base.filter(
			(entry) =>
				entry.name.includes(word) ||
				entry.summary.includes(word) ||
				Object.values(entry.fields).some((value) => value.includes(word)),
		);
	}, [topicKey, keyword]);

	const toggleFavorite = (id: string) => {
		playPop();
		dispatch(setFavorite({ id, on: !favorites.has(id) }));
	};

	const chips = [{ key: ALL, label: '전체' }, ...WORLD_TOPICS.map((topic) => ({ key: topic.key, label: topic.label }))];

	return (
		<SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
			<View style={styles.head}>
				<Text style={styles.title}>세계 상식 사전</Text>
				<View style={styles.search}>
					<IconComponent type="materialicons" name="search" size={18} color={Colors.textMuted} />
					<TextInput
						style={styles.input}
						value={keyword}
						onChangeText={setKeyword}
						placeholder="이름·설명·수도로 찾기"
						placeholderTextColor={Colors.textMuted}
						returnKeyType="search"
						accessibilityLabel="항목 검색"
					/>
					{keyword ? (
						<PressableScale onPress={() => setKeyword('')} accessibilityRole="button" accessibilityLabel="검색어 지우기">
							<IconComponent type="materialicons" name="close" size={18} color={Colors.textMuted} />
						</PressableScale>
					) : null}
				</View>
				<FlatList
					horizontal
					data={chips}
					keyExtractor={(item) => item.key}
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.chipRow}
					renderItem={({ item }) => (
						<PressableScale
							style={[styles.chip, item.key === topicKey && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}
							onPress={() => setTopicKey(item.key)}
							accessibilityRole="button">
							<Text style={[styles.chipText, item.key === topicKey && { color: Colors.textInverse }]}>{item.label}</Text>
						</PressableScale>
					)}
				/>
				<Text style={styles.count}>{`${rows.length.toLocaleString()}개`}</Text>
			</View>

			<FlatList
				data={rows}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.list}
				showsVerticalScrollIndicator={false}
				initialNumToRender={14}
				ListEmptyComponent={<Text style={styles.empty}>찾는 항목이 없다.</Text>}
				renderItem={({ item }) => {
					const image = selectEntryImage(item.id.split('-')[0] as WorldType.TopicKey, item);
					const on = favorites.has(item.id);
					return (
						<View style={styles.row}>
							<View style={styles.thumb}>
								{image ? (
									<Image source={image} style={styles.thumbImage} contentFit="contain" transition={120} />
								) : (
									<Text style={styles.thumbText}>{item.name.slice(0, 2)}</Text>
								)}
							</View>
							<View style={styles.rowText}>
								<View style={styles.rowHead}>
									<Text style={styles.rowName} numberOfLines={1}>
										{item.name}
									</Text>
									{learned.has(item.id) ? <IconComponent type="materialcommunityicons" name="check-circle" size={14} color={Colors.success} /> : null}
								</View>
								<Text style={styles.rowSummary} numberOfLines={2}>
									{item.summary}
								</Text>
							</View>
							<PressableScale onPress={() => toggleFavorite(item.id)} accessibilityRole="button" accessibilityLabel={`${item.name} 즐겨찾기`}>
								<IconComponent type="materialcommunityicons" name={on ? 'star' : 'star-outline'} size={20} color={on ? Colors.warning : Colors.textMuted} />
							</PressableScale>
						</View>
					);
				}}
			/>
		</SafeAreaView>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: Colors.background },
		head: { paddingHorizontal: Spacing.lg, paddingTop: SpacingV.sm, gap: SpacingV.sm },
		title: { fontSize: Typography.h2, fontWeight: FontWeight.bold, color: Colors.textStrong },
		search: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.sm,
			paddingHorizontal: Spacing.md,
			height: scaledSize(42),
			borderRadius: Radius.pill,
			backgroundColor: Colors.surfaceAlt,
		},
		input: { flex: 1, fontSize: Typography.body, color: Colors.text, padding: 0 },
		chipRow: { gap: Spacing.xs, paddingVertical: SpacingV.xs },
		chip: {
			paddingHorizontal: Spacing.md,
			paddingVertical: scaleHeight(6),
			borderRadius: Radius.pill,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: Colors.border,
			backgroundColor: Colors.surface,
		},
		chipText: { fontSize: Typography.footnote, fontWeight: FontWeight.medium, color: Colors.text },
		count: { fontSize: Typography.caption, color: Colors.textSecondary },

		list: { paddingHorizontal: Spacing.lg, paddingTop: SpacingV.sm, paddingBottom: SpacingV.xxl, gap: SpacingV.xs },
		row: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			paddingHorizontal: Spacing.md,
			paddingVertical: SpacingV.sm,
			borderRadius: Radius.lg,
			backgroundColor: Colors.surface,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: Colors.border,
		},
		thumb: {
			width: scaledSize(44),
			height: scaledSize(44),
			borderRadius: Radius.md,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.surfaceAlt,
			overflow: 'hidden',
		},
		thumbImage: { width: '100%', height: '100%' },
		thumbText: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textSecondary },
		rowText: { flex: 1, gap: scaleHeight(2) },
		rowHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
		rowName: { flexShrink: 1, fontSize: Typography.callout, fontWeight: FontWeight.semibold, color: Colors.textStrong },
		rowSummary: { fontSize: Typography.footnote, color: Colors.textSecondary, lineHeight: scaledSize(18) },
		empty: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', paddingVertical: SpacingV.xxl },
	});

export default WorldListScreen;
