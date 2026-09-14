import { resolveTopic, selectItemsByLevel, DOMAIN_ITEMS } from '@/src/const/data/world/ConstWorldDomain';
import { buildMixedQuestions, shuffle } from './WorldQuizFactory';
import type { WorldType } from '@/src/types/data/WorldType';

/**
 * 챌린지용 문항 뽑기 — 타워·타임 챌린지가 함께 쓴다.
 *
 * 주제를 고르지 않고 전체에서 섞어 낸다. 챌린지는 "아는 만큼 버티는" 판이라
 * 한 주제만 나오면 그 주제를 아는 사람에게만 쉬워진다.
 *
 * 넉넉히 뽑아서 만들고 앞에서 잘라 쓴다 — 값이 모자라 문항이 안 되는 항목이 섞여 있어
 * 딱 맞게 뽑으면 개수가 모자란다 (위성에는 '태양에서 몇 번째' 가 없다).
 *
 * @param level 난이도 1~4. 주지 않으면 전체에서 뽑는다 (타임 챌린지)
 * @param count 필요한 문항 수
 */
export const challengeQuestions = (
	level: number | undefined,
	count: number,
	random: () => number = Math.random,
): WorldType.Question[] => {
	const pool = level ? selectItemsByLevel(level) : DOMAIN_ITEMS;
	const source = shuffle(pool, random).slice(0, count * 3);
	return buildMixedQuestions(source, resolveTopic, random).slice(0, count);
};

/** 타워 층 → 그 층의 난이도. 세 층마다 한 단계씩 올라가고 특급에서 멈춘다 */
export const towerLevelOf = (floor: number): number => Math.min(4, Math.ceil(floor / 3));

/** 층 난이도 이름 — 층 배지와 안내에 함께 쓴다 */
export const TOWER_LEVEL_LABEL: Record<number, string> = { 1: '초급', 2: '중급', 3: '고급', 4: '특급' };
