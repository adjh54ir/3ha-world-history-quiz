/**
 * 공통 타입을 관리하는 모듈
 */
export declare namespace MainDataType {
	interface ProverbCharacter {
		/** 한자 한 글자 */
		char: string;

		/** 한자 의미 예: "돌 석" */
		meaning: string;

		/** 총 획수 */
		strokes: number;

		/** 부수 예: "石" */
		radical: string;
	}

	export interface ProverbType {
		/** 고유 ID */
		id: number;

		/** 한자어 한자 */
		hanja: string;

		/** 한자어 한글 발음 */
		hangul: string;

		shortMeaning: string;
		/** 한자어 뜻 */
		meaning: string;

		/** 한자어 예시 */
		example: string[];

		// 사자성의 유래
		originWord?: string;

		/**
		 * 분야 — 이 앱에서는 생활 한자어 카테고리 라벨('일상', '경제' …)이 들어온다.
		 * 원본은 17개 고정 union 이었지만 카테고리가 26개로 늘어 문자열로 넓혔다.
		 */
		category: string;

		/** 난이도 (예: 초급, 중급, 고급) */
		level: '전체' | '초급' | '중급' | '고급' | '특급';

		/** 한자어 구성 한자 배열 */
		characters: ProverbCharacter[];

		/** 연관 키워드 (예: 성과, 효율 등) */
		relatedWords: string[];

		blankChar?: string;
	}

	/**
	 * 사용자 학습 데이터 정의
	 */
	export interface UserStudyHistory {
		studyProverbs: number[]; // 학습 한자어 아이디 목록
		studyCounts?: { [id: string]: number }; // 각 한자어별 학습 횟수 (선택)
		badges?: string[]; // ✅ 학습 뱃지 ID 목록 추가
		lastStudyAt: Date;
	}

	/**
	 * 사용자 뱃지 데이터 정의
	 */
	/** 뱃지 희귀도 등급 */
	export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

	export interface UserBadge {
		id: string; // 'asia_master'
		name: string; // '아시아 마스터'
		description: string; // '아시아 국가 정답률 90% 이상' — 뱃지에 담긴 메시지/의미
		condition: string; // 획득 조건 (예: '한자어 10개 학습')
		rarity: BadgeRarity; // 희귀도 (common | rare | epic | legendary)
		iconType: string; // 아이콘 타입(FontAwesome6)
		icon: string; // 아이콘 이름(earth-asia)
		type: 'quiz' | 'study' | 'attendance';
		mascotImage?: any; // 선택적 이미지
	}
	/**
	 * 사용자 퀴즈 데이터 정의
	 */
	export interface UserQuizHistory {
		correctProverbId: number[]; // 사용자가 정답을 맞춘 한자어 아이디 목록 (예: [1, 2])
		wrongProverbId: number[]; // 사용자가 오답을 선택한 사저성어 아이디 목록
		lastAnsweredAt: Date; // 마지막으로 퀴즈를 푼 시간 (Date 객체 또는 ISO 문자열)
		quizCounts: { [id: number]: number }; // 각 한자어별 퀴즈 시도 횟수 (key는 사용자 아이디)
		badges: string[]; // 사용자가 획득한 뱃지의 ID 목록 (ex: ['asia_master', 'level1_perfect'])
		totalScore: number; // 사용자의 퀴즈 총 누적 점수
		bestCombo?: number; // 사용자가 기록한 가장 높은 연속 정답 수 (선택 값)
	}

	/**
	 * [공통] 설정 정보 관리
	 */
	export interface SettingInfo {
		isUseAlarm: boolean; // 알람 여부
		alarmTime: string; // 예: '2025-06-17T10:15:00' (ISO 형식의 문자열)
		alarmHour?: number; // 사용자가 선택한 현지 시각(0~23)
		timeZone?: string; // 저장 당시 기기 타임존
	}

	export interface TodayQuizList {
		quizDate: string;
		isCheckedIn: boolean;
		todayQuizIdArr: number[];
		correctQuizIdArr: number[];
		worngQuizIdArr: number[];
		answerResults: { [quizId: number]: boolean };
		selectedAnswers: {
			[quizId: number]: {
				value: string; // 보기 텍스트
				index: number; // 몇 번째 보기인지 (0부터 시작)
			};
		};
		prevQuizIdArr?: number[];
	}
	type AllTodayQuizzes = TodayQuizList[];

	// 개별 타임 챌린지 결과 타입
	export interface TimeChallengeResult {
		quizDate: string; // 챌린지를 푼 날짜 (예: '2025-06-18')
		finalScore: number; // 최종 획득 점수
		totalQuestions: number; // 출제된 전체 문제 수
		solvedQuestions: number; // 실제로 푼 문제 수 (정답 + 오답)
		correctCount: number; // 맞힌 문제 수
		wrongCount: number; // 틀린 문제 수
		maxCombo: number; // 최대 연속 정답 콤보 수
		timeUsedMs: number; // 사용한 시간 (단위: 밀리초)
		hasUsedChance: boolean; // 찬스 사요여부
		hasUsedSkip: boolean; // 스킵 기능을 사용했는지 여부
		quizIdList: number[]; // 출제된 한자어 ID 목록
		correctQuizIdList: number[]; // 정답 맞춘 문제의 ID 목록
		wrongQuizIdList: number[]; // 오답 문제의 ID 목록
	}
	// 전체 타임 챌린지 기록 배열 타입
	export type TimeChallengeHistory = TimeChallengeResult[];

	export type ProverbBook = {
		id: string;
		title: string;
		description: string;
		proverbIds: number[];
		createdAt: string;
		color: string;
		icon: string;
		isShared?: boolean; // 추가
		curatedId?: string; // 앱 기본 제공 추천 모음집에서 담아온 경우 그 키 (ConstCuratedBooks)
	};
	// 타입 수정
	interface AttemptRecord {
		timestamp: string;
		correctCount: number;
		wrongCount: number;
		accuracy: number;
	}

	export interface ProverbBookPracticeAttempt {
		timestamp: string;
		correctCount: number;
		wrongCount: number;
		accuracy: number;
	}

	export interface ProverbBookPracticeRecord {
		bookId: string;
		proverbIds: number[];
		attempts: ProverbBookPracticeAttempt[]; // 최대 3개
	}
}
