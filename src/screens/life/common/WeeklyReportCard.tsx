import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Share, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import { showToast } from '@/src/screens/common/atomic/GlobalToast';
import { playPop } from '@/src/utils/SoundUtils';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useLife } from '@/src/hooks/useLife';
import { useScreenEnter } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { accuracy, buildWeeklyReport, weeklyShareText, WeekMetrics, WeeklyReport } from '@/src/services/life/WeeklyReport';
import { loadActivityLog } from '@/src/four/utils/DailyActivityUtils';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

/**
 * 한 줄에 세우는 지표 — 아이콘과 값 뽑는 법만 여기서 정한다.
 * 이름·단위는 번역 파일(report.stat.*)에 있다. 정답률만 단위가 '%' 로 언어와 무관하다.
 */
const METRICS: { key: string; icon: string; unitKey?: string; unit?: string; pick: (week: WeekMetrics) => number }[] = [
	{ key: 'newItems', icon: 'cards-outline', unitKey: 'report.stat.newItemsUnit', pick: (week) => week.learned },
	{ key: 'solved', icon: 'head-question-outline', unitKey: 'report.stat.solvedUnit', pick: (week) => week.solved },
	{ key: 'rate', icon: 'target', unit: '%', pick: accuracy },
	{ key: 'attendance', icon: 'calendar-check', unitKey: 'report.stat.attendanceUnit', pick: (week) => week.attended },
];

/** 'YYYY-MM-DD' → '9/4' — 카드 머리말에 기간을 짧게 적는다 */
const shortDate = (key: string): string => {
	const [, month, day] = key.split('-');
	return `${Number(month)}/${Number(day)}`;
};

/**
 * 늘고 줄어든 정도를 한 칸으로 — 위/아래 화살표와 색까지 여기서 정한다.
 * 정답률만 %p 로 읽어야 해서 단위를 밖에서 받는다.
 */
const DeltaChip = ({ delta, unit }: { delta: number; unit: string }) => {
	const { t } = useTranslation();
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	if (delta === 0) {
		return (
			<View style={[styles.deltaChip, styles.deltaFlat]}>
				<Text style={[styles.deltaText, styles.deltaFlatText]}>{t('report.flat')}</Text>
			</View>
		);
	}
	const up = delta > 0;
	const suffix = unit === '%' ? '%p' : unit;
	return (
		<View style={[styles.deltaChip, up ? styles.deltaUp : styles.deltaDown]}>
			<IconComponent
				type="materialCommunityIcons"
				name={up ? 'trending-up' : 'trending-down'}
				size={12}
				color={up ? Colors.success : Colors.error}
			/>
			<Text style={[styles.deltaText, up ? styles.deltaUpText : styles.deltaDownText]}>{`${up ? '+' : ''}${delta}${suffix}`}</Text>
		</View>
	);
};

/**
 * 주간 리포트 — 최근 7일과 그 앞 7일을 나란히 놓는다.
 * -------------------------------------------------
 * 통계 화면은 "지금까지 얼마나 했나" 만 보여 줘서 이번 주에 잘하고 있는지가 안 보였다.
 * 숫자 하나마다 지난주 대비 증감을 붙여, 표를 읽지 않아도 오르내림이 색으로 먼저 읽히게 한다.
 * 집계 규칙은 WeeklyReport 가 정하고 여기서는 그리기만 한다.
 */
