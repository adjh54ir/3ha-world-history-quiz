/**
 * 생활 한자어 데이터 무결성 검증 — `node --test src/const/data/life/ConstLifeWords.test.ts`
 *
 * 데이터를 손으로 늘려 가는 파일이라, 눈으로는 놓치는 것들만 기계로 잡는다.
 * 뜻풀이가 사전과 맞는지는 여기서 검증할 수 없다 (사람이 봐야 한다).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LIFE_WORDS } from './ConstLifeWords.ts';
import { LIFE_CATEGORIES } from './ConstLifeCategories.ts';
import { CONST_HANJA_DICT } from '../../../four/const/ConstHanjaDict.ts';
import { CONST_HANJA_SHAPE } from '../../../four/const/ConstHanjaShape.ts';
import { CONST_HANJA_UNIHAN } from '../../../four/const/ConstHanjaUnihan.ts';
import { ADVERB_ENDINGS, meaningToSentence } from '../../../utils/KoreanUtils.ts';
import WORD_ORDER_PIN from './word-order.pin.json' with { type: 'json' };

const HANJA = /^[一-鿿]$/;
const HANGUL_BASE = 0xac00;

/** 한글 음절을 초성·중성·종성 인덱스로 쪼갠다 */
const decompose = (syllable: string) => {
	const code = syllable.charCodeAt(0) - HANGUL_BASE;
	return { cho: Math.floor(code / 588), jung: Math.floor((code % 588) / 28), jong: code % 28 };
};

const compose = (cho: number, jung: number, jong: number) => String.fromCharCode(HANGUL_BASE + cho * 588 + jung * 28 + jong);

/**
 * 두음법칙까지 허용한 음의 후보 — 例 '례' 는 단어 첫머리에서 '예' 로 적는다.
 * ㄹ(5) → ㄴ(2)·ㅇ(11), ㄴ(2) → ㅇ(11) 및 그 역방향을 모두 인정한다.
 */
const readingCandidates = (eum: string, at = 0): Set<string> => {
	const candidates = new Set([eum]);
	const { cho, jung, jong } = decompose(eum);
	const swap = (next: number) => candidates.add(compose(next, jung, jong));
	// ㄹ 은 단어 가운데서도 ㄴ·ㅇ 으로 바뀐다 (困難 곤란 · 換率 환율). ㄴ→ㄹ 도 가운데서 일어난다.
	// ㅇ→ㄹ/ㄴ, ㄴ→ㅇ 은 첫머리(두음법칙)에서만 — 가운데서도 허용하면 快樂 을 '노래 악' 으로 적어도 통과한다.
	if (cho === 5) {
		swap(2);
		swap(11);
	}
	if (cho === 2) {
		swap(5);
		if (at === 0) {
			swap(11);
		}
	}
	if (cho === 11 && at === 0) {
		swap(5);
		swap(2);
	}
	return candidates;
};

const duplicates = <T>(items: T[], key: (item: T) => string): string[] => {
	const seen = new Map<string, number>();
	items.forEach((item) => seen.set(key(item), (seen.get(key(item)) ?? 0) + 1));
	return [...seen].filter(([, count]) => count > 1).map(([value]) => value);
};

test('ID·한자어·뜻풀이가 중복되지 않는다', () => {
	assert.deepEqual(duplicates(LIFE_WORDS, (word) => word.id), []);
	assert.deepEqual(duplicates(LIFE_WORDS, (word) => word.word), []);
	assert.deepEqual(duplicates(LIFE_WORDS, (word) => word.meaning), []);
});

test('예문은 단어마다 두 개이고, 전체에서 하나도 겹치지 않는다', () => {
	LIFE_WORDS.forEach((word) => {
		assert.equal(word.examples.length, 2, `${word.id}: 예문이 두 개가 아니다`);
	});
	const examples = LIFE_WORDS.flatMap((word) => word.examples.map((example, at) => ({ example, at, id: word.id })));
	assert.deepEqual(duplicates(examples, (item) => item.example), []);
});

