/**
 * 한자 필순(획) 데이터 로더
 * -------------------------------------------------
 * 자료가 두 벌이다. 한 글자를 그리는 방식이 서로 달라 `mode` 로 갈라 준다.
 *
 * 1) 바깥선 자료 (mode: 'outline') — 글자 대부분
 *    Make Me a Hanzi (https://github.com/skishore/makemeahanzi) 를 정리한 hanzi-writer-data@2.0.1.
 *    라이선스: Arphic Public License — assets/hanja-strokes/LICENSE.txt.
 *    글자 하나하나를 따로 두면 모듈이 1000개를 넘어 번들이 느려진다. 코드포인트를 24 로 나눈
 *    나머지로 묶어 둔 뒤, 필요한 묶음만 처음 쓸 때 읽어 온다 (한 묶음 약 100KB).
 *    좌표계 1024×1024, y 축이 위를 향해 한 번 뒤집어야 한다.
 *
 * 2) 중심선 자료 (mode: 'line') — 33자
 *    KanjiVG (http://kanjivg.tagaini.net) — 라이선스: CC BY-SA 3.0 (저작자 표시가 조건이다.
 *    앱 안 `설정 → 오픈소스 라이선스 → 필순 자료` 와 assets/hanja-strokes-lines.README.md 참고).
 *    중국 자료에는 한국에서 쓰는 자형이 없어 姉·飮·絶·鑛·眞 처럼 27자가 비슷한 다른 글자로
 *    그려지고 있었다. 그 27자와 자료가 아예 없던 瘍·垈·僞, 참조 표에만 있던 憺·顚·蹐 을
 *    여기서 제 모양으로 그린다. 두 자료에 같은 글자가 있으면 이쪽을 먼저 쓴다.
 *    자료 모양이 달라(획 바깥선이 아니라 중심선 하나) 화면에서는 굵은 선으로 긋는다.
 *    좌표계 109×109, y 축이 아래를 향해 뒤집을 것이 없다.
 *
 * 남은 이체자 7자는 아래 자형으로 그린다. 세 자료(makemeahanzi 9,574자 · KanjiVG 6,763자 ·
 * 3ha-hanpick) 어디에도 이 글자들의 자형이 없어 더 넣을 것이 없다.
 *   淸→清  鄕→鄉  敎→教  硏→研  卽→即  郞→郎  槪→概   (단어 43개에 들어간다)
 * 일곱 쌍 모두 **획수가 같고** 한 부분의 모양만 다르다 (敎 의 攴 ↔ 教 의 攵 처럼).
 * 글자 자체는 서체(Source Han Serif K)로 제 모양이 보이고, 애니메이션만 이 자형으로 돈다.
 * 그린 획 수가 급수 자료의 총획과 한 획 다른 글자가 있다(菓 11 vs 12 …) — 한국식으로 부수를
 * 원형 획수로 세는 관행 때문이고, 기존 바깥선 자료도 艸 부수 글자에서 똑같이 어긋난다.
 *
 * 그리는 쪽은 `selectStrokes` 가 돌려주는 `viewBox` · `transform` · `mode` 를 그대로 쓰면 된다.
 */

/** 바깥선 자료의 좌표계 */
export const STROKE_VIEWBOX = '0 0 1024 1024';
/** 바깥선 자료는 y 축이 위로 향한다 — 화면 좌표로 뒤집는 변환 */
export const STROKE_TRANSFORM = 'translate(0, 900) scale(1, -1)';
/** 중심선 자료(KanjiVG)의 좌표계 — 뒤집을 것이 없다 */
export const STROKE_LINE_VIEWBOX = '0 0 109 109';

/** 한 글자 = [획 바깥선(path d) 목록, 획 중심선 좌표 목록] */
type CharStrokes = [outlines: string[], medians: number[][][]];
type Shard = Record<string, CharStrokes>;
/** 중심선 자료 = 글자 → 획마다의 점열 */
type LineShard = Record<string, number[][][]>;

