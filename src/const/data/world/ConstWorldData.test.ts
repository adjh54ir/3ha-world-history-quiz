/**
 * 세계 상식 데이터 무결성 검증 — `node --test src/const/data/world/ConstWorldData.test.ts`
 *
 * 손으로 늘려 가는 JSON 이라, 눈으로는 놓치는 것만 기계로 잡는다.
 * 사실관계가 맞는지는 여기서 못 본다 (사람이 봐야 한다). 여기서 보는 것은 이렇다.
 *  - id·표제가 겹치지 않는가
 *  - 학습 카드가 빈칸으로 뜨지 않는가 (설명·곁가지 두 줄)
 *  - 모든 퀴즈 모드가 실제로 문항을 낼 수 있는가 (보기 넷을 채울 값이 있는가)
 *  - 문제에 답이 드러나 있지 않은가 (설명 안에 답 이름이 들어 있는 경우)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import type { WorldType } from '../../../types/data/WorldType.ts';
import { DarkColors, LightColors } from '../../ConstColors.ts';
import { WORLD_TOPICS } from './ConstWorldTopics.ts';
import { LANDMARK_CREDITS } from './ConstLandmarkCredits.ts';
import { buildCountryCodes, selectCountryCodes } from './ConstCountryCodes.ts';
import { buildQuestion, buildQuestions, pick } from '../../../services/world/WorldQuizFactory.ts';
import capital from './capital.json' with { type: 'json' };
import landmark from './landmark.json' with { type: 'json' };
import nature from './nature.json' with { type: 'json' };
import figure from './figure.json' with { type: 'json' };
import event from './event.json' with { type: 'json' };
import myth from './myth.json' with { type: 'json' };
import space from './space.json' with { type: 'json' };
import constellation from './constellation.json' with { type: 'json' };
import worldcup from './worldcup.json' with { type: 'json' };
import olympic from './olympic.json' with { type: 'json' };
import winter from './winter.json' with { type: 'json' };

const ENTRIES: Record<string, WorldType.Entry[]> = {
	capital: capital as WorldType.Entry[],
	landmark: landmark as WorldType.Entry[],
	nature: nature as WorldType.Entry[],
	figure: figure as WorldType.Entry[],
	event: event as WorldType.Entry[],
	myth: myth as WorldType.Entry[],
	space: space as WorldType.Entry[],
	constellation: constellation as WorldType.Entry[],
	worldcup: worldcup as WorldType.Entry[],
	olympic: olympic as WorldType.Entry[],
	winter: winter as WorldType.Entry[],
};

/** 시드 고정 난수 — 돌릴 때마다 같은 문항이 나와야 실패를 재현할 수 있다 */
const seeded = (seed: number) => () => {
	seed = (seed * 1103515245 + 12345) % 2147483648;
	return seed / 2147483648;
};

/** 한 모드가 문항을 낼 수 있어야 하는 최소 개수 — 이보다 적으면 퀴즈 한 판이 안 나온다 */
const MIN_QUESTIONS = 8;

test('주제마다 JSON 이 있고 비어 있지 않다', () => {
	WORLD_TOPICS.forEach((topic) => {
		const entries = ENTRIES[topic.key];
		assert.ok(entries, `${topic.key} 주제의 데이터가 없다`);
		assert.ok(entries.length >= 20, `${topic.key} 항목이 ${entries.length}개뿐이다`);
	});
	assert.equal(Object.keys(ENTRIES).length, WORLD_TOPICS.length, 'JSON 과 주제 목록의 개수가 어긋난다');
});

test('id 와 표제가 겹치지 않는다', () => {
	const seenId = new Set<string>();
	WORLD_TOPICS.forEach((topic) => {
		const seenName = new Set<string>();
		ENTRIES[topic.key].forEach((entry) => {
			assert.ok(entry.id.startsWith(`${topic.key}-`), `${entry.id} 는 주제 이름으로 시작해야 한다`);
			assert.ok(!seenId.has(entry.id), `id 가 겹친다: ${entry.id}`);
			assert.ok(!seenName.has(entry.name), `${topic.key} 안에서 표제가 겹친다: ${entry.name}`);
			seenId.add(entry.id);
			seenName.add(entry.name);
		});
	});
});