test('뜻풀이는 비어 있지 않고 한글로 끝난다', () => {
	// 상세 화면은 뜻풀이 끝 글자의 받침을 보고 '~을/를 뜻합니다.' 를 붙인다 (meaningToSentence).
	// 한글이 아닌 글자로 끝나면 그 조사 선택이 깨진다.
	LIFE_WORDS.forEach((word) => {
		assert.ok(word.meaning.trim().length > 0, `${word.id}: 뜻풀이가 비었다`);
		assert.match(word.meaning.trim(), /[가-힣]$/, `${word.id}: 뜻풀이가 한글로 끝나지 않는다 — ${word.meaning}`);
	});
});

test('난이도는 1~4 등급이고, 등급마다 단어가 있다', () => {
	const seen = new Set<number>();
	LIFE_WORDS.forEach((word) => {
		assert.ok([1, 2, 3, 4].includes(word.level), `${word.id}: 난이도가 1~4 가 아니다 (${word.level})`);
		seen.add(word.level);
	});
	assert.deepEqual([...seen].sort(), [1, 2, 3, 4]);
});

test('모든 단어가 등록된 카테고리에 속하고, ID 접두사와 category 가 일치한다', () => {
	const keys = new Set(LIFE_CATEGORIES.map((category) => category.key));
	LIFE_WORDS.forEach((word) => {
		assert.ok(keys.has(word.category), `${word.id}: 등록되지 않은 카테고리 ${word.category}`);
		assert.equal(word.id.split('-')[0], word.category, `${word.id}: ID 접두사와 category 불일치`);
	});
});

test('한자·독음·chars 의 글자 수와 순서가 서로 맞는다', () => {
	LIFE_WORDS.forEach((word) => {
		const letters = [...word.word];
		assert.ok(letters.every((letter) => HANJA.test(letter)), `${word.id}: 한자가 아닌 글자가 섞였다 (${word.word})`);
		assert.equal(word.chars.map((char) => char.char).join(''), word.word, `${word.id}: chars 가 한자어와 다르다`);
		assert.equal([...word.reading].length, letters.length, `${word.id}: 독음 글자 수가 한자 수와 다르다`);
	});
});

test('각 글자의 음이 독음의 같은 자리와 맞는다 (두음법칙 허용)', () => {
	LIFE_WORDS.forEach((word) => {
		const reading = [...word.reading];
		word.chars.forEach((char, at) => {
			assert.ok(
				readingCandidates(char.eum, at).has(reading[at]),
				`${word.id} ${word.word}: ${char.char} 의 음 '${char.eum}' 이 독음 '${reading[at]}' 과 맞지 않는다`,
			);
		});
	});
});

test('예문마다 단어가 들어갈 빈칸 {} 이 하나씩 있다', () => {
	LIFE_WORDS.forEach((word) => {
		word.examples.forEach((example, at) => {
			assert.equal(example.split('{}').length, 2, `${word.id}: ${at + 1}번 예문의 {} 가 하나가 아니다`);
		});
	});
});

test('예문 빈칸 밖에 정답 독음이 노출되지 않는다', () => {
	// 노출되면 빈칸 퀴즈에서 답이 그대로 보인다
	LIFE_WORDS.forEach((word) => {
		word.examples.forEach((example, at) => {
			assert.ok(
				!example.split('{}').join('').includes(word.reading),
				`${word.id}: ${at + 1}번 예문에 독음 '${word.reading}' 이 그대로 들어 있다 — ${example}`,
			);
		});
	});
});

test('모든 낱글자가 부수·획수 자료를 가진다', () => {
	// 급수 자료(사자성어 글자만 수록) + 보강표(ConstHanjaShape) 를 합쳐 빠짐없이 덮어야 한다
	const shapes = new Set([...CONST_HANJA_DICT.map((entry) => entry.char), ...CONST_HANJA_SHAPE.map((entry) => entry.char)]);
	const missing = [...new Set(LIFE_WORDS.flatMap((word) => word.chars.map((char) => char.char.normalize('NFKC'))))].filter(
		(char) => !shapes.has(char),
	);
	assert.deepEqual(missing, [], `부수·획수 자료가 없는 글자: ${missing.join(' ')}`);
});

