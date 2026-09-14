/**
 * 출제 규칙 검증 — `node --test src/services/world/WorldRules.test.ts`
 *
 * 난이도 가중이 무너지면 아무도 눈치채지 못한 채 첫 판부터 어려운 항목이 쏟아진다.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { WorldType } from '../../types/data/WorldType.ts';
import { openLevel, pickEntries } from './WorldRules.ts';

const entry = (id: string, level: WorldType.Level): WorldType.Entry => ({
	id,
	name: id,
	level,
	summary: 's',
	facts: ['a', 'b'],
	fields: {},
});

/** 등급마다 열 개씩 — 실제 데이터처럼 4등급이 가장 많게 둔다 */
const POOL: WorldType.Entry[] = [
	...Array.from({ length: 10 }, (_, at) => entry(`l1-${at}`, 1)),
	...Array.from({ length: 10 }, (_, at) => entry(`l2-${at}`, 2)),
	...Array.from({ length: 10 }, (_, at) => entry(`l3-${at}`, 3)),
	...Array.from({ length: 40 }, (_, at) => entry(`l4-${at}`, 4)),
];

const seeded = (seed: number) => () => {
	seed = (seed * 1103515245 + 12345) % 2147483648;
	return seed / 2147483648;
};

test('본 것이 늘수록 어려운 등급이 열린다', () => {
	assert.equal(openLevel(0, 100), 1);
	assert.equal(openLevel(20, 100), 2);
	assert.equal(openLevel(40, 100), 3);
	assert.equal(openLevel(80, 100), 4);
	// 항목이 없는 주제에서 0 으로 나누지 않는다
	assert.equal(openLevel(0, 0), 4);
});

test('처음 켠 사람에게는 쉬운 항목만 나온다', () => {
	const picked = pickEntries(POOL, 0, 10, seeded(7));
	assert.equal(picked.length, 10);
	assert.ok(picked.every((item) => item.level === 1), `1등급만 나와야 하는데 ${picked.map((i) => i.level).join(',')} 가 나왔다`);
});

test('열린 등급이 모자라면 위 등급으로 채운다', () => {
	// 1등급이 열 개뿐인데 스무 개를 달라고 하면 2등급까지 내려온다
	const picked = pickEntries(POOL, 0, 20, seeded(7));
	assert.equal(picked.length, 20);
	assert.equal(new Set(picked.map((item) => item.id)).size, 20, '같은 항목이 두 번 나왔다');
	assert.ok(picked.filter((item) => item.level === 1).length === 10);
});

test('많이 본 사람에게는 어려운 항목부터 나온다', () => {
	const picked = pickEntries(POOL, 70, 10, seeded(7));
	assert.ok(picked.every((item) => item.level === 4), '4등급이 열렸으면 4등급부터 나와야 한다');
});

test('달라는 것보다 항목이 적으면 있는 만큼만 준다', () => {
	assert.equal(pickEntries(POOL.slice(0, 3), 0, 10, seeded(7)).length, 3);
	assert.equal(pickEntries([], 0, 5, seeded(7)).length, 0);
});
