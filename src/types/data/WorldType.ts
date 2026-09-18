import type { ColorToken } from '@/src/const/ConstColors';

/**
 * 세계사·세계 상식 학습 데이터 타입
 * -------------------------------------------------
 * 학습 단위는 "항목(Entry)" 하나다. 나라 하나, 랜드마크 하나, 신 하나, 천체 하나, 대회 한 번.
 *
 * 주제마다 들고 있는 값이 다르다 (나라는 수도·대륙, 대회는 개최국·우승국).
 * 그래서 고정 필드로 쪼개지 않고 `fields` 한 자루에 담고,
 * 어떤 값을 묻고 어떤 값을 답으로 쓸지는 주제별 `QuizMode` 가 정한다.
 * 주제를 하나 더 붙일 때 타입도 문제 생성기도 건드릴 일이 없다.
 */
export namespace WorldType {
	/** 주제 열쇠 — 항목 id 앞머리와 같다 (capital-001 …) */
	export type TopicKey = 'capital' | 'landmark' | 'nature' | 'figure' | 'event' | 'myth' | 'space' | 'constellation' | 'worldcup' | 'olympic' | 'winter';

	/**
	 * 난이도 — 한국 학습자에게 얼마나 익숙한지로 매긴다. 문제가 어려운 정도가 아니라 **항목이 낯선 정도**다.
	 * 1 초급 — 항목도 답도 누구나 안다 (프랑스·오리온자리·1988 서울 올림픽)
	 * 2 중급 — 항목을 잘 알고 답도 들어 봤다 (헝가리·황소자리)
	 * 3 고급 — 항목 이름은 익숙하다. 뉴스·스포츠·지리 시간에 듣는다 (잠비아·마차부자리)
	 * 4 특급 — 이름부터 낯설거나, 나라가 아닌 자치령·속령이다 (토켈라우·에리다누스자리)
	 *
	 * 한 주제가 4등급으로 쏠리면 처음 켠 사람이 뒤쪽에서 벽을 만난다 (ConstWorldData.test.ts 가 본다).
	 */
	export type Level = 1 | 2 | 3 | 4;

	/** 항목 하나 */
	export interface Entry {
		id: string;
		/** 표제 — 학습 카드 앞면에 크게 나온다 (나라 이름·랜드마크 이름·신 이름·천체 이름·대회 이름) */
		name: string;
		level: Level;
		/** 한 줄 설명 — 카드 뒷면 첫 줄 */
		summary: string;
		/**
		 * 학습 카드·숏폼에 쓰는 곁가지 — 두 줄로 쓴다.
		 * `[string, string]` 로 못 박으면 JSON 에서 읽어 온 `string[]` 을 그대로 받지 못한다.
		 * 개수는 ConstWorldData.test.ts 가 지킨다.
		 */
		facts: string[];
		/** 주제별 값 주머니 — 열쇠 목록은 ConstWorldTopics 의 modes 가 쓰는 것과 같다 */
		fields: Record<string, string>;
	}

	/**
	 * 한 주제에서 낼 수 있는 문제 유형.
	 * `ask`·`answer` 는 값이 있는 자리를 가리킨다 — 'name' 이거나 `fields` 의 열쇠.
	 */
	export interface QuizMode {
		/** 번역 키의 한 조각이기도 하다 — 이름·발문은 topic.<주제>.mode.<key>.label / .question 에 있다 */
		key: string;
		ask: string;
		answer: string;
		/**
		 * 문제를 글자가 아니라 그림으로 보여 준다. `ask` 에서 꺼낸 값이 그림을 찾는 열쇠다.
		 * 'flag'   — ConstFlagImages 의 selectFlag 로 국기를 건다
		 * 'myth'   — ConstMythImages 의 selectMythImage 로 인물 그림을 건다
		 * 'space'  — ConstPlanetImages 의 selectPlanetImage 로 천체 그림을 건다
		 * 'constellation' — ConstConstellationImages 의 별자리 그림을 건다
		 * 'figure'   — ConstFigureImages 의 selectFigureImage 로 위키미디어 초상 주소를 만든다
		 * 'landmark' — 같은 방식으로 위키미디어 랜드마크 사진 주소를 만든다
		 */
		askAs?: 'flag' | 'myth' | 'space' | 'constellation' | 'figure' | 'landmark';
		/**
		 * 답이 나라 이름이라는 표시 — 보기와 사전 값 옆에 국기를 함께 건다.
		 * 국기 맞히기 모드(`askAs: 'flag'`)에는 절대 붙이지 않는다. 답이 국기인데 보기에 국기를 달면 답이 드러난다.
		 */
		answerAs?: 'flag';
	}

	export interface Topic {
		/** 번역 키의 뿌리이기도 하다 — 이름·소개는 topic.<key>.label / .description 에 있다 */
		key: TopicKey;
		/** MaterialCommunityIcons 이름 */
		icon: string;
		/** 카드 배경·아이콘 색 (팔레트 토큰) */
		color: ColorToken;
		tint: ColorToken;
		/**
		 * 오답 보기를 먼저 뽑을 무리를 가르는 `fields` 열쇠 (없으면 주제 전체에서 뽑는다).
		 * 신 문제의 오답이 괴물 설명이면 읽지 않고도 답이 보인다.
		 */
		groupBy?: string;
		modes: QuizMode[];
	}

	export interface Question {
		id: string;
		topic: TopicKey;
		/** QuizMode 의 key */
		mode: string;
		entry: Entry;
		/** 발문 아래 크게 보여 줄 값 */
		prompt: string;
		/** 발문의 번역 키 — 화면에서 t() 로 문장을 만든다 (문장을 담으면 언어를 바꿔도 안 바뀐다) */
		questionKey: string;
		answer: string;
		/** 보기 4개 (정답 포함, 섞인 상태) */
		options: string[];
	}
}
