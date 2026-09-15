/**
 * 규칙 검증 — `yarn test:rules` (= node --test src/services/life/LifeRules.test.ts)
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	WRONG_NOTE_GRADUATE,
	allMissionsDone,
	applyWrongLogs,
	categoryStars,
	dailyShareText,
	freshMissions,
	isMissionDone,
	quizBonus,
	attendanceExpReward,
	attendanceFeedReward,
	daysToFeedMilestone,
	ATTENDANCE_FEED_CYCLE,
	attendancePetStatus,
	calcStreak,
	checkNewBadges,
	petStatus,
	pickDailyWordIds,
	openLevel,
	pickByLevel,
	expToActions,
	towerTimeLimit,
} from './LifeRules.ts';
import { EXP, PET_STAGES } from '../../const/data/life/ConstLifeRewards.ts';
import type { WorldType } from '../../types/data/WorldType.ts';
import { WORLD_TOPICS } from '../../const/data/world/ConstWorldTopics.ts';
import capital from '../../const/data/world/capital.json' with { type: 'json' };
import landmark from '../../const/data/world/landmark.json' with { type: 'json' };
import figure from '../../const/data/world/figure.json' with { type: 'json' };
import myth from '../../const/data/world/myth.json' with { type: 'json' };
import space from '../../const/data/world/space.json' with { type: 'json' };
import constellation from '../../const/data/world/constellation.json' with { type: 'json' };
import worldcup from '../../const/data/world/worldcup.json' with { type: 'json' };
import olympic from '../../const/data/world/olympic.json' with { type: 'json' };

/**
 * 검증에 쓸 학습 항목 — 앱이 쓰는 것과 같은 순서로 이어 붙인다 (ConstWorldDomain 의 DOMAIN_ITEMS).
 * ConstWorldDomain 을 그대로 들여오지 못하는 이유는 그쪽이 확장자 없는 경로로 JSON 을 물고 있어
 * `node --test` 가 못 읽기 때문이다.
 */
const ITEMS: WorldType.Entry[] = [capital, landmark, figure, myth, space, constellation, worldcup, olympic].flat() as WorldType.Entry[];

/** 항목이 어느 주제 것인지 — id 앞머리가 주제 열쇠다 */
const topicOf = (item: WorldType.Entry): string => item.id.split('-')[0];

test('스트릭 — 오늘 출석했으면 오늘부터, 아니면 어제부터 센다', () => {
	assert.equal(calcStreak(['2026-09-04', '2026-09-05', '2026-09-06'], '2026-09-06'), 3);
	assert.equal(calcStreak(['2026-09-04', '2026-09-05'], '2026-09-06'), 2);
	assert.equal(calcStreak(['2026-09-03'], '2026-09-06'), 0);
	assert.equal(calcStreak([], '2026-09-06'), 0);
});

test('출석 경험치 — 연속 보너스는 상한에서 멈춘다', () => {
	assert.equal(attendanceExpReward(1), 10);
	assert.equal(attendanceExpReward(6), 20);
	assert.equal(attendanceExpReward(100), 40);
});

test('펫 단계 — 경험치 구간과 진행률', () => {
	assert.equal(petStatus(0).level, 1);
	assert.equal(petStatus(990).ratio, 0.99);
	assert.equal(petStatus(1000).level, 2);
	assert.equal(petStatus(10000).level, 5);
	assert.equal(petStatus(10000).next?.minExp, 20000);
	assert.equal(petStatus(19999).level, 5);
	assert.equal(petStatus(20000).level, 6);
	assert.equal(petStatus(20000).stage.label, '황금 대탐험가');
	assert.equal(petStatus(20000).ratio, 1);
	assert.equal(petStatus(20000).next, null);
	assert.equal(petStatus(99999).next, null);
});

test('출석 수호신 — 먹인 먹이 1·7·14·21·28·35개에 단계가 바뀐다', () => {
	assert.equal(attendancePetStatus(0).level, -1);
	assert.equal(attendancePetStatus(1).level, 0);
	assert.equal(attendancePetStatus(6).level, 0);
	assert.equal(attendancePetStatus(7).level, 1);
	assert.equal(attendancePetStatus(14).level, 2);
	assert.equal(attendancePetStatus(21).level, 3);
	assert.equal(attendancePetStatus(28).level, 4);
	assert.equal(attendancePetStatus(34).level, 4);
	assert.equal(attendancePetStatus(35).level, 5);
	assert.equal(attendancePetStatus(35).stage?.label, '황금 만리룡');
	assert.equal(attendancePetStatus(100).next, null);
});

