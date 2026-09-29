// const/ConstAchievements.ts
import Colors from '@/src/const/ConstColors';
import { DOMAIN_LEVELS } from '@/src/const/ConstDomainLevels';
import { WORLD_TOPIC_TEXT } from '@/src/const/data/world/ConstWorldText';
import { POINT_PER_CORRECT } from '@/src/const/ConstScoring';
import { LearnStats } from '@/src/services/LearnProgressService';
import { themed } from '@/src/utils/ThemedStyles';

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
	{ key: 'progress', label: '누적 학습', icon: 'trending-up', color: Colors.heat },
	{ key: 'session', label: '퀴즈 플레이', icon: 'sports-esports', color: Colors.goldDark },
	{ key: 'streak', label: '연속 학습', icon: 'local-fire-department', color: Colors.error },
	{ key: 'skill', label: '콤보·정답률', icon: 'bolt', color: Colors.amber },
	{ key: 'topic', label: '주제·모드', icon: 'public', color: Colors.success },
]));

/** 뱃지 희귀도 — 같은 그룹 안에서 목표치가 높을수록 희귀해진다 */
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legend';

/**
 * 등급 = 색. 일반 → 전설로 갈수록 같은 계열에서 점점 진해진다.
 * (홈 뱃지 타일 배경이 파란색이라 파랑 계열은 쓰지 않는다)
 */
