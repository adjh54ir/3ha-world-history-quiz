import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Keyboard, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import ScrollTopButton from '@/src/screens/common/atomic/ScrollTopButton';
import LifeHeader from './common/LifeHeader';
import LifeCharacterGuide, { useCharacterGuideOnce } from './common/LifeCharacterGuide';
import EmptyState from './common/EmptyState';
import { showToast } from '@/src/screens/common/atomic/GlobalToast';
import LevelChip from './common/LevelChip';
import WordDetailModal from './modal/WordDetailModal';
import AppModal from '@/src/screens/common/atomic/AppModal';
import { ColorToken, Palette } from '@/src/const/ConstColors';
import { HanjaGlyphSize, useColors, useTheme, useThemedStyles } from '@/src/hooks/useTheme';
import { HanjaFontStyle } from '@/src/hooks/useHanjaFont';
import { useDispatch } from 'react-redux';
import { useFavorites, useLife } from '@/src/hooks/useLife';
import { useAnimationRunner } from '@/src/hooks/useAnimationRunner';
import { toggleFavorite } from '@/src/store/slice/LifeSlice';
import { FAVORITE_TOAST_IMAGES } from '@/src/const/data/life/ConstFeedbackImages';
import { bridgeFavoriteToPorted } from '@/src/four/services/LifeBridge';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { LIFE_CATEGORIES, selectCategory } from '@/src/const/data/life/ConstLifeCategories';
import { LIFE_LEVELS } from '@/src/const/data/life/ConstLifeLevels';
import { LIFE_WORDS } from '@/src/const/data/life/ConstLifeWords';
import type { LifeType } from '@/src/types/data/LifeType';
import { playPop } from '@/src/utils/SoundUtils';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

const EMPTY_MASCOT = require('@/src/assets/illustrations/panda-wrong.webp');

/** 이만큼 내려가면 "맨 위로" 버튼을 띄운다 */
const SCROLL_TOP_THRESHOLD = scaleHeight(600);

/** 보기 방식 — 목록(사전) / 도감(수집) */
type ViewMode = 'list' | 'album';

/** 도감 한 줄에 놓는 카드 수 — 태블릿은 폭이 남아 더 놓는다 */
const ALBUM_COLUMNS = Layout.isTablet ? 5 : 3;

/** 검색어가 한자·독음·뜻·예문 중 하나에라도 걸리면 통과 */
const matches = (word: LifeType.Word, keyword: string) => {
	const key = keyword.trim().toLowerCase();
	if (!key) {
		return true;
	}
	return (
		word.word.includes(key) ||
		word.reading.includes(key) ||
		word.meaning.toLowerCase().includes(key) ||
		word.chars.some((char) => char.char.includes(key) || `${char.hun}${char.eum}`.includes(key))
	);
};

/**
 * 단어 탭 — 생활 한자어를 검색·분야별로 찾아본다.
 * 목록에서 누르면 상세 모달이 열려 글자 훈음과 예문까지 한 번에 본다.
 */
