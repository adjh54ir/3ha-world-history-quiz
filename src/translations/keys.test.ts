/**
 * 다국어 키 대조.
 * -------------------------------------------------
 * 화면 하나를 고칠 때 문구는 세 파일에 같이 넣어야 한다. 하나를 빠뜨리면 그 언어 사용자 화면에는
 * 번역문 대신 `setting.language.title` 같은 키 문자열이 그대로 뜬다 —
 * 개발자는 한국어로만 보고 넘어가므로 스토어에 올라간 뒤에야 알게 된다.
 * 자리표시자(`{{n}}`)까지 대조한다. 이름이 어긋나면 그 자리에 값이 아니라 빈칸이 들어간다.
 *
 * 실행: yarn test
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIR = import.meta.dirname;
const FILES = readdirSync(DIR)
	.filter((name) => name.endsWith('.json'))
	.sort();

/** 중첩된 객체를 `a.b.c` 한 줄짜리 키로 편다 */
const flatten = (value: unknown, prefix = ''): Map<string, string> => {
	const out = new Map<string, string>();
	if (typeof value === 'string') {
		out.set(prefix, value);
		return out;
	}
	if (value && typeof value === 'object') {
		for (const [key, child] of Object.entries(value)) {
			for (const [k, v] of flatten(child, prefix ? `${prefix}.${key}` : key)) out.set(k, v);
		}
	}
	return out;
};

/** 문구 안의 자리표시자 이름들 — `{{n}}` → db */
const slots = (text: string): string[] =>
	[...text.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort();

const loaded = FILES.map((name) => ({ name, keys: flatten(JSON.parse(readFileSync(join(DIR, name), 'utf8'))) }));

test('번역 파일이 세 개 다 있다 (하나가 빠지면 아래 대조가 통과해 버린다)', () => {
	assert.equal(loaded.length, 3, `찾은 파일: ${FILES.join(', ')}`);
});

test('모든 언어가 같은 키를 갖는다', () => {
	const all = new Set(loaded.flatMap((file) => [...file.keys.keys()]));
	for (const file of loaded) {
		const missing = [...all].filter((key) => !file.keys.has(key)).sort();
		assert.deepEqual(missing, [], `${file.name} 에 없는 키: ${missing.join(', ')}`);
	}
});

/**
 * 복수형 갈래(`_one` · `_other` …)는 한 키의 형제다.
 * 영어 "Delete 1 recording" 처럼 한쪽 갈래만 숫자를 글로 적는 일이 있어, 갈래끼리 따로 대조하면
 * 정상인 문구가 걸린다. 갈래를 한 묶음으로 보고 그 묶음이 쓰는 이름 전체와 견준다.
 */
const family = (key: string): string => key.replace(/_(zero|one|two|few|many|other)$/, '');

test('없는 자리표시자를 쓰지 않는다', () => {
	// 기준은 언제나 한국어다 — 문구를 먼저 쓰는 언어이고, 자리표시자 이름도 거기서 정해진다
	const base = loaded.find((file) => file.name === 'ko-KR.json')!;
	const rest = loaded.filter((file) => file !== base);
	// 묶음별로 "코드가 넘겨 주는 이름" 을 모은다
	const allowed = new Map<string, Set<string>>();
	for (const [key, text] of base.keys) {
		const set = allowed.get(family(key)) ?? new Set<string>();
		slots(text).forEach((name) => set.add(name));
		allowed.set(family(key), set);
	}

	for (const file of rest) {
		for (const [key, text] of file.keys) {
			const known = allowed.get(family(key));
			if (!known) continue; // 기준 파일에 없는 키는 앞 테스트가 잡는다
			const unknown = slots(text).filter((name) => !known.has(name));
			assert.deepEqual(unknown, [], `${file.name} 의 ${key} 가 코드에서 넘기지 않는 이름을 쓴다: ${unknown.join(', ')}`);
		}
	}
});

/**
 * 코드가 부르는 키가 실제로 있는지.
 * -------------------------------------------------
 * 예전에는 ko-KR.json 을 타입으로 읽어 오타를 컴파일에서 잡았는데, 키가 300개를 넘자
 * TypeScript 가 `Type instantiation is excessively deep` 로 멈췄다(i18next.d.ts 참고).
 * 그 그물을 여기로 옮긴다 — 화면에 쓴 `t('a.b.c')` 를 전부 긁어 한국어 파일과 대조한다.
 *
 * 템플릿 키(`t(`badge.${id}.label`)`)는 값이 실행 때 정해져 여기서 볼 수 없다. 그런 키는
 * 뿌리(`badge.`)만 확인해 오타난 뿌리를 걸러낸다.
 */
/** 프로젝트 뿌리 — src/translations 에서 두 칸 위 */
const ROOT = resolve(DIR, '..', '..');

const walk = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
		return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [full] : [];
	});

const base = loaded.find((file) => file.name === 'ko-KR.json')!;
/** 'main.' 을 뗀 키 — 코드에서는 네임스페이스 없이 부른다 */
const known = new Set([...base.keys.keys()].map((key) => key.replace(/^main\./, '')));
const roots = new Set([...known].map((key) => key.split('.')[0]));

test('코드에서 부르는 번역 키가 한국어 파일에 다 있다', () => {
	const missing: string[] = [];
	for (const file of [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'app'))].filter((f) => !f.includes('/translations/'))) {
		const code = readFileSync(file, 'utf8');
		for (const m of code.matchAll(/\bt\(\s*'([a-zA-Z][\w.]*)'/g)) {
			if (!known.has(m[1])) missing.push(`${file.replace(ROOT, '')} → ${m[1]}`);
		}
		// 템플릿 키는 뿌리만 본다
		for (const m of code.matchAll(/\bt\(\s*`([a-zA-Z][\w.]*)\$\{/g)) {
			const root = m[1].split('.')[0];
			if (!roots.has(root)) missing.push(`${file.replace(ROOT, '')} → ${m[1]}\${...} (뿌리 '${root}' 없음)`);
		}
	}
	assert.deepEqual(missing, [], `번역 파일에 없는 키:\n${missing.join('\n')}`);
});
