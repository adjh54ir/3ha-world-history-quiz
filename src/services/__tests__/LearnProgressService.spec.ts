import LearnProgressService from '../LearnProgressService';

describe('LearnProgressService — 점수/정답률/스트릭', () => {
	beforeEach(async () => {
		await LearnProgressService.clearAll();
	});

	it('recordAnswer는 정답/오답을 누적한다', async () => {
		await LearnProgressService.recordAnswer({ domain: 'capital' as never, domainTitle: '세계 수도', correct: true });
		await LearnProgressService.recordAnswer({ domain: 'capital' as never, domainTitle: '세계 수도', correct: false });
		await LearnProgressService.recordAnswer({ domain: 'capital' as never, domainTitle: '세계 수도', correct: true });

		const stats = await LearnProgressService.getStats();
		expect(stats.totalSolved).toBe(3);
		expect(stats.totalCorrect).toBe(2);
		expect(stats.byDomain.capital.solved).toBe(3);
		expect(stats.byDomain.capital.correct).toBe(2);
	});

	it('첫 풀이에서 연속 출석(streak)이 1이 된다', async () => {
		await LearnProgressService.recordAnswer({ domain: 'figure' as never, domainTitle: '세계 위인', correct: true });
		const stats = await LearnProgressService.getStats();
		expect(stats.streakCount).toBe(1);
		expect(stats.lastPlayedDate).not.toBeNull();
	});

	it('저장이 끝나기 전에 조회해도 마지막 문항까지 반영된 점수를 읽는다', async () => {
		// 퀴즈 마지막 문항 저장을 기다리지 않고 바로 점수를 읽는 상황(랭킹 제출·홈 복귀)
		const pending = LearnProgressService.recordAnswer({ domain: 'capital' as never, domainTitle: '세계 수도', correct: true });
		const stats = await LearnProgressService.getStats();
		expect(stats.totalCorrect).toBe(1);
		await pending;
	});

	it('여러 도메인 점수가 독립적으로 집계된다', async () => {
		await LearnProgressService.recordAnswer({ domain: 'myth' as never, domainTitle: '그리스 로마 신화', correct: true });
		await LearnProgressService.recordAnswer({ domain: 'figure' as never, domainTitle: '세계 위인', correct: true });
		const stats = await LearnProgressService.getStats();
		expect(stats.byDomain.myth.correct).toBe(1);
		expect(stats.byDomain.figure.correct).toBe(1);
		expect(stats.totalCorrect).toBe(2);
	});
});

describe('LearnProgressService — 오답 간격 반복 복습', () => {
	const wrong = (uid: string) => ({
		uid,
		domain: 'capital' as never,
		domainTitle: '세계 수도',
		prompt: `문제 ${uid}`,
		answer: '정답',
		explanation: '해설',
	});

	beforeEach(async () => {
		await LearnProgressService.clearAll();
	});

	it('새로 담은 오답은 하루 뒤로 예약되어 오늘은 복습 대상이 아니다', async () => {
		await LearnProgressService.addWrongNotes([wrong('a')]);
		const [note] = await LearnProgressService.getWrongNotes();
		expect(note.reviewStage).toBe(0);
		expect(note.nextReviewAt).toBeGreaterThan(Date.now());
		expect(await LearnProgressService.getDueWrongNotes()).toHaveLength(0);
	});

	it('맞히면 다음 간격으로 미뤄지고, 틀리면 1단계로 돌아간다', async () => {
		await LearnProgressService.addWrongNotes([wrong('a')]);

		await LearnProgressService.applyReviewResult([{ uid: 'a', correct: true }]);
		const afterCorrect = (await LearnProgressService.getWrongNotes())[0];
		expect(afterCorrect.reviewStage).toBe(1);

		await LearnProgressService.applyReviewResult([{ uid: 'a', correct: false }]);
		const afterWrong = (await LearnProgressService.getWrongNotes())[0];
		expect(afterWrong.reviewStage).toBe(0);
		// 틀렸으므로 다시 가장 짧은 간격(1일)으로 예약된다
		expect(afterWrong.nextReviewAt).toBeGreaterThan(Date.now());
	});

	it('마지막 간격까지 연속으로 맞히면 오답노트에서 졸업(제거)된다', async () => {
		await LearnProgressService.addWrongNotes([wrong('a')]);
		for (let i = 0; i < 4; i++) {
			await LearnProgressService.applyReviewResult([{ uid: 'a', correct: true }]);
		}
		expect(await LearnProgressService.getWrongNotes()).toHaveLength(0);
	});

	it('결과에 없는 오답은 그대로 남는다', async () => {
		await LearnProgressService.addWrongNotes([wrong('a'), wrong('b')]);
		await LearnProgressService.applyReviewResult([{ uid: 'a', correct: true }]);
		const uids = (await LearnProgressService.getWrongNotes()).map((w) => w.uid).sort();
		expect(uids).toEqual(['a', 'b']);
	});
});