export interface HanjaStrokes {
	/** 획 바깥선 — 그대로 칠하면 글자 모양이 된다 (쓰는 순서). 중심선 자료에는 없다 */
	outlines: string[];
	/** 획마다 붓이 지나가는 길 — 이 선을 따라 획을 한 획씩 드러낸다 */
	medians: number[][][];
	/** 'outline' 이면 바깥선을 칠하고, 'line' 이면 중심선을 굵은 선으로 긋는다 */
	mode: 'outline' | 'line';
	/** 이 글자의 좌표계 */
	viewBox: string;
	/** 화면 좌표로 맞추는 변환 — 필요 없으면 없다 */
	transform?: string;
}

/** 코드포인트를 나눈 나머지가 곧 묶음 번호다 */
const SHARD_COUNT = 24;

/**
 * 묶음별 로더 — Metro 는 require 경로가 문자열 상수일 때만 번들에 넣으므로 하나씩 적는다.
 * (함수로 감싸 두어 실제로 그 묶음을 쓸 때까지 파싱하지 않는다)
 */
const LOADERS: (() => Shard)[] = [
	() => require('@/src/assets/hanja-strokes/0.json'),
	() => require('@/src/assets/hanja-strokes/1.json'),
	() => require('@/src/assets/hanja-strokes/2.json'),
	() => require('@/src/assets/hanja-strokes/3.json'),
	() => require('@/src/assets/hanja-strokes/4.json'),
	() => require('@/src/assets/hanja-strokes/5.json'),
	() => require('@/src/assets/hanja-strokes/6.json'),
	() => require('@/src/assets/hanja-strokes/7.json'),
	() => require('@/src/assets/hanja-strokes/8.json'),
	() => require('@/src/assets/hanja-strokes/9.json'),
	() => require('@/src/assets/hanja-strokes/10.json'),
	() => require('@/src/assets/hanja-strokes/11.json'),
	() => require('@/src/assets/hanja-strokes/12.json'),
	() => require('@/src/assets/hanja-strokes/13.json'),
	() => require('@/src/assets/hanja-strokes/14.json'),
	() => require('@/src/assets/hanja-strokes/15.json'),
	() => require('@/src/assets/hanja-strokes/16.json'),
	() => require('@/src/assets/hanja-strokes/17.json'),
	() => require('@/src/assets/hanja-strokes/18.json'),
	() => require('@/src/assets/hanja-strokes/19.json'),
	() => require('@/src/assets/hanja-strokes/20.json'),
	() => require('@/src/assets/hanja-strokes/21.json'),
	() => require('@/src/assets/hanja-strokes/22.json'),
	() => require('@/src/assets/hanja-strokes/23.json'),
];

/** 이미 읽어 온 묶음 — 같은 묶음을 두 번 파싱하지 않는다 */
const cache = new Map<number, Shard>();

/** 중심선 자료는 33자뿐이라 묶지 않고 한 파일이다 — 처음 쓸 때 한 번만 읽는다 */
let lineShard: LineShard | null = null;
const lines = (): LineShard => (lineShard ??= require('@/src/assets/hanja-strokes-lines.json') as LineShard);

/**
 * 한 글자의 획 자료. 자료에 없는 글자는 null.
 * 획은 쓰는 순서대로 들어 있다.
 *
 * 중심선 자료를 먼저 본다 — 거기 있는 글자는 바깥선 자료에서 비슷한 다른 글자로
 * 그려지고 있던 것들이라, 있으면 그쪽이 제 모양이다.
 */
export const selectStrokes = (char: string): HanjaStrokes | null => {
	const code = char.codePointAt(0);
	if (code === undefined) {
		return null;
	}
	const line = lines()[char];
	if (line) {
		return { outlines: [], medians: line, mode: 'line', viewBox: STROKE_LINE_VIEWBOX };
	}
	const at = code % SHARD_COUNT;
	let shard = cache.get(at);
	if (!shard) {
		shard = LOADERS[at]();
		cache.set(at, shard);
	}
	const found = shard[char];
	return found ? { outlines: found[0], medians: found[1], mode: 'outline', viewBox: STROKE_VIEWBOX, transform: STROKE_TRANSFORM } : null;
};
