/**
 * 광고 가드 판정 검증.
 * 이 계산이 틀리면 두 방향으로 사고가 난다 —
 * 못 막아서 무효 트래픽이 쌓이거나(AdMob 계정 정지), 과하게 막아서 수익이 0이 된다.
 *
 * 실행: yarn test (jest)
 */
import assert from 'node:assert/strict';


import {
	TOTAL_BLOCK_HOURS,
	TOTAL_CLICK_LIMIT,
	applyClick,
	emptyState,
	isAllBlocked,
	isBlocked,
	rollover,
} from '../AdGuardRules';

const DAY = '2026-09-01';
const T0 = 1_760_000_000_000;
const HOUR = 3600 * 1000;

test('형식을 섞어 눌러도 통합 5회에서 모든 광고가 내려간다', () => {
	const state = emptyState(DAY);
	// 배너 3 + 전면 1 = 4회. 형식별 한도(배너 5 · 전면 5)는 어느 쪽도 안 넘겼다
	applyClick(state, 'banner', T0);
	applyClick(state, 'banner', T0);
	applyClick(state, 'banner', T0);
	applyClick(state, 'interstitial', T0);

	assert.equal(isAllBlocked(state, T0), false, '4회까지는 통과');
	assert.equal(isBlocked(state, 'banner', T0), false);
	assert.equal(isBlocked(state, 'rewarded', T0), false);

	// 5회째 — 형식별 한도는 여전히 안 넘겼지만 통합 한도가 걸린다
	applyClick(state, 'interstitial', T0);
	assert.equal(state.totalClickCount, TOTAL_CLICK_LIMIT);
	assert.equal(isAllBlocked(state, T0), true);
	// 한 번도 안 눌린 리워드까지 함께 내려간다 — "통합" 가드의 핵심
	assert.equal(isBlocked(state, 'rewarded', T0), true);
});

test('한 형식만 한도를 넘기면 그 형식이 먼저 내려간다', () => {
	const state = emptyState(DAY);
	for (let i = 0; i < 5; i++) {
		applyClick(state, 'banner', T0);
	}
	assert.equal(isBlocked(state, 'banner', T0), true);
	assert.ok(state.formats.banner.blockedUntil != null);
});

test('통합 차단은 24시간을 채워야 풀린다', () => {
	const state = emptyState(DAY);
	for (let i = 0; i < TOTAL_CLICK_LIMIT; i++) {
		applyClick(state, 'banner', T0);
	}
	const until = T0 + TOTAL_BLOCK_HOURS * HOUR;
	assert.equal(isAllBlocked(state, until - 1), true, '만료 직전에는 아직 차단');
	assert.equal(isAllBlocked(state, until), false, '만료 시각에 풀린다');
});

test('날짜가 바뀌어도 차단 기간이 남아 있으면 풀리지 않는다', () => {
	// 23시에 한도를 채웠다 — 한 시간 뒤 자정에 카운트만 리셋되고 차단은 그대로여야 한다
	const state = emptyState(DAY);
	for (let i = 0; i < TOTAL_CLICK_LIMIT; i++) {
		applyClick(state, 'banner', T0);
	}
	const nextDay = T0 + HOUR;
	rollover(state, '2026-09-02', nextDay);

	assert.equal(state.totalClickCount, 0, '카운트는 날짜 기준으로 리셋된다');
	assert.equal(isAllBlocked(state, nextDay), true, '차단은 24시간을 다 채워야 풀린다');
	assert.equal(isBlocked(state, 'banner', nextDay), true);
});

test('차단 기간이 지난 뒤 날짜가 바뀌면 완전히 원상복구된다', () => {
	const state = emptyState(DAY);
	for (let i = 0; i < TOTAL_CLICK_LIMIT; i++) {
		applyClick(state, 'banner', T0);
	}
	const later = T0 + (TOTAL_BLOCK_HOURS + 1) * HOUR;
	rollover(state, '2026-09-02', later);

	assert.equal(state.totalBlockedUntil, null);
	assert.equal(state.formats.banner.blockedUntil, null);
	assert.equal(isBlocked(state, 'banner', later), false);
});

test('전면 광고는 하루 노출 상한도 함께 본다', () => {
	const state = emptyState(DAY);
	state.formats.interstitial.showCount = 5; // POLICY.interstitial.showLimit
	assert.equal(isBlocked(state, 'interstitial', T0), true, '노출 상한을 채우면 더 띄우지 않는다');
	// 배너는 상한이 없어 그대로 나간다
	assert.equal(isBlocked(state, 'banner', T0), false);
});
