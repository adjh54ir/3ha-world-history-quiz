/**
 * 세계 상식 4지선다 문항 생성
 * -------------------------------------------------
 * 주제마다 묻는 값이 달라도 코드는 하나다. 무엇을 보여 주고 무엇을 답으로 쓸지는
 * ConstWorldTopics 의 QuizMode 가 정하고, 여기서는 그 자리에서 값만 꺼내 온다.
 *
 * 오답 보기는 같은 주제의 다른 항목에서 **같은 자리의 값**을 가져온다.
 * 수도 문제의 오답은 다른 나라의 수도고, 우승국 문제의 오답은 다른 대회의 우승국이다.
 * 그래야 보기 넷이 한 묶음으로 보인다.
 *
 * 화면·저장소를 모르는 순수 함수라 `node --test` 로 그대로 검증한다.
 */
import type { WorldType } from '../../types/data/WorldType';

/** 값이 있는 자리에서 값을 꺼낸다 — 'name'·'summary' 말고는 fields 의 열쇠 */
export const pick = (entry: WorldType.Entry, slot: string): string =>
	slot === 'name' ? entry.name : slot === 'summary' ? entry.summary : (entry.fields[slot] ?? '');

export const shuffle = <T>(list: T[], random: () => number = Math.random): T[] => {
	const copy = [...list];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
};

const OPTION_COUNT = 4;

/**
 * 문항 하나. 낼 수 없으면 null 이다 (호출 쪽에서 건너뛴다).
 *
 * 낼 수 없는 경우
 * - 항목에 그 자리의 값이 없다 (위성에는 '태양에서 몇 번째' 가 없다)
 * - 문제와 정답이 같은 말이다 (싱가포르의 수도는 싱가포르)
 * - 문제 안에 정답이 들어 있다 (피사의 사탑이 있는 곳은 피사, 프랑스 대혁명이 일어난 나라는 프랑스)
 * - 서로 다른 오답 보기를 셋 채우지 못한다
 *
 * @param entry 출제할 항목
 * @param topic 주제 (문항 id 와 표시에 쓴다)
 * @param mode  무엇을 묻고 무엇을 답으로 할지
 * @param pool  오답 보기를 뽑을 같은 주제의 항목들
 * @param random 난수 — 시드를 고정하려면 바꿔 넣는다
 */
export const buildQuestion = (
	entry: WorldType.Entry,
	topic: WorldType.Topic,
	mode: WorldType.QuizMode,
	pool: WorldType.Entry[],
	random: () => number = Math.random,
): WorldType.Question | null => {
	const prompt = pick(entry, mode.ask);
	const answer = pick(entry, mode.answer);
	if (!prompt || !answer || prompt === answer) {
		return null;
	}
	// 문제 안에 답이 그대로 박혀 있으면 읽기만 해도 풀린다 — '피사의 사탑'이 있는 곳, '쿠웨이트시티'가 수도인 곳.
	// 그림 문항은 예외다. 그때 prompt 는 화면에 글자로 나오지 않고 그림을 찾는 파일 이름일 뿐이다
	// (초상 파일 이름에 인물 이름이 들어 있다고 답이 보이지는 않는다).
	if (!mode.askAs && prompt.includes(answer)) {
		return null;
	}
	// 문제 자리의 값이 둘 이상 있으면 정답도 둘이다 — 조지타운은 가이아나의 수도이면서 케이맨 제도의 수도다.
	// 여기서 접지 않으면 맞는 답을 골라도 틀렸다고 나온다.
	if (pool.some((item) => item.id !== entry.id && pick(item, mode.ask) === prompt)) {
		return null;
	}
	const used = new Set<string>([answer]);
	const options: string[] = [answer];
	const take = (candidates: WorldType.Entry[]) => {
		for (const item of shuffle(candidates, random)) {
			if (options.length >= OPTION_COUNT) {
				return;
			}
			if (item.id === entry.id) {
				continue;
			}
			const value = pick(item, mode.answer);
			// 문제에 이미 적힌 말이 보기에 섞이면 답이 드러난다 (개최국과 우승국이 같은 대회)
			if (!value || value === prompt || used.has(value)) {
				continue;
			}
			used.add(value);
			options.push(value);
		}
	};
	// 같은 갈래에서 먼저 뽑는다 — 신 문제의 오답은 신이어야 하고, 아시아 나라의 오답은 아시아 나라여야
	// 헷갈린다. 괴물 설명이 섞이면 읽지 않고도 답이 보인다. 모자라면 아래에서 전체로 채운다.
	const group = topic.groupBy;
	if (group) {
		const value = pick(entry, group);
		take(pool.filter((item) => pick(item, group) === value));
	}
	take(pool);
	if (options.length < OPTION_COUNT) {
		return null;
	}
	return {
		id: `${entry.id}:${mode.key}`,
		topic: topic.key,
		mode: mode.key,
		entry,
		prompt,
		question: mode.question,
		answer,
		options: shuffle(options, random),
	};
};

/**
 * 항목 목록 → 문항 목록. 항목마다 모드를 돌려가며 배정한다 (같은 주제라도 회차마다 묻는 게 달라진다).
 * 첫 모드로 못 내면 다음 모드로 넘기고, 끝내 못 내면 그 항목은 건너뛴다.
 *
 * @param entries 출제할 항목 (이 순서대로 문항이 나온다)
 * @param topic   주제
 * @param pool    오답 보기를 뽑을 풀 — 보통 그 주제의 전체 항목
 * @param modes   쓸 모드 — 한 가지만 내고 싶으면 하나만 넘긴다
 */
export const buildQuestions = (
	entries: WorldType.Entry[],
	topic: WorldType.Topic,
	pool: WorldType.Entry[],
	random: () => number = Math.random,
	modes: WorldType.QuizMode[] = topic.modes,
): WorldType.Question[] => {
	const questions: WorldType.Question[] = [];
	entries.forEach((entry, at) => {
		for (let step = 0; step < modes.length; step++) {
			const question = buildQuestion(entry, topic, modes[(at + step) % modes.length], pool, random);
			if (question) {
				questions.push(question);
				return;
			}
		}
	});
	return questions;
};

/**
 * 주제가 섞인 묶음으로 문항을 만든다 — 오늘의 퀴즈·오답 노트처럼 여러 주제가 한 판에 오는 자리.
 *
 * 항목마다 제 주제로 내야 한다. 수도 항목을 신화 주제로 내면 발문도 보기도 어긋난다.
 * 어느 주제인지 찾는 일은 데이터를 아는 쪽(화면)이 맡고, 여기서는 넘겨받은 것만 쓴다.
 *
 * @param entries 출제할 항목 (이 순서대로 문항이 나온다)
 * @param resolve 항목 → 그 항목의 주제와 보기 풀. 못 찾으면 그 항목은 건너뛴다
 */
export const buildMixedQuestions = (
	entries: WorldType.Entry[],
	resolve: (entry: WorldType.Entry) => { topic: WorldType.Topic; pool: WorldType.Entry[] } | undefined,
	random: () => number = Math.random,
): WorldType.Question[] => {
	const questions: WorldType.Question[] = [];
	entries.forEach((entry, at) => {
		const found = resolve(entry);
		if (!found) {
			return;
		}
		const modes = found.topic.modes;
		for (let step = 0; step < modes.length; step++) {
			const question = buildQuestion(entry, found.topic, modes[(at + step) % modes.length], found.pool, random);
			if (question) {
				questions.push(question);
				return;
			}
		}
	});
	return questions;
};
