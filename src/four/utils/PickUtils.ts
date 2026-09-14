/**
 * 무작위로 고르되 겹치지 않게 뽑는 도우미
 * -------------------------------------------------
 * `Math.random()` 을 뽑을 때마다 독립적으로 돌리면 같은 항목이 연달아 나온다.
 * 목록을 섞은 뒤 앞에서 잘라 쓰면 한 묶음 안에서는 절대 겹치지 않는다.
 */

/** Fisher-Yates — 원본은 건드리지 않는다 */
export const shuffle = <T,>(list: readonly T[]): T[] => {
	const deck = [...list];
	for (let i = deck.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[deck[i], deck[j]] = [deck[j], deck[i]];
	}
	return deck;
};

/**
 * pool 에서 count 개를 겹치지 않게 뽑는다.
 * @param exclude 이번에 빼고 뽑을 항목 (지금 화면에 떠 있는 것 등)
 *
 * 뽑을 개수가 후보보다 많으면 다시 섞어 이어 붙인다 — 한 묶음 안에서만 안 겹치면 된다.
 */
export const pickDistinct = <T,>(pool: readonly T[], count: number, exclude: readonly T[] = []): T[] => {
	if (pool.length === 0 || count <= 0) {
		return [];
	}
	const picked: T[] = [];
	while (picked.length < count) {
		const rest = pool.filter((item) => !exclude.includes(item));
		const deck = shuffle(rest.length > 0 ? rest : pool);
		// 다시 섞어 이어 붙일 때 이음매에서 같은 항목이 연달아 나오지 않게 첫 항목을 뒤로 민다
		const last = picked[picked.length - 1];
		if (deck.length > 1 && deck[0] === last) {
			deck.push(deck.shift() as T);
		}
		picked.push(...deck.slice(0, count - picked.length));
	}
	return picked;
};

/**
 * id 처럼 변하지 않는 값에서 늘 같은 인덱스를 뽑는다.
 * 같은 항목에는 언제 봐도 같은 그림이 붙어야 "그 그림 = 그 한자어" 로 기억에 남는다.
 *
 * 곱셈-XOR 로 비트를 흩어 준다 — `seed % size` 만 쓰면 id 가 이어진 항목끼리 그림이 규칙적으로 반복된다.
 */
export const stableIndex = (seed: number, size: number): number => {
	/* eslint-disable no-bitwise -- 해시를 흩는 자리라 비트 연산이 목적 그 자체다 */
	if (size <= 0) {
		return 0;
	}
	let hash = Math.abs(Math.floor(seed)) + 1;
	hash = (hash ^ (hash >>> 15)) * 0x2545f491;
	hash = (hash ^ (hash >>> 13)) >>> 0;
	/* eslint-enable no-bitwise */
	return hash % size;
};

/**
 * 난이도 순서대로 한 문제씩 뽑는다.
 * 난이도가 뒤섞여 나오면 첫 문제부터 어려운 것이 걸려 시작이 막히므로, 계획한 순서대로 채운다.
 * 해당 난이도에 남은 문제가 없으면 그 자리는 비우고(호출부에서 남은 문제로 채운다) 넘어간다.
 */
export const pickByLevelPlan = <T,>(pool: readonly T[], plan: readonly string[], levelOf: (item: T) => string): T[] => {
	const buckets = new Map<string, T[]>();
	plan.forEach((level) => {
		if (!buckets.has(level)) {
			buckets.set(level, shuffle(pool.filter((item) => levelOf(item) === level)));
		}
	});

	const picked: T[] = [];
	plan.forEach((level) => {
		const next = buckets.get(level)?.shift();
		if (next) {
			picked.push(next);
		}
	});
	return picked;
};
