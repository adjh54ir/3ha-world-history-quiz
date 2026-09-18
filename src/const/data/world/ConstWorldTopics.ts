import type { WorldType } from '@/src/types/data/WorldType';

/**
 * 세계 상식 주제 — 주제 하나가 카테고리 하나이자 JSON 파일 하나다.
 *
 * 보이는 글자(주제 이름·소개, 모드 이름·발문)는 번역 파일에 있다:
 *   topic.<주제키>.label / .description
 *   topic.<주제키>.mode.<모드키>.label / .question
 * 모듈 상수는 앱이 읽히는 순간 한 번 만들어져 언어를 바꿔도 다시 만들어지지 않으므로,
 * 여기에는 키와 그림·색만 둔다.
 * -------------------------------------------------
 * 이 파일에는 JSON 을 들이지 않는다 (데이터는 ConstWorldEntries 가 모은다).
 * `node --test` 로 도는 데이터 검증이 JSON import 문법 없이 이 목록만 읽어 갈 수 있어야 하기 때문이다.
 *
 * modes 의 `ask`·`answer` 는 값이 있는 자리를 가리킨다.
 *   'name'    — 항목 표제
 *   'summary' — 한 줄 설명 (설명 보고 맞히기)
 *   그 밖     — Entry.fields 의 열쇠
 * 항목이 그 열쇠를 갖고 있지 않으면 그 문항은 만들지 않는다.
 *
 * `answerAs: 'flag'` 는 답이 나라 이름이라는 표시다 — 보기와 사전 값 옆에 국기가 함께 붙는다.
 * 국기 맞히기 모드에는 붙이지 않는다 (답이 국기인데 보기마다 국기를 달면 고를 것이 없다).
 * 보기가 서로 달라야 하므로 한 모드에서 쓰는 값이 네 가지는 넘어야 한다.
 */
