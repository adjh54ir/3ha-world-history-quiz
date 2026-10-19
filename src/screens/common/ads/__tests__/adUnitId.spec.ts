import { isStoreInstall, resolveAdUnitId } from '../adUnitId';

const REAL = 'ca-app-pub-1996095472780376/2110294954';
const TEST = 'ca-app-pub-3940256099942544/6300978111';

describe('광고 유닛 ID 결정', () => {
	it('테스트 조건이면 테스트 유닛을 쓴다', () => {
		expect(resolveAdUnitId(REAL, TEST, true)).toBe(TEST);
	});

	it('운영 조건이면 운영 유닛을 쓴다', () => {
		expect(resolveAdUnitId(REAL, TEST, false)).toBe(REAL);
	});

	it('운영 조건인데 유닛이 비어 있으면 테스트 유닛으로 떨어진다(빈 unitId 크래시 방지)', () => {
		expect(resolveAdUnitId('  ', TEST, false)).toBe(TEST);
		expect(resolveAdUnitId(undefined, TEST, false)).toBe(TEST);
	});

	it('개발 번들(__DEV__)은 기본값으로 테스트 유닛', () => {
		expect(resolveAdUnitId(REAL, TEST)).toBe(TEST);
	});
});

describe('스토어 설치 판정', () => {
	it('iOS 는 App Store 영수증만 스토어', () => {
		expect(isStoreInstall('AppStore', 'ios')).toBe(true);
		expect(isStoreInstall('TestFlight', 'ios')).toBe(false);
		expect(isStoreInstall('Other', 'ios')).toBe(false);
	});

	it('안드로이드는 Play 스토어만 스토어', () => {
		expect(isStoreInstall('com.android.vending', 'android')).toBe(true);
		expect(isStoreInstall('com.android.shell', 'android')).toBe(false);
		expect(isStoreInstall('unknown', 'android')).toBe(false);
	});

	it('판정 실패(null)는 스토어로 친다', () => {
		expect(isStoreInstall(null, 'ios')).toBe(true);
	});
});
