import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

/**
 * 필순 자료 점검
 * -------------------------------------------------
 * 단어 자료에 쓰인 한자가 모두 획 자료에 들어 있는지 본다.
 * 단어를 추가하고 획 자료를 안 채우면 상세 화면에서 그 글자만 애니메이션 없이 나오므로 여기서 잡는다.
 *
 * 자료가 두 벌이다 — 바깥선(hanzi-writer-data, 묶음 24개)과 중심선(KanjiVG, 한 파일).
 * 둘을 합쳐 덮으면 된다. 같은 글자가 두 벌에 다 있으면 로더가 중심선 쪽을 쓴다.
 */

// ESM 으로 도는 테스트라 __dirname 이 없다 — import.meta 로 이 파일 위치를 잡는다
const ROOT = path.join(import.meta.dirname, '../../../..');
const SHARD_DIR = path.join(ROOT, 'src/assets/hanja-strokes');
const LINE_PATH = path.join(ROOT, 'src/assets/hanja-strokes-lines.json');
const SHARD_COUNT = 24;

/** 단어 자료에 쓰인 한자 — `['生', '날', '생']` 꼴에서 첫 글자만 뽑는다 */
const usedChars = (): Set<string> => {
	const source = fs.readFileSync(path.join(ROOT, 'src/const/data/life/ConstLifeWords.ts'), 'utf8');
	const found = new Set<string>();
	for (const match of source.matchAll(/\['(.)',\s*'[^']*',\s*'[^']*'\]/g)) {
		found.add(match[1]);
	}
	return found;
};

const loadShards = (): Record<string, [string[], number[][][]]> => {
	const all: Record<string, [string[], number[][][]]> = {};
	for (let at = 0; at < SHARD_COUNT; at += 1) {
		Object.assign(all, JSON.parse(fs.readFileSync(path.join(SHARD_DIR, `${at}.json`), 'utf8')));
	}
	return all;
};

/** 중심선 자료 — 글자 → 획마다의 점열 */
const loadLines = (): Record<string, number[][][]> => JSON.parse(fs.readFileSync(LINE_PATH, 'utf8'));

test('단어에 쓰인 한자가 모두 획 자료에 있다', () => {
	const strokes = loadShards();
	const lines = loadLines();
	const missing = [...usedChars()].filter((char) => !strokes[char] && !lines[char]);
	assert.deepEqual(missing, [], `획 자료가 없는 글자: ${missing.join('')}`);
});

test('중심선 자료는 글자마다 획이 있고, 획마다 점이 두 개 이상이다', () => {
	const broken = Object.entries(loadLines())
		.filter(([, medians]) => medians.length === 0 || medians.some((median) => median.length < 2))
		.map(([char]) => char);
	assert.deepEqual(broken, [], `중심선 자료가 어긋난 글자: ${broken.join('')}`);
});

test('중심선 자료의 좌표가 109 좌표계 안에 있다', () => {
	// 좌표계를 잘못 잡으면 글자가 화면 밖으로 나간다
	const out: string[] = [];
	for (const [char, medians] of Object.entries(loadLines())) {
		const bad = medians.flat().some(([x, y]) => x < -2 || x > 111 || y < -2 || y > 111);
		if (bad) { out.push(char); }
	}
	assert.deepEqual(out, [], `좌표가 109 좌표계를 벗어난 글자: ${out.join('')}`);
});

test('글자마다 획 바깥선과 중심선 개수가 같다', () => {
	const strokes = loadShards();
	const broken = Object.entries(strokes)
		.filter(([, [outlines, medians]]) => outlines.length === 0 || outlines.length !== medians.length)
		.map(([char]) => char);
	assert.deepEqual(broken, [], `획 자료가 어긋난 글자: ${broken.join('')}`);
});

test('글자는 코드포인트를 24 로 나눈 나머지 묶음에 들어 있다', () => {
	for (let at = 0; at < SHARD_COUNT; at += 1) {
		const shard = JSON.parse(fs.readFileSync(path.join(SHARD_DIR, `${at}.json`), 'utf8')) as Record<string, unknown>;
		const wrong = Object.keys(shard).filter((char) => (char.codePointAt(0) ?? 0) % SHARD_COUNT !== at);
		assert.deepEqual(wrong, [], `${at}.json 에 잘못 들어간 글자: ${wrong.join('')}`);
	}
});