const LifeWordsScreen = () => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	// iOS 키보드는 앱 테마를 따라가지 않는다 — 다크에서 흰 키보드가 화면 절반을 밝히지 않게 맞춰 준다
	const { isDark } = useTheme();
	const guide = useCharacterGuideOnce('life-words');
	const { learned } = useLife();
	const favorites = useFavorites();
	const dispatch = useDispatch();
	const listRef = useRef<FlatList<LifeType.Word>>(null);
	const [keyword, setKeyword] = useState('');
	const [category, setCategory] = useState<LifeType.CategoryKey | 'all'>('all');
	/** 난이도 필터 — 'all' 이면 전부 */
	const [level, setLevel] = useState<LifeType.Level | 'all'>('all');
	/** 즐겨찾기만 보기 — 분야·난이도와 따로 켜고 끈다 */
	const [favOnly, setFavOnly] = useState(false);
	/** 열려 있는 드롭다운 — 한 번에 하나만 연다 */
	const [openPicker, setOpenPicker] = useState<'level' | 'category' | null>(null);
	const [picked, setPicked] = useState<LifeType.Word | null>(null);
	const [showTop, setShowTop] = useState(false);
	const [mode, setMode] = useState<ViewMode>('list');
	const isAlbum = mode === 'album';

	const learnedSet = useMemo(() => new Set(learned), [learned]);
	const list = useMemo(
		() =>
			LIFE_WORDS.filter((word) => {
				if (favOnly && !favorites.set.has(word.id)) {
					return false;
				}
				if (category !== 'all' && word.category !== category) {
					return false;
				}
				if (level !== 'all' && word.level !== level) {
					return false;
				}
				return matches(word, keyword);
			}),
		[category, favOnly, favorites.set, keyword, level],
	);

	const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		setShowTop(event.nativeEvent.contentOffset.y > SCROLL_TOP_THRESHOLD);
	};

	/** 필터를 바꾸면 목록이 통째로 달라지므로 맨 위에서 다시 시작한다 */
	const toTop = useCallback(() => listRef.current?.scrollToOffset({ offset: 0, animated: false }), []);

	/**
	 * 필터 한 칸에 붙는 이름·그림·색.
	 * 글자만 있던 때는 스물여섯 개 분야가 전부 같은 회색 글씨라 무엇을 고른 상태인지 한눈에 안 들어왔다.
	 * '전체' 는 특정 항목이 아니므로 중립 아이콘과 무채색을 쓴다.
	 */
	// 안 고른 상태의 버튼 글씨는 '난이도'·'카테고리' 로 짧게 둔다 — 앞에 붙은 그림이 이미 무엇인지 말해 준다.
	// '난이도 전체' 를 그대로 두면 좁은 폰에서 두 칸으로 나뉜 버튼 안에서 글자가 잘렸다. 고르기 팝업에는 '전체' 를 그대로 쓴다.
	const levelMeta = level === 'all' ? { label: '난이도', icon: 'layers-triple-outline', color: 'textSecondary' as ColorToken } : LIFE_LEVELS[level - 1];
	const categoryMeta = category === 'all' ? { label: '카테고리', icon: 'shape-outline', color: 'textSecondary' as ColorToken } : selectCategory(category);
	const levelLabel = levelMeta.label;
	const categoryLabel = categoryMeta.label;

	/** 고르기 팝업에 세우는 줄 — 난이도와 카테고리가 같은 모양(그림 + 이름 + 체크)을 쓴다 */
	const pickerOptions: { key: LifeType.Level | LifeType.CategoryKey | 'all'; label: string; icon: string; color: ColorToken; tint: ColorToken }[] =
		openPicker === 'level'
			? [
					{ key: 'all', label: '난이도 전체', icon: 'layers-triple-outline', color: 'textSecondary', tint: 'surfaceAlt' },
					...LIFE_LEVELS.map((item) => ({ key: item.level, label: item.label, icon: item.icon, color: item.color, tint: item.tint })),
				]
			: [
					{ key: 'all', label: '카테고리 전체', icon: 'shape-outline', color: 'textSecondary', tint: 'surfaceAlt' },
					...LIFE_CATEGORIES.map((item) => ({ key: item.key, label: item.label, icon: item.icon, color: item.color, tint: item.tint })),
				];

	return (
		<SafeAreaView style={styles.safe} edges={['left', 'right']}>
			<LifeHeader title="단어 사전" subtitle={`생활 한자어 ${LIFE_WORDS.length}개`} onPressGuide={guide.open} />

			{/* 검색 + 분야 필터 */}
			<View style={styles.filterBox}>
				<View style={styles.searchRow}>
					<IconComponent type="materialIcons" name="search" size={20} color={Colors.textMuted} />
					<TextInput
						keyboardAppearance={isDark ? 'dark' : 'light'}
						style={styles.searchInput}
						value={keyword}
						onChangeText={setKeyword}
						placeholder="한자 · 독음 · 뜻으로 찾기"
						placeholderTextColor={Colors.textMuted}
						returnKeyType="search"
						onSubmitEditing={Keyboard.dismiss}
					/>
					{!!keyword && (
						<PressableScale style={styles.clearButton} onPress={() => setKeyword('')} scaleTo={0.9} accessibilityLabel="지우기">
							<IconComponent type="materialIcons" name="close" size={16} color={Colors.textSecondary} />
						</PressableScale>
					)}
				</View>

			{/*
				 * 필터 한 줄 — 난이도·카테고리는 드롭다운, 즐겨찾기는 따로 켜고 끄는 별.
				 * 예전에는 분야 칩이 가로로 스물여섯 개 흘러 화면 밖 분야는 찾지 못했다.
				 */}
				<View style={styles.filterRow}>
					<PressableScale
						style={[styles.dropdown, level !== 'all' && styles.dropdownOn]}
						onPress={() => {
							playPop();
							setOpenPicker('level');
						}}
						scaleTo={0.97}
						accessibilityRole="button"
						accessibilityLabel={`난이도 고르기, 지금 ${level === 'all' ? '난이도 전체' : levelLabel}`}>
						<IconComponent
							type="materialCommunityIcons"
							name={levelMeta.icon}
							size={16}
							color={level !== 'all' ? Colors.textInverse : Colors[levelMeta.color]}
						/>
						<Text style={[styles.dropdownText, level !== 'all' && styles.dropdownTextOn]} numberOfLines={1}>
							{levelLabel}
						</Text>
						<IconComponent type="materialIcons" name="expand-more" size={18} color={level !== 'all' ? Colors.textInverse : Colors.textSecondary} />
					</PressableScale>

					<PressableScale
						style={[styles.dropdown, category !== 'all' && styles.dropdownOn]}
						onPress={() => {
							playPop();
							setOpenPicker('category');
						}}
						scaleTo={0.97}
						accessibilityRole="button"
						accessibilityLabel={`카테고리 고르기, 지금 ${category === 'all' ? '카테고리 전체' : categoryLabel}`}>
						<IconComponent
							type="materialCommunityIcons"
							name={categoryMeta.icon}
							size={16}
							color={category !== 'all' ? Colors.textInverse : Colors[categoryMeta.color]}
						/>
						<Text style={[styles.dropdownText, category !== 'all' && styles.dropdownTextOn]} numberOfLines={1}>
							{categoryLabel}
						</Text>
						<IconComponent type="materialIcons" name="expand-more" size={18} color={category !== 'all' ? Colors.textInverse : Colors.textSecondary} />
					</PressableScale>

					{/* 즐겨찾기 — 켜면 별을 단 단어만 남는다 */}
					<PressableScale
						style={[styles.favFilter, favOnly && styles.favFilterOn]}
						onPress={() => {
							playPop();
							setFavOnly((previous) => !previous);
							toTop();
						}}
						scaleTo={0.94}
						accessibilityRole="button"
						accessibilityState={{ selected: favOnly }}
						accessibilityLabel={favOnly ? '즐겨찾기만 보기 끄기' : '즐겨찾기만 보기'}>
						<IconComponent
							type="materialCommunityIcons"
							name={favOnly ? 'star' : 'star-outline'}
							size={18}
							color={favOnly ? Colors.textInverse : Colors.accentAmber}
						/>
						<Text style={[styles.favFilterText, favOnly && styles.favFilterTextOn]}>{favorites.list.length}</Text>
					</PressableScale>
				</View>
			</View>

			<View style={styles.countRow}>
				<Text style={styles.countText}>{isAlbum ? `수집 ${list.filter((word) => learnedSet.has(word.id)).length} / ${list.length}` : `${list.length}개`}</Text>
				{!isAlbum && <Text style={styles.countLearned}>{`학습 완료 ${list.filter((word) => learnedSet.has(word.id)).length}개`}</Text>}
				{/* 목록 / 도감 전환 — 도감은 배운 단어만 공개되는 수집 카드 */}
				<View style={styles.modeRow}>
					{(
						[
							{ key: 'list', icon: 'view-list', label: '목록' },
							{ key: 'album', icon: 'view-grid', label: '도감' },
						] as const
					).map((item) => {
						const on = mode === item.key;
						return (
							<PressableScale
								key={item.key}
								style={[styles.modeChip, on && styles.modeChipOn]}
								onPress={() => {
									playPop();
									setMode(item.key);
									listRef.current?.scrollToOffset({ offset: 0, animated: false });
								}}
								scaleTo={0.94}
								accessibilityRole="button"
								accessibilityLabel={item.label}>
								<IconComponent type="materialCommunityIcons" name={item.icon} size={14} color={on ? Colors.textInverse : Colors.textSecondary} />
								<Text style={[styles.modeText, on && styles.modeTextOn]}>{item.label}</Text>
							</PressableScale>
						);
					})}
				</View>
			</View>

			<FlatList
				// 열 수가 바뀌면 FlatList 를 새로 만들어야 한다
				key={mode}
				ref={listRef}
				data={list}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.listContent}
				// 태블릿은 두 칸씩 — 폭이 남으니 한 화면에 두 배로 보여 준다. 도감은 항상 여러 칸
				numColumns={isAlbum ? ALBUM_COLUMNS : Layout.columns}
				columnWrapperStyle={isAlbum || Layout.columns > 1 ? styles.gridRow : undefined}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				onScrollBeginDrag={Keyboard.dismiss}
				onScroll={onScroll}
				scrollEventThrottle={64}
				initialNumToRender={12}
				windowSize={9}
				removeClippedSubviews
				ListEmptyComponent={
					<EmptyState
						image={EMPTY_MASCOT}
						title={favOnly ? '즐겨찾기한 단어가 없어요' : '찾는 단어가 없어요'}
						message={favOnly ? '목록에서 별을 눌러 자주 볼 단어를 모아 보세요.' : '검색어를 줄이거나 난이도·카테고리를 바꿔 보세요.'}
					/>
				}
				renderItem={({ item }) => {
					const meta = selectCategory(item.category);
					const done = learnedSet.has(item.id);
					const favorite = favorites.set.has(item.id);
					if (isAlbum) {
						return <AlbumCard word={item} learned={done} onOpen={() => setPicked(item)} />;
					}
					return (
						<PressableScale
							style={[styles.row, Layout.columns > 1 && styles.gridItem]}
							onPress={() => {
								playPop();
								setPicked(item);
							}}
							scaleTo={0.985}
							accessibilityRole="button"
							accessibilityLabel={`${item.word} ${item.reading}`}>
							<View style={[styles.rowGlyphBox, { backgroundColor: Colors[meta.tint] }]}>
								<Text style={styles.rowGlyph} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
									{item.word}
								</Text>
							</View>
							<View style={styles.rowText}>
								<View style={styles.rowTitleLine}>
									<Text style={styles.rowReading} numberOfLines={1}>
										{item.reading}
									</Text>
									{done && <IconComponent type="materialCommunityIcons" name="check-circle" size={15} color={Colors.success} />}
								</View>
								<Text style={styles.rowMeaning} numberOfLines={1}>
									{item.meaning}
								</Text>
								{/* 분야·급수는 아래 한 줄로 내린다 — 제목줄에 같이 두면 독음이 밀려 잘렸다 */}
								<View style={styles.rowMetaLine}>
									{/* 분야 그림 — 점 하나로는 스물여섯 분야가 색으로만 갈려 구분이 안 됐다 */}
									<IconComponent type="materialCommunityIcons" name={meta.icon} size={12} color={Colors[meta.color]} />
									<Text style={styles.rowMetaText} numberOfLines={1}>
										{meta.label}
									</Text>
									<LevelChip level={item.level} compact />
								</View>
							</View>
							{/* 즐겨찾기 — 행을 눌러 상세로 들어가는 것과 겹치지 않게 별만 따로 받는다 */}
							<PressableScale
								style={styles.favButton}
								onPress={() => {
									playPop();
									dispatch(toggleFavorite(item.id));
									// 오늘의 퀴즈·오답노트의 별과 같은 목록을 쓰도록 반대쪽 저장소에도 남긴다
									bridgeFavoriteToPorted(item.id, !favorite);
									// 별만 색이 바뀌면 눌렸는지 모른다 — 오늘의 퀴즈와 같이 한마디 띄운다
									showToast(favorite ? '즐겨찾기에서 뺐어요' : '즐겨찾기에 담았어요', favorite ? 'star-off' : 'star', {
										image: favorite ? FAVORITE_TOAST_IMAGES.removed : FAVORITE_TOAST_IMAGES.added,
										subMessage: `${item.reading} · ${favorite ? '목록에서 정리했어요' : '나중에 다시 볼 수 있어요'}`,
										duration: 1900,
									});
								}}
								scaleTo={0.85}
								hitSlop={8}
								accessibilityRole="button"
								accessibilityLabel={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}>
								<IconComponent
									type="materialCommunityIcons"
									name={favorite ? 'star' : 'star-outline'}
									size={20}
									color={favorite ? Colors.accentAmber : Colors.textMuted}
								/>
							</PressableScale>
						</PressableScale>
					);
				}}
			/>

			<ScrollTopButton visible={showTop} onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} />
			{/* 난이도·카테고리 고르기 — 목록 위에 겹치는 드롭다운 대신 팝업으로 연다 (FlatList 와 겹침 문제가 없다) */}
			<AppModal visible={openPicker !== null} onClose={() => setOpenPicker(null)} align="bottom">
				<View style={styles.pickerSheet}>
					<Text style={styles.pickerTitle}>{openPicker === 'level' ? '난이도' : '카테고리'}</Text>
					<ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
						{pickerOptions.map((option) => {
							const on = openPicker === 'level' ? level === option.key : category === option.key;
							return (
								<PressableScale
									key={String(option.key)}
									style={[styles.pickerRow, on && styles.pickerRowOn]}
									onPress={() => {
										playPop();
										if (openPicker === 'level') {
											setLevel(option.key as LifeType.Level | 'all');
										} else {
											setCategory(option.key as LifeType.CategoryKey | 'all');
										}
										setOpenPicker(null);
										toTop();
									}}
									scaleTo={0.98}
									accessibilityRole="button"
									accessibilityState={{ selected: on }}>
									<View style={[styles.pickerRowIcon, { backgroundColor: Colors[option.tint] }]}>
										<IconComponent type="materialCommunityIcons" name={option.icon} size={16} color={Colors[option.color]} />
									</View>
									<Text style={[styles.pickerRowText, on && styles.pickerRowTextOn]} numberOfLines={1}>
										{option.label}
									</Text>
									{on && <IconComponent type="materialIcons" name="check" size={18} color={Colors.primaryDark} />}
								</PressableScale>
							);
						})}
					</ScrollView>
				</View>
			</AppModal>
			<WordDetailModal word={picked} onClose={() => setPicked(null)} />
			{/* 화면 사용법 — 처음 들어오면 한 번, 이후에는 헤더의 물음표로 다시 본다 */}
			<LifeCharacterGuide visible={guide.visible} onClose={guide.close} lines={[
				'생활 한자어를 한곳에 모아 뒀어요. 위쪽 검색창으로 바로 찾아보세요.',
				'분야·즐겨찾기로 좁혀 보고, 목록과 도감 보기를 바꿔 볼 수 있어요.',
				'단어를 누르면 글자 훈음과 예문까지 한 번에 나와요.',
			]} />
		</SafeAreaView>
	);
};

