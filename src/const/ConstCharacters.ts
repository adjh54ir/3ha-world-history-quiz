// const/ConstCharacters.ts
/**
 * 주제(카테고리)별 캐릭터 — 푼 문제 수에 따라 단계별로 성장
 * 에셋: 주제별 캐릭터는 CHARACTER_SETS 에 (지금은 없다)
 * - "전체 점수"는 역사 사자 마스코트(src/assets/illustrations/lion/lion-stage-N.webp) 사용 → getOverallCharacter
 * - 단계 임계값은 "주제별 총 문항 수 × 레벨 수"에 맞춰 분배(저레벨 빠름/고레벨 느림)
 */

/**
 * 주제 키 → 단계별 캐릭터 이미지 배열 (주제별로 고정, 섞이지 않음)
 * - 세계 상식 주제에는 아직 주제 전용 캐릭터가 없다. 비어 있으면 화면이 주제 캐릭터 자리를 숨기고
 *   전체(누적) 마스코트인 역사 사자만 보여 준다. 주제 캐릭터를 만들면 여기에 넣는다.
 */
const CHARACTER_SETS: Record<string, ReturnType<typeof require>[]> = {};

/**
 * "전체 점수" 전용 마스코트 — 역사 사자 (src/assets/illustrations/lion/lion-stage-N.webp, 1~6단계)
 * - 특정 주제가 아닌 전체 누적 점수 등급에만 사용
 * - 임계값은 누적 점수 등급(SCORE_TITLES: 400/900/1600/2400/3400)과 동일하게 6단계
 */
const OVERALL_MASCOTS = [
	require('@/src/assets/illustrations/lion/lion-stage-1.webp'),
	require('@/src/assets/illustrations/lion/lion-stage-2.webp'),
	require('@/src/assets/illustrations/lion/lion-stage-3.webp'),
	require('@/src/assets/illustrations/lion/lion-stage-4.webp'),
	require('@/src/assets/illustrations/lion/lion-stage-5.webp'),
	require('@/src/assets/illustrations/lion/lion-stage-6-golden.webp'),
];
const OVERALL_TIERS = [0, 400, 900, 1600, 2400, 3400];

/**
 * 전체(누적 점수) 마스코트 단계별 타이틀 — "세계를 누비는 역사 사자" 탐험 서사
 * (새싹 → 견습 → 여행가 → 탐구가 → 대탐험가 → 황금 대탐험가)
 */
const OVERALL_TITLES = [
	'탐험 새싹 사자',
	'견습 탐험가 사자',
	'노련한 여행가 사자',
	'세계 탐구가 사자',
	'대탐험가 사자',
	'황금 대탐험가 사자',
];

export interface OverallCharacter {
	img: ReturnType<typeof require>;
	level: number;
	maxLevel: number;
	nextAt: number | null;
	title: string;
}

/** 전체 누적 점수 → 전체 전용 마스코트 단계 */
export const getOverallCharacter = (totalScore: number): OverallCharacter => {
	let level = 1;
	for (let i = 0; i < OVERALL_TIERS.length; i++) {
		if (totalScore >= OVERALL_TIERS[i]) level = i + 1;
	}
	const nextAt = level < OVERALL_TIERS.length ? OVERALL_TIERS[level] : null;
	return { img: OVERALL_MASCOTS[level - 1], level, maxLevel: OVERALL_MASCOTS.length, nextAt, title: OVERALL_TITLES[level - 1] ?? `Lv.${level}` };
};

/** 홈에서 선택한 캐릭터 키가 저장되는 AsyncStorage 키 */
export const HOME_CHARACTER_KEY = 'HOME_SELECTED_CHARACTER';

/**
 * 홈에서 선택한 캐릭터 키('overall:3' · 'proverb:2' 형식)를 이미지로 변환.
 * 점수/통계 없이 키만으로 해석하므로 어느 화면에서든 가볍게 쓸 수 있다.
 * 키가 없거나 깨졌으면 기본 마스코트(1단계)로 폴백.
 */
export const getHomeCharacterImage = (key?: string | null): ReturnType<typeof require> => {
	const fallback = OVERALL_MASCOTS[0];
	if (!key) return fallback;
	const [scope, levelRaw] = key.split(':');
	const level = Number(levelRaw) || 1;
	const set = scope === 'overall' ? OVERALL_MASCOTS : CHARACTER_SETS[scope];
	if (!set?.length) return fallback;
	return set[level - 1] ?? set[set.length - 1] ?? fallback;
};

/** 전체 마스코트 전체 단계 목록 (레벨 모달용) */
export const getOverallCharacterLevels = (): { level: number; img: ReturnType<typeof require>; requiredScore: number; title: string }[] =>
	OVERALL_MASCOTS.map((img, i) => ({ level: i + 1, img, requiredScore: OVERALL_TIERS[i], title: OVERALL_TITLES[i] ?? `Lv.${i + 1}` }));

// ── 전체(누적) 등급: '푼 문제 / 전체 문제' 달성률(%) 기준 ──────────────
// 예) 20% = 견습 탐험가 사자(2단계). 표기는 %가 아닌 실제 문제 개수로 노출.
export const OVERALL_PCT_TIERS = [0, 20, 40, 60, 80, 100];

/** 달성률(%) → 전체 등급 index(1-based) */
export const getOverallLevelIndexByPct = (pct: number): number => {
	let lvl = 1;
	for (let i = 0; i < OVERALL_PCT_TIERS.length; i++) if (pct >= OVERALL_PCT_TIERS[i]) lvl = i + 1;
	return lvl;
};

