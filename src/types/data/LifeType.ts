import type { ColorToken } from '@/src/const/ConstColors';

/**
 * 생활 한자 학습 데이터 타입
 * -------------------------------------------------
 * 학습 단위는 "항목" 이다 (지금 도메인은 세계 상식 — ConstWorldDomain 참고). 주제(카테고리)로 묶는다.
 */
export namespace LifeType {
	/**
	 * 학습 갈래 키 — 항목 id 앞머리와 같다 (capital-kor · myth-001 …).
	 *
	 * 예전에는 한자 분야 26개를 못 박은 유니온이었다. 지금은 세계 상식 주제(ConstWorldTopics)가
	 * 이 자리를 채우므로 넓혀 둔다 — 주제를 더해도 타입을 고칠 일이 없다.
	 */
	export type CategoryKey = string;

	export interface Category {
		key: CategoryKey;
		label: string;
		description: string;
		/** MaterialCommunityIcons 이름 */
		icon: string;
		/** 카드 배경·아이콘 색 (팔레트 토큰) */
		color: ColorToken;
		tint: ColorToken;
	}

	/** 단어를 이루는 한자 한 글자 */
	export interface WordChar {
		char: string;
		hun: string;
		eum: string;
	}

	/**
	 * 단어 난이도 — 자주 쓰는 말일수록 낮다.
	 * 1 초급 · 2 중급 · 3 고급 · 4 특급
	 */
	export type Level = 1 | 2 | 3 | 4;

	/** 한자어 한 개 */
	export interface Word {
		id: string;
		/** 한자 표기 */
		word: string;
		/** 한글 독음 */
		reading: string;
		/** 난이도 등급 (1 초급 ~ 4 특급) */
		level: Level;
		meaning: string;
		/** 예문 두 개 — 단어가 들어갈 자리는 `{}` 로 비워 둔다 */
		examples: [string, string];
		category: CategoryKey;
		chars: WordChar[];
	}

	/** 퀴즈 유형 */
	export type QuizMode =
		| 'meaning' // 단어를 보고 뜻 고르기
		| 'hanja' // 뜻·독음을 보고 한자 고르기
		| 'blank' // 예문 빈칸에 들어갈 단어 고르기
		| 'homophone'; // 독음이 같은 한자 넷 중 뜻에 맞는 것 고르기

	export interface Question {
		id: string;
		mode: QuizMode;
		word: Word;
		/** 이번 문항에 쓸 예문 번호 — 같은 단어라도 회차마다 다른 문장이 나온다 */
		exampleAt: number;
		/** 정답 보기 값 */
		answer: string;
		/** 보기 4개 (정답 포함, 섞인 상태) */
		options: string[];
	}

	export interface AnswerLog {
		wordId: string;
		mode: QuizMode;
		selected: string;
		isCorrect: boolean;
		/** 3초 안에 맞혔는지 — 번개 보너스 (타이머 없는 화면은 비워 둔다) */
		fast?: boolean;
	}

	/** 오늘의 미션 종류 — 퀴즈 한 판 · 단어 학습 · 오답 복습 */
	export type MissionKey = 'quiz' | 'learn' | 'review';

	export interface Mission {
		key: MissionKey;
		label: string;
		goal: number;
		/** MaterialCommunityIcons 이름 */
		icon: string;
	}

	/** 오늘의 미션 진행 — 날짜가 바뀌면 통째로 새로 만든다 */
	export interface DailyMissions {
		/** YYYY-MM-DD */
		date: string;
		progress: Record<MissionKey, number>;
		/** 셋 다 채워 보너스를 받았는지 */
		claimed: boolean;
	}

	/** 퀴즈 한 판의 보너스 — 결과 화면에 "번개 3 · 최대 콤보 7" 로 보여 준다 */
	export interface QuizBonus {
		fast: number;
		maxCombo: number;
	}

	/** 퀴즈 출제 방식 */
	export type QuizSource = 'category' | 'daily' | 'wrong' | 'time' | 'tower';

	export interface QuizRecord {
		/** ISO 일시 */
		playedAt: string;
		source: QuizSource;
		category?: CategoryKey;
		total: number;
		correct: number;
		/** 챌린지 점수 — 타임은 점수, 타워는 오른 층. 일반 퀴즈는 없다 */
		score?: number;
	}

	/** 오답 노트 항목 */
	export interface WrongNote {
		wordId: string;
		count: number;
		/** 마지막으로 틀린 일시(ISO) */
		lastAt: string;
		/** 마지막으로 틀린 뒤 연속으로 맞힌 횟수 — 목표치를 채우면 졸업 */
		passed: number;
	}

	/** 오늘의 퀴즈 (하루 1세트) */
	export interface DailyQuiz {
		/** YYYY-MM-DD */
		date: string;
		wordIds: string[];
		done: boolean;
		correct: number;
	}

	export interface PetStage {
		/** 이 경험치부터 이 단계 */
		minExp: number;
		label: string;
		emoji: string;
	}

	export interface AttendancePetStage {
		/** 이 누적 먹이 수부터 이 단계 — 출석으로 받은 먹이를 직접 줘야 오른다 */
		minFeeds: number;
		label: string;
	}

	/** 뱃지 희귀도 — 따기 어려운 순서대로 네 단계 */
	export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

	export interface Badge {
		id: string;
		/** 뱃지 이름 */
		label: string;
		/** 뱃지 설명 — 무슨 뱃지인지 한 줄 */
		description: string;
		/** 획득 조건 — 무엇을 해야 받는지 한 줄 (설명과 따로 둔다) */
		requirement: string;
		/** 희귀도 — 색·별 개수·연출 세기를 여기서 정한다 */
		rarity: BadgeRarity;
		/** MaterialCommunityIcons 이름 */
		icon: string;
	}

	export interface EarnedBadge {
		id: string;
		/** 획득 일시(ISO) */
		at: string;
	}
}