test('보강표가 급수 자료와 겹치지 않고, 획수가 이치에 맞는다', () => {
	const graded = new Set(CONST_HANJA_DICT.map((entry) => entry.char));
	CONST_HANJA_SHAPE.forEach((entry) => {
		assert.ok(!graded.has(entry.char), `${entry.char}: 급수 자료에 이미 있는 글자가 보강표에 중복으로 있다`);
		assert.ok(entry.radical.strokes >= 1, `${entry.char}: 부수 획수가 1보다 작다`);
		assert.ok(entry.totalStrokes >= entry.radical.strokes, `${entry.char}: 총획이 부수 획수보다 작다`);
		assert.ok(entry.totalStrokes <= 33, `${entry.char}: 총획이 지나치게 크다 (${entry.totalStrokes})`);
	});
	const chars = CONST_HANJA_SHAPE.map((entry) => entry.char);
	assert.equal(chars.length, new Set(chars).size, '보강표 안에 같은 글자가 두 번 있다');
});

test('모든 낱글자가 Unihan 부가 정보를 가진다', () => {
	const known = new Set(CONST_HANJA_UNIHAN.map((entry) => entry.char));
	const missing = [...new Set(LIFE_WORDS.flatMap((word) => word.chars.map((char) => char.char.normalize('NFKC'))))].filter(
		(char) => !known.has(char),
	);
	assert.deepEqual(missing, [], `Unihan 자료가 없는 글자: ${missing.join(' ')}`);
});

test('글자의 음이 유니코드 표준 독음(kHangul)과 맞는다', () => {
	// 단어를 새로 넣을 때 음을 잘못 적으면 여기서 걸린다. 두음법칙은 허용한다.
	const readings = new Map(CONST_HANJA_UNIHAN.map((entry) => [entry.char, new Set(entry.hangul ?? [])]));
	LIFE_WORDS.forEach((word) => {
		word.chars.forEach((char) => {
			const standard = readings.get(char.char.normalize('NFKC'));
			if (!standard || standard.size === 0) {
				return;
			}
			const allowed = [...readingCandidates(char.eum)];
			assert.ok(
				allowed.some((eum) => standard.has(eum)),
				`${word.id} ${word.word}: ${char.char} 의 음 '${char.eum}' 이 표준 독음 [${[...standard].join(' ')}] 에 없다`,
			);
		});
	});
});

/**
 * 대표훈음과 일부러 다르게 적은 글자.
 * - 다음자      : 그 단어에서 읽는 음의 훈을 쓴다 (音樂 의 樂 은 '노래 악', 대표훈음은 '즐길 락').
 * - 다른 말 같은 뜻 : 옛 훈을 요즘 말로 고쳐 적었다 (地 '따' → '땅', 全 '온전' → '온전할').
 * 값은 단어 데이터에 적어 둔 훈이다 — 여기 없는 훈으로 바뀌면 아래 테스트가 잡는다.
 */
const HUN_EXCEPTIONS: Record<string, string> = {
	// 다음자 — 단어에서 읽는 음 기준
	樂: '노래', 惡: '미워할', 率: '거느릴', 更: '다시', 塞: '변방', 北: '달아날',
	狀: '문서', 覆: '다시', 洞: '밝을', 省: '덜', 申: '아뢸', 朴: '순박할', 識: '기록할',
	// 같은 뜻을 요즘 말로 적은 것
	地: '땅', 全: '온전할', 利: '이로울', 毛: '털', 連: '잇닿을', 列: '벌일',
	裁: '마를', 床: '평상', 常: '항상', 逆: '거스를', 績: '길쌈할', 裂: '찢을',
	協: '화합할', 史: '역사', 瞬: '깜짝일',
};

/**
 * 훈 비교용 정규화 — '가지/일반' 처럼 훈이 여럿이면 갈라서 보고,
 * 띄어쓰기 차이('큰 바다' / '큰바다')는 같은 훈으로 본다.
 */
