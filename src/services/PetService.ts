// services/PetService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateUtils from '@/src/utils/DateUtils';

/**
 * 버추얼 펫 상태 (AsyncStorage)
 * - 펫 XP = 누적 정답 수 + 먹이 보너스. 먹이는 하루 1회.
 */
const KEY = 'PET_STATE';

export interface PetState {
	name: string;
	feedBonus: number;
	lastFed: string | null; // 'YYYY-MM-DD'
}

const DEFAULT: PetState = { name: '한글이', feedBonus: 0, lastFed: null };

const todayStr = (): string => DateUtils.getLocalDateString();

const PetService = {
	async getState(): Promise<PetState> {
		try {
			const raw = await AsyncStorage.getItem(KEY);
			return raw ? { ...DEFAULT, ...(JSON.parse(raw) as PetState) } : { ...DEFAULT };
		} catch {
			return { ...DEFAULT };
		}
	},

	async save(state: PetState): Promise<void> {
		try {
			await AsyncStorage.setItem(KEY, JSON.stringify(state));
		} catch {
			/* noop */
		}
	},

	/** 오늘 먹이 줬는지 */
	async isFedToday(): Promise<boolean> {
		const s = await this.getState();
		return s.lastFed === todayStr();
	},

	/** 먹이 주기 (하루 1회, +20 XP) */
	async feed(): Promise<{ fed: boolean; state: PetState }> {
		const s = await this.getState();
		if (s.lastFed === todayStr()) return { fed: false, state: s };
		const next: PetState = { ...s, feedBonus: s.feedBonus + 20, lastFed: todayStr() };
		await this.save(next);
		return { fed: true, state: next };
	},

	async rename(name: string): Promise<PetState> {
		const s = await this.getState();
		const next = { ...s, name: name.trim() || s.name };
		await this.save(next);
		return next;
	},

	async reset(): Promise<void> {
		try {
			await AsyncStorage.removeItem(KEY);
		} catch {
			/* noop */
		}
	},
};

export default PetService;
