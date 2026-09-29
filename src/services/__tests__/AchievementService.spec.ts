import AsyncStorage from '@react-native-async-storage/async-storage';
import AchievementService from '../AchievementService';
import { LearnStats } from '../LearnProgressService';
import DateUtils from '@/src/utils/DateUtils';

const UNLOCKED_AT_KEY = 'ACHIEVEMENT_UNLOCKED_AT';

/** 필요한 지표만 채운 통계 (나머지는 기본값) */
const statsOf = (over: Partial<LearnStats>): LearnStats =>
	({
		totalSolved: 0,
		totalCorrect: 0,
		totalQuizzes: 0,
		streakCount: 0,
		bestStreak: 0,
		byDomain: {},
		byMode: {},
		...over,
	} as LearnStats);

describe('AchievementService 해금 시각 기록', () => {
	beforeEach(async () => {
		await AsyncStorage.clear();
	});

	it('처음 호출 시 해금된 업적 전체에 시각을 기록한다', async () => {
		const list = await AchievementService.recentUnlocked(statsOf({ totalQuizzes: 1, totalSolved: 60, totalCorrect: 55 }));
		expect(list.length).toBeGreaterThan(0);
		const raw = await AsyncStorage.getItem(UNLOCKED_AT_KEY);
		const map = JSON.parse(raw as string);
		list.forEach((a) => expect(typeof map[a.def.id]).toBe('number'));
	});

	it('이미 기록된 시각은 다시 호출해도 덮어쓰지 않는다', async () => {
		const stats = statsOf({ totalQuizzes: 1, totalSolved: 60, totalCorrect: 55 });
		const first = await AchievementService.recentUnlocked(stats);
		const before = await AchievementService.unlockedAtMap();
		const again = await AchievementService.recentUnlocked(stats);
		expect(await AchievementService.unlockedAtMap()).toEqual(before);
		expect(again.map((a) => a.def.id)).toEqual(first.map((a) => a.def.id));
	});

	it('나중에 해금한 업적이 목록 앞에 온다', async () => {
		const early = statsOf({ totalQuizzes: 1 });
		const earlyIds = (await AchievementService.recentUnlocked(early)).map((a) => a.def.id);

		// 기존 기록보다 확실히 늦은 시각으로 다음 해금을 기록 (앱의 시각 소스는 DateUtils.now)
		const laterNow = new Date(Date.now() + 60_000);
		const spy = jest.spyOn(DateUtils, 'now').mockReturnValue(laterNow);
		const list = await AchievementService.recentUnlocked(statsOf({ totalQuizzes: 1, totalSolved: 120, totalCorrect: 60 }));
		spy.mockRestore();

		const freshIds = list.filter((a) => !earlyIds.includes(a.def.id)).map((a) => a.def.id);
		expect(freshIds.length).toBeGreaterThan(0);
		// 새로 해금한 것들이 모두 기존 해금분보다 앞
		const firstOldIndex = list.findIndex((a) => earlyIds.includes(a.def.id));
		const lastFreshIndex = list.reduce((acc, a, i) => (freshIds.includes(a.def.id) ? i : acc), -1);
		expect(lastFreshIndex).toBeLessThan(firstOldIndex);
	});
});

describe('주제 뱃지는 메인 주제 기록만으로 딸 수 있다', () => {
	// 서브 퀴즈(월드컵·올림픽)는 메인 통계(byDomain)에 쌓이지 않는다 — 그쪽 기록을 조건으로 걸면 영영 못 따는 뱃지가 된다
	it('메인 8주제를 충분히 풀면 주제 도메인 뱃지가 모두 열린다', () => {
		const LearnHubService = require('@/src/services/LearnHubService').default;
		const byDomain = Object.fromEntries(LearnHubService.getDomainList().map((d: { key: string }) => [d.key, { solved: 5000, correct: 5000 }]));
		const byMode = Object.fromEntries(['ox', 'blank', 'initial', 'mix', 'bookmark', 'time', 'review', 'daily', 'exam', 'domain', 'weak', 'picture', 'sub-worldcup', 'sub-olympic', 'sub-winter', 'a', 'b'].map((m) => [m, 5000]));
		const list = AchievementService.evaluate(statsOf({ byDomain, byMode, totalSolved: 40000, totalCorrect: 40000, totalQuizzes: 5000 }));
		const locked = list.filter((a) => a.def.group === 'topic' && !a.unlocked).map((a) => a.def.id);
		expect(locked).toEqual([]);
	});
});