const hunVariants = (hun: string): string[] => hun.split('/').map((part) => part.replace(/\s+/g, ''));

test('각 글자의 훈이 대표훈음과 맞는다', () => {
	// 단어를 새로 넣을 때 훈을 잘못 적으면(부수 이름을 훈에 적는 등) 여기서 걸린다.
	// 급수 자료에 없는 글자는 보강표의 훈으로 대조한다 — 두 표를 합치면 낱글자 전부가 덮인다.
	const dict = new Map<string, { hun: string; eum: string }>(
		[...CONST_HANJA_SHAPE, ...CONST_HANJA_DICT].map((entry) => [entry.char, entry]),
	);
	LIFE_WORDS.forEach((word) => {
		word.chars.forEach((char) => {
			const key = char.char.normalize('NFKC');
			const entry = dict.get(key);
			assert.ok(entry, `${word.id}: ${char.char} 의 대표훈음 자료가 없다`);
			const allowed = new Set([...hunVariants(entry.hun), ...hunVariants(HUN_EXCEPTIONS[key] ?? '')]);
			assert.ok(
				hunVariants(char.hun).some((hun) => allowed.has(hun)),
				`${word.id} ${word.word}: ${char.char} 의 훈 '${char.hun}' 이 대표훈음 '${entry.hun} ${entry.eum}' 과 다르다`,
			);
		});
	});
});

test('훈과 음이 띄어쓰기 하나로 갈라진다', () => {
	// 화면은 훈음을 '훈 + 공백 + 음' 한 줄로 그리고, 반대로 마지막 토큰을 음으로 잘라 쓴다.
	// 음이 한 글자가 아니거나 훈 앞뒤에 공백이 있으면 그 왕복이 깨진다.
	const check = (label: string, hun: string, eum: string) => {
		assert.ok(hun.length > 0, `${label}: 훈이 비었다`);
		assert.equal(hun, hun.trim(), `${label}: 훈 '${hun}' 앞뒤에 공백이 있다`);
		assert.ok(!/\s{2,}/.test(hun), `${label}: 훈 '${hun}' 안에 공백이 겹쳐 있다`);
		assert.ok(/^[가-힣]$/.test(eum), `${label}: 음 '${eum}' 이 한글 한 글자가 아니다`);
	};
	LIFE_WORDS.forEach((word) => {
		word.chars.forEach((char) => check(`${word.id} ${word.word} ${char.char}`, char.hun, char.eum));
	});
	CONST_HANJA_DICT.forEach((entry) => check(`급수 자료 ${entry.char}`, entry.hun, entry.eum));
});

/**
 * 같은 글자·같은 음인데 단어마다 훈을 달리 적어 둔 것 — 그 단어에서 쓰이는 뜻이 실제로 다르다.
 * 여기 없는 글자가 단어마다 다른 훈으로 적히면 아래 테스트가 잡는다 (표기가 흔들린 것이다).
 */
const HUN_BY_WORD: Record<string, string[]> = {
	報: ['알릴', '갚을'], // 報道 알릴 · 報恩 갚을
	布: ['베', '펼'], //     毛布 베 · 宣布 펼
	與: ['더불', '줄'], //   貸與 더불 · 贈與 줄
	漢: ['한나라', '한수'], // 漢字 한나라 · 漢江 한수
};

test('같은 글자는 음이 같으면 훈도 같게 적혀 있다', () => {
	// 地 가 어디서는 '땅 지', 어디서는 '따 지' 로 나오던 것을 막는다.
	// 음이 다르면 다음자(樂 = 노래 악 / 즐길 락)라 따로 세지 않는다.
	const seen = new Map<string, Map<string, string>>();
	LIFE_WORDS.forEach((word) => {
		word.chars.forEach((char) => {
			const key = `${char.char.normalize('NFKC')} ${char.eum}`;
			const byHun = seen.get(key) ?? new Map<string, string>();
			byHun.set(char.hun, byHun.get(char.hun) ?? `${word.id} ${word.word}`);
			seen.set(key, byHun);
		});
	});
	seen.forEach((byHun, key) => {
		const [char] = key.split(' ');
		const allowed = HUN_BY_WORD[char];
		if (allowed) {
			[...byHun.keys()].forEach((hun) => {
				assert.ok(allowed.includes(hun), `${char}: 단어별 훈 목록에 없는 훈 '${hun}' (${byHun.get(hun)})`);
			});
			return;
		}
		assert.equal(
			byHun.size,
			1,
			`${key}: 훈이 갈린다 — ${[...byHun].map(([hun, at]) => `'${hun}'(${at})`).join(' / ')}`,
		);
	});
});