test('학습 카드에 빈칸이 생기지 않는다', () => {
	Object.values(ENTRIES).flat().forEach((entry) => {
		assert.ok([1, 2, 3, 4].includes(entry.level), `${entry.id} 의 난이도가 1~4 가 아니다`);
		assert.ok(entry.name.trim().length > 0, `${entry.id} 에 표제가 없다`);
		assert.ok(entry.summary.trim().length > 0, `${entry.id} 에 설명이 없다`);
		assert.equal(entry.facts.length, 2, `${entry.id} 의 곁가지는 두 줄이어야 한다`);
		entry.facts.forEach((fact) => assert.ok(fact.trim().length > 0, `${entry.id} 에 빈 곁가지가 있다`));
		assert.ok(Object.keys(entry.fields).length > 0, `${entry.id} 에 값이 하나도 없다`);
	});
});

test('모든 퀴즈 모드가 실제로 문항을 낸다', () => {
	WORLD_TOPICS.forEach((topic) => {
		const pool = ENTRIES[topic.key];
		topic.modes.forEach((mode) => {
			const questions = buildQuestions(pool, topic, pool, seeded(7), [mode]);
			assert.ok(
				questions.length >= MIN_QUESTIONS,
				`${topic.key}/${mode.key} 가 ${questions.length}문항밖에 못 낸다 (보기 넷을 채울 값이 모자라다)`,
			);
		});
	});
});

test('문항의 보기 넷이 서로 다르고 정답을 담고 있다', () => {
	WORLD_TOPICS.forEach((topic) => {
		const pool = ENTRIES[topic.key];
		topic.modes.forEach((mode) => {
			buildQuestions(pool, topic, pool, seeded(13), [mode]).forEach((question) => {
				assert.equal(question.options.length, 4, `${question.id} 의 보기가 넷이 아니다`);
				assert.equal(new Set(question.options).size, 4, `${question.id} 의 보기에 같은 값이 있다`);
				assert.ok(question.options.includes(question.answer), `${question.id} 의 보기에 정답이 없다`);
				assert.ok(!question.options.includes(question.prompt), `${question.id} 의 보기에 문제가 그대로 들어 있다`);
			});
		});
	});
});

test('문제 자리의 값이 항목마다 달라 답이 하나로 정해진다', () => {
	WORLD_TOPICS.forEach((topic) => {
		topic.modes.forEach((mode) => {
			const pool = ENTRIES[topic.key];
			const seen = new Map<string, string>();
			pool.forEach((entry) => {
				// 문항으로 만들어지지 않는 항목(값이 없는 항목)은 따질 것도 없다
				if (!buildQuestion(entry, topic, mode, pool, seeded(3))) {
					return;
				}
				const prompt = pick(entry, mode.ask);
				const before = seen.get(prompt);
				assert.ok(
					before === undefined,
					`${topic.key}/${mode.key} 에서 같은 문제가 둘이다: "${prompt}" (${before} · ${entry.id})`,
				);
				seen.set(prompt, entry.id);
			});
		});
	});
});

/**
 * 그림을 앱에 담아 둔 주제 — 어느 필드가 열쇠고, 파일이 어디 있고, 어느 상수가 require 로 거는지.
 * 그림이 일부 항목에만 붙는 주제도 여기서 함께 지킨다.
 */
const IMAGE_SOURCES: Record<string, { field: string; dir: string; module: string }> = {
	capital: { field: 'code', dir: 'flags', module: 'ConstFlagImages.ts' },
	myth: { field: 'image', dir: 'myth', module: 'ConstMythImages.ts' },
	space: { field: 'image', dir: 'planets', module: 'ConstPlanetImages.ts' },
	constellation: { field: 'image', dir: 'constellations', module: 'ConstConstellationImages.ts' },
};

