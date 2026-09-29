import AsyncStorage from '@react-native-async-storage/async-storage';
import { shouldShowAppOpenAd } from '../AppOpenAdGate';

describe('앱 열기 광고 노출 빈도', () => {
	beforeEach(async () => {
		await AsyncStorage.clear();
	});

	it('최초 설치 후 첫 실행은 무조건 노출한다', async () => {
		expect(await shouldShowAppOpenAd()).toBe(true);
	});

	it('그 이후에는 2번 중 1번만 노출한다', async () => {
		await shouldShowAppOpenAd(); // 최초 1회 소비
		expect(await shouldShowAppOpenAd()).toBe(false);
		expect(await shouldShowAppOpenAd()).toBe(true);
		expect(await shouldShowAppOpenAd()).toBe(false);
		expect(await shouldShowAppOpenAd()).toBe(true);
	});

	it('스토리지 오류면 노출하지 않는다', async () => {
		const spy = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('boom'));
		expect(await shouldShowAppOpenAd()).toBe(false);
		spy.mockRestore();
	});
});
