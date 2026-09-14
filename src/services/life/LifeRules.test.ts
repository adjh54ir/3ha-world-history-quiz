/**
 * 규칙 검증 — `yarn test:rules` (= node --test src/services/life/LifeRules.test.ts)
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	adCoinsLeft,
	WRONG_NOTE_GRADUATE,
	allMissionsDone,
	applyWrongLogs,
	categoryStars,
	dailyShareText,
	freshMissions,
	isMissionDone,
	isWeekend,
	needsShield,
	quizBonus,
	rollChest,
	attendanceReward,
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
	quizReward,
	splitRadicalName,
	towerTimeLimit,
} from './LifeRules.ts';
import { buildQuestion, buildQuestions } from './LifeQuizFactory.ts';
import { HOMOPHONE_WORDS, LIFE_WORDS, selectHomophones } from '../../const/data/life/ConstLifeWords.ts';
import { DECORS } from '../../const/data/life/ConstLifeDecor.ts';
import { LIFE_CATEGORIES } from '../../const/data/life/ConstLifeCategories.ts';
import { EXP, PET_STAGES, REWARD } from '../../const/data/life/ConstLifeRewards.ts';

test('스트릭 — 오늘 출석했으면 오늘부터, 아니면 어제부터 센다', () => {
	assert.equal(calcStreak(['2026-09-04', '2026-09-05', '2026-09-06'], '2026-09-06'), 3);
	assert.equal(calcStreak(['2026-09-04', '2026-09-05'], '2026-09-06'), 2);
	assert.equal(calcStreak(['2026-09-03'], '2026-09-06'), 0);
	assert.equal(calcStreak([], '2026-09-06'), 0);
});

test('출석 보상 — 연속 보너스는 상한에서 멈춘다', () => {
	assert.equal(attendanceReward(1), 10);
	assert.equal(attendanceReward(6), 20);
	assert.equal(attendanceReward(100), 40);
});

test('퀴즈 보상 — 만점이면 보너스', () => {
	assert.equal(quizReward(3, 5), 9);
	assert.equal(quizReward(5, 5), 25);
	assert.equal(quizReward(0, 0), 0);
});

test('펫 단계 — 경험치 구간과 진행률', () => {
	assert.equal(petStatus(0).level, 1);
	assert.equal(petStatus(990).ratio, 0.99);
	assert.equal(petStatus(1000).level, 2);
	assert.equal(petStatus(10000).level, 5);
	assert.equal(petStatus(10000).next?.minExp, 20000);
	assert.equal(petStatus(19999).level, 5);
	assert.equal(petStatus(20000).level, 6);
	assert.equal(petStatus(20000).stage.label, '황금 한자 신선');
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
	assert.equal(attendancePetStatus(35).stage?.label, '황금 천자룡');
	assert.equal(attendancePetStatus(100).next, null);
});

test('오늘의 퀴즈 — 같은 날엔 같은 단어, 다른 날엔 다른 순서', () => {
	const a = pickDailyWordIds(LIFE_WORDS, '2026-09-06');
	const b = pickDailyWordIds(LIFE_WORDS, '2026-09-06');
	const c = pickDailyWordIds(LIFE_WORDS, '2026-09-07');
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
	const first = pickByLevel(LIFE_WORDS, 0, 20);
	assert.equal(first.length, 20);
	assert.ok(first.every((word) => word.level === 1));
	// 충분히 배운 사람에겐 특급까지 나온다
	const later = pickByLevel(LIFE_WORDS, 500, 20);
	assert.equal(later.length, 20);
	assert.ok(later.every((word) => word.level === 4));
	// 초급이 모자란 분류에서도 개수는 채운다 (위 등급으로 넓힌다)
	const thin = LIFE_WORDS.filter((word) => word.category === 'history');
	const filled = pickByLevel(thin, 0, 20);
	assert.equal(filled.length, 20);
	assert.equal(new Set(filled.map((word) => word.id)).size, 20);
	// 전체보다 많이 달라고 해도 있는 만큼만, 중복 없이 준다
	const few = LIFE_WORDS.slice(0, 7);
	assert.equal(pickByLevel(few, 0, 20).length, 7);
	// 등급을 읽는 법을 바꿔 넣을 수 있다 — 이식 화면이 한글 등급('초급')을 쓰기 때문에 필요하다
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
	const ids = pickDailyWordIds(LIFE_WORDS, '2026-09-06', 5, 0);
	const words = ids.map((id) => LIFE_WORDS.find((item) => item.id === id)!);
	assert.equal(words.length, 5);
	assert.ok(words.every((word) => word.level === 1));
});

test('동음이의어 — 짝이 있는 단어만 출제되고 보기가 모두 같은 소리다', () => {
	// 짝이 없는 단어에 동음이의어를 배정하면 문항이 나오지 않는다
	const alone = LIFE_WORDS.find((word) => selectHomophones(word).length === 0)!;
	assert.equal(buildQuestion(alone, 'homophone', LIFE_WORDS), null);
	// 짝이 있으면 보기 넷에 같은 독음의 다른 한자가 반드시 섞인다
	let checked = 0;
	for (const word of HOMOPHONE_WORDS.slice(0, 120)) {
		const question = buildQuestion(word, 'homophone', LIFE_WORDS);
		assert.ok(question, `${word.id} 동음이의어 문항이 만들어져야 한다`);
		assert.equal(question.options.length, 4);
		assert.ok(question.options.includes(word.word));
		const sameSound = new Set(selectHomophones(word).map((item) => item.word));
		assert.ok(
			question.options.some((option) => sameSound.has(option)),
			`${word.id} 보기에 같은 소리의 다른 한자가 있어야 한다`,
		);
		checked += 1;
	}
	assert.ok(checked > 0);
});

test('동음이의어 — 짝 없는 단어에 걸려도 의미 찾기로 쏠리지 않는다', () => {
	const words = LIFE_WORDS.filter((word) => selectHomophones(word).length === 0).slice(0, 40);
	const questions = buildQuestions(words, LIFE_WORDS);
	assert.equal(questions.length, 40);
	assert.ok(questions.every((question) => question.mode !== 'homophone'));
	// 네 유형 가운데 셋이 고르게 섞여야 한다 — 한 유형이 절반을 넘으면 배정이 무너진 것
	const counts = questions.reduce<Record<string, number>>((map, question) => {
		map[question.mode] = (map[question.mode] ?? 0) + 1;
		return map;
	}, {});
	assert.ok(Math.max(...Object.values(counts)) <= questions.length * 0.5);
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
	// 노트에 없는 단어를 맞히는 건 아무 일도 없다
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
		chestCount: 0,
		missionDoneCount: 0,
		stars: 0,
		// 수집·펫·강화 계열 뱃지가 생긴 뒤로는 이 칸들도 채워야 스냅샷이 완성된다
		categoryDoneCount: 0,
		categoryTotal: 26,
		attendanceDays: 3,
		favoriteCount: 0,
		decorCount: 0,
		// 꾸미기를 하나도 안 샀지만 목록이 비어 있지는 않다 — 0 으로 두면 '꾸미기 완성'이 0/0 으로 통과해 버린다
		decorTotal: DECORS.length,
		levelDoneCount: 0,
		levelTotal: 4,
		totalCorrect: 0,
		petFedCount: 0,
		upgradeLevel: 0,
		wrongCleared: false,
	};
	assert.deepEqual(checkNewBadges(snapshot, []).sort(), ['first_quiz', 'first_study', 'learn_10', 'learn_30', 'streak_3']);
	assert.deepEqual(checkNewBadges(snapshot, ['first_quiz', 'first_study', 'learn_10', 'learn_30']), ['streak_3']);
	// 진행형 뱃지 — 콤보·번개·상자·미션·별
	const grown = { ...snapshot, bestCombo: 10, fastCount: 30, chestCount: 10, missionDoneCount: 7, stars: 30 };
	assert.deepEqual(
		checkNewBadges(grown, ['first_quiz', 'first_study', 'learn_10', 'learn_30', 'streak_3']).sort(),
		// 콤보 10 을 찍으면 그 아래 구간(콤보 5)도 같이 들어온다
		['chest_10', 'combo_10', 'combo_5', 'fast_30', 'mission_7', 'star_30'],
	);
});

test('스트릭 보호권 — 어제만 빠졌을 때만 필요하고, 막은 날은 스트릭에 이어진다', () => {
	assert.equal(needsShield(['2026-09-06'], [], '2026-09-08'), true);
	assert.equal(needsShield(['2026-09-07'], [], '2026-09-08'), false);
	assert.equal(needsShield(['2026-09-05'], [], '2026-09-08'), false);
	// 보호권으로 막은 어제가 있으면 오늘은 필요 없다
	assert.equal(needsShield(['2026-09-06'], ['2026-09-07'], '2026-09-08'), false);
	assert.equal(calcStreak(['2026-09-06', '2026-09-08'], '2026-09-08'), 1);
	assert.equal(calcStreak(['2026-09-06', '2026-09-08'], '2026-09-08', ['2026-09-07']), 3);
});

test('주말 — 토·일만', () => {
	assert.equal(isWeekend(new Date(2026, 8, 5)), true); // 토
	assert.equal(isWeekend(new Date(2026, 8, 6)), true); // 일
	assert.equal(isWeekend(new Date(2026, 8, 7)), false); // 월
});

test('타워 — 시간은 줄되 바닥이 있다', () => {
	assert.equal(towerTimeLimit(1), 15);
	assert.equal(towerTimeLimit(3), 14);
	assert.equal(towerTimeLimit(99), 5);
});

test('단어 데이터 — id 고유, 예문 빈칸 하나, 카테고리 유효, 글자 수 일치', () => {
	const ids = new Set(LIFE_WORDS.map((item) => item.id));
	assert.equal(ids.size, LIFE_WORDS.length);
	const categories = new Set(LIFE_CATEGORIES.map((item) => item.key));
	for (const word of LIFE_WORDS) {
		assert.ok(categories.has(word.category), `${word.id} 카테고리 없음`);
		assert.equal(word.examples.length, 2, `${word.id} 예문은 두 개여야 한다`);
		for (const example of word.examples) {
			assert.equal(example.split('{}').length, 2, `${word.id} 예문 빈칸은 하나여야 한다`);
		}
		assert.ok(word.level >= 1 && word.level <= 4, `${word.id} 난이도는 1~4 여야 한다`);
		assert.equal(word.chars.length, [...word.word].length, `${word.id} 글자 분해 수가 다르다`);
		assert.equal(word.chars.map((c) => c.char).join(''), word.word, `${word.id} 글자 분해가 단어와 다르다`);
	}
	// 카테고리마다 최소 12개는 있어야 보기 3개를 같은 분야에서 뽑고도 여유가 있다
	for (const category of LIFE_CATEGORIES) {
		assert.ok(LIFE_WORDS.filter((item) => item.category === category.key).length >= 12, `${category.key} 단어 부족`);
	}
});

test('퀴즈 생성 — 모든 단어·모든 유형에서 보기 4개가 나오고 정답이 들어 있다', () => {
	const questions = buildQuestions(LIFE_WORDS, LIFE_WORDS, ['meaning', 'hanja', 'blank']);
	assert.equal(questions.length, LIFE_WORDS.length);
	for (const q of questions) {
		assert.equal(q.options.length, 4, `${q.id} 보기 수`);
		assert.equal(new Set(q.options).size, 4, `${q.id} 보기 중복`);
		assert.ok(q.options.includes(q.answer), `${q.id} 정답 누락`);
	}
});

test('뜻 고르기 — 정답과 뜻이 겹치는 오답 보기가 나오지 않는다', () => {
	// 겹치면 두 보기가 다 정답이 된다. 데이터가 어긋나도 보기를 뽑는 자리에서 걸러야 한다.
	const grams = (meaning: string): Set<string> => {
		const text = meaning.replace(/[,·()\s]/g, '');
		const set = new Set<string>();
		for (let at = 0; at < text.length - 1; at++) {
			set.add(text.slice(at, at + 2));
		}
		return set;
	};
	const score = (a: Set<string>, b: Set<string>): number => {
		if (a.size === 0 || b.size === 0) {
			return 0;
		}
		const shared = [...a].filter((gram) => b.has(gram)).length;
		return shared / (a.size + b.size - shared);
	};
	const questions = buildQuestions(LIFE_WORDS, LIFE_WORDS, ['meaning']);
	for (const q of questions) {
		const answer = grams(q.answer);
		for (const option of q.options) {
			if (option === q.answer) {
				continue;
			}
			assert.ok(score(answer, grams(option)) < 0.75, `${q.id}: 오답 보기 '${option}' 이 정답 '${q.answer}' 과 너무 닮았다`);
		}
	}
});

test('퀴즈 보너스 — 번개는 +1, 5연속부터 정답 코인이 두 배', () => {
	const log = (isCorrect: boolean, fast = false) => ({ wordId: 'x', mode: 'meaning' as const, selected: '', isCorrect, fast });
	assert.deepEqual(quizBonus([]), { fast: 0, maxCombo: 0, coins: 0 });
	// 번개 둘, 콤보는 끊겨서 2
	assert.deepEqual(quizBonus([log(true, true), log(true, true), log(false), log(true)]), { fast: 2, maxCombo: 2, coins: 2 });
	// 6연속 — 5·6번째 정답에 +3 씩
	assert.deepEqual(quizBonus(Array.from({ length: 6 }, () => log(true))), { fast: 0, maxCombo: 6, coins: 6 });
	// 틀린 문제는 fast 여도 세지 않는다
	assert.equal(quizBonus([log(false, true)]).fast, 0);
});

test('보물상자 — 표에 있는 액수만 나오고 비중 순서대로 뽑힌다', () => {
	assert.equal(rollChest(() => 0), 10);
	assert.equal(rollChest(() => 0.49), 10);
	assert.equal(rollChest(() => 0.5), 20);
	assert.equal(rollChest(() => 0.8), 30);
	assert.equal(rollChest(() => 0.99), 50);
	for (let i = 0; i < 200; i++) {
		assert.ok([10, 20, 30, 50].includes(rollChest()));
	}
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
	const words = LIFE_WORDS.filter((item) => item.category === 'daily');
	const none = new Set<string>();
	const all = new Set(words.map((item) => item.id));
	const at = '2026-09-08T00:00:00.000Z';
	assert.equal(categoryStars('daily', words, none, []), 0);
	assert.equal(categoryStars('daily', words, all, []), 1);
	// 4문제 판은 짧아서 안 센다
	assert.equal(categoryStars('daily', words, none, [{ playedAt: at, source: 'category', category: 'daily', total: 4, correct: 4 }]), 0);
	assert.equal(categoryStars('daily', words, none, [{ playedAt: at, source: 'category', category: 'daily', total: 5, correct: 4 }]), 1);
	assert.equal(categoryStars('daily', words, all, [{ playedAt: at, source: 'category', category: 'daily', total: 5, correct: 5 }]), 3);
	// 다른 분야 기록은 무시
	assert.equal(categoryStars('daily', words, none, [{ playedAt: at, source: 'category', category: 'food', total: 5, correct: 5 }]), 0);
});

test('결과 공유 글 — 문제 순서대로 이모지, 연속 출석은 2일부터', () => {
	assert.equal(dailyShareText([true, false, true], '2026-09-08', 1), '세계 상식 · 오늘의 퀴즈 2026-09-08\n🟩🟥🟩 2/3');
	assert.ok(dailyShareText([true], '2026-09-08', 3).endsWith('🔥 3일 연속 출석'));
});

test('부수 이름 — 독음으로 끝나면 훈·음으로 쪼개고 별칭은 그대로 둔다', () => {
	assert.deepEqual(splitRadicalName('말두', ['두']), { hun: '말', eum: '두' });
	assert.deepEqual(splitRadicalName('구슬옥', ['옥']), { hun: '구슬', eum: '옥' });
	assert.deepEqual(splitRadicalName('초두머리', ['초']), { hun: '초두머리', eum: '' });
	assert.deepEqual(splitRadicalName('책받침', ['착']), { hun: '책받침', eum: '' });
	// 이름이 독음 하나만으로 되어 있으면 쪼갤 훈이 없다
	assert.deepEqual(splitRadicalName('두', ['두']), { hun: '두', eum: '' });
	assert.deepEqual(splitRadicalName(undefined), { hun: '', eum: '' });
});

test('펫 등급 구간 — 좁아지지 않고, 상한은 담긴 문제 수에 맞는다', () => {
	assert.deepEqual(
		PET_STAGES.map((stage) => stage.minExp),
		[0, 1000, 2000, 5000, 10000, 20000],
	);
	const bands = PET_STAGES.slice(1).map((stage, at) => stage.minExp - PET_STAGES[at].minExp);
	// 뒤 구간이 앞 구간보다 좁아지면 뒤로 갈수록 쉬워진다 — 그건 막는다
	bands.forEach((band, at) => at > 0 && assert.ok(band >= bands[at - 1], `구간 ${at} 이 앞 구간보다 좁다`));
	// '단어를 전부 학습' 했을 때 쌓이는 경험치 안에서 마지막 단계에 닿아야 한다
	const learnAll = LIFE_WORDS.length * EXP.learnWord;
	const top = PET_STAGES[PET_STAGES.length - 1].minExp;
	assert.ok(top > learnAll * 0.2 && top < learnAll * 0.8, `마지막 단계 ${top} EXP 가 전체 ${learnAll} EXP 대비 어긋난다`);
});

test('경험치는 코인과 따로 센다 — 퀴즈 정답 10, 단어 학습 5', () => {
	assert.equal(EXP.correct, 10);
	assert.equal(EXP.learnWord, 5);
	// 코인 값을 그대로 쓰면 등급이 상점 배율에 흔들린다 — 두 표가 붙어 버리지 않았는지 본다
	assert.notEqual(EXP.correct, REWARD.correct);
	assert.notEqual(EXP.learnWord, REWARD.learnWord);
});

test('남은 경험치 환산 — 퀴즈 판수·정답 개수·단어 개수로 바꾼다', () => {
	// 일반 퀴즈 한 판 = 정답 10 × 10 = 100 EXP, 정답 하나 = 10 EXP, 단어 하나 = 5 EXP
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

test('광고 보상 — 하루 정해진 횟수까지만, 날짜가 바뀌면 다시 열린다', () => {
	// 오늘 한 번도 안 받았으면 하루치가 그대로 남아 있다
	assert.equal(adCoinsLeft('2026-09-13', 0, '2026-09-13'), REWARD.adCoinDailyMax);
	assert.equal(adCoinsLeft('2026-09-13', 1, '2026-09-13'), REWARD.adCoinDailyMax - 1);
	// 다 받은 날은 0 — 더 받아도 코인이 붙지 않는다
	assert.equal(adCoinsLeft('2026-09-13', REWARD.adCoinDailyMax, '2026-09-13'), 0);
	// 저장된 횟수가 상한을 넘어도 음수로 내려가지 않는다
	assert.equal(adCoinsLeft('2026-09-13', 99, '2026-09-13'), 0);
	// 어제 다 받았어도 오늘은 하루치가 통째로 다시 열린다
	assert.equal(adCoinsLeft('2026-09-12', REWARD.adCoinDailyMax, '2026-09-13'), REWARD.adCoinDailyMax);
	// 한 번도 받은 적이 없는 저장본(날짜 없음)도 하루치가 열려 있다
	assert.equal(adCoinsLeft(undefined, undefined, '2026-09-13'), REWARD.adCoinDailyMax);
});
