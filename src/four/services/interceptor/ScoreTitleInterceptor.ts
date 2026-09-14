import FourImages from '@/src/four/assets/FourImages';
import { LEVEL_THRESHOLDS } from '@/src/four/const/ConstLevelData';

export const SCORE_TITLES = [
	{
		threshold: LEVEL_THRESHOLDS[1].threshold,
		id: 'score_400',
		name: '📘 수습 등급 획득!',
		description: '400점 달성! 기초를 다지며 학문의 길에 들어섰습니다!',
		icon: 'seedling',
		mascotImage: FourImages.level2_mascote, // ✅ 마스코트 이미지 경로
	},
	{
		threshold: LEVEL_THRESHOLDS[2].threshold,
		id: 'score_900',
		name: '📖 학자 등급 획득!',
		description: '1200점 달성! 다양한 한자어가 익숙해지고 있습니다!',
		icon: 'leaf',
		mascotImage: FourImages.level3_mascote,
	},
	{
		threshold: LEVEL_THRESHOLDS[3].threshold,
		id: 'score_1600',
		name: '🗣 강자 등급 획득!',
		description: '2400점 달성! 이제 남에게 설명할 수 있는 수준입니다!',
		icon: 'book',
		mascotImage: FourImages.level4_mascote,
	},
	{
		threshold: LEVEL_THRESHOLDS[4].threshold,
		id: 'score_2400',
		name: '🏆 현인 등급 획득!',
		description: '4000점 달성! 통찰력 있는 한자어 고수가 되었습니다!',
		icon: 'mountain',
		mascotImage: FourImages.level5_mascote,
	},
	{
		threshold: LEVEL_THRESHOLDS[5].threshold,
		id: 'score_3400',
		name: '👑 성인 등급 획득!',
		description: '6000점 달성! 지식과 인격을 겸비한 진정한 학자!',
		icon: 'crown',
		mascotImage: FourImages.level6_mascote,
	},
	{
		threshold: LEVEL_THRESHOLDS[6].threshold,
		id: 'score_4600',
		name: '🌌 도인 등급 획득!',
		description: '8000점 달성! 세속을 초월한 한자어의 대가!',
		icon: 'yin-yang',
		mascotImage: FourImages.level7_mascote,
	},
];

export const checkScoreLevelUp = (score: number, currentBadges: string[]) => {
	for (const level of SCORE_TITLES) {
		if (score >= level.threshold && !currentBadges.includes(level.id)) {
			return level; // 새 등급 도달
		}
	}
	return null;
};
