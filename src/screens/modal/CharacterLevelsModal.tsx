/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import BottomSheet from '@/src/screens/common/atomic/BottomSheet';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import DomainIcon from '@/src/screens/common/atomic/DomainIcon';
import Colors from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleArt, isTablet } from '@/src/utils';
import LearnHubService from '@/src/services/LearnHubService';
import LearnProgressService from '@/src/services/LearnProgressService';
import { getCharacterImages, getOverallCharacterLevelsByCount, hasCharacter } from '@/src/const/ConstCharacters';
import { getDomainLevels, DOMAIN_LEVELS } from '@/src/const/ConstDomainLevels';
import { POINT_PER_CORRECT } from '@/src/const/ConstScoring';
import { SHARED_STATE_ILLUSTRATIONS } from '@/src/const/ConstIllustrationAssets';
import { themed } from '@/src/utils/ThemedStyles';

/**
 * 공통 레벨별 캐릭터 팝업 (열람 전용)
 * - 홈 캐릭터 선택 팝업과 동일한 형태(주제 탭 + 미리보기 + 단계 그리드)
 * - 캐릭터를 탭하면 미리보기만 갱신되고, 홈 캐릭터 '선택(저장)'은 홈 팝업에서만 가능
 * - 점수 상세 / 카테고리 서브 화면 등에서 재사용
 */
interface Props {
	visible: boolean;
	onClose: () => void;
	/** 열릴 때 활성화할 탭 ('overall' 또는 도메인 키, 기본 overall) */
	initialTab?: string;
}

interface Item {
	key: string;
	level: number;
	img: ReturnType<typeof require> | null;
	title: string;
	unlocked: boolean;
	req: string;
}

