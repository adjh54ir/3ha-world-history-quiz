import type { WorldType } from '@/src/types/data/WorldType';

/**
 * 세계 상식 주제 — 주제 하나가 카테고리 하나이자 JSON 파일 하나다.
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
		label: '세계 수도',
		description: '나라와 수도, 국기, 그리고 대륙',
		icon: 'earth',
		color: 'primary',
		tint: 'primaryBg',
		groupBy: 'continent',
		// 발문에 "나라" 라고 못 박지 않는다 — 데이터에 홍콩·괌·그린란드 같은 자치령·속령이 섞여 있다
		modes: [
			{ key: 'capital', label: '수도 맞히기', question: '이곳의 수도는?', ask: 'name', answer: 'capital' },
			{ key: 'country', label: '나라 맞히기', question: '이 도시가 수도인 곳은?', ask: 'capital', answer: 'name', answerAs: 'flag' },
			{ key: 'flag', label: '국기 맞히기', question: '이 국기는 어디의 것일까?', ask: 'code', answer: 'name', askAs: 'flag' },
			{ key: 'continent', label: '대륙 맞히기', question: '이곳이 속한 대륙은?', ask: 'name', answer: 'continent' },
		],
	},
	{
		key: 'landmark',
		label: '세계 랜드마크',
		description: '사진으로 익숙한 그곳은 어디에',
		icon: 'castle',
		color: 'accentAmberDark',
		tint: 'accentAmberSoft',
		groupBy: 'continent',
		modes: [
			{ key: 'country', label: '나라 맞히기', question: '이 랜드마크가 있는 나라는?', ask: 'name', answer: 'country', answerAs: 'flag' },
			{ key: 'city', label: '어디에 있나', question: '이 랜드마크가 있는 곳은?', ask: 'name', answer: 'city' },
			{ key: 'photo', label: '사진 맞히기', question: '사진 속 랜드마크는?', ask: 'image', answer: 'name', askAs: 'landmark' },
			{ key: 'name', label: '설명 보고 맞히기', question: '설명에 맞는 랜드마크는?', ask: 'summary', answer: 'name' },
		],
	},
	{
		key: 'nature',
		label: '세계 지형',
		description: '지도에서 찾는 강과 산, 사막과 호수',
		icon: 'terrain',
		color: 'successDark',
		tint: 'secondaryBg',
		groupBy: 'continent',
		// 랜드마크와 경계를 나눈다 — 랜드마크는 사진으로 아는 그곳, 지형은 지도에서 찾는 것.
		// 후지산·할롱베이처럼 사진으로 먼저 아는 자연물은 랜드마크에 두고 여기 또 넣지 않는다.
		modes: [
			{ key: 'continent', label: '어느 대륙', question: '이곳이 있는 대륙은?', ask: 'name', answer: 'continent' },
			// 여러 나라에 걸친 것(나일강·알프스산맥)은 나라를 비워 둔다 — 그 항목은 이 문항이 안 나온다
			{ key: 'country', label: '어느 나라', question: '이곳이 있는 나라는?', ask: 'name', answer: 'country', answerAs: 'flag' },
			{ key: 'name', label: '설명 보고 맞히기', question: '설명에 맞는 곳은?', ask: 'summary', answer: 'name' },
		],
		// `kind`(강·산맥·사막)는 문제로 내지 않는다. 이름에 갈래가 이미 들어 있어
		// '나일강은 무엇일까' 가 되어 버린다 (문제 생성기가 전부 걷어낸다). 오답을 가르는 데만 쓴다.
	},
	{
		key: 'figure',
		label: '세계 위인',
		description: '세상을 바꾼 사람들, 언제 어디서 무엇을',
		icon: 'account-star',
		color: 'primaryDeep',
		tint: 'secondarySoft',
		// 오답을 같은 시대에서 먼저 뽑는다 — 20세기 인물의 오답이 고대 철학자면 읽지 않고도 걸러진다
		groupBy: 'era',
		modes: [
			{ key: 'country', label: '어느 나라 사람', question: '이 인물은 어느 나라 사람일까?', ask: 'name', answer: 'country', answerAs: 'flag' },
			{ key: 'role', label: '무엇을 한 사람', question: '이 인물이 한 일은?', ask: 'name', answer: 'role' },
			{ key: 'era', label: '언제 살았나', question: '이 인물이 주로 활동한 때는?', ask: 'name', answer: 'era' },
			// 초상은 앱에 담지 않고 위키미디어에서 받아 온다 (ConstFigureImages 참고)
			{ key: 'portrait', label: '초상 맞히기', question: '초상 속 인물은?', ask: 'image', answer: 'name', askAs: 'figure' },
			{ key: 'name', label: '설명 보고 맞히기', question: '설명에 맞는 인물은?', ask: 'summary', answer: 'name' },
		],
	},
	{
		key: 'event',
		label: '세계사 사건',
		description: '세상을 바꾼 그날, 언제 어디서',
		icon: 'script-text',
		color: 'primaryDark',
		tint: 'accentAmberSoft',
		// 오답을 같은 갈래에서 먼저 뽑는다 — 혁명 문제의 오답이 조약이면 읽지 않고도 걸러진다
		groupBy: 'kind',
		modes: [
			// 연도가 아니라 세기로 묻는다. 보기에 연도 넷을 나란히 놓으면 아는 사람도 찍게 된다
			{ key: 'century', label: '언제 일어났나', question: '이 일이 일어난 때는?', ask: 'name', answer: 'century' },
			// 여러 나라가 얽힌 사건(세계 대전·흑사병)은 나라를 비워 둔다 — 그 항목은 이 문항이 안 나온다
			{ key: 'country', label: '어느 나라 일', question: '이 일과 가장 가까운 나라는?', ask: 'name', answer: 'country', answerAs: 'flag' },
			// 이름에 갈래가 적힌 사건(백년 전쟁·명예혁명)은 문제 생성기가 알아서 뺀다 (답이 문제에 들어 있다)
			{ key: 'kind', label: '무슨 일인가', question: '이 일은 무엇으로 분류될까?', ask: 'name', answer: 'kind' },
			{ key: 'name', label: '설명 보고 맞히기', question: '설명에 맞는 사건은?', ask: 'summary', answer: 'name' },
		],
	},
	{
		key: 'myth',
		label: '그리스 로마 신화',
		description: '신과 영웅, 그리고 괴물',
		icon: 'lightning-bolt',
		color: 'secondaryDark',
		tint: 'secondaryBg',
		groupBy: 'kind',
		modes: [
			{ key: 'roman', label: '로마 이름', question: '이 신의 로마식 이름은?', ask: 'name', answer: 'roman' },
			{ key: 'domain', label: '무엇을 맡았나', question: '이 인물이 맡은 자리는?', ask: 'name', answer: 'domain' },
			{ key: 'portrait', label: '그림 맞히기', question: '그림 속 인물은?', ask: 'image', answer: 'name', askAs: 'myth' },
			{ key: 'name', label: '설명 보고 맞히기', question: '설명에 맞는 인물은?', ask: 'summary', answer: 'name' },
		],
	},
	{
		key: 'space',
		label: '태양계',
		description: '행성과 위성, 그 바깥까지',
		icon: 'orbit',
		color: 'primaryDeep',
		tint: 'primarySoft',
		groupBy: 'kind',
		modes: [
			{ key: 'order', label: '몇 번째 행성', question: '태양에서 몇 번째 행성일까?', ask: 'name', answer: 'order' },
			{ key: 'kind', label: '천체 갈래', question: '이 천체는 무엇으로 분류될까?', ask: 'name', answer: 'kind' },
			{ key: 'image', label: '그림 맞히기', question: '그림 속 천체는?', ask: 'image', answer: 'name', askAs: 'space' },
			{ key: 'name', label: '설명 보고 맞히기', question: '설명에 맞는 천체는?', ask: 'summary', answer: 'name' },
		],
	},
	{
		key: 'constellation',
		label: '별자리와 천체',
		description: '밤하늘에서 찾아보는 이름들',
		icon: 'star-four-points',
		color: 'textStrong',
		tint: 'surfaceAlt',
		groupBy: 'kind',
		modes: [
			{ key: 'image', label: '그림 맞히기', question: '그림 속 별자리는?', ask: 'image', answer: 'name', askAs: 'constellation' },
			{ key: 'star', label: '대표 별', question: '이 별자리의 대표 별은?', ask: 'name', answer: 'star' },
			// 별자리와 성운·은하를 함께 묻는다. 남반구 하늘 것은 계절 대신 '남반구 하늘' 이 답이다
			{ key: 'season', label: '언제 보이나', question: '밤하늘에서 언제 잘 보일까?', ask: 'name', answer: 'season' },
			{ key: 'name', label: '설명 보고 맞히기', question: '설명에 맞는 별자리는?', ask: 'summary', answer: 'name' },
		],
	},
	{
		key: 'worldcup',
		label: '월드컵',
		description: '개최국과 우승국의 역사',
		icon: 'soccer',
		color: 'successDark',
		tint: 'successSoft',
		modes: [
			{ key: 'host', label: '개최국', question: '이 대회를 연 나라는?', ask: 'name', answer: 'host', answerAs: 'flag' },
			{ key: 'winner', label: '우승국', question: '이 대회의 우승국은?', ask: 'name', answer: 'winner', answerAs: 'flag' },
			{ key: 'runnerUp', label: '준우승국', question: '이 대회의 준우승국은?', ask: 'name', answer: 'runnerUp', answerAs: 'flag' },
		],
	},
	{
		key: 'winter',
		label: '동계 올림픽',
		description: '눈과 얼음 위의 개최지와 1위',
		icon: 'snowflake',
		color: 'primaryDark',
		tint: 'primarySoft',
		modes: [
			{ key: 'city', label: '개최 도시', question: '이 대회가 열린 도시는?', ask: 'name', answer: 'city' },
			{ key: 'host', label: '개최국', question: '이 대회를 연 나라는?', ask: 'name', answer: 'host', answerAs: 'flag' },
			// 1948·2014·2026 은 종합 1위를 비워 뒀다 (ConstWorldEntries 참고) — 그 세 회차는 이 문항이 안 나온다
			{ key: 'top', label: '종합 1위', question: '이 대회에서 금메달을 가장 많이 딴 나라는?', ask: 'name', answer: 'top', answerAs: 'flag' },
		],
	},
	{
		key: 'olympic',
		label: '하계 올림픽',
		description: '개최 도시와 종합 1위',
		icon: 'medal',
		color: 'errorDark',
		tint: 'errorSoft',
		modes: [
			{ key: 'city', label: '개최 도시', question: '이 대회가 열린 도시는?', ask: 'name', answer: 'city' },
			{ key: 'host', label: '개최국', question: '이 대회를 연 나라는?', ask: 'name', answer: 'host', answerAs: 'flag' },
			{ key: 'top', label: '종합 1위', question: '이 대회에서 금메달을 가장 많이 딴 나라는?', ask: 'name', answer: 'top', answerAs: 'flag' },
		],
	},
];

export const selectTopic = (key: WorldType.TopicKey): WorldType.Topic =>
	WORLD_TOPICS.find((topic) => topic.key === key) ?? WORLD_TOPICS[0];