test('오늘의 퀴즈 — 같은 날엔 같은 항목, 다른 날엔 다른 순서', () => {
	const a = pickDailyWordIds(ITEMS, '2026-09-06');
	const b = pickDailyWordIds(ITEMS, '2026-09-06');
	const c = pickDailyWordIds(ITEMS, '2026-09-07');
	assert.deepEqual(a, b);
	assert.equal(a.length, 5);
	assert.equal(new Set(a).size, 5);
	assert.notDeepEqual(a, c);
});

test('난이도 가중 — 시작할 땐 초급만, 배울수록 등급이 열린다', () => {
	assert.equal(openLevel(0), 1);
	assert.equal(openLevel(59), 1);
	assert.equal(openLevel(60), 2);
	assert.equal(openLevel(160), 3);
	assert.equal(openLevel(400), 4);
	// 갓 시작한 사람에겐 초급(1)만 나온다
	const first = pickByLevel(ITEMS, 0, 20);
	assert.equal(first.length, 20);
	assert.ok(first.every((item) => item.level === 1));
	// 충분히 배운 사람에겐 특급까지 나온다
	const later = pickByLevel(ITEMS, 500, 20);
	assert.equal(later.length, 20);
	assert.ok(later.every((item) => item.level === 4));
	// 초급이 모자란 주제에서도 개수는 채운다 (위 등급으로 넓힌다)
	const thin = ITEMS.filter((item) => topicOf(item) === 'olympic');
	const filled = pickByLevel(thin, 0, 20);
	assert.equal(filled.length, 20);
	assert.equal(new Set(filled.map((item) => item.id)).size, 20);
	// 전체보다 많이 달라고 해도 있는 만큼만, 중복 없이 준다
	const few = ITEMS.slice(0, 7);
	assert.equal(pickByLevel(few, 0, 20).length, 7);
	// 등급을 읽는 법을 바꿔 넣을 수 있다 — 한글 등급('초급')으로만 난이도를 들고 있는 자리가 있다
	const labeled = [
		{ tag: '초급', level: 1 },
		{ tag: '특급', level: 4 },
		{ tag: '초급', level: 1 },
	];
	const byLabel = pickByLevel(labeled, 0, 2, Math.random, (item) => ['초급', '중급', '고급', '특급'].indexOf(item.tag) + 1);
	assert.equal(byLabel.length, 2);
	assert.ok(byLabel.every((item) => item.tag === '초급'));
});

test('오늘의 퀴즈 — 배운 수를 넘기면 그 등급에서 뽑는다', () => {
	const ids = pickDailyWordIds(ITEMS, '2026-09-06', 5, 0);
	const picked = ids.map((id) => ITEMS.find((item) => item.id === id)!);
	assert.equal(picked.length, 5);
	assert.ok(picked.every((item) => item.level === 1));
});

test('학습 도메인 — 주제마다 보기를 채울 만큼은 있다', () => {
	// 오답 보기 셋을 같은 주제에서 뽑고도 여유가 있으려면 한 주제에 열두 개는 있어야 한다
	for (const topic of WORLD_TOPICS) {
		const count = ITEMS.filter((item) => topicOf(item) === topic.key).length;
		assert.ok(count >= 12, `${topic.key} 항목 부족 (${count}개)`);
	}
	// id 는 겹치지 않는다 — 겹치면 진도·오답 노트가 다른 항목을 가리킨다
	assert.equal(new Set(ITEMS.map((item) => item.id)).size, ITEMS.length);
});

test('오답 노트 — 틀리면 쌓이고 연속 정답으로 졸업한다', () => {
	const now = '2026-09-06T00:00:00.000Z';
	let { notes } = applyWrongLogs([], [{ wordId: 'daily-01', mode: 'meaning', selected: 'x', isCorrect: false }], now);
	assert.equal(notes.length, 1);
	assert.equal(notes[0].count, 1);
	for (let i = 0; i < WRONG_NOTE_GRADUATE; i++) {
		const result = applyWrongLogs(notes, [{ wordId: 'daily-01', mode: 'meaning', selected: 'o', isCorrect: true }], now);
		notes = result.notes;
		if (i === WRONG_NOTE_GRADUATE - 1) {
			assert.deepEqual(result.graduated, ['daily-01']);
		}
	}
	assert.equal(notes.length, 0);
	// 노트에 없는 항목을 맞히는 건 아무 일도 없다
	assert.equal(applyWrongLogs([], [{ wordId: 'x', mode: 'blank', selected: 'o', isCorrect: true }], now).notes.length, 0);
});

