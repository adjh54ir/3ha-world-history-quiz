/**
 * 이식 화면이 쓰는 경로 이름.
 * 값은 이 앱 Expo Router 의 실제 파일 경로(app/*.tsx)와 같아야 한다.
 * 원본에만 있던 화면(나의 단어장·한자 조각 배열 퀴즈)은 옮기지 않아 홈으로 보낸다.
 */
export const enum Paths {
	MAIN_TAB = 'main',
	HOME = 'home',
	SETTING = 'setting',

	/** 학습 카드 */
	QUIZ_STUDY = 'study',
	/** 퀴즈 1단계 — 유형 고르기 */
	QUIZ_INIT_MODE = 'quiz-mode',
	/** 퀴즈 2단계 — 난이도·분야 고르기 */
	QUIZ_MODE = 'quiz-scope',
	/** 4지선다 퀴즈 */
	QUIZ = 'quiz',
	/** 오답 노트 */
	QUIZ_WRONG = 'wrong',
	/** 타임 챌린지 시작 화면(랭킹) */
	INIT_TIME_CHANLLENGE = 'time-challenge-init',
	/** 타임 챌린지 본편 */
	TIME_CHANLLENGE = 'time-challenge',
	/** 오늘의 퀴즈 — 탭 안에 있어 경로가 두 칸이다 */
	TODAY_QUIZ = 'main/today',
	/** 타워 챌린지 — 층 목록 */
	TOWER_CHANLLENGE = 'tower',
	/** 타워 챌린지 — 한 층 5문제 */
	TOWER_QUIZ = 'tower-quiz',

	/** 옮기지 않은 화면 — 눌러도 홈으로 돌아간다 */
	NOT_PORTED = 'main',
}

/** 원본 코드가 쓰던 이름 — 옮기지 않은 화면이라 전부 홈으로 간다 */
export const QUIZ_ARRANGE = Paths.NOT_PORTED;
export const MY_PROVERB_BOOK = Paths.NOT_PORTED;

export default Paths;
