/**
 * 단어 데이터 ↔ 표준국어대사전 대조 — `yarn verify:words`
 * -------------------------------------------------
 * ConstLifeWords 의 한자 표기와 뜻풀이를 국립국어원 표준국어대사전에 조회해 맞대어 본다.
 * 단어를 더하거나 고친 뒤 한 번 돌리면 아래 셋을 잡아낸다.
 *
 *   1. 사전에 없는 말        — 표제어가 아니거나 한자 표기가 틀렸다
 *   2. 독음이 다른 말        — 사전은 다른 소리로 읽는다 (紅茶 = 홍다)
 *   3. 뜻이 멀어 보이는 말   — 사람이 눈으로 확인할 후보만 추린다
 *
 * 3번은 낱말이 겹치는 정도로만 재는 어림수라 "틀렸다"가 아니라 "봐 달라"는 표시다.
 * 사전 첫째 뜻이 고어·전문어여서 일부러 둘째 뜻을 쓴 말이 200개쯤 있는데(經濟·氣候 등)
 * 그런 것들이 여기 걸린다. ConstLifeWords 머리말에 까닭을 적어 두었다.
 *
 * 쓰는 법
 *   yarn verify:words              전체 (5000개 넘으면 20분쯤 걸린다)
 *   yarn verify:words daily food   분류만 골라서
 *   yarn verify:words --miss       사전에 없는 말·독음 다른 말만 (빠르다)
 *
 * 사전 서버에 부담을 주지 않으려고 한 번에 6개씩만 조회한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'src/const/data/life/ConstLifeWords.ts');
const ENDPOINT = 'https://stdict.korean.go.kr/search/searchResult.do';
const CONCURRENCY = 6;
const PAGE_SIZE = 10;
const MAX_PAGE = 5;

/** 같은 글자를 달리 적은 것 — 앞 글자로 맞춘 뒤 견준다 (秘密 ↔ 祕密) */
const VARIANTS =
	'姉姊 畫畵 卽即 强強 敎教 眞真 靑青 淸清 黃黄 蟲虫 恥耻 溫温 絶絕 練鍊 兒児 廚厨 爲為 竝並 內内 冊册 床牀 裏裡 沙砂 跡蹟 朱硃 秘祕 塡填'.split(' ');
const CANON = new Map();
for (const pair of VARIANTS) {
	CANON.set(pair[0], pair[0]);
	CANON.set(pair[1], pair[0]);
}
const canon = (text) => [...text].map((char) => CANON.get(char) ?? char).join('');

/**
 * 사전과 어긋나는 줄 알면서 그대로 두는 말 — 까닭을 적어 둔다.
 * 여기 없는 말이 걸리면 진짜 손봐야 할 것이다.
 */
const ALLOWED = new Map([
	['綠茶', '사전은 綠차로 적지만(茶를 한자로 세지 않는다) 실제로는 綠茶가 통용 표기다'],
	['紅茶', '사전 표제어는 홍다(紅茶). 오늘날 아무도 그렇게 읽지 않아 홍차로 둔다'],
]);

/** 소스에서 단어를 읽는다 — w('id', '漢字', '독음', 급수, '뜻', […], […]) 한 줄이 하나 */
const readWords = () => {
	const lines = fs.readFileSync(SOURCE, 'utf8').split('\n');
	const words = [];
	lines.forEach((line, at) => {
		const matched = line.match(/^\tw\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(\d),\s*'((?:[^'\\]|\\.)*)'/);
		if (matched) {
			words.push({ id: matched[1], word: matched[2], reading: matched[3], level: Number(matched[4]), meaning: matched[5], line: at + 1 });
		}
	});
	return words;
};

const strip = (html) => {
	const cleaned = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
	return cleaned
		.replace(/&nbsp;/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/[ \t]+/g, ' ');
};