export const WORLD_TOPICS: WorldType.Topic[] = [
	{
		key: 'capital',
		icon: 'earth',
		color: 'primary',
		tint: 'primaryBg',
		groupBy: 'continent',
		// 발문에 "나라" 라고 못 박지 않는다 — 데이터에 홍콩·괌·그린란드 같은 자치령·속령이 섞여 있다
		modes: [
			{ key: 'capital', ask: 'name', answer: 'capital' },
			{ key: 'country', ask: 'capital', answer: 'name', answerAs: 'flag' },
			{ key: 'flag', ask: 'code', answer: 'name', askAs: 'flag' },
			{ key: 'continent', ask: 'name', answer: 'continent' },
		],
	},
	{
		key: 'landmark',
		icon: 'castle',
		color: 'accentAmberDark',
		tint: 'accentAmberSoft',
		groupBy: 'continent',
		modes: [
			{ key: 'country', ask: 'name', answer: 'country', answerAs: 'flag' },
			{ key: 'city', ask: 'name', answer: 'city' },
			{ key: 'photo', ask: 'image', answer: 'name', askAs: 'landmark' },
			{ key: 'name', ask: 'summary', answer: 'name' },
		],
	},
	{
		key: 'nature',
		icon: 'terrain',
		color: 'successDark',
		tint: 'secondaryBg',
		groupBy: 'continent',
		// 랜드마크와 경계를 나눈다 — 랜드마크는 사진으로 아는 그곳, 지형은 지도에서 찾는 것.
		// 후지산·할롱베이처럼 사진으로 먼저 아는 자연물은 랜드마크에 두고 여기 또 넣지 않는다.
		modes: [
			{ key: 'continent', ask: 'name', answer: 'continent' },
			// 여러 나라에 걸친 것(나일강·알프스산맥)은 나라를 비워 둔다 — 그 항목은 이 문항이 안 나온다
			{ key: 'country', ask: 'name', answer: 'country', answerAs: 'flag' },
			{ key: 'name', ask: 'summary', answer: 'name' },
		],
		// `kind`(강·산맥·사막)는 문제로 내지 않는다. 이름에 갈래가 이미 들어 있어
		// '나일강은 무엇일까' 가 되어 버린다 (문제 생성기가 전부 걷어낸다). 오답을 가르는 데만 쓴다.
	},
	{
		key: 'figure',
		icon: 'account-star',
		color: 'primaryDeep',
		tint: 'secondarySoft',
		// 오답을 같은 시대에서 먼저 뽑는다 — 20세기 인물의 오답이 고대 철학자면 읽지 않고도 걸러진다
		groupBy: 'era',
		modes: [
			{ key: 'country', ask: 'name', answer: 'country', answerAs: 'flag' },
			{ key: 'role', ask: 'name', answer: 'role' },
			{ key: 'era', ask: 'name', answer: 'era' },
			// 초상은 앱에 담지 않고 위키미디어에서 받아 온다 (ConstFigureImages 참고)
			{ key: 'portrait', ask: 'image', answer: 'name', askAs: 'figure' },
			{ key: 'name', ask: 'summary', answer: 'name' },
		],
	},
	{
		key: 'event',
		icon: 'script-text',
		color: 'primaryDark',
		tint: 'accentAmberSoft',
		// 오답을 같은 갈래에서 먼저 뽑는다 — 혁명 문제의 오답이 조약이면 읽지 않고도 걸러진다
		groupBy: 'kind',
		modes: [
			// 연도가 아니라 세기로 묻는다. 보기에 연도 넷을 나란히 놓으면 아는 사람도 찍게 된다
			{ key: 'century', ask: 'name', answer: 'century' },
			// 여러 나라가 얽힌 사건(세계 대전·흑사병)은 나라를 비워 둔다 — 그 항목은 이 문항이 안 나온다
			{ key: 'country', ask: 'name', answer: 'country', answerAs: 'flag' },
			// 이름에 갈래가 적힌 사건(백년 전쟁·명예혁명)은 문제 생성기가 알아서 뺀다 (답이 문제에 들어 있다)
			{ key: 'kind', ask: 'name', answer: 'kind' },
			{ key: 'name', ask: 'summary', answer: 'name' },
		],
	},
	{
		key: 'myth',
		icon: 'lightning-bolt',
		color: 'secondaryDark',
		tint: 'secondaryBg',
		groupBy: 'kind',
		modes: [
			{ key: 'roman', ask: 'name', answer: 'roman' },
			{ key: 'domain', ask: 'name', answer: 'domain' },
			{ key: 'portrait', ask: 'image', answer: 'name', askAs: 'myth' },
			{ key: 'name', ask: 'summary', answer: 'name' },
		],
	},
	{
		key: 'space',
		icon: 'orbit',
		color: 'primaryDeep',
		tint: 'primarySoft',
		groupBy: 'kind',
		modes: [
			{ key: 'order', ask: 'name', answer: 'order' },
			{ key: 'kind', ask: 'name', answer: 'kind' },
			{ key: 'image', ask: 'image', answer: 'name', askAs: 'space' },
			{ key: 'name', ask: 'summary', answer: 'name' },
		],
	},
	{
		key: 'constellation',
		icon: 'star-four-points',
		color: 'textStrong',
		tint: 'surfaceAlt',
		groupBy: 'kind',
		modes: [
			{ key: 'image', ask: 'image', answer: 'name', askAs: 'constellation' },
			{ key: 'star', ask: 'name', answer: 'star' },
			// 별자리와 성운·은하를 함께 묻는다. 남반구 하늘 것은 계절 대신 '남반구 하늘' 이 답이다
			{ key: 'season', ask: 'name', answer: 'season' },
			{ key: 'name', ask: 'summary', answer: 'name' },
		],
	},
	{
		key: 'worldcup',
		icon: 'soccer',
		color: 'successDark',
		tint: 'successSoft',
		modes: [
			{ key: 'host', ask: 'name', answer: 'host', answerAs: 'flag' },
			{ key: 'winner', ask: 'name', answer: 'winner', answerAs: 'flag' },
			{ key: 'runnerUp', ask: 'name', answer: 'runnerUp', answerAs: 'flag' },
		],
	},
	{
		key: 'winter',
		icon: 'snowflake',
		color: 'primaryDark',
		tint: 'primarySoft',
		modes: [
			{ key: 'city', ask: 'name', answer: 'city' },
			{ key: 'host', ask: 'name', answer: 'host', answerAs: 'flag' },
			// 1948·2014·2026 은 종합 1위를 비워 뒀다 (ConstWorldEntries 참고) — 그 세 회차는 이 문항이 안 나온다
			{ key: 'top', ask: 'name', answer: 'top', answerAs: 'flag' },
		],
	},
	{
		key: 'olympic',
		icon: 'medal',
		color: 'errorDark',
		tint: 'errorSoft',
		modes: [
			{ key: 'city', ask: 'name', answer: 'city' },
			{ key: 'host', ask: 'name', answer: 'host', answerAs: 'flag' },
			{ key: 'top', ask: 'name', answer: 'top', answerAs: 'flag' },
		],
	},
];

export const selectTopic = (key: WorldType.TopicKey): WorldType.Topic =>
	WORLD_TOPICS.find((topic) => topic.key === key) ?? WORLD_TOPICS[0];
