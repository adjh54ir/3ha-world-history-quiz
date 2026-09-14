/** 생활한자 학습 카드용 상황 장면. 분야의 실제 사용 맥락이 시대 배경보다 우선한다. */
export type StudyScene = {
	image: number;
	categories: readonly string[];
};

export const STUDY_SCENES: StudyScene[] = [
	{ image: require('@/src/assets/illustrations/hanja-situation-01.webp'), categories: ['일상', '시간', '집과 살림'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-02.webp'), categories: ['학교', '말과 글', '생각과 철학', '역사'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-03.webp'), categories: ['경제', '수와 단위', '옷과 꾸밈'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-04.webp'), categories: ['직장', '직업', '행정과 서류'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-05.webp'), categories: ['건강', '몸'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-06.webp'), categories: ['여행', '자연', '위치와 모양'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-07.webp'), categories: ['음식'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-08.webp'), categories: ['스포츠'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-09.webp'), categories: ['마음', '관계', '성격과 태도', '사회'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-10.webp'), categories: ['문화'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-11.webp'), categories: ['일상', '자연', '여행'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-12.webp'), categories: ['여행', '위치와 모양', '경제'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-13.webp'), categories: ['마음', '관계', '성격과 태도', '사회'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-14.webp'), categories: ['직장', '직업', '경제'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-15.webp'), categories: ['자연', '음식', '수와 단위', '역사'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-16.webp'), categories: ['건강', '몸'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-17.webp'), categories: ['수와 단위', '위치와 모양', '직업', '학교'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-18.webp'), categories: ['시간', '일상', '집과 살림'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-19.webp'), categories: ['사회', '직장', '관계'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-20.webp'), categories: ['문화', '생각과 철학', '학교'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-21.webp'), categories: ['디지털'] },
	{ image: require('@/src/assets/illustrations/hanja-situation-22.webp'), categories: ['디지털'] },
];

/** 분야가 없거나 옛 데이터인 경우에도 단어 id로 장면을 안정적으로 고른다. */
export const selectStudyScene = (category: string, wordId = category): StudyScene => {
	const hash = [...wordId].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0, 0);
	const categoryScenes = STUDY_SCENES.filter((scene) => scene.categories.includes(category));
	const candidates = categoryScenes.length > 0 ? categoryScenes : STUDY_SCENES;
	return candidates[hash % candidates.length];
};
