/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import DomainIcon from '@/src/screens/common/atomic/DomainIcon';
import AppModal from '@/src/screens/common/atomic/AppModal';
import { SheetIn } from '@/src/screens/common/anim/Motion';
import Colors, { withAlpha, readableOn } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, Border, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth, isTablet } from '@/src/utils';
import { categoryIcon, difficultyIcon } from '@/src/const/ConstQuizMeta';
import LearnHubService from '@/src/services/LearnHubService';
import LearnProgressService from '@/src/services/LearnProgressService';
import { playPop } from '@/src/utils/SoundUtils';
import EntryImage from '@/src/screens/common/atomic/EntryImage';
import { themed } from '@/src/utils/ThemedStyles';

export interface DetailItem {
	/** 전역 즐겨찾기/상세 식별자 */
	uid?: string;
	/** 주제 키 (칩 아이콘·그림 조회용) */
	domain?: string;
	/** 주제 라벨 (칩 표시) */
	domainTitle?: string;
	/** 카테고리·난이도 등 부가 태그 */
	tags?: string[];
	categoryLabel?: string;
	levelLabel?: string;
	/** 표제 (단어/문제) */
	title: string;
	/** 부제 */
	subTitle?: string;
	/** 정답 (오답노트/퀴즈용) */
	answer?: string;
	/** 뜻 */
	meaning?: string;
	/** 요약/설명 */
	description?: string;
	/** 해설 */
	explanation?: string;
	/** 더 알아보기 (곁가지 이야기) */
	examples?: string[];
	/** 대조 보기 (정답 + 헷갈리는 표기) */
	options?: string[];
	/** 기본 정보 묶음 (수도: 수도/대륙) */
	infoRows?: { label: string; value: string }[];
	/** 항목 그림 참조 — 없으면 uid 로 학습 카드를 찾아 그림을 건다 */
	imageRef?: string;
}

interface Props {
	visible: boolean;
	item: DetailItem | null;
	accent?: string;
	onClose: () => void;
	/** 즐겨찾기 토글 즉시 콜백 — 뒤 목록의 별 상태를 실시간 반영 */
	onBookmarkChange?: (uid: string, bookmarked: boolean) => void;
	primaryAction?: {
		label: string;
		icon?: string;
		onPress: () => void;
	};
}

/**
 * 공통 상세 팝업 (중앙 전면)
 * - 검색 결과 / 오답노트 / 퀴즈 결과 등 여러 화면에서 '>' 아이콘으로 열어 재사용
 * - X는 우측 최상단, 따옴표 아이콘·태그·제목은 정중앙 배치
 */
