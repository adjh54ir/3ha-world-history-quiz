import { FEATURE_ILLUSTRATIONS } from '@/src/const/ConstFeatureIllustrationAssets';

describe('FEATURE_ILLUSTRATIONS', () => {
	it('1순위 기능 에셋을 모두 등록한다', () => {
		expect(Object.keys(FEATURE_ILLUSTRATIONS)).toEqual([
			'todayQuiz',
			'timeChallenge',
			'matchGame',
			'ranking',
			'league',
			'levelTest',
			'typeTest',
		]);

		Object.values(FEATURE_ILLUSTRATIONS).forEach((asset) => expect(asset).toBeTruthy());
	});
});
