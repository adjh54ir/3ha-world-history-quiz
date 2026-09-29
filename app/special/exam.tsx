/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import CommonHeader from '@/src/screens/common/CommonHeader';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import SectionHead from '@/src/screens/common/atomic/SectionHead';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import Colors, { readableOn, withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, CardSurface, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import LearnHubService from '@/src/services/LearnHubService';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';
import TestHistoryService, { type ExamPackRecord } from '@/src/services/TestHistoryService';
import { showAlert } from '@/src/screens/common/modal/ConfirmModal';
import { LearnType } from '@/src/types/data/LearnType';
import { EXAM_PACKS, getExamPack, type ExamPack } from '@/src/const/ConstExamPacks';
import { themed } from '@/src/utils/ThemedStyles';

/**
 * 테마 코스 (한국어 퀴즈의 시험 대비 팩 화면)
 * - 기존 주제를 테마별로 묶어 한 회차(20~30문항)로 출제한다. 새 문제 데이터는 없다.
 * - 회차를 끝내면 최고 점수·응시 횟수를 남기고, 오답은 '오답만 다시 풀기'로 이어진다.
 * - ?pack=geo 로 진입하면 목록을 건너뛰고 해당 팩 소개부터 보여준다.
 */
const ExamPacks = () => {
	const { t } = useTranslation();
	const params = useLocalSearchParams<{ pack?: string }>();
	const [selected, setSelected] = useState<ExamPack | null>(() => getExamPack(params.pack) ?? null);
	const [started, setStarted] = useState(false);
	/** 오답만 다시 풀기로 시작했는지 */
	const [retryMode, setRetryMode] = useState(false);
	const [records, setRecords] = useState<Record<string, ExamPackRecord>>({});

	/** 이번 회차 채점 결과 — 문항 수를 다 채우면 기록으로 남긴다 */
	const answers = useRef<{ uid: string; correct: boolean }[]>([]);
	const expected = useRef(0);

	const loadRecords = useCallback(() => {
		TestHistoryService.getExamRecords().then(setRecords);
	}, []);
	useFocusEffect(loadRecords);

	const record = selected ? records[selected.key] : undefined;
	const retryCount = record?.wrongUids?.length ?? 0;

	/** 팩 전체 문항 풀 — 오답 재도전은 여기서 uid 로 골라낸다 */
	const buildPool = (pack: ExamPack): LearnType.QuizQuestion[] =>
		LearnHubService.generateFocusedQuiz(pack.domains, 9999, pack.level);

	const buildQuestions = (pack: ExamPack): LearnType.QuizQuestion[] => {
		answers.current = [];
		if (retryMode) {
			const wrong = new Set(record?.wrongUids ?? []);
			const picked = buildPool(pack).filter((q) => wrong.has(q.uid));
			expected.current = picked.length;
			return picked;
		}
		const picked = LearnHubService.generateFocusedQuiz(pack.domains, pack.count, pack.level);
		expected.current = picked.length;
		return picked;
	};

	/** 문항 단위로 들어오는 채점 결과를 모아, 마지막 문항까지 풀면 기록 저장 */
	const onAnswered = (pack: ExamPack) => (info: { uid: string; correct: boolean }) => {
		answers.current.push(info);
		if (expected.current === 0 || answers.current.length < expected.current) return;
		const correct = answers.current.filter((a) => a.correct).length;
		const wrongUids = answers.current.filter((a) => !a.correct).map((a) => a.uid);
		// ponytail: 중도 이탈한 회차는 기록하지 않는다. 부분 응시까지 세면 '최고 점수'가 의미를 잃는다.
		TestHistoryService.addExamResult(pack.key, correct, answers.current.length, wrongUids).then(loadRecords);
	};

	const start = (retry: boolean) => {
		// 오답 uid 가 현재 출제 풀에 하나도 없으면(데이터 개편 등) 빈 퀴즈로 들어가 멈춘다 — 막고 안내한다
		if (retry && selected) {
			const wrong = new Set(record?.wrongUids ?? []);
			if (!buildPool(selected).some((q) => wrong.has(q.uid))) {
				showAlert(t('special.exam.noRetryTitle'), t('special.exam.noRetryMsg'), 'info-outline');
				return;
			}
		}
		setRetryMode(retry);
		setStarted(true);
	};

	if (started && selected) {
		return (
			<LearnQuizPlayer
				key={retryMode ? 'retry' : 'full'}
				title={retryMode ? t('special.exam.retryTitle', { title: selected.title }) : selected.title}
				accent={selected.color}
				modeLabel={t('special.exam.resultLabel', { title: selected.title })}
				mode="exam"
				homeHref="/special/exam"
				generate={() => buildQuestions(selected)}
				onAnswered={onAnswered(selected)}
			/>
		);
	}

	if (selected) {
		const hasRecord = !!record;
		return (
			<SafeAreaView style={styles.safe} edges={['bottom']}>
				<CommonHeader title={selected.title} onBack={() => (params.pack ? router.back() : setSelected(null))} />
				<ScrollView contentContainerStyle={styles.introWrap} showsVerticalScrollIndicator={false}>
					<FadeInUp>
						<View style={[styles.introIcon, { backgroundColor: withAlpha(selected.color, '14') }]}>
							<IconComponent type="materialIcons" name={selected.icon} size={scaledSize(42)} color={selected.color} />
						</View>
						<Text style={styles.introTitle} maxFontSizeMultiplier={1.3} numberOfLines={1} ellipsizeMode="tail">{selected.subtitle}</Text>
						<Text style={styles.introDesc}>{t('special.exam.introDesc', { count: selected.count })}</Text>

						{hasRecord && (
							<View style={[styles.recordCard, { borderColor: withAlpha(selected.color, '33') }]}>
								<View style={styles.recordItem}>
									<Text style={styles.recordLabel}>{t('special.exam.bestScore')}</Text>
									<Text style={[styles.recordValue, { color: selected.color }]}>{record.best}/{record.total}</Text>
								</View>
								<View style={styles.recordDivider} />
								<View style={styles.recordItem}>
									<Text style={styles.recordLabel}>{t('special.exam.plays')}</Text>
									<Text style={styles.recordValue}>{t('special.exam.playsValue', { count: record.plays })}</Text>
								</View>
								<View style={styles.recordDivider} />
								<View style={styles.recordItem}>
									<Text style={styles.recordLabel}>{t('special.exam.lastWrong')}</Text>
									<Text style={styles.recordValue}>{t('common.count', { count: retryCount })}</Text>
								</View>
							</View>
						)}

						<View style={styles.metaCard}>
							<View style={styles.metaRow}>
								<Text style={styles.metaLabel}>{t('special.exam.covers')}</Text>
								<Text style={styles.metaValue} numberOfLines={2} ellipsizeMode="tail">{selected.covers}</Text>
							</View>
							<View style={[styles.metaRow, styles.metaBorder]}>
								<Text style={styles.metaLabel}>{t('special.exam.questionCount')}</Text>
								<Text style={styles.metaValue}>{t('common.questions', { count: selected.count })}</Text>
							</View>
							<View style={[styles.metaRow, styles.metaBorder]}>
								<Text style={styles.metaLabel}>{t('special.exam.level')}</Text>
								<Text style={styles.metaValue} numberOfLines={2} ellipsizeMode="tail">{selected.level ?? t('common.all')}</Text>
							</View>
						</View>

						<View style={styles.chipRow}>
							{selected.domains.map((k) => (
								<View key={k} style={[styles.chip, { backgroundColor: withAlpha(selected.color, '14') }]}>
									<Text style={[styles.chipText, { color: selected.color }]} numberOfLines={1} ellipsizeMode="tail">{LearnHubService.getDomainTitle(k)}</Text>
								</View>
							))}
						</View>

					</FadeInUp>
				</ScrollView>

				{/* 시작 CTA — 스크롤과 무관하게 엄지 닿는 하단에 고정 */}
				<View style={styles.introFooter}>
					<TouchableOpacity style={[styles.startBtn, { backgroundColor: selected.color }]} activeOpacity={0.9} onPress={() => start(false)}>
						<Text style={[styles.startText, { color: readableOn(selected.color) }]} numberOfLines={1} ellipsizeMode="tail">{t('special.exam.startCount', { count: selected.count })}</Text>
						<IconComponent type="materialIcons" name="arrow-forward" size={scaledSize(18)} color={readableOn(selected.color)} />
					</TouchableOpacity>

					{retryCount > 0 && (
						<TouchableOpacity style={[styles.retryBtn, { borderColor: selected.color }]} activeOpacity={0.85} onPress={() => start(true)}>
							<IconComponent type="materialIcons" name="replay" size={scaledSize(18)} color={selected.color} />
							<Text style={[styles.retryText, { color: selected.color }]} numberOfLines={1} ellipsizeMode="tail">{t('special.exam.retryWrong', { count: retryCount })}</Text>
						</TouchableOpacity>
					)}
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safe} edges={['bottom']}>
			<CommonHeader title={t('special.exam.title')} onBack={() => router.back()} />
			<ScrollView contentContainerStyle={styles.listWrap} showsVerticalScrollIndicator={false}>
				<FadeInUp>
					<SectionHead title={t('special.exam.sectionTitle')} sub={t('special.exam.sectionSub')} />
					{EXAM_PACKS.map((p) => {
						const rec = records[p.key];
						return (
							<TouchableOpacity key={p.key} style={styles.packCard} activeOpacity={0.9} onPress={() => setSelected(p)}>
								<View style={[styles.packIcon, { backgroundColor: withAlpha(p.color, '14') }]}>
									<IconComponent type="materialIcons" name={p.icon} size={scaledSize(26)} color={p.color} />
								</View>
								<View style={styles.packBody}>
									<Text style={styles.packTitle} maxFontSizeMultiplier={1.3} numberOfLines={1} ellipsizeMode="tail">{p.title}</Text>
									<Text style={styles.packSub} numberOfLines={2}>{p.covers}</Text>
									{!!rec && (
										<View style={styles.packStatRow}>
											<IconComponent type="materialIcons" name="emoji-events" size={scaledSize(13)} color={p.color} />
											<Text style={[styles.packStatText, { color: p.color }]}>{t('special.exam.bestShort', { best: rec.best, total: rec.total })}</Text>
											<Text style={styles.packStatDot}>·</Text>
											<Text style={styles.packStatText}>{t('special.exam.playsShort', { count: rec.plays })}</Text>
										</View>
									)}
								</View>
								<View style={[styles.countPill, { backgroundColor: withAlpha(p.color, '14') }]}>
									<Text style={[styles.countText, { color: p.color }]}>{t('common.questions', { count: p.count })}</Text>
								</View>
							</TouchableOpacity>
						);
					})}
				</FadeInUp>
			</ScrollView>
		</SafeAreaView>
	);
};

export default ExamPacks;

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.background },
	listWrap: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },
	packCard: { ...CardSurface, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.lg, marginBottom: Layout.itemGap },
	packIcon: { width: scaleWidth(48), height: scaleWidth(48), borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
	packBody: { flex: 1 },
	packTitle: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textStrong },
	packSub: { fontSize: Typography.footnote, color: Colors.textMuted, marginTop: SpacingV.xxs, lineHeight: scaleHeight(16) },
	packStatRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, marginTop: SpacingV.xs, flexWrap: 'wrap' },
	packStatText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary },
	packStatDot: { fontSize: Typography.footnote, color: Colors.textMuted },
	countPill: { paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.md },
	countText: { fontSize: Typography.footnote, fontWeight: '900' },

	introWrap: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },
	introIcon: { width: scaleWidth(92), height: scaleWidth(92), borderRadius: Radius.xxl, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: SpacingV.xl },
	introTitle: { fontSize: Typography.h3, fontWeight: '900', color: Colors.textStrong, textAlign: 'center' },
	introDesc: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: SpacingV.sm, lineHeight: scaleHeight(21) },
	recordCard: { ...CardSurface, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', borderWidth: 1, marginTop: Layout.sectionGap, paddingVertical: SpacingV.md },
	recordItem: { flex: 1, alignItems: 'center', gap: SpacingV.xxs },
	recordDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: Colors.border },
	recordLabel: { fontSize: Typography.footnote, color: Colors.textMuted, fontWeight: '700' },
	recordValue: { fontSize: Typography.callout, fontWeight: '900', color: Colors.textStrong },
	metaCard: { ...CardSurface, borderRadius: Radius.lg, marginTop: Layout.sectionGap, paddingHorizontal: Spacing.md },
	metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: SpacingV.md },
	metaBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
	metaLabel: { width: scaleWidth(72), fontSize: Typography.footnote, fontWeight: '800', color: Colors.textMuted },
	metaValue: { flex: 1, fontSize: Typography.body, fontWeight: '700', color: Colors.text, lineHeight: scaleHeight(19) },
	chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, justifyContent: 'center', marginTop: SpacingV.lg },
	chip: { paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm, borderRadius: Radius.md },
	chipText: { fontSize: Typography.footnote, fontWeight: '800' },
	introFooter: { paddingHorizontal: Layout.screenH, paddingTop: SpacingV.md, paddingBottom: SpacingV.lg, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
	startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: SpacingV.lg, borderRadius: Radius.lg },
	startText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textInverse },
	retryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: SpacingV.lg, borderRadius: Radius.lg, borderWidth: 1, marginTop: SpacingV.sm },
	retryText: { fontSize: Typography.callout, fontWeight: '800' },
}));
