import { SHARED_STATE_ILLUSTRATIONS, getDomainIllustration, getSharedStateIllustration } from '@/src/const/ConstIllustrationAssets';

describe('ConstIllustrationAssets', () => {
	it('공용 상태 에셋 7종을 제공한다', () => {
		expect(Object.keys(SHARED_STATE_ILLUSTRATIONS)).toEqual(['locked', 'empty', 'noResults', 'reviewNeeded', 'allComplete', 'perfectScore', 'retry']);
	});

	it('각 키에 맞는 에셋을 반환한다', () => {
		Object.entries(SHARED_STATE_ILLUSTRATIONS).forEach(([key, asset]) => {
			expect(getSharedStateIllustration(key as keyof typeof SHARED_STATE_ILLUSTRATIONS)).toBe(asset);
		});
	});

	it('항목 그림이 없는 주제만 대표 그림을 준다', () => {
		expect(getDomainIllustration('worldcup')).toBeTruthy();
		expect(getDomainIllustration('olympic')).toBeTruthy();
		expect(getDomainIllustration('capital')).toBeNull();
	});
});