const WeeklyReportCard = () => {
	const { t } = useTranslation();
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const { records, attendance } = useLife();
	const enterStyle = useScreenEnter();
	/** 날짜별 학습 수는 AsyncStorage 에 있다 — 화면에 들어올 때마다 다시 읽는다 */
	const [report, setReport] = useState<WeeklyReport | null>(null);

	useFocusEffect(
		useCallback(() => {
			let alive = true;
			loadActivityLog()
				.then((log) => {
					if (!alive) {
						return;
					}
					const studyByDate = Object.fromEntries(Object.entries(log).map(([date, day]) => [date, day.study ?? 0]));
					setReport(buildWeeklyReport(records, attendance, studyByDate));
				})
				// 학습 로그를 못 읽어도 퀴즈·출석만으로 리포트를 낸다
				.catch(() => alive && setReport(buildWeeklyReport(records, attendance, {})));
			return () => {
				alive = false;
			};
		}, [attendance, records]),
	);

	/** 공유 — 글 한 덩어리로 보낸다. 공유 판을 닫기만 해도 오류가 아니므로 조용히 지나간다 */
	const onShare = useCallback(async () => {
		if (!report) {
			return;
		}
		playPop();
		try {
			await Share.share({ message: weeklyShareText(report, t) });
		} catch {
			showToast(t('report.shareFailed'), 'share-off-outline');
		}
	}, [report, t]);

	if (!report) {
		return null;
	}

	const { thisWeek, lastWeek } = report;
	const gained = METRICS.reduce((sum, metric) => sum + Math.max(0, metric.pick(thisWeek) - metric.pick(lastWeek)), 0);

	return (
		<Animated.View style={[styles.card, enterStyle]}>
			<View style={styles.head}>
				<View style={styles.headIcon}>
					<IconComponent type="materialCommunityIcons" name="chart-timeline-variant-shimmer" size={18} color={Colors.primaryDark} />
				</View>
				<View style={styles.headText}>
					<Text style={styles.title}>{t('report.title')}</Text>
					<Text style={styles.period}>{t('report.range', { from: shortDate(report.from), to: shortDate(report.to) })}</Text>
				</View>
			</View>

			<View style={styles.rows}>
				{METRICS.map((metric) => {
					const now = metric.pick(thisWeek);
					const before = metric.pick(lastWeek);
					const unit = metric.unit ?? t(metric.unitKey!);
					return (
						<View key={metric.key} style={styles.row}>
							<IconComponent type="materialCommunityIcons" name={metric.icon} size={15} color={Colors.textSecondary} />
							<Text style={styles.rowLabel}>{t(`report.stat.${metric.key}`)}</Text>
							<Text style={styles.rowValue}>
								{now}
								<Text style={styles.rowUnit}>{unit}</Text>
							</Text>
							<DeltaChip delta={now - before} unit={unit} />
						</View>
					);
				})}
			</View>

			<Text style={styles.footnote}>
				{t(gained > 0 ? 'report.up' : 'report.down')}
			</Text>

			{/* 공유 — 오늘의 퀴즈와 같은 방식(글)으로 보낸다. 취소는 실패가 아니므로 아무 말도 하지 않는다 */}
			<PressableScale style={styles.share} onPress={onShare} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={t('report.shareLabel')}>
				<IconComponent type="materialCommunityIcons" name="share-variant" size={14} color={Colors.primaryDark} />
				<Text style={styles.shareText}>{t('report.share')}</Text>
			</PressableScale>
		</Animated.View>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		// 공유 줄 — 카드 맨 아래 한 줄. 면 없이 테만 둬서 카드 안 숫자가 먼저 읽히게 한다
		share: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: Spacing.xs,
			marginTop: SpacingV.md,
			height: scaleHeight(38),
			borderRadius: Radius.pill,
			borderWidth: 1,
			borderColor: Colors.primarySoft,
			backgroundColor: Colors.primaryBg,
		},
		shareText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.primaryDark },

		card: {
			backgroundColor: Colors.surface,
			borderRadius: Radius.xl,
			padding: Spacing.lg,
			marginBottom: SpacingV.sm,
			gap: SpacingV.md,
			borderWidth: 1,
			borderColor: Colors.border,
			...Shadow.card,
		},
		head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
		headIcon: {
			width: scaleWidth(34),
			height: scaleWidth(34),
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.primarySoft,
		},
		headText: { flex: 1, gap: scaleHeight(2) },
		title: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.textStrong },
		period: { fontSize: Typography.caption, color: Colors.textSecondary },

		rows: { gap: SpacingV.sm },
		row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
		rowLabel: { flex: 1, fontSize: Typography.bodySm, color: Colors.text },
		// 숫자는 오른쪽 끝을 맞춘다 — 칩까지 지그재그로 흔들리면 표로 안 읽힌다
		rowValue: { minWidth: scaleWidth(56), textAlign: 'right', fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: Colors.textStrong },
		rowUnit: { fontSize: Typography.caption, fontWeight: FontWeight.medium, color: Colors.textMuted },

		deltaChip: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(2),
			minWidth: scaleWidth(64),
			justifyContent: 'center',
			paddingHorizontal: Spacing.sm,
			height: scaleHeight(22),
			borderRadius: Radius.pill,
		},
		deltaUp: { backgroundColor: Colors.successSoft },
		deltaDown: { backgroundColor: Colors.errorSoft },
		deltaFlat: { backgroundColor: Colors.surfaceAlt },
		deltaText: { fontSize: Typography.caption, fontWeight: FontWeight.bold },
		deltaUpText: { color: Colors.textStrong },
		deltaDownText: { color: Colors.textStrong },
		deltaFlatText: { color: Colors.textMuted },

		footnote: { fontSize: Typography.caption, color: Colors.textMuted, lineHeight: scaledSize(17) },
	});

export default WeeklyReportCard;
