import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 번들 한자 서체가 앱에 나오는 글자를 모두 담고 있는지 본다.
 * - 한 글자라도 빠지면 그 글자만 다른 서체로 튀거나 두부(□)로 나온다. 빌드로는 잡히지 않는 조용한 실패다.
 * - 단어 데이터가 늘어나면 이 테스트가 먼저 깨진다 → 서체를 다시 서브셋하라는 신호.
 */
const here = dirname(fileURLToPath(import.meta.url));
const fontPath = resolve(here, '../assets/fonts/HanpickHanjaSerif.otf');
const wordsPath = resolve(here, '../const/data/life/ConstLifeWords.ts');

/** 최소 cmap 파서 (format 4 / 12) — 폰트가 담고 있는 유니코드 집합만 뽑는다 */
const readCmap = (file: string): Set<number> => {
	const b = readFileSync(file);
	const numTables = b.readUInt16BE(4);
	let cmapOff: number | null = null;
	for (let i = 0; i < numTables; i++) {
		const p = 12 + i * 16;
		if (b.toString('latin1', p, p + 4) === 'cmap') {
			cmapOff = b.readUInt32BE(p + 8);
		}
	}
	assert.ok(cmapOff !== null, 'cmap 테이블이 없다');

	// 유니코드 서브테이블 우선 — format 12 > 4
	let best: { sub: number; fmt: number } | null = null;
	const n = b.readUInt16BE(cmapOff + 2);
	for (let i = 0; i < n; i++) {
		const p = cmapOff + 4 + i * 8;
		const pid = b.readUInt16BE(p);
		const sub = cmapOff + b.readUInt32BE(p + 4);
		const fmt = b.readUInt16BE(sub);
		if (pid !== 3 && pid !== 0) {
			continue;
		}
		if (!best || fmt > best.fmt) {
			best = { sub, fmt };
		}
	}
	assert.ok(best, '유니코드 cmap 서브테이블이 없다');

	const set = new Set<number>();
	if (best.fmt === 4) {
		const segX2 = b.readUInt16BE(best.sub + 6);
		const endP = best.sub + 14;
		const startP = endP + segX2 + 2;
		const deltaP = startP + segX2;
		const rangeP = deltaP + segX2;
		for (let i = 0; i < segX2 / 2; i++) {
			const end = b.readUInt16BE(endP + i * 2);
			const start = b.readUInt16BE(startP + i * 2);
			const delta = b.readInt16BE(deltaP + i * 2);
			const ro = b.readUInt16BE(rangeP + i * 2);
			if (start === 0xffff) {
				continue;
			}
			for (let c = start; c <= end; c++) {
				let g: number;
				if (ro === 0) {
					g = (c + delta) & 0xffff;
				} else {
					const gi = rangeP + i * 2 + ro + (c - start) * 2;
					if (gi + 1 >= b.length) {
						continue;
					}
					g = b.readUInt16BE(gi);
					if (g) {
						g = (g + delta) & 0xffff;
					}
				}
				if (g) {
					set.add(c);
				}
			}
		}
	} else if (best.fmt === 12) {
		const groups = b.readUInt32BE(best.sub + 12);
		for (let i = 0; i < groups; i++) {
			const p = best.sub + 16 + i * 12;
			const s = b.readUInt32BE(p);
			const e = b.readUInt32BE(p + 4);
			for (let c = s; c <= e; c++) {
				set.add(c);
			}
		}
	} else {
		assert.fail(`지원하지 않는 cmap format ${best.fmt}`);
	}
	return set;
};

const isCJK = (code: number) =>
	(code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf) || (code >= 0xf900 && code <= 0xfaff);

/** 화면에 한자 서체로 그려지는 글자만 모은다 — 단어 표기와 글자 분해에 나오는 한자 */
const collectRenderedChars = (): Set<number> => {
	const set = new Set<number>();
	const source = readFileSync(wordsPath, 'utf8');
	for (const m of source.matchAll(/w\('[^']*',\s*'([^']*)'/g)) {
		for (const ch of m[1]) {
			const code = ch.codePointAt(0)!;
			if (isCJK(code)) {
				set.add(code);
			}
		}
	}
	return set;
};

test('한자 서체 파일이 번들에 있다', () => {
	assert.ok(existsSync(fontPath), `서체 파일이 없다: ${fontPath}`);
});

test('앱에 나오는 한자·훈음을 서체가 모두 담고 있다', () => {
	const have = readCmap(fontPath);
	const need = collectRenderedChars();
	assert.ok(need.size > 100, `데이터에서 글자를 제대로 못 읽었다 (${need.size}자)`);
	const missing = [...need].filter((code) => !have.has(code));
	assert.deepEqual(
		missing.map((code) => String.fromCodePoint(code)),
		[],
		'서체에 없는 글자가 있다 — 서브셋을 다시 만들어야 한다',
	);
});
