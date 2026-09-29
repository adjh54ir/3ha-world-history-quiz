import LearnHubService from '@/src/services/LearnHubService';
import { WORLD_ENTRIES } from '@/src/const/data/world/ConstWorldEntries';

/**
 * 한국어 퀴즈 화면에 세계 상식 데이터를 꽂는 어댑터(LearnHubService + WorldTopicService) 검증.
 * 화면은 도메인이 무엇이든 QuizQuestion 계약만 믿고 그리므로, 계약이 깨지면 화면이 조용히 틀린다.
 */
describe('LearnHubService — 세계 상식 도메인', () => {
	const main = LearnHubService.getDomainList();
	const sub = LearnHubService.getSubQuizDomainList();

	it('메인 8주제 + 서브 3주제(스포츠)로 나뉜다', () => {
		expect(main.map((d) => d.key)).toEqual(['capital', 'landmark', 'nature', 'figure', 'event', 'myth', 'space', 'constellation']);
		expect(sub.map((d) => d.key)).toEqual(['worldcup', 'olympic', 'winter']);
		[...main, ...sub].forEach((d) => expect(d.total).toBe(WORLD_ENTRIES[d.key].length));
	});

	it('주제마다 보기 넷에 정답이 들어 있는 문항을 낸다', () => {
		[...main, ...sub].forEach((d) => {
			const qs = LearnHubService.getDomain(d.key).generateQuiz({ count: 10 });
			expect(qs.length).toBe(Math.min(10, d.total));
			qs.forEach((q) => {
				expect(q.options).toHaveLength(4);
				expect(new Set(q.options).size).toBe(4);
				expect(q.answerIndex).toBeGreaterThanOrEqual(0);
				expect(q.guide.length).toBeGreaterThan(0);
				expect(q.uid.startsWith(`${d.key}-`)).toBe(true);
			});
		});
	});

	it('카테고리 칩에 정답이 보이지 않는다 (대륙 맞히기·언제 살았나)', () => {
		[...main, ...sub].forEach((d) => {
			LearnHubService.getDomain(d.key)
				.generateQuiz({ count: d.total })
				.forEach((q) => expect(q.categoryLabel).not.toBe(q.options[q.answerIndex]));
		});
	});

		it('그림 문항은 파일 이름을 글자로 보여 주지 않고 그림 참조를 단다', () => {
		const qs = LearnHubService.getDomain('figure').generateQuiz({ count: WORLD_ENTRIES.figure.length });
		const images = qs.filter((q) => q.imageRef);
		expect(images.length).toBeGreaterThan(0);
		images.forEach((q) => {
			expect(q.imageRef!.startsWith('figure:')).toBe(true);
			expect(q.prompt).toBe(q.guide);
			expect(q.prompt).not.toMatch(/\.(jpe?g|png|gif)$/i);
		});
	});

	it('빈칸·초성·OX·믹스 모드가 한 판(10문항)을 채운다', () => {
		const blank = LearnHubService.generateBlankQuiz(10);
		expect(blank).toHaveLength(10);
		blank.forEach((q) => {
			expect(q.prompt).toContain('( ㅇㅇ )');
			expect(q.prompt).not.toContain(q.options[q.answerIndex]);
			expect(q.categoryLabel).not.toBe(q.options[q.answerIndex]);
		});
		const initial = LearnHubService.generateInitialSoundQuiz(10);
		expect(initial).toHaveLength(10);
		initial.forEach((q) => expect(q.prompt).not.toContain(q.options[q.answerIndex]));
		const ox = LearnHubService.generateOXQuiz(10);
		expect(ox).toHaveLength(10);
		ox.forEach((q) => expect(q.kind).toBe('ox'));
		expect(LearnHubService.generateMixedQuiz(10)).toHaveLength(10);
		expect(LearnHubService.generateMixedQuiz(10, '특급')).toHaveLength(10);
	});

	it('오답 복습의 오답 보기는 정답과 같은 자리 값에서 뽑는다 (수도 문제에 대륙이 섞이지 않는다)', () => {
		const nepal = WORLD_ENTRIES.capital.find((e) => e.name === '네팔')!;
		const [q] = LearnHubService.generateReviewQuiz([
			{ uid: nepal.id, domain: 'capital', prompt: nepal.name, answer: nepal.fields.capital, explanation: '', guide: '이곳의 수도는?' },
		]);
		const capitals = new Set(WORLD_ENTRIES.capital.map((e) => e.fields.capital));
		q.options.forEach((o) => expect(capitals.has(o)).toBe(true));
		expect(q.guide).toContain('이곳의 수도는?');
	});

	it('즐겨찾기 퀴즈(이름 → 설명)의 오답 보기도 다른 항목의 설명이다', () => {
		const e = WORLD_ENTRIES.myth[0];
		const [q] = LearnHubService.generateReviewQuiz([{ uid: e.id, domain: 'myth', prompt: e.name, answer: e.summary, explanation: '' }]);
		const summaries = new Set(WORLD_ENTRIES.myth.map((m) => m.summary));
		q.options.forEach((o) => expect(summaries.has(o)).toBe(true));
	});

		it('그림 퀴즈는 10문항 모두 그림 문항이다', () => {
		const qs = LearnHubService.generatePictureQuiz(10);
		expect(qs).toHaveLength(10);
		qs.forEach((q) => expect(q.imageRef).toBeTruthy());
	});

	it('보기 국기는 나라 이름 보기에만 붙고, 국기 맞히기에는 절대 붙지 않는다', () => {
		const all = [...main, ...sub].flatMap((d) => LearnHubService.getDomain(d.key).generateQuiz({ count: d.total }));
		expect(all.some((q) => q.optionFlags)).toBe(true);
		all.filter((q) => q.imageRef?.startsWith('flag:')).forEach((q) => expect(q.optionFlags).toBeFalsy());
		const capital = WORLD_ENTRIES.capital[0];
		const [review] = LearnHubService.generateReviewQuiz([
			{ uid: capital.id, domain: 'capital', prompt: '이 국기는 어디의 것일까?', answer: capital.name, explanation: '', imageRef: `flag:${capital.fields.code}` },
		]);
		expect(review.optionFlags).toBe(false);
	});

		it('uid 로 학습 카드를 되찾는다 (보관함·오답노트 상세)', () => {
		const entry = WORLD_ENTRIES.landmark[0];
		const card = LearnHubService.getStudyCardByUid('landmark', entry.id);
		expect(card?.title).toBe(entry.name);
		expect(card?.imageRef?.startsWith('landmark:')).toBe(true);
	});
});