test('그림이 붙은 항목마다 파일과 require 가 다 있다', () => {
	// 파일이 하나만 빠져도 그림 자리가 빈칸으로 뜬다. JSON 은 파일 이름만 들고 있어 눈으로는 못 잡는다.
	Object.entries(IMAGE_SOURCES).forEach(([key, source]) => {
		const module = fs.readFileSync(new URL(`./${source.module}`, import.meta.url), 'utf8');
		let counted = 0;
		ENTRIES[key].forEach((entry) => {
			// 그림이 없는 항목이 섞여 있는 것은 정상이다.
			const code = entry.fields[source.field];
			if (!code) {
				return;
			}
			counted += 1;
			assert.ok(
				fs.existsSync(new URL(`../../../assets/${source.dir}/${code}.webp`, import.meta.url)),
				`${entry.id} 의 그림(${source.dir}/${code}.webp)이 없다`,
			);
			assert.ok(
				module.includes(`require('@/src/assets/${source.dir}/${code}.webp')`),
				`${entry.id} 의 그림(${code})이 ${source.module} 에 빠져 있다`,
			);
		});
		assert.ok(counted > 0, `${key} 주제에 그림이 붙은 항목이 하나도 없다`);
	});
});

/**
 * 그림을 위키미디어에서 받아 오는 주제 — 앱에 파일이 없으니 파일 이름의 생김새만 본다.
 * 주소가 실제로 살아 있는지는 여기서 못 본다 (`node --test` 가 바깥으로 나가지 않는다).
 */
const REMOTE_IMAGE_SOURCES: Record<string, { field: string }> = {
	figure: { field: 'image' },
	landmark: { field: 'image' },
};

test('위키 그림을 쓰는 주제는 항목마다 쓸 만한 파일 이름을 들고 있다', () => {
	// 이름이 비거나 겹치면 초상 문항에서 빈칸이 뜨거나 답이 둘이 된다.
	Object.entries(REMOTE_IMAGE_SOURCES).forEach(([key, source]) => {
		const seen = new Set<string>();
		ENTRIES[key].forEach((entry) => {
			const file = entry.fields[source.field];
			assert.ok(file, `${entry.id} 에 그림 파일 이름이 없다`);
			assert.match(file, /\.(jpg|jpeg|png|webp|gif)$/i, `${entry.id} 의 그림(${file})이 그림 파일 이름이 아니다`);
			assert.ok(!seen.has(file), `${key} 안에서 그림이 겹친다: ${file} (${entry.id})`);
			seen.add(file);
		});
	});
});

/**
 * 국기를 붙일 수 없는 나라 이름 — 여기 없는 이름이 새로 들어오면 국기가 조용히 빠진다.
 * 소련·독립국가연합·체코슬로바키아·유고슬라비아·동독은 국기 파일이 아예 없고,
 * 잉글랜드는 영국(유니언잭)과 깃발이 달라 gb 를 걸 수 없다.
 */
const NO_FLAG = new Set(['소련', '독립국가연합', '체코슬로바키아', '잉글랜드', '유고슬라비아', '동독']);

test('나라를 답으로 쓰는 값마다 국기를 찾을 수 있다', () => {
	// answerAs: 'flag' 는 보기·사전 값 옆에 국기를 걸겠다는 약속이다. 이름이 대응표에 없으면 그 자리만 국기가 빠져
	// 보기 넷 가운데 하나만 맨 글자로 남는다 — 눈으로는 데이터를 다 훑기 전에는 못 잡는다.
	const codes = buildCountryCodes(capital as WorldType.Entry[]);
	WORLD_TOPICS.forEach((topic) => {
		topic.modes
			.filter((mode) => mode.answerAs === 'flag')
			.forEach((mode) => {
				ENTRIES[topic.key].forEach((entry) => {
					const value = pick(entry, mode.answer);
					if (!value || NO_FLAG.has(value)) {
						return;
					}
					assert.ok(
						selectCountryCodes(value, codes).length > 0,
						`${entry.id} 의 ${mode.answer}("${value}") 에 걸 국기가 없다 — ConstCountryCodes 에 별칭을 넣거나 NO_FLAG 에 적어라`,
					);
				});
			});
	});
});

test('국기 맞히기 모드에는 보기 국기를 달지 않는다', () => {
	// 답이 국기인데 보기마다 국기를 달면 고를 것이 없다.
	WORLD_TOPICS.forEach((topic) => {
		topic.modes.forEach((mode) => {
			assert.ok(!(mode.askAs === 'flag' && mode.answerAs === 'flag'), `${topic.key}/${mode.key} 가 문제와 보기에 모두 국기를 건다`);
		});
	});
});

