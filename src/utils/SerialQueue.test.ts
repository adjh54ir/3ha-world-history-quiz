import assert from 'node:assert/strict';
import test from 'node:test';
import { createSerialQueue } from './SerialQueue.ts';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 알림 예약을 흉내낸다 — cancel(비우기) 과 create(쓰기) 사이에 다른 작업이 끼어들 수 있는 구조 */
const makeScheduler = () => {
	const state = { scheduled: null as number | null };
	const schedule = async (time: number, cancelDelay: number, createDelay: number) => {
		await wait(cancelDelay);
		state.scheduled = null; // cancel
		await wait(createDelay);
		state.scheduled = time; // create
	};
	return { state, schedule };
};

test('줄을 세우지 않으면 나중 요청이 먼저 끝나 옛 시각이 남는다 (재현)', async () => {
	const { state, schedule } = makeScheduler();

	// A(8시)는 cancel 이 느리고 create 가 느리다 / B(9시)는 전부 빠르다
	await Promise.all([schedule(8, 0, 40), schedule(9, 5, 5)]);

	// 마지막으로 요청한 것은 9시인데 8시가 남는다 — 실제 버그와 같은 모양
	assert.equal(state.scheduled, 8);
});

test('줄을 세우면 마지막 요청 시각이 최종 상태로 남는다', async () => {
	const { state, schedule } = makeScheduler();
	const serialize = createSerialQueue();

	await Promise.all([
		serialize(() => schedule(8, 0, 40)),
		serialize(() => schedule(9, 5, 5)),
	]);

	assert.equal(state.scheduled, 9);
});

test('시간 피커를 굴리듯 연달아 요청해도 마지막 값만 남는다', async () => {
	const { state, schedule } = makeScheduler();
	const serialize = createSerialQueue();

	// 스피너가 8 → 9 → 10 → 11 로 지나가는 상황. 뒤로 갈수록 빨리 끝나게 만든다
	await Promise.all([8, 9, 10, 11].map((hour, index) => serialize(() => schedule(hour, 0, 20 - index * 5))));

	assert.equal(state.scheduled, 11);
});

test('앞 작업이 실패해도 뒤 작업은 실행된다', async () => {
	const serialize = createSerialQueue();
	const done: string[] = [];

	const failed = serialize(async () => {
		throw new Error('boom');
	});

	const after = serialize(async () => {
		done.push('after');
	});

	await assert.rejects(() => failed, /boom/);
	await after;
	assert.deepEqual(done, ['after']);
});
