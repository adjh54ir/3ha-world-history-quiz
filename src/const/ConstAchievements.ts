// const/ConstAchievements.ts
import Colors from '@/src/const/ConstColors';
import { DOMAIN_LEVELS } from '@/src/const/ConstDomainLevels';
import { WORLD_TOPIC_TEXT } from '@/src/const/data/world/ConstWorldText';
import { POINT_PER_CORRECT } from '@/src/const/ConstScoring';
import { LearnStats } from '@/src/services/LearnProgressService';
import { themed } from '@/src/utils/ThemedStyles';
import i18n from '@/src/translations';

/** 도메인별 풀이 수 헬퍼 */
const domainSolved = (s: LearnStats, key: string): number => s.byDomain?.[key]?.solved ?? 0;

/** 도메인별 누적 점수 (레벨 임계값과 같은 기준) */
const domainScore = (s: LearnStats, key: string): number => (s.byDomain?.[key]?.correct ?? 0) * POINT_PER_CORRECT;

/** 업적 분류 — 목록 그룹 헤더 · 색상 팔레트 기준 */
export type AchievementGroup = 'progress' | 'session' | 'streak' | 'skill' | 'topic';

/**
 * 그룹 = 색상. 업적마다 색을 따로 두면 목록이 무지개처럼 튀어서 5색으로 통일하고,
 * 개성은 아이콘으로만 준다.
 */
export const ACHIEVEMENT_GROUPS: { key: AchievementGroup; label: string; icon: string; color: string }[] = themed(() => ([
	// 홈 뱃지 타일 배경이 파란색(primary)이라 그룹색에 파랑 계열을 쓰면 아이콘이 묻힌다 — 파랑 제외
	{ key: 'progress', label: i18n.t('achievements.groups.progress'), icon: 'trending-up', color: Colors.heat },
	{ key: 'session', label: i18n.t('achievements.groups.session'), icon: 'sports-esports', color: Colors.goldDark },
	{ key: 'streak', label: i18n.t('achievements.groups.streak'), icon: 'local-fire-department', color: Colors.error },
	{ key: 'skill', label: i18n.t('achievements.groups.skill'), icon: 'bolt', color: Colors.amber },
	{ key: 'topic', label: i18n.t('achievements.groups.topic'), icon: 'public', color: Colors.success },
]));

/** 뱃지 희귀도 — 같은 그룹 안에서 목표치가 높을수록 희귀해진다 */
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legend';

/**
 * 등급 = 색. 일반 → 전설로 갈수록 같은 계열에서 점점 진해진다.
 * (홈 뱃지 타일 배경이 파란색이라 파랑 계열은 쓰지 않는다)
 */
export const RARITY_META: Record<AchievementRarity, { label: string; color: string }> = themed(() => ({
	common: { label: i18n.t('achievements.rarity.common'), color: Colors.amber },
	rare: { label: i18n.t('achievements.rarity.rare'), color: Colors.goldDark },
	epic: { label: i18n.t('achievements.rarity.epic'), color: Colors.goldDeep },
	legend: { label: i18n.t('achievements.rarity.legend'), color: Colors.heatDeep },
}));

/**
 * 파란 브랜드 면(홈 요약 카드) 위에서 쓰는 등급색.
 * 기본 등급색은 어두운 주황·갈색 계열이라 파란 배경에서 묻힌다 — 같은 계열의 밝은 톤으로 바꾼다.
 */
export const RARITY_ON_BRAND_COLOR: Record<AchievementRarity, string> = themed(() => ({
	common: Colors.goldSoft,
	rare: Colors.gold,
	epic: Colors.heatSoft,
	legend: Colors.heatLight,
}));

export const RARITY_ORDER: AchievementRarity[] = ['common', 'rare', 'epic', 'legend'];

/** 희귀도 정렬용 순위 — 클수록 희귀 */
export const rarityRank = (r: AchievementRarity): number => RARITY_ORDER.indexOf(r);

export interface AchievementDef {
	id: string;
	/** 뱃지 이름 */
	title: string;
	/** 뱃지 설명 — 이 뱃지가 어떤 의미인지 */
	desc: string;
	/** 획득 조건 — 무엇을 얼마나 해야 하는지 */
	cond: string;
	/** 희귀도 (그룹 내 목표치 순위로 자동 산정) */
	rarity: AchievementRarity;
	icon: string; // materialIcons name
	color: string; // 그룹 색상 (자동 주입)
	group: AchievementGroup;
	target: number;
	/** 현재 진행 값 (target 이상이면 해금) */
	current: (s: LearnStats) => number;
	/** 진행 값 표기 단위(% 등) */
	unit?: string;
}

