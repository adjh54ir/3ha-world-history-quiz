/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Colors, { accuracyColor, withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, CardSurface, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth, isTablet } from '@/src/utils';
import DateUtils from '@/src/utils/DateUtils';
import { useToast } from '@/src/context/ToastContext';
import LearnProgressService, { LearnStats } from '@/src/services/LearnProgressService';
import LearnHubService from '@/src/services/LearnHubService';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import DonutChart from '@/src/screens/common/atomic/DonutChart';
import AppModal from '@/src/screens/common/atomic/AppModal';
import { themed } from '@/src/utils/ThemedStyles';

/** 요일 약칭 키 (일~토, Date.getDay 순서) */
const DOW_KEYS = ['report.dow.sun', 'report.dow.mon', 'report.dow.tue', 'report.dow.wed', 'report.dow.thu', 'report.dow.fri', 'report.dow.sat'] as const;

/** 기간 선택 달력 현지화 — 달력을 열 때마다 번역 파일 기준으로 채운다 */
const syncCalendarLocale = (t: TFunction) => {
	const months = Array.from({ length: 12 }, (_, i) => t('report.calendar.month', { month: i + 1 }));
	const dows = DOW_KEYS.map((k) => t(k));
	LocaleConfig.locales.ko = {
		monthNames: months,
		monthNamesShort: months,
		dayNames: dows.map((dow) => t('report.calendar.dayName', { dow })),
		dayNamesShort: dows,
		today: t('report.calendar.today'),
	};
	LocaleConfig.defaultLocale = 'ko';
};

type ReportDay = { date: string; dow: number; solved: number; correct: number; studied: number };
type PeriodKey = '7' | '30' | 'custom';

interface Props {
	/** 카드 하단 여백 (배치 화면에 맞춤) */
	style?: object;
	/** 'study' = 학습(카드)만, 'quiz' = 퀴즈(문항)만 — 내 활동 탭에서 기록을 완전히 분리해 보여준다 */
	variant?: 'study' | 'quiz';
}

/** 직접 선택 기간 상한(일) — 넘어가면 막대 개수가 수천 개가 되어 화면이 멈춘다 */
const RANGE_MAX_DAYS = 180;

/**
 * 학습 리포트 카드 (기간 필터 + 일별 막대 + 선택 일자 스코어 상세)
 * - 통계 탭에서 분리해 랭킹 화면 등에서 재사용. 자체적으로 stats를 로드한다.
 */
