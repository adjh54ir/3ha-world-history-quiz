import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import DateUtils from '@/src/utils/DateUtils';
import { scaledSize, scaleHeight } from '@/src/utils';

/** 몇 주치를 보여 줄지 — 열두 주를 넘기면 칸이 손톱만 해진다 */
const WEEKS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;
/** 일요일부터 — 달력과 같은 순서로 읽히게 한다 */
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
	/** 출석한 날 ('YYYY-MM-DD') */
	attendance: string[];
}

/**
 * 출석 히트맵 — 최근 12주를 한 판에.
 *
 * 통계 화면에는 "모두 몇 일" 이라는 숫자만 있었다. 숫자는 꾸준했는지 띄엄띄엄했는지를 못 보여 준다.
 * 칸 하나가 하루, 한 열이 한 주다. 오늘이 맨 오른쪽 아래에 오도록 주를 끊는다.
 */
const AttendanceHeatmap = ({ attendance }: Props) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);

	const { weeks, from } = useMemo(() => {
		const done = new Set(attendance);
		const today = new Date(`${DateUtils.getLocalDateString()}T00:00:00`);
		// 이번 주의 토요일까지 채워 마지막 열이 반쯤 빈 채로 끝나지 않게 한다
		const end = new Date(today.getTime() + (6 - today.getDay()) * DAY_MS);
		const start = new Date(end.getTime() - (WEEKS * 7 - 1) * DAY_MS);
		const grid: { key: string; on: boolean; future: boolean }[][] = [];
		for (let week = 0; week < WEEKS; week++) {
			const column: { key: string; on: boolean; future: boolean }[] = [];
			for (let day = 0; day < 7; day++) {
				const date = new Date(start.getTime() + (week * 7 + day) * DAY_MS);
				const key = DateUtils.getLocalDateString(date);
				column.push({ key, on: done.has(key), future: date.getTime() > today.getTime() });
			}
			grid.push(column);
		}
		return { weeks: grid, from: DateUtils.getLocalDateString(start) };
	}, [attendance]);

	const recent = weeks.flat().filter((cell) => cell.on).length;

	return (
		<View style={styles.card}>
			<View style={styles.head}>
				<Text style={styles.title}>출석 기록</Text>
				<Text style={styles.sub}>{`최근 ${WEEKS}주 · ${recent}일`}</Text>
			</View>

			<View style={styles.body}>
				<View style={styles.dayLabels}>
					{DAY_LABELS.map((label, at) => (
						// 월·수·금만 적는다 — 일곱 줄을 다 적으면 글자가 칸보다 커진다
						<Text key={label} style={styles.dayLabel}>
							{at % 2 === 1 ? label : ''}
						</Text>
					))}
				</View>
				<View style={styles.grid}>
					{weeks.map((column, at) => (
						<View key={at} style={styles.column}>
							{column.map((cell) => (
								<View
									key={cell.key}
									style={[
										styles.cell,
										cell.on && { backgroundColor: Colors.primary },
										cell.future && styles.cellFuture,
									]}
								/>
							))}
						</View>
					))}
				</View>
			</View>

			<Text style={styles.footnote}>{`${from} 부터`}</Text>
		</View>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		card: {
			borderRadius: Radius.xl,
			backgroundColor: Colors.surface,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: Colors.border,
			padding: Spacing.lg,
			gap: SpacingV.sm,
		},
		head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.sm },
		title: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textStrong },
		sub: { fontSize: Typography.caption, color: Colors.textSecondary },

		body: { flexDirection: 'row', gap: Spacing.xs },
		dayLabels: { justifyContent: 'space-between' },
		dayLabel: { height: scaledSize(14), fontSize: scaledSize(9), lineHeight: scaledSize(14), color: Colors.textMuted },
		// 열두 열이 가로 폭을 나눠 갖는다 — 칸 크기를 못 박으면 작은 기기에서 넘친다
		grid: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
		column: { justifyContent: 'space-between' },
		cell: { width: scaledSize(14), height: scaledSize(14), borderRadius: scaledSize(3), backgroundColor: Colors.surfaceAlt },
		cellFuture: { opacity: 0.35 },

		footnote: { fontSize: Typography.caption, color: Colors.textMuted, marginTop: scaleHeight(2) },
	});

export default AttendanceHeatmap;
