/**
 * 뱃지 표 검증 — `node --test src/services/life/Badges.test.ts`
 *
 * 뱃지는 두 곳에 나뉘어 있다 — 이름·설명은 BADGES(데이터), 조건은 BADGE_GOALS(규칙).
 * 한쪽에만 추가하면 앱은 죽지 않고 그냥 "영원히 못 따는 뱃지" 나 "화면에 없는 뱃지" 가 된다.
 * 그 조용한 어긋남만 기계로 잡는다.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { BADGES, BADGE_RARITY } from '../../const/data/life/ConstLifeRewards.ts';
import { DECORS } from '../../const/data/life/ConstLifeDecor.ts';
import { LIFE_LEVELS } from '../../const/data/life/ConstLifeLevels.ts';
import { LIFE_CATEGORIES } from '../../const/data/life/ConstLifeCategories.ts';
import { badgeProgress, checkNewBadges, type BadgeSnapshot } from './LifeRules.ts';

/**
 * 아이콘 이름이 실제 글리프인지.
 * 틀린 이름을 써도 앱은 죽지 않고 물음표 비슷한 빈 글자를 그린다 — 눈으로는 찾기 어렵다.
 * 글리프 표(JSON)만 읽어 확인한다. 폰트 파일이나 네이티브 모듈은 건드리지 않는다.
 */
const MCI_GLYPHS: Record<string, number> = JSON.parse(
	readFileSync(resolve(process.cwd(), 'node_modules/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json'), 'utf8'),
);

/** 아무것도 안 한 사용자 */
const EMPTY: BadgeSnapshot = {
	learnedCount: 0,
	categoryDone: false,
	quizCount: 0,
	hasPerfect: false,
	dailyDoneCount: 0,
	streak: 0,
	graduatedCount: 0,
	bestTime: 0,
	bestTower: 0,
	exp: 0,
	bestCombo: 0,
	fastCount: 0,
	chestCount: 0,
	missionDoneCount: 0,
	stars: 0,
	categoryDoneCount: 0,
	categoryTotal: LIFE_CATEGORIES.length,
	attendanceDays: 0,
	favoriteCount: 0,
	decorCount: 0,
	decorTotal: DECORS.length,
	levelDoneCount: 0,
	levelTotal: LIFE_LEVELS.length,
	totalCorrect: 0,
	petFedCount: 0,
	upgradeLevel: 0,
	wrongCleared: false,
};

/** 모든 조건을 넘겨 버린 사용자 — 목표가 데이터 개수에 걸린 것들도 함께 채운다 */
const MAXED: BadgeSnapshot = {
	learnedCount: 100000,
	categoryDone: true,
	quizCount: 100000,
	hasPerfect: true,
	dailyDoneCount: 100000,
	streak: 100000,
	graduatedCount: 100000,
	bestTime: 100000,
	bestTower: 100000,
	exp: 1000000,
	bestCombo: 100000,
	fastCount: 100000,
	chestCount: 100000,
	missionDoneCount: 100000,
	stars: 100000,
	categoryDoneCount: LIFE_CATEGORIES.length,
	categoryTotal: LIFE_CATEGORIES.length,
	attendanceDays: 100000,
	favoriteCount: 100000,
	decorCount: DECORS.length,
	decorTotal: DECORS.length,
	levelDoneCount: LIFE_LEVELS.length,
	levelTotal: LIFE_LEVELS.length,
	totalCorrect: 100000,
	petFedCount: 100000,
	upgradeLevel: 100000,
	wrongCleared: true,
};

test('id 는 겹치지 않는다', () => {
	const ids = BADGES.map((badge) => badge.id);
	assert.equal(new Set(ids).size, ids.length, `겹치는 id: ${ids.filter((id, at) => ids.indexOf(id) !== at).join(', ')}`);
});

test('뱃지마다 조건이 달려 있다', () => {
	for (const badge of BADGES) {
		// 조건 표에 없으면 goal 이 0 으로 온다 — 영원히 못 따는 뱃지다
		assert.ok(badgeProgress(badge.id, EMPTY).goal > 0, `${badge.id} 에 BADGE_GOALS 항목이 없다`);
	}
});

test('희귀도는 등급 표에 있는 값만 쓴다', () => {
	for (const badge of BADGES) {
		assert.ok(badge.rarity in BADGE_RARITY, `${badge.id} 의 희귀도 '${badge.rarity}' 는 등급 표에 없다`);
	}
});

test('이름·설명·조건 문구가 비어 있지 않다', () => {
	for (const badge of BADGES) {
		assert.ok(badge.label.trim(), `${badge.id} 의 이름이 비었다`);
		assert.ok(badge.description.trim(), `${badge.id} 의 설명이 비었다`);
		assert.ok(badge.requirement.trim(), `${badge.id} 의 획득 조건이 비었다`);
		assert.ok(badge.icon.trim(), `${badge.id} 의 아이콘이 비었다`);
	}
});

test('아무것도 안 한 사용자는 뱃지를 하나도 못 딴다', () => {
	assert.deepEqual(checkNewBadges(EMPTY, []), []);
});

test('조건을 다 넘기면 모든 뱃지를 딴다', () => {
	// 하나라도 빠지면 목표가 데이터 개수에 걸린 뱃지(전 분야·옷장 정복)의 상한이 잘못 잡힌 것이다
	assert.equal(checkNewBadges(MAXED, []).length, BADGES.length);
});

test('이미 딴 뱃지는 다시 주지 않는다', () => {
	const first = BADGES[0].id;
	assert.ok(!checkNewBadges(MAXED, [first]).includes(first));
});

test('아이콘 이름이 모두 실제 글리프다', () => {
	for (const badge of BADGES) {
		assert.ok(badge.icon in MCI_GLYPHS, `${badge.id} 의 아이콘 '${badge.icon}' 는 MaterialCommunityIcons 에 없다`);
	}
});