test('훈에 음이 딸려 들어가지 않았다', () => {
	// '점령할 점/점칠' + 음 '점' 은 화면에 '점령할 점/점칠 점' 으로 나와 음이 두 번 보인다.
	// 훈이 음과 같은 글자(法 '법 법')는 정상이라 뺀다.
	LIFE_WORDS.forEach((word) => {
		word.chars.forEach((char) => {
			const tokens = char.hun.split('/').flatMap((part) => part.trim().split(/\s+/));
			assert.ok(
				char.hun === char.eum || !tokens.includes(char.eum),
				`${word.id} ${word.word}: ${char.char} 의 훈 '${char.hun}' 안에 음 '${char.eum}' 이 들어 있다`,
			);
		});
	});
});

test('동음자 목록에 음이 다른 글자가 없다', () => {
	// '年(년)' 에 '念(념)' 이, '八(팔)' 에 '判(판)' 이 들어 있었다.
	// 다음자는 표준 독음이 여럿이라 하나만 겹쳐도 인정한다 (生 생 ↔ 省 생·성).
	const dict = new Map(CONST_HANJA_DICT.map((entry) => [entry.char, entry]));
	const readings = new Map(CONST_HANJA_UNIHAN.map((entry) => [entry.char, entry.hangul ?? []]));
	const soundsOf = (char: string): Set<string> => new Set([...(readings.get(char) ?? []), dict.get(char)?.eum ?? '']);
	CONST_HANJA_DICT.forEach((entry) => {
		(entry.homophones ?? []).forEach((char) => {
			assert.notEqual(char, entry.char, `${entry.char}: 자기 자신이 동음자 목록에 있다`);
			assert.ok(dict.has(char), `${entry.char}: 동음자 ${char} 가 급수 자료에 없다`);
			const mine = soundsOf(entry.char);
			assert.ok(
				[...soundsOf(char)].some((eum) => eum && mine.has(eum)),
				`${entry.char}(${entry.eum}): 동음자 ${char}(${dict.get(char)?.eum}) 와 음이 겹치지 않는다`,
			);
		});
	});
});

/**
 * 한 부수를 글자 안에서 쓰는 형태가 둘 이상인 것 — 형태마다 획수가 다르다.
 * 心 은 왼쪽에 붙으면 忄(3획), 아래에 놓이면 心(4획) 이다.
 * 여기 없는 부수가 두 가지 획수로 나오면 나머지 획수(총획 − 부수 획수)를 부수 자리에 잘못 적은 것이다.
 * (咄 은 총획 8 = 口 3 + 出 5 인데 부수 획수가 5 로 들어가 있었다.)
 */
const RADICAL_STROKE_VARIANTS: Record<string, number[]> = {
	心: [3, 4], // 忄 · 心
	手: [3, 4], // 扌 · 手
	水: [3, 4, 5], // 氵 · 水 · 氺
	犬: [3, 4], // 犭 · 犬
	玉: [4, 5], // 王 · 玉
	肉: [4, 6], // 月 · 肉
	衣: [5, 6], // 衤 · 衣
	邑: [3, 7], // 阝 · 邑
	老: [4, 6], // 耂 · 老
	臼: [6, 7], // 臼 · 舁
};

