// @/src/const/ConstTowerData.ts
import i18n from '@/src/translations';
import { localized } from '@/src/utils/ThemedStyles';

/**
 * 층별 보스 데이터.
 *
 * `color` 는 배지 면과 강조 글씨에 함께 쓰이고, 탑 화면은 테마와 무관하게 늘 어두운 패널이다.
 * 그래서 팔레트 토큰을 복사해 오지 않고 **고정값**을 둔다.
 * - 팔레트를 복사하면 모듈이 읽히는 시점의 값이 굳어, 테마를 바꿔도 낡은 색이 남는다.
 * - `secondaryDark`·`errorDark` 처럼 다크에서 밝게 뒤집히는 토큰은 배지 위 글씨를 지워 버린다.
 *
 * 네 색 모두 어두운 패널 위에서 4.5:1 이상으로 읽히는 중간 밝기다.
 * 배지 위 글씨는 `readableOn()` 로 면 밝기에 맞춰 고른다.
 */
export const TOWER_LEVELS = localized(() => [
	{
		id: 1, // ← 추가
		level: 1,
		name: i18n.t('tower.data.floor1.name'),
		bossName: i18n.t('tower.data.floor1.bossName'),
		bossTitle: `🐗 ${i18n.t('tower.data.floor1.bossTitle')}`,
		bossDescription: i18n.t('tower.data.floor1.bossDescription'),
		bossImage: require('@/src/assets/tower/boss1_character.webp'),
		questions: [], // ← 추가 (사용하지 않으면 빈 배열)
		requiredScore: 0,
		reward: {
			type: 'costume',
			name: i18n.t('tower.data.floor1.rewardName'),
			description: i18n.t('tower.data.floor1.rewardDescription'),
			image: require('@/src/assets/tower/beginner_hat_v2.webp'),
		},
		color: '#5B8DEF', // 파랑 (멧돼지)
		clearCondition: i18n.t('tower.data.floor1.clearCondition'),
	},
	{
		id: 2, // ← 추가
		level: 2,
		name: i18n.t('tower.data.floor2.name'),
		bossName: i18n.t('tower.data.floor2.bossName'),
		bossTitle: `🗿 ${i18n.t('tower.data.floor2.bossTitle')}`,
		bossDescription: i18n.t('tower.data.floor2.bossDescription'),
		questions: [], // ← 추가 (사용하지 않으면 빈 배열)
		bossImage: require('@/src/assets/tower/boss2_character.webp'),
		requiredScore: 100,
		reward: {
			type: 'costume',
			name: i18n.t('tower.data.floor2.rewardName'),
			description: i18n.t('tower.data.floor2.rewardDescription'),
			image: require('@/src/assets/tower/intermediate_cape_v2.webp'),
		},
		color: '#2DD4BF', // 민트 (바위)
		clearCondition: i18n.t('tower.data.floor2.clearCondition'),
	},
	{
		id: 3, // ← 추가
		level: 3,
		name: i18n.t('tower.data.floor3.name'),
		bossName: i18n.t('tower.data.floor3.bossName'),
		questions: [], // ← 추가 (사용하지 않으면 빈 배열)
		bossTitle: `🦊 ${i18n.t('tower.data.floor3.bossTitle')}`,
		bossDescription: i18n.t('tower.data.floor3.bossDescription'),
		bossImage: require('@/src/assets/tower/boss3_character.webp'),
		requiredScore: 300,
		clearCondition: i18n.t('tower.data.floor3.clearCondition'),
		reward: {
			type: 'character',
			name: i18n.t('tower.data.floor3.rewardName'),
			description: i18n.t('tower.data.floor3.rewardDescription'),
			image: require('@/src/assets/tower/legendary_guardian_v2.webp'),
		},
		color: '#FBBF24', // 앰버 (신비)
	},
	{
		id: 4, // ← 추가
		level: 4,
		name: i18n.t('tower.data.floor4.name'),
		bossName: i18n.t('tower.data.floor4.bossName'),
		questions: [], // ← 추가 (사용하지 않으면 빈 배열)
		bossTitle: `👹 ${i18n.t('tower.data.floor4.bossTitle')}`,
		bossDescription: i18n.t('tower.data.floor4.bossDescription'),
		bossImage: require('@/src/assets/tower/boss4_character.webp'),
		requiredScore: 600,
		reward: {
			type: 'item',
			name: i18n.t('tower.data.floor4.rewardName'),
			description: i18n.t('tower.data.floor4.rewardDescription'),
			image: require('@/src/assets/tower/golden_club_v2.webp'),
		},
		color: '#F87171', // 붉은색 (도깨비)
		clearCondition: i18n.t('tower.data.floor4.clearCondition'),
	},
]);
