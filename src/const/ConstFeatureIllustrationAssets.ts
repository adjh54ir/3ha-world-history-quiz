/**
 * 기능별 대표 그림 — 역사 사자 (세계 상식 퀴즈 마스코트)
 * 한국어 퀴즈는 조선풍 소품 그림(두루마리·먹·나침반)을 썼다. 세계 앱의 얼굴인 사자로 톤을 맞췄다.
 * 새로 그린 그림이 아니라 세계 앱에 이미 있던 사자 그림을 기능에 맞게 골라 건 것이다 (lion-prompts.md).
 */
export const FEATURE_ILLUSTRATIONS = {
	todayQuiz: require('@/src/assets/illustrations/lion/lion-attendance.webp'),
	timeChallenge: require('@/src/assets/illustrations/lion/lion-time-result.webp'),
	matchGame: require('@/src/assets/illustrations/lion/lion-study.webp'),
	ranking: require('@/src/assets/illustrations/lion/lion-result-great.webp'),
	league: require('@/src/assets/illustrations/lion/lion-stage-6-golden.webp'),
	levelTest: require('@/src/assets/illustrations/lion/lion-stats-progress.webp'),
	typeTest: require('@/src/assets/illustrations/lion/lion-splash-charge.webp'),
} as const;

export default FEATURE_ILLUSTRATIONS;
