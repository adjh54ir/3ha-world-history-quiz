import { CATEGORY_ICON, categoryIcon, compareDifficultyLabels, difficultyIcon, difficultyLabel, sortByLevelAsc } from '../ConstQuizMeta';

describe('ConstQuizMeta', () => {
	it('숫자 난이도를 공통 한글 등급으로 변환한다', () => {
		expect([1, 2, 3, 4].map(difficultyLabel)).toEqual(['초급', '중급', '고급', '특급']);
	});

	it('카테고리와 난이도에 IconComponent용 아이콘 이름을 제공한다', () => {
		expect(CATEGORY_ICON).toBeTruthy();
		expect(difficultyIcon('초급')).toBeTruthy();
		expect(difficultyIcon('특급')).toBe('whatshot');
	});

	it('난이도를 초급부터 특급 순으로 정렬하고 기타 값은 뒤에 둔다', () => {
		expect(['특급', '기타', '중급', '초급', '고급'].sort(compareDifficultyLabels)).toEqual(['초급', '중급', '고급', '특급', '기타']);
	});

	it('세계 상식 카테고리(대륙·시대·갈래)에 어울리는 아이콘을 준다', () => {
		expect(categoryIcon('아시아')).toBe('public');
		expect(categoryIcon('19세기')).toBe('history');
		expect(categoryIcon('없는 갈래')).toBe(CATEGORY_ICON);
	});

	it('문항 목록을 난이도 오름차순으로 정렬하고 난이도 없는 문항은 뒤로 보낸다', () => {
		const items = [{ uid: 'a', level: '고급' }, { uid: 'b' }, { uid: 'c', level: '초급' }, { uid: 'd', level: '중급' }];
		expect(sortByLevelAsc(items).map((q) => q.uid)).toEqual(['c', 'd', 'a', 'b']);
		expect(items[0].uid).toBe('a'); // 원본 배열은 그대로 (비파괴 정렬)
	});
});