test('뱃지 — 조건을 채운 것만, 이미 받은 것은 빼고', () => {
	const snapshot = {
		learnedCount: 30,
		categoryDone: false,
		quizCount: 1,
		hasPerfect: false,
		dailyDoneCount: 0,
		streak: 3,
		graduatedCount: 0,
		bestTime: 0,
		bestTower: 0,
		exp: 0,
		bestCombo: 0,
		fastCount: 0,
		missionDoneCount: 0,
		stars: 0,
		// 수집·펫 계열 뱃지까지 포함한 스냅샷
		categoryDoneCount: 0,
		categoryTotal: 26,
		attendanceDays: 3,
		favoriteCount: 0,
		levelDoneCount: 0,
		levelTotal: 4,
		totalCorrect: 0,
		petFedCount: 0,
		wrongCleared: false,
	};
	assert.deepEqual(checkNewBadges(snapshot, []).sort(), ['first_quiz', 'first_study', 'learn_10', 'learn_30', 'streak_3']);
	assert.deepEqual(checkNewBadges(snapshot, ['first_quiz', 'first_study', 'learn_10', 'learn_30']), ['streak_3']);
	// 진행형 뱃지 — 콤보·번개·미션·별
	const grown = { ...snapshot, bestCombo: 10, fastCount: 30, missionDoneCount: 7, stars: 30 };
	assert.deepEqual(
		checkNewBadges(grown, ['first_quiz', 'first_study', 'learn_10', 'learn_30', 'streak_3']).sort(),
		// 콤보 10 을 찍으면 그 아래 구간(콤보 5)도 같이 들어온다
		['combo_10', 'combo_5', 'fast_30', 'mission_7', 'star_30'],
	);
});

test('타워 — 시간은 줄되 바닥이 있다', () => {
	assert.equal(towerTimeLimit(1), 15);
	assert.equal(towerTimeLimit(3), 14);
	assert.equal(towerTimeLimit(99), 5);
});

test('퀴즈 보너스 — 번개와 최대 콤보를 센다', () => {
	const log = (isCorrect: boolean, fast = false) => ({ wordId: 'x', mode: 'meaning' as const, selected: '', isCorrect, fast });
	assert.deepEqual(quizBonus([]), { fast: 0, maxCombo: 0 });
	// 번개 둘, 콤보는 끊겨서 2
	assert.deepEqual(quizBonus([log(true, true), log(true, true), log(false), log(true)]), { fast: 2, maxCombo: 2 });
	assert.deepEqual(quizBonus(Array.from({ length: 6 }, () => log(true))), { fast: 0, maxCombo: 6 });
	// 틀린 문제는 fast 여도 세지 않는다
	assert.equal(quizBonus([log(false, true)]).fast, 0);
});

test('오늘의 미션 — 목표를 채우면 끝, 셋 다 채우면 전체 완료', () => {
	const missions = freshMissions('2026-09-08');
	assert.equal(isMissionDone(missions, 'quiz'), false);
	missions.progress.quiz = 1;
	missions.progress.learn = 5;
	assert.equal(isMissionDone(missions, 'quiz'), true);
	assert.equal(allMissionsDone(missions), false);
	missions.progress.review = 2;
	assert.equal(allMissionsDone(missions), true);
});

test('카테고리 별점 — 전부 학습 · 80% · 만점이 각각 한 개', () => {
	const words = ITEMS.filter((item) => topicOf(item) === 'olympic');
	const none = new Set<string>();
	const all = new Set(words.map((item) => item.id));
	const at = '2026-09-08T00:00:00.000Z';
	assert.equal(categoryStars('olympic', words, none, []), 0);
	assert.equal(categoryStars('olympic', words, all, []), 1);
	// 4문제 판은 짧아서 안 센다
	assert.equal(categoryStars('olympic', words, none, [{ playedAt: at, source: 'category', category: 'olympic', total: 4, correct: 4 }]), 0);
	assert.equal(categoryStars('olympic', words, none, [{ playedAt: at, source: 'category', category: 'olympic', total: 5, correct: 4 }]), 1);
	assert.equal(categoryStars('olympic', words, all, [{ playedAt: at, source: 'category', category: 'olympic', total: 5, correct: 5 }]), 3);
	// 다른 주제 기록은 무시
	assert.equal(categoryStars('olympic', words, none, [{ playedAt: at, source: 'category', category: 'capital', total: 5, correct: 5 }]), 0);
});

