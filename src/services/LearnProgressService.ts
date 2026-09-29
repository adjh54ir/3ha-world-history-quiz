// services/LearnProgressService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LearnType } from '@/src/types/data/LearnType';
import DateUtils from '@/src/utils/DateUtils';
import { CancelWrongReviewReminder } from '@/src/utils/NotifactionHelper';
import i18n from '@/src/translations';

/**
 * 통합 학습/퀴즈 진행 데이터 영구 저장 서비스 (AsyncStorage)
 * - 즐겨찾기(보관함), 오답노트, 학습 통계(정답률/연속 출석)를 기기에 저장
 */

const KEY = {
	BOOKMARKS: 'LEARN_BOOKMARKS',
	WRONG_NOTES: 'LEARN_WRONG_NOTES',
	STATS: 'LEARN_STATS',
	STUDIED: 'LEARN_STUDIED',
	/** 일자별 학습(카드 완료) 수 — '학습' 오늘 완료 판정용 */
	STUDY_LOG: 'LEARN_STUDY_LOG',
	/** 서브 퀴즈 도메인별 최고 기록 */
	SUB_BEST: 'LEARN_SUB_BEST',
} as const;

/** 서브 퀴즈 최고 기록 (도메인별) */
export interface SubQuizBest {
	correct: number;
	total: number;
	at: number;
}

export interface BookmarkItem {
	uid: LearnType.Uid;
	domain: LearnType.Domain;
	domainTitle: string;
	title: string;
	subTitle?: string;
	meaning: string;
	savedAt: number;
}

export interface WrongItem {
	uid: LearnType.Uid;
	domain: LearnType.Domain;
	domainTitle: string;
	prompt: string;
	/** 부제 */
	subTitle?: string;
	answer: string;
	explanation: string;
	level?: string;
	categoryLabel?: string;
	examples?: string[];
	addedAt: number;
	/** 복습 단계 (0부터 시작, 맞힐 때마다 +1) — 간격 반복 스케줄용 */
	reviewStage?: number;
	/** 다음 복습 예정 시각(ms). 없으면 즉시 복습 대상(기존 데이터 호환) */
	nextReviewAt?: number;
	/** 이 문항을 틀린 누적 횟수(기존 데이터는 1로 간주) */
	missCount?: number;
	/** 틀린 문항의 발문('이곳의 수도는?') — 같은 항목도 모드마다 묻는 것이 달라 복습할 때 다시 보여 준다 */
	guide?: string;
	/** 그림 문항(국기·초상 맞히기)의 그림 참조 */
	imageRef?: string;
}

export interface DomainStat {
	solved: number;
	correct: number;
}

export interface LearnStats {
	byDomain: Record<string, DomainStat>;
	totalSolved: number;
	totalCorrect: number;
	totalQuizzes: number;
	streakCount: number;
	bestStreak: number;
	lastPlayedDate: string | null; // 'YYYY-MM-DD'
	/** 전체 최고 연속 정답(콤보) */
	bestComboOverall: number;
	/** 모드별 플레이 세션 수 (mix/ox/blank/time/review/domain) */
	byMode: Record<string, number>;
	/** 일자별 풀이 기록 (최근 60일) */
	dailyLog: Record<string, DomainStat>;
	/** 타임챌린지 플레이별 기록 (최신순, 최근 20회) */
	timeHistory?: TimePlayRecord[];
}

/** 타임챌린지 1회 플레이 기록 */
export interface TimePlayRecord {
	/** 플레이 시각(timestamp) */
	at: number;
	/** 맞힌 문항 수 */
	correct: number;
	/** 푼 문항 수 */
	solved: number;
	/** 해당 판 최고 콤보 */
	bestCombo: number;
}

export interface ResultEntry {
	domain: LearnType.Domain;
	domainTitle: string;
	correct: boolean;
}

export interface RecordOptions {
	mode?: string;
	bestCombo?: number;
	/** 타임챌린지 플레이 점수 기록용 (mode==='time') */
	correct?: number;
	solved?: number;
}

export interface WeeklyDay {
	date: string; // 'YYYY-MM-DD'
	label: string; // '월','화'...
	solved: number;
	correct: number;
}

