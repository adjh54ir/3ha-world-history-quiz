import AsyncStorage from '@react-native-async-storage/async-storage';
import DateUtils from '@/src/utils/DateUtils';
import { MIN_INTERVAL_MS, shouldShowAppOpenAd } from '../AppOpenAdGate';

describe('앱 열기 광고 노출 빈도', () => {
	let now = 1_000_000_000_000;
	beforeEach(async () => {
		await AsyncStorage.clear();
		now = 1_000_000_000_000;
		jest.spyOn(DateUtils, 'getTimestamp').mockImplementation(() => now);
	});
	afterEach(() => jest.restoreAllMocks());

	it('최초 설치 후 첫 실행은 노출하지 않는다', async () => {
		expect(await shouldShowAppOpenAd()).toBe(false);
	});

	it('그 이후에는 2번 중 1번만 노출한다 (간격이 충분할 때)', async () => {
		await shouldShowAppOpenAd(); // 최초 실행 소비
		const seq: boolean[] = [];
		for (let i = 0; i < 4; i++) {
			now += MIN_INTERVAL_MS;
			seq.push(await shouldShowAppOpenAd());
		}
		expect(seq).toEqual([false, true, false, true]);
	});

	it('마지막 노출 뒤 최소 간격 안에서는 차례가 와도 노출하지 않는다', async () => {
		await shouldShowAppOpenAd(); // 최초 실행
		await shouldShowAppOpenAd(); // 1번째 복귀 — 차례 아님
		expect(await shouldShowAppOpenAd()).toBe(true); // 2번째 — 노출
		now += MIN_INTERVAL_MS - 1;
		expect(await shouldShowAppOpenAd()).toBe(false); // 간격 안 — 차례로 세지도 않음
		expect(await shouldShowAppOpenAd()).toBe(false);
		now += 1;
		expect(await shouldShowAppOpenAd()).toBe(false); // 간격 지남 — 1번째
		expect(await shouldShowAppOpenAd()).toBe(true); // 2번째 — 노출
	});

	it('스토리지 오류면 노출하지 않는다', async () => {
		jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('boom'));
		expect(await shouldShowAppOpenAd()).toBe(false);
	});
});
