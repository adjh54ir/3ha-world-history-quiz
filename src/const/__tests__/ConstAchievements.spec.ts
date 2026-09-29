import CONST_ACHIEVEMENTS, { RARITY_META } from '@/src/const/ConstAchievements';

describe('뱃지 정의', () => {
	it('모든 뱃지가 이름·설명·획득 조건·희귀도를 각각 가진다', () => {
		CONST_ACHIEVEMENTS.forEach((a) => {
			expect(a.title.trim().length).toBeGreaterThan(0);
			expect(a.desc.trim().length).toBeGreaterThan(0);
			expect(a.cond.trim().length).toBeGreaterThan(0);
			// 설명과 획득 조건은 서로 다른 정보여야 한다
			expect(a.desc).not.toBe(a.cond);
			expect(RARITY_META[a.rarity]).toBeDefined();
		});
	});

	it('같은 그룹에서 목표치가 클수록 희귀도가 낮아지지 않는다', () => {
		const order = Object.keys(RARITY_META);
		const groups = [...new Set(CONST_ACHIEVEMENTS.map((a) => a.group))];
		groups.forEach((g) => {
			const sorted = CONST_ACHIEVEMENTS.filter((a) => a.group === g).sort((a, b) => a.target - b.target);
			sorted.forEach((a, i) => {
				if (i === 0) return;
				expect(order.indexOf(a.rarity)).toBeGreaterThanOrEqual(order.indexOf(sorted[i - 1].rarity));
			});
		});
	});
});
