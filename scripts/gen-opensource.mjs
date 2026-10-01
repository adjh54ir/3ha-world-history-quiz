/**
 * 오픈소스 라이브러리 목록 생성기
 * package.json 의 dependencies 를 읽어 node_modules 의 실제 version / license /
 * repository 를 뽑아 src/const/ConstOpenSource.ts 로 저장한다.
 * 실행: yarn oss
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/const/ConstOpenSource.ts');

/** repository 필드를 https 주소로 정규화 */
const toUrl = (repo) => {
	const raw = typeof repo === 'string' ? repo : repo?.url;
	if (!raw) return '';
	return raw
		.replace(/^git\+/, '')
		.replace(/\.git$/, '')
		.replace(/^git:\/\//, 'https://')
		.replace(/^ssh:\/\/git@/, 'https://')
		.replace(/^github:/, 'https://github.com/')
		.replace(/^git@github\.com:/, 'https://github.com/')
		// 'owner/repo' 단축 표기는 GitHub 주소로 펼친다
		.replace(/^([\w.-]+\/[\w.-]+)$/, 'https://github.com/$1');
};

/** license 필드가 없으면 LICENSE 파일 본문에서 추정 */
const licenseFromFile = (dir) => {
	const file = readdirSync(dir).find((f) => /^licen[cs]e/i.test(f));
	if (!file) return 'Unknown';
	const text = readFileSync(join(dir, file), 'utf8').slice(0, 600);
	if (/MIT License|Permission is hereby granted, free of charge/i.test(text)) return 'MIT';
	if (/Apache License/i.test(text)) return 'Apache-2.0';
	if (/ISC License/i.test(text)) return 'ISC';
	if (/BSD/i.test(text)) return 'BSD';
	return 'Unknown';
};

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const libs = Object.keys(pkg.dependencies ?? {})
	.map((name) => {
		const manifestPath = join(ROOT, 'node_modules', name, 'package.json');
		if (!existsSync(manifestPath)) return null;
		const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
		const declared = typeof m.license === 'string' ? m.license : m.license?.type || m.licenses?.[0]?.type;
		const license = declared || licenseFromFile(join(ROOT, 'node_modules', name));
		return { name, version: m.version ?? '', license, url: toUrl(m.repository) || m.homepage || '' };
	})
	.filter(Boolean)
	.sort((a, b) => a.name.localeCompare(b.name));

const body = libs
	.map((l) => `\t{ name: '${l.name}', version: '${l.version}', license: '${l.license}', url: '${l.url}' },`)
	.join('\n');

writeFileSync(
	OUT,
	`/**
 * 오픈소스 라이브러리 목록 — scripts/gen-opensource.mjs 로 자동 생성됩니다.
 * 직접 수정하지 말고 \`yarn oss\` 를 실행하세요.
 */
export interface OpenSourceLib {
	name: string;
	version: string;
	license: string;
	url: string;
}

export const OPEN_SOURCE_LIBS: OpenSourceLib[] = [
${body}
];

export default OPEN_SOURCE_LIBS;
`,
);
console.log(`ConstOpenSource.ts 생성 — ${libs.length}개`);
