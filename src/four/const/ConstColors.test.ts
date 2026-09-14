import assert from 'node:assert/strict';
import test from 'node:test';
import { withAlpha } from './ConstColors.ts';

/**
 * withAlpha 는 이제 데이터에서 온 색(분야·난이도 배지)에도 쓰인다.
 * hex 가 아닌 값이 들어오면 예전에는 'rgba(NaN, NaN, NaN, 0.2)' 를 뱉었고,
 * 안드로이드는 그 값을 색으로 받으면 죽는다 — 가드가 살아 있는지 여기서 지킨다.
 */
test('hex 는 rgba 로 바뀐다', () => {
	assert.equal(withAlpha('#F59E0B', 0.2), 'rgba(245, 158, 11, 0.2)');
	// 세 자리 축약형도 여섯 자리로 펴서 읽는다
	assert.equal(withAlpha('#FFF', 1), 'rgba(255, 255, 255, 1)');
	assert.equal(withAlpha('#000000', 0.5), 'rgba(0, 0, 0, 0.5)');
});

test('hex 가 아니면 원래 값을 그대로 돌려준다', () => {
	assert.equal(withAlpha('rgba(15,23,42,0.55)', 0.2), 'rgba(15,23,42,0.55)');
	assert.equal(withAlpha('transparent', 0.2), 'transparent');
	assert.equal(withAlpha('', 0.2), '');
});