/** 달성률(%) → 전체 전용 마스코트 단계 */
export const getOverallCharacterByPct = (pct: number): OverallCharacter => {
	const level = getOverallLevelIndexByPct(pct);
	const nextAt = level < OVERALL_PCT_TIERS.length ? OVERALL_PCT_TIERS[level] : null;
	return { img: OVERALL_MASCOTS[level - 1], level, maxLevel: OVERALL_MASCOTS.length, nextAt, title: OVERALL_TITLES[level - 1] ?? `Lv.${level}` };
};

/** 전체 단계 목록 (달성률 기준) — 각 단계 해금에 필요한 실제 문제 개수 포함 */
export const getOverallCharacterLevelsByCount = (
	total: number,
): { level: number; img: ReturnType<typeof require>; requiredPct: number; requiredCount: number; title: string }[] =>
	OVERALL_MASCOTS.map((img, i) => ({
		level: i + 1,
		img,
		requiredPct: OVERALL_PCT_TIERS[i],
		requiredCount: Math.round((OVERALL_PCT_TIERS[i] / 100) * total),
		title: OVERALL_TITLES[i] ?? `Lv.${i + 1}`,
	}));

/** total 미제공 시 사용하는 기본 임계값(저레벨 빠름/고레벨 느림) */
const FALLBACK_TIERS = [0, 3, 8, 18, 40, 100, 280];

/** 레벨2 도달 기준점(저레벨은 몇 문제만 풀어도 빠르게 상승) */
const START = 2;

/**
 * 주제별 단계 임계값 분배 — 지수(기하) 보간
 * - START(≈2) → total 사이를 지수 곡선으로 분배: 저레벨은 빠르게, 최고 레벨은 total 근처("끝까지")
 * - 예) total=2000, 7단계 → [0, 6, 20, 63, 200, 632, 2000]
 * - 예) total=50,   6단계 → [0, 4, 7, 14, 26, 50]
 * - 항상 단조 증가하며, total이 레벨 수보다 작으면 0,1,2,… 로 축약
 */
const thresholdsFor = (levelCount: number, total: number): number[] => {
	if (levelCount <= 1) return [0];
	if (total <= levelCount) return Array.from({ length: levelCount }, (_, i) => i);
	const start = Math.min(START, Math.max(1, Math.floor(total / 20)));
	const top = Math.max(total, start * 2); // 최고 레벨 = 총 문항(끝까지)
	const out: number[] = [0];
	for (let k = 1; k < levelCount; k++) {
		const frac = k / (levelCount - 1); // 0..1
		const val = Math.round(start * Math.pow(top / start, frac));
		out.push(Math.max(val, out[k - 1] + 1)); // 단조 증가 보장
	}
	return out;
};

/** 주제의 임계값 배열 (total 있으면 주제별 분배, 없으면 기본) */
const tiersOf = (levelCount: number, total?: number): number[] =>
	total && total > 0 ? thresholdsFor(levelCount, total) : FALLBACK_TIERS.slice(0, levelCount);

export interface CharacterInfo {
	img: ReturnType<typeof require>;
	level: number; // 1-based
	maxLevel: number;
	nextAt: number | null; // 다음 단계까지 필요한 누적 풀이 수 (없으면 최고 단계)
}

/** 해당 주제에 캐릭터가 있는지 */
export const hasCharacter = (domain: string): boolean => !!CHARACTER_SETS[domain];

/** 주제의 단계별 마스코트 이미지 배열 (레벨 메타에서 index로 매핑) */
export const getCharacterImages = (domain: string): ReturnType<typeof require>[] => CHARACTER_SETS[domain] ?? [];

/**
 * 주제 + 푼 문제 수(+총 문항)로 현재 캐릭터 단계/이미지 산출
 * @param total 해당 주제의 총 문항 수(있으면 주제별 분배)
 */
export const getCharacter = (domain: string, solved: number, total?: number): CharacterInfo | null => {
	const imgs = CHARACTER_SETS[domain];
	if (!imgs) return null;
	const tiers = tiersOf(imgs.length, total);
	let level = 1;
	for (let i = 0; i < imgs.length; i++) {
		if (solved >= (tiers[i] ?? Number.POSITIVE_INFINITY)) level = i + 1;
	}
	const nextAt = level < imgs.length ? tiers[level] : null;
	return { img: imgs[level - 1], level, maxLevel: imgs.length, nextAt };
};

export interface CharacterLevel {
	level: number; // 1-based
	img: ReturnType<typeof require>;
	requiredSolved: number; // 이 단계가 되기 위한 누적 풀이 수
}

/** 모든 주제·레벨의 캐릭터 이미지 (필요 시 랜덤 노출용) */
export const getAllCharacterImages = (): ReturnType<typeof require>[] =>
	Object.values(CHARACTER_SETS).reduce<ReturnType<typeof require>[]>((acc, imgs) => acc.concat(imgs), []);

/** 주제의 전체 단계 캐릭터 목록 (레벨별로 어떤 캐릭터가 나오는지) */
export const getCharacterLevels = (domain: string, total?: number): CharacterLevel[] => {
	const imgs = CHARACTER_SETS[domain];
	if (!imgs) return [];
	const tiers = tiersOf(imgs.length, total);
	return imgs.map((img, i) => ({ level: i + 1, img, requiredSolved: tiers[i] ?? 0 }));
};

export default { hasCharacter, getCharacter, getCharacterLevels, getAllCharacterImages, getCharacterImages };