/** 뱃지 설명(의미) — 획득 조건(cond)과 구분해서 보여준다 */
const DESCS: Record<string, string> = {
	first_quiz: i18n.t('achievements.badges.first_quiz.desc'),
	correct_50: i18n.t('achievements.badges.correct_50.desc'),
	solve_100: i18n.t('achievements.badges.solve_100.desc'),
	correct_300: i18n.t('achievements.badges.correct_300.desc'),
	solve_500: i18n.t('achievements.badges.solve_500.desc'),
	solve_1000: i18n.t('achievements.badges.solve_1000.desc'),
	correct_1000: i18n.t('achievements.badges.correct_1000.desc'),
	solve_2000: i18n.t('achievements.badges.solve_2000.desc'),
	solve_3000: i18n.t('achievements.badges.solve_3000.desc'),
	quizzes_10: i18n.t('achievements.badges.quizzes_10.desc'),
	quizzes_50: i18n.t('achievements.badges.quizzes_50.desc'),
	quizzes_100: i18n.t('achievements.badges.quizzes_100.desc'),
	quizzes_300: i18n.t('achievements.badges.quizzes_300.desc'),
	streak_3: i18n.t('achievements.badges.streak_3.desc'),
	streak_7: i18n.t('achievements.badges.streak_7.desc'),
	streak_14: i18n.t('achievements.badges.streak_14.desc'),
	streak_30: i18n.t('achievements.badges.streak_30.desc'),
	streak_60: i18n.t('achievements.badges.streak_60.desc'),
	streak_100: i18n.t('achievements.badges.streak_100.desc'),
	combo_5: i18n.t('achievements.badges.combo_5.desc'),
	combo_10: i18n.t('achievements.badges.combo_10.desc'),
	combo_20: i18n.t('achievements.badges.combo_20.desc'),
	combo_30: i18n.t('achievements.badges.combo_30.desc'),
	combo_50: i18n.t('achievements.badges.combo_50.desc'),
	accuracy_80: i18n.t('achievements.badges.accuracy_80.desc'),
	accuracy_90: i18n.t('achievements.badges.accuracy_90.desc'),
	accuracy_95: i18n.t('achievements.badges.accuracy_95.desc'),
	time_10: i18n.t('achievements.badges.time_10.desc'),
	time_50: i18n.t('achievements.badges.time_50.desc'),
	review_10: i18n.t('achievements.badges.review_10.desc'),
	review_30: i18n.t('achievements.badges.review_30.desc'),
	all_domains: i18n.t('achievements.badges.all_domains.desc'),
	all_12: i18n.t('achievements.badges.all_12.desc'),
	solve_50: i18n.t('achievements.badges.solve_50.desc'),
	correct_100: i18n.t('achievements.badges.correct_100.desc'),
	correct_2000: i18n.t('achievements.badges.correct_2000.desc'),
	solve_5000: i18n.t('achievements.badges.solve_5000.desc'),
	quizzes_3: i18n.t('achievements.badges.quizzes_3.desc'),
	quizzes_200: i18n.t('achievements.badges.quizzes_200.desc'),
	quizzes_500: i18n.t('achievements.badges.quizzes_500.desc'),
	streak_21: i18n.t('achievements.badges.streak_21.desc'),
	streak_50: i18n.t('achievements.badges.streak_50.desc'),
	streak_180: i18n.t('achievements.badges.streak_180.desc'),
	combo_15: i18n.t('achievements.badges.combo_15.desc'),
	combo_100: i18n.t('achievements.badges.combo_100.desc'),
	accuracy_70: i18n.t('achievements.badges.accuracy_70.desc'),
	accuracy_99: i18n.t('achievements.badges.accuracy_99.desc'),
	ox_20: i18n.t('achievements.badges.ox_20.desc'),
	blank_15: i18n.t('achievements.badges.blank_15.desc'),
	initial_15: i18n.t('achievements.badges.initial_15.desc'),
	mix_30: i18n.t('achievements.badges.mix_30.desc'),
	bookmark_10: i18n.t('achievements.badges.bookmark_10.desc'),
	day_solve_30: i18n.t('achievements.badges.day_solve_30.desc'),
	day_solve_100: i18n.t('achievements.badges.day_solve_100.desc'),
	active_days_10: i18n.t('achievements.badges.active_days_10.desc'),
	active_days_30: i18n.t('achievements.badges.active_days_30.desc'),
	daily_7: i18n.t('achievements.badges.daily_7.desc'),
	daily_30: i18n.t('achievements.badges.daily_30.desc'),
	exam_5: i18n.t('achievements.badges.exam_5.desc'),
	weak_10: i18n.t('achievements.badges.weak_10.desc'),
	domain_30: i18n.t('achievements.badges.domain_30.desc'),
	streak_365: i18n.t('achievements.badges.streak_365.desc'),
	now_streak_5: i18n.t('achievements.badges.now_streak_5.desc'),
	now_streak_15: i18n.t('achievements.badges.now_streak_15.desc'),
	time_correct_15: i18n.t('achievements.badges.time_correct_15.desc'),
	time_correct_30: i18n.t('achievements.badges.time_correct_30.desc'),
	time_combo_10: i18n.t('achievements.badges.time_combo_10.desc'),
	mode_5: i18n.t('achievements.badges.mode_5.desc'),
	mode_8: i18n.t('achievements.badges.mode_8.desc'),
	deep_domain_3: i18n.t('achievements.badges.deep_domain_3.desc'),
	capital_100: i18n.t('achievements.badges.capital_100.desc'),
	capital_240: i18n.t('achievements.badges.capital_240.desc'),
	landmark_50: i18n.t('achievements.badges.landmark_50.desc'),
	nature_30: i18n.t('achievements.badges.nature_30.desc'),
	figure_100: i18n.t('achievements.badges.figure_100.desc'),
	figure_300: i18n.t('achievements.badges.figure_300.desc'),
	event_50: i18n.t('achievements.badges.event_50.desc'),
	myth_50: i18n.t('achievements.badges.myth_50.desc'),
	space_20: i18n.t('achievements.badges.space_20.desc'),
	constellation_30: i18n.t('achievements.badges.constellation_30.desc'),
	sub_worldcup_3: i18n.t('achievements.badges.sub_worldcup_3.desc'),
	sub_olympic_3: i18n.t('achievements.badges.sub_olympic_3.desc'),
	sub_winter_3: i18n.t('achievements.badges.sub_winter_3.desc'),
	sub_sports_all: i18n.t('achievements.badges.sub_sports_all.desc'),
	picture_10: i18n.t('achievements.badges.picture_10.desc'),
};