/**
 * 곁가지가 겹쳐도 되는 자리 — 수도 주제 242개 가운데 84개는 곁가지를 출처의 인구·면적에서 기계로 뽑아 썼다.
 * '인구는 약 4만명이다.' 같은 문장은 나라가 달라도 같아질 수밖에 없다.
 * ponytail: 손으로 다시 쓰기 전까지는 이 문장들만 빼고 본다. 84개를 손으로 쓰면 이 예외를 지워라.
 */
const GENERATED_FACT = /^(인구는|면적은)/;

test('같은 곁가지 문장이 두 항목에 붙어 있지 않다', () => {
	// 학습 카드는 항목마다 곁가지 두 줄이 전부다. 같은 문장이 다른 항목에 또 나오면 베껴 쓴 것처럼 보인다.
	WORLD_TOPICS.forEach((topic) => {
		const seen = new Map<string, string>();
		ENTRIES[topic.key].forEach((entry) => {
			entry.facts.forEach((fact) => {
				if (GENERATED_FACT.test(fact)) {
					return;
				}
				const before = seen.get(fact);
				assert.ok(before === undefined, `${topic.key} 안에서 곁가지가 겹친다: "${fact}" (${before} · ${entry.id})`);
				seen.set(fact, entry.id);
			});
		});
	});
});

test('인용은 큰따옴표로 적는다', () => {
	// 위인 42곳이 큰따옴표를 쓰는데 사건 네 곳만 작은따옴표였다. 같은 앱 안에서 인용 표기가 둘이면 눈에 걸린다.
	WORLD_TOPICS.forEach((topic) => {
		ENTRIES[topic.key].forEach((entry) => {
			[entry.summary, ...entry.facts].forEach((line) => {
				assert.ok(!line.includes("'"), `${entry.id} 에 작은따옴표가 있다: ${line}`);
			});
		});
	});
});

/** 한 주제에서 특급(4등급)이 차지해도 되는 몫 — 넘으면 뒤쪽 학습이 통째로 벽이 된다 */
const MAX_HARD_SHARE = 0.4;

test('난이도가 한쪽으로 쏠리지 않는다', () => {
	// 학습 순서는 난이도 순이다. 절반이 특급이면(전에 수도가 131/242 였다) 뒤로 갈수록 이름도 못 들어 본 것만 남는다.
	WORLD_TOPICS.forEach((topic) => {
		const entries = ENTRIES[topic.key];
		const count = (level: number) => entries.filter((entry) => entry.level === level).length;
		[1, 2, 3, 4].forEach((level) => {
			assert.ok(count(level) > 0, `${topic.key} 에 ${level}등급 항목이 하나도 없다`);
		});
		const share = count(4) / entries.length;
		assert.ok(
			share <= MAX_HARD_SHARE,
			`${topic.key} 의 특급이 ${(share * 100).toFixed(0)}% 다 (${(MAX_HARD_SHARE * 100).toFixed(0)}% 이하여야 한다)`,
		);
	});
});

test('랜드마크 사진은 저작자 표시 표와 한 벌이다', () => {
	/**
	 * 사진 96장 가운데 퍼블릭 도메인은 17장뿐이고 나머지는 CC BY·CC BY-SA 다 — 저작자 표시가 라이선스 조건이다.
	 * 사진만 갈아 끼우고 표를 안 고치면 고지가 다른 사람을 가리킨다. 그건 눈으로는 안 보인다.
	 */
	const credits = new Map(LANDMARK_CREDITS.map((credit) => [credit.file, credit]));
	assert.equal(LANDMARK_CREDITS.length, ENTRIES.landmark.length, '표 개수가 랜드마크 개수와 다르다');
	ENTRIES.landmark.forEach((entry) => {
		const credit = credits.get(entry.fields.image);
		assert.ok(credit, `${entry.id} (${entry.name}) 의 사진 출처가 표에 없다`);
		assert.equal(credit.name, entry.name, `${entry.fields.image} 의 표 이름이 항목 이름과 다르다`);
		assert.ok(credit.license, `${entry.fields.image} 에 라이선스가 비어 있다`);
		assert.ok(credit.artist, `${entry.fields.image} 에 저작자가 비어 있다`);
	});
});

