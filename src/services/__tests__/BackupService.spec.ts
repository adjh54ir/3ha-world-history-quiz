import AsyncStorage from '@react-native-async-storage/async-storage';

const mockRpc = jest.fn();

jest.mock('../SupabaseClient', () => ({
	isSupabaseConfigured: true,
	supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));
jest.mock('../RankingService', () => ({ __esModule: true, default: { signIn: async () => 'uid-1' } }));

import BackupService from '../BackupService';

describe('BackupService — 결제·세션 키는 백업에서 제외한다', () => {
	beforeEach(async () => {
		await AsyncStorage.clear();
		mockRpc.mockReset();
	});

	it('backup 은 진도만 올리고 AD_REMOVED · sb-* 는 빼고 올린다', async () => {
		await AsyncStorage.multiSet([
			['UserStudyHistory', '{"studyProverbs":[1,2]}'],
			['AD_REMOVED', 'true'],
			['sb-abc-auth-token', '{"access_token":"x"}'],
			['persist:root', '{"userInfo":{}}'],
		]);
		mockRpc.mockResolvedValue({ data: 'ABCD2345', error: null });

		const code = await BackupService.backup();

		expect(code).toBe('ABCD2345');
		const payload = mockRpc.mock.calls[0][1].p_payload;
		expect(payload).toEqual({ UserStudyHistory: '{"studyProverbs":[1,2]}' });
	});

	it('restore 는 받은 데이터를 쓰되 결제 상태는 덮어쓰지 않는다', async () => {
		await AsyncStorage.setItem('AD_REMOVED', 'false');
		mockRpc.mockResolvedValue({
			data: { UserStudyHistory: '{"studyProverbs":[9]}', AD_REMOVED: 'true' },
			error: null,
		});

		await expect(BackupService.restore('abcd2345')).resolves.toBe('ok');
		expect(mockRpc.mock.calls[0][1]).toEqual({ p_code: 'ABCD2345' });
		expect(await AsyncStorage.getItem('UserStudyHistory')).toBe('{"studyProverbs":[9]}');
		expect(await AsyncStorage.getItem('AD_REMOVED')).toBe('false');
	});

	it('코드에 해당하는 백업이 없으면 not-found 를 준다', async () => {
		mockRpc.mockResolvedValue({ data: null, error: null });
		await expect(BackupService.restore('ZZZZ9999')).resolves.toBe('not-found');
	});
});