/** 정답률 업적 공통 — 100문제 이상 풀었을 때만 집계 */
const accuracyOf = (s: LearnStats): number => (s.totalSolved >= 100 ? Math.round((s.totalCorrect / s.totalSolved) * 100) : 0);

/** 하루 최다 풀이 — 일자별 기록 중 가장 많이 푼 날의 문제 수 */
const bestDaySolved = (s: LearnStats): number => Math.max(0, ...Object.values(s.dailyLog ?? {}).map((d) => d.solved));

/** 학습한 날 수 — 한 문제라도 푼 날 */
const activeDays = (s: LearnStats): number => Object.values(s.dailyLog ?? {}).filter((d) => d.solved > 0).length;

/** 타임챌린지 한 판 최고 정답 수 */
const bestTimeCorrect = (s: LearnStats): number => Math.max(0, ...(s.timeHistory ?? []).map((r) => r.correct));

/** 타임챌린지 한 판 최고 콤보 */
const bestTimeCombo = (s: LearnStats): number => Math.max(0, ...(s.timeHistory ?? []).map((r) => r.bestCombo));

/**
 * 통합 업적 정의 — 학습/퀴즈/연속출석/모드/도메인 전반
 */
const BASE_DEFS: Omit<AchievementDef, 'color' | 'desc' | 'rarity'>[] = [
	// ── 누적 학습 (풀이·정답) ──
	{ id: 'first_quiz', group: 'progress', title: i18n.t('achievements.badges.first_quiz.title'), cond: i18n.t('achievements.badges.first_quiz.cond'), icon: 'rocket-launch', target: 1, current: (s) => s.totalQuizzes },
	{ id: 'correct_50', group: 'progress', title: i18n.t('achievements.badges.correct_50.title'), cond: i18n.t('achievements.badges.correct_50.cond'), icon: 'done-all', target: 50, current: (s) => s.totalCorrect },
	{ id: 'solve_100', group: 'progress', title: i18n.t('achievements.badges.solve_100.title'), cond: i18n.t('achievements.badges.solve_100.cond'), icon: 'task-alt', target: 100, current: (s) => s.totalSolved },
	{ id: 'correct_300', group: 'progress', title: i18n.t('achievements.badges.correct_300.title'), cond: i18n.t('achievements.badges.correct_300.cond'), icon: 'verified', target: 300, current: (s) => s.totalCorrect },
	{ id: 'solve_500', group: 'progress', title: i18n.t('achievements.badges.solve_500.title'), cond: i18n.t('achievements.badges.solve_500.cond'), icon: 'workspace-premium', target: 500, current: (s) => s.totalSolved },
	{ id: 'solve_1000', group: 'progress', title: i18n.t('achievements.badges.solve_1000.title'), cond: i18n.t('achievements.badges.solve_1000.cond'), icon: 'military-tech', target: 1000, current: (s) => s.totalSolved },
	{ id: 'correct_1000', group: 'progress', title: i18n.t('achievements.badges.correct_1000.title'), cond: i18n.t('achievements.badges.correct_1000.cond'), icon: 'grade', target: 1000, current: (s) => s.totalCorrect },
	{ id: 'solve_2000', group: 'progress', title: i18n.t('achievements.badges.solve_2000.title'), cond: i18n.t('achievements.badges.solve_2000.cond'), icon: 'emoji-events', target: 2000, current: (s) => s.totalSolved },
	{ id: 'solve_3000', group: 'progress', title: i18n.t('achievements.badges.solve_3000.title'), cond: i18n.t('achievements.badges.solve_3000.cond'), icon: 'auto-awesome', target: 3000, current: (s) => s.totalSolved },
	{ id: 'solve_50', group: 'progress', title: i18n.t('achievements.badges.solve_50.title'), cond: i18n.t('achievements.badges.solve_50.cond'), icon: 'directions-walk', target: 50, current: (s) => s.totalSolved },
	{ id: 'correct_100', group: 'progress', title: i18n.t('achievements.badges.correct_100.title'), cond: i18n.t('achievements.badges.correct_100.cond'), icon: 'check-circle', target: 100, current: (s) => s.totalCorrect },
	{ id: 'correct_2000', group: 'progress', title: i18n.t('achievements.badges.correct_2000.title'), cond: i18n.t('achievements.badges.correct_2000.cond'), icon: 'stars', target: 2000, current: (s) => s.totalCorrect },
	{ id: 'solve_5000', group: 'progress', title: i18n.t('achievements.badges.solve_5000.title'), cond: i18n.t('achievements.badges.solve_5000.cond'), icon: 'diamond', target: 5000, current: (s) => s.totalSolved },
	{ id: 'day_solve_30', group: 'progress', title: i18n.t('achievements.badges.day_solve_30.title'), cond: i18n.t('achievements.badges.day_solve_30.cond'), icon: 'today', target: 30, current: bestDaySolved },
	{ id: 'day_solve_100', group: 'progress', title: i18n.t('achievements.badges.day_solve_100.title'), cond: i18n.t('achievements.badges.day_solve_100.cond'), icon: 'bolt', target: 100, current: bestDaySolved },
	{ id: 'active_days_10', group: 'progress', title: i18n.t('achievements.badges.active_days_10.title'), cond: i18n.t('achievements.badges.active_days_10.cond'), icon: 'edit-calendar', target: 10, current: activeDays },
	{ id: 'active_days_30', group: 'progress', title: i18n.t('achievements.badges.active_days_30.title'), cond: i18n.t('achievements.badges.active_days_30.cond'), icon: 'calendar-month', target: 30, current: activeDays },

	// ── 퀴즈 플레이 횟수 ──
	{ id: 'quizzes_10', group: 'session', title: i18n.t('achievements.badges.quizzes_10.title'), cond: i18n.t('achievements.badges.quizzes_10.cond'), icon: 'sports-esports', target: 10, current: (s) => s.totalQuizzes },
	{ id: 'quizzes_50', group: 'session', title: i18n.t('achievements.badges.quizzes_50.title'), cond: i18n.t('achievements.badges.quizzes_50.cond'), icon: 'trending-up', target: 50, current: (s) => s.totalQuizzes },
	{ id: 'quizzes_100', group: 'session', title: i18n.t('achievements.badges.quizzes_100.title'), cond: i18n.t('achievements.badges.quizzes_100.cond'), icon: 'workspace-premium', target: 100, current: (s) => s.totalQuizzes },
	{ id: 'quizzes_300', group: 'session', title: i18n.t('achievements.badges.quizzes_300.title'), cond: i18n.t('achievements.badges.quizzes_300.cond'), icon: 'stars', target: 300, current: (s) => s.totalQuizzes },
	{ id: 'quizzes_3', group: 'session', title: i18n.t('achievements.badges.quizzes_3.title'), cond: i18n.t('achievements.badges.quizzes_3.cond'), icon: 'play-circle', target: 3, current: (s) => s.totalQuizzes },
	{ id: 'quizzes_200', group: 'session', title: i18n.t('achievements.badges.quizzes_200.title'), cond: i18n.t('achievements.badges.quizzes_200.cond'), icon: 'emoji-events', target: 200, current: (s) => s.totalQuizzes },
	{ id: 'quizzes_500', group: 'session', title: i18n.t('achievements.badges.quizzes_500.title'), cond: i18n.t('achievements.badges.quizzes_500.cond'), icon: 'shield', target: 500, current: (s) => s.totalQuizzes },
	{ id: 'daily_7', group: 'session', title: i18n.t('achievements.badges.daily_7.title'), cond: i18n.t('achievements.badges.daily_7.cond'), icon: 'wb-sunny', target: 7, current: (s) => s.byMode?.daily ?? 0 },
	{ id: 'daily_30', group: 'session', title: i18n.t('achievements.badges.daily_30.title'), cond: i18n.t('achievements.badges.daily_30.cond'), icon: 'brightness-high', target: 30, current: (s) => s.byMode?.daily ?? 0 },
	{ id: 'exam_5', group: 'session', title: i18n.t('achievements.badges.exam_5.title'), cond: i18n.t('achievements.badges.exam_5.cond'), icon: 'assignment', target: 5, current: (s) => s.byMode?.exam ?? 0 },
	{ id: 'weak_10', group: 'session', title: i18n.t('achievements.badges.weak_10.title'), cond: i18n.t('achievements.badges.weak_10.cond'), icon: 'my-location', target: 10, current: (s) => s.byMode?.weak ?? 0 },
	{ id: 'domain_30', group: 'session', title: i18n.t('achievements.badges.domain_30.title'), cond: i18n.t('achievements.badges.domain_30.cond'), icon: 'category', target: 30, current: (s) => s.byMode?.domain ?? 0 },

	// ── 연속 학습 ──
	{ id: 'streak_3', group: 'streak', title: i18n.t('achievements.badges.streak_3.title'), cond: i18n.t('achievements.badges.streak_3.cond'), icon: 'event-available', target: 3, current: (s) => s.bestStreak },
	{ id: 'streak_7', group: 'streak', title: i18n.t('achievements.badges.streak_7.title'), cond: i18n.t('achievements.badges.streak_7.cond'), icon: 'local-fire-department', target: 7, current: (s) => s.bestStreak },
	{ id: 'streak_14', group: 'streak', title: i18n.t('achievements.badges.streak_14.title'), cond: i18n.t('achievements.badges.streak_14.cond'), icon: 'calendar-month', target: 14, current: (s) => s.bestStreak },
	{ id: 'streak_30', group: 'streak', title: i18n.t('achievements.badges.streak_30.title'), cond: i18n.t('achievements.badges.streak_30.cond'), icon: 'whatshot', target: 30, current: (s) => s.bestStreak },
	{ id: 'streak_60', group: 'streak', title: i18n.t('achievements.badges.streak_60.title'), cond: i18n.t('achievements.badges.streak_60.cond'), icon: 'calendar-today', target: 60, current: (s) => s.bestStreak },
	{ id: 'streak_100', group: 'streak', title: i18n.t('achievements.badges.streak_100.title'), cond: i18n.t('achievements.badges.streak_100.cond'), icon: 'diamond', target: 100, current: (s) => s.bestStreak },
	{ id: 'streak_21', group: 'streak', title: i18n.t('achievements.badges.streak_21.title'), cond: i18n.t('achievements.badges.streak_21.cond'), icon: 'date-range', target: 21, current: (s) => s.bestStreak },
	{ id: 'streak_50', group: 'streak', title: i18n.t('achievements.badges.streak_50.title'), cond: i18n.t('achievements.badges.streak_50.cond'), icon: 'auto-awesome', target: 50, current: (s) => s.bestStreak },
	{ id: 'streak_180', group: 'streak', title: i18n.t('achievements.badges.streak_180.title'), cond: i18n.t('achievements.badges.streak_180.cond'), icon: 'emoji-events', target: 180, current: (s) => s.bestStreak },
	{ id: 'streak_365', group: 'streak', title: i18n.t('achievements.badges.streak_365.title'), cond: i18n.t('achievements.badges.streak_365.cond'), icon: 'stars', target: 365, current: (s) => s.bestStreak },
	{ id: 'now_streak_5', group: 'streak', title: i18n.t('achievements.badges.now_streak_5.title'), cond: i18n.t('achievements.badges.now_streak_5.cond'), icon: 'bolt', target: 5, current: (s) => s.streakCount },
	{ id: 'now_streak_15', group: 'streak', title: i18n.t('achievements.badges.now_streak_15.title'), cond: i18n.t('achievements.badges.now_streak_15.cond'), icon: 'trending-up', target: 15, current: (s) => s.streakCount },

	// ── 콤보 · 정답률 ──
	{ id: 'combo_5', group: 'skill', title: i18n.t('achievements.badges.combo_5.title'), cond: i18n.t('achievements.badges.combo_5.cond'), icon: 'bolt', target: 5, current: (s) => s.bestComboOverall },
	{ id: 'combo_10', group: 'skill', title: i18n.t('achievements.badges.combo_10.title'), cond: i18n.t('achievements.badges.combo_10.cond'), icon: 'flash-on', target: 10, current: (s) => s.bestComboOverall },
	{ id: 'combo_20', group: 'skill', title: i18n.t('achievements.badges.combo_20.title'), cond: i18n.t('achievements.badges.combo_20.cond'), icon: 'offline-bolt', target: 20, current: (s) => s.bestComboOverall },
	{ id: 'combo_30', group: 'skill', title: i18n.t('achievements.badges.combo_30.title'), cond: i18n.t('achievements.badges.combo_30.cond'), icon: 'whatshot', target: 30, current: (s) => s.bestComboOverall },
	{ id: 'combo_50', group: 'skill', title: i18n.t('achievements.badges.combo_50.title'), cond: i18n.t('achievements.badges.combo_50.cond'), icon: 'local-fire-department', target: 50, current: (s) => s.bestComboOverall },
	{ id: 'accuracy_80', group: 'skill', title: i18n.t('achievements.badges.accuracy_80.title'), cond: i18n.t('achievements.badges.accuracy_80.cond'), icon: 'thumb-up', target: 80, unit: '%', current: accuracyOf },
	{ id: 'accuracy_90', group: 'skill', title: i18n.t('achievements.badges.accuracy_90.title'), cond: i18n.t('achievements.badges.accuracy_90.cond'), icon: 'verified', target: 90, unit: '%', current: accuracyOf },
	{ id: 'accuracy_95', group: 'skill', title: i18n.t('achievements.badges.accuracy_95.title'), cond: i18n.t('achievements.badges.accuracy_95.cond'), icon: 'auto-awesome', target: 95, unit: '%', current: accuracyOf },
	{ id: 'combo_15', group: 'skill', title: i18n.t('achievements.badges.combo_15.title'), cond: i18n.t('achievements.badges.combo_15.cond'), icon: 'electric-bolt', target: 15, current: (s) => s.bestComboOverall },
	{ id: 'combo_100', group: 'skill', title: i18n.t('achievements.badges.combo_100.title'), cond: i18n.t('achievements.badges.combo_100.cond'), icon: 'diamond', target: 100, current: (s) => s.bestComboOverall },
	{ id: 'accuracy_70', group: 'skill', title: i18n.t('achievements.badges.accuracy_70.title'), cond: i18n.t('achievements.badges.accuracy_70.cond'), icon: 'trending-up', target: 70, unit: '%', current: accuracyOf },
	{ id: 'accuracy_99', group: 'skill', title: i18n.t('achievements.badges.accuracy_99.title'), cond: i18n.t('achievements.badges.accuracy_99.cond'), icon: 'workspace-premium', target: 99, unit: '%', current: accuracyOf },
	{ id: 'time_correct_15', group: 'skill', title: i18n.t('achievements.badges.time_correct_15.title'), cond: i18n.t('achievements.badges.time_correct_15.cond'), icon: 'speed', target: 15, current: bestTimeCorrect },
	{ id: 'time_correct_30', group: 'skill', title: i18n.t('achievements.badges.time_correct_30.title'), cond: i18n.t('achievements.badges.time_correct_30.cond'), icon: 'rocket-launch', target: 30, current: bestTimeCorrect },
	{ id: 'time_combo_10', group: 'skill', title: i18n.t('achievements.badges.time_combo_10.title'), cond: i18n.t('achievements.badges.time_combo_10.cond'), icon: 'flash-on', target: 10, current: bestTimeCombo },

	// ── 주제 · 모드 ──
	// 서브 퀴즈는 메인 통계에 안 쌓이므로 판 수(byMode['sub-<주제>'])로 센다 — LearnProgressService.recordSubQuizPlay
	{ id: 'sub_worldcup_3', group: 'topic', title: i18n.t('achievements.badges.sub_worldcup_3.title'), cond: i18n.t('achievements.badges.sub_worldcup_3.cond'), icon: 'sports-soccer', target: 3, current: (s) => s.byMode['sub-worldcup'] ?? 0 },
	{ id: 'sub_olympic_3', group: 'topic', title: i18n.t('achievements.badges.sub_olympic_3.title'), cond: i18n.t('achievements.badges.sub_olympic_3.cond'), icon: 'emoji-events', target: 3, current: (s) => s.byMode['sub-olympic'] ?? 0 },
	{ id: 'sub_winter_3', group: 'topic', title: i18n.t('achievements.badges.sub_winter_3.title'), cond: i18n.t('achievements.badges.sub_winter_3.cond'), icon: 'ac-unit', target: 3, current: (s) => s.byMode['sub-winter'] ?? 0 },
	{ id: 'sub_sports_all', group: 'topic', title: i18n.t('achievements.badges.sub_sports_all.title'), cond: i18n.t('achievements.badges.sub_sports_all.cond'), icon: 'sports', target: 3, current: (s) => ['sub-worldcup', 'sub-olympic', 'sub-winter'].filter((m) => (s.byMode[m] ?? 0) > 0).length },
	{ id: 'capital_100', group: 'topic', title: i18n.t('achievements.badges.capital_100.title'), cond: i18n.t('achievements.badges.capital_100.cond'), icon: 'public', target: 100, current: (s) => domainSolved(s, 'capital') },
	{ id: 'capital_240', group: 'topic', title: i18n.t('achievements.badges.capital_240.title'), cond: i18n.t('achievements.badges.capital_240.cond'), icon: 'travel-explore', target: 240, current: (s) => domainSolved(s, 'capital') },
	{ id: 'landmark_50', group: 'topic', title: i18n.t('achievements.badges.landmark_50.title'), cond: i18n.t('achievements.badges.landmark_50.cond'), icon: 'castle', target: 50, current: (s) => domainSolved(s, 'landmark') },
	{ id: 'nature_30', group: 'topic', title: i18n.t('achievements.badges.nature_30.title'), cond: i18n.t('achievements.badges.nature_30.cond'), icon: 'terrain', target: 30, current: (s) => domainSolved(s, 'nature') },
	{ id: 'figure_100', group: 'topic', title: i18n.t('achievements.badges.figure_100.title'), cond: i18n.t('achievements.badges.figure_100.cond'), icon: 'groups', target: 100, current: (s) => domainSolved(s, 'figure') },
	{ id: 'figure_300', group: 'topic', title: i18n.t('achievements.badges.figure_300.title'), cond: i18n.t('achievements.badges.figure_300.cond'), icon: 'auto-stories', target: 300, current: (s) => domainSolved(s, 'figure') },
	{ id: 'event_50', group: 'topic', title: i18n.t('achievements.badges.event_50.title'), cond: i18n.t('achievements.badges.event_50.cond'), icon: 'account-balance', target: 50, current: (s) => domainSolved(s, 'event') },
	{ id: 'myth_50', group: 'topic', title: i18n.t('achievements.badges.myth_50.title'), cond: i18n.t('achievements.badges.myth_50.cond'), icon: 'bolt', target: 50, current: (s) => domainSolved(s, 'myth') },
	{ id: 'space_20', group: 'topic', title: i18n.t('achievements.badges.space_20.title'), cond: i18n.t('achievements.badges.space_20.cond'), icon: 'rocket-launch', target: 20, current: (s) => domainSolved(s, 'space') },
	{ id: 'constellation_30', group: 'topic', title: i18n.t('achievements.badges.constellation_30.title'), cond: i18n.t('achievements.badges.constellation_30.cond'), icon: 'nights-stay', target: 30, current: (s) => domainSolved(s, 'constellation') },
	{ id: 'time_10', group: 'topic', title: i18n.t('achievements.badges.time_10.title'), cond: i18n.t('achievements.badges.time_10.cond'), icon: 'timer', target: 10, current: (s) => s.byMode.time ?? 0 },
	{ id: 'time_50', group: 'topic', title: i18n.t('achievements.badges.time_50.title'), cond: i18n.t('achievements.badges.time_50.cond'), icon: 'hourglass-top', target: 50, current: (s) => s.byMode.time ?? 0 },
	{ id: 'review_10', group: 'topic', title: i18n.t('achievements.badges.review_10.title'), cond: i18n.t('achievements.badges.review_10.cond'), icon: 'history-edu', target: 10, current: (s) => s.byMode.review ?? 0 },
	{ id: 'review_30', group: 'topic', title: i18n.t('achievements.badges.review_30.title'), cond: i18n.t('achievements.badges.review_30.cond'), icon: 'menu-book', target: 30, current: (s) => s.byMode.review ?? 0 },
	{ id: 'all_domains', group: 'topic', title: i18n.t('achievements.badges.all_domains.title'), cond: i18n.t('achievements.badges.all_domains.cond'), icon: 'public', target: 8, current: (s) => Object.values(s.byDomain).filter((d) => d.solved > 0).length },
	// 서브 퀴즈(월드컵·올림픽)는 메인 통계에 쌓이지 않으므로 메인 8주제만으로 달성할 수 있게 둔다
	{ id: 'all_12', group: 'topic', title: i18n.t('achievements.badges.all_12.title'), cond: i18n.t('achievements.badges.all_12.cond'), icon: 'travel-explore', target: 8, current: (s) => Object.values(s.byDomain).filter((d) => d.solved >= 10).length },
	{ id: 'ox_20', group: 'topic', title: i18n.t('achievements.badges.ox_20.title'), cond: i18n.t('achievements.badges.ox_20.cond'), icon: 'rule', target: 20, current: (s) => s.byMode.ox ?? 0 },
	{ id: 'blank_15', group: 'topic', title: i18n.t('achievements.badges.blank_15.title'), cond: i18n.t('achievements.badges.blank_15.cond'), icon: 'edit-note', target: 15, current: (s) => s.byMode.blank ?? 0 },
	{ id: 'picture_10', group: 'topic', title: i18n.t('achievements.badges.picture_10.title'), cond: i18n.t('achievements.badges.picture_10.cond'), icon: 'photo-library', target: 10, current: (s) => s.byMode.picture ?? 0 },
	{ id: 'initial_15', group: 'topic', title: i18n.t('achievements.badges.initial_15.title'), cond: i18n.t('achievements.badges.initial_15.cond'), icon: 'abc', target: 15, current: (s) => s.byMode.initial ?? 0 },
	{ id: 'mix_30', group: 'topic', title: i18n.t('achievements.badges.mix_30.title'), cond: i18n.t('achievements.badges.mix_30.cond'), icon: 'shuffle', target: 30, current: (s) => s.byMode.mix ?? 0 },
	{ id: 'bookmark_10', group: 'topic', title: i18n.t('achievements.badges.bookmark_10.title'), cond: i18n.t('achievements.badges.bookmark_10.cond'), icon: 'bookmark', target: 10, current: (s) => s.byMode.bookmark ?? 0 },
	{ id: 'mode_5', group: 'topic', title: i18n.t('achievements.badges.mode_5.title'), cond: i18n.t('achievements.badges.mode_5.cond'), icon: 'apps', target: 5, current: (s) => Object.values(s.byMode ?? {}).filter((v) => v > 0).length },
	{ id: 'mode_8', group: 'topic', title: i18n.t('achievements.badges.mode_8.title'), cond: i18n.t('achievements.badges.mode_8.cond'), icon: 'widgets', target: 8, current: (s) => Object.values(s.byMode ?? {}).filter((v) => v > 0).length },
	{ id: 'deep_domain_3', group: 'topic', title: i18n.t('achievements.badges.deep_domain_3.title'), cond: i18n.t('achievements.badges.deep_domain_3.cond'), icon: 'landscape', target: 3, current: (s) => Object.values(s.byDomain ?? {}).filter((d) => d.solved >= 100).length },
];

