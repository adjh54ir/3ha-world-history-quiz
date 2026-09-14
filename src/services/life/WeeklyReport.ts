/**
 * 주간 리포트 — 최근 7일과 그 앞 7일을 견줘 준다.
 * -------------------------------------------------
 * "이번 주" 를 월~일로 잡지 않고 **오늘까지의 7일** 로 잡는다.
 * 주 초에 들어오면 월요일 하루치만 비교돼 늘 "지난주보다 줄었다" 로 보이기 때문이다.
 * 굴러가는 7일 창이면 언제 들어와도 같은 길이의 두 구간을 견준다.
 *
 * 자료는 이미 있는 것만 쓴다 — 새 저장소를 만들지 않는다.
 *   학습한 단어 : DailyActivityUtils 의 날짜별 'study' 카운터 (보관 14일 = 두 구간에 딱 맞는다)
 *   푼 문제·정답 : LifeSlice 의 퀴즈 기록(playedAt 이 ISO 일시)
 *   출석        : LifeSlice 의 출석일 목록
 */
import type { LifeType } from '../../types/data/LifeType.ts';
import DateUtils from '../../utils/DateUtils.ts';
import { shiftDateKey, toDateKey } from './LifeRules.ts';

/** 한 구간(7일)의 집계 */
export interface WeekMetrics {
	/** 처음 익힌 단어 수 */
	learned: number;
	/** 푼 문제 수 */
	solved: number;
	/** 맞힌 문제 수 */
	correct: number;
	/** 출석한 날 수 */
	attended: number;
}

export interface WeeklyReport {
	thisWeek: WeekMetrics;
	lastWeek: WeekMetrics;
	/** 이번 주 구간 (YYYY-MM-DD) — 화면에 "9/4 ~ 9/10" 로 적는다 */
	from: string;
	to: string;
}

/** 한 구간의 길이 */
export const WEEK_DAYS = 7;

const EMPTY: WeekMetrics = { learned: 0, solved: 0, correct: 0, attended: 0 };

/** 시작일(포함)부터 days 일치 날짜 키 */
const dateRange = (start: string, days: number): string[] => Array.from({ length: days }, (_, at) => shiftDateKey(start, at));

/**
 * 정답률 — 푼 문제가 없으면 0. 화면 두 곳에서 같은 규칙으로 쓰려고 여기서 정한다.
 */
export const accuracy = (week: WeekMetrics): number => (week.solved > 0 ? Math.round((week.correct / week.solved) * 100) : 0);

/**
 * 두 구간을 집계한다.
 * @param records   퀴즈 기록 (최신순이어도 상관없다 — 날짜로만 고른다)
 * @param attendance 출석일 YYYY-MM-DD 목록
 * @param studyByDate 날짜별 학습 단어 수 (DailyActivityUtils 로그에서 뽑아 넘긴다)
 * @param today     기준일. 넘기지 않으면 기기의 오늘
 */
export const buildWeeklyReport = (
	records: LifeType.QuizRecord[],
	attendance: string[],
	studyByDate: Record<string, number>,
	today: string = toDateKey(),
): WeeklyReport => {
	const thisFrom = shiftDateKey(today, -(WEEK_DAYS - 1));
	const lastFrom = shiftDateKey(today, -(WEEK_DAYS * 2 - 1));
	const thisDates = new Set(dateRange(thisFrom, WEEK_DAYS));
	const lastDates = new Set(dateRange(lastFrom, WEEK_DAYS));
	const attended = new Set(attendance);

	const thisWeek: WeekMetrics = { ...EMPTY };
	const lastWeek: WeekMetrics = { ...EMPTY };

	// 학습 · 출석 — 날짜 키를 그대로 본다
	thisDates.forEach((date) => {
		thisWeek.learned += studyByDate[date] ?? 0;
		thisWeek.attended += attended.has(date) ? 1 : 0;
	});
	lastDates.forEach((date) => {
		lastWeek.learned += studyByDate[date] ?? 0;
		lastWeek.attended += attended.has(date) ? 1 : 0;
	});

	// 퀴즈 — ISO 일시를 **기기 시간대의** 날짜 키로 바꿔서 어느 구간인지 고른다.
	// 문자열 앞 10글자를 그냥 자르면 UTC 날짜라, 한국에서 새벽에 푼 판이 하루 앞 구간으로 샌다.
	for (const record of records) {
		const date = DateUtils.getLocalDateString(new Date(record.playedAt));
		const bucket = thisDates.has(date) ? thisWeek : lastDates.has(date) ? lastWeek : null;
		if (!bucket) {
			continue;
		}
		bucket.solved += record.total;
		bucket.correct += record.correct;
	}

	return { thisWeek, lastWeek, from: thisFrom, to: today };
};

export default { buildWeeklyReport, accuracy, WEEK_DAYS };

/**
 * 주간 리포트를 공유 글로 — 이미지로 뜨려면 화면 캡처 모듈이 필요해서 글로만 보낸다
 * (오늘의 퀴즈 공유 `dailyShareText` 와 같은 방식이다).
 *
 * 숫자만 늘어놓으면 읽는 사람에게 아무 뜻이 없다. 항목마다 지난주 대비 화살표를 붙여
 * "이번 주에 뭐가 나아졌는지" 가 한 줄로 보이게 한다.
 *
 * ponytail: 텍스트 공유. 카드 이미지가 필요해지면 react-native-view-shot 을 넣고 captureRef 로 바꾼다.
 */
export const weeklyShareText = (report: WeeklyReport): string => {
	const { thisWeek, lastWeek } = report;
	const arrow = (delta: number): string => (delta > 0 ? `▲${delta}` : delta < 0 ? `▼${Math.abs(delta)}` : '–');
	const line = (label: string, now: number, before: number, unit: string): string => `${label} ${now}${unit} ${arrow(now - before)}`;
	return [
		`생활 한자 · 주간 리포트 ${report.from} ~ ${report.to}`,
		line('📘 새 단어', thisWeek.learned, lastWeek.learned, '개'),
		line('❓ 푼 문제', thisWeek.solved, lastWeek.solved, '문제'),
		line('🎯 정답률', accuracy(thisWeek), accuracy(lastWeek), '%'),
		line('📅 출석', thisWeek.attended, lastWeek.attended, '일'),
	].join('\n');
};
