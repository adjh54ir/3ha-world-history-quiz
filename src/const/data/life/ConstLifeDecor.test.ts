/**
 * 화면 꾸미기 데이터 검증 — `node --test src/const/data/life/ConstLifeDecor.test.ts`
 *
 * 여기 있는 항목은 전부 "색 토큰 이름"·"에셋 키 이름" 같은 문자열로 화면을 가리킨다.
 * 철자가 하나 틀려도 앱은 죽지 않고 그냥 아무것도 안 그려서, 눈으로는 빠진 걸 못 찾는다.
 * 그 조용한 실패만 기계로 잡는다.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { DECOR_KINDS, DECORS, DECOR_SET_BONUS_PERCENT, decorsOf, isDecorSetComplete, selectDecor } from './ConstLifeDecor.ts';
import { Colors } from '../../ConstColors.ts';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * 상점 아이템 그림 표를 글자로만 읽는다.
 * 그대로 import 하면 `require('*.png')` 이 돌아 node 에서 터진다 — 키 이름만 확인하면 충분하다.
 */
const SHOP_IMAGE_SOURCE = readFileSync(resolve(here, 'ConstShopImages.ts'), 'utf8');
const shopImageKeys = new Set([...SHOP_IMAGE_SOURCE.matchAll(/^\t(\w+): require\(/gm)].map((match) => match[1]));

test('id 는 겹치지 않는다', () => {
	const ids = DECORS.map((item) => item.id);
	assert.equal(new Set(ids).size, ids.length, `겹치는 id: ${ids.filter((id, at) => ids.indexOf(id) !== at).join(', ')}`);
});

test('갈래 여섯 개 모두 파는 물건이 있다', () => {
	for (const group of DECOR_KINDS) {
		assert.ok(decorsOf(group.key).length > 0, `${group.key} 갈래에 파는 물건이 없다`);
	}
	// 목록에 없는 갈래를 쓴 항목이 섞이면 상점 어디에도 안 나온다
	const known = new Set(DECOR_KINDS.map((group) => group.key));
	for (const item of DECORS) {
		assert.ok(known.has(item.kind), `${item.id} 의 갈래 '${item.kind}' 는 DECOR_KINDS 에 없다`);
	}
});

test('색은 모두 실제 팔레트 토큰이다', () => {
	for (const item of DECORS) {
		assert.ok(item.color in Colors, `${item.id} 의 color '${item.color}' 는 팔레트에 없다`);
		assert.ok(item.tint in Colors, `${item.id} 의 tint '${item.tint}' 는 팔레트에 없다`);
	}
});

test('글자로 보여 주는 갈래(칭호·낙관)는 글자를 갖고 있다', () => {
	for (const item of DECORS) {
		if (item.kind === 'title' || item.kind === 'seal') {
			assert.ok(item.text?.trim(), `${item.id} 에 화면에 찍을 text 가 없다`);
		}
	}
	// 낙관은 도장 한 칸에 들어가야 한다 — 한 글자로 못 박는다
	for (const item of decorsOf('seal')) {
		assert.equal([...(item.text ?? '')].length, 1, `${item.id} 의 낙관 글자는 한 자여야 한다`);
	}
});

test('글방 가구는 실제로 있는 상점 에셋을 가리킨다', () => {
	for (const item of decorsOf('study')) {
		assert.ok(item.props?.length, `${item.id} 에 놓을 가구가 없다`);
		for (const key of item.props ?? []) {
			assert.ok(shopImageKeys.has(key), `${item.id} 의 가구 '${key}' 가 SHOP_ITEM_IMAGES 에 없다`);
		}
	}
});

test('값은 갈래 안에서 싼 것부터 놓인다', () => {
	for (const group of DECOR_KINDS) {
		const prices = decorsOf(group.key).map((item) => item.price);
		assert.ok(
			prices.every((price, at) => price > 0 && (at === 0 || prices[at - 1] <= price)),
			`${group.key} 갈래의 값 순서가 어긋났다: ${prices.join(', ')}`,
		);
	}
});

test('selectDecor 는 없는 id·빈 값에 null 을 준다', () => {
	assert.equal(selectDecor(undefined), null);
	assert.equal(selectDecor(null), null);
	assert.equal(selectDecor(''), null);
	// 저장본에 남은 옛 id — 앱이 터지지 않고 "아무것도 안 놓은" 상태가 돼야 한다
	assert.equal(selectDecor('지워진항목'), null);
	assert.equal(selectDecor(DECORS[0].id)?.id, DECORS[0].id);
});

test('아이콘 이름이 모두 실제 글리프다', () => {
	// 틀린 이름을 써도 앱은 죽지 않고 빈 글자를 그린다 — 글리프 표를 읽어 확인한다
	const glyphs: Record<string, number> = JSON.parse(
		readFileSync(resolve(process.cwd(), 'node_modules/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json'), 'utf8'),
	);
	for (const group of DECOR_KINDS) {
		assert.ok(group.icon in glyphs, `${group.key} 갈래의 아이콘 '${group.icon}' 는 MaterialCommunityIcons 에 없다`);
	}
	for (const item of DECORS) {
		assert.ok(item.icon in glyphs, `${item.id} 의 아이콘 '${item.icon}' 는 MaterialCommunityIcons 에 없다`);
	}
});

test('세트 보너스 — 여섯 갈래를 다 놓았을 때만 켜진다', () => {
	const full = Object.fromEntries(DECOR_KINDS.map((group) => [group.key, decorsOf(group.key)[0].id]));
	assert.equal(isDecorSetComplete(full), true);

	// 한 갈래만 비어도 꺼진다
	const { seal, ...missingOne } = full;
	assert.equal(seal.length > 0, true);
	assert.equal(isDecorSetComplete(missingOne), false);

	// 값이 아예 없거나 저장본에 남은 옛 id 면 그 갈래는 안 놓은 것으로 센다
	assert.equal(isDecorSetComplete({}), false);
	assert.equal(isDecorSetComplete(undefined), false);
	assert.equal(isDecorSetComplete({ ...full, study: '지워진항목' }), false);

	// 보너스는 코인에만 붙는 작은 값이다 — 실수로 0 이나 100 이 되면 잡는다
	assert.ok(DECOR_SET_BONUS_PERCENT > 0 && DECOR_SET_BONUS_PERCENT <= 20);
});