test('부수는 이름이 하나이고, 획수는 정해진 형태의 것만 쓴다', () => {
	const byRadical = new Map<string, { names: Set<string>; strokes: Map<number, string> }>();
	[...CONST_HANJA_DICT, ...CONST_HANJA_SHAPE].forEach((entry) => {
		const found = byRadical.get(entry.radical.char) ?? { names: new Set<string>(), strokes: new Map<number, string>() };
		found.names.add(entry.radical.name);
		if (!found.strokes.has(entry.radical.strokes)) {
			found.strokes.set(entry.radical.strokes, entry.char);
		}
		byRadical.set(entry.radical.char, found);
	});
	byRadical.forEach((found, radical) => {
		assert.equal(found.names.size, 1, `${radical}: 부수 이름이 여럿이다 — ${[...found.names].join(' / ')}`);
		const allowed = RADICAL_STROKE_VARIANTS[radical];
		const shown = [...found.strokes].map(([strokes, char]) => `${strokes}획(${char})`).join(' / ');
		if (allowed) {
			found.strokes.forEach((char, strokes) => {
				assert.ok(allowed.includes(strokes), `${radical}: 형태 목록에 없는 ${strokes}획 (${char})`);
			});
			return;
		}
		assert.equal(found.strokes.size, 1, `${radical}: 부수 획수가 갈린다 — ${shown}`);
	});
});

/** 받침 유무 — 조사 짝을 고르는 기준 */
const finalConsonant = (syllable: string): number => {
	const code = syllable.charCodeAt(0) - HANGUL_BASE;
	return code >= 0 && code < 11172 ? code % 28 : -1;
};

test('예문의 조사가 독음의 받침과 맞는다', () => {
	// 빈칸에 독음을 넣어 읽었을 때 '사전를', '품질으로' 처럼 어긋나면 안 된다.
	// 조사 바로 뒤에 다른 글자가 붙는 경우(전문'가'의, 무용'가'는)는 접미사라 건너뛴다.
	const PAIRS: [withFinal: string, withoutFinal: string][] = [
		['은', '는'],
		['이', '가'],
		['을', '를'],
		['과', '와'],
		['으로', '로'],
	];
	LIFE_WORDS.forEach((word) => {
		const final = finalConsonant(word.reading[word.reading.length - 1]);
		if (final < 0) {
			return;
		}
		word.examples.forEach((example, at) => {
			const after = example.split('{}')[1] ?? '';
			for (const [withFinal, withoutFinal] of PAIRS) {
				for (const [particle, needsFinal] of [
					[withFinal, true],
					[withoutFinal, false],
				] as [string, boolean][]) {
					// 조사 뒤가 글자면 접미사가 붙은 것 — 판정하지 않는다
					if (!after.startsWith(particle) || /[가-힣]/.test(after[particle.length] ?? '')) {
						continue;
					}
					// '으로/로' 만 ㄹ 받침(8)을 받침 없는 쪽으로 친다
					const hasFinal = withFinal === '으로' ? final !== 0 && final !== 8 : final !== 0;
					assert.equal(
						hasFinal,
						needsFinal,
						`${word.id} ${word.word}(${word.reading}) ${at + 1}번 예문의 조사 '${particle}' 이 받침과 맞지 않는다 — ${example}`,
					);
					return;
				}
			}
		});
	});
});

/**
 * 뜻풀이 끝에 올 수 있는 ㅁ받침 낱말 — 굳어진 명사만 둔다.
 * '쉼 · 줌 · 알림 · 헤어짐' 처럼 용언을 명사형으로 바꾼 것은 '~하는 것 / ~한 것' 으로 적는다.
 * (뜻풀이 끝말을 한 가지로 맞춰 두어야 화면에서 '~을 뜻합니다.' 를 붙였을 때 말이 고르게 읽힌다)
 */
const NOUN_ENDINGS = new Set(
	`감 걸음 겨울잠 관심 관점 괴로움 구름 규범 그림 금 금품 기름 기쁨 나눔 남 놀라움 느낌 늦봄 다툼 담 도움 뜸
	 마음 마음가짐 모임 목숨 몸 몸가짐 무덤 묶음 물거품 물음 물품 미움 믿음 밑그림 바람 반지름 받침 밤 방침
	 뱃사람 봄 봄바람 부담 사람 살림 성품 세금 셈 소금 손님 스님 슬픔 시름 시험 싸움 쓴웃음 아름다움 아침
	 식품 어려움 얼마쯤 옛사람 온몸 옷감 옷차림 욕심 용품 울림 움직임 웃음 이다음 이로움 이름 임금 작품 장난감 점
	 제품 조금 조짐 죽음 중심점 즐거움 지금 지름 지점 짐 짜임 차림 책임 처음 춤 침 틈 합금 핵심 허점 홈 흐름 흠 힘`.split(/\s+/),
);

