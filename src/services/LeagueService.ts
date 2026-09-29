// services/LeagueService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import LearnProgressService from '@/src/services/LearnProgressService';
import Colors from '@/src/const/ConstColors';
import DateUtils from '@/src/utils/DateUtils';
import { themed } from '@/src/utils/ThemedStyles';

/**
 * 주간 XP 리그 (봇 시뮬레이션, 서버 없이 클라이언트에서 동작)
 * - 일요일~토요일 주간 리그. XP = 그 주 정답 수 × 10.
 * - 봇 9명은 주차+리그에 시드 고정. 매주 정산해 상위 3 승급 / 하위 3 강등.
 */
const KEY = 'LEAGUE_STATE';

export interface LeagueTier {
	name: string;
	color: string;
	icon: string;
}

export const LEAGUES: LeagueTier[] = themed(() => [
	{ name: '브론즈', color: '#B45309', icon: 'military-tech' },
	{ name: '실버', color: Colors.secondary, icon: 'military-tech' },
	{ name: '골드', color: Colors.amber, icon: 'military-tech' },
	{ name: '플래티넘', color: '#14B8A6', icon: 'workspace-premium' },
	{ name: '다이아', color: '#3B82F6', icon: 'diamond' },
	{ name: '마스터', color: '#EC4899', icon: 'emoji-events' },
]);

export interface LeagueEntry {
	name: string;
	xp: number;
	isMe: boolean;
	rank: number;
}

export interface LeagueBoard {
	league: LeagueTier;
	leagueIndex: number;
	weekId: string;
	daysLeft: number;
	myXp: number;
	myRank: number;
	entries: LeagueEntry[];
	promoteCount: number;
	demoteCount: number;
}

interface LeagueState {
	weekId: string;
	leagueIndex: number;
}

const BOT_NAMES = ['민준', '서연', '도윤', '지우', '하준', '수아', '지호', '예준', '시우', '유나', '건우', '채원', '주원', '서윤'];

const sundayOf = (dateKey: string): string => DateUtils.addLocalDays(dateKey, -DateUtils.getLocalDayOfWeek(dateKey));

const weekDates = (sunday: string): string[] => {
	const out: string[] = [];
	for (let i = 0; i < 7; i++) out.push(DateUtils.addLocalDays(sunday, i));
	return out;
};

const hash = (str: string): number => {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
	return h >>> 0;
};
const mulberry32 = (seed: number) => () => {
	seed |= 0;
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const xpForDates = (dailyLog: Record<string, { solved: number; correct: number }>, dates: string[]): number =>
	dates.reduce((sum, d) => sum + (dailyLog[d]?.correct ?? 0) * 10, 0);

const makeBots = (weekId: string, leagueIndex: number): { name: string; xp: number; isMe: boolean }[] => {
	const r = mulberry32(hash(`${weekId}|${leagueIndex}`));
	const names = [...BOT_NAMES].sort(() => r() - 0.5).slice(0, 9);
	const base = (leagueIndex + 1) * 120;
	return names.map((name) => ({ name, xp: Math.round(base * (0.35 + r() * 1.5)), isMe: false }));
};

const rankByXp = (entries: { xp: number; isMe: boolean; name: string }[]): LeagueEntry[] =>
	[...entries].sort((a, b) => b.xp - a.xp).map((e, i) => ({ ...e, rank: i + 1 }));

const readState = async (): Promise<LeagueState | null> => {
	try {
		const raw = await AsyncStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as LeagueState) : null;
	} catch {
		return null;
	}
};
const writeState = async (s: LeagueState) => {
	try {
		await AsyncStorage.setItem(KEY, JSON.stringify(s));
	} catch {
		/* noop */
	}
};

const LeagueService = {
	async getBoard(): Promise<LeagueBoard> {
		const stats = await LearnProgressService.getStats();
		const today = DateUtils.getLocalDateString();
		const curSun = sundayOf(today);
		const curWeekId = curSun;

		let state = await readState();
		if (!state) {
			state = { weekId: curWeekId, leagueIndex: 0 };
		} else if (state.weekId !== curWeekId) {
			// 지난 주 정산
			const prevDates = weekDates(state.weekId);
			const userPrevXp = xpForDates(stats.dailyLog, prevDates);
			const prevEntries = rankByXp([...makeBots(state.weekId, state.leagueIndex), { name: '나', xp: userPrevXp, isMe: true }]);
			const myPrevRank = prevEntries.find((e) => e.isMe)?.rank ?? 10;
			if (myPrevRank <= 3 && state.leagueIndex < LEAGUES.length - 1) state.leagueIndex += 1;
			else if (myPrevRank >= 8 && state.leagueIndex > 0) state.leagueIndex -= 1;
			state.weekId = curWeekId;
		}
		await writeState(state);

		const curDates = weekDates(curSun);
		const myXp = xpForDates(stats.dailyLog, curDates);
		const entries = rankByXp([...makeBots(curWeekId, state.leagueIndex), { name: '나', xp: myXp, isMe: true }]);
		const myRank = entries.find((e) => e.isMe)?.rank ?? entries.length;
		const dow = DateUtils.getLocalDayOfWeek(today);
		const daysLeft = dow === 0 ? 7 : 7 - dow;

		return {
			league: LEAGUES[state.leagueIndex],
			leagueIndex: state.leagueIndex,
			weekId: curWeekId,
			daysLeft,
			myXp,
			myRank,
			entries,
			promoteCount: state.leagueIndex < LEAGUES.length - 1 ? 3 : 0,
			demoteCount: state.leagueIndex > 0 ? 3 : 0,
		};
	},

	async reset(): Promise<void> {
		try {
			await AsyncStorage.removeItem(KEY);
		} catch {
			/* noop */
		}
	},
};

export default LeagueService;
