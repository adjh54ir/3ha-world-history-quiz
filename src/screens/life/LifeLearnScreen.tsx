import React, { useMemo, useState } from 'react';
import { Animated, Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import LifeCharacterGuide, { LifeGuideButton, useCharacterGuideOnce } from './common/LifeCharacterGuide';
import BottomHomeButton from '@/src/four/screens/common/BottomHomeButton';
import ProgressBar from './common/ProgressBar';
import StudyModeModal from './modal/StudyModeModal';
import EmptyState from './common/EmptyState';
import { Palette, onSurface } from '@/src/const/ConstColors';
import { HanjaGlyphSize, useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { HanjaFontStyle } from '@/src/hooks/useHanjaFont';
import { LIFE_WORDS } from '@/src/const/data/life/ConstLifeWords';
import { CategoryProgress, useCategoryProgress } from '@/src/hooks/useLife';
import { useScreenEnter } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { Paths } from '@/src/navigation/conf/Paths';
import { playPop } from '@/src/utils/SoundUtils';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

/** 목록을 좁히는 기준 — 분야가 26개라 아무 표시가 없으면 어디까지 했는지 찾기 어렵다 */
type Filter = 'all' | 'ongoing' | 'done';

const FILTERS: { key: Filter; label: string }[] = [
	{ key: 'all', label: '전체' },
	{ key: 'ongoing', label: '학습 중' },
	{ key: 'done', label: '학습 완료' },
];

/** 고른 학습 범위 — 분야 하나이거나(카테고리) 전체를 섞는 것(랜덤)이다 */
type StudyScope = { category?: string };

/**
 * 분야마다 표지에 깔 한자 한 낱말 — 그 분야의 첫 단어를 쓴다.
 * 목록이 안 바뀌므로 모듈을 처음 읽을 때 한 번만 만든다.
 * 아이콘만 있으면 표지 스물여섯 장이 전부 같은 얼굴이라, 글자 한 낱말로 각자 표정을 준다.
 */
const COVER_GLYPH = LIFE_WORDS.reduce((map, word) => {
	if (!map.has(word.category)) {
		map.set(word.category, word.word);
	}
	return map;
}, new Map<string, string>());

/**
 * 학습 — 위쪽에 전체 진도를 세워 두고, 아래로 분야를 앨범처럼 두 칸씩 늘어놓는다.
 *
 * 예전에는 카드마다 '카드'·'퀴즈' 버튼이 따로 있어 한 칸에 누를 곳이 세 군데였다.
 * 이제 어디를 눌러도 학습으로 간다 — 카드 학습과 숏폼 학습 중 무엇으로 볼지만 시트에서 고른다.
 * (퀴즈는 홈의 퀴즈 입구에서 시작한다)
 */
const LifeLearnScreen = () => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const guide = useCharacterGuideOnce('life-learn');
	const progress = useCategoryProgress();
	const enterStyle = useScreenEnter();
	const [filter, setFilter] = useState<Filter>('all');
	/** 고른 범위 — 값이 있으면 학습 방식 시트가 올라온다 */
	const [scope, setScope] = useState<StudyScope | null>(null);

	const openMode = (next: StudyScope) => {
		playPop();
		setScope(next);
	};

	/** 고른 방식으로 보낸다 — 시트를 먼저 닫고 이동한다 (닫기 전에 밀면 시트가 화면에 남는다) */
	const go = (pathname: string) => {
		const picked = scope;
		setScope(null);
		const params = picked?.category ? { category: picked.category, source: 'category' } : { shuffle: '1', source: 'random' };
		router.push({ pathname: `/${pathname}`, params } as never);
	};

	const learned = progress.reduce((sum, item) => sum + item.learned, 0);
	const total = progress.reduce((sum, item) => sum + item.total, 0);
	const percent = total ? Math.round((learned / total) * 100) : 0;
	const doneCount = progress.filter((item) => item.total > 0 && item.learned >= item.total).length;
	const starCount = progress.reduce((sum, item) => sum + item.stars, 0);

	const list = useMemo(
		() =>
			progress.filter((item) => {
				if (filter === 'ongoing') {
					return item.learned > 0 && item.learned < item.total;
				}
				if (filter === 'done') {
					return item.total > 0 && item.learned >= item.total;
				}
				return true;
			}),
		[filter, progress],
	);

	return (
		<SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
			{/*
			 * 헤더 띠를 두지 않는다 — 제목과 진도가 바로 아래 '학습 현황' 카드와 같은 말을 두 번 했다.
			 * 뒤로가기·도움말은 그 카드 제목 줄로 옮기고, 화면을 나가는 길은 아래 고정 HOME 버튼이 맡는다.
			 */}
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>
				<Animated.View style={[styles.stack, enterStyle]}>
					{/* 학습 현황 — 헤더가 없어졌으므로 이 카드가 화면 제목 역할까지 맡는다 */}
					<View style={styles.summary}>
						<View style={styles.summaryHead}>
							<PressableScale
								style={styles.summaryBack}
								onPress={() => {
									playPop();
									router.back();
								}}
								scaleTo={0.9}
								accessibilityRole="button"
								accessibilityLabel="뒤로 가기">
								<IconComponent type="materialIcons" name="arrow-back" size={20} color={Colors.text} />
							</PressableScale>
							<View style={styles.summaryTitleBox}>
								<Text style={styles.summaryTitle}>학습</Text>
								<Text style={styles.summarySub} numberOfLines={1}>{`${learned} / ${total} 단어 학습 완료`}</Text>
							</View>
							<Text style={styles.summaryPercent}>{percent}%</Text>
							<LifeGuideButton onPress={guide.open} />
						</View>
						<ProgressBar ratio={total ? learned / total : 0} height={scaleHeight(10)} />
						{/* 단어 수는 제목 줄에서 이미 읽었다 — 여기서는 남은 양과 분야 진도만 덧붙인다 */}
						<View style={styles.summaryMetaRow}>
							<Text style={styles.summaryMeta}>{`남은 ${total - learned}단어`}</Text>
							<Text style={styles.summaryMeta}>{`분야 정복 ${doneCount} / ${progress.length}`}</Text>
						</View>
						<View style={styles.summaryStarRow}>
							<IconComponent type="materialCommunityIcons" name="star" size={14} color={Colors.warning} />
							<Text style={styles.summaryStar}>{`별 ${starCount} / ${progress.length * 3}`}</Text>
							<Text style={styles.summaryStarHint}>학습 완료 · 퀴즈 80% · 퀴즈 만점</Text>
						</View>
					</View>

					{/* 세계 상식 입구 — 수도·랜드마크·신화·태양계·별자리·월드컵·올림픽 (한자와 별개 데이터다) */}
					<PressableScale
						style={styles.worldCard}
						onPress={() => {
							playPop();
							router.push(`/${Paths.WORLD}`);
						}}
						scaleTo={0.97}
						accessibilityRole="button"
						accessibilityLabel="세계 상식 주제 고르기">
						<View style={styles.worldIcon}>
							<IconComponent type="materialCommunityIcons" name="earth" size={22} color={Colors.primary} />
						</View>
						<View style={styles.worldText}>
							<Text style={styles.worldTitle}>세계 상식</Text>
							<Text style={styles.worldSub} numberOfLines={1}>
								7개 주제 · 카드 학습과 퀴즈
							</Text>
						</View>
						<IconComponent type="materialIcons" name="chevron-right" size={22} color={Colors.textMuted} />
					</PressableScale>

					{/* 전체 랜덤 학습 — 분야를 고르지 않고 26개 분야를 섞어서 한 장씩 넘긴다 */}
					<PressableScale
						style={styles.randomCard}
						onPress={() => openMode({})}
						scaleTo={0.97}
						accessibilityRole="button"
						accessibilityLabel="전체 랜덤 학습">
						<View style={styles.randomIcon}>
							<IconComponent type="materialCommunityIcons" name="shuffle-variant" size={22} color={Colors.textInverse} />
						</View>
						<View style={styles.randomText}>
							<Text style={styles.randomTitle}>전체 랜덤 학습</Text>
							<Text style={styles.randomDesc} numberOfLines={1}>
								{`${progress.length}개 분야를 섞어서 한 장씩 · 남은 ${total - learned}단어`}
							</Text>
						</View>
						<IconComponent type="materialIcons" name="chevron-right" size={22} color={Colors.textInverse} />
					</PressableScale>

					{/* 필터 */}
					<View style={styles.filterRow}>
						{FILTERS.map((item) => {
							const on = filter === item.key;
							return (
								<PressableScale
									key={item.key}
									style={[styles.filterChip, on && styles.filterChipOn]}
									onPress={() => {
										playPop();
										setFilter(item.key);
									}}
									scaleTo={0.95}
									accessibilityRole="button">
									<Text style={[styles.filterText, on && styles.filterTextOn]}>{item.label}</Text>
								</PressableScale>
							);
						})}
					</View>

					{list.length === 0 ? (
						<EmptyState
							variant="inline"
							icon="filter-variant-remove"
							message={filter === 'done' ? '아직 다 끝낸 분야가 없어요. 조금만 더!' : '학습 중인 분야가 아직 없어요. 전체에서 하나 골라 시작해 보세요.'}
						/>
					) : (
						<View style={styles.cardGrid}>
							{list.map((item, index) => (
								<CategoryAlbum key={item.category.key} item={item} index={index} onPress={() => openMode({ category: item.category.key })} />
							))}
						</View>
					)}

					<Text style={styles.footnote}>주제를 누르면 카드 학습과 숏폼 학습 중에서 고를 수 있어요.</Text>
				</Animated.View>
			</ScrollView>
			{/* 다른 화면과 같은 자리에 고정되는 홈 버튼 — 헤더를 내린 대신 나가는 길을 아래에 둔다 */}
			<BottomHomeButton paddingBottom={4} confirmTitle="학습을 닫을까요?" confirmMessage="지금까지의 학습 진도는 그대로 저장됩니다." />
			{/* 학습 방식 고르기 — 주제를 누르면 올라온다 */}
			<StudyModeModal visible={!!scope} onClose={() => setScope(null)} onPickCard={() => go(Paths.STUDY)} onPickShorts={() => go(Paths.SHORTS)} />
			{/* 화면 사용법 — 처음 들어오면 한 번, 이후에는 헤더의 물음표로 다시 본다 */}
			<LifeCharacterGuide visible={guide.visible} onClose={guide.close} lines={[
				'주제별 학습 진도를 관리하는 곳이에요.',
				'주제를 누르면 카드 학습과 숏폼 학습 중에서 고를 수 있어요.',
				'주제를 고르기 싫으면 맨 위 전체 랜덤 학습으로 바로 시작하세요.',
			]} />
		</SafeAreaView>
	);
};

/**
 * 주제 앨범 한 칸 — 두 칸씩 놓인다.
 * 눌러야 할 곳이 칸 전체 하나뿐이라, 안에는 "얼마나 했는지" 만 담는다.
 */
const CategoryAlbum = ({ item, index, onPress }: { item: CategoryProgress; index: number; onPress: () => void }) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const enterStyle = useScreenEnter(16, 240 + Math.min(index, 9) * 35);
	const { category } = item;
	const done = item.total > 0 && item.learned >= item.total;
	const percent = item.total ? Math.round(item.ratio * 100) : 0;

	return (
		<Animated.View style={[styles.gridCard, enterStyle]}>
			<PressableScale
				style={styles.album}
				onPress={onPress}
				scaleTo={0.96}
				accessibilityRole="button"
				accessibilityLabel={`${category.label} · ${item.learned} / ${item.total} 단어 학습`}>
				{/* 표지 — 분야 색으로 채운 정사각형. 별과 완료 도장은 표지 위에 얹는다 */}
				<View style={[styles.albumArt, { backgroundColor: Colors[category.tint] }]}>
					{/* 표지 글자 — 아이콘 뒤에 옅게 깔린다. 읽히는 대상이 아니라 무늬다 */}
					<Text style={[styles.albumGlyph, { color: Colors[category.color] }]} numberOfLines={1} accessible={false}>
						{COVER_GLYPH.get(category.key) ?? ''}
					</Text>
					<IconComponent type="materialCommunityIcons" name={category.icon} size={scaleWidth(38)} color={Colors[category.color]} />
					{done && (
						<View style={styles.albumDone}>
							<IconComponent type="materialCommunityIcons" name="check" size={12} color={onSurface(Colors.success)} />
							<Text style={styles.albumDoneText}>완료</Text>
						</View>
					)}
					<View style={styles.albumStars} accessibilityLabel={`별 ${item.stars}개`}>
						{[0, 1, 2].map((at) => (
							<IconComponent
								key={at}
								type="materialCommunityIcons"
								name={at < item.stars ? 'star' : 'star-outline'}
								size={13}
								color={at < item.stars ? Colors.warning : Colors.borderStrong}
							/>
						))}
					</View>
				</View>

				<View style={styles.albumBody}>
					<Text style={styles.albumTitle} numberOfLines={1}>
						{category.label}
					</Text>
					<ProgressBar ratio={item.ratio} color={Colors[category.color]} height={scaleHeight(5)} />
					<View style={styles.albumMetaRow}>
						<Text style={styles.albumCount}>
							{item.learned}
							<Text style={styles.albumCountTotal}>{`/${item.total}`}</Text>
						</Text>
						<Text style={styles.albumPercent}>{`${percent}%`}</Text>
					</View>
				</View>
			</PressableScale>
		</Animated.View>
	);
};