test('뜻풀이 끝말이 한 가지로 맞춰져 있다', () => {
	const jong = (syllable: string) => {
		const code = syllable.charCodeAt(0) - HANGUL_BASE;
		return code >= 0 && code < 11172 ? code % 28 : -1;
	};
	LIFE_WORDS.forEach((word) => {
		const meaning = word.meaning.trim();
		assert.ok(
			!/(하다|되다|이다|입니다|습니다)$/.test(meaning),
			`${word.id}: 뜻풀이가 서술형으로 끝난다 — ${meaning}`,
		);
		// ㅁ받침으로 끝나면 마지막 낱말이 굳어진 명사여야 한다 (용언 명사형은 '~하는 것' 으로)
		if (jong(meaning[meaning.length - 1]) !== 16) {
			return;
		}
		const last = meaning.split(/\s+/)[meaning.split(/\s+/).length - 1].replace(/[,·)]/g, '');
		assert.ok(
			NOUN_ENDINGS.has(last),
			`${word.id}: 뜻풀이가 용언 명사형 '${last}' 으로 끝난다 — '~하는 것 / ~한 것' 으로 적는다 (${meaning})`,
		);
	});
});

/**
 * 명사구로 못 바꾸는 부사 뜻풀이 — '每日 = 하루하루 빠짐없이' 는 '날마다인 것' 으로 적을 수 없다.
 * 이런 풀이는 meaningToSentence 가 조사 대신 '~라는 뜻입니다.' 로 맺는다 (KoreanUtils.ADVERB_ENDINGS).
 * 목록에 없는 부사 끝말이 새로 들어오면 화면에 '앞으로를 뜻합니다' 처럼 나오므로 여기서 막는다.
 */
const ADVERB_TAILS = /(없이|따로따로|그때그때|한꺼번에|어림잡아|마다|바로|앞으로|내내|까지|서로)$/;

test('부사로 끝나는 뜻풀이는 모두 조사 예외 목록에 들어 있다', () => {
	LIFE_WORDS.forEach((word) => {
		const meaning = word.meaning.trim();
		if (!ADVERB_TAILS.test(meaning)) {
			return;
		}
		assert.ok(
			ADVERB_ENDINGS.some((ending) => meaning.endsWith(ending)),
			`${word.id}: 부사로 끝나는데 ADVERB_ENDINGS 에 없다 — ${meaning}`,
		);
		assert.match(
			meaningToSentence(meaning),
			/라는 뜻입니다\.$/,
			`${word.id}: 화면 문장에 조사가 붙어 깨진다 — ${meaningToSentence(meaning)}`,
		);
	});
});

test('명사구 뜻풀이에는 조사가 제대로 붙는다', () => {
	// 부사 예외 목록이 지나치게 넓어져 멀쩡한 풀이까지 삼키는 것을 막는다
	LIFE_WORDS.forEach((word) => {
		const meaning = word.meaning.trim();
		if (ADVERB_TAILS.test(meaning)) {
			return;
		}
		assert.match(
			meaningToSentence(meaning),
			/[을를] 뜻합니다\.$/,
			`${word.id}: 명사구인데 조사가 붙지 않았다 — ${meaning}`,
		);
	});
});

/**
 * 뜻이 닮았지만 서로 견주어 외우는 짝 — 뜻풀이가 겹쳐도 그대로 둔다.
 * 나머지 조합이 아래 기준을 넘으면 같은 분야에서 뽑은 퀴즈 보기 두 개가 다 정답이 된다.
 */
