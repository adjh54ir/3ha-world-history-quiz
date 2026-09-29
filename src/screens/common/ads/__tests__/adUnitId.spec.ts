import { isRealAdUnitId, resolveAdUnitId } from '../adUnitId';

const REAL = 'ca-app-pub-1996095472780376/2110294954';
const TEST = 'ca-app-pub-3940256099942544/6300978111';

describe('광고 유닛 ID 결정', () => {
	it('실제 유닛 ID 형식만 인정한다', () => {
		expect(isRealAdUnitId(REAL)).toBe(true);
		expect(isRealAdUnitId('ca-app-pub-1')).toBe(false);
		expect(isRealAdUnitId('')).toBe(false);
		expect(isRealAdUnitId(undefined)).toBe(false);
	});

	it('개발에서는 항상 테스트 유닛을 쓴다', () => {
		expect(resolveAdUnitId(REAL, TEST)).toBe(TEST);
	});

	it('운영에서 유닛 ID가 없거나 잘못되면 테스트 유닛으로 폴백한다', () => {
		const dev = global.__DEV__;
		global.__DEV__ = false;
		try {
			expect(resolveAdUnitId('ca-app-pub-1', TEST)).toBe(TEST);
			expect(resolveAdUnitId(undefined, TEST)).toBe(TEST);
			expect(resolveAdUnitId(REAL, TEST)).toBe(REAL);
		} finally {
			global.__DEV__ = dev;
		}
	});
});