/**
 * 도감 카드 — 배운 단어는 뒤집어 뜻을 보고, 안 배운 단어는 실루엣만 보인다.
 * 뒤집기는 Y축 회전 두 장을 겹쳐 만든다 (앞면 0→90°, 뒷면 90→0°).
 */
const AlbumCard = ({ word, learned, onOpen }: { word: LifeType.Word; learned: boolean; onOpen: () => void }) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const meta = selectCategory(word.category);
	const flip = useRef(new Animated.Value(0)).current;
	const flipped = useRef(false);
	// 목록을 스크롤하면 뒤집히는 중인 카드가 그대로 언마운트된다 — 러너가 남은 스프링을 끊는다
	const run = useAnimationRunner();

	const onPress = useCallback(() => {
		playPop();
		if (!learned) {
			showToast('카드 학습에서 배우면 공개돼요', 'lock-outline');
			return;
		}
		flipped.current = !flipped.current;
		run(Animated.spring(flip, { toValue: flipped.current ? 1 : 0, friction: 8, tension: 60, useNativeDriver: true }));
	}, [flip, learned, run]);

	if (!learned) {
		return (
			<PressableScale style={[styles.album, styles.albumLocked]} onPress={onPress} scaleTo={0.95} accessibilityRole="button" accessibilityLabel="아직 배우지 않은 단어">
				<Text style={styles.albumLockGlyph}>?</Text>
				<IconComponent type="materialCommunityIcons" name="lock-outline" size={13} color={Colors.textMuted} />
			</PressableScale>
		);
	}

	const front = { transform: [{ perspective: 800 }, { rotateY: flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] };
	const back = { transform: [{ perspective: 800 }, { rotateY: flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] }) }] };

	return (
		<PressableScale style={styles.album} onPress={onPress} onLongPress={onOpen} scaleTo={0.95} accessibilityRole="button" accessibilityLabel={`${word.word} ${word.reading}`}>
			<Animated.View style={[styles.albumFace, { backgroundColor: Colors[meta.tint] }, front]}>
				<Text style={styles.albumGlyph} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
					{word.word}
				</Text>
				<Text style={[styles.albumReading, { color: Colors[meta.color] }]} numberOfLines={1}>
					{word.reading}
				</Text>
			</Animated.View>
			<Animated.View style={[styles.albumFace, styles.albumBack, back]}>
				<Text style={styles.albumMeaning} numberOfLines={4}>
					{word.meaning}
				</Text>
				<Text style={styles.albumHint}>길게 눌러 상세</Text>
			</Animated.View>
		</PressableScale>
	);
};