const SIMILAR_ON_PURPOSE = new Set([
	'body-42|body-43', // 近視 · 遠視
	'time-17|time-18', // 陰曆 · 陽曆
	'position-20|position-39', // 平面 · 平地
	'digital-128|digital-129', // 液化 · 氣化
	'school-165|school-167', // 史學 · 農學
	'position-167|position-169', // 北東 · 南東
	'position-168|position-170', // 北西 · 南西
	'fashion-65|fashion-66', // 女裝 · 男裝
	'health-03|health-24', // 病院 · 醫師
	'position-116|position-173', // 縱的 · 橫的
]);

test('같은 분야 안에서 뜻풀이가 서로 너무 닮지 않았다', () => {
	// 퀴즈 보기는 같은 카테고리에서 먼저 뽑는다 (LifeQuizFactory) — 뜻이 겹치면 오답이 정답이 된다.
	const grams = (meaning: string): Set<string> => {
		const text = meaning.replace(/[,·()\s]/g, '');
		const set = new Set<string>();
		for (let at = 0; at < text.length - 1; at++) {
			set.add(text.slice(at, at + 2));
		}
		return set;
	};
	const byCategory = new Map<string, { id: string; word: string; meaning: string; grams: Set<string> }[]>();
	LIFE_WORDS.forEach((word) => {
		const list = byCategory.get(word.category) ?? [];
		list.push({ id: word.id, word: word.word, meaning: word.meaning, grams: grams(word.meaning) });
		byCategory.set(word.category, list);
	});
	byCategory.forEach((list) => {
		for (let a = 0; a < list.length; a++) {
			for (let b = a + 1; b < list.length; b++) {
				const [x, y] = [list[a], list[b]];
				if (SIMILAR_ON_PURPOSE.has(`${x.id}|${y.id}`) || SIMILAR_ON_PURPOSE.has(`${y.id}|${x.id}`)) {
					continue;
				}
				// 한 글자 뜻풀이('밀' · '잣')는 두 글자 조각이 안 나온다 — 똑같은지는 중복 검사가 이미 본다
				if (x.grams.size === 0 || y.grams.size === 0) {
					continue;
				}
				const shared = [...x.grams].filter((gram) => y.grams.has(gram)).length;
				const score = shared / (x.grams.size + y.grams.size - shared);
				assert.ok(
					score < 0.75,
					`${x.id} ${x.word}[${x.meaning}] 과 ${y.id} ${y.word}[${y.meaning}] 의 뜻풀이가 너무 닮았다 (${score.toFixed(2)})`,
				);
			}
		}
	});
});


/**
 * 목록 순서 고정.
 * -------------------------------------------------
 * 이식 화면과 저장소는 단어를 '목록 순번'(1부터)으로 가리킨다 (ProverbServices.toProverbId).
 * 그래서 목록 중간에 단어를 끼워 넣으면 뒤쪽 번호가 전부 밀려,
 * 이미 저장된 학습·오답·즐겨찾기 기록이 통째로 다른 단어를 가리키게 된다.
 *
 * 맨 뒤에 더하는 것은 안전하므로, 고정본을 '앞부분'으로만 대조한다.
 * 순서를 일부러 바꿨다면 word-order.pin.json 을 다시 만들고, 기존 사용자 기록이 어긋난다는 점을 감수해야 한다.
 */
test('단어 순서가 고정본과 같다 (뒤에 더하는 것만 허용)', () => {
	const pinned = WORD_ORDER_PIN as string[];
	assert.ok(
		LIFE_WORDS.length >= pinned.length,
		`단어가 ${pinned.length - LIFE_WORDS.length}개 사라졌다 — 지우면 뒤쪽 번호가 밀려 저장된 기록이 어긋난다`,
	);
	const current = LIFE_WORDS.slice(0, pinned.length).map((word) => word.id);
	const at = current.findIndex((id, index) => id !== pinned[index]);
	assert.equal(
		at,
		-1,
		at < 0 ? '' : `${at + 1}번째 자리가 '${pinned[at]}' 에서 '${current[at]}' 로 바뀌었다 — 중간에 끼워 넣지 말고 맨 뒤에 더한다`,
	);
});
