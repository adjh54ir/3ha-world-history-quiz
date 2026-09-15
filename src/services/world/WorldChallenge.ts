import { resolveTopic, selectItemsByCategory, DOMAIN_ITEMS } from '@/src/const/data/world/ConstWorldDomain';
import { buildMixedQuestions, shuffle } from './WorldQuizFactory';
import type { WorldType } from '@/src/types/data/WorldType';

/**
 * 챌린지용 문항 뽑기 — 타워·타임 챌린지가 함께 쓴다.
 *
 * 기본은 전체에서 섞어 내는 것이다. 챌린지는 "아는 만큼 버티는" 판이라
 * 한 주제만 나오면 그 주제를 아는 사람에게만 쉬워지기 때문이다.
 * 다만 고른 주제로 좁힐 수도 있게 열어 뒀다 — 좁혀 놓고 자기 기록을 겨루는 쪽을 더 좋아하는 사람이 있다.
 *
 * 넉넉히 뽑아서 만들고 앞에서 잘라 쓴다 — 값이 모자라 문항이 안 되는 항목이 섞여 있어
 * 딱 맞게 뽑으면 개수가 모자란다 (위성에는 '태양에서 몇 번째' 가 없다).
 *
 * @param level 난이도 1~4. 주지 않으면 전체에서 뽑는다 (타임 챌린지)
 * @param count 필요한 문항 수
 * @param topic 주제를 좁힐 때만 준다. 좁힌 주제에 그 난이도 항목이 없으면 주제 전체로 물러선다
 */
export const challengeQuestions = (
	level: number | undefined,
	count: number,
	random: () => number = Math.random,
	topic?: WorldType.TopicKey,
): WorldType.Question[] => {
	const base = topic ? selectItemsByCategory(topic) : DOMAIN_ITEMS;
	const byLevel = level ? base.filter((item) => item.level === level) : base;
	// 층이 올라가면 그 난이도 항목이 한 주제 안에서 동나기도 한다 — 그때는 주제만 지키고 난이도를 푼다
	const pool = byLevel.length >= count ? byLevel : base;
	const source = shuffle(pool, random).slice(0, count * 3);
	return buildMixedQuestions(source, resolveTopic, random).slice(0, count);
};

/** 타워 층 → 그 층의 난이도. 세 층마다 한 단계씩 올라가고 특급에서 멈춘다 */
export const towerLevelOf = (floor: number): number => Math.min(4, Math.ceil(floor / 3));

/** 층 난이도 이름 — 층 배지와 안내에 함께 쓴다 */
export const TOWER_LEVEL_LABEL: Record<number, string> = { 1: '초급', 2: '중급', 3: '고급', 4: '특급' };