const LearningReportCard: React.FC<Props> = ({ style, variant = 'study' }) => {
	const isQuiz = variant === 'quiz';
	const { t } = useTranslation();
	const { showToast } = useToast();
	const [stats, setStats] = useState<LearnStats | null>(null);
	// 카드·숏폼으로 실제 학습한 일자별 개수 (퀴즈 풀이와 별개)
	const [studyLog, setStudyLog] = useState<Record<string, number>>({});
	const [period, setPeriod] = useState<PeriodKey>('7');
	const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);
	// 기본은 '오늘' 상세가 펼쳐진 상태 (날짜만 들고 있고 상세 객체는 report에서 찾아 쓴다)
	const [selectedDate, setSelectedDate] = useState<string | null>(DateUtils.getLocalDateString());
	const [showRangePicker, setShowRangePicker] = useState(false);
	// 막대 그래프는 오늘이 맨 오른쪽 → 기간이 바뀌면 끝으로 붙여 오늘이 먼저 보이게 한다
	const barsRef = useRef<ScrollView>(null);
	const [rangeDraft, setRangeDraft] = useState<{ start: string; end: string | null }>({ start: '', end: null });

	useFocusEffect(
		useCallback(() => {
			LearnProgressService.getStats().then(setStats);
			LearnProgressService.getStudyLog().then(setStudyLog);
		}, []),
	);

	// 약한 주제 (5문제 이상 응시 도메인 중 최저 정답률)
	const weakDomain = useMemo<{ domain: string; accuracy: number } | null>(() => {
		if (!stats) return null;
		let w: { domain: string; accuracy: number } | null = null;
		Object.entries(stats.byDomain).forEach(([domain, s]) => {
			if (s.solved < 5) return;
			const acc = Math.round((s.correct / s.solved) * 100);
			if (!w || acc < w.accuracy) w = { domain, accuracy: acc };
		});
		return w;
	}, [stats]);
	const weakTitle = weakDomain ? LearnHubService.getDomainTitle(weakDomain.domain) : null;

	const range = useMemo(() => {
		const today = DateUtils.getLocalDateString();
		if (period === 'custom' && customRange) return customRange;
		const span = period === '30' ? 29 : 6;
		return { start: DateUtils.addLocalDays(today, -span), end: today };
	}, [period, customRange]);

	const report = useMemo(() => {
		const log = stats?.dailyLog ?? {};
		const days: ReportDay[] = [];
		let solved = 0;
		let correct = 0;
		let studied = 0;
		let activeDays = 0;
		const total = Math.max(0, DateUtils.differenceInLocalDays(range.start, range.end));
		for (let i = 0; i <= total; i++) {
			const date = DateUtils.addLocalDays(range.start, i);
			const d = log[date] ?? { solved: 0, correct: 0 };
			const st = studyLog[date] ?? 0;
			days.push({ date, dow: DateUtils.getLocalDayOfWeek(date), solved: d.solved, correct: d.correct, studied: st });
			solved += d.solved;
			correct += d.correct;
			studied += st;
			// 퀴즈를 풀었거나 카드를 학습했으면 '활동한 날'
			if (d.solved > 0 || st > 0) activeDays += 1;
		}
		return { days, solved, correct, studied, activeDays, accuracy: solved > 0 ? Math.round((correct / solved) * 100) : 0 };
	}, [stats, studyLog, range]);

	const selectedDay = useMemo(() => report.days.find((d) => d.date === selectedDate) ?? null, [report, selectedDate]);
	// 막대 최대치도 탭 기준으로 잡아야 한쪽 기록만 볼 때 그래프가 눌리지 않는다
	const reportMax = useMemo(() => Math.max(1, ...report.days.map((d) => (isQuiz ? d.solved : d.studied))), [report, isQuiz]);
	const compact = report.days.length > 7;

	const changePeriod = (p: PeriodKey) => {
		if (p === 'custom') {
			syncCalendarLocale(t);
			setRangeDraft({ start: '', end: null });
			setShowRangePicker(true);
			return;
		}
		setPeriod(p);
	};

	const onPickDay = (dateStr: string) => {
		if (!rangeDraft.start || rangeDraft.end) {
			setRangeDraft({ start: dateStr, end: null });
		} else if (dateStr < rangeDraft.start) {
			setRangeDraft({ start: dateStr, end: rangeDraft.start });
		} else {
			setRangeDraft({ start: rangeDraft.start, end: dateStr });
		}
	};

	const confirmRange = () => {
		if (rangeDraft.start && rangeDraft.end) {
			// 기간이 길면 일자 막대를 수천 개 그리게 되어 화면이 멈춘다 — 최대 RANGE_MAX_DAYS 로 자른다
			const capped = DateUtils.addLocalDays(rangeDraft.start, RANGE_MAX_DAYS - 1);
			const end = rangeDraft.end > capped ? capped : rangeDraft.end;
			if (end !== rangeDraft.end) showToast(t('report.rangeMax', { max: RANGE_MAX_DAYS }), 'info');
			setCustomRange({ start: rangeDraft.start, end });
			setPeriod('custom');
			setSelectedDate(null);
			setShowRangePicker(false);
		}
	};

	const markedRange = useMemo(() => {
		const marks: Record<string, any> = {};
		const { start, end } = rangeDraft;
		if (!start) return marks;
		if (!end) {
			marks[start] = { startingDay: true, endingDay: true, color: Colors.primary, textColor: Colors.onFill };
			return marks;
		}
		const span = DateUtils.differenceInLocalDays(start, end);
		for (let i = 0; i <= span; i++) {
			const d = DateUtils.addLocalDays(start, i);
			marks[d] = { color: Colors.primarySoft, textColor: Colors.primaryDeep };
		}
		marks[start] = { startingDay: true, color: Colors.primary, textColor: Colors.onFill };
		marks[end] = { endingDay: true, color: Colors.primary, textColor: Colors.onFill };
		return marks;
	}, [rangeDraft]);

	const periodLabel = period === 'custom' ? `${range.start} ~ ${range.end}` : t('report.period.recent', { days: Number(period) });
	// 기간 칩 라벨 — 직접 고른 기간은 칩에서 바로 날짜가 보이게 (캡션을 안 봐도 알 수 있게)
	const shortDate = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
	const periodTabs: { key: PeriodKey; label: string }[] = [
		{ key: '7', label: t('common.days', { count: 7 }) },
		{ key: '30', label: t('common.days', { count: 30 }) },
		{ key: 'custom', label: period === 'custom' && customRange ? `${shortDate(customRange.start)}~${shortDate(customRange.end)}` : t('report.period.custom') },
	];
	const dayRate = selectedDay && selectedDay.solved > 0 ? Math.round((selectedDay.correct / selectedDay.solved) * 100) : 0;

	return (
		<View style={[styles.card, style]}>
			<View style={styles.weekHead}>
				<Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">{isQuiz ? t('report.title.quiz') : t('report.title.study')}</Text>
				<View style={styles.weekActivePill}>
					<Text style={styles.weekActiveText}>{t('report.activeDays', { count: report.activeDays })}</Text>
				</View>
			</View>

			<View style={styles.periodRow}>
				{periodTabs.map((p) => {
					const on = period === p.key;
					return (
						<TouchableOpacity key={p.key} style={[styles.periodChip, on && styles.periodChipOn]} activeOpacity={0.85} onPress={() => changePeriod(p.key)} hitSlop={Layout.hitSlop}>
							{p.key === 'custom' && <IconComponent type="materialIcons" name="date-range" size={scaledSize(14)} color={on ? Colors.primary : Colors.textMuted} />}
							<Text style={[styles.periodText, on && styles.periodTextOn]} numberOfLines={1} ellipsizeMode="tail">{p.label}</Text>
						</TouchableOpacity>
					);
				})}
			</View>
			<Text style={styles.periodCaption} numberOfLines={2} ellipsizeMode="tail">{periodLabel}</Text>

			{/* 기간 요약 — 항목별로 네모 박스에 나눠 담아 한눈에 비교되게 */}
			<View style={styles.weekSummaryRow}>
				{(isQuiz
					? ([
							{ key: 'solved', icon: 'quiz', color: Colors.primary, value: report.solved.toLocaleString(), label: t('report.tile.solved') },
							{ key: 'correct', icon: 'check-circle', color: Colors.success, value: report.correct.toLocaleString(), label: t('report.tile.correct') },
							{ key: 'accuracy', icon: 'percent', color: accuracyColor(report.accuracy), value: `${report.accuracy}%`, label: t('report.tile.accuracy') },
						] as const)
					: ([
							{ key: 'studied', icon: 'menu-book', color: Colors.success, value: report.studied.toLocaleString(), label: t('report.tile.studied') },
							{ key: 'days', icon: 'event-available', color: Colors.primary, value: `${report.activeDays}`, label: t('report.tile.activeDays') },
							{ key: 'avg', icon: 'trending-up', color: Colors.goldDark, value: report.activeDays > 0 ? Math.round(report.studied / report.activeDays).toLocaleString() : '0', label: t('report.tile.dailyAvg') },
						] as const)
				).map((tile) => (
					<View key={tile.key} style={styles.weekSummaryTile}>
						<View style={[styles.weekSummaryIcon, { backgroundColor: withAlpha(tile.color, '14') }]}>
							<IconComponent type="materialIcons" name={tile.icon} size={scaledSize(14)} color={tile.color} />
						</View>
						<Text style={[styles.weekSummaryNum, { color: tile.color }]}>{tile.value}</Text>
						<Text style={styles.weekSummaryLabel} numberOfLines={1} ellipsizeMode="tail">{tile.label}</Text>
					</View>
				))}
			</View>
			{weakTitle && weakDomain && (
				<View style={styles.weekWeakRow}>
					<IconComponent type="materialIcons" name="priority-high" size={scaledSize(13)} color={Colors.error} />
					<Text style={styles.weekWeak}>{t('report.weak', { title: weakTitle, accuracy: weakDomain.accuracy })}</Text>
				</View>
			)}

			<View style={styles.chartBox}>
			<ScrollView
				ref={barsRef}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.weekBarsScroll}
				onContentSizeChange={() => barsRef.current?.scrollToEnd({ animated: false })}>
				{report.days.map((d) => {
					const on = selectedDay?.date === d.date;
					const dayNum = Number(d.date.slice(8, 10));
					return (
						<TouchableOpacity
							key={d.date}
							activeOpacity={0.7}
							onPress={() => setSelectedDate(on ? null : d.date)}
							style={[styles.weekBarCol, compact ? styles.weekBarColCompact : styles.weekBarColWide]}>
							{/* 왼쪽: 카드·숏폼 학습량 / 오른쪽: 퀴즈 풀이량 */}
							<View style={styles.weekBarTrack}>
								{isQuiz ? (
									<View style={[styles.weekBarSeg, { height: `${Math.max(d.solved > 0 ? 6 : 0, Math.round((d.solved / reportMax) * 100))}%`, backgroundColor: d.solved > 0 ? (on ? Colors.primaryDeep : Colors.primary) : Colors.border }]} />
								) : (
									<View style={[styles.weekBarSeg, { height: `${Math.max(d.studied > 0 ? 6 : 0, Math.round((d.studied / reportMax) * 100))}%`, backgroundColor: d.studied > 0 ? (on ? Colors.successBright : Colors.success) : Colors.border }]} />
								)}
							</View>
							<Text style={[styles.weekBarLabel, on && styles.weekBarLabelOn]} numberOfLines={1}>{compact ? dayNum : t(DOW_KEYS[d.dow])}</Text>
							{!compact && <Text style={[styles.weekBarSubLabel, on && styles.weekBarLabelOn]} numberOfLines={1}>{dayNum}</Text>}
						</TouchableOpacity>
					);
				})}
			</ScrollView>

			{/* 범례와 조작 안내를 한 줄로 — 차트 아래에 문구 두 줄이 따로 떠 있던 걸 정리 */}
			<View style={styles.legendRow}>
				<View style={styles.legendItem}>
					<View style={[styles.legendDot, { backgroundColor: isQuiz ? Colors.primary : Colors.success }]} />
					<Text style={styles.legendText}>{isQuiz ? t('report.tile.solved') : t('report.legend.studied')}</Text>
				</View>
				<View style={styles.legendSpacer} />
				<IconComponent type="materialIcons" name="swipe" size={scaledSize(13)} color={Colors.textMuted} />
				<Text style={styles.chartHintText}>{t('report.chartHint')}</Text>
			</View>
			</View>

			{selectedDay && (
				<FadeInUp>
					<View style={styles.dayScoreCard}>
						<View style={styles.dayScoreHead}>
							<Text style={styles.dayScoreDate}>{t('report.dayTitle', { month: Number(selectedDay.date.slice(5, 7)), day: Number(selectedDay.date.slice(8, 10)), dow: t(DOW_KEYS[selectedDay.dow]) })}</Text>
							{isQuiz && (
								<View style={[styles.dayScoreTrend, { backgroundColor: dayRate >= report.accuracy ? Colors.successSoft : Colors.surfaceAlt }]}>
									<IconComponent type="materialIcons" name={dayRate >= report.accuracy ? 'trending-up' : 'trending-down'} size={scaledSize(12)} color={dayRate >= report.accuracy ? Colors.success : Colors.textSecondary} />
									<Text style={[styles.dayScoreTrendText, { color: dayRate >= report.accuracy ? Colors.success : Colors.textSecondary }]}>{t('report.dayAvg', { accuracy: report.accuracy })}</Text>
								</View>
							)}
						</View>
						{isQuiz ? (
						<View style={styles.dayScoreMain}>
							{/* 카드 배경(surfaceAlt)과 트랙 색이 같으면 테두리만 남아 링이 안 보인다 → 밝은 트랙으로 전체 링을 드러낸다 */}
							<DonutChart size={92} strokeWidth={10} percent={dayRate} color={Colors.primary} trackColor={Colors.borderStrong}>
								<Text style={styles.dayScoreDonutNum}>{dayRate}%</Text>
								<Text style={styles.dayScoreDonutLabel}>{t('report.tile.accuracy')}</Text>
							</DonutChart>
							<View style={styles.dayScoreBig}>
								<View style={styles.dayScoreBigRow}>
									<Text style={styles.dayScoreBigNum}>{selectedDay.correct}</Text>
									<Text style={styles.dayScoreBigSlash}> / {selectedDay.solved}</Text>
								</View>
								<Text style={styles.dayScoreBigLabel}>{t('report.day.correctItems')}</Text>
							</View>
						</View>
						) : (
						<View style={styles.dayScoreMain}>
							<View style={styles.dayScoreBig}>
								<View style={styles.dayScoreBigRow}>
									<Text style={styles.dayScoreBigNum}>{selectedDay.studied}</Text>
									<Text style={styles.dayScoreBigSlash}>{t('report.day.cardUnit')}</Text>
								</View>
								<Text style={styles.dayScoreBigLabel}>{t('report.day.studiedCards')}</Text>
							</View>
						</View>
						)}
						{isQuiz && (
						<View style={styles.dayScoreTiles}>
							<View style={styles.dayScoreTile}>
								<Text style={styles.dayScoreTileNum}>{selectedDay.solved}</Text>
								<Text style={styles.dayScoreTileLabel}>{t('report.tile.solved')}</Text>
							</View>
							<View style={[styles.dayScoreTile, styles.dayScoreTileOk]}>
								<Text style={[styles.dayScoreTileNum, { color: Colors.success }]}>{selectedDay.correct}</Text>
								<Text style={styles.dayScoreTileLabel}>{t('report.tile.correct')}</Text>
							</View>
							<View style={[styles.dayScoreTile, styles.dayScoreTileNg]}>
								<Text style={[styles.dayScoreTileNum, { color: Colors.error }]}>{Math.max(0, selectedDay.solved - selectedDay.correct)}</Text>
								<Text style={styles.dayScoreTileLabel}>{t('report.day.wrong')}</Text>
							</View>
						</View>
						)}
					</View>
				</FadeInUp>
			)}

			{/* 기간 직접 선택 달력 */}
			<AppModal visible={showRangePicker} transparent animationType="fade" onRequestClose={() => setShowRangePicker(false)}>
				<TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowRangePicker(false)}>
					<TouchableOpacity activeOpacity={1} style={styles.rangeModal}>
						<View style={styles.dailyModalHead}>
							<Text style={styles.dailyModalTitle}>{t('report.period.custom')}</Text>
							<TouchableOpacity onPress={() => setShowRangePicker(false)} hitSlop={Layout.hitSlop} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('common.close')}>
								<IconComponent type="materialIcons" name="close" size={scaledSize(22)} color={Colors.textSecondary} />
							</TouchableOpacity>
						</View>
						<Text style={styles.rangeHint}>
							{rangeDraft.start ? (rangeDraft.end ? `${rangeDraft.start} ~ ${rangeDraft.end}` : t('report.picker.pickEnd', { start: rangeDraft.start })) : t('report.picker.pickStart')}
						</Text>
						<Calendar
							maxDate={DateUtils.getLocalDateString()}
							markingType="period"
							markedDates={markedRange}
							onDayPress={(d) => onPickDay(d.dateString)}
							theme={{ calendarBackground: Colors.surface, dayTextColor: Colors.textStrong, monthTextColor: Colors.textStrong, textSectionTitleColor: Colors.textSecondary, textDisabledColor: Colors.textMuted, todayTextColor: Colors.primary, arrowColor: Colors.primary, textDayFontWeight: '600', textMonthFontWeight: '800' }}
						/>
						<TouchableOpacity
							style={[styles.rangeConfirm, !(rangeDraft.start && rangeDraft.end) && styles.rangeConfirmOff]}
							activeOpacity={0.9}
							disabled={!(rangeDraft.start && rangeDraft.end)}
							onPress={confirmRange}>
							<Text style={[styles.rangeConfirmText, !(rangeDraft.start && rangeDraft.end) && styles.rangeConfirmTextOff]}>{t('report.picker.confirm')}</Text>
						</TouchableOpacity>
					</TouchableOpacity>
				</TouchableOpacity>
			</AppModal>
		</View>
	);
};

