import FourImages from '@/src/four/assets/FourImages';
/** 레벨 임계값 (공통 상수) */
export const LEVEL_THRESHOLDS = [
	{ level: 1, threshold: 0 },
	{ level: 2, threshold: 400 }, // 40문제
	{ level: 3, threshold: 1200 }, // 120문제
	{ level: 4, threshold: 2400 }, // 240문제
	{ level: 5, threshold: 4000 }, // 400문제
	{ level: 6, threshold: 6000 }, // 600문제
	{ level: 7, threshold: 8000 }, // 800문제 (만점의 80%)
] as const;

export const LEVEL_DATA = [
	{
		score: 0,
		next: 400,
		label: '서생(書生)',
		icon: 'seedling',
		mascot: FourImages.level1_mascote,
		encouragement: '🌱 첫걸음을 뗐습니다! 이제 한자어의 세계로!',
		description: '공부를 막 시작한 초보 단계.\n고전을 펼치며 지식을 탐색하는 시기입니다.',
		feeling: '입문자, 예비 학자',
		exampleMessage: '이제 막 붓을 들었습니다!',
	},
	{
		score: 400,
		next: 1200,
		label: '수습(修習)',
		icon: 'leaf',
		mascot: FourImages.level2_mascote,
		encouragement: '📘 하나하나 뜻을 알아가는 중입니다. 잘하고 있습니다!',
		description: '기초를 다지며 차근차근 실력을 쌓아가는 단계.\n한자어의 의미와 구조를 익히는 시기입니다.',
		feeling: '초급 훈련자',
		exampleMessage: '조금씩 뜻을 깨우치고 있습니다!',
	},
	{
		score: 1200,
		next: 2400,
		label: '학자(學者)',
		icon: 'book',
		mascot: FourImages.level3_mascote,
		encouragement: '📖 여러 한자어가 익숙해졌습니다! 멋집니다!',
		description: '본격적으로 지식을 탐구하고 연구하는 단계.\n의미 분석과 예시 활용이 능숙해집니다.',
		feeling: '중급 지식인',
		exampleMessage: '학문은 끝이 없습니다!',
	},
	{
		score: 2400,
		next: 4000,
		label: '강자(講者)',
		icon: 'chalkboard-user',
		mascot: FourImages.level4_mascote,
		encouragement: '🗣 배운 내용을 잘 설명할 수 있습니다! 전문가 같습니다!',
		description: '배운 지식을 남에게 설명하고 가르칠 수 있는 실력자.\n한자어를 논리적으로 풀어낼 수 있습니다.',
		feeling: '상급 학습자, 전달자',
		exampleMessage: '이제 설명도 척척!',
	},
	{
		score: 4000,
		next: 6000,
		label: '현인(賢人)',
		icon: 'trophy',
		mascot: FourImages.level5_mascote,
		encouragement: '🏆 이제 웬만한 성어는 다 알고 있군요!',
		description: '지혜롭고 통찰력 있는 지식의 달인.\n연관 한자어도 꿰뚫는 통찰력이 생깁니다.',
		feeling: '고급 지식자',
		exampleMessage: '뜻을 알고 마음을 깨닫습니다.',
	},
	{
		score: 6000,
		next: 8000,
		label: '성인(聖人)',
		icon: 'crown',
		mascot: FourImages.level6_mascote,
		encouragement: '👑 인격과 지식을 함께 갖춘 진정한 모범!',
		description: '지식뿐 아니라 인격까지 갖춘 이상적인 인물.\n한자어의 철학과 정신을 꿰뚫습니다.',
		feeling: '완성형 인물',
		exampleMessage: '말 한 마디에 진리가 담겨 있도다.',
	},
	{
		score: 8000,
		next: 99999,
		label: '도인(道人)',
		icon: 'yin-yang',
		mascot: FourImages.level7_mascote,
		encouragement: '🌌 세속을 초월한 지혜! 당신은 진정한 대가!',
		description: '세속을 초월해 깨달음의 경지에 이른 최고 수준의 존재.\n한자어를 삶에 녹여 실천합니다.',
		feeling: '초월자, 철학가',
		exampleMessage: '말 없이도 진리를 전합니다.',
	},
];
