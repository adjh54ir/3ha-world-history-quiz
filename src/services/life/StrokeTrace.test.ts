import assert from 'node:assert/strict';
import test from 'node:test';
import { isStrokeTraced, traceLength } from './StrokeTrace.ts';
// 타입은 값이 아니라 노드가 런타임에 못 찾는다 — type import 로 따로 받는다
import type { TracePoint } from './StrokeTrace.ts';

/** 가로로 곧게 뻗은 획 하나 (0~1 좌표) */
const HORIZONTAL: TracePoint[] = Array.from({ length: 11 }, (_, at) => ({ x: 0.15 + at * 0.07, y: 0.5 }));

/** 목표선을 따라가되 흔들림을 섞은 손가락 자취 */
const wobble = (target: TracePoint[], amount: number): TracePoint[] =>
	target.map((point, at) => ({ x: point.x, y: point.y + (at % 2 === 0 ? amount : -amount) }));

test('목표 획을 따라 그으면 통과한다', () => {
	assert.equal(isStrokeTraced(HORIZONTAL, HORIZONTAL), true);
	// 손가락은 절대 곧게 가지 않는다 — 이 정도 흔들림은 봐준다
	assert.equal(isStrokeTraced(wobble(HORIZONTAL, 0.05), HORIZONTAL), true);
});

test('거꾸로 그으면 걸린다 — 획의 방향이 곧 필순이다', () => {
	assert.equal(isStrokeTraced([...HORIZONTAL].reverse(), HORIZONTAL), false);
});

test('중간까지만 긋거나 다른 자리를 그으면 걸린다', () => {
	assert.equal(isStrokeTraced(HORIZONTAL.slice(0, 5), HORIZONTAL), false);
	const elsewhere = HORIZONTAL.map((point) => ({ x: point.x, y: 0.05 }));
	assert.equal(isStrokeTraced(elsewhere, HORIZONTAL), false);
});

test('점 찍기 획 — 그 자리를 누르면 통과, 멀리 누르면 실패', () => {
	const dot: TracePoint[] = [
		{ x: 0.5, y: 0.5 },
		{ x: 0.51, y: 0.51 },
	];
	assert.ok(traceLength(dot) < 0.06);
	assert.equal(
		isStrokeTraced(
			[
				{ x: 0.52, y: 0.49 },
				{ x: 0.53, y: 0.5 },
			],
			dot,
		),
		true,
	);
	assert.equal(
		isStrokeTraced(
			[
				{ x: 0.1, y: 0.1 },
				{ x: 0.11, y: 0.11 },
			],
			dot,
		),
		false,
	);
});

test('점 하나만 찍으면(자취가 없으면) 통과하지 않는다', () => {
	assert.equal(isStrokeTraced([{ x: 0.15, y: 0.5 }], HORIZONTAL), false);
	assert.equal(isStrokeTraced(HORIZONTAL, []), false);
});

test('빠르게 그어 점이 드문드문해도 통과한다 — 거리는 선분 기준으로 잰다', () => {
	// 한 프레임에 화면의 35%를 건너뛴 자취 (양 끝과 가운데 한 점뿐)
	const sparse: TracePoint[] = [
		{ x: 0.15, y: 0.5 },
		{ x: 0.5, y: 0.5 },
		{ x: 0.85, y: 0.5 },
	];
	assert.equal(isStrokeTraced(sparse, HORIZONTAL), true);
});

test('선분 기준이어도 목표를 벗어난 자취는 걸린다', () => {
	// 시작·끝은 제자리인데 가운데가 판 위쪽으로 크게 휘어 나간 자취
	const detour: TracePoint[] = [
		{ x: 0.15, y: 0.5 },
		{ x: 0.5, y: 0.05 },
		{ x: 0.85, y: 0.5 },
	];
	assert.equal(isStrokeTraced(detour, HORIZONTAL), false);
});
