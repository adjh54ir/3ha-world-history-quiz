import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, LayoutChangeEvent, ListRenderItemInfo, StyleSheet, Text, View, ViewToken } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useDispatch } from 'react-redux';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import LifeHeader from './common/LifeHeader';
import LifeCharacterGuide, { useCharacterGuideOnce } from './common/LifeCharacterGuide';
import LevelChip from './common/LevelChip';
import { useDecorSkin } from './common/LifeDecor';
import EmptyState from './common/EmptyState';
import StudyCompletionModal from './modal/StudyCompletionModal';
import ProgressBar from './common/ProgressBar';
import { Palette, onSurface } from '@/src/const/ConstColors';
import { HanjaGlyphSize, useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { HanjaFontStyle } from '@/src/hooks/useHanjaFont';
import { useAnimationRunner } from '@/src/hooks/useAnimationRunner';
import { useLife } from '@/src/hooks/useLife';
import { markLearned } from '@/src/store/slice/LifeSlice';
import { bridgeStudiedToStats } from '@/src/four/services/LifeBridge';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { useHangulReading } from '@/src/four/hooks/useHangulReading';
import { bumpActivity } from '@/src/four/utils/DailyActivityUtils';
import { LIFE_WORDS } from '@/src/const/data/life/ConstLifeWords';
import { selectCategory } from '@/src/const/data/life/ConstLifeCategories';
import { STUDY_TOAST_IMAGE } from '@/src/const/data/life/ConstFeedbackImages';
import type { LifeType } from '@/src/types/data/LifeType';
import { playPop, playComplete, playSwipe, startBgm, stopBgm } from '@/src/utils/SoundUtils';
import { showToast } from '@/src/screens/common/atomic/GlobalToast';
import { meaningToSentence, scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

/**
 * 이번 학습에 쓸 단어 목록.
 * 렌더 밖(useState 초기값)에서 한 번만 부른다 — 순서를 섞는 일은 렌더마다 하면 안 된다.
 */
const pickWords = (category?: string, shuffled = false): LifeType.Word[] => {
	const scoped = category ? LIFE_WORDS.filter((item) => item.category === category) : LIFE_WORDS;
	if (!shuffled) {
		return scoped;
	}
	const mixed = [...scoped];
	for (let at = mixed.length - 1; at > 0; at -= 1) {
		const swap = Math.floor(Math.random() * (at + 1));
		[mixed[at], mixed[swap]] = [mixed[swap], mixed[at]];
	}
	return mixed;
};

/** 학습 완료를 누르고 다음 장으로 넘어가기까지 — 완료 연출을 볼 짧은 틈 */
const AUTO_NEXT_DELAY = 520;

/** 목록 필터 — 기본은 아직 안 배운 것만 본다 (이미 배운 카드를 다시 넘기는 일이 없다) */
type ShortsFilter = 'all' | 'learning' | 'done';

const FILTERS: { key: ShortsFilter; label: string }[] = [
	{ key: 'all', label: '전체' },
	{ key: 'learning', label: '학습중' },
	{ key: 'done', label: '학습완료' },
];

/**
 * 숏폼 학습 — 한 화면에 단어 하나, 위로 넘기면 다음 단어.
 * -------------------------------------------------
 * 카드 학습(캐러셀)과 데이터·보상은 같고 넘기는 방향과 밀도만 다르다.
 * 한 장을 다 읽어야 다음이 보이므로, 화면 하나에 들어갈 만큼만 담는다
 * (한자 · 독음 · 글자 훈음 · 뜻 · 예문 한 줄 · 완료 버튼).
 *
 * 페이지 높이는 실제로 그려진 높이를 재서 쓴다. 화면 높이에서 빼는 식으로 계산하면
 * 헤더·상태바·내비게이션 바가 기기마다 달라 한 장이 조금씩 어긋난다.
 */
const LifeShortsScreen = () => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const guide = useCharacterGuideOnce('life-shorts');
	const params = useLocalSearchParams<{ category?: string; shuffle?: string }>();
	const life = useLife();
	const [index, setIndex] = useState(0);
	/** 훈음 보기 — 학습 카드 화면과 같은 전역 설정을 여기서도 켜고 끈다 */
	const { showHangul, setShowHangul } = useHangulReading();
	const listRef = useRef<FlatList<LifeType.Word>>(null);
	/** 페이지 한 장의 높이 — 리스트가 그려진 뒤에 정해진다 (0 이면 아직 잰 적 없음) */
	const [pageHeight, setPageHeight] = useState(0);

	/**
	 * 이번에 넘길 단어들.
	 * `shuffle=1` 로 들어오면(학습 화면의 "전체 랜덤 학습") 순서를 섞는다 — 카드 학습과 같은 규칙이다.
	 * 섞기는 화면에 들어올 때 한 번만 한다. 렌더 중에 섞으면 넘기던 장이 매번 뒤바뀐다 —
	 * 그래서 초기값 함수(useState)로 한 번만 돌리고 그 순서를 끝까지 들고 간다.
	 */
	const [allWords] = useState(() => pickWords(params.category, params.shuffle === '1'));
	const learnedSet = useMemo(() => new Set(life.learned), [life.learned]);
	/** 기본값은 '학습중' — 처음 들어오면 아직 안 배운 단어부터 나온다 */
	const [filter, setFilter] = useState<ShortsFilter>('learning');
	/**
	 * 지금 넘기고 있는 목록.
	 * 필터가 '학습중' 일 때 방금 완료한 카드가 곧바로 목록에서 빠지면 보고 있던 장이 사라진다 —
	 * 그래서 필터를 바꾼 순간의 목록을 붙잡아 두고, 완료 표시는 그 위에 얹기만 한다.
	 */
	const words = useMemo(() => {
		if (filter === 'all') {
			return allWords;
		}
		const done = filter === 'done';
		return allWords.filter((item) => learnedSet.has(item.id) === done);
		// 목록은 필터를 바꿀 때만 다시 만든다 (학습 완료로 지금 보던 장이 빠지지 않게)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [allWords, filter]);
	const learnedCount = useMemo(() => words.filter((item) => learnedSet.has(item.id)).length, [words, learnedSet]);
	const title = params.category ? selectCategory(params.category as LifeType.CategoryKey).label : '숏폼 학습';

	// 🎵 학습 카드 화면과 같은 배경음 — 화면을 벗어나면 끊는다 (설정에서 끄면 startBgm 이 그냥 돌아간다)
	useFocusEffect(
		useCallback(() => {
			startBgm('study');
			return stopBgm;
		}, []),
	);

	/**
	 * 이 분야를 이번에 다 끝냈으면 축하 팝업을 한 번 띄운다.
	 * 카드 학습(QuizStudyScreen)과 같은 팝업이라 두 학습 방식의 마무리가 같아진다.
	 * 이미 다 끝낸 상태로 들어온 경우에는 뜨지 않아야 해서, '차오른 순간'만 잡는다.
	 */
	const [scopeCleared, setScopeCleared] = useState(false);
	const wasFull = useRef(learnedCount >= words.length);
	/** 팝업은 "이번 목록을 다 채운 순간" 에만 뜬다 — 필터를 바꿔 목록이 통째로 갈린 경우는 아니다 */
	const lastFilter = useRef(filter);
	useEffect(() => {
		const filterChanged = lastFilter.current !== filter;
		lastFilter.current = filter;
		const before = wasFull.current;
		wasFull.current = words.length > 0 && learnedCount >= words.length;
		if (!filterChanged && !before && wasFull.current) {
			setScopeCleared(true);
		}
	}, [filter, learnedCount, words.length]);

	const onLayout = useCallback((event: LayoutChangeEvent) => {
		const { height } = event.nativeEvent.layout;
		// 소수점 높이는 스냅 위치가 한 장마다 조금씩 밀린다 — 정수로 끊는다
		setPageHeight(Math.floor(height));
	}, []);

	/** 화면의 절반 넘게 보이는 장을 "지금 보는 장"으로 삼는다 */
	const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
	/** 넘김 소리는 장이 실제로 바뀐 순간에만 낸다 — 화면에 처음 들어올 때도 한 번 불려서 첫 장에 소리가 나면 안 된다 */
	const shownIndexRef = useRef(0);
	const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
		const first = viewableItems[0];
		if (first?.index != null) {
			if (first.index !== shownIndexRef.current) {
				shownIndexRef.current = first.index;
				playSwipe(); // 🔊 다음 장으로 넘어감
			}
			setIndex(first.index);
		}
	}).current;

	/**
	 * 학습 완료를 누르면 다음 장으로 저절로 넘어간다.
	 * 완료 연출(버튼이 한 번 튀고 토스트가 뜬다)을 볼 짧은 틈을 두고 넘긴다 — 곧바로 넘기면 무엇을 눌렀는지 남지 않는다.
	 */
	const goNext = useCallback(
		(at: number) => {
			if (at >= words.length - 1) {
				return;
			}
			setTimeout(() => listRef.current?.scrollToIndex({ index: at + 1, animated: true }), AUTO_NEXT_DELAY);
		},
		[words.length],
	);

	const renderItem = useCallback(
		({ item, index: at }: ListRenderItemInfo<LifeType.Word>) => (
			<ShortPage word={item} height={pageHeight} learned={learnedSet.has(item.id)} isLast={at === words.length - 1} onLearned={() => goNext(at)} />
		),
		[pageHeight, learnedSet, words.length, goNext],
	);

	const getItemLayout = useCallback(
		(_: unknown, at: number) => ({ length: pageHeight, offset: pageHeight * at, index: at }),
		[pageHeight],
	);

	return (
		<SafeAreaView style={styles.safe} edges={['left', 'right']}>
			<LifeHeader title={title} subtitle={`${learnedCount} / ${words.length} 단어 학습 완료`} showBack onPressGuide={guide.open} />

			{/*
			 * 필터 + 훈음 — 무엇을 넘길지(전체 · 학습중 · 학습완료)와 훈음을 볼지 한 줄에서 정한다.
			 * 기본은 '학습중' 이라 이미 배운 카드를 다시 넘기지 않는다.
			 */}
			<View style={styles.toolRow}>
				<View style={styles.filterGroup}>
					{FILTERS.map((item) => {
						const on = filter === item.key;
						return (
							<PressableScale
								key={item.key}
								style={[styles.filterChip, on && styles.filterChipOn]}
								onPress={() => {
									playPop();
									setFilter(item.key);
									shownIndexRef.current = 0;
									setIndex(0);
									listRef.current?.scrollToOffset({ offset: 0, animated: false });
								}}
								scaleTo={0.94}
								accessibilityRole="button"
								accessibilityState={{ selected: on }}>
								<Text style={[styles.filterText, on && styles.filterTextOn]}>{item.label}</Text>
							</PressableScale>
						);
					})}
				</View>
				<PressableScale
					style={[styles.readingToggle, showHangul && styles.readingToggleOn]}
					onPress={() => {
						playPop();
						setShowHangul(!showHangul);
					}}
					scaleTo={0.94}
					accessibilityRole="button"
					accessibilityState={{ selected: showHangul }}
					accessibilityLabel={showHangul ? '훈음 끄기' : '훈음 켜기'}>
					<IconComponent
						type="materialCommunityIcons"
						name={showHangul ? 'eye-outline' : 'eye-off-outline'}
						size={15}
						color={showHangul ? Colors.textInverse : Colors.textSecondary}
					/>
					<Text style={[styles.readingText, showHangul && styles.readingTextOn]}>훈음</Text>
				</PressableScale>
			</View>

			{/* 진행 막대 — 지금 몇 번째 장인지 (학습 완료 수와는 다른 값이라 따로 둔다) */}
			<View style={styles.progressWrap}>
				<ProgressBar ratio={words.length ? (index + 1) / words.length : 0} height={scaleHeight(4)} />
				<Text style={styles.progressText}>{`${index + 1} / ${words.length}`}</Text>
			</View>

			{words.length === 0 ? (
				<EmptyState
					variant="inline"
					icon="cards-outline"
					message={filter === 'learning' ? '이 범위는 모두 학습했어요. 전체나 학습완료로 바꿔 보세요.' : filter === 'done' ? '아직 학습 완료한 단어가 없어요.' : '이 분야에는 아직 단어가 없어요.'}
				/>
			) : (
				<View style={styles.listWrap} onLayout={onLayout}>
					{/* 높이를 재기 전에 그리면 한 장이 0 높이로 잡혀 전부 겹친다 — 잰 뒤에만 목록을 만든다 */}
					{pageHeight > 0 && (
						<FlatList
							ref={listRef}
							data={words}
							keyExtractor={(item) => item.id}
							renderItem={renderItem}
							getItemLayout={getItemLayout}
							pagingEnabled
							snapToInterval={pageHeight}
							snapToAlignment="start"
							decelerationRate="fast"
							disableIntervalMomentum
							showsVerticalScrollIndicator={false}
							initialNumToRender={2}
							maxToRenderPerBatch={3}
							windowSize={3}
							removeClippedSubviews
							viewabilityConfig={viewabilityConfig}
							onViewableItemsChanged={onViewableItemsChanged}
						/>
					)}
				</View>
			)}
			{/* 이 분야를 다 익혔을 때 한 번 — 카드 학습과 같은 축하 팝업 */}
			<StudyCompletionModal
				visible={scopeCleared}
				scopeLabel={params.category ? title : '전체'}
				scopeTotal={words.length}
				learnedAll={life.learned.length}
				totalAll={LIFE_WORDS.length}
				onClose={() => setScopeCleared(false)}
				onQuiz={() => {
					setScopeCleared(false);
					router.push({ pathname: '/quiz', params: { source: 'category', ...(params.category ? { category: params.category } : {}) } } as never);
				}}
			/>

			{/* 화면 사용법 — 처음 들어오면 한 번, 이후에는 헤더의 물음표로 다시 본다 */}
			<LifeCharacterGuide visible={guide.visible} onClose={guide.close} lines={[
				'한 화면에 단어 하나씩, 위로 넘기며 익히는 학습이에요.',
				'한 장을 다 읽고 완료를 누르면 학습 기록에 쌓여요.',
			]} />
		</SafeAreaView>
	);
};

/**
 * 한 장 = 단어 하나.
 * 카드 자체는 부모가 잰 높이를 그대로 채워, 스크롤이 한 장 단위로 딱 떨어지게 한다.
 */
const ShortPage = ({ word, height, learned, isLast, onLearned }: { word: LifeType.Word; height: number; learned: boolean; isLast: boolean; onLearned: () => void }) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const insets = useSafeAreaInsets();
	const dispatch = useDispatch();
	const run = useAnimationRunner();
	const category = selectCategory(word.category);
	/** 사 둔 카드 테 — 카드 학습(QuizStudyScreen)과 같은 꾸미기가 숏폼 카드에도 걸린다 */
	const cardSkin = useDecorSkin();
	/** 학습 카드 화면의 '훈음 가리기' 와 같은 설정을 본다 */
	const { showHangul } = useHangulReading();
	/** 완료 버튼을 누를 때 한 번 튀는 크기 */
	const pop = useRef(new Animated.Value(1)).current;
	/** 아래 "위로 넘기기" 안내가 오르내리는 값 */
	const hint = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (isLast) {
			return;
		}
		hint.setValue(0);
		run(
			Animated.loop(
				Animated.sequence([
					Animated.timing(hint, { toValue: 1, duration: 780, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
					Animated.timing(hint, { toValue: 0, duration: 780, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
				]),
			),
		);
	}, [hint, run, isLast]);

	const onLearn = () => {
		if (learned) {
			playPop();
			showToast('이미 학습을 끝낸 단어예요', 'check-decagram');
			return;
		}
		// 학습 카드 화면의 '학습 완료' 버튼과 같은 소리 — 정답음(playCorrect)은 퀴즈 몫으로 남긴다
		playComplete();
		// 주간 리포트·요일 미션이 세는 날짜별 학습 수 — 카드 학습과 같은 자리에 쌓는다
		bumpActivity('study');
		pop.setValue(0.94);
		run(Animated.spring(pop, { toValue: 1, friction: 4, tension: 220, useNativeDriver: true }));
		dispatch(markLearned([word.id]));
		// 통계 탭은 이식 화면 저장소를 읽는다 — 여기에도 남겨야 숏폼으로만 공부해도 진척도가 오른다
		bridgeStudiedToStats(word.id);
		showToast(`${word.reading} 학습을 마쳤어요`, 'check-decagram', {
			image: STUDY_TOAST_IMAGE,
			subMessage: isLast ? '이 범위의 마지막 카드까지 완료했어요' : '학습 기록에 저장했어요 · 다음 카드로 이동해요',
			duration: isLast ? 2200 : 1800,
		});
		// 완료를 누르면 다음 장으로 저절로 넘어간다 (마지막 장이면 부모가 아무 일도 하지 않는다)
		onLearned();
	};

	// 예문은 한 장에 한 문장만 — 두 문장을 다 넣으면 뜻이 화면 밖으로 밀린다
	const [before, after] = word.examples[0].split('{}');

	return (
		<View style={[styles.page, { height, paddingBottom: insets.bottom + SpacingV.lg }]}>
			<View style={[styles.pageCard, cardSkin]}>
				<View style={styles.chipRow}>
					<View style={[styles.categoryChip, { backgroundColor: Colors[category.tint] }]}>
						<IconComponent type="materialCommunityIcons" name={category.icon} size={13} color={Colors[category.color]} />
						<Text style={[styles.categoryText, { color: Colors[category.color] }]}>{category.label}</Text>
					</View>
					<LevelChip level={word.level} />
					{learned && (
						<View style={styles.doneChip}>
							<IconComponent type="materialCommunityIcons" name="check" size={11} color={onSurface(Colors.success)} />
							<Text style={styles.doneText}>학습 완료</Text>
						</View>
					)}
				</View>

				<View style={styles.glyphBox}>
					<Text style={styles.glyph} numberOfLines={1} adjustsFontSizeToFit>
						{word.word}
					</Text>
					{/* 학습 카드에서 끈 '훈음 가리기' 는 여기에도 그대로 걸린다 — 설정 하나가 학습 화면 전부를 따른다 */}
					{showHangul && <Text style={styles.reading}>{word.reading}</Text>}
				</View>

				<View style={styles.charRow}>
					{word.chars.map((item, at) => (
						<View key={`${item.char}-${at}`} style={styles.charChip}>
							<Text style={styles.charGlyph}>{item.char}</Text>
							{showHangul && (
								<Text style={styles.charHun} numberOfLines={1}>
									{item.hun} <Text style={styles.charEum}>{item.eum}</Text>
								</Text>
							)}
						</View>
					))}
				</View>

				<Text style={styles.meaning}>{meaningToSentence(word.meaning)}</Text>

				<View style={styles.exampleBox}>
					<Text style={styles.exampleLabel}>예문</Text>
					<Text style={styles.exampleText}>
						{before}
						<Text style={[styles.exampleWord, { color: Colors[category.color] }]}>{word.reading}</Text>
						{after}
					</Text>
				</View>
			</View>

			<Animated.View style={{ transform: [{ scale: pop }] }}>
				<PressableScale
					style={[styles.learnButton, learned && styles.learnButtonDone]}
					onPress={onLearn}
					scaleTo={0.97}
					accessibilityRole="button"
					accessibilityLabel={learned ? '이미 학습한 단어' : '학습 완료로 표시'}>
					<IconComponent
						type="materialCommunityIcons"
						name={learned ? 'check-decagram' : 'check-circle-outline'}
						size={18}
						color={learned ? Colors.success : Colors.textInverse}
					/>
					<Text style={[styles.learnText, learned && styles.learnTextDone]}>{learned ? '학습 완료한 단어예요' : '학습 완료'}</Text>
				</PressableScale>
			</Animated.View>

			{/* 마지막 장에는 넘길 곳이 없으므로 안내를 지운다 */}
			{isLast ? (
				<Text style={styles.endHint}>마지막 단어예요. 수고했어요!</Text>
			) : (
				<Animated.View
					style={[
						styles.swipeHint,
						{
							opacity: hint.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
							transform: [{ translateY: hint.interpolate({ inputRange: [0, 1], outputRange: [0, -scaleHeight(5)] }) }],
						},
					]}>
					<IconComponent type="materialCommunityIcons" name="chevron-up" size={18} color={Colors.textMuted} />
					<Text style={styles.swipeText}>위로 넘겨 다음 단어</Text>
				</Animated.View>
			)}
		</View>
	);
};

const createStyles = (Colors: Palette, HanjaFont: HanjaFontStyle, Glyph: HanjaGlyphSize) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: Colors.background },
		listWrap: { flex: 1 },

		// 필터 + 훈음 한 줄 — 목록 위에 붙는 조작 줄
		toolRow: { ...Layout.column, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: SpacingV.sm },
		filterGroup: { flexDirection: 'row', gap: scaleWidth(4), padding: scaleWidth(3), borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt },
		filterChip: { paddingHorizontal: Spacing.md, height: scaleHeight(28), justifyContent: 'center', borderRadius: Radius.pill },
		filterChipOn: { backgroundColor: Colors.primarySurface },
		filterText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textSecondary },
		filterTextOn: { color: Colors.textInverse },
		readingToggle: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(4),
			paddingHorizontal: Spacing.md,
			height: scaleHeight(34),
			borderRadius: Radius.pill,
			borderWidth: 1,
			borderColor: Colors.border,
			backgroundColor: Colors.surface,
		},
		readingToggleOn: { backgroundColor: Colors.secondaryDark, borderColor: Colors.secondaryDark },
		readingText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textSecondary },
		readingTextOn: { color: onSurface(Colors.secondaryDark) },

		progressWrap: { ...Layout.column, paddingHorizontal: Spacing.lg, paddingBottom: SpacingV.sm, gap: scaleHeight(4) },
		progressText: { alignSelf: 'flex-end', fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textMuted },

		// 한 장 — 카드가 남는 높이를 다 먹고, 버튼과 안내가 그 아래에 붙는다
		page: { ...Layout.column, paddingHorizontal: Spacing.lg, paddingTop: SpacingV.xs, gap: SpacingV.sm },
		pageCard: {
			flex: 1,
			borderRadius: Radius.xl,
			backgroundColor: Colors.surface,
			paddingHorizontal: Spacing.lg,
			paddingVertical: SpacingV.lg,
			gap: SpacingV.md,
			...Shadow.card,
		},

		chipRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
		categoryChip: { flexDirection: 'row', alignItems: 'center', gap: scaleWidth(4), paddingHorizontal: Spacing.md, height: scaleHeight(28), borderRadius: Radius.pill },
		categoryText: { fontSize: Typography.caption, fontWeight: FontWeight.bold },
		doneChip: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(2),
			paddingHorizontal: Spacing.sm,
			height: scaleHeight(22),
			borderRadius: Radius.pill,
			backgroundColor: Colors.success,
		},
		// 다크에서 success 는 밝은 연두(#4ADE80)가 되어 흰 글씨가 1.9:1 로 사라진다 — 면 밝기에 맞춰 고른다
		doneText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: onSurface(Colors.success) },

		// 한자는 이 화면의 주인공 — 남는 높이를 먼저 가져간다
		glyphBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SpacingV.xs },
		glyph: { ...HanjaFont, fontSize: Glyph.lg, color: Colors.textStrong, letterSpacing: 2, textAlign: 'center' },
		reading: { fontSize: Typography.title, fontWeight: FontWeight.bold, color: Colors.primaryDeep },

		charRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm },
		charChip: { alignItems: 'center', gap: scaleHeight(2), paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
		charGlyph: { ...HanjaFont, fontSize: Glyph.sm, color: Colors.textStrong },
		charHun: { fontSize: Typography.caption, color: Colors.textSecondary },
		// 훈은 뜻, 음은 읽는 소리 — 음만 굵게 해 눈에 먼저 들어오게 한다
		charEum: { fontWeight: FontWeight.bold, color: Colors.textStrong },

		// 뜻풀이는 '~을 뜻합니다.' 한 문장이라 두 줄로 넘어가는 일이 잦다 — 줄 간격을 한 단계 넓혀 읽기 쉽게 둔다
		meaning: { fontSize: Typography.callout, color: Colors.text, textAlign: 'center', lineHeight: scaledSize(25) },

		exampleBox: { borderRadius: Radius.lg, backgroundColor: Colors.primaryBg, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.md, gap: scaleHeight(4) },
		exampleLabel: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.primaryDark },
		exampleText: { fontSize: Typography.body, color: Colors.text, lineHeight: scaledSize(22) },
		exampleWord: { fontWeight: FontWeight.heavy },

		learnButton: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: Spacing.sm,
			height: scaleHeight(50),
			borderRadius: Radius.lg,
			backgroundColor: Colors.primarySurface,
		},
		learnButtonDone: { backgroundColor: Colors.successSoft },
		learnText: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textInverse },
		learnTextDone: { color: Colors.success },

		swipeHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scaleWidth(2), height: scaleHeight(20) },
		swipeText: { fontSize: Typography.caption, color: Colors.textMuted, fontWeight: FontWeight.semibold },
		endHint: { textAlign: 'center', height: scaleHeight(20), fontSize: Typography.caption, color: Colors.textMuted, fontWeight: FontWeight.semibold },
	});

export default LifeShortsScreen;
