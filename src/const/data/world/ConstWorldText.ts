/**
 * 세계 상식 주제의 보이는 글자 (한국어)
 * -------------------------------------------------
 * 한국어 퀴즈 화면을 옮겨 오면서 다국어 키 대신 한국어를 그대로 쓴다 (화면 문구가 모두 한국어다).
 * 주제 키·모드 키는 ConstWorldTopics 와 같다 — 모드를 더하면 여기에도 이름·발문을 넣는다.
 * 원문은 옛 번역 파일(ko-KR.json 의 main.topic)이다.
 */
import type { WorldType } from '@/src/types/data/WorldType';

export interface TopicText {
	label: string;
	description: string;
	/** 모드 키 → 이름·발문 */
	modes: Record<string, { label: string; question: string }>;
}

export const WORLD_TOPIC_TEXT: Record<WorldType.TopicKey, TopicText> = {
	capital: {
		label: '세계 수도',
		description: '나라와 수도, 국기, 그리고 대륙',
		modes: {
			capital: { label: '수도 맞히기', question: '이곳의 수도는?' },
			continent: { label: '대륙 맞히기', question: '이곳이 속한 대륙은?' },
			country: { label: '나라 맞히기', question: '이 도시가 수도인 곳은?' },
			flag: { label: '국기 맞히기', question: '이 국기는 어디의 것일까?' },
		},
	},
	constellation: {
		label: '별자리와 천체',
		description: '밤하늘에서 찾아보는 이름들',
		modes: {
			image: { label: '그림 맞히기', question: '그림 속 별자리는?' },
			name: { label: '설명 보고 맞히기', question: '설명에 맞는 별자리는?' },
			season: { label: '언제 보이나', question: '밤하늘에서 언제 잘 보일까?' },
			star: { label: '대표 별', question: '이 별자리의 대표 별은?' },
		},
	},
	event: {
		label: '세계사 사건',
		description: '세상을 바꾼 그날, 언제 어디서',
		modes: {
			century: { label: '언제 일어났나', question: '이 일이 일어난 때는?' },
			country: { label: '어느 나라 일', question: '이 일과 가장 가까운 나라는?' },
			kind: { label: '무슨 일인가', question: '이 일은 무엇으로 분류될까?' },
			name: { label: '설명 보고 맞히기', question: '설명에 맞는 사건은?' },
		},
	},
	figure: {
		label: '세계 위인',
		description: '세상을 바꾼 사람들, 언제 어디서 무엇을',
		modes: {
			country: { label: '어느 나라 사람', question: '이 인물은 어느 나라 사람일까?' },
			era: { label: '언제 살았나', question: '이 인물이 주로 활동한 때는?' },
			name: { label: '설명 보고 맞히기', question: '설명에 맞는 인물은?' },
			portrait: { label: '초상 맞히기', question: '초상 속 인물은?' },
			role: { label: '무엇을 한 사람', question: '이 인물이 한 일은?' },
		},
	},
	landmark: {
		label: '세계 랜드마크',
		description: '사진으로 익숙한 그곳은 어디에',
		modes: {
			city: { label: '어디에 있나', question: '이 랜드마크가 있는 곳은?' },
			country: { label: '나라 맞히기', question: '이 랜드마크가 있는 나라는?' },
			name: { label: '설명 보고 맞히기', question: '설명에 맞는 랜드마크는?' },
			photo: { label: '사진 맞히기', question: '사진 속 랜드마크는?' },
		},
	},
	myth: {
		label: '그리스 로마 신화',
		description: '신과 영웅, 그리고 괴물',
		modes: {
			domain: { label: '무엇을 맡았나', question: '이 인물이 맡은 자리는?' },
			name: { label: '설명 보고 맞히기', question: '설명에 맞는 인물은?' },
			portrait: { label: '그림 맞히기', question: '그림 속 인물은?' },
			roman: { label: '로마 이름', question: '이 신의 로마식 이름은?' },
		},
	},
	nature: {
		label: '세계 지형',
		description: '지도에서 찾는 강과 산, 사막과 호수',
		modes: {
			continent: { label: '어느 대륙', question: '이곳이 있는 대륙은?' },
			country: { label: '어느 나라', question: '이곳이 있는 나라는?' },
			name: { label: '설명 보고 맞히기', question: '설명에 맞는 곳은?' },
		},
	},
	olympic: {
		label: '하계 올림픽',
		description: '개최 도시와 종합 1위',
		modes: {
			city: { label: '개최 도시', question: '이 대회가 열린 도시는?' },
			host: { label: '개최국', question: '이 대회를 연 나라는?' },
			top: { label: '종합 1위', question: '이 대회에서 금메달을 가장 많이 딴 나라는?' },
		},
	},
	space: {
		label: '태양계',
		description: '행성과 위성, 그 바깥까지',
		modes: {
			image: { label: '그림 맞히기', question: '그림 속 천체는?' },
			kind: { label: '천체 갈래', question: '이 천체는 무엇으로 분류될까?' },
			name: { label: '설명 보고 맞히기', question: '설명에 맞는 천체는?' },
			order: { label: '몇 번째 행성', question: '태양에서 몇 번째 행성일까?' },
		},
	},
	winter: {
		label: '동계 올림픽',
		description: '눈과 얼음 위의 개최지와 1위',
		modes: {
			city: { label: '개최 도시', question: '이 대회가 열린 도시는?' },
			host: { label: '개최국', question: '이 대회를 연 나라는?' },
			top: { label: '종합 1위', question: '이 대회에서 금메달을 가장 많이 딴 나라는?' },
		},
	},
	worldcup: {
		label: '월드컵',
		description: '개최국과 우승국의 역사',
		modes: {
			host: { label: '개최국', question: '이 대회를 연 나라는?' },
			runnerUp: { label: '준우승국', question: '이 대회의 준우승국은?' },
			winner: { label: '우승국', question: '이 대회의 우승국은?' },
		},
	},
};

/**
 * 학습 카드 '정보' 표에 띄울 필드 이름.
 * 여기 없는 필드(code·image·hemisphere 처럼 그림 열쇠이거나 다른 값과 겹치는 것)는 표에 나오지 않는다.
 */
export const WORLD_FIELD_LABELS: Record<string, string> = {
	capital: '수도',
	continent: '대륙',
	country: '나라',
	city: '도시',
	era: '시대',
	role: '분야',
	century: '시기',
	kind: '갈래',
	roman: '로마 이름',
	domain: '맡은 일',
	symbol: '상징',
	order: '태양에서',
	host: '개최국',
	feature: '특징',
	star: '대표 별',
	season: '보이는 때',
	winner: '우승국',
	runnerUp: '준우승국',
	top: '종합 1위',
};

/** 주제마다 뜻이 다른 필드 — 태양계의 host 는 개최국이 아니라 그 천체가 도는 중심이다 */
const TOPIC_FIELD_LABELS: Partial<Record<WorldType.TopicKey, Record<string, string>>> = {
	space: { host: '도는 곳' },
};

export const fieldLabel = (topic: WorldType.TopicKey, field: string): string | undefined => TOPIC_FIELD_LABELS[topic]?.[field] ?? WORLD_FIELD_LABELS[field];
