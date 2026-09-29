import { POINT_PER_CORRECT, toScore } from '../ConstScoring';

describe('ConstScoring', () => {
	it('정답 1개당 10점', () => {
		expect(POINT_PER_CORRECT).toBe(10);
	});

	it('toScore가 정답 개수를 점수로 환산', () => {
		expect(toScore(0)).toBe(0);
		expect(toScore(3)).toBe(30);
		expect(toScore(12)).toBe(120);
	});
});
