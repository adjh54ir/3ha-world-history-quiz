import type { LifeType } from '@/src/types/data/LifeType';

/** 학습 카테고리 — 단어 수는 ConstLifeWords 에서 센다 */
export const LIFE_CATEGORIES: LifeType.Category[] = [
	{ key: 'daily', label: '일상', description: '하루를 채우는 말', icon: 'home-heart', color: 'primaryDark', tint: 'primarySoft' },
	{ key: 'economy', label: '경제', description: '돈과 소비, 시장의 말', icon: 'chart-line', color: 'accentAmber', tint: 'accentAmberSoft' },
	{ key: 'culture', label: '문화', description: '예술과 전통, 여가의 말', icon: 'palette', color: 'secondaryDark', tint: 'secondarySoft' },
	{ key: 'society', label: '사회', description: '뉴스와 제도, 공동체의 말', icon: 'account-group', color: 'accentOrange', tint: 'warningSoft' },
	{ key: 'school', label: '학교', description: '배움과 시험의 말', icon: 'school', color: 'secondary', tint: 'secondaryBg' },
	{ key: 'health', label: '건강', description: '몸과 마음을 돌보는 말', icon: 'heart-pulse', color: 'error', tint: 'errorSoft' },
	{ key: 'work', label: '직장', description: '회사와 업무의 말', icon: 'briefcase', color: 'primaryDeep', tint: 'primaryBg' },
	{ key: 'nature', label: '자연', description: '날씨와 환경, 과학의 말', icon: 'leaf', color: 'success', tint: 'successSoft' },
	{ key: 'food', label: '음식', description: '먹고 마시는 말', icon: 'silverware-fork-knife', color: 'errorDark', tint: 'errorSoft' },
	{ key: 'travel', label: '여행', description: '길 위에서 쓰는 말', icon: 'airplane', color: 'secondaryDark', tint: 'secondaryBg' },
	{ key: 'sports', label: '스포츠', description: '겨루고 응원하는 말', icon: 'soccer', color: 'primary', tint: 'primaryBg' },
	{ key: 'digital', label: '디지털', description: '기기와 통신의 말', icon: 'cellphone', color: 'textStrong', tint: 'surfaceAlt' },
	{ key: 'emotion', label: '마음', description: '감정을 담은 말', icon: 'emoticon-happy-outline', color: 'accentOrange', tint: 'errorSoft' },
	{ key: 'time', label: '시간', description: '때와 날짜의 말', icon: 'clock-outline', color: 'secondary', tint: 'secondarySoft' },
	{ key: 'relation', label: '관계', description: '사람 사이의 말', icon: 'account-heart', color: 'primaryDeep', tint: 'primarySoft' },
	{ key: 'number', label: '수와 단위', description: '세고 재는 말', icon: 'numeric', color: 'accentAmber', tint: 'surfaceAlt' },
	{ key: 'home', label: '집과 살림', description: '집 안팎을 돌보는 말', icon: 'sofa', color: 'primaryDark', tint: 'surfaceAlt' },
	{ key: 'fashion', label: '옷과 꾸밈', description: '입고 꾸미는 말', icon: 'tshirt-crew', color: 'errorDark', tint: 'accentAmberSoft' },
	{ key: 'body', label: '몸', description: '신체와 감각의 말', icon: 'human', color: 'accentOrange', tint: 'surfaceAlt' },
	{ key: 'admin', label: '행정과 서류', description: '관공서와 문서의 말', icon: 'file-document-outline', color: 'secondaryDark', tint: 'surfaceAlt' },
	{ key: 'character', label: '성격과 태도', description: '사람됨을 나타내는 말', icon: 'account-star', color: 'primaryDeep', tint: 'accentAmberSoft' },
	{ key: 'thought', label: '생각과 철학', description: '사고와 가치의 말', icon: 'lightbulb-outline', color: 'textStrong', tint: 'secondarySoft' },
	{ key: 'job', label: '직업', description: '일과 업종의 말', icon: 'account-hard-hat', color: 'accentAmber', tint: 'secondaryBg' },
	{ key: 'position', label: '위치와 모양', description: '방향·형태·공간의 말', icon: 'compass-outline', color: 'secondaryDark', tint: 'primarySoft' },
	{ key: 'history', label: '역사', description: '옛 나라와 사건의 말', icon: 'castle', color: 'errorDark', tint: 'warningSoft' },
	{ key: 'language', label: '말과 글', description: '언어와 문장의 말', icon: 'translate', color: 'textStrong', tint: 'primaryBg' },
];

export const selectCategory = (key: LifeType.CategoryKey): LifeType.Category =>
	LIFE_CATEGORIES.find((item) => item.key === key) ?? LIFE_CATEGORIES[0];