export default LearningReportCard;

const styles = themed(() => StyleSheet.create({
	card: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg },
	cardTitle: { fontSize: Typography.callout, fontWeight: '900', color: Colors.textStrong },
	weekHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	weekActivePill: { backgroundColor: Colors.primaryBg, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.md },
	weekActiveText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.primary },
	periodRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: SpacingV.md },
	periodChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: SpacingV.sm, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: 'transparent' },
	periodChipOn: { backgroundColor: Colors.primaryBg, borderColor: Colors.primarySoft },
	periodText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textMuted },
	periodTextOn: { color: Colors.primary },
	periodCaption: { fontSize: Typography.footnote, color: Colors.textSecondary, fontWeight: '600', marginTop: SpacingV.sm },
	weekSummaryRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: SpacingV.md, marginBottom: SpacingV.md },
	weekSummaryTile: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SpacingV.md, paddingHorizontal: Spacing.xs, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
	weekSummaryIcon: { width: scaleWidth(24), height: scaleWidth(24), borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: SpacingV.xs },
	weekSummaryNum: { fontSize: Typography.title, fontWeight: '900' },
	weekSummaryLabel: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary, marginTop: SpacingV.xxs },
	weekWeakRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: SpacingV.md },
	weekWeak: { fontSize: Typography.footnote, color: Colors.textSecondary, fontWeight: '700' },
	weekBarCol: { flex: 1, alignItems: 'center' },
	weekBarColCompact: { flex: 0, width: scaleWidth(24) },
	weekBarColWide: { flex: 0, width: scaleWidth(44) },
	weekBarTrack: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xxs, width: isTablet ? scaleWidth(26) : scaleWidth(18), height: scaleHeight(66), backgroundColor: Colors.surface, borderRadius: Radius.sm, overflow: 'hidden' },
	weekBarSeg: { flex: 1, borderRadius: scaleWidth(4) },
	// 차트 영역을 한 박스로 묶어 기간 요약과 시각적으로 분리한다
	chartBox: { marginTop: SpacingV.sm, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.md, paddingTop: SpacingV.md, paddingBottom: SpacingV.md },
	legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: SpacingV.sm },
	legendSpacer: { flex: 1 },
	legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
	legendDot: { width: scaleWidth(8), height: scaleWidth(8), borderRadius: Radius.pill },
	legendText: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary },
	weekBarLabel: { fontSize: Typography.footnote, color: Colors.textSecondary, fontWeight: '700', marginTop: SpacingV.sm },
	weekBarSubLabel: { fontSize: Typography.micro, color: Colors.textMuted, fontWeight: '700', marginTop: SpacingV.xxs },
	weekBarLabelOn: { color: Colors.primary, fontWeight: '900' },
	weekBarsScroll: { flexGrow: 1, justifyContent: 'space-between', alignItems: 'flex-end', height: scaleHeight(100), paddingRight: Spacing.xs },
	chartHintText: { fontSize: Typography.footnote, color: Colors.textMuted, fontWeight: '600' },
	dayScoreCard: { marginTop: SpacingV.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.lg },
	dayScoreHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	dayScoreDate: { fontSize: Typography.body, fontWeight: '900', color: Colors.textStrong },
	dayScoreTrend: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, borderRadius: Radius.pill },
	dayScoreTrendText: { fontSize: Typography.footnote, fontWeight: '800' },
	dayScoreMain: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginTop: SpacingV.lg },
	dayScoreDonutNum: { fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong },
	dayScoreDonutLabel: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary, marginTop: SpacingV.xxs },
	dayScoreBig: { flex: 1 },
	dayScoreBigRow: { flexDirection: 'row', alignItems: 'baseline' },
	dayScoreBigNum: { fontSize: Typography.h1, fontWeight: '900', color: Colors.primary },
	dayScoreBigSlash: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textSecondary },
	dayScoreBigLabel: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary, marginTop: SpacingV.xxs },
	// 4개를 한 줄에 넣으면 숫자·라벨이 눌린다 → 2×2로 나눠 담는다
	dayScoreTiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: SpacingV.lg },
	// 타일 3개 고정 — flexBasis 를 쓰면 마지막 줄 한 개가 100% 폭으로 늘어난다
	dayScoreTile: { flex: 1, alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, paddingVertical: SpacingV.md },
	dayScoreTileOk: { backgroundColor: Colors.successSoft, borderColor: withAlpha(Colors.success, '33') },
	dayScoreTileNg: { backgroundColor: Colors.errorSoft, borderColor: withAlpha(Colors.error, '33') },
	dayScoreTileNum: { fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong },
	dayScoreTileLabel: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary, marginTop: SpacingV.xxs },
	modalBackdrop: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Layout.screenH },
	rangeModal: { width: '100%', maxWidth: Layout.dialogMaxWidth, backgroundColor: Colors.surface, borderRadius: Radius.xl, paddingHorizontal: Spacing.xl, paddingVertical: SpacingV.xxl },
	dailyModalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	dailyModalTitle: { fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong },
	rangeHint: { fontSize: Typography.body, color: Colors.textSecondary, fontWeight: '700', marginTop: SpacingV.md, marginBottom: SpacingV.sm },
	rangeConfirm: { marginTop: SpacingV.xl, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: SpacingV.lg, alignItems: 'center' },
	rangeConfirmOff: { backgroundColor: Colors.surfaceAlt },
	rangeConfirmText: { color: Colors.onFill, fontSize: Typography.callout, fontWeight: '800' },
	rangeConfirmTextOff: { color: Colors.textMuted },
}));