const DetailSheet: React.FC<Props> = ({ visible, item, accent = Colors.primary, onClose, onBookmarkChange, primaryAction }) => {
	const { t } = useTranslation();
	const [bookmarked, setBookmarked] = useState(false);
	// 팝업 내부 자체 토스트 (팝업 뒤에 가려지는 문제 해결)
	const [localToast, setLocalToast] = useState<{ msg: string; icon: string } | null>(null);
	const toastAnim = useRef(new Animated.Value(0)).current;
	// 언마운트 시 진행 중인 애니메이션 정리
	useEffect(() => () => toastAnim.stopAnimation(), [toastAnim]);
	const toastTimer = useRef<any>(null);
	const showLocalToast = (msg: string, icon = 'check-circle') => {
		setLocalToast({ msg, icon });
		toastAnim.setValue(0);
		Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
		if (toastTimer.current) clearTimeout(toastTimer.current);
		toastTimer.current = setTimeout(() => {
			Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setLocalToast(null));
		}, 1500);
	};
	useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
	useEffect(() => {
		if (!visible || !item?.uid) {
			setBookmarked(false);
			return;
		}
		LearnProgressService.isBookmarked(item.uid).then(setBookmarked);
	}, [visible, item?.uid]);

	if (!item) return null;
	const titleText = item.title;
	// 국기·초상·사진이 있는 주제는 표제 위에 그림을 건다 — 호출하는 화면마다 넘기지 않아도 uid 로 찾는다
	const imageRef = item.imageRef ?? (item.domain && item.uid ? LearnHubService.getStudyCardByUid(item.domain, item.uid)?.imageRef : undefined);
	const tags = (item.tags ?? []).filter(Boolean);
	// 도메인(수도·위인 등) 태그 왼쪽에 표시할 상수 지정 아이콘
	const domainMeta = item.domain && LearnHubService.isValidCategory(item.domain) ? LearnHubService.getDomain(item.domain).meta : null;
	// 라벨: 요약/설명, 하단 태그 섹션 명칭 — 한국어 퀴즈는 도메인마다 달랐고(동의 속담·유의어…) 세계 상식은 한 가지다
	const descLabel = t('modal.detail.descLabel');
	const tagLabel = t('modal.detail.tagLabel');
	const tagIcon = 'tag';
	const isChon = false;
	const isIdiom = false;
	const canBookmark = !!item.uid && !!item.domain && !!item.domainTitle && !!(item.meaning || item.description || item.explanation);
	const toggleBookmark = async () => {
		if (!canBookmark || !item.uid || !item.domain || !item.domainTitle) return;
		const now = await LearnProgressService.toggleBookmark({
			uid: item.uid,
			domain: item.domain as any,
			domainTitle: item.domainTitle,
			title: item.title,
			subTitle: item.subTitle,
			meaning: item.meaning || item.description || item.explanation || item.answer || item.title,
		});
		setBookmarked(now);
		onBookmarkChange?.(item.uid, now);
		playPop();
		showLocalToast(t(now ? 'common.bookmarkSaved' : 'common.bookmarkUnsaved'), now ? 'star' : 'star-border');
	};

	return (
		<AppModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={styles.overlay}>
				<TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
				<SheetIn visible={visible} style={styles.sheet}>
					{/* 헤더 행: 좌측 여백(밸런서) · 태그(정중앙) · X(우측) — 모두 세로 중앙 정렬 */}
					<View style={styles.headerRow}>
						<View style={styles.headerSide} />
						<View style={styles.tagRow}>
							{!!item.domainTitle && (
								<View style={[styles.tag, { backgroundColor: withAlpha(accent, '14') }]}>
									{domainMeta && <DomainIcon mainIcon={domainMeta.mainIcon} icon={domainMeta.icon} iconType={domainMeta.iconType} size={scaledSize(13)} color={accent} />}
									<Text style={[styles.tagText, { color: accent }]} numberOfLines={1} ellipsizeMode="tail">{item.domainTitle}</Text>
								</View>
							)}
							{!!item.categoryLabel && item.categoryLabel !== item.domainTitle && (
								<View style={styles.tagAlt}>
									<IconComponent type="materialIcons" name={categoryIcon(item.categoryLabel)} size={scaledSize(12)} color={Colors.textSecondary} />
									<Text style={styles.tagAltText} numberOfLines={1} ellipsizeMode="tail">{item.categoryLabel}</Text>
								</View>
							)}
							{!!item.levelLabel && (
								<View style={styles.tagAlt}>
									<IconComponent type="materialIcons" name={difficultyIcon(item.levelLabel)} size={scaledSize(12)} color={Colors.textSecondary} />
									<Text style={styles.tagAltText} numberOfLines={1} ellipsizeMode="tail">{item.levelLabel}</Text>
								</View>
							)}
						</View>
						<TouchableOpacity style={styles.headerSide} onPress={onClose} hitSlop={10} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('modal.detail.closeA11y')}>
							<IconComponent type="materialIcons" name="close" size={scaledSize(22)} color={Colors.textMuted} />
						</TouchableOpacity>
					</View>

					{!!imageRef && <EntryImage imageRef={imageRef} width={scaleWidth(132)} fetchWidth={320} style={styles.image} />}
					{/* 제목 — 정중앙, 강조색으로 약간 강조 (단어 위 따옴표 아이콘 제거) */}
					<Text style={[styles.title, { color: accent }]} numberOfLines={1} ellipsizeMode="tail">{titleText}</Text>

					{/* 즐겨찾기 — 단어 아래 중앙 정렬 버튼 */}
					{canBookmark && (
						<TouchableOpacity
							style={[styles.favBtn, bookmarked ? { backgroundColor: withAlpha(accent, '14'), borderColor: withAlpha(accent, '40') } : { borderColor: Colors.border }]}
							onPress={toggleBookmark}
							hitSlop={8}
							activeOpacity={0.8}
							accessibilityRole="button"
							accessibilityLabel={t(bookmarked ? 'common.bookmarkRemove' : 'common.bookmarkAdd')}>
							<IconComponent type="materialIcons" name={bookmarked ? 'star' : 'star-border'} size={scaledSize(20)} color={bookmarked ? Colors.bookmark : Colors.textMuted} />
						</TouchableOpacity>
					)}

					<ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
						{/* 촌수: 설명을 최상단에 + 따옴표 아이콘 중앙정렬 (description 없으면 meaning으로 폴백) */}
						{isChon && !!(item.description || item.meaning) && (
							<View style={[styles.box, styles.quoteBox, { borderColor: withAlpha(accent, '40') }]}>
								<IconComponent type="materialIcons" name="format-quote" size={scaledSize(26)} color={accent} style={styles.meaningQuote} />
								<Text lineBreakStrategyIOS="hangul-word" style={[styles.meaning, styles.meaningCentered]}>{item.description || item.meaning}</Text>
							</View>
						)}
						{/* 맞춤법: 정답 vs 헷갈리는 표기 대조 (정답만 초록 강조) */}
						{!!item.options && item.options.length >= 2 && (
							<View style={styles.vsRow}>
								{item.options.map((op, i) => {
									const correct = op === item.answer;
									return (
										<React.Fragment key={i}>
											{i > 0 && <Text style={styles.vsText}>vs</Text>}
											<View style={[styles.vsBox, correct ? { backgroundColor: withAlpha(Colors.success, '12'), borderColor: withAlpha(Colors.success, '55') } : { backgroundColor: Colors.surfaceAlt, borderColor: Colors.border }]}>
												<Text style={[styles.vsWord, { color: correct ? Colors.success : Colors.textMuted }]}>{op}</Text>
												{correct && <IconComponent type="materialIcons" name="check-circle" size={scaledSize(15)} color={Colors.success} />}
											</View>
										</React.Fragment>
									);
								})}
							</View>
						)}
						{/* 촌수: 기본 정보 묶음 (촌수/관계종류/항렬) */}
						{!!item.infoRows && item.infoRows.length > 0 && (
							<View style={[styles.box, styles.infoBox, isChon && styles.chonInfoBox]}>
								<View style={styles.infoHead}>
									<IconComponent type="materialIcons" name="badge" size={scaledSize(15)} color={accent} />
									<Text style={[styles.label, { color: accent, marginBottom: 0, }]} numberOfLines={1} ellipsizeMode="tail">{t(isChon ? 'modal.detail.infoChon' : 'modal.detail.info')}</Text>
								</View>
								{item.infoRows.map((r, i) => (
									<View key={i} style={[styles.infoRow, i > 0 && styles.infoRowBorder]}>
										<Text style={styles.infoLabel} numberOfLines={1} ellipsizeMode="tail">{r.label}</Text>
										<Text style={styles.infoValue} numberOfLines={2} ellipsizeMode="tail">{r.value}</Text>
									</View>
								))}
							</View>
						)}
						{/* 촌수는 표제어(호칭)가 곧 정답이라 중복 노출 제거 */}
						{!!item.answer && !item.options && !isChon && (
							<View style={[styles.box, styles.answerBoxCompact, { backgroundColor: withAlpha(Colors.success, '12'), borderColor: withAlpha(Colors.success, '40') }]}>
								<Text style={[styles.answer, styles.answerCentered, { color: Colors.success }]}>{item.answer}</Text>
							</View>
						)}
						{!!item.meaning && !isChon && item.meaning.trim() !== (item.answer ?? '').trim() && (
							<View style={[styles.box, styles.quoteBox, { borderColor: withAlpha(accent, '40') }]}>
								<IconComponent type="materialIcons" name="format-quote" size={scaledSize(26)} color={accent} style={styles.meaningQuote} />
								<Text lineBreakStrategyIOS="hangul-word" style={[styles.meaning, styles.meaningCentered]}>{item.meaning}</Text>
							</View>
						)}
						{!!item.description && item.description !== item.meaning && !isChon && (
							<View style={[styles.box, styles.quoteBox, { borderColor: withAlpha(accent, '40') }]}>
								<Text style={[styles.label, { color: accent }]} numberOfLines={1} ellipsizeMode="tail">{descLabel}</Text>
								{isIdiom ? (
									item.description.split('\n').filter(Boolean).map((line, i) => {
										const idx = line.indexOf(':');
										const word = idx >= 0 ? line.slice(0, idx).trim() : line.trim();
										const mean = idx >= 0 ? line.slice(idx + 1).trim() : '';
										return (
											<View key={i} style={styles.phraseRow}>
												<Text style={[styles.phraseWord, { color: accent }]}>{word}</Text>
												{!!mean && <Text style={styles.phraseMean}>{mean}</Text>}
											</View>
										);
									})
								) : (
									<Text lineBreakStrategyIOS="hangul-word" style={styles.desc}>{item.description}</Text>
								)}
							</View>
						)}
						{/* 촌수는 상단 설명 + 기본정보로 충분 — 해설(호칭 재노출) 제거 */}
						{!!item.explanation && !isChon && item.explanation.trim() !== (item.meaning ?? '').trim() && item.explanation.trim() !== (item.description ?? '').trim() && item.explanation.trim() !== titleText.trim() && (
							<View style={[styles.box, styles.explainBox]}>
								<Text style={[styles.label, { color: Colors.success }]}>{t('modal.detail.explanation')}</Text>
								<Text lineBreakStrategyIOS="hangul-word" style={styles.desc}>{item.explanation}</Text>
							</View>
						)}
						{!!item.examples && item.examples.length > 0 && (
							<View style={styles.box}>
								<Text style={[styles.label, { color: accent }]}>{t('modal.detail.more')}</Text>
								{item.examples.map((ex, i) => (
									<View key={i} style={styles.exampleBox}>
										<Text lineBreakStrategyIOS="hangul-word" style={styles.example}>{ex}</Text>
									</View>
								))}
							</View>
						)}
						{/* 연관 태그(동의 속담·연관 키워드·유의어·다른 호칭) — 항상 마지막 하단 */}
						{tags.length > 0 && (
							<View style={styles.box}>
								<View style={styles.tagSecHead}>
									<IconComponent type="materialIcons" name={tagIcon} size={scaledSize(14)} color={accent} />
									<Text style={[styles.label, { color: accent, marginBottom: 0 }]} numberOfLines={1} ellipsizeMode="tail">{tagLabel}</Text>
								</View>
								<View style={styles.chipWrap}>
									{tags.map((tag, i) => (
										<TouchableOpacity key={i} style={[styles.chip, { backgroundColor: withAlpha(accent, '12'), borderColor: withAlpha(accent, '30') }]} activeOpacity={0.7} onPress={() => { onClose(); router.push({ pathname: '/search', params: { q: tag } } as never); }}>
											<Text style={[styles.chipText, { color: accent }]} numberOfLines={1} ellipsizeMode="tail">{tag}</Text>
										</TouchableOpacity>
									))}
								</View>
							</View>
						)}
					</ScrollView>

					{/* 팝업 내부 자체 토스트 — 시트 하단 위로 부드럽게 등장(팝업 뒤 가려짐 방지) */}
					{!!localToast && (
						<Animated.View pointerEvents="none" style={[styles.localToast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(16), 0] }) }] }]}>
							<IconComponent type="materialIcons" name={localToast.icon} size={scaledSize(15)} color={Colors.bookmark} />
							<Text style={styles.localToastText}>{localToast.msg}</Text>
						</Animated.View>
					)}

					<View style={styles.ctaRow}>
						<TouchableOpacity
							style={[styles.cta, primaryAction ? styles.ctaSecondary : { backgroundColor: accent }]}
							activeOpacity={0.9}
							onPress={onClose}>
							<Text style={[styles.ctaText, primaryAction ? styles.ctaSecondaryText : { color: readableOn(accent) }]}>{t('common.close')}</Text>
						</TouchableOpacity>
						{primaryAction && (
							<TouchableOpacity style={[styles.cta, styles.ctaPrimary, { backgroundColor: accent }]} activeOpacity={0.9} onPress={primaryAction.onPress}>
								{!!primaryAction.icon && <IconComponent type="materialIcons" name={primaryAction.icon} size={scaledSize(18)} color={readableOn(accent)} />}
								<Text style={[styles.ctaText, { color: readableOn(accent) }]}>{primaryAction.label}</Text>
							</TouchableOpacity>
						)}
					</View>
				</SheetIn>
			</View>
		</AppModal>
	);
};

