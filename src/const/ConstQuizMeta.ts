/**
 * 퀴즈/학습 메타(난이도·카테고리) 아이콘 상수
 * - 화면 전반에서 난이도/카테고리 라벨과 함께 일관된 IconComponent 아이콘을 노출하기 위한 공통 상수
 * - 모두 MaterialIcons 이름
 */

/** 카테고리 태그용 아이콘 */
export const CATEGORY_ICON = 'sell';

/** 난이도 기본 아이콘 */
export const DIFFICULTY_ICON = 'bar-chart';

/** 숫자 난이도 공통 표기 (데이터 경계에서 한 번만 변환) */
export const DIFFICULTY_LABELS: Readonly<Record<number, string>> = {
	1: '초급',
	2: '중급',
	3: '고급',
	4: '특급',
};

/** 필터/드롭다운에서 사용하는 공통 난이도 표시 순서 */
export const DIFFICULTY_ORDER = ['초급', '중급', '고급', '특급'] as const;

/** 난이도 라벨 전체 순서 (세계 상식 항목은 1~4단계 = 초급~특급) */
export const LEVEL_ORDER: readonly string[] = DIFFICULTY_ORDER;

export const compareDifficultyLabels = (a: string, b: string): number => {
	const ai = LEVEL_ORDER.indexOf(a);
	const bi = LEVEL_ORDER.indexOf(b);
	if (ai === -1 && bi === -1) return a.localeCompare(b, 'ko');
	if (ai === -1) return 1;
	if (bi === -1) return -1;
	return ai - bi;
};

/** 쉬운 문제부터 풀도록 난이도 오름차순(초급→중급→고급→특급, 라벨 없음은 뒤) 정렬 */
export const sortByLevelAsc = <T extends { level?: string }>(items: T[]): T[] =>
	[...items].sort((a, b) => compareDifficultyLabels(a.level ?? '', b.level ?? ''));

export const difficultyLabel = (level: number): string => DIFFICULTY_LABELS[level] ?? `${level}단계`;

/**
 * 난이도 라벨 → 아이콘 (초급/중급/고급/특급 및 도메인별 의미 라벨 대응)
 */
export const difficultyIcon = (label?: string): string => {
	if (!label) return DIFFICULTY_ICON;
	const t = label.trim();
	if (t.includes('특급') || t.includes('매우') || t.includes('어려')) return 'whatshot';
	if (t.includes('고급') || t.includes('생소')) return 'trending-up';
	if (t.includes('중급') || t.includes('보통')) return 'bar-chart';
	// 초급 / 쉬움 / 흔함 등
	return 'signal-cellular-alt';
};

/**
 * 카테고리 라벨 → 어울리는 아이콘 (대륙·시대·갈래 키워드 매핑, 기본값 CATEGORY_ICON)
 * - 사용되는 모든 카테고리 태그에 공통 적용해 전역 일관성 확보
 */
export const categoryIcon = (label?: string): string => {
	if (!label) return CATEGORY_ICON;
	const t = label.trim();
	// 대륙 (수도·랜드마크·지형의 갈래)
	if (/아시아|유럽|아프리카|아메리카|오세아니아/.test(t)) return 'public';
	// 시대 (위인)
	if (/고대|중세|세기/.test(t)) return 'history';
	// 사건 갈래
	if (t === '전쟁' || t === '혁명') return 'local-fire-department';
	if (t === '조약' || t === '제도' || t === '건국') return 'account-balance';
	if (t === '발명' || t === '사상') return 'lightbulb';
	if (t === '탐험') return 'explore';
	if (t === '문명' || t === '멸망') return 'museum';
	if (t === '재난') return 'warning-amber';
	// 신화 갈래
	if (t === '신' || t === '영웅' || t === '인물' || t === '괴물') return 'auto-awesome';
	// 천체 갈래
	if (/항성|행성|위성|영역|별자리|천체/.test(t)) return 'nights-stay';
	return CATEGORY_ICON;
};

export default { CATEGORY_ICON, DIFFICULTY_ICON, DIFFICULTY_LABELS, DIFFICULTY_ORDER, compareDifficultyLabels, sortByLevelAsc, difficultyIcon, difficultyLabel, categoryIcon };