test('그림 문항 모드는 그림이 붙은 필드를 물어본다', () => {
	const ALL_IMAGE_SOURCES: Record<string, { field: string }> = { ...IMAGE_SOURCES, ...REMOTE_IMAGE_SOURCES };
	WORLD_TOPICS.forEach((topic) => {
		topic.modes
			.filter((mode) => mode.askAs)
			.forEach((mode) => {
				const source = ALL_IMAGE_SOURCES[topic.key];
				assert.ok(source, `${topic.key}/${mode.key} 가 그림 문항인데 그림 출처가 정해지지 않았다`);
				assert.equal(mode.ask, source.field, `${topic.key}/${mode.key} 는 ${source.field} 를 물어야 그림을 찾는다`);
				const withImage = ENTRIES[topic.key].filter((entry) => entry.fields[source.field]).length;
				assert.ok(withImage >= MIN_QUESTIONS, `${topic.key}/${mode.key} 에 그림이 붙은 항목이 ${withImage}개뿐이라 한 판이 안 나온다`);
			});
	});
});

/** 두 색의 명도 대비 (WCAG) — 1 에 가까울수록 구분이 안 된다 */
const contrast = (a: string, b: string): number => {
	const luminance = (hex: string) => {
		const full = hex.replace('#', '');
		const channel = (at: number) => {
			const value = parseInt(full.slice(at, at + 2), 16) / 255;
			return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
		};
		return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
	};
	const [bright, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (bright + 0.05) / (dark + 0.05);
};

/** 아이콘·굵은 글자가 읽히는 최소 대비 (WCAG 비텍스트 기준) */
const MIN_CONTRAST = 3;

test('주제 색이 틴트 위에서 읽힌다', () => {
	// 주제 카드는 tint 를 면으로 깔고 color 로 아이콘·글자를 얹는다.
	// 밝은 앰버·초록을 그대로 쓰면 대비가 2:1 로 떨어져 아이콘이 배경에 묻힌다 (그래서 *Dark 토큰을 따로 뒀다).
	([['라이트', LightColors], ['다크', DarkColors]] as const).forEach(([theme, palette]) => {
		WORLD_TOPICS.forEach((topic) => {
			const ratio = contrast(palette[topic.color], palette[topic.tint]);
			assert.ok(
				ratio >= MIN_CONTRAST,
				`${theme}에서 ${topic.key} 의 ${topic.color}/${topic.tint} 대비가 ${ratio.toFixed(2)} 뿐이다 (${MIN_CONTRAST} 이상 필요)`,
			);
		});
	});
});

test('주제 아이콘이 실제로 있는 이름이다', () => {
	// 없는 이름을 적으면 화면에 아무것도 안 그려진다 — 오류도 안 난다.
	const path = new URL('../../../../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json', import.meta.url);
	assert.ok(fs.existsSync(path), '아이콘 목록을 찾지 못했다 — @expo/vector-icons 경로가 바뀌었으면 이 테스트를 고쳐라');
	const glyphs = JSON.parse(fs.readFileSync(path, 'utf8')) as Record<string, number>;
	WORLD_TOPICS.forEach((topic) => {
		assert.ok(glyphs[topic.icon] !== undefined, `${topic.key} 의 아이콘 이름 "${topic.icon}" 은 MaterialCommunityIcons 에 없다`);
	});
});

test('설명 보고 맞히기 문제에 답 이름이 들어 있지 않다', () => {
	WORLD_TOPICS.forEach((topic) => {
		topic.modes
			.filter((mode) => mode.ask === 'summary')
			.forEach((mode) => {
				ENTRIES[topic.key].forEach((entry) => {
					assert.ok(
						!entry.summary.includes(entry.name),
						`${entry.id} 의 설명에 답(${entry.name})이 그대로 적혀 있다 — ${mode.key} 문항에서 답이 드러난다`,
					);
				});
			});
	});
});
