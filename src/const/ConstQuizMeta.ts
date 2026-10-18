/**
 * 퀴즈/학습 메타(난이도·카테고리) 아이콘 상수
 * - 화면 전반에서 난이도/카테고리 라벨과 함께 일관된 IconComponent 아이콘을 노출하기 위한 공통 상수
 * - 모두 MaterialIcons 이름
 */
import i18n, { appLanguage } from '@/src/translations';
import { koTerm } from '@/src/const/data/world/ConstWorldEntries';
import { localized } from '@/src/utils/ThemedStyles';

/** 카테고리 태그용 아이콘 */
export const CATEGORY_ICON = 'sell';

/** 난이도 기본 아이콘 */
export const DIFFICULTY_ICON = 'bar-chart';

/**
 * 필터/드롭다운에서 사용하는 공통 난이도 표시 순서 (초급→특급)
 * 언어마다 한 번 번역해 둔다(localized) — 문항·카드·필터가 모두 이 값을 쓰므로 언어 안에서는 서로 맞는다.
 * 난이도를 가리킬 때는 '초급' 같은 글자 대신 DIFFICULTY_ORDER[i] / DIFFICULTY_LABELS[n] 을 쓴다.
 */
export const DIFFICULTY_ORDER = localized((): readonly string[] => [
	i18n.t('special.levelTest.grades.beginner.title'),
	i18n.t('special.levelTest.grades.intermediate.title'),
	i18n.t('special.levelTest.grades.advanced.title'),
	i18n.t('special.levelTest.grades.expert.title'),
]);

/** 숫자 난이도 공통 표기 (데이터 경계에서 한 번만 변환) */
export const DIFFICULTY_LABELS = localized((): Readonly<Record<number, string>> => ({ 1: DIFFICULTY_ORDER[0], 2: DIFFICULTY_ORDER[1], 3: DIFFICULTY_ORDER[2], 4: DIFFICULTY_ORDER[3] }));

/** 난이도 라벨 전체 순서 (세계 상식 항목은 1~4단계 = 초급~특급) */
export const LEVEL_ORDER: readonly string[] = DIFFICULTY_ORDER;

/** 오답노트에 저장된 옛 한국어 라벨도 순서를 찾게 한다 (다른 언어로 저장된 라벨은 '라벨 없음' 취급) */
const KO_LEVEL_ORDER = ['초급', '중급', '고급', '특급'];

/** 난이도 라벨 → 0~3 (모르는 라벨은 -1) */
export const difficultyIndex = (label: string): number => {
	const i = LEVEL_ORDER.indexOf(label);
	return i !== -1 ? i : KO_LEVEL_ORDER.indexOf(label);
};

export const compareDifficultyLabels = (a: string, b: string): number => {
	const ai = difficultyIndex(a);
	const bi = difficultyIndex(b);
	if (ai === -1 && bi === -1) return a.localeCompare(b, appLanguage().slice(0, 2));
	if (ai === -1) return 1;
	if (bi === -1) return -1;
	return ai - bi;
};

/** 쉬운 문제부터 풀도록 난이도 오름차순(초급→중급→고급→특급, 라벨 없음은 뒤) 정렬 */
export const sortByLevelAsc = <T extends { level?: string }>(items: T[]): T[] =>
	[...items].sort((a, b) => compareDifficultyLabels(a.level ?? '', b.level ?? ''));

export const difficultyLabel = (level: number): string => DIFFICULTY_LABELS[level] ?? i18n.t('level.stepN', { level });

/** 난이도 순서대로의 아이콘 (초급→특급) */
const DIFFICULTY_ICONS = ['signal-cellular-alt', 'bar-chart', 'trending-up', 'whatshot'];

/**
 * 난이도 라벨 → 아이콘 (초급/중급/고급/특급 및 도메인별 의미 라벨 대응)
 */
export const difficultyIcon = (label?: string): string => {
	if (!label) return DIFFICULTY_ICON;
	const t = label.trim();
	const i = difficultyIndex(t);
	if (i !== -1) return DIFFICULTY_ICONS[i];
	if (t.includes('매우') || t.includes('어려')) return 'whatshot';
	if (t.includes('생소')) return 'trending-up';
	if (t.includes('보통')) return 'bar-chart';
	// 초급 / 쉬움 / 흔함 등
	return 'signal-cellular-alt';
};

/**
 * 카테고리 라벨 → 어울리는 아이콘 (대륙·시대·갈래 키워드 매핑, 기본값 CATEGORY_ICON)
 * - 사용되는 모든 카테고리 태그에 공통 적용해 전역 일관성 확보
 */
export const categoryIcon = (label?: string): string => {
	if (!label) return CATEGORY_ICON;
	// 카테고리는 세계 데이터 값을 앱 언어로 옮긴 것이라 한국어 원래 값으로 되돌려 낱말을 맞춘다
	const t = koTerm(label.trim());
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