export interface WeeklyReport {
	days: WeeklyDay[];
	solved: number;
	correct: number;
	accuracy: number;
	activeDays: number;
	weakDomain?: { domain: string; accuracy: number };
}

const WRONG_CAP = 200;
/** 오답 복습 간격(일) — 맞힐 때마다 다음 칸으로. 마지막까지 맞히면 오답노트에서 졸업 */
const REVIEW_INTERVALS_DAY = [1, 3, 7, 14];
const DAY_MS = 24 * 60 * 60 * 1000;

const todayStr = (): string => DateUtils.getLocalDateString();
const diffDays = (from: string, to: string): number => DateUtils.differenceInLocalDays(from, to);

const readJson = async <T>(key: string, fallback: T): Promise<T> => {
	try {
		const raw = await AsyncStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch {
		return fallback;
	}
};

// 통계 쓰기 직렬화 (연속 문항 저장 시 read-modify-write 충돌 방지)
let _writeChain: Promise<unknown> = Promise.resolve();
const serialize = <T>(fn: () => Promise<T>): Promise<T> => {
	const run = _writeChain.then(fn, fn);
	_writeChain = run.catch(() => undefined);
	return run;
};

const writeJson = async (key: string, value: unknown): Promise<void> => {
	try {
		await AsyncStorage.setItem(key, JSON.stringify(value));
	} catch {
		/* noop */
	}
};

const emptyStats = (): LearnStats => ({
	byDomain: {},
	totalSolved: 0,
	totalCorrect: 0,
	totalQuizzes: 0,
	streakCount: 0,
	bestStreak: 0,
	lastPlayedDate: null,
	bestComboOverall: 0,
	byMode: {},
	dailyLog: {},
});

/**
 * 저장소에서 통계를 그대로 읽는다 (쓰기 큐를 기다리지 않음).
 * serialize 블록 '안'에서만 사용 — 밖에서는 큐를 기다리는 getStats()를 쓴다.
 */
const readStats = async (): Promise<LearnStats> => {
	const raw = await readJson<LearnStats>(KEY.STATS, emptyStats());
	// 구버전 데이터 호환: 누락 필드 보강
	return { ...emptyStats(), ...raw, byDomain: raw.byDomain ?? {}, byMode: raw.byMode ?? {}, dailyLog: raw.dailyLog ?? {} };
};

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const DAILY_LOG_CAP = 120;

const addDays = (dateStr: string, n: number): string => DateUtils.addLocalDays(dateStr, n);

const LearnProgressService = {
	// ── 즐겨찾기(보관함) ──────────────────────
	async getBookmarks(): Promise<BookmarkItem[]> {
		return readJson<BookmarkItem[]>(KEY.BOOKMARKS, []);
	},

	async isBookmarked(uid: string): Promise<boolean> {
		const list = await this.getBookmarks();
		return list.some((b) => b.uid === uid);
	},

	/** 토글 후 현재 즐겨찾기 여부 반환 */
	async toggleBookmark(item: Omit<BookmarkItem, 'savedAt'>): Promise<boolean> {
		const list = await this.getBookmarks();
		const exists = list.some((b) => b.uid === item.uid);
		const next = exists ? list.filter((b) => b.uid !== item.uid) : [{ ...item, savedAt: DateUtils.getTimestamp() }, ...list];
		await writeJson(KEY.BOOKMARKS, next);
		return !exists;
	},

	async removeBookmark(uid: string): Promise<void> {
		const list = await this.getBookmarks();
		await writeJson(
			KEY.BOOKMARKS,
			list.filter((b) => b.uid !== uid),
		);
	},

	// ── 오답노트 ──────────────────────────────
	async getWrongNotes(): Promise<WrongItem[]> {
		return readJson<WrongItem[]>(KEY.WRONG_NOTES, []);
	},

	/** 오답 추가 (uid 기준 중복 제거, 최신 우선, 최대 WRONG_CAP개 유지) */
	async addWrongNotes(items: Omit<WrongItem, 'addedAt'>[]): Promise<void> {
		if (!items.length) return;
		const list = await this.getWrongNotes();
		const now = DateUtils.getTimestamp();
		const prevByUid = new Map(list.map((w) => [w.uid, w]));
		const map = new Map<string, WrongItem>();
		// 같은 문항을 또 틀리면 누적 횟수를 올린다(반복 오답 우선 복습용)
		const fresh = items.map((i) => ({
			...i,
			addedAt: now,
			reviewStage: 0,
			nextReviewAt: now + REVIEW_INTERVALS_DAY[0] * DAY_MS,
			missCount: (prevByUid.get(i.uid)?.missCount ?? (prevByUid.has(i.uid) ? 1 : 0)) + 1,
		}));
		[...fresh, ...list].forEach((w) => {
			if (!map.has(w.uid)) map.set(w.uid, w);
		});
		await writeJson(KEY.WRONG_NOTES, Array.from(map.values()).slice(0, WRONG_CAP));
	},

	/** 복습할 때가 된 오답 (예정 시각이 지난 것 · 오래된 것 우선). 예정 시각이 없는 기존 데이터도 대상 */
	async getDueWrongNotes(limit = 3): Promise<WrongItem[]> {
		const now = DateUtils.getTimestamp();
		return (await this.getWrongNotes())
			.filter((w) => (w.nextReviewAt ?? 0) <= now)
			.sort((a, b) => (a.nextReviewAt ?? a.addedAt) - (b.nextReviewAt ?? b.addedAt))
			.slice(0, limit);
	},

	/**
	 * 복습 결과 반영 — 맞히면 다음 간격으로 미루고, 틀리면 1단계로 되돌린다.
	 * 마지막 간격까지 맞히면 오답노트에서 제거(졸업).
	 */
	async applyReviewResult(results: { uid: string; correct: boolean }[]): Promise<void> {
		if (!results.length) return;
		const byUid = new Map(results.map((r) => [r.uid, r.correct]));
		const now = DateUtils.getTimestamp();
		const next = (await this.getWrongNotes()).flatMap((w) => {
			const correct = byUid.get(w.uid);
			if (correct === undefined) return [w];
			const stage = correct ? (w.reviewStage ?? 0) + 1 : 0;
			if (stage >= REVIEW_INTERVALS_DAY.length) return []; // 졸업 — 오답노트에서 제거
			const missCount = (w.missCount ?? 1) + (correct ? 0 : 1);
			return [{ ...w, reviewStage: stage, missCount, nextReviewAt: now + REVIEW_INTERVALS_DAY[stage] * DAY_MS }];
		});
		await writeJson(KEY.WRONG_NOTES, next);
		if (next.length === 0) await CancelWrongReviewReminder();
	},

	async removeWrongNote(uid: string): Promise<void> {
		const next = (await this.getWrongNotes()).filter((w) => w.uid !== uid);
		await writeJson(KEY.WRONG_NOTES, next);
		// 오답이 다 사라졌는데 '어제 틀린 N문제' 알림만 남는 일이 없도록 예약을 정리한다
		if (next.length === 0) await CancelWrongReviewReminder();
	},

	async clearWrongNotes(): Promise<void> {
		await writeJson(KEY.WRONG_NOTES, []);
		await CancelWrongReviewReminder();
	},

	// ── 통계 ──────────────────────────────────
	/**
	 * 통계 조회 — 쓰기 큐(문항별 recordAnswer 등)가 모두 끝난 뒤 읽는다.
	 * 마지막 문항 저장이 큐에 남은 채 읽히면 점수가 한 문제(10점)씩 모자라 보이던 문제를 막는다.
	 */
	async getStats(): Promise<LearnStats> {
		return serialize(readStats);
	},

	/** 퀴즈 1회 결과 반영 (정답률 + 연속 출석 + 일별/모드/콤보 갱신) */
	async recordResults(entries: ResultEntry[], opts: RecordOptions = {}): Promise<LearnStats> {
		const stats = await this.getStats();
		const today = todayStr();
		const todayLog = stats.dailyLog[today] ?? { solved: 0, correct: 0 };

		entries.forEach((e) => {
			const cur = stats.byDomain[e.domain] ?? { solved: 0, correct: 0 };
			cur.solved += 1;
			if (e.correct) cur.correct += 1;
			stats.byDomain[e.domain] = cur;
			stats.totalSolved += 1;
			if (e.correct) stats.totalCorrect += 1;
			todayLog.solved += 1;
			if (e.correct) todayLog.correct += 1;
		});
		stats.totalQuizzes += 1;
		stats.dailyLog[today] = todayLog;

		// 모드별 세션 수
		if (opts.mode) stats.byMode[opts.mode] = (stats.byMode[opts.mode] ?? 0) + 1;
		// 최고 콤보
		if (opts.bestCombo) stats.bestComboOverall = Math.max(stats.bestComboOverall, opts.bestCombo);

		// 연속 출석 갱신
		if (stats.lastPlayedDate !== today) {
			const gap = stats.lastPlayedDate ? diffDays(stats.lastPlayedDate, today) : null;
			stats.streakCount = gap === 1 ? stats.streakCount + 1 : 1;
			stats.lastPlayedDate = today;
			stats.bestStreak = Math.max(stats.bestStreak, stats.streakCount);
		}

		// 일별 로그 캡 (최근 DAILY_LOG_CAP일만 유지)
		const cutoff = addDays(today, -DAILY_LOG_CAP);
		Object.keys(stats.dailyLog).forEach((d) => {
			if (d < cutoff) delete stats.dailyLog[d];
		});

		await writeJson(KEY.STATS, stats);
		return stats;
	},

	/**
	 * 문항 1개 정답/오답을 즉시 반영 (즉각 점수·뱃지 반영용)
	 * - 퀴즈를 끝까지 풀지 않아도 매 문항 점수가 저장됨
	 */
	async recordAnswer(entry: ResultEntry): Promise<LearnStats> {
		return serialize(async () => {
			const stats = await readStats();
			const today = todayStr();
			const todayLog = stats.dailyLog[today] ?? { solved: 0, correct: 0 };

			const cur = stats.byDomain[entry.domain] ?? { solved: 0, correct: 0 };
			cur.solved += 1;
			if (entry.correct) cur.correct += 1;
			stats.byDomain[entry.domain] = cur;
			stats.totalSolved += 1;
			if (entry.correct) stats.totalCorrect += 1;
			todayLog.solved += 1;
			if (entry.correct) todayLog.correct += 1;
			stats.dailyLog[today] = todayLog;

			// 연속 출석 갱신 (오늘 첫 풀이에서)
			if (stats.lastPlayedDate !== today) {
				const gap = stats.lastPlayedDate ? diffDays(stats.lastPlayedDate, today) : null;
				stats.streakCount = gap === 1 ? stats.streakCount + 1 : 1;
				stats.lastPlayedDate = today;
				stats.bestStreak = Math.max(stats.bestStreak, stats.streakCount);
			}

			const cutoff = addDays(today, -DAILY_LOG_CAP);
			Object.keys(stats.dailyLog).forEach((d) => {
				if (d < cutoff) delete stats.dailyLog[d];
			});

			await writeJson(KEY.STATS, stats);
			return stats;
		});
	},

	/** 퀴즈 세션 종료 시 세션/모드/콤보만 반영 (문항 점수는 recordAnswer로 이미 반영됨) */
	async recordQuizSession(opts: RecordOptions = {}): Promise<LearnStats> {
		return serialize(async () => {
			const stats = await readStats();
			stats.totalQuizzes += 1;
			if (opts.mode) stats.byMode[opts.mode] = (stats.byMode[opts.mode] ?? 0) + 1;
			if (opts.bestCombo) stats.bestComboOverall = Math.max(stats.bestComboOverall, opts.bestCombo);
			// 서브 퀴즈(sub-*) 최고 기록 저장
			if (opts.mode?.startsWith('sub-')) {
				await this.recordSubQuizBest(opts.mode.slice(4), opts.correct ?? 0, opts.solved ?? 0);
			}
			// 타임챌린지는 플레이별 점수를 최근 20회까지 보관
			if (opts.mode === 'time') {
				const history = stats.timeHistory ?? [];
				history.unshift({
					at: DateUtils.getTimestamp(),
					correct: opts.correct ?? 0,
					solved: opts.solved ?? 0,
					bestCombo: opts.bestCombo ?? 0,
				});
				stats.timeHistory = history.slice(0, 20);
			}
			await writeJson(KEY.STATS, stats);
			return stats;
		});
	},

	/** 최근 7일 주간 리포트 */
	async getWeeklyReport(): Promise<WeeklyReport> {
		const stats = await this.getStats();
		const today = todayStr();
		const days: WeeklyDay[] = [];
		let solved = 0;
		let correct = 0;
		let activeDays = 0;

		for (let i = 6; i >= 0; i--) {
			const date = addDays(today, -i);
			const log = stats.dailyLog[date] ?? { solved: 0, correct: 0 };
			const dow = DateUtils.getLocalDayOfWeek(date);
			days.push({ date, label: i18n.t(`svc.weekday.${DAY_KEYS[dow]}`), solved: log.solved, correct: log.correct });
			solved += log.solved;
			correct += log.correct;
			if (log.solved > 0) activeDays += 1;
		}

		// 약한 주제: 응시한 도메인 중 정답률 최저
		let weakDomain: { domain: string; accuracy: number } | undefined;
		Object.entries(stats.byDomain).forEach(([domain, s]) => {
			if (s.solved < 5) return;
			const acc = Math.round((s.correct / s.solved) * 100);
			if (!weakDomain || acc < weakDomain.accuracy) weakDomain = { domain, accuracy: acc };
		});

		return {
			days,
			solved,
			correct,
			accuracy: solved > 0 ? Math.round((correct / solved) * 100) : 0,
			activeDays,
			weakDomain,
		};
	},

	// ── 학습 진도(읽은 카드) ──────────────────
	/** 도메인별 학습 완료한 카드 uid 목록 */
	async getStudied(): Promise<Record<string, string[]>> {
		return readJson<Record<string, string[]>>(KEY.STUDIED, {});
	},

	/** 학습 완료 카드 기록 (도메인별 uid 중복 제거) + 일별 학습 로그 증가 */
	async addStudied(domain: string, uid: string): Promise<void> {
		const all = await this.getStudied();
		const list = all[domain] ?? [];
		if (!list.includes(uid)) {
			all[domain] = [...list, uid];
			await writeJson(KEY.STUDIED, all);
			// 새 카드 학습 시에만 오늘 일별 로그 +1 (최근 60일 유지)
			const log = await readJson<Record<string, number>>(KEY.STUDY_LOG, {});
			const today = todayStr();
			log[today] = (log[today] ?? 0) + 1;
			const cutoff = addDays(today, -60);
			Object.keys(log).forEach((d) => {
				if (d < cutoff) delete log[d];
			});
			await writeJson(KEY.STUDY_LOG, log);
		}
	},

	/** 오늘 학습(카드 완료)한 개수 — 홈 '학습' 오늘 완료 판정용 */
	async getStudiedTodayCount(): Promise<number> {
		const log = await readJson<Record<string, number>>(KEY.STUDY_LOG, {});
		return log[todayStr()] ?? 0;
	},

	/** 일자별 학습(카드·숏폼 완료) 수 — 학습 리포트용 */
	async getStudyLog(): Promise<Record<string, number>> {
		return readJson<Record<string, number>>(KEY.STUDY_LOG, {});
	},

	/** 서브 퀴즈 도메인별 최고 기록 조회 */
	async getSubQuizBests(): Promise<Record<string, SubQuizBest>> {
		return readJson<Record<string, SubQuizBest>>(KEY.SUB_BEST, {});
	},

	/**
	 * 서브 퀴즈 한 판 기록 — 메인 점수·정답률에는 섞지 않고 모드별 판 수(byMode['sub-<주제>'])만 올린다.
	 * 서브 퀴즈 뱃지(ConstAchievements)가 이 값을 본다.
	 */
	async recordSubQuizPlay(mode: string): Promise<void> {
		return serialize(async () => {
			const stats = await readStats();
			stats.byMode[mode] = (stats.byMode[mode] ?? 0) + 1;
			await writeJson(KEY.STATS, stats);
		});
	},

	/** 서브 퀴즈 결과 기록 — 정답 수가 기존 최고보다 높을 때만 갱신 */
	async recordSubQuizBest(domain: string, correct: number, total: number): Promise<void> {
		const all = await this.getSubQuizBests();
		const prev = all[domain];
		if (!prev || correct > prev.correct) {
			all[domain] = { correct, total, at: DateUtils.getTimestamp() };
			await writeJson(KEY.SUB_BEST, all);
		}
	},

	/** 특정 도메인의 학습 완료 uid 집합 */
	async getStudiedSet(domain: string): Promise<Set<string>> {
		const all = await this.getStudied();
		return new Set(all[domain] ?? []);
	},

	/** 학습 완료 취소(복습하기) — 다시 '학습중' 상태로 되돌림 */
	async removeStudied(domain: string, uid: string): Promise<void> {
		const all = await this.getStudied();
		const list = all[domain] ?? [];
		if (list.includes(uid)) {
			all[domain] = list.filter((u) => u !== uid);
			await writeJson(KEY.STUDIED, all);
		}
	},

	/** 도메인별 학습 완료 카드 수 */
	async getStudiedCounts(): Promise<Record<string, number>> {
		const all = await this.getStudied();
		const out: Record<string, number> = {};
		Object.keys(all).forEach((k) => {
			out[k] = all[k].length;
		});
		return out;
	},

	/** 오늘 진행분만 초기화 — 홈 '오늘의 목표'(오늘 푼 문제)와 오늘 학습 수를 0으로 되돌림 */
	async clearTodayProgress(): Promise<void> {
		return serialize(async () => {
			const today = todayStr();
			const stats = await readStats();
			delete stats.dailyLog[today];
			await writeJson(KEY.STATS, stats);
			const log = await readJson<Record<string, number>>(KEY.STUDY_LOG, {});
			delete log[today];
			await writeJson(KEY.STUDY_LOG, log);
		});
	},

	// 초기화도 통계 쓰기 체인에 태운다 — 동시에 실행되는 다른 쓰기(clearTodayProgress 등)가
	// 초기화 직전에 읽어둔 옛 통계를 되살려 쓰는 것을 막는다.
	async resetStats(): Promise<void> {
		return serialize(async () => {
			await writeJson(KEY.STATS, emptyStats());
			await writeJson(KEY.STUDIED, {});
			await writeJson(KEY.STUDY_LOG, {});
			await writeJson(KEY.SUB_BEST, {});
		});
	},

	async clearBookmarks(): Promise<void> {
		await writeJson(KEY.BOOKMARKS, []);
	},

	/** 학습 초기화 — 카드·숏폼으로 익힌 진행분(학습 완료 카드/일자별 학습 수)만 지운다 */
	async clearLearning(): Promise<void> {
		return serialize(async () => {
			await Promise.all([writeJson(KEY.STUDIED, {}), writeJson(KEY.STUDY_LOG, {})]);
		});
	},

	/** 퀴즈 초기화 — 점수·정답률·오답노트·주제별 최고 기록 (학습 진행분은 남긴다) */
	async clearQuiz(): Promise<void> {
		return serialize(async () => {
			await Promise.all([writeJson(KEY.STATS, emptyStats()), writeJson(KEY.WRONG_NOTES, []), writeJson(KEY.SUB_BEST, {})]);
		});
	},

	/** 타임챌린지 초기화 — 통계 안의 타임챌린지 플레이 기록/세션 수만 비운다 */
	async clearTimeChallenge(): Promise<void> {
		return serialize(async () => {
			const stats = await readStats();
			stats.timeHistory = [];
			if (stats.byMode) delete stats.byMode.time;
			await writeJson(KEY.STATS, stats);
		});
	},

	/** 즐겨찾기 + 오답노트 + 통계 모두 초기화 */
	async clearAll(): Promise<void> {
		return serialize(async () => {
			await Promise.all([writeJson(KEY.BOOKMARKS, []), writeJson(KEY.WRONG_NOTES, []), writeJson(KEY.STATS, emptyStats()), writeJson(KEY.STUDIED, {}), writeJson(KEY.STUDY_LOG, {}), writeJson(KEY.SUB_BEST, {})]);
		});
	},
};

export default LearnProgressService;
