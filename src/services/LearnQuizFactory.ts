// services/LearnQuizFactory.ts
import { LearnType } from '@/src/types/data/LearnType';

/** Fisher-Yates 셔플 (원본 불변) */
export const shuffle = <T>(arr: T[]): T[] => {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
};

/** 전역 고유 ID 생성 — 도메인 prefix로 데이터셋 간 충돌 방지 */
export const makeUid = (domain: LearnType.Domain, id: number): LearnType.Uid => `${domain}-${id}`;

/**
 * 표준 시드 → 4지선다(객관식) 문항 생성 (공용)
 * - fixedOptions가 있으면 그대로 사용, 없으면 같은 group에서 오답을 자동 추출
 * - 모든 도메인이 이 팩토리를 공유하므로, 새 데이터셋은 "시드 변환"만 구현하면 된다.
 */
export const buildChoiceQuiz = (seeds: LearnType.QuizSeed[], opts?: LearnType.BuildOptions): LearnType.QuizQuestion[] => {
	const count = opts?.count ?? 10;
	const targets = shuffle(seeds).slice(0, count);

	// 오답 후보를 1회만 인덱싱(그룹별/전체 답안 목록) → 문항마다 전체 seeds를 filter·shuffle하던 O(문항수×N) 제거
	const allAnswers: string[] = [];
	const answersByGroup = new Map<string, string[]>();
	for (const s of seeds) {
		if (!s.answer) continue;
		allAnswers.push(s.answer);
		if (s.group) {
			let arr = answersByGroup.get(s.group);
			if (!arr) answersByGroup.set(s.group, (arr = []));
			arr.push(s.answer);
		}
	}
	// 풀에서 answer와 다른 서로 다른 보기 최대 3개를 무작위 샘플(전체 shuffle 없이)
	const pick3 = (pool: string[], answer: string, exclude?: Set<string>): string[] => {
		if (pool.length === 0) return [];
		const seen = new Set<string>([answer]);
		if (exclude) exclude.forEach((e) => seen.add(e));
		const out: string[] = [];
		const maxTries = pool.length * 4;
		for (let t = 0; out.length < 3 && t < maxTries; t++) {
			const cand = pool[(Math.random() * pool.length) | 0];
			if (cand && !seen.has(cand)) {
				seen.add(cand);
				out.push(cand);
			}
		}
		return out;
	};

	return targets.map((seed) => {
		let options: string[];

		if (seed.fixedOptions && seed.fixedOptions.length >= 2) {
			// 데이터가 보기를 직접 제공
			options = shuffle(seed.fixedOptions);
		} else {
			// 같은 그룹(세부 카테고리)에서 오답 우선 추출, 부족하면 전체에서 보충
			const groupPool = seed.group ? answersByGroup.get(seed.group) : undefined;
			const useGroup = !!groupPool && groupPool.length >= 4;
			let distractors = pick3(useGroup ? groupPool! : allAnswers, seed.answer);
			if (distractors.length < 3) {
				distractors = [...distractors, ...pick3(allAnswers, seed.answer, new Set(distractors))].slice(0, 3);
			}
			options = shuffle([seed.answer, ...distractors]);
		}

		return {
			id: seed.id,
			uid: seed.uid,
			domain: seed.domain,
			kind: 'choice',
			guide: seed.guide,
			prompt: seed.prompt,
			subPrompt: seed.subPrompt,
			options,
			answerIndex: options.indexOf(seed.answer),
			explanation: seed.explanation,
			level: seed.level,
			categoryLabel: seed.categoryLabel,
			examples: seed.examples,
		};
	});
};
