// services/DailyWordService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LearnType } from '@/src/types/data/LearnType';
import LearnHubService from './LearnHubService';
import DateUtils from '@/src/utils/DateUtils';

/**
 * 오늘의 상식
 * - 하루 동안 고정되는 학습 카드 1장을 선정/보관 (날짜가 바뀌면 새로 선정)
 */
const KEY = 'DAILY_WORD';
const REMINDER_KEY = 'DAILY_WORD_REMINDER_ON';
const REMINDER_TIME_KEY = 'DAILY_WORD_REMINDER_TIME';

interface DailyWordCache {
	date: string; // 'YYYY-MM-DD'
	card: LearnType.StudyCard;
}

const todayStr = (): string => DateUtils.getLocalDateString();

const DailyWordService = {
	/** 오늘의 카드 (없거나 날짜가 지났으면 새로 선정 후 저장) */
	async getToday(): Promise<LearnType.StudyCard | null> {
		const today = todayStr();
		try {
			const raw = await AsyncStorage.getItem(KEY);
			if (raw) {
				const cached = JSON.parse(raw) as DailyWordCache;
				if (cached.date === today && cached.card) return cached.card;
			}
		} catch {
			/* noop */
		}

		const card = LearnHubService.getRandomStudyCard();
		if (!card) return null;
		try {
			await AsyncStorage.setItem(KEY, JSON.stringify({ date: today, card } as DailyWordCache));
		} catch {
			/* noop */
		}
		return card;
	},

	async isReminderOn(): Promise<boolean> {
		try {
			return (await AsyncStorage.getItem(REMINDER_KEY)) === '1';
		} catch {
			return false;
		}
	},

	async setReminderOn(on: boolean): Promise<void> {
		try {
			await AsyncStorage.setItem(REMINDER_KEY, on ? '1' : '0');
		} catch {
			/* noop */
		}
	},

	/** 알림 시간 (기본 08:00) */
	async getReminderTime(): Promise<{ hour: number; minute: number }> {
		try {
			const raw = await AsyncStorage.getItem(REMINDER_TIME_KEY);
			return raw ? (JSON.parse(raw) as { hour: number; minute: number }) : { hour: 8, minute: 0 };
		} catch {
			return { hour: 8, minute: 0 };
		}
	},

	async setReminderTime(t: { hour: number; minute: number }): Promise<void> {
		try {
			await AsyncStorage.setItem(REMINDER_TIME_KEY, JSON.stringify(t));
		} catch {
			/* noop */
		}
	},

	async reset(): Promise<void> {
		try {
			await AsyncStorage.multiRemove([KEY, REMINDER_KEY, REMINDER_TIME_KEY]);
		} catch {
			/* noop */
		}
	},
};

export default DailyWordService;