const CharacterLevelsModal: React.FC<Props> = ({ visible, onClose, initialTab = 'overall' }) => {
	const { t } = useTranslation();
	const [tab, setTab] = useState(initialTab);
	const [previewKey, setPreviewKey] = useState<string | null>(null);
	const [score, setScore] = useState(0);
	const [domainStats, setDomainStats] = useState<Record<string, { solved: number; correct: number }>>({});
	const previewAnim = useRef(new Animated.Value(1)).current;
	// 언마운트 시 진행 중인 애니메이션 정리
	useEffect(() => () => previewAnim.stopAnimation(), [previewAnim]);

	// 열릴 때 최신 통계 로드 + 탭 초기화
	useEffect(() => {
		if (!visible) return;
		setTab(initialTab);
		setPreviewKey(null);
		LearnProgressService.getStats().then((s) => {
			setScore(s.totalCorrect * POINT_PER_CORRECT);
			setDomainStats(s.byDomain);
		});
	}, [visible, initialTab]);

	// 서비스가 매번 새 배열을 만들어 아래 useMemo/useCallback 이 무효화되지 않게 고정한다
	const domains = useMemo(() => LearnHubService.getDomainList(), []);
	const tabs = useMemo(
		() => [{ key: 'overall', title: t('common.all') }, ...domains.filter((d) => hasCharacter(d.key) && getDomainLevels(d.key).length > 0).map((d) => ({ key: d.key, title: d.title }))],
		[domains, t],
	);

	const itemsFor = useCallback(
		(scope: string): Item[] => {
			if (scope === 'overall') {
				const totalCount = domains.reduce((a, d) => a + d.total, 0);
				const solvedTotal = Object.values(domainStats).reduce((a, s) => a + (s.solved ?? 0), 0);
				return getOverallCharacterLevelsByCount(totalCount).map((c) => ({
					key: `overall:${c.level}`,
					level: c.level,
					img: c.img,
					title: c.title,
					unlocked: solvedTotal >= c.requiredCount,
					req: c.requiredCount === 0 ? t('modal.characterLevels.reqStart') : t('modal.characterLevels.reqQuestions', { value: c.requiredCount.toLocaleString() }),
				}));
			}
			const s = domainStats[scope] ?? { solved: 0, correct: 0 };
			const defs = getDomainLevels(scope);
			const imgs = getCharacterImages(scope);
			const metric = DOMAIN_LEVELS[scope]?.metric ?? 'score';
			const value = metric === 'solved' ? s.solved : s.correct * POINT_PER_CORRECT;
			return defs.map((def, i) => ({
				key: `${scope}:${def.level}`,
				level: def.level,
				img: imgs[i] ?? imgs[imgs.length - 1] ?? null,
				title: def.label,
				unlocked: value >= def.threshold,
				req: def.threshold === 0
					? t('modal.characterLevels.reqStart')
					: t(metric === 'solved' ? 'modal.characterLevels.reqQuestions' : 'modal.characterLevels.reqPoints', { value: def.threshold.toLocaleString() }),
			}));
		},
		[domains, domainStats, t],
	);

	const items = useMemo(() => itemsFor(tab), [itemsFor, tab]);
	// 미리보기: 탭한 캐릭터 우선, 없으면 현재 탭의 최고 해금 캐릭터
	const preview = useMemo(() => {
		const exact = previewKey ? items.find((i) => i.key === previewKey) : undefined;
		if (exact) return exact;
		const unlocked = items.filter((i) => i.unlocked);
		return unlocked[unlocked.length - 1] ?? items[0];
	}, [items, previewKey]);

	const pick = (key: string) => {
		setPreviewKey(key);
		previewAnim.setValue(0);
		Animated.spring(previewAnim, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start();
	};

	const selectTab = (key: string) => {
		setTab(key);
		setPreviewKey(null);
		previewAnim.setValue(0);
		Animated.spring(previewAnim, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start();
	};

	return (
		<BottomSheet visible={visible} onClose={onClose}>
				<View>
					<View style={styles.titleRow}>
						<Text style={styles.title}>{t('modal.characterLevels.title')}</Text>
						<TouchableOpacity onPress={onClose} hitSlop={Layout.hitSlop} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('modal.characterLevels.closeA11y')}>
							<IconComponent type="materialIcons" name="close" size={scaledSize(24)} color={Colors.textMuted} />
						</TouchableOpacity>
					</View>
					<Text style={styles.sub}>{t('modal.characterLevels.sub')}</Text>

					{/* 주제 탭 */}
					<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabRow}>
						{tabs.map((tb) => {
							const on = tab === tb.key;
							return (
								<TouchableOpacity key={tb.key} style={[styles.tabBtn, on && styles.tabBtnOn]} activeOpacity={0.85} onPress={() => selectTab(tb.key)}>
									{tb.key === 'overall' ? (
										<IconComponent type="materialIcons" name="apps" size={scaledSize(15)} color={on ? Colors.primary : Colors.textMuted} />
									) : (
										<DomainIcon
											mainIcon={LearnHubService.getDomain(tb.key).meta.mainIcon}
											icon={LearnHubService.getDomain(tb.key).meta.icon}
											iconType={LearnHubService.getDomain(tb.key).meta.iconType}
											size={scaledSize(15)}
											color={on ? Colors.primary : LearnHubService.getDomain(tb.key).meta.color}
										/>
									)}
									<Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>{tb.title}</Text>
								</TouchableOpacity>
							);
						})}
					</ScrollView>

					{/* 미리보기 — 배경 고정, 이미지만 스르륵 */}
					<View style={styles.preview}>
						{!!preview && !preview.unlocked && (
							<ExpoImage source={SHARED_STATE_ILLUSTRATIONS.locked} style={styles.previewLockIllustration} contentFit="contain" />
						)}
						{!!preview?.img && (
							<Animated.View style={{ opacity: previewAnim, transform: [{ translateY: previewAnim.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(12), 0] }) }] }}>
								<ExpoImage source={preview.img} style={styles.previewImg} contentFit="contain" />
							</Animated.View>
						)}
						<Text style={styles.previewTitle} numberOfLines={1}>{preview?.title ?? '-'}</Text>
						<Text style={styles.previewReq}>{preview ? t(preview.unlocked ? 'modal.characterLevels.unlocked' : 'modal.characterLevels.locked', { req: preview.req }) : ''}</Text>
					</View>

					{/* 단계 그리드 */}
					<ScrollView style={styles.gridScroll} showsVerticalScrollIndicator={false}>
						<View style={styles.grid}>
							{items.map((c) => {
								const selected = preview?.key === c.key;
								return (
									<TouchableOpacity
										key={c.key}
										style={[styles.cell, selected && styles.cellSelected, !c.unlocked && styles.cellLocked]}
										activeOpacity={0.85}
										onPress={() => pick(c.key)}>
										<View style={styles.cellImgWrap}>
											{c.img && <ExpoImage source={c.img} style={[styles.cellImg, !c.unlocked && { opacity: 0.24 }]} contentFit="contain" />}
											{!c.unlocked && (
												<View style={styles.cellLock}>
													<IconComponent type="materialIcons" name="lock" size={scaledSize(18)} color={Colors.textMuted} />
												</View>
											)}
										</View>
										<Text style={styles.cellTitle} numberOfLines={2}>{c.title}</Text>
										<Text style={styles.cellReq} numberOfLines={1}>{c.req}</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					</ScrollView>
				</View>
		</BottomSheet>
	);
};

export default CharacterLevelsModal;

const styles = themed(() => StyleSheet.create({
	titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	title: { fontSize: Typography.h3, fontWeight: '900', color: Colors.textStrong },
	sub: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: SpacingV.xs },
	tabBar: { marginTop: SpacingV.md, height: scaleHeight(44), flexGrow: 0, flexShrink: 0 },
	tabRow: { gap: Spacing.sm, alignItems: 'center' },
	tabBtn: { flexDirection: 'row', gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.sm, borderRadius: Radius.xl, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
	tabBtnOn: { backgroundColor: Colors.primaryBg, borderColor: Colors.primarySoft },
	tabText: { fontSize: Typography.footnote, lineHeight: scaleHeight(18), fontWeight: '800', color: Colors.textMuted },
	tabTextOn: { color: Colors.primary },
	preview: { flexShrink: 0, alignItems: 'center', marginTop: SpacingV.md, paddingVertical: SpacingV.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt },
	previewLockIllustration: { position: 'absolute', top: SpacingV.sm, right: Spacing.sm, width: scaleArt(56), height: scaleArt(56), opacity: 0.72 },
	previewImg: { width: scaleArt(84), height: scaleArt(84), borderRadius: Radius.xl },
	previewTitle: { fontSize: Typography.callout, fontWeight: '900', color: Colors.textStrong, marginTop: SpacingV.sm },
	previewReq: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary, marginTop: SpacingV.xxs },
	gridScroll: { marginTop: SpacingV.md, maxHeight: scaleHeight(240) },
	grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, paddingBottom: SpacingV.sm },
	cell: { width: isTablet ? '23%' : '30%', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, paddingVertical: SpacingV.md, paddingHorizontal: Spacing.xs },
	cellSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
	cellLocked: { opacity: 0.75 },
	cellImgWrap: { width: scaleArt(56), height: scaleArt(56), alignItems: 'center', justifyContent: 'center' },
	cellImg: { width: scaleArt(50), height: scaleArt(50), borderRadius: Radius.lg },
	cellLock: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
	cellTitle: { fontSize: Typography.footnote, lineHeight: scaleHeight(16), fontWeight: '900', color: Colors.textStrong, marginTop: SpacingV.sm, textAlign: 'center' },
	cellReq: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary, marginTop: SpacingV.xs, textAlign: 'center' },
}));
