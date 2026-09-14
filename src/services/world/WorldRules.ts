/**
 * 세계 상식 출제 규칙 — 값만 다루는 순수 함수 (화면·저장소를 모른다).
 * `node --test` 로 그대로 검증하므로 런타임 import 는 상대 경로만 쓴다.
 *
 * 한자 쪽(LifeRules)에 거의 같은 함수가 있지만 가져다 쓰지 않는다.
 * 그쪽은 한자 보상표·날짜 유틸을 함께 들고 오는 데다, 결국 걷어낼 도메인이라
 * 여기서 필요한 스무 줄만 따로 둔다.
 */
import type { WorldType } from '../../types/data/WorldType';
import { shuffle } from './WorldQuizFactory.ts';

/**
 * 지금 열어 줄 난이도.
 *
 * 주제마다 항목 수가 20개(태양계)에서 242개(수도)까지 벌어져 "몇 개 봤나" 하는 절대 수로는 기준을 못 잡는다.
 * 그 주제를 얼마나 봤는지 비율로 연다.
 *
 * @param seen 이 주제에서 이미 본 항목 수
 * @param poolSize 이 주제의 전체 항목 수
 */
export const openLevel = (seen: number, poolSize: number): WorldType.Level => {
	const ratio = poolSize > 0 ? seen / poolSize : 1;
	if (ratio < 0.15) {
		return 1;
	}
	if (ratio < 0.35) {
		return 2;
	}
	if (ratio < 0.6) {
		return 3;
	}
	return 4;
};

/**
 * 열린 난이도부터 위로 훑어 뽑고, 모자라면 남은 것으로 채운다.
 *
 * 수도 242개 가운데 131개가 4등급(앵귈라·토켈라우 같은 작은 속령)이다.
 * 그냥 섞으면 처음 켠 사람이 첫 판부터 이름도 못 들어 본 섬만 만난다.
 *
 * @param entries 이 주제의 전체 항목
 * @param seen    이미 본 항목 수 — 많을수록 어려운 것이 나온다
 * @param count   뽑을 개수
 */
export const pickEntries = (
	entries: WorldType.Entry[],
	seen: number,
	count: number,
	random: () => number = Math.random,
): WorldType.Entry[] => {
	const open = openLevel(seen, entries.length);
	const picked: WorldType.Entry[] = [];
	const used = new Set<string>();
	const take = (candidates: WorldType.Entry[]) => {
		for (const entry of candidates) {
			if (picked.length >= count) {
				return;
			}
			if (!used.has(entry.id)) {
				used.add(entry.id);
				picked.push(entry);
			}
		}
	};
	// 열린 등급부터 위로 — 초보는 쉬운 것부터, 많이 본 사람은 어려운 것부터 만난다
	for (let level = open; level <= 4; level++) {
		take(shuffle(entries.filter((entry) => entry.level === level), random));
	}
	// 그래도 모자라면 남은 것(열린 등급보다 쉬운 것)으로 채운다 — 항목이 적은 주제가 있다
	take(shuffle(entries, random));
	return picked;
};