test('결과 공유 글 — 문제 순서대로 이모지, 연속 출석은 2일부터', () => {
	assert.equal(dailyShareText([true, false, true], '2026-09-08', 1), '세계 상식 · 오늘의 퀴즈 2026-09-08\n🟩🟥🟩 2/3');
	assert.ok(dailyShareText([true], '2026-09-08', 3).endsWith('🔥 3일 연속 출석'));
});

test('펫 등급 구간 — 좁아지지 않고, 반복 퀴즈로 마지막 단계에 닿는다', () => {
	assert.deepEqual(
		PET_STAGES.map((stage) => stage.minExp),
		[0, 1000, 2000, 5000, 10000, 20000],
	);
	const bands = PET_STAGES.slice(1).map((stage, at) => stage.minExp - PET_STAGES[at].minExp);
	// 뒤 구간이 앞 구간보다 좁아지면 뒤로 갈수록 쉬워진다 — 그건 막는다
	bands.forEach((band, at) => at > 0 && assert.ok(band >= bands[at - 1], `구간 ${at} 이 앞 구간보다 좁다`));
	const top = PET_STAGES[PET_STAGES.length - 1].minExp;
	const correctsToTop = Math.ceil(top / EXP.correct);
	assert.ok(correctsToTop >= 1000 && correctsToTop <= 3000, `마지막 단계까지 필요한 정답 ${correctsToTop}개가 목표 범위를 벗어난다`);
});

test('경험치 기준 — 퀴즈·학습·출석·미션', () => {
	assert.equal(EXP.correct, 10);
	assert.equal(EXP.learnWord, 5);
	assert.equal(EXP.attendance, 10);
	assert.equal(EXP.daily, 10);
	assert.equal(EXP.mission, 10);
});

test('남은 경험치 환산 — 퀴즈 판수·정답 개수·항목 개수로 바꾼다', () => {
	// 일반 퀴즈 한 판 = 정답 10 × 10 = 100 EXP, 정답 하나 = 10 EXP, 항목 하나 = 5 EXP
	assert.deepEqual(expToActions(100), { quizzes: 1, corrects: 10, words: 20 });
	assert.deepEqual(expToActions(250), { quizzes: 3, corrects: 25, words: 50 });
	// 첫 등급(1000EXP)까지 — 판수와 문제 수가 10배로 맞물려야 계산이 읽힌다
	assert.deepEqual(expToActions(1000), { quizzes: 10, corrects: 100, words: 200 });
	// 딱 나눠지지 않으면 올린다 — "이만큼이면 모자란다" 로 읽히면 안 된다
	assert.deepEqual(expToActions(26), { quizzes: 1, corrects: 3, words: 6 });
	assert.deepEqual(expToActions(0), { quizzes: 0, corrects: 0, words: 0 });
	// 이미 넘어섰으면 음수가 나오지 않는다
	assert.deepEqual(expToActions(-40), { quizzes: 0, corrects: 0, words: 0 });
});

test('출석 먹이 — 매일 한 개, 7일마다 특별 보상으로 늘어난다', () => {
	assert.equal(attendanceFeedReward(0), 1);
	assert.equal(attendanceFeedReward(1), 1);
	assert.equal(attendanceFeedReward(6), 1);
	assert.equal(attendanceFeedReward(7), 3);
	assert.equal(attendanceFeedReward(14), 4);
	assert.equal(attendanceFeedReward(21), 5);
	assert.equal(attendanceFeedReward(28), 6);
	// 상한 — 28일을 넘어도 한 번에 6개까지만 준다
	assert.equal(attendanceFeedReward(35), 6);
	// 특별 출석이 아닌 날은 언제나 한 개
	for (let streak = 1; streak <= 60; streak++) {
		if (streak % ATTENDANCE_FEED_CYCLE !== 0) {
			assert.equal(attendanceFeedReward(streak), 1);
		}
	}
});

test('출석 먹이 — 다음 특별 출석까지 남은 날은 1~7 사이', () => {
	assert.equal(daysToFeedMilestone(0), 7);
	assert.equal(daysToFeedMilestone(1), 6);
	assert.equal(daysToFeedMilestone(6), 1);
	assert.equal(daysToFeedMilestone(7), 7);
});