/**
 * 메인 주제 레벨 뱃지 — 주제별 등급(ConstDomainLevels)에 도달할 때마다 하나씩.
 * 등급 정의를 그대로 따라가므로 레벨이 늘면 뱃지도 자동으로 늘어난다.
 */
const LEVEL_DOMAIN_TITLES: Record<string, string> = Object.fromEntries(
	(['capital', 'landmark', 'nature', 'figure', 'event', 'myth', 'space', 'constellation'] as const).map((key) => [key, WORLD_TOPIC_TEXT[key].label]),
);
/** 레벨이 오를수록 무게감 있는 아이콘으로 */
const LEVEL_ICONS = ['military-tech', 'workspace-premium', 'emoji-events', 'diamond', 'auto-awesome'];

const LEVEL_DESCS: Record<string, string> = {};
const LEVEL_DEFS: Omit<AchievementDef, 'color' | 'desc' | 'rarity'>[] = Object.entries(LEVEL_DOMAIN_TITLES).flatMap(
	([key, topic]) => {
		const def = DOMAIN_LEVELS[key];
		if (!def) return [];
		// 1레벨(임계값 0)은 시작하자마자 달성이라 뱃지로 만들지 않는다
		return def.levels
			.filter((lv) => lv.threshold > 0)
			.map((lv, i) => {
				const id = `level_${key}_${lv.level}`;
				const unitCond = i18n.t(def.metric === 'score' ? 'achievements.level.unitScore' : 'achievements.level.unitSolved', { value: lv.threshold.toLocaleString() });
				LEVEL_DESCS[id] = i18n.t('achievements.level.desc', { topic, level: lv.label });
				return {
					id,
					group: 'topic' as AchievementGroup,
					// 등급명이 이미 주제를 담고 있으면('세계 수도 탐험가') 주제를 덧붙이지 않는다
					title: lv.label.includes(topic) ? lv.label : i18n.t('achievements.level.title', { topic, level: lv.label }),
					cond: i18n.t('achievements.level.cond', { name: lv.label.includes(topic) ? lv.label : i18n.t('achievements.level.name', { topic, level: lv.label }), unit: unitCond }),
					icon: LEVEL_ICONS[Math.min(i, LEVEL_ICONS.length - 1)],
					target: lv.threshold,
					current: def.metric === 'score' ? (st: LearnStats) => domainScore(st, key) : (st: LearnStats) => domainSolved(st, key),
				};
			});
	},
);

const DEFS = [...BASE_DEFS, ...LEVEL_DEFS];

/** 희귀도 자동 산정 — 같은 그룹에서 목표치 오름차순 위치를 4구간으로 나눈다 */
const rarityOf = (def: (typeof DEFS)[number]): AchievementRarity => {
	const peers = DEFS.filter((d) => d.group === def.group).sort((a, b) => a.target - b.target);
	const index = peers.findIndex((d) => d.id === def.id);
	return RARITY_ORDER[Math.min(RARITY_ORDER.length - 1, Math.floor((index / peers.length) * RARITY_ORDER.length))];
};

export const CONST_ACHIEVEMENTS: AchievementDef[] = themed(() => DEFS.map((d) => ({
	...d,
	// 뱃지 색은 등급색(연함 → 진함). 그룹색은 목록 헤더에서만 쓴다
	color: RARITY_META[rarityOf(d)].color,
	desc: DESCS[d.id] ?? LEVEL_DESCS[d.id] ?? d.cond,
	rarity: rarityOf(d),
})));

export default CONST_ACHIEVEMENTS;
