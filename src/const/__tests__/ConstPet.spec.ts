import { getPetProgress } from '@/src/const/ConstPet';

describe('getPetProgress', () => {
	it('누적 출석일 경계에서 단계가 오른다', () => {
		expect(getPetProgress(0).current.stage).toBe(1);
		expect(getPetProgress(2).current.stage).toBe(1);
		expect(getPetProgress(3).current.stage).toBe(2);
		expect(getPetProgress(14).current.stage).toBe(3);
		expect(getPetProgress(15).current.stage).toBe(4);
		expect(getPetProgress(90).current.stage).toBe(5);
	});

	it('최고 단계면 다음 단계가 없다', () => {
		expect(getPetProgress(7).next?.days).toBe(15);
		expect(getPetProgress(30).next).toBeNull();
	});
});
