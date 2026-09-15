import assert from 'node:assert/strict';
import test from 'node:test';
import { accuracy, buildWeeklyReport, weeklyShareText } from './WeeklyReport.ts';
import { shiftDateKey } from './LifeRules.ts';
import type { LifeType } from '../../types/data/LifeType.ts';

const TODAY = '2026-09-10';
/** 그 날짜 정오의 ISO — 시간대가 흔들려도 같은 날로 떨어진다 */
const at = (dateKey: string): string => new Date(`${dateKey}T12:00:00`).toISOString();

const record = (dateKey: string, total: number, correct: number): LifeType.QuizRecord => ({
	playedAt: at(dateKey),
	source: 'category',
	total,
	correct,
});

test('최근 7일과 그 앞 7일을 나눠 센다', () => {
	const records = [
		record(TODAY, 5, 4), // 이번 주
		record(shiftDateKey(TODAY, -6), 10, 6), // 이번 주 첫날
		record(shiftDateKey(TODAY, -7), 4, 4), // 지난주 마지막 날
		record(shiftDateKey(TODAY, -13), 3, 1), // 지난주 첫날
		record(shiftDateKey(TODAY, -14), 99, 99), // 두 구간 밖 — 세지 않는다
	];
	const attendance = [TODAY, shiftDateKey(TODAY, -1), shiftDateKey(TODAY, -8)];
	const studyByDate = { [TODAY]: 3, [shiftDateKey(TODAY, -6)]: 2, [shiftDateKey(TODAY, -9)]: 5 };

	const report = buildWeeklyReport(records, attendance, studyByDate, TODAY);

	assert.deepEqual(report.thisWeek, { learned: 5, solved: 15, correct: 10, attended: 2 });
	assert.deepEqual(report.lastWeek, { learned: 5, solved: 7, correct: 5, attended: 1 });
	assert.equal(report.from, shiftDateKey(TODAY, -6));
	assert.equal(report.to, TODAY);
});

test('기록이 없어도 0 으로 떨어진다', () => {
	const report = buildWeeklyReport([], [], {}, TODAY);
	assert.deepEqual(report.thisWeek, { learned: 0, solved: 0, correct: 0, attended: 0 });
	assert.deepEqual(report.lastWeek, { learned: 0, solved: 0, correct: 0, attended: 0 });
});

test('정답률 — 푼 문제가 없으면 0 이고 나눗셈이 터지지 않는다', () => {
	assert.equal(accuracy({ learned: 0, solved: 0, correct: 0, attended: 0 }), 0);
	assert.equal(accuracy({ learned: 0, solved: 8, correct: 6, attended: 0 }), 75);
});

test('주간 공유 글 — 늘고 줄고 그대로가 화살표로 갈린다', () => {
	const text = weeklyShareText({
		from: '2026-09-04',
		to: '2026-09-10',
		thisWeek: { learned: 12, solved: 40, correct: 30, attended: 5 },
		lastWeek: { learned: 8, solved: 40, correct: 36, attended: 7 },
	});
	const lines = text.split('\n');
	assert.equal(lines[0], '생활 한자 · 주간 리포트 2026-09-04 ~ 2026-09-10');
	// 늘었으면 ▲, 그대로면 –, 줄었으면 ▼ (▼ 뒤 숫자는 절댓값이라 음수 부호가 겹치지 않는다)
	assert.equal(lines[1], '📘 새 항목 12개 ▲4');
	assert.equal(lines[2], '❓ 푼 문제 40문제 –');
	assert.equal(lines[3], '🎯 정답률 75% ▼15');
	assert.equal(lines[4], '📅 출석 5일 ▼2');
});