const createStyles = (Colors: Palette, HanjaFont: HanjaFontStyle, Glyph: HanjaGlyphSize) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: Colors.background },

		filterBox: { ...Layout.column, paddingBottom: SpacingV.sm, gap: SpacingV.sm },
		searchRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.sm,
			marginHorizontal: Spacing.lg,
			paddingHorizontal: Spacing.md,
			height: scaleHeight(46),
			borderRadius: Radius.lg,
			backgroundColor: Colors.surface,
			...Shadow.card,
		},
		searchInput: { flex: 1, fontSize: Typography.body, color: Colors.text, padding: 0 },
		clearButton: {
			width: scaleWidth(24),
			height: scaleWidth(24),
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.surfaceAlt,
		},
		// 필터 한 줄 — 난이도·카테고리 드롭다운 두 칸이 폭을 반씩 나누고, 별은 고정 폭이다
		filterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.lg },
		dropdown: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: Spacing.xs,
			paddingLeft: Spacing.md,
			paddingRight: Spacing.sm,
			height: scaleHeight(40),
			borderRadius: Radius.md,
			backgroundColor: Colors.surface,
			borderWidth: 1,
			borderColor: Colors.border,
		},
		dropdownOn: { backgroundColor: Colors.primarySurface, borderColor: Colors.primaryDark },
		dropdownText: { flex: 1, fontSize: Typography.bodySm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
		dropdownTextOn: { color: Colors.textInverse },
		favFilter: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(3),
			paddingHorizontal: Spacing.sm,
			height: scaleHeight(40),
			borderRadius: Radius.md,
			backgroundColor: Colors.surface,
			borderWidth: 1,
			borderColor: Colors.border,
		},
		favFilterOn: { backgroundColor: Colors.accentAmber, borderColor: Colors.accentAmber },
		favFilterText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textSecondary, fontVariant: ['tabular-nums'] },
		favFilterTextOn: { color: Colors.textInverse },

		// 고르기 팝업 — 바닥에서 올라오는 목록
		pickerSheet: { width: '100%', gap: SpacingV.sm, paddingHorizontal: Spacing.lg, paddingTop: SpacingV.lg, paddingBottom: SpacingV.md, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, backgroundColor: Colors.surface },
		pickerTitle: { fontSize: Typography.title, fontWeight: FontWeight.heavy, color: Colors.textStrong },
		pickerScroll: { maxHeight: scaleHeight(360) },
		pickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, height: scaleHeight(46), borderRadius: Radius.md },
		pickerRowOn: { backgroundColor: Colors.primaryBg },
		// 그림 한 칸 — 줄마다 같은 크기라 이름 길이가 달라도 글자 시작점이 흔들리지 않는다
		pickerRowIcon: { width: scaleWidth(28), height: scaleWidth(28), alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
		pickerRowText: { flex: 1, fontSize: Typography.body, color: Colors.text },
		pickerRowTextOn: { fontWeight: FontWeight.bold, color: Colors.primaryDark },

		countRow: { ...Layout.column, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.sm },
		countText: { flex: 1, fontSize: Typography.bodySm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
		countLearned: { fontSize: Typography.caption, color: Colors.textMuted, marginRight: Spacing.sm },
		modeRow: { flexDirection: 'row', gap: scaleWidth(4), padding: scaleWidth(3), borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt },
		modeChip: { flexDirection: 'row', alignItems: 'center', gap: scaleWidth(3), paddingHorizontal: Spacing.sm, height: scaleHeight(26), borderRadius: Radius.pill },
		modeChipOn: { backgroundColor: Colors.primarySurface },
		modeText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textSecondary },
		modeTextOn: { color: Colors.textInverse },

		// 도감 카드 — 정사각형에 가깝게, 앞뒤 두 면을 같은 자리에 겹친다
		album: { flex: 1, aspectRatio: 0.82, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Colors.surface, ...Shadow.card },
		albumFace: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: scaleHeight(4), padding: Spacing.sm, backfaceVisibility: 'hidden' },
		albumBack: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg },
		albumGlyph: { ...HanjaFont, fontSize: Glyph.sm * 1.1, color: Colors.textStrong },
		albumReading: { fontSize: Typography.caption, fontWeight: FontWeight.bold },
		albumMeaning: { fontSize: Typography.caption, fontWeight: FontWeight.semibold, color: Colors.text, textAlign: 'center', lineHeight: scaledSize(16) },
		albumHint: { fontSize: scaledSize(9), color: Colors.textMuted },
		albumLocked: { alignItems: 'center', justifyContent: 'center', gap: scaleHeight(2), backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
		albumLockGlyph: { fontSize: Glyph.sm, fontWeight: FontWeight.heavy, color: Colors.borderStrong },

		listContent: { ...Layout.column, paddingHorizontal: Spacing.lg, paddingBottom: SpacingV.xxxl, gap: SpacingV.sm },
		// 두 칸 배치 — maxWidth 로 묶어 두면 마지막 홀수 카드가 혼자 폭을 다 먹지 않는다
		gridRow: { gap: Spacing.sm },
		gridItem: { flex: 1, maxWidth: '50%' },
		row: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			padding: Spacing.md,
			borderRadius: Radius.lg,
			backgroundColor: Colors.surface,
			...Shadow.card,
		},
		rowGlyphBox: { width: scaleWidth(54), height: scaleWidth(54), borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xs },
		rowGlyph: { ...HanjaFont, fontSize: Glyph.sm * 0.72, color: Colors.textStrong },
		rowText: { flex: 1, gap: scaleHeight(3) },
		rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
		rowReading: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.textStrong },
		rowMeaning: { fontSize: Typography.bodySm, color: Colors.textSecondary, lineHeight: scaledSize(19) },
		rowMetaLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: scaleHeight(2) },
		rowMetaText: { fontSize: Typography.caption, fontWeight: FontWeight.semibold, color: Colors.textMuted, marginRight: Spacing.xxs },
		// 별 버튼 — 손가락이 닿을 넓이를 확보하되 행 높이는 늘리지 않는다
		favButton: { width: scaleWidth(32), height: scaleWidth(32), alignItems: 'center', justifyContent: 'center' },
	});

export default LifeWordsScreen;
