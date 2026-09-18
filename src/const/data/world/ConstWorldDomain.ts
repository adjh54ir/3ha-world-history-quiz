import type { LifeType } from '@/src/types/data/LifeType';
import type { WorldType } from '@/src/types/data/WorldType';
import { ALL_WORLD_ENTRIES, WORLD_ENTRIES } from './ConstWorldEntries';
import { selectTopic, WORLD_TOPICS } from './ConstWorldTopics';

/**
 * 상태 층이 보는 학습 도메인 — 지금은 세계 상식이다.
 * -------------------------------------------------
 * 진도·오답 노트·출석·펫·뱃지를 맡은 redux(LifeSlice)와 훅(useLife)은
 * "항목 id · 갈래 · 난이도" 세 가지만 알면 된다. 무엇을 배우는지는 몰라도 된다.
 *
 * 예전에는 그 자리에 한자 단어(ConstLifeWords)가 직접 꽂혀 있었다.
 * 도메인을 바꿀 때 상태 층을 헤집지 않도록 이 파일 하나만 갈아 끼우게 모아 둔다.
 *
 * 갈래(Category)는 주제(Topic) 그대로다 — 주제 하나가 곧 학습 갈래 하나다 (주제를 늘리면 갈래도 함께 는다).
 */
export const DOMAIN_CATEGORIES: LifeType.Category[] = WORLD_TOPICS.map((topic) => ({
	key: topic.key,
	icon: topic.icon,
	color: topic.color,
	tint: topic.tint,
}));

/** 전체 학습 항목 — 주제 순서대로 이어 붙인 것 */
export const DOMAIN_ITEMS: WorldType.Entry[] = ALL_WORLD_ENTRIES;

/** 한 갈래의 항목 — 없는 갈래면 빈 목록 (저장된 옛 기록에 사라진 갈래가 남아 있을 수 있다) */
export const selectItemsByCategory = (key: string): WorldType.Entry[] => WORLD_ENTRIES[key as WorldType.TopicKey] ?? [];

/** 한 난이도의 항목 — 뱃지의 '난이도 마스터' 가 이걸 센다 */
export const selectItemsByLevel = (level: number): WorldType.Entry[] => DOMAIN_ITEMS.filter((item) => item.level === level);

/** 항목 id 가 지금 도메인에 실제로 있는지 — 도메인을 갈아 끼운 뒤 남은 옛 id 를 거른다 */
export const isDomainItem = (id: string): boolean => DOMAIN_IDS.has(id);

const DOMAIN_IDS = new Set(DOMAIN_ITEMS.map((item) => item.id));

/**
 * 항목이 어느 주제 것인지 — 항목 id 앞머리가 주제 열쇠다 (capital-kor → capital).
 * 오늘의 퀴즈·오답 노트·챌린지처럼 주제가 섞인 자리에서 문항을 만들 때 쓴다.
 */
export const resolveTopic = (entry: WorldType.Entry): { topic: WorldType.Topic; pool: WorldType.Entry[] } | undefined => {
	const key = entry.id.split('-')[0] as WorldType.TopicKey;
	const pool = WORLD_ENTRIES[key];
	return pool ? { topic: selectTopic(key), pool } : undefined;
};