const createStyles = (Colors: Palette, HanjaFont: HanjaFontStyle, Glyph: HanjaGlyphSize) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: Colors.background },
		content: { ...Layout.column, paddingHorizontal: Spacing.lg, paddingBottom: SpacingV.xl },
		// 세계 상식 입구 — 한 줄 띠 카드. 분야 앨범과 생김새를 달리해 "다른 갈래" 임을 보인다
		worldCard: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			paddingHorizontal: Spacing.lg,
			paddingVertical: SpacingV.md,
			borderRadius: Radius.xl,
			backgroundColor: Colors.surface,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: Colors.border,
			...Shadow.card,
		},
		worldIcon: {
			width: scaledSize(42),
			height: scaledSize(42),
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.primaryBg,
		},
		worldText: { flex: 1, gap: scaleHeight(2) },
		worldTitle: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textStrong },
		worldSub: { fontSize: Typography.footnote, color: Colors.textSecondary },
		stack: { gap: SpacingV.md },
		// 주제 앨범 — 폰·태블릿 모두 한 줄에 두 칸 (표지가 작아지면 아이콘이 장식처럼 묻힌다)
		cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
		gridCard: { flexBasis: '47%', flexGrow: 1 },

		album: { borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: Colors.surface, ...Shadow.card },
		albumArt: { aspectRatio: 1.25, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
		albumGlyph: { ...HanjaFont, position: 'absolute', fontSize: Glyph.lg, opacity: 0.14 },
		albumDone: {
			position: 'absolute',
			top: Spacing.sm,
			right: Spacing.sm,
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(2),
			paddingHorizontal: Spacing.sm,
			height: scaleHeight(20),
			borderRadius: Radius.pill,
			backgroundColor: Colors.success,
		},
		albumDoneText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: onSurface(Colors.success) },
		albumStars: { position: 'absolute', bottom: Spacing.sm, flexDirection: 'row', gap: scaleWidth(1) },
		albumBody: { padding: Spacing.md, gap: scaleHeight(6) },
		albumTitle: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textStrong },
		albumMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
		albumCount: { fontSize: Typography.bodySm, fontWeight: FontWeight.heavy, color: Colors.textStrong },
		albumCountTotal: { fontSize: Typography.caption, fontWeight: FontWeight.medium, color: Colors.textMuted },
		albumPercent: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textMuted },

		summary: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, gap: SpacingV.sm, ...Shadow.card },
		// 헤더를 내린 뒤로는 이 줄이 화면 제목 줄이다 — 뒤로가기·제목·진도·도움말을 한 줄에 담는다
		summaryHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
		summaryBack: { width: scaleWidth(28), height: scaleWidth(28), alignItems: 'center', justifyContent: 'center', marginLeft: -scaleWidth(4) },
		summaryTitleBox: { flex: 1, gap: scaleHeight(1) },
		summaryTitle: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.textStrong },
		summarySub: { fontSize: Typography.caption, color: Colors.textSecondary },
		summaryPercent: { fontSize: Typography.h3, fontWeight: FontWeight.heavy, color: Colors.primaryDeep },
		summaryMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
		summaryMeta: { fontSize: Typography.caption, color: Colors.textSecondary },

		// 전체 랜덤 학습 — 분야 카드보다 한 단계 강한 면으로 깔아 "여기서 시작"이 먼저 읽히게 한다
		randomCard: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			paddingHorizontal: Spacing.lg,
			paddingVertical: SpacingV.md,
			borderRadius: Radius.xl,
			backgroundColor: Colors.primarySurface,
			...Shadow.card,
		},
		randomIcon: {
			width: scaleWidth(42),
			height: scaleWidth(42),
			borderRadius: Radius.md,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: 'rgba(255,255,255,0.18)',
		},
		randomText: { flex: 1, gap: scaleHeight(2) },
		randomTitle: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.textInverse },
		randomDesc: { fontSize: Typography.caption, color: Colors.textInverse, opacity: 0.85 },

		filterRow: { flexDirection: 'row', gap: Spacing.sm },
		filterChip: {
			paddingHorizontal: Spacing.lg,
			height: scaleHeight(34),
			justifyContent: 'center',
			borderRadius: Radius.pill,
			backgroundColor: Colors.surface,
			borderWidth: 1,
			borderColor: Colors.border,
		},
		filterChipOn: { backgroundColor: Colors.primarySurface, borderColor: Colors.primaryDark },
		filterText: { fontSize: Typography.bodySm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
		filterTextOn: { color: Colors.textInverse },

		summaryStarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: SpacingV.xs },
		summaryStar: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textStrong },
		summaryStarHint: { flex: 1, textAlign: 'right', fontSize: Typography.caption, color: Colors.textMuted },



		footnote: { marginTop: SpacingV.md, fontSize: Typography.caption, color: Colors.textMuted, textAlign: 'center', lineHeight: scaledSize(18) },
	});

export default LifeLearnScreen;
