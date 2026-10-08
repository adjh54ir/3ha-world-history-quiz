/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useTranslation } from 'react-i18next';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import DomainIcon from '@/src/screens/common/atomic/DomainIcon';
import HighlightText from '@/src/screens/common/atomic/HighlightText';
import Colors, { readableOn, withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, Layout } from '@/src/const/ConstDesign';
import { isTablet, scaleArt, scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import LearnHubService from '@/src/services/LearnHubService';
import { categoryIcon, difficultyIcon } from '@/src/const/ConstQuizMeta';
import { themed } from '@/src/utils/ThemedStyles';
import EntryImage from '@/src/screens/common/atomic/EntryImage';

/**
 * 공통 학습 항목 카드 (목록용)
 * - 여러 화면(보관함/검색/오답복습/퀴즈 결과/이야기 피드 등)에서 반복되는 구조를 한 곳으로 통일
 * - 구조: [주제·카테고리·난이도 태그행 + (별)(>)] → 표제 → 해설 → 더 알아보기
 * - 값은 그대로 표시(표현만 담당). 화면별 부가 요소는 children 슬롯으로 주입.
 */
export interface LearnItemCardProps {
	/** 주제 키 (도메인 칩 아이콘·색상·타이틀 자동 결정) */
	domain: string;
	/** 카테고리 라벨 (주제 타이틀과 같으면 자동 숨김) */
	categoryLabel?: string;
	/** 난이도 라벨 */
	levelLabel?: string;
	/** 표제어 */
	title: string;
	subTitle?: string;
	/** 표제 아래 부제 한 줄 */
	subLine?: string;
	/** 정답 — 따옴표 아이콘 + 초록 강조 박스 (해설 위) */
	answer?: string;
	/** 정오답 마크 (태그행 맨 앞 원형 배지) */
	statusMark?: 'correct' | 'wrong';
	/** 번호 배지 (태그행 맨 앞, statusMark 와 동시 사용 시 번호가 먼저) */
	indexBadge?: { num: number; color?: string };
	/** 해설(설명) — … 처리 없이 전부 표시 */
	explanation?: string;
	/** 예시 목록 — '예시' 서브타이틀 + 각각 border */
	examples?: string[];
	/** 즐겨찾기 별 (undefined 면 별 미노출) */
	bookmarked?: boolean;
	onToggleBookmark?: () => void;
	/** 우측 '>' 상세 이동 표시 (기본 true) */
	showChevron?: boolean;
	/** 카드 탭 (상세 열기 등) */
	onPress?: () => void;
	/** 카드 맨 아래 부가 요소 (푸터·태그 등) */
	children?: React.ReactNode;

	// ── 커스텀 확장 포인트 ─────────────────────────────
	/** 태그행 우측(별·> 왼쪽)에 끼워넣을 요소 (삭제 버튼 등) */
	headerRight?: React.ReactNode;
	/** 단어 바로 아래 슬롯 (뱃지·부가 정보 등) */
	belowTitle?: React.ReactNode;
	/** 예시 서브타이틀 문구 교체 (기본 '더 알아보기') */
	exampleTitle?: string;
	/** 예시 항목 커스텀 렌더러 (지정 시 기본 border 박스 대신 사용) */
	renderExample?: (ex: string, index: number) => React.ReactNode;
	/** 스타일 오버라이드 */
	style?: StyleProp<ViewStyle>;
	titleStyle?: StyleProp<TextStyle>;
	explanationStyle?: StyleProp<TextStyle>;
	/** 검색어 — 제목·부제·설명에서 일치 구간을 강조한다 */
	highlight?: string;
	/** 항목 그림 참조 — 있으면 단어·설명 오른쪽에 썸네일로 함께 보여 준다 */
	imageRef?: string;
}

/**
 * 목록 표기 규칙 — 문제(prompt)를 표제어로, 해설을 그 아래로.
 * (한국어 퀴즈는 촌수·위인·맞춤법만 정답을 표제어로 올렸다. 세계 상식 문항은 모두 문제 → 정답 순서라 한 가지다)
 */
export const learnListFields = (src: { domain: string; prompt: string; subPrompt?: string; answer?: string; explanation?: string }): { title: string; subLine?: string; explanation?: string } => ({
	title: src.prompt,
	subLine: src.subPrompt,
	explanation: src.explanation,
});

const LearnItemCard: React.FC<LearnItemCardProps> = ({
	domain,
	categoryLabel,
	levelLabel,
	title,
	subLine,
	answer,
	statusMark,
	indexBadge,
	explanation,
	examples,
	bookmarked,
	onToggleBookmark,
	showChevron = true,
	onPress,
	children,
	headerRight,
	belowTitle,
	exampleTitle,
	renderExample,
	style,
	titleStyle,
	explanationStyle,
	highlight,
	imageRef,
}) => {
	const { t } = useTranslation();
	const meta = LearnHubService.getDomain(domain).meta;
	const titleText = title;
	const showCategory = !!categoryLabel && categoryLabel !== meta.title;

	return (
		<TouchableOpacity style={[styles.card, style]} activeOpacity={onPress ? 0.85 : 1} disabled={!onPress} onPress={onPress}>
			{/* 1줄: 주제 · 카테고리 · 난이도 + [별][>] */}
			<View style={styles.tagRow}>
				<View style={styles.tags}>
					{!!indexBadge && (
						<View style={[styles.statusMark, { backgroundColor: indexBadge.color ?? Colors.primary }]}>
							<Text style={[styles.indexText, { color: readableOn(indexBadge.color ?? Colors.primary) }]}>{indexBadge.num}</Text>
						</View>
					)}
					{!!statusMark && (
						<View style={[styles.statusMark, { backgroundColor: statusMark === 'correct' ? Colors.successDeep : Colors.errorDark }]}>
							<IconComponent type="materialIcons" name={statusMark === 'correct' ? 'check' : 'close'} size={scaledSize(12)} color={Colors.textInverse} />
						</View>
					)}
					<View style={[styles.domainChip, { backgroundColor: withAlpha(meta.color, '14') }]}>
						<DomainIcon mainIcon={meta.mainIcon} icon={meta.icon} iconType={meta.iconType} size={scaledSize(13)} color={meta.color} />
						<Text style={[styles.domainChipText, { color: meta.color }]} numberOfLines={1} ellipsizeMode="tail">{meta.title}</Text>
					</View>
					{showCategory && (
						<View style={styles.metaChip}>
							<IconComponent type="materialIcons" name={categoryIcon(categoryLabel!)} size={scaledSize(12)} color={Colors.textSecondary} />
							<Text style={styles.metaChipText} numberOfLines={1} ellipsizeMode="tail">{categoryLabel}</Text>
						</View>
					)}
					{!!levelLabel && (
						<View style={styles.metaChip}>
							<IconComponent type="materialIcons" name={difficultyIcon(levelLabel)} size={scaledSize(12)} color={Colors.textSecondary} />
							<Text style={styles.metaChipText} numberOfLines={1} ellipsizeMode="tail">{levelLabel}</Text>
						</View>
					)}
				</View>
				<View style={styles.actions}>
					{headerRight}
					{bookmarked !== undefined && (
						<TouchableOpacity
							style={styles.favBtn}
							activeOpacity={0.7}
							hitSlop={Layout.hitSlop}
							accessibilityRole="button"
							accessibilityLabel={bookmarked ? t('common.bookmarkRemove') : t('common.bookmarkAdd')}
							onPress={onToggleBookmark}>
							<IconComponent type="materialIcons" name={bookmarked ? 'star' : 'star-border'} size={scaledSize(20)} color={bookmarked ? Colors.bookmark : Colors.textMuted} />
						</TouchableOpacity>
					)}
					{showChevron && <IconComponent type="materialIcons" name="chevron-right" size={scaledSize(21)} color={Colors.textMuted} />}
				</View>
			</View>

			{/* 단어 · 해설 (+ 그림이 있으면 오른쪽 썸네일) */}
			<View style={styles.bodyRow}>
				<View style={styles.bodyText}>
					<HighlightText text={titleText} query={highlight} style={[styles.title, titleStyle]} numberOfLines={2} ellipsizeMode="tail" />
					{!!subLine && <HighlightText text={subLine} query={highlight} style={styles.subLine} numberOfLines={2} ellipsizeMode="tail" />}
					{belowTitle}

					{/* 정답 — 초록 강조 */}
					{!!answer && (
						<View style={styles.answerBox}>
							<Text style={styles.answerText}>{answer}</Text>
						</View>
					)}

					{/* 해설 */}
					{!!explanation && <HighlightText text={explanation} query={highlight} lineBreakStrategyIOS="hangul-word" style={[styles.explanation, explanationStyle]} />}
				</View>
				{/* 태블릿은 카드 폭이 넓어 1.25배 썸네일이 왜소해진다 — 아트 배율로 키우고 받아 올 해상도도 올린다 */}
				{!!imageRef && <EntryImage imageRef={imageRef} width={scaleArt(76)} fetchWidth={isTablet ? 320 : 200} compact style={styles.thumb} />}
			</View>

			{/* 예시 */}
			{!!examples && examples.length > 0 && (
				<View style={styles.exGroup}>
					<Text style={styles.exHead}>{exampleTitle ?? t('learnCard.more')}</Text>
					{examples.map((ex, i) =>
						renderExample ? (
							<React.Fragment key={i}>{renderExample(ex, i)}</React.Fragment>
						) : (
							<View key={i} style={styles.exItem}>
								<Text style={styles.exText}>{ex}</Text>
							</View>
						),
					)}
				</View>
			)}

			{/* 화면별 부가 요소 (푸터 등) */}
			{children}
		</TouchableOpacity>
	);
};

export default LearnItemCard;

const styles = themed(() => StyleSheet.create({
	card: {
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.lg,
		padding: Spacing.lg,
		marginBottom: Layout.itemGap,
	},
	tagRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm },
	tags: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.xs },
	domainChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.md },
	domainChipText: { fontSize: Typography.footnote, fontWeight: '800' },
	metaChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.md },
	statusMark: { width: scaleWidth(20), height: scaleWidth(20), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
	indexText: { fontSize: Typography.micro, fontWeight: '900', color: Colors.textInverse },
	metaChipText: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary },
	actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
	favBtn: { width: scaleWidth(32), height: scaleWidth(32), alignItems: 'center', justifyContent: 'center' },
	bodyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
	bodyText: { flex: 1 },
	thumb: { alignSelf: 'flex-start', marginTop: SpacingV.sm, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
	title: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textStrong, marginTop: SpacingV.sm },
	subLine: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: SpacingV.xs },
	answerBox: { backgroundColor: withAlpha(Colors.success, '12'), borderWidth: 1, borderColor: withAlpha(Colors.success, '40'), borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm, marginTop: SpacingV.sm },
	answerText: { fontSize: Typography.body, color: Colors.success, fontWeight: '900' },
	// 해설은 단어(굵은 제목)보다 옅고 가늘게 — 위계 유지
	explanation: { fontSize: Typography.body, fontWeight: '400', color: Colors.textSecondary, lineHeight: scaleHeight(20), marginTop: SpacingV.xs },
	exGroup: { marginTop: SpacingV.md },
	exHead: { fontSize: Typography.footnote, fontWeight: '900', color: Colors.textSecondary, marginBottom: SpacingV.sm },
	exItem: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm, marginBottom: SpacingV.sm },
	exText: { fontSize: Typography.body, color: Colors.text, lineHeight: scaleHeight(20) },
}));
