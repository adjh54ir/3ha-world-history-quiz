// @/src/four/const/ConstTowerData.ts

/**
 * 층별 보스 데이터.
 *
 * 보이는 글자(탑 이름·보스 이름·소개·클리어 조건·보상 이름)는 번역 파일에 있다:
 *   tower.level.<level>.name / .bossName / .bossTitle / .bossDescription / .clearCondition / .rewardName
 * 여기에는 그림·색·번호만 둔다 (모듈 상수는 언어를 바꿔도 다시 만들어지지 않는다).
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
		bossImage: require('@/src/four/assets/tower/boss1_character.webp'),
		questions: [], // ← 추가 (사용하지 않으면 빈 배열)
		requiredScore: 0,
		reward: {
			type: 'costume',
			image: require('@/src/four/assets/tower/beginner_hat_v2.webp'),
		},
		color: '#5B8DEF', // 파랑 (멧돼지)
	},
	{
		id: 2, // ← 추가
		level: 2,
		questions: [], // ← 추가 (사용하지 않으면 빈 배열)
		bossImage: require('@/src/four/assets/tower/boss2_character.webp'),
		requiredScore: 100,
		reward: {
			type: 'costume',
			image: require('@/src/four/assets/tower/intermediate_cape_v2.webp'),
		},
		color: '#2DD4BF', // 민트 (바위)
	},
	{
		id: 3, // ← 추가
		level: 3,
		questions: [], // ← 추가 (사용하지 않으면 빈 배열)
		bossImage: require('@/src/four/assets/tower/boss3_character.webp'),
		requiredScore: 300,
		reward: {
			type: 'character',
			image: require('@/src/four/assets/tower/legendary_guardian_v2.webp'),
		},
		color: '#FBBF24', // 앰버 (신비)
	},
	{
		id: 4, // ← 추가
		level: 4,
		questions: [], // ← 추가 (사용하지 않으면 빈 배열)
		bossImage: require('@/src/four/assets/tower/boss4_character.webp'),
		requiredScore: 600,
		reward: {
			type: 'item',
			image: require('@/src/four/assets/tower/golden_club_v2.webp'),
		},
		color: '#F87171', // 붉은색 (도깨비)
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
