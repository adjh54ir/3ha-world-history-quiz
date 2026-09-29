import AsyncStorage from '@react-native-async-storage/async-storage';
import TestHistoryService from '../TestHistoryService';

describe('TestHistoryService — 시험 대비 팩 기록', () => {
	beforeEach(async () => {
		await AsyncStorage.clear();
	});

	it('첫 응시는 그대로 최고 점수가 된다', async () => {
		await TestHistoryService.addExamResult('kbs', 21, 30, ['a', 'b']);

		const rec = (await TestHistoryService.getExamRecords()).kbs;
		expect(rec.best).toBe(21);
		expect(rec.total).toBe(30);
		expect(rec.plays).toBe(1);
		expect(rec.wrongUids).toEqual(['a', 'b']);
	});

	it('점수가 낮은 회차는 최고 점수를 덮어쓰지 않지만 응시 횟수와 오답은 갱신된다', async () => {
		await TestHistoryService.addExamResult('kbs', 21, 30, ['a', 'b']);
		await TestHistoryService.addExamResult('kbs', 15, 30, ['c']);

		const rec = (await TestHistoryService.getExamRecords()).kbs;
		expect(rec.best).toBe(21);
		expect(rec.plays).toBe(2);
		// 오답은 누적하지 않고 직전 회차로 덮어쓴다 — 누적하면 '오답만 다시 풀기'가 계속 불어난다
		expect(rec.wrongUids).toEqual(['c']);
	});

	it('최고 점수를 넘기면 총 문항 수도 그 회차 기준으로 바뀐다', async () => {
		await TestHistoryService.addExamResult('csat', 10, 20, []);
		await TestHistoryService.addExamResult('csat', 18, 20, []);

		const rec = (await TestHistoryService.getExamRecords()).csat;
		expect(rec.best).toBe(18);
		expect(rec.total).toBe(20);
	});

	it('clearAll 은 시험 팩 기록도 지운다', async () => {
		await TestHistoryService.addExamResult('kbs', 21, 30, []);
		await TestHistoryService.clearAll();

		expect(await TestHistoryService.getExamRecords()).toEqual({});
	});
});