export const RARITY_META: Record<AchievementRarity, { label: string; color: string }> = themed(() => ({
	common: { label: '일반', color: Colors.amber },
	rare: { label: '희귀', color: Colors.goldDark },
	epic: { label: '영웅', color: Colors.goldDeep },
	legend: { label: '전설', color: Colors.heatDeep },
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
	first_quiz: '세계 상식 퀴즈 여정의 시작을 알리는 뱃지예요',
	correct_50: '맞힌 문제가 쌓이기 시작한 학습자에게 주어져요',
	solve_100: '꾸준히 문제를 풀어온 사람의 첫 이정표예요',
	correct_300: '정답이 습관이 된 학습자의 증표예요',
	solve_500: '가볍게 넘기 어려운 풀이량을 넘어선 뱃지예요',
	solve_1000: '네 자리 풀이를 달성한 사람만 가질 수 있어요',
	correct_1000: '정답 천 개를 쌓아 올린 실력의 상징이에요',
	solve_2000: '오래 함께한 학습자에게만 열리는 뱃지예요',
	solve_3000: '세계 상식 퀴즈를 정복한 사람의 자리예요',
	quizzes_10: '퀴즈 습관이 붙기 시작했다는 표시예요',
	quizzes_50: '자주 찾아오는 단골 도전자의 뱃지예요',
	quizzes_100: '수많은 판을 치러낸 베테랑의 증표예요',
	quizzes_300: '퀴즈 플레이 횟수로는 최상위권이에요',
	streak_3: '작심삼일을 넘어섰다는 첫 증거예요',
	streak_7: '일주일을 하루도 빠짐없이 채운 뱃지예요',
	streak_14: '두 주 동안 리듬을 잃지 않은 사람의 뱃지예요',
	streak_30: '한 달 개근, 학습이 일상이 된 증표예요',
	streak_60: '두 달 연속. 웬만한 의지로는 어려워요',
	streak_100: '백일 동안 이어온 정성에 주는 최고 등급 뱃지예요',
	combo_5: '연속 정답의 감을 잡기 시작했어요',
	combo_10: '흔들림 없는 집중력을 보여준 뱃지예요',
	combo_20: '긴 연속 정답을 만들어낸 실력의 증표예요',
	combo_30: '한 번의 실수도 없이 몰아친 기록이에요',
	combo_50: '콤보 기록으로는 전설급이에요',
	accuracy_80: '많이 푸는 것보다 정확하게 푸는 사람의 뱃지예요',
	accuracy_90: '높은 정답률을 오래 유지한 실력자의 증표예요',
	accuracy_95: '거의 틀리지 않는 경지에 오른 뱃지예요',
	time_10: '제한 시간의 압박을 즐기기 시작했어요',
	time_50: '타임 챌린지를 손에 익힌 사람의 증표예요',
	review_10: '틀린 문제를 그냥 넘기지 않는 태도의 뱃지예요',
	review_30: '복습으로 약점을 메워온 사람의 증표예요',
	all_domains: '한 주제에 머무르지 않고 두루 살펴봤어요',
	all_12: '모든 주제를 빠짐없이 경험한 사람의 뱃지예요',
	solve_50: '첫 오십 문제를 넘긴 출발 신호예요',
	correct_100: '정답 백 개를 채운 첫 성취예요',
	correct_2000: '정답 이천 개, 실력이 몸에 밴 증표예요',
	solve_5000: '오천 문제. 이 앱을 가장 오래 사랑한 사람의 자리예요',
	quizzes_3: '세 판을 채우며 감을 잡기 시작했어요',
	quizzes_200: '이백 판을 치러낸 꾸준함의 증표예요',
	quizzes_500: '오백 판, 플레이 횟수로는 최상위예요',
	streak_21: '3주 연속. 습관이 자리 잡는 구간을 넘었어요',
	streak_50: '오십일 개근, 흔들리지 않는 리듬이에요',
	streak_180: '반년을 이어온 사람에게만 열리는 뱃지예요',
	combo_15: '열다섯 문제를 내리 맞힌 집중력이에요',
	combo_100: '백 문제 연속 정답, 신화의 영역이에요',
	accuracy_70: '기복 없이 안정적으로 맞히고 있어요',
	accuracy_99: '거의 한 문제도 놓치지 않는 경지예요',
	ox_20: 'O와 X를 가르는 판단력이 붙었어요',
	blank_15: '문맥으로 빈칸을 메우는 감각이 생겼어요',
	initial_15: '초성만 보고 이름을 떠올리는 뱃지예요',
	mix_30: '주제를 가리지 않고 두루 푸는 사람이에요',
	bookmark_10: '모아둔 항목을 다시 꺼내 익히는 태도의 뱃지예요',
	day_solve_30: '하루에 몰아서 서른 문제를 풀어낸 집중력이에요',
	day_solve_100: '하루 백 문제. 마음먹은 날의 기록이에요',
	active_days_10: '열흘에 걸쳐 꾸준히 앱을 찾은 증표예요',
	active_days_30: '서른 날의 학습 기록이 쌓인 뱃지예요',
	daily_7: '오늘의 퀴즈를 일곱 번 챙긴 사람의 뱃지예요',
	daily_30: '오늘의 퀴즈를 서른 번 놓치지 않았어요',
	exam_5: '테마 코스로 실력을 점검해 온 증표예요',
	weak_10: '약한 곳을 골라 파고드는 학습자의 뱃지예요',
	domain_30: '주제를 정해 깊게 파고든 사람의 증표예요',
	streak_365: '1년 개근. 이보다 높은 자리는 없어요',
	now_streak_5: '지금 이어지고 있는 5일의 리듬이에요',
	now_streak_15: '지금 보름째. 흐름을 타고 있어요',
	time_correct_15: '제한 시간 안에 열다섯을 맞힌 순발력이에요',
	time_correct_30: '한 판 서른 문제. 타임 챌린지 최상위예요',
	time_combo_10: '시간에 쫓기면서도 열 문제를 내리 맞혔어요',
	mode_5: '여러 모드를 두루 즐기는 사람의 뱃지예요',
	mode_8: '거의 모든 모드를 맛본 수집가의 증표예요',
	deep_domain_3: '세 주제를 깊이 파고든 학습자의 뱃지예요',
	capital_100: '세계 수도 백 곳을 짚어본 여행자의 뱃지예요',
	capital_240: '지도 위 모든 수도를 꿰고 있는 경지예요',
	landmark_50: '사진 한 장으로 그곳을 알아보는 눈이 생겼어요',
	nature_30: '강과 산맥이 지도 위에 그려지기 시작했어요',
	figure_100: '세상을 바꾼 사람들과 친해졌어요',
	figure_300: '시대와 나라를 넘나드는 인물 박사의 증표예요',
	event_50: '세계사의 굵직한 장면을 꿰뚫었어요',
	myth_50: '신과 영웅의 이야기에 밝아진 뱃지예요',
	space_20: '태양계를 한 바퀴 돌아본 탐사대의 증표예요',
	constellation_30: '밤하늘 별자리를 하나둘 알아보기 시작했어요',
	sub_worldcup_3: '월드컵의 역사를 세 번이나 되짚었어요',
	sub_olympic_3: '하계 올림픽 개최지와 1위에 밝아졌어요',
	sub_winter_3: '눈과 얼음 위의 대회까지 챙긴 뱃지예요',
	sub_sports_all: '스포츠 서브 퀴즈를 모두 맛본 올라운더예요',
	picture_10: '국기와 초상만 보고도 척척 알아보는 눈이에요',
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
	{ id: 'first_quiz', group: 'progress', title: '첫 걸음', cond: '첫 퀴즈를 완료했어요', icon: 'rocket-launch', target: 1, current: (s) => s.totalQuizzes },
	{ id: 'correct_50', group: 'progress', title: '정답 새싹', cond: '누적 50문제 정답', icon: 'done-all', target: 50, current: (s) => s.totalCorrect },
	{ id: 'solve_100', group: 'progress', title: '백문백답', cond: '누적 100문제 풀이', icon: 'task-alt', target: 100, current: (s) => s.totalSolved },
	{ id: 'correct_300', group: 'progress', title: '정답 나무', cond: '누적 300문제 정답', icon: 'verified', target: 300, current: (s) => s.totalCorrect },
	{ id: 'solve_500', group: 'progress', title: '오백 돌파', cond: '누적 500문제 풀이', icon: 'workspace-premium', target: 500, current: (s) => s.totalSolved },
	{ id: 'solve_1000', group: 'progress', title: '천 문제 정복', cond: '누적 1,000문제 풀이', icon: 'military-tech', target: 1000, current: (s) => s.totalSolved },
	{ id: 'correct_1000', group: 'progress', title: '정답 숲', cond: '누적 1,000문제 정답', icon: 'grade', target: 1000, current: (s) => s.totalCorrect },
	{ id: 'solve_2000', group: 'progress', title: '이천 클럽', cond: '누적 2,000문제 풀이', icon: 'emoji-events', target: 2000, current: (s) => s.totalSolved },
	{ id: 'solve_3000', group: 'progress', title: '삼천 마스터', cond: '누적 3,000문제 풀이', icon: 'auto-awesome', target: 3000, current: (s) => s.totalSolved },
	{ id: 'solve_50', group: 'progress', title: '오십 고개', cond: '누적 50문제 풀이', icon: 'directions-walk', target: 50, current: (s) => s.totalSolved },
	{ id: 'correct_100', group: 'progress', title: '정답 백 개', cond: '누적 100문제 정답', icon: 'check-circle', target: 100, current: (s) => s.totalCorrect },
	{ id: 'correct_2000', group: 'progress', title: '정답 이천', cond: '누적 2,000문제 정답', icon: 'stars', target: 2000, current: (s) => s.totalCorrect },
	{ id: 'solve_5000', group: 'progress', title: '오천 전설', cond: '누적 5,000문제 풀이', icon: 'diamond', target: 5000, current: (s) => s.totalSolved },
	{ id: 'day_solve_30', group: 'progress', title: '하루 서른 문제', cond: '하루에 30문제 풀이', icon: 'today', target: 30, current: bestDaySolved },
	{ id: 'day_solve_100', group: 'progress', title: '하루 백 문제', cond: '하루에 100문제 풀이', icon: 'bolt', target: 100, current: bestDaySolved },
	{ id: 'active_days_10', group: 'progress', title: '열흘의 기록', cond: '학습한 날 10일', icon: 'edit-calendar', target: 10, current: activeDays },
	{ id: 'active_days_30', group: 'progress', title: '서른 날의 기록', cond: '학습한 날 30일', icon: 'calendar-month', target: 30, current: activeDays },

	// ── 퀴즈 플레이 횟수 ──
	{ id: 'quizzes_10', group: 'session', title: '몸풀기', cond: '퀴즈 10회 플레이', icon: 'sports-esports', target: 10, current: (s) => s.totalQuizzes },
	{ id: 'quizzes_50', group: 'session', title: '꾸준한 도전자', cond: '퀴즈 50회 플레이', icon: 'trending-up', target: 50, current: (s) => s.totalQuizzes },
	{ id: 'quizzes_100', group: 'session', title: '백전 노장', cond: '퀴즈 100회 플레이', icon: 'workspace-premium', target: 100, current: (s) => s.totalQuizzes },
	{ id: 'quizzes_300', group: 'session', title: '삼백전 백승', cond: '퀴즈 300회 플레이', icon: 'stars', target: 300, current: (s) => s.totalQuizzes },
	{ id: 'quizzes_3', group: 'session', title: '삼세판', cond: '퀴즈 3회 플레이', icon: 'play-circle', target: 3, current: (s) => s.totalQuizzes },
	{ id: 'quizzes_200', group: 'session', title: '이백전', cond: '퀴즈 200회 플레이', icon: 'emoji-events', target: 200, current: (s) => s.totalQuizzes },
	{ id: 'quizzes_500', group: 'session', title: '오백전 노장', cond: '퀴즈 500회 플레이', icon: 'shield', target: 500, current: (s) => s.totalQuizzes },
	{ id: 'daily_7', group: 'session', title: '오늘의 퀴즈 단골', cond: '오늘의 퀴즈 7회 완료', icon: 'wb-sunny', target: 7, current: (s) => s.byMode?.daily ?? 0 },
	{ id: 'daily_30', group: 'session', title: '오늘의 퀴즈 개근', cond: '오늘의 퀴즈 30회 완료', icon: 'brightness-high', target: 30, current: (s) => s.byMode?.daily ?? 0 },
	{ id: 'exam_5', group: 'session', title: '코스 완주자', cond: '테마 코스 5회 응시', icon: 'assignment', target: 5, current: (s) => s.byMode?.exam ?? 0 },
	{ id: 'weak_10', group: 'session', title: '약점 사냥꾼', cond: '약점 집중 학습 10회', icon: 'my-location', target: 10, current: (s) => s.byMode?.weak ?? 0 },
	{ id: 'domain_30', group: 'session', title: '주제별 파고들기', cond: '주제별 학습 30회 플레이', icon: 'category', target: 30, current: (s) => s.byMode?.domain ?? 0 },

	// ── 연속 학습 ──
	{ id: 'streak_3', group: 'streak', title: '삼일의 약속', cond: '3일 연속 학습', icon: 'event-available', target: 3, current: (s) => s.bestStreak },
	{ id: 'streak_7', group: 'streak', title: '일주일 개근', cond: '7일 연속 학습', icon: 'local-fire-department', target: 7, current: (s) => s.bestStreak },
	{ id: 'streak_14', group: 'streak', title: '2주 개근', cond: '14일 연속 학습', icon: 'calendar-month', target: 14, current: (s) => s.bestStreak },
	{ id: 'streak_30', group: 'streak', title: '한 달 개근', cond: '30일 연속 학습', icon: 'whatshot', target: 30, current: (s) => s.bestStreak },
	{ id: 'streak_60', group: 'streak', title: '두 달 개근', cond: '60일 연속 학습', icon: 'calendar-today', target: 60, current: (s) => s.bestStreak },
	{ id: 'streak_100', group: 'streak', title: '백일의 정성', cond: '100일 연속 학습', icon: 'diamond', target: 100, current: (s) => s.bestStreak },
	{ id: 'streak_21', group: 'streak', title: '3주 개근', cond: '21일 연속 학습', icon: 'date-range', target: 21, current: (s) => s.bestStreak },
	{ id: 'streak_50', group: 'streak', title: '오십일 개근', cond: '50일 연속 학습', icon: 'auto-awesome', target: 50, current: (s) => s.bestStreak },
	{ id: 'streak_180', group: 'streak', title: '반년의 정성', cond: '180일 연속 학습', icon: 'emoji-events', target: 180, current: (s) => s.bestStreak },
	{ id: 'streak_365', group: 'streak', title: '일 년의 약속', cond: '365일 연속 학습', icon: 'stars', target: 365, current: (s) => s.bestStreak },
	{ id: 'now_streak_5', group: 'streak', title: '지금 5일째', cond: '현재 연속 학습 5일', icon: 'bolt', target: 5, current: (s) => s.streakCount },
	{ id: 'now_streak_15', group: 'streak', title: '지금 15일째', cond: '현재 연속 학습 15일', icon: 'trending-up', target: 15, current: (s) => s.streakCount },

	// ── 콤보 · 정답률 ──
	{ id: 'combo_5', group: 'skill', title: '워밍업 콤보', cond: '5문제 연속 정답', icon: 'bolt', target: 5, current: (s) => s.bestComboOverall },
	{ id: 'combo_10', group: 'skill', title: '집중 콤보', cond: '10문제 연속 정답', icon: 'flash-on', target: 10, current: (s) => s.bestComboOverall },
	{ id: 'combo_20', group: 'skill', title: '콤보 마스터', cond: '20문제 연속 정답', icon: 'offline-bolt', target: 20, current: (s) => s.bestComboOverall },
	{ id: 'combo_30', group: 'skill', title: '콤보 폭풍', cond: '30문제 연속 정답', icon: 'whatshot', target: 30, current: (s) => s.bestComboOverall },
	{ id: 'combo_50', group: 'skill', title: '콤보 전설', cond: '50문제 연속 정답', icon: 'local-fire-department', target: 50, current: (s) => s.bestComboOverall },
	{ id: 'accuracy_80', group: 'skill', title: '실속파', cond: '정답률 80% 이상 (100문제+)', icon: 'thumb-up', target: 80, unit: '%', current: accuracyOf },
	{ id: 'accuracy_90', group: 'skill', title: '정답왕', cond: '정답률 90% 이상 (100문제+)', icon: 'verified', target: 90, unit: '%', current: accuracyOf },
	{ id: 'accuracy_95', group: 'skill', title: '완벽주의자', cond: '정답률 95% 이상 (100문제+)', icon: 'auto-awesome', target: 95, unit: '%', current: accuracyOf },
	{ id: 'combo_15', group: 'skill', title: '연속 열다섯', cond: '15문제 연속 정답', icon: 'electric-bolt', target: 15, current: (s) => s.bestComboOverall },
	{ id: 'combo_100', group: 'skill', title: '콤보 신화', cond: '100문제 연속 정답', icon: 'diamond', target: 100, current: (s) => s.bestComboOverall },
	{ id: 'accuracy_70', group: 'skill', title: '안정권', cond: '정답률 70% 이상 (100문제+)', icon: 'trending-up', target: 70, unit: '%', current: accuracyOf },
	{ id: 'accuracy_99', group: 'skill', title: '무결점', cond: '정답률 99% 이상 (100문제+)', icon: 'workspace-premium', target: 99, unit: '%', current: accuracyOf },
	{ id: 'time_correct_15', group: 'skill', title: '속사포', cond: '타임 챌린지 한 판 15문제 정답', icon: 'speed', target: 15, current: bestTimeCorrect },
	{ id: 'time_correct_30', group: 'skill', title: '초읽기 지배자', cond: '타임 챌린지 한 판 30문제 정답', icon: 'rocket-launch', target: 30, current: bestTimeCorrect },
	{ id: 'time_combo_10', group: 'skill', title: '시간 속 콤보', cond: '타임 챌린지 한 판 10연속 정답', icon: 'flash-on', target: 10, current: bestTimeCombo },

	// ── 주제 · 모드 ──
	// 서브 퀴즈는 메인 통계에 안 쌓이므로 판 수(byMode['sub-<주제>'])로 센다 — LearnProgressService.recordSubQuizPlay
	{ id: 'sub_worldcup_3', group: 'topic', title: '월드컵 박사', cond: '월드컵 퀴즈 3판 플레이', icon: 'sports-soccer', target: 3, current: (s) => s.byMode['sub-worldcup'] ?? 0 },
	{ id: 'sub_olympic_3', group: 'topic', title: '올림픽 통', cond: '하계 올림픽 퀴즈 3판 플레이', icon: 'emoji-events', target: 3, current: (s) => s.byMode['sub-olympic'] ?? 0 },
	{ id: 'sub_winter_3', group: 'topic', title: '동계 올림픽 통', cond: '동계 올림픽 퀴즈 3판 플레이', icon: 'ac-unit', target: 3, current: (s) => s.byMode['sub-winter'] ?? 0 },
	{ id: 'sub_sports_all', group: 'topic', title: '스포츠 올라운더', cond: '월드컵·하계·동계 올림픽 퀴즈를 모두 플레이', icon: 'sports', target: 3, current: (s) => ['sub-worldcup', 'sub-olympic', 'sub-winter'].filter((m) => (s.byMode[m] ?? 0) > 0).length },
	{ id: 'capital_100', group: 'topic', title: '수도 박사', cond: '세계 수도 100문제 풀이', icon: 'public', target: 100, current: (s) => domainSolved(s, 'capital') },
	{ id: 'capital_240', group: 'topic', title: '수도 정복자', cond: '세계 수도 240문제 풀이', icon: 'travel-explore', target: 240, current: (s) => domainSolved(s, 'capital') },
	{ id: 'landmark_50', group: 'topic', title: '랜드마크 여행자', cond: '세계 랜드마크 50문제 풀이', icon: 'castle', target: 50, current: (s) => domainSolved(s, 'landmark') },
	{ id: 'nature_30', group: 'topic', title: '지도 읽는 사람', cond: '세계 지형 30문제 풀이', icon: 'terrain', target: 30, current: (s) => domainSolved(s, 'nature') },
	{ id: 'figure_100', group: 'topic', title: '위인 탐구가', cond: '세계 위인 100문제 풀이', icon: 'groups', target: 100, current: (s) => domainSolved(s, 'figure') },
	{ id: 'figure_300', group: 'topic', title: '인물 박사', cond: '세계 위인 300문제 풀이', icon: 'auto-stories', target: 300, current: (s) => domainSolved(s, 'figure') },
	{ id: 'event_50', group: 'topic', title: '세계사 통', cond: '세계사 사건 50문제 풀이', icon: 'account-balance', target: 50, current: (s) => domainSolved(s, 'event') },
	{ id: 'myth_50', group: 'topic', title: '신화 이야기꾼', cond: '그리스 로마 신화 50문제 풀이', icon: 'bolt', target: 50, current: (s) => domainSolved(s, 'myth') },
	{ id: 'space_20', group: 'topic', title: '우주 탐사대', cond: '태양계 20문제 풀이', icon: 'rocket-launch', target: 20, current: (s) => domainSolved(s, 'space') },
	{ id: 'constellation_30', group: 'topic', title: '별자리 지기', cond: '별자리와 천체 30문제 풀이', icon: 'nights-stay', target: 30, current: (s) => domainSolved(s, 'constellation') },
	{ id: 'time_10', group: 'topic', title: '시간의 지배자', cond: '타임 챌린지 10회 도전', icon: 'timer', target: 10, current: (s) => s.byMode.time ?? 0 },
	{ id: 'time_50', group: 'topic', title: '시간의 정복자', cond: '타임 챌린지 50회 도전', icon: 'hourglass-top', target: 50, current: (s) => s.byMode.time ?? 0 },
	{ id: 'review_10', group: 'topic', title: '복습의 힘', cond: '오답 복습 10회', icon: 'history-edu', target: 10, current: (s) => s.byMode.review ?? 0 },
	{ id: 'review_30', group: 'topic', title: '복습의 달인', cond: '오답 복습 30회', icon: 'menu-book', target: 30, current: (s) => s.byMode.review ?? 0 },
	{ id: 'all_domains', group: 'topic', title: '전 주제 섭렵', cond: '메인 주제 8개를 한 번씩 풀이', icon: 'public', target: 8, current: (s) => Object.values(s.byDomain).filter((d) => d.solved > 0).length },
	// 서브 퀴즈(월드컵·올림픽)는 메인 통계에 쌓이지 않으므로 메인 8주제만으로 달성할 수 있게 둔다
	{ id: 'all_12', group: 'topic', title: '완전 섭렵', cond: '메인 주제 8개를 각각 10문제 이상 풀이', icon: 'travel-explore', target: 8, current: (s) => Object.values(s.byDomain).filter((d) => d.solved >= 10).length },
	{ id: 'ox_20', group: 'topic', title: 'OX 판별사', cond: 'OX 퀴즈 20회 플레이', icon: 'rule', target: 20, current: (s) => s.byMode.ox ?? 0 },
	{ id: 'blank_15', group: 'topic', title: '빈칸 채우기 달인', cond: '빈칸 채우기 15회 플레이', icon: 'edit-note', target: 15, current: (s) => s.byMode.blank ?? 0 },
	{ id: 'picture_10', group: 'topic', title: '눈썰미 탐험가', cond: '그림 퀴즈 10회 플레이', icon: 'photo-library', target: 10, current: (s) => s.byMode.picture ?? 0 },
	{ id: 'initial_15', group: 'topic', title: '초성 감별사', cond: '초성 퀴즈 15회 플레이', icon: 'abc', target: 15, current: (s) => s.byMode.initial ?? 0 },
	{ id: 'mix_30', group: 'topic', title: '데일리 믹서', cond: '데일리 믹스 30회 플레이', icon: 'shuffle', target: 30, current: (s) => s.byMode.mix ?? 0 },
	{ id: 'bookmark_10', group: 'topic', title: '즐겨찾기 복습러', cond: '즐겨찾기 퀴즈 10회 플레이', icon: 'bookmark', target: 10, current: (s) => s.byMode.bookmark ?? 0 },
	{ id: 'mode_5', group: 'topic', title: '모드 탐험가', cond: '서로 다른 모드 5가지 플레이', icon: 'apps', target: 5, current: (s) => Object.values(s.byMode ?? {}).filter((v) => v > 0).length },
	{ id: 'mode_8', group: 'topic', title: '모드 수집가', cond: '서로 다른 모드 8가지 플레이', icon: 'widgets', target: 8, current: (s) => Object.values(s.byMode ?? {}).filter((v) => v > 0).length },
	{ id: 'deep_domain_3', group: 'topic', title: '깊이 파는 사람', cond: '한 주제 100문제 이상을 3개 주제에서 달성', icon: 'landscape', target: 3, current: (s) => Object.values(s.byDomain ?? {}).filter((d) => d.solved >= 100).length },
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
				const unitCond = def.metric === 'score' ? `${lv.threshold.toLocaleString()}점` : `${lv.threshold.toLocaleString()}문제`;
				LEVEL_DESCS[id] = `${topic} 학습이 '${lv.label}' 등급에 오른 증표예요`;
				return {
					id,
					group: 'topic' as AchievementGroup,
					// 등급명이 이미 주제를 담고 있으면('세계 수도 탐험가') 주제를 덧붙이지 않는다
					title: lv.label.includes(topic) ? lv.label : `${topic} · ${lv.label}`,
					cond: `${lv.label.includes(topic) ? lv.label : `${topic} ${lv.label}`} 등급 달성 (${unitCond})`,
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
