/**
 * 통합 학습 → 퀴즈 흐름에서 사용하는 공용 타입 모듈
 * - 수도·랜드마크·위인 등 서로 다른 주제 데이터를 "동일한 계약(contract)"으로 다루기 위한 공통 모델
 * - 원본 데이터는 도메인별로 분리 유지하고, 경계(어댑터)에서 이 형태로 정규화한다.
 */
import type { WorldType } from '@/src/types/data/WorldType';

export declare namespace LearnType {
	/**
	 * 학습/퀴즈 도메인(데이터셋) 키 — 세계 상식 주제 키와 같다 (capital·landmark·…).
	 * 주제를 더하려면 WorldType.TopicKey 와 LearnHubService 의 domains 에 함께 넣는다.
	 */
	export type Domain = WorldType.TopicKey;

	/** (구) 호환용 별칭 */
	export type Category = Domain;

	/** 퀴즈 문항 유형 — 향후 input/arrange 등으로 확장 */
	export type QuizKind = 'choice' | 'ox';

	/**
	 * 전역 식별자
	 * - 도메인 prefix를 붙여 데이터셋을 가로질러 고유함을 보장한다. 예: "spelling-12"
	 * - 통합 오답노트 / 즐겨찾기 / 통계에서 사용
	 */
	export type Uid = string;

	/**
	 * 학습 카드 공통 모델
	 */
	export interface StudyCard {
		id: number; // 원본 데이터 ID (도메인 내부 기준)
		uid: Uid; // 전역 고유 ID
		domain: Domain; // 소속 도메인
		title: string; // 메인 표기 (나라·인물·랜드마크 이름)
		subTitle?: string; // 보조 표기
		meaning: string; // 핵심 뜻 / 설명
		description?: string; // 상세 설명 (긴 의미, 정답 해설 등)
		examples?: string[]; // 더 알아보기 (곁가지 이야기)
		stories?: string[]; // 짧은 이야기 1~3편 (신화)
		tags?: string[]; // 연관 키워드
		levelLabel?: string; // 난이도 라벨 (쉬움/중급 등)
		categoryLabel?: string; // 세부 카테고리 라벨 (인간관계 등)
		options?: string[]; // 대조 보기 (정답+헷갈리는 표기)
		infoRows?: { label: string; value: string }[]; // 기본 정보 묶음 (수도: 수도/대륙)
		imageRef?: ImageRef; // 항목 그림 (국기·초상·사진) — WorldImageRef.resolveImageRef 로 푼다
	}

	/**
	 * 퀴즈 표준 시드(Seed)
	 * - 각 도메인 어댑터가 만들어내는 "출제 재료". 보기 생성/셔플은 공용 팩토리가 담당한다.
	 */
	export interface QuizSeed {
		id: number; // 원본 데이터 ID
		uid: Uid; // 전역 고유 ID
		domain: Domain; // 소속 도메인
		group?: string; // 오답 보기 그룹핑 키 (세부 카테고리). 같은 그룹에서 오답을 우선 추출
		guide: string; // 문제 안내 문구
		prompt: string; // 문제 본문
		subPrompt?: string; // 보조 표기
		answer: string; // 정답 텍스트
		explanation: string; // 정답 해설
		fixedOptions?: string[]; // 데이터가 보기를 직접 제공하는 경우. 있으면 자동 보기 생성 생략
		level?: string; // 난이도 라벨 (선택)
		categoryLabel?: string; // 카테고리 라벨 (선택)
		examples?: string[]; // 더 알아보기 (선택, 해설용)
		imageRef?: ImageRef; // 문제 그림 (선택)
	}

	/**
	 * 퀴즈 문항 공통 모델 (화면 렌더링 계약)
	 */
	export interface QuizQuestion {
		id: number; // 원본 데이터 ID
		uid: Uid; // 전역 고유 ID
		domain: Domain; // 소속 도메인
		kind: QuizKind; // 문항 유형(렌더러 분기 키)
		guide: string; // 문제 안내 문구
		prompt: string; // 문제 본문
		subPrompt?: string; // 보조 표기
		options: string[]; // 보기 목록
		answerIndex: number; // 정답 인덱스
		explanation: string; // 정답 해설
		level?: string; // 난이도 라벨 (선택)
		categoryLabel?: string; // 카테고리 라벨 (선택)
		examples?: string[]; // 더 알아보기 (선택, 해설용)
		/** 그림 문항(국기·초상·사진 맞히기) — 있으면 prompt 대신 그림을 문제로 보여 준다 */
		imageRef?: ImageRef;
		/** 보기가 나라 이름이라 보기마다 작은 국기를 붙인다 (국기 맞히기 문항에는 절대 붙이지 않는다 — 답이 드러난다) */
		optionFlags?: boolean;
	}

	/**
	 * 그림 참조 — 'flag:np', 'figure:Homer.jpg' 꼴의 문자열.
	 * require 번호나 주소를 그대로 담지 않는 이유: 오답노트처럼 AsyncStorage 에 저장되는 자리가 있어서다.
	 */
	export type ImageRef = string;

	/**
	 * 도메인 표시 메타 정보 (진입 화면 카드용)
	 */
	export interface DomainMeta {
		key: Domain;
		title: string; // 카드 제목 (예: 세계 수도)
		subtitle: string; // 카드 설명
		icon: string; // IconComponent name
		iconType: string; // IconComponent type
		color: string; // 강조 색상
		total: number; // 전체 데이터 수
		mainIcon?: number; // 앱 메인 아이콘 이미지(require) — 있으면 IconComponent 대신 이미지 노출
	}

	/** 학습/퀴즈 생성 시 필터 옵션 */
	export interface BuildOptions {
		category?: string; // 세부 카테고리 필터
		count?: number; // 생성 개수
	}
}
