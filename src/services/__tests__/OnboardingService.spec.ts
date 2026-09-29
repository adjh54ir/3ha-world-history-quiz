import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingService from '../OnboardingService';

describe('OnboardingService — 첫 실행 온보딩', () => {
	beforeEach(async () => {
		await AsyncStorage.clear();
	});

	it('처음에는 온보딩 미완료 · 관심 주제는 both', async () => {
		await expect(OnboardingService.isDone()).resolves.toBe(false);
		await expect(OnboardingService.getInterest()).resolves.toBe('both');
	});

	it('complete 는 관심 주제와 하루 목표를 홈과 같은 키에 저장한다', async () => {
		await OnboardingService.complete('knowledge', 20);

		await expect(OnboardingService.isDone()).resolves.toBe(true);
		await expect(OnboardingService.getInterest()).resolves.toBe('knowledge');
		expect(await AsyncStorage.getItem('HOME_DAILY_GOAL')).toBe('20');
	});

	it('clear 는 온보딩 상태만 지우고 하루 목표는 남긴다', async () => {
		await OnboardingService.complete('vocab', 5);
		await OnboardingService.clear();

		await expect(OnboardingService.isDone()).resolves.toBe(false);
		await expect(OnboardingService.getInterest()).resolves.toBe('both');
		expect(await AsyncStorage.getItem('HOME_DAILY_GOAL')).toBe('5');
	});
});

describe('OnboardingService — 홈 점진 공개 기준', () => {
	beforeEach(async () => {
		await AsyncStorage.clear();
	});

	it('온보딩 직후에는 신규 사용자로 본다', async () => {
		await OnboardingService.complete('both', 10);
		await expect(OnboardingService.isNewcomer()).resolves.toBe(true);
	});

	it('시작 시각이 없는 기존 사용자는 신규가 아니다', async () => {
		await expect(OnboardingService.isNewcomer()).resolves.toBe(false);
	});

	it('3일이 지나면 신규가 아니다', async () => {
		const fourDaysAgo = Date.now() - 4 * 24 * 60 * 60 * 1000;
		await AsyncStorage.setItem('ONBOARDING_STARTED_AT', String(fourDaysAgo));
		await expect(OnboardingService.isNewcomer()).resolves.toBe(false);
	});
});