export default DetailSheet;

const styles = themed(() => StyleSheet.create({
	overlay: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
	sheet: { width: '100%', maxWidth: Layout.dialogMaxWidth, backgroundColor: Colors.surface, borderRadius: Radius.xl, paddingHorizontal: Spacing.xl, paddingTop: SpacingV.xxl, paddingBottom: SpacingV.xxl, maxHeight: isTablet ? scaleHeight(560) : '80%' },
	headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SpacingV.sm },
	headerSide: { width: scaleWidth(32), height: scaleWidth(32), alignItems: 'center', justifyContent: 'center' },
	tagRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
	tag: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.sm },
	tagText: { fontSize: Typography.footnote, fontWeight: '800' },
	tagAlt: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt },
	tagAltText: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary },
	image: { marginBottom: SpacingV.md, borderRadius: Radius.md },
	title: { fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong, lineHeight: scaleHeight(32), textAlign: 'center' },
	favBtn: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: SpacingV.sm, width: scaleWidth(40), height: scaleWidth(40), borderRadius: Radius.pill, borderWidth: 1 },
	scroll: { marginTop: SpacingV.lg },
	scrollBody: { paddingBottom: SpacingV.xs },
	box: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.md, marginBottom: SpacingV.sm },
	quoteBox: { borderWidth: Border.thin, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.md },
	explainBox: { backgroundColor: Colors.successSoft, borderColor: withAlpha(Colors.success, '40'), paddingVertical: SpacingV.sm },
	answerBoxCompact: { paddingVertical: SpacingV.sm },
	label: { fontSize: Typography.footnote, fontWeight: '900', marginBottom: SpacingV.sm },
	answer: { fontSize: Typography.title, fontWeight: '900', lineHeight: scaleHeight(24) },
	answerCentered: { textAlign: 'center', alignSelf: 'stretch' },
	meaningQuote: { alignSelf: 'center', marginBottom: SpacingV.xs },
	meaning: { fontSize: Typography.callout, color: Colors.textStrong, fontWeight: '700', lineHeight: scaleHeight(24) },
	meaningCentered: { textAlign: 'center' },
	desc: { fontSize: Typography.body, color: Colors.text, lineHeight: scaleHeight(22) },
	phraseRow: { marginTop: SpacingV.sm },
	phraseWord: { fontSize: Typography.callout, fontWeight: '900', marginBottom: SpacingV.xxs },
	phraseMean: { fontSize: Typography.body, color: Colors.text, lineHeight: scaleHeight(21) },
	exampleBox: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm, marginTop: SpacingV.sm },
	example: { fontSize: Typography.body, color: Colors.textSecondary, lineHeight: scaleHeight(22) },
	vsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginBottom: SpacingV.sm },
	vsBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: Border.thin, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.md },
	vsWord: { fontSize: Typography.title, fontWeight: '900' },
	vsText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textMuted },
	infoBox: { paddingVertical: SpacingV.xs },
	chonInfoBox: { marginTop: SpacingV.xxxl },
	infoHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: SpacingV.sm, paddingHorizontal: 0 },
	infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SpacingV.sm },
	infoRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
	infoLabel: { fontSize: Typography.body, fontWeight: '700', color: Colors.textSecondary },
	infoValue: { fontSize: Typography.body, fontWeight: '800', color: Colors.textStrong },
	tagSecHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: SpacingV.sm },
	chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
	chip: { paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm, borderRadius: Radius.pill, borderWidth: 1 },
	chipText: { fontSize: Typography.footnote, fontWeight: '700' },
	ctaRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: SpacingV.md },
	// 흐름에 끼면 나타날 때 하단 CTA 가 밀린다 — 시트 하단 위에 겹쳐 띄운다
	localToast: { position: 'absolute', bottom: scaleHeight(78), alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.overlayStrong, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm, borderRadius: Radius.xl },
	localToastText: { color: Colors.textInverse, fontSize: Typography.footnote, fontWeight: '700' },
	cta: { flex: 1, flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', justifyContent: 'center', paddingVertical: SpacingV.lg, borderRadius: Radius.md },
	ctaPrimary: { borderWidth: 1, borderColor: 'transparent' },
	ctaSecondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong },
	ctaSecondaryText: { color: Colors.text },
	ctaText: { flexShrink: 1, textAlign: 'center', color: Colors.textInverse, fontSize: Typography.callout, fontWeight: '800' },
}));
