/**
 * 4지선다 문항 생성
 * -------------------------------------------------
 * - meaning   : 단어(한자+독음)를 보고 뜻 고르기
 * - hanja     : 뜻·독음을 보고 한자 표기 고르기
 * - blank     : 예문 빈칸에 들어갈 단어(독음) 고르기
 * - homophone : 독음이 같은 한자 넷 중 뜻에 맞는 것 고르기
 *
 * 보기는 같은 카테고리에서 먼저 뽑고, 모자라면 전체에서 채운다.
 * (같은 분야의 단어끼리 섞여야 "그럴듯한" 오답이 된다)
 */
import type { LifeType } from '../../types/data/LifeType';
import { selectHomophones } from '../../const/data/life/ConstLifeWords.ts';
import { shuffle } from './LifeRules.ts';

export const ALL_MODES: LifeType.QuizMode[] = ['meaning', 'hanja', 'blank', 'homophone'];

export const MODE_META: Record<LifeType.QuizMode, { label: string; question: string }> = {
	meaning: { label: '의미 찾기', question: '이 단어의 뜻은?' },
	hanja: { label: '한자 고르기', question: '이 뜻에 맞는 한자는?' },
	blank: { label: '빈칸 채우기', question: '빈칸에 들어갈 말은?' },
	// 보기에 같은 소리의 한자가 반드시 섞이지만 넷 다 같은 소리인 무리는 열 개뿐이라
	// "소리가 같은" 이라고 못 박지 않는다. 실제로 헷갈리는 보기가 나온다는 뜻으로 적었다.
	homophone: { label: '헷갈리는 한자', question: '이 뜻에 맞는 한자는?' },
};

/** 유형별로 보기에 쓰는 값 */
const valueOf = (word: LifeType.Word, mode: LifeType.QuizMode): string =>
	mode === 'meaning' ? word.meaning : mode === 'hanja' || mode === 'homophone' ? word.word : word.reading;

/** 뜻풀이를 두 글자 조각으로 쪼갠다 — 겹치는 조각이 많을수록 두 뜻이 닮았다 */
const grams = (meaning: string): Set<string> => {
	const text = meaning.replace(/[,·()\s]/g, '');
	const set = new Set<string>();
	for (let at = 0; at < text.length - 1; at++) {
		set.add(text.slice(at, at + 2));
	}
	return set;
};

/**
 * 뜻이 서로 너무 닮았는지. 데이터 쪽은 테스트(ConstLifeWords.test.ts)가 막고 있지만,
 * 단어를 더하다 보면 다시 어긋날 수 있어 보기를 뽑는 자리에서 한 번 더 거른다.
 * 여기서 걸리면 '두 보기가 다 정답인' 문항이 나온다.
 */
const TOO_ALIKE = 0.75;
const alike = (a: Set<string>, b: Set<string>): boolean => {
	if (a.size === 0 || b.size === 0) {
		return false;
	}
	let shared = 0;
	a.forEach((gram) => {
		if (b.has(gram)) {
			shared += 1;
		}
	});
	return shared / (a.size + b.size - shared) >= TOO_ALIKE;
};

/**
 * 문항 하나. 보기 3개를 채울 수 없으면 null (호출 쪽에서 건너뛴다).
 * @param word 대상 단어
 * @param pool 보기를 뽑을 전체 단어
 * @param random 난수 — 시드 고정이 필요하면 바꿔 넣는다
 */
export const buildQuestion = (
	word: LifeType.Word,
	mode: LifeType.QuizMode,
	pool: LifeType.Word[],
	random: () => number = Math.random,
): LifeType.Question | null => {
	const answer = valueOf(word, mode);
	const used = new Set<string>([answer]);
	const distractors: string[] = [];
	// 뜻 고르기에서만 견준다 — 한자·독음 보기는 글자가 다르면 헷갈릴 일이 없다
	const answerGrams = mode === 'meaning' ? grams(answer) : null;
	const take = (candidates: LifeType.Word[]) => {
		for (const item of shuffle(candidates, random)) {
			if (distractors.length >= 3) {
				return;
			}
			const value = valueOf(item, mode);
			if (item.id === word.id || used.has(value)) {
				continue;
			}
			if (answerGrams && alike(answerGrams, grams(value))) {
				continue;
			}
			used.add(value);
			distractors.push(value);
		}
	};
	if (mode === 'homophone') {
		// 소리가 같은 한자를 먼저 넣는다 — 이 유형은 이게 곧 문제다.
		// 짝이 하나도 없으면 낼 수 없는 문항이라 여기서 접는다.
		const sameSound = selectHomophones(word);
		if (sameSound.length === 0) {
			return null;
		}
		take(sameSound);
		// 동음 짝은 대개 하나뿐이라 나머지는 "소리가 반쯤 같은" 말로 채운다.
		// 기상(起床) 이면 기록·기대(첫 소리) 와 현상·정상(끝 소리) — 글자만 겹치는 것보다 훨씬 헷갈린다.
		const sounds = [...word.reading];
		take(pool.filter((item) => [...item.reading].some((sound, at) => sound === sounds[at])));
		// 그래도 모자라면 글자를 같이 쓰는 말 (起床 ↔ 起動)
		const chars = new Set(word.chars.map((item) => item.char));
		take(pool.filter((item) => item.chars.some((char) => chars.has(char.char))));
	}
	take(pool.filter((item) => item.category === word.category));
	take(pool);
	if (distractors.length < 3) {
		return null;
	}
	const exampleAt = Math.floor(random() * word.examples.length);
	return { id: `${word.id}:${mode}`, mode, word, exampleAt, answer, options: shuffle([answer, ...distractors], random) };
};

/**
 * 단어 목록 → 문항 목록. 단어마다 유형을 돌려가며 배정한다 (섞인 순서).
 * @param words 출제할 단어 (이 순서대로 문항이 나온다)
 * @param pool 보기 후보 (보통 전체 단어)
 * @param modes 쓸 유형 — 하나만 넘기면 그 유형으로만 낸다
 */
export const buildQuestions = (
	words: LifeType.Word[],
	pool: LifeType.Word[],
	modes: LifeType.QuizMode[] = ALL_MODES,
	random: () => number = Math.random,
): LifeType.Question[] => {
	const order = shuffle(modes, random);
	// 동음이의어는 짝이 있는 단어(436개)에만 낼 수 있다. 짝 없는 단어에 걸리면
	// 전부 meaning 으로 밀려 한 유형만 쏟아지므로, 배정 단계에서 미리 걸러 다음 유형으로 넘긴다.
	const usable = (word: LifeType.Word, mode: LifeType.QuizMode) =>
		mode !== 'homophone' || selectHomophones(word).length > 0;
	const result: LifeType.Question[] = [];
	words.forEach((word, at) => {
		let mode = order[at % order.length];
		for (let step = 1; step < order.length && !usable(word, mode); step++) {
			mode = order[(at + step) % order.length];
		}
		const question = buildQuestion(word, mode, pool, random) ?? buildQuestion(word, 'meaning', pool, random);
		if (question) {
			result.push(question);
		}
	});
	return result;
};

/**
 * 끝없이 이어지는 문항 — 타임·타워 챌린지용.
 * 단어를 다 쓰면 다시 섞어 이어 간다.
 */
export const createQuestionStream = (pool: LifeType.Word[], modes: LifeType.QuizMode[] = ALL_MODES) => {
	let queue: LifeType.Question[] = [];
	return (): LifeType.Question => {
		if (queue.length === 0) {
			queue = buildQuestions(shuffle(pool), pool, modes);
		}
		return queue.shift()!;
	};
};