/** 표제어 한 페이지 — [{ reading, hanja, desc }] */
const fetchPage = async (keyword, page) => {
	const url = `${ENDPOINT}?searchKeyword=${encodeURIComponent(keyword)}&pageIndex=${page}`;
	for (let retry = 0; retry < 3; retry++) {
		try {
			const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
			const text = strip(await response.text());
			const from = text.indexOf('찾기 결과');
			const body = (from >= 0 ? text.slice(from) : text).split('찾으시는 단어')[0];
			const total = Number(text.match(/찾기 결과 \(총 (\d+) 개\)/)?.[1] ?? 0);
			const rows = [...body.matchAll(/([가-힣][가-힣-]*)\s*\d*\s*\(([^)]+)\)([^\n]*)/g)].map((row) => ({
				reading: row[1].replace(/-/g, ''),
				hanja: row[2].replace(/[^㐀-鿿]/g, ''),
				desc: row[3] ?? '',
			}));
			// 뜻풀이는 표제어 바로 다음 줄에 온다 — 줄 단위로 한 번 더 훑어 붙인다
			const lines = body.split('\n').map((line) => line.trim()).filter(Boolean);
			lines.forEach((line, at) => {
				const head = line.match(/^([가-힣][가-힣-]*)\s*\d*\s*\(([^)]+)\)/);
				if (!head) {
					return;
				}
				const hanja = head[2].replace(/[^㐀-鿿]/g, '');
				const found = rows.find((row) => row.reading === head[1].replace(/-/g, '') && row.hanja === hanja);
				if (found && !found.meaning) {
					found.meaning = (lines[at + 1] ?? '').split('전체 보기')[0].replace(/^「\d」\s*|^『[^』]*』\s*/g, '').trim();
				}
			});
			return { total, rows };
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 500 * (retry + 1)));
		}
	}
	return { total: 0, rows: [], failed: true };
};

/** 낱말 하나의 모든 표제어를 모은다 (여러 쪽에 걸쳐 있으면 이어 붙인다) */
const fetchAll = async (keyword) => {
	const first = await fetchPage(keyword, 1);
	if (first.failed) {
		return { failed: true, rows: [] };
	}
	const rows = [...first.rows];
	const pages = Math.min(Math.ceil(first.total / PAGE_SIZE), MAX_PAGE);
	for (let page = 2; page <= pages; page++) {
		rows.push(...(await fetchPage(keyword, page)).rows);
	}
	return { rows };
};

/**
 * 한자로 먼저 찾는다 — 독음이 다른 말(紅茶 = 홍다)은 이래야 잡힌다.
 * 다만 사전이 이체자로 올려 둔 말(裏面 ↔ 裡面)은 한자 검색이 비므로 독음으로 한 번 더 찾는다.
 */
const lookup = async (word) => {
	const byHanja = await fetchAll(word.word);
	if (byHanja.failed) {
		return { failed: true, rows: [] };
	}
	const byReading = await fetchAll(word.reading);
	if (byReading.failed) {
		return { failed: true, rows: [] };
	}
	return { rows: [...byHanja.rows, ...byReading.rows] };
};

/** 뜻이 얼마나 겹치는지 — 두 글자 조각을 견준다 (0~1) */
const STOP = new Set('또는 따위 이르는 그런 어떤 사람 사물 것을 하는 있는 없는'.split(' '));
const grams = (text) => {
	const cleaned = (text ?? '').replace(/[^가-힣]/g, '');
	const set = new Set();
	for (let at = 0; at < cleaned.length - 1; at++) {
		const gram = cleaned.slice(at, at + 2);
		if (!STOP.has(gram)) {
			set.add(gram);
		}
	}
	return set;
};
const overlap = (a, b) => {
	if (a.size === 0 || b.size === 0) {
		return 0;
	}
	let shared = 0;
	a.forEach((gram) => {
		if (b.has(gram)) {
			shared += 1;
		}
	});
	return shared / Math.min(a.size, b.size);
};

