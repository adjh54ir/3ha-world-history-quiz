import { EXAM_PACKS, getExamPack } from '../ConstExamPacks';
import LearnHubService from '@/src/services/LearnHubService';

describe('ConstExamPacks — 테마 코스 큐레이션', () => {
	/** 오타난 도메인 키는 출제에서 조용히 빠져 문항이 줄어든다 — 정의 단계에서 잡는다 */
	it('모든 팩의 도메인 키가 실제 도메인이다', () => {
		const valid = new Set([
			...LearnHubService.getDomainList().map((d) => d.key),
			...LearnHubService.getSubQuizDomainList().map((d) => d.key),
		]);
		EXAM_PACKS.forEach((p) => {
			expect(p.domains.length).toBeGreaterThan(0);
			p.domains.forEach((k) => expect(valid.has(k)).toBe(true));
		});
	});

	it('팩마다 요청한 문항 수만큼 실제로 출제된다', () => {
		EXAM_PACKS.forEach((p) => {
			const questions = LearnHubService.generateFocusedQuiz(p.domains, p.count, p.level);
			expect(questions.length).toBe(p.count);
		});
	});

	it('getExamPack 은 키로 찾고 없으면 undefined', () => {
		expect(getExamPack('geo')?.title).toBe('세계 지리 완전정복');
		expect(getExamPack('none')).toBeUndefined();
		expect(getExamPack(undefined)).toBeUndefined();
	});
});
