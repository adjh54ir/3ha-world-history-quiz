import React, { useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import AppModal from '@/src/screens/common/atomic/AppModal';
import ExampleList from '@/src/screens/life/common/ExampleList';
import HanjaStrokePlayer from '@/src/screens/life/common/HanjaStrokePlayer';
import HanjaTraceOverlay from './HanjaTraceOverlay';
import LevelChip from '@/src/screens/life/common/LevelChip';
import ModalIconButton from '@/src/screens/common/atomic/ModalIconButton';
import { Palette } from '@/src/const/ConstColors';
import { HanjaGlyphSize, useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { HanjaFontStyle } from '@/src/hooks/useHanjaFont';
import { useSheetEnter } from '@/src/hooks/useAnimationRunner';
import { useFavorites } from '@/src/hooks/useLife';
import { useHangulReading } from '@/src/four/hooks/useHangulReading';
import { toggleFavorite } from '@/src/store/slice/LifeSlice';
import { FAVORITE_TOAST_IMAGES } from '@/src/const/data/life/ConstFeedbackImages';
import { showToast } from '@/src/screens/common/atomic/GlobalToast';
import { bridgeFavoriteToPorted } from '@/src/four/services/LifeBridge';
import { FontWeight, Layout, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { selectCategory } from '@/src/const/data/life/ConstLifeCategories';
import { LIFE_WORDS } from '@/src/const/data/life/ConstLifeWords';
import { selectHanjaInfo } from '@/src/const/data/life/ConstHanjaInfo';
import type { LifeType } from '@/src/types/data/LifeType';
import { Paths } from '@/src/navigation/conf/Paths';
import { playPop } from '@/src/utils/SoundUtils';
import { meaningToSentence, scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

interface Props {
	/** 열려 있는 단어 — null 이면 닫힌 상태 */
	word: LifeType.Word | null;
	onClose: () => void;
}

/** 단어 상세 — 목록에서 한 칸을 누르면 아래에서 올라온다 */
const WordDetailModal = ({ word, onClose }: Props) => (word ? <WordDetailSheet key={word.id} word={word} onClose={onClose} /> : null);

/**
 * 글자 밑에 붙는 정보 — 획수와 부수를 각각 한 줄씩, 교육용 기초한자면 별표.
 * 자료가 없으면 아무것도 그리지 않는다 (예전에는 0획으로 나왔다).
 *
 * 부수는 '부수' 라벨과 부수 글자만 적는다. 훈음('날 생')은 글자 바로 아래 한 곳에서만 읽히게 두고
 * 여기에 다시 붙이지 않는다 — 같은 훈음이 두 번 나오면 어느 쪽이 이 글자의 뜻인지 흐려진다.
 */
const CharFacts = ({ char }: { char: string }) => {
	const styles = useThemedStyles(createStyles);
	const info = selectHanjaInfo(char);
	if (!info.strokes) {
		return null;
	}
	return (
		<View style={styles.charFactsBox}>
			<Text style={styles.charFacts}>{`${info.strokes}획`}</Text>
			{!!info.radical && <Text style={styles.charFacts}>{`부수 ${info.radical}${info.education ? ' ★' : ''}`}</Text>}
			{!info.radical && info.education ? <Text style={styles.charFacts}>★</Text> : null}
		</View>
	);
};

/**
 * 독음이 같은 단어끼리 묶어 둔다 — '전기' 하나에 電氣·傳記·前期 가 걸린다.
 * 소리가 같아 헷갈리는 짝을 상세 화면에서 나란히 보여 주면 그 자리가 곧 학습거리가 된다.
 * 목록은 안 바뀌므로 모듈을 처음 읽을 때 한 번만 만든다.
 */
const BY_READING = LIFE_WORDS.reduce((map, item) => {
	map.set(item.reading, [...(map.get(item.reading) ?? []), item]);
	return map;
}, new Map<string, LifeType.Word[]>());

const WordDetailSheet = ({ word: opened, onClose }: { word: LifeType.Word; onClose: () => void }) => {
	/**
	 * 지금 펼쳐 놓은 단어. 아래 '같은 소리 다른 한자' 를 누르면 모달을 닫지 않고 그 단어로 갈아 끼운다.
	 * 부모가 다른 단어로 다시 열면 key 가 바뀌어 이 상태째로 새로 만들어진다.
	 */
	const [word, setWord] = useState(opened);
	/** 따라 쓰기 큰 화면에 넘길 글자들 — null 이면 닫힌 상태 (시트 스크롤 밖에서 쓴다) */
	const [traceChars, setTraceChars] = useState<string[] | null>(null);
	const bodyRef = useRef<ScrollView>(null);
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const insets = useSafeAreaInsets();
	const enterStyle = useSheetEnter(true, scaleHeight(24));
	const category = selectCategory(word.category);
	const dispatch = useDispatch();
	const favorites = useFavorites();
	const favorite = favorites.set.has(word.id);
	/** 설정에서 한글 훈음을 끄면 독음·훈음 줄을 감춘다 — 한자만 보고 스스로 읽어 보게 */
	const { showHangul } = useHangulReading();
	/** 소리가 같은 다른 한자어 — 없으면 그 칸을 아예 그리지 않는다 */
	const homophones = (BY_READING.get(word.reading) ?? []).filter((item) => item.id !== word.id);

	/** 이 단어가 속한 분야를 카드로 학습하러 간다 — 모달은 먼저 닫는다 */
	const goStudy = () => {
		playPop();
		onClose();
		router.push({ pathname: `/${Paths.STUDY}`, params: { category: word.category } } as never);
	};

	return (
		<AppModal visible onClose={onClose} align="bottom">
			<Animated.View style={[styles.sheet, { paddingBottom: SpacingV.lg + insets.bottom }, enterStyle]}>
				<View style={styles.handle} />
				<View style={styles.headRow}>
					<View style={styles.chipRow}>
						<View style={[styles.categoryChip, { backgroundColor: Colors[category.tint] }]}>
							<IconComponent type="materialCommunityIcons" name={category.icon} size={13} color={Colors[category.color]} />
							<Text style={[styles.categoryText, { color: Colors[category.color] }]}>{category.label}</Text>
						</View>
						<LevelChip level={word.level} />
					</View>
					<View style={styles.headActions}>
						{/* 즐겨찾기 — 목록의 별과 같은 상태를 본다 */}
						<ModalIconButton
							type="materialCommunityIcons"
							name={favorite ? 'star' : 'star-outline'}
							color={favorite ? Colors.accentAmber : Colors.textSecondary}
							onPress={() => {
								playPop();
								dispatch(toggleFavorite(word.id));
								// 오늘의 퀴즈·오답노트의 별과 같은 목록을 쓰도록 반대쪽 저장소에도 남긴다
								bridgeFavoriteToPorted(word.id, !favorite);
								// 단어 사전 목록과 같은 피드백 — 즐겨찾기를 누른 곳마다 같은 한마디가 뜬다
								showToast(favorite ? '즐겨찾기에서 뺐어요' : '즐겨찾기에 담았어요', favorite ? 'star-off' : 'star', {
									image: favorite ? FAVORITE_TOAST_IMAGES.removed : FAVORITE_TOAST_IMAGES.added,
									subMessage: `${word.reading} · ${favorite ? '목록에서 정리했어요' : '나중에 다시 볼 수 있어요'}`,
									duration: 1900,
								});
							}}
							accessibilityLabel={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
						/>
						<ModalIconButton name="close" color={Colors.textSecondary} onPress={onClose} accessibilityLabel="닫기" />
					</View>
				</View>

				<ScrollView ref={bodyRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
					{/* 한자를 획순대로 써 보여 준다 — 자료가 없는 글자는 글씨체로 대신 나온다.
					    '따라 쓰기' 를 누르면 스크롤 밖 큰 화면이 열린다 */}
					<HanjaStrokePlayer word={word.word} reading={showHangul ? word.reading : undefined} onTrace={setTraceChars} />

					{/* 뜻 — 이 단어를 보러 온 이유다. 한자 바로 아래 첫 칸에 둔다
					    (예전에는 글자별 훈음 아래에 있어 훈음을 다 읽고 나서야 단어 뜻이 나왔다) */}
					<View style={styles.meaningBox}>
						<View style={styles.meaningLabelRow}>
							<IconComponent type="materialCommunityIcons" name="lightbulb-on-outline" size={13} color={Colors.secondaryDark} />
							<Text style={styles.meaningLabel}>뜻</Text>
						</View>
						<Text style={styles.meaningText}>{meaningToSentence(word.meaning)}</Text>
					</View>

					{/* 글자 하나하나의 훈음 */}
					<View style={styles.charRow}>
						{word.chars.map((item, at) => (
							<View key={`${item.char}-${at}`} style={styles.charChip}>
								<Text style={styles.charGlyph}>{item.char}</Text>
								{showHangul && (
									<Text style={styles.charHun}>
										{item.hun} <Text style={styles.charEum}>{item.eum}</Text>
									</Text>
								)}
								<CharFacts char={item.char} />
							</View>
						))}
					</View>

					<View style={styles.exampleBox}>
						<Text style={styles.exampleLabel}>예문</Text>
						<ExampleList word={word} accent={category.color} />
					</View>

					{homophones.length > 0 && (
						<View style={styles.sameSoundBox}>
							{/* 한글 훈음을 끈 설정에서는 독음을 붙이지 않는다 — 위 독음 줄과 같은 규칙 */}
							<Text style={styles.sameSoundLabel}>
								{showHangul ? `같은 소리 다른 한자 · ${word.reading}` : '같은 소리 다른 한자'}
							</Text>
							{homophones.map((item) => (
								<PressableScale
									key={item.id}
									style={styles.sameSoundRow}
									scaleTo={0.98}
									onPress={() => {
										playPop();
										setWord(item);
										// 획순은 맨 위에 있다 — 갈아 끼운 단어를 처음부터 보게 되돌린다
										bodyRef.current?.scrollTo({ y: 0, animated: true });
									}}
									accessibilityRole="button"
									accessibilityLabel={`${item.word} 자세히 보기`}
								>
									<Text style={styles.sameSoundGlyph}>{item.word}</Text>
									<Text style={styles.sameSoundMeaning} numberOfLines={2}>
										{item.meaning}
									</Text>
									<IconComponent type="materialCommunityIcons" name="chevron-right" size={18} color={Colors.textMuted} />
								</PressableScale>
							))}
						</View>
					)}
				</ScrollView>

				<PressableScale style={styles.button} onPress={goStudy} accessibilityRole="button">
					<IconComponent type="materialCommunityIcons" name="cards" size={18} color={Colors.textInverse} />
					<Text style={styles.buttonText}>{`${category.label} 분야 학습하기`}</Text>
				</PressableScale>
			</Animated.View>

			{/* 따라 쓰기 — 시트 스크롤 밖(모달 전체)을 덮어 손가락이 판에만 닿게 한다 */}
			<HanjaTraceOverlay chars={traceChars} onClose={() => setTraceChars(null)} />
		</AppModal>
	);
};

const createStyles = (Colors: Palette, HanjaFont: HanjaFontStyle, Glyph: HanjaGlyphSize) =>
	StyleSheet.create({
		sheet: {
			...Layout.modalSheet,
			maxHeight: '86%',
			paddingHorizontal: Spacing.xl,
			paddingTop: SpacingV.sm,
			borderTopLeftRadius: Radius.xl,
			borderTopRightRadius: Radius.xl,
			backgroundColor: Colors.surface,
			gap: SpacingV.md,
		},
		handle: { alignSelf: 'center', width: scaleWidth(40), height: scaleHeight(4), borderRadius: Radius.pill, backgroundColor: Colors.borderStrong },
		headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
		headActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
		chipRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
		categoryChip: { flexDirection: 'row', alignItems: 'center', gap: scaleWidth(4), paddingHorizontal: Spacing.md, height: scaleHeight(28), borderRadius: Radius.pill },
		categoryText: { fontSize: Typography.caption, fontWeight: FontWeight.bold },

		body: { alignItems: 'center', gap: SpacingV.sm, paddingBottom: SpacingV.md },

		charRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginTop: SpacingV.sm },
		charChip: { alignItems: 'center', gap: scaleHeight(2), paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
		charGlyph: { ...HanjaFont, fontSize: Glyph.sm, color: Colors.textStrong },
		charHun: { fontSize: Typography.caption, color: Colors.textSecondary },
		// 훈은 뜻, 음은 읽는 소리 — 음만 굵게 해 눈에 먼저 들어오게 한다
		charEum: { fontWeight: FontWeight.bold, color: Colors.textStrong },
		// 획수·부수를 줄을 나눠 적는다 — 한 줄에 몰면 좁은 칩 안에서 제멋대로 끊긴다
		charFactsBox: { alignItems: 'center', gap: scaleHeight(1) },
		charFacts: { fontSize: Typography.caption, color: Colors.textMuted, textAlign: 'center' },

		// 뜻 — 예문 칸과 같은 폭·같은 여백. 색만 달리해 '뜻 → 예문' 순서가 눈에 잡히게 한다
		meaningBox: { width: '100%', marginTop: SpacingV.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.secondaryBg, gap: SpacingV.xs },
		meaningLabelRow: { flexDirection: 'row', alignItems: 'center', gap: scaleWidth(4) },
		meaningLabel: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.secondaryDark },
		meaningText: { fontSize: Typography.body, color: Colors.textStrong, lineHeight: scaledSize(21) },

		exampleBox: { width: '100%', marginTop: SpacingV.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.primaryBg, gap: SpacingV.sm },
		exampleLabel: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.primaryDark },

		// 같은 소리 다른 한자 — 예문 칸과 같은 폭·같은 여백을 쓰되, 면을 낮춰 예문이 먼저 읽히게 한다
		sameSoundBox: { width: '100%', marginTop: SpacingV.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt, gap: SpacingV.sm },
		sameSoundLabel: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textSecondary },
		sameSoundRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
		sameSoundGlyph: { ...HanjaFont, fontSize: Glyph.sm, color: Colors.textStrong },
		sameSoundMeaning: { flex: 1, fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: scaledSize(18) },

		button: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: Spacing.sm,
			height: scaleHeight(50),
			borderRadius: Radius.lg,
			backgroundColor: Colors.primarySurface,
		},
		buttonText: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textInverse },
	});

export default WordDetailModal;
