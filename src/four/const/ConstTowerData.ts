// @/src/four/const/ConstTowerData.ts

/**
 * 층별 보스 데이터.
 *
 * `color` 는 배지 면과 강조 글씨에 함께 쓰이고, 탑 화면은 테마와 무관하게 늘 어두운 패널이다.
 * 그래서 팔레트 토큰을 복사해 오지 않고 **고정값**을 둔다.
 * - 팔레트를 복사하면 모듈이 읽히는 시점의 값이 굳어, 테마를 바꿔도 낡은 색이 남는다.
 * - `secondaryDark`·`errorDark` 처럼 다크에서 밝게 뒤집히는 토큰은 배지 위 글씨를 지워 버린다.
 *
 * 네 색 모두 어두운 패널 위에서 4.5:1 이상으로 읽히는 중간 밝기다.
 * 배지 위 글씨는 `onSurface()` 로 면 밝기에 맞춰 고른다.
 */
export const TOWER_LEVELS = [
	{
		id: 1, // ← 추가
		level: 1,
		name: '초급 탑',
		bossName: '먹보 멧돼지 꿀꿀이',
		bossTitle: '🐗 레벨 1 보스',
		bossDescription: '도깨비의 메밀묵을 훔쳐 먹으려는 숲속의 골칫덩이 멧돼지',
		bossImage: require('@/src/four/assets/tower/boss1_character.webp'),
		questions: [], // ← 추가 (사용하지 않으면 빈 배열)
		requiredScore: 0,
		reward: {
			type: 'costume',
			name: '초급 모자',
			image: require('@/src/four/assets/tower/beginner_hat_v2.webp'),
		},
		color: '#5B8DEF', // 파랑 (멧돼지)
		clearCondition: '초급 문제 전체 클리어',
	},
	{
		id: 2, // ← 추가
		level: 2,
		name: '중급 탑',
		bossName: '바위 거인 옹고집',
		bossTitle: '🗿 레벨 2 보스',
		bossDescription: '바위산의 입구를 가로막고 있는 고집불통 거인. 오직 퀴즈로만 길을 비켜줌',
		questions: [], // ← 추가 (사용하지 않으면 빈 배열)
		bossImage: require('@/src/four/assets/tower/boss2_character.webp'),
		requiredScore: 100,
		reward: {
			type: 'costume',
			name: '중급 망토',
			image: require('@/src/four/assets/tower/intermediate_cape_v2.webp'),
		},
		color: '#2DD4BF', // 민트 (바위)
		clearCondition: '중급 문제 전체 클리어',
	},
	{
		id: 3, // ← 추가
		level: 3,
		name: '고급 탑',
		bossName: '천년 묵은 구미호 매혹',
		questions: [], // ← 추가 (사용하지 않으면 빈 배열)
		bossTitle: '🦊 레벨 3 보스',
		bossDescription: '골짜기의 안개 속에서 나타나는 신비롭고 영악한 여우 요괴',
		bossImage: require('@/src/four/assets/tower/boss3_character.webp'),
		requiredScore: 300,
		clearCondition: '고급 문제 전체 클리어',
		reward: {
			type: 'character',
			name: '전설의 한자 수호자',
			image: require('@/src/four/assets/tower/legendary_guardian_v2.webp'),
		},
		color: '#FBBF24', // 앰버 (신비)
	},
	{
		id: 4, // ← 추가
		level: 4,
		name: '최종 탑',
		bossName: '도깨비 왕 염라',
		questions: [], // ← 추가 (사용하지 않으면 빈 배열)
		bossTitle: '👹 레벨 4 최종 보스',
		bossDescription: '거대한 어사화를 쓰고 황금 방망이를 든, 위엄 넘치는 도깨비들의 군주',
		bossImage: require('@/src/four/assets/tower/boss4_character.webp'),
		requiredScore: 600,
		reward: {
			type: 'item',
			name: '황금 도깨비 방망이',
			image: require('@/src/four/assets/tower/golden_club_v2.webp'),
		},
		color: '#F87171', // 붉은색 (도깨비)
		clearCondition: '특급 문제 전체 클리어',
	},
];

export interface TowerProgress {
	level: number;
	attempts: number;
	adRewardUsed: number;
	completedLevels: number[];
	currentQuestion: number;
	correctAnswers: number;
	lastAttemptDate: string;
	unlockedRewards: number[]; // 획득한 보상 ID
	badges?: string[]; // ✅ 추가
}
