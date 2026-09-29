/**
 * 페이지의 경로를 관리합니다.
 * 값은 Expo Router 의 실제 라우트 경로(소문자/kebab)와 일치시킵니다.
 * → 화면 내부에서는 toHref/toExpoPath 헬퍼로 URL 이동합니다.
 */
export const enum Paths {
	HOME = 'home', // 메인 페이지 (탭)
	MAIN_TAB = 'main', // 메인 탭 네비게이터
	TODAY_QUIZ = 'today-quiz', // 오늘의 퀴즈 (탭)
	INIT_TIME_CHANLLENGE = 'init-time-challenge', // 타임 챌린지 진입
	TIME_CHANLLENGE = 'time-challenge', // 타임 챌린지
	QUIZ = 'quiz', // 퀴즈
	QUIZ_MAIN = 'quiz-main', // (이식 호환) 광고 컴포넌트 참조용 — 실제 라우트 없음
	QUIZ_ARRANGE = 'quiz-arrange', // (이식 호환) 실제 라우트 없음
	QUIZ_PUZZLE = 'quiz-puzzle',
	QUIZ_STUDY = 'quiz-study', // 퀴즈 학습
	QUIZ_WRONG = 'quiz-wrong', // 오답노트
	QUIZ_MODE = 'quiz-mode', // 퀴즈 모드
	QUIZ_INIT_MODE = 'quiz-init-mode', // 퀴즈 모드 선택
	TOWER_CHANLLENGE = 'tower-challenge',
	FAVORITE = 'favorite',
	TOWER_QUIZ = 'tower-quiz',
	LIST = 'list', // (이식 호환) 목록
	RESULT = 'result', // 나의 활동 (탭)
	BADGE_DETAIL = 'badge-detail', // 획득 뱃지 상세
	MY_PROVERB_BOOK = 'my-proverb-book',
	MY_PROVERB_BOOK_DETAIL = 'my-proverb-book-detail',
	LEARN_HUB = 'learn-hub', // 통합 학습 허브 진입
	LEARN_STUDY = 'learn-study', // 통합 학습(카드)
	LEARN_QUIZ = 'learn-quiz', // 통합 퀴즈(4지선다)
	SETTING = 'setting', // 설정 (탭)
	EXAMPLE = 'example',
	MAIN_REFRENCE = 'main-refrence',
	FN_NOTIFICATION = 'fn-notification',
	FN_ADVERTISEMENT = 'fn-advertisement',
	FN_PERMISSION = 'fn-permission',
	FN_LANGUAGE = 'fn-language',
}
