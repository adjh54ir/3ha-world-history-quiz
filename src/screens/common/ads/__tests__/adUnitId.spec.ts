import { resolveAdUnitId } from '../adUnitId';

const REAL = 'ca-app-pub-1996095472780376/2110294954';
const TEST = 'ca-app-pub-3940256099942544/6300978111';

describe('광고 유닛 ID 결정', () => {
	it('개발(__DEV__)에서는 테스트 유닛을 쓴다', () => {
		expect(resolveAdUnitId(REAL, TEST)).toBe(TEST);
	});

	it('그 외(운영 빌드)에서는 운영 유닛을 쓴다', () => {
		const dev = global.__DEV__;
		global.__DEV__ = false;
		expect(resolveAdUnitId(REAL, TEST)).toBe(REAL);
		global.__DEV__ = dev;
	});
});
