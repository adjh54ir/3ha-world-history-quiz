/**
 * 이식 화면이 쓰는 그림 — 이름은 원본(사자성어 앱)을 그대로 두고 그림만 이 앱 전용 에셋으로 바꾼다.
 *
 * 원본은 `require('@/assets/images/screen_fox_*.png')` 처럼 파일을 직접 가리켰다.
 * 같은 이름의 파일을 복사해 두면 29MB가 그대로 늘어나므로, 이름 → 실제 그림 매핑만 여기 둔다.
 * 새 화면을 더 이식할 때 필요한 이름이 생기면 여기에 한 줄만 추가한다.
 */
const great = require('@/src/assets/illustrations/lion-result-great.webp');
const retry = require('@/src/assets/illustrations/lion-result-retry.webp');
const wrong = require('@/src/assets/illustrations/lion-wrong.webp');
const avatar = require('@/src/assets/illustrations/lion-avatar.webp');
const attendance = require('@/src/assets/illustrations/lion-attendance.webp');

/** 학습 카드 배경 — 생활 상황 스물두 장 */
const study = [
	require('@/src/assets/illustrations/hanja-situation-01.webp'),
	require('@/src/assets/illustrations/hanja-situation-02.webp'),
	require('@/src/assets/illustrations/hanja-situation-03.webp'),
	require('@/src/assets/illustrations/hanja-situation-04.webp'),
	require('@/src/assets/illustrations/hanja-situation-05.webp'),
	require('@/src/assets/illustrations/hanja-situation-06.webp'),
	require('@/src/assets/illustrations/hanja-situation-07.webp'),
	require('@/src/assets/illustrations/hanja-situation-08.webp'),
	require('@/src/assets/illustrations/hanja-situation-09.webp'),
	require('@/src/assets/illustrations/hanja-situation-10.webp'),
	require('@/src/assets/illustrations/hanja-situation-11.webp'),
	require('@/src/assets/illustrations/hanja-situation-12.webp'),
	require('@/src/assets/illustrations/hanja-situation-13.webp'),
	require('@/src/assets/illustrations/hanja-situation-14.webp'),
	require('@/src/assets/illustrations/hanja-situation-15.webp'),
	require('@/src/assets/illustrations/hanja-situation-16.webp'),
	require('@/src/assets/illustrations/hanja-situation-17.webp'),
	require('@/src/assets/illustrations/hanja-situation-18.webp'),
	require('@/src/assets/illustrations/hanja-situation-19.webp'),
	require('@/src/assets/illustrations/hanja-situation-20.webp'),
	require('@/src/assets/illustrations/hanja-situation-21.webp'),
	require('@/src/assets/illustrations/hanja-situation-22.webp'),
];

/** 등급 마스코트 — 사자가 자라는 여섯 단계 */
const stage = [
	require('@/src/assets/illustrations/lion-stage-1.webp'),
	require('@/src/assets/illustrations/lion-stage-2.webp'),
	require('@/src/assets/illustrations/lion-stage-3.webp'),
	require('@/src/assets/illustrations/lion-stage-4.webp'),
	require('@/src/assets/illustrations/lion-stage-5.webp'),
	require('@/src/assets/illustrations/lion-stage-6-golden.webp'),
];

/** 출석 보상 전용 청룡 — 알에서 부화해 황금 서예 수호신으로 성장한다 */
const pet = [
	require('@/src/assets/illustrations/azure-dragon-stage-1.webp'),
	require('@/src/assets/illustrations/azure-dragon-stage-2.webp'),
	require('@/src/assets/illustrations/azure-dragon-stage-3.webp'),
	require('@/src/assets/illustrations/azure-dragon-stage-4.webp'),
	require('@/src/assets/illustrations/azure-dragon-stage-5.webp'),
	require('@/src/assets/illustrations/azure-dragon-stage-6-golden.webp'),
];

const FourImages = {
	mainIcon: require('@/src/assets/mainIcon.webp'),
	favorite: avatar,
	no_data: wrong,

	screen_fox_quiz_complete: great,
	screen_fox_quiz_retry: retry,
	screen_fox_quiz_correct: require('@/src/assets/illustrations/lion-quiz-correct.webp'),
	screen_fox_quiz_wrong: require('@/src/assets/illustrations/lion-quiz-wrong.webp'),
	screen_fox_quiz_timeout: require('@/src/assets/illustrations/lion-quiz-timeout.webp'),
	screen_fox_study_complete: require('@/src/assets/illustrations/lion-study-complete.webp'),
	screen_fox_time_challenge: require('@/src/four/assets/time-challenge-hero.webp'),
	screen_fox_time_challenge_complete: require('@/src/assets/illustrations/lion-time-challenge-complete.webp'),
	screen_fox_wrong_clear: great,
	screen_fox_wrong_review: require('@/src/assets/illustrations/lion-wrong-review-hero.webp'),
	screen_fox_review_start: wrong,
	screen_fox_check_in: attendance,
	screen_fox_quiz_start: avatar,
	screen_fox_daily_quiz: require('@/src/assets/quiz/today-quiz-arrived.webp'),
	screen_fox_loading: avatar,

	study_random1: study[0],
	study_random2: study[1],
	study_random3: study[2],
	study_random4: study[3],
	study_random5: study[4],
	study_random6: study[5],
	study_random7: study[6],
	study_random8: study[7],
	study_random9: study[8],
	study_random10: study[9],

	study_idiom_random1: study[0],
	study_idiom_random2: study[1],
	study_idiom_random3: study[2],
	study_idiom_random4: study[3],
	study_idiom_random5: study[4],
	study_idiom_random6: study[5],
	study_idiom_random7: study[6],
	study_idiom_random8: study[7],
	study_idiom_random9: study[8],
	study_idiom_random10: study[9],
	study_idiom_random11: study[10],
	study_idiom_random12: study[11],
	study_idiom_random13: study[12],
	study_idiom_random14: study[13],
	study_idiom_random15: study[14],
	study_idiom_random16: study[15],

	level1_mascote: stage[0],
	level2_mascote: stage[1],
	level3_mascote: stage[2],
	level4_mascote: stage[3],
	level5_mascote: stage[4],
	level6_mascote: stage[5],
	level7_mascote: stage[5],

	pet_dragon_level0: pet[0],
	pet_dragon_level1: pet[1],
	pet_dragon_level2: pet[2],
	pet_dragon_level3: pet[3],
	pet_dragon_level4: pet[4],
	pet_dragon_level5: pet[5],
};

export default FourImages;
