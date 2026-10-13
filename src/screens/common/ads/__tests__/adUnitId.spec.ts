import DeviceInfo from 'react-native-device-info';
import { isRealAdUnitId, resolveAdUnitId } from '../adUnitId';

jest.mock('react-native-device-info', () => ({ getInstallerPackageNameSync: jest.fn(() => 'com.android.vending') }));

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

	describe('릴리즈 빌드', () => {
		const dev = global.__DEV__;
		const mode = process.env.EXPO_PUBLIC_APP_MODE;
		beforeEach(() => {
			global.__DEV__ = false;
			process.env.EXPO_PUBLIC_APP_MODE = 'prd';
			(DeviceInfo.getInstallerPackageNameSync as jest.Mock).mockReturnValue('com.android.vending');
		});
		afterAll(() => {
			global.__DEV__ = dev;
			process.env.EXPO_PUBLIC_APP_MODE = mode;
		});

		it('스토어 설치 운영 빌드는 운영 유닛, 유닛 ID가 잘못되면 테스트 유닛으로 폴백한다', () => {
			expect(resolveAdUnitId(REAL, TEST)).toBe(REAL);
			expect(resolveAdUnitId('ca-app-pub-1', TEST)).toBe(TEST);
			expect(resolveAdUnitId(undefined, TEST)).toBe(TEST);
		});

		it('기기에 직접 설치(adb·Xcode)한 앱은 prd 여도 테스트 유닛', () => {
			(DeviceInfo.getInstallerPackageNameSync as jest.Mock).mockReturnValue('unknown');
			expect(resolveAdUnitId(REAL, TEST)).toBe(TEST);
			(DeviceInfo.getInstallerPackageNameSync as jest.Mock).mockReturnValue('Other');
			expect(resolveAdUnitId(REAL, TEST)).toBe(TEST);
		});

		it('iOS TestFlight(심사 설치 포함)는 운영 유닛 — 심사 중 테스트 광고 노출로 반려되지 않게', () => {
			(DeviceInfo.getInstallerPackageNameSync as jest.Mock).mockReturnValue('TestFlight');
			expect(resolveAdUnitId(REAL, TEST)).toBe(REAL);
		});

		it('운영 모드(prd)가 아니면 테스트 유닛', () => {
			process.env.EXPO_PUBLIC_APP_MODE = 'local';
			expect(resolveAdUnitId(REAL, TEST)).toBe(TEST);
		});
	});
});
