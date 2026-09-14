/**
 * 페이지 경로 — Expo Router 의 실제 라우트 경로(소문자/kebab)와 일치시킨다.
 * 여기 있는 값은 전부 `app/` 아래에 실제 파일이 있는 라우트다.
 *
 * 탭은 여섯 칸이다 — 단어 / 오늘의 퀴즈 / 홈 / 나의 활동 / 통계 / 설정.
 * 학습·퀴즈 시작처럼 "한 번 들어갔다 나오는" 화면은 탭이 아니라 홈의 액션 카드에서 연다.
 */
export const enum Paths {
	MAIN_TAB = 'main', // 메인 탭 네비게이터

	WORDS = 'words', // 생활 한자어 목록 (탭)
	TODAY = 'today', // 오늘의 퀴즈 (탭)
	HOME = 'home', // 홈 (탭)
	PROFILE = 'profile', // 나의 활동 — 펫·기록·뱃지·꾸미기 (탭)
	STATS = 'stats', // 통계 — 학습·퀴즈·출석·챌린지 기록 (탭)
	SETTING = 'setting', // 설정 (탭)

	LEARN = 'learn', // 카테고리 학습
	GRADE = 'grade', // 펫 등급 안내
	SHOP = 'shop', // 상점 — 코인 소모처 (꾸미기·보호권·펫 간식·행운의 상자)
	STUDY = 'study', // 학습 카드
	SHORTS = 'shorts', // 숏폼 학습 — 세로로 넘기며 한 화면에 한 단어
	QUIZ = 'quiz', // 4지선다 퀴즈 (category | daily | wrong)
	WRONG = 'wrong', // 오답 복습
	TIME_CHALLENGE = 'time-challenge', // 타임 챌린지
	TIME_CHALLENGE_INIT = 'time-challenge-init', // 타임 챌린지 시작·최고 기록
	TOWER = 'tower', // 타워 챌린지 — 층 목록
	TOWER_QUIZ = 'tower-quiz', // 타워 챌린지 — 한 층 5문제

	/** 세계 상식 — 수도·랜드마크·신화·태양계·별자리·월드컵·올림픽 */
	WORLD = 'world', // 주제 고르기
	WORLD_STUDY = 'world-study', // 카드 학습
	WORLD_QUIZ = 'world-quiz', // 4지선다 퀴즈

	/** (이식 호환) 광고 컴포넌트가 화면을 구분할 때 쓰는 키 — 실제 라우트는 아니다 */
	QUIZ_MAIN = 'quiz-main',
}

/** 탭 안에 있는 화면으로 이동할 때 쓰는 경로 — `/main/home` 처럼 앞에 탭 경로가 붙는다 */
export const tabPath = (tab: Paths): string => `${Paths.MAIN_TAB}/${tab}`;
