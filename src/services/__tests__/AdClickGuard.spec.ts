import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAdClickCapped, LIMIT, recordAdClick } from '@/src/services/AdClickGuard';
import DateUtils from '@/src/utils/DateUtils';

describe('AdClickGuard', () => {
	beforeEach(() => AsyncStorage.clear());

	it('하루 LIMIT 번 클릭하면 막고, 날짜가 바뀌면 풀린다', async () => {
		for (let i = 0; i < LIMIT - 1; i++) await recordAdClick();
		expect(await isAdClickCapped()).toBe(false);
		await recordAdClick();
		expect(await isAdClickCapped()).toBe(true);

		const spy = jest.spyOn(DateUtils, 'getLocalDateString').mockReturnValue('2999-01-01');
		expect(await isAdClickCapped()).toBe(false);
		spy.mockRestore();
	});
});