const run = async () => {
	const args = process.argv.slice(2);
	const missOnly = args.includes('--miss');
	const categories = args.filter((arg) => !arg.startsWith('--'));
	const all = readWords();
	const words = categories.length > 0 ? all.filter((word) => categories.includes(word.id.split('-')[0])) : all;
	if (words.length === 0) {
		console.error(`대상이 없다. 분류 이름을 확인해라 (있는 분류: ${[...new Set(all.map((word) => word.id.split('-')[0]))].join(' ')})`);
		process.exit(1);
	}
	console.log(`대조 시작 — ${words.length}개 / 전체 ${all.length}개${missOnly ? ' (표기만)' : ''}`);

	const missing = [];
	const wrongReading = [];
	const farMeaning = [];
	const allowed = [];
	const failed = [];
	let done = 0;

	const worker = async (queue) => {
		for (const word of queue) {
			const { rows, failed: error } = await lookup(word);
			done += 1;
			if (done % 100 === 0) {
				console.log(`  … ${done}/${words.length}`);
			}
			if (error) {
				failed.push(word);
				continue;
			}
			// 上昇上升 처럼 두 표기가 붙어 나오는 표제어가 있다 — 글자 수로 잘라 견준다
			const size = word.word.length;
			const same = (hanja) => {
				if (canon(hanja) === canon(word.word)) {
					return true;
				}
				if (hanja.length <= size || hanja.length % size !== 0) {
					return false;
				}
				for (let at = 0; at < hanja.length; at += size) {
					if (canon(hanja.slice(at, at + size)) === canon(word.word)) {
						return true;
					}
				}
				return false;
			};
			const hit = rows.filter((row) => same(row.hanja));
			const excused = ALLOWED.get(word.word);
			if (hit.length === 0) {
				(excused ? allowed : missing).push({ ...word, seen: rows.slice(0, 4).map((row) => `${row.reading}(${row.hanja})`).join(' '), why: excused });
				continue;
			}
			if (!hit.some((row) => row.reading === word.reading)) {
				const dict = [...new Set(hit.map((row) => row.reading))].join('/');
				(excused ? allowed : wrongReading).push({ ...word, dict, why: excused });
				continue;
			}
			if (missOnly) {
				continue;
			}
			const mine = grams(word.meaning);
			const best = hit
				.filter((row) => row.reading === word.reading)
				.reduce((top, row) => Math.max(top, overlap(mine, grams(row.meaning))), 0);
			if (best < 0.2) {
				farMeaning.push({ ...word, dict: hit.find((row) => row.reading === word.reading)?.meaning ?? '' });
			}
		}
	};

	const queues = Array.from({ length: CONCURRENCY }, (_, at) => words.filter((_, index) => index % CONCURRENCY === at));
	await Promise.all(queues.map(worker));

	const report = (title, rows, format) => {
		console.log(`\n== ${title}: ${rows.length}`);
		rows.sort((a, b) => a.line - b.line).forEach((row) => console.log(`   ${SOURCE.replace(ROOT + '/', '')}:${row.line}  ${format(row)}`));
	};
	report('사전에 없는 말', missing, (row) => `${row.word} ${row.reading} — 사전에는 ${row.seen || '아무것도 없다'}`);
	report('독음이 다른 말', wrongReading, (row) => `${row.word} ${row.reading} — 사전은 '${row.dict}'`);
	if (!missOnly) {
		report('뜻을 확인할 말 (틀렸다는 뜻이 아니다)', farMeaning, (row) => `${row.word} ${row.reading}\n        앱 : ${row.meaning}\n        사전: ${row.dict}`);
	}
	if (allowed.length > 0) {
		report('알고 두는 말 (문제로 세지 않는다)', allowed, (row) => `${row.word} ${row.reading} — ${row.why}`);
	}
	if (failed.length > 0) {
		report('조회 실패 — 다시 돌려라', failed, (row) => `${row.word} ${row.reading}`);
	}

	const blocking = missing.length + wrongReading.length + failed.length;
	console.log(`\n${blocking === 0 ? '표기 문제 없음' : `표기 문제 ${blocking}건`}`);
	process.exit(blocking > 0 ? 1 : 0);
};

run();
