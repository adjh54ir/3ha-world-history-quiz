import assert from 'node:assert/strict';
import { test } from 'node:test';
import { meaningToSentence } from './KoreanUtils.ts';

test('뜻풀이 끝 받침에 맞춰 을/를을 고른다', () => {
	assert.equal(meaningToSentence('끼니로 음식을 먹는 것'), '끼니로 음식을 먹는 것을 뜻합니다.');
	assert.equal(meaningToSentence('넓고 큰 바다'), '넓고 큰 바다를 뜻합니다.');
});

test('부사로 끝나는 뜻풀이는 조사를 붙이지 않는다', () => {
	// 조사를 붙이면 '빠짐없이를 뜻합니다' 처럼 문장이 깨진다
	const cases: [meaning: string, sentence: string][] = [
		['해마다', '해마다라는 뜻입니다.'],
		['하루하루 빠짐없이', '하루하루 빠짐없이라는 뜻입니다.'],
		['저마다 따로따로', '저마다 따로따로라는 뜻입니다.'],
		['때를 가리지 않고 그때그때', '때를 가리지 않고 그때그때라는 뜻입니다.'],
		['그 자리에서 바로', '그 자리에서 바로라는 뜻입니다.'],
		['앞으로', '앞으로라는 뜻입니다.'],
		['하루 내내', '하루 내내라는 뜻입니다.'],
		['여럿이 한꺼번에', '여럿이 한꺼번에라는 뜻입니다.'],
		['대충 어림잡아', '대충 어림잡아라는 뜻입니다.'],
		['처음부터 끝까지', '처음부터 끝까지라는 뜻입니다.'],
		['서로', '서로라는 뜻입니다.'],
	];
	cases.forEach(([meaning, sentence]) => assert.equal(meaningToSentence(meaning), sentence));
});

test('명사구는 부사 끝말 목록에 걸리지 않는다', () => {
	// '까지' · '바로' 가 낱말 안에 들어 있어도 끝말이 아니면 그대로 조사를 붙인다
	assert.equal(meaningToSentence('앞으로 나아가 이루려는 자세'), '앞으로 나아가 이루려는 자세를 뜻합니다.');
	assert.equal(meaningToSentence('바로잡아 고치는 것'), '바로잡아 고치는 것을 뜻합니다.');
});
