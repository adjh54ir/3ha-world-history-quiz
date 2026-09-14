import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 태블릿 배율·기둥 폭 규칙이 살아 있는지 본다.
 * -------------------------------------------------
 * 두 모듈은 react-native 를 import 하므로 함수를 직접 불러 실행할 수 없다. 대신 소스를 읽어
 * "규칙이 지켜지는 구조"를 지킨다 — 실제로 깨지는 방식이 그것이기 때문이다.
 *
 * 상한이 빠지면 아이패드에서 좌우 여백 16 이 36 이 되고 본문이 21pt 로 뜬다.
 * 빌드도 타입 검사도 통과해 조용히 지나가는 실패라 여기서 잡는다.
 *
 * 기준점은 src/four/utils/DementionUtils 한 곳뿐이다 (실제 라우트 15개 중 7개가 그 모듈을 쓴다).
 * src/utils 쪽이 숫자를 따로 들고 있으면 같은 앱에서 화면마다 기둥 폭이 달라지므로 그것도 함께 막는다.
 */
const here = dirname(fileURLToPath(import.meta.url));
const four = readFileSync(resolve(here, '../four/utils/DementionUtils.ts'), 'utf8');
const life = readFileSync(resolve(here, 'DementionUtils.ts'), 'utf8');

/** 지금 가장 넓은 폰의 배율 (Pro Max 440pt / 설계 375pt) — 상한이 이보다 낮으면 폰 레이아웃이 바뀐다 */
const WIDEST_PHONE_RATIO = 440 / 375;

const num = (src: string, name: string): number => {
	const found = new RegExp(`export const ${name} = ([\\d.]+);`).exec(src);
	assert.ok(found, `${name} 이 사라졌다`);
	return Number(found[1]);
};

test('폰 기준 해상도는 375×812 그대로다', () => {
	for (const src of [four, life]) {
		assert.match(src, /export const designWidth = 375;/);
		assert.match(src, /export const designHeight = 812;/);
	}
});

test('배율 상한은 폰 레이아웃을 건드리지 않을 만큼 높고, 태블릿을 묶을 만큼 낮다', () => {
	const phone = num(four, 'MAX_SCALE');
	const tablet = num(four, 'TABLET_MAX_SCALE');
	assert.ok(phone > WIDEST_PHONE_RATIO, `폰 상한(${phone})이 가장 넓은 폰 배율(${WIDEST_PHONE_RATIO.toFixed(3)})보다 낮으면 폰 레이아웃이 줄어든다`);
	assert.ok(tablet >= phone, `태블릿 상한(${tablet})이 폰 상한(${phone})보다 낮을 수는 없다`);
	assert.ok(tablet < 2, `태블릿 상한(${tablet})이 2 이상이면 여백·글자가 화면을 넘친다`);
});

test('가로·세로 배율이 모두 상한을 지난다', () => {
	assert.match(four, /widthRatio: Math\.min\(width \/ designWidth, maxScale\)/);
	assert.match(four, /heightRatio: Math\.min\(height \/ designHeight, maxScale\)/);
	// life 쪽은 안드로이드 콜드 스타트 때문에 크기를 그때그때 읽는다 — 상한은 같이 물려야 한다
	assert.match(life, /const widthRatio = \(\) => Math\.min\(box\(\)\.width \/ designWidth, ceiling\(\)\);/);
	assert.match(life, /const heightRatio = \(\) => Math\.min\(box\(\)\.height \/ designHeight, ceiling\(\)\);/);
});

test('태블릿 판정은 짧은 변 600dp 기준이다', () => {
	assert.equal(num(four, 'TABLET_MIN_SHORT_SIDE'), 600);
	assert.match(four, /Math\.min\(width, height\) >= TABLET_MIN_SHORT_SIDE/);
});

test('기둥·모달 폭은 폰에서 걸리지 않고, 모달이 기둥보다 좁다', () => {
	// 폰 값은 화면보다 넓어야 한다 — 그렇지 않으면 폰 레이아웃이 함께 좁아진다
	assert.match(four, /const PHONE_CONTENT_MAX_WIDTH = (\d+);/);
	const phoneColumn = Number(/const PHONE_CONTENT_MAX_WIDTH = (\d+);/.exec(four)![1]);
	assert.ok(phoneColumn > 440, `폰 기둥 폭(${phoneColumn})이 폰 화면보다 좁으면 폰에서도 여백이 생긴다`);

	const tabletColumn = Number(/const TABLET_CONTENT_MAX_WIDTH = (\d+);/.exec(four)![1]);
	assert.ok(tabletColumn > phoneColumn, '태블릿 기둥이 폰 기둥보다 좁을 수는 없다');

	// 모달은 기둥의 일부만 쓴다 — 딤이 보여야 대화상자로 읽힌다
	assert.match(four, /computeContentMaxWidth\(width, height\) \* 0\.9/);
});

test('src/utils 는 태블릿 값을 따로 들고 있지 않다 — 기준점은 four 한 곳', () => {
	assert.match(life, /export \{[\s\S]*?\} from '@\/src\/four\/utils\/DementionUtils';/);
	for (const name of ['MAX_SCALE', 'TABLET_MAX_SCALE', 'CONTENT_MAX_WIDTH', 'MODAL_MAX_WIDTH', 'TABLET_MIN_SHORT_SIDE']) {
		assert.ok(!new RegExp(`export const ${name} =`).test(life), `${name} 을 src/utils 에서 다시 정의하면 화면마다 값이 갈린다`);
	}
});
