// services/TestHistoryService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateUtils from '@/src/utils/DateUtils';

/**
 * 레벨/유형 테스트 결과 기록 (AsyncStorage)
 * - 최근 결과를 누적 저장하고 시작 화면에서 보여준다.
 */
const KEY = {
	LEVEL: 'TEST_HISTORY_LEVEL',
	TYPE: 'TEST_HISTORY_TYPE',
	EXAM: 'TEST_HISTORY_EXAM',
} as const;

const CAP = 20;

export interface LevelTestRecord {
	date: number; // epoch ms
	rate: number; // 점수(정답률)
	correct: number;
	total: number;
	gradeTitle: string;
	gradeTier: string;
}

/** 시험 대비 팩 기록 — 팩 키별 1건(최고 점수·응시 횟수·직전 오답) */
export interface ExamPackRecord {
	/** 최고 정답 수 */
	best: number;
	/** 그때의 총 문항 수 */
	total: number;
	/** 응시 횟수 */
	plays: number;
	/** 마지막 응시 시각 */
	date: number;
	/** 직전 회차 오답 문항 uid — '오답만 다시 풀기'에 쓴다 */
	wrongUids: string[];
}

export interface TypeTestRecord {
	date: number;
	typeKey: string;
	typeName: string;
	typeSub: string;
}

const read = async <T>(key: string): Promise<T[]> => {
	try {
		const raw = await AsyncStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T[]) : [];
	} catch {
		return [];
	}
};

const write = async (key: string, list: unknown[]): Promise<void> => {
	try {
		await AsyncStorage.setItem(key, JSON.stringify(list.slice(0, CAP)));
	} catch {
		/* noop */
	}
};

const TestHistoryService = {
	async getLevelHistory(): Promise<LevelTestRecord[]> {
		return read<LevelTestRecord>(KEY.LEVEL);
	},
	async addLevelResult(rec: Omit<LevelTestRecord, 'date'>): Promise<void> {
		const list = await this.getLevelHistory();
		await write(KEY.LEVEL, [{ ...rec, date: DateUtils.getTimestamp() }, ...list]);
	},
	async getTypeHistory(): Promise<TypeTestRecord[]> {
		return read<TypeTestRecord>(KEY.TYPE);
	},
	async addTypeResult(rec: Omit<TypeTestRecord, 'date'>): Promise<void> {
		const list = await this.getTypeHistory();
		await write(KEY.TYPE, [{ ...rec, date: DateUtils.getTimestamp() }, ...list]);
	},
	/** 시험 팩 기록 전체 (팩 키 → 기록) */
	async getExamRecords(): Promise<Record<string, ExamPackRecord>> {
		try {
			const raw = await AsyncStorage.getItem(KEY.EXAM);
			return raw ? (JSON.parse(raw) as Record<string, ExamPackRecord>) : {};
		} catch {
			return {};
		}
	},

	/**
	 * 시험 팩 한 회차 결과 저장 — 최고 점수는 갱신될 때만 바꾸고, 오답 목록은 항상 직전 회차로 덮어쓴다.
	 * (오답을 누적하면 '오답만 다시 풀기'가 끝없이 불어난다)
	 */
	async addExamResult(packKey: string, correct: number, total: number, wrongUids: string[]): Promise<void> {
		try {
			const all = await this.getExamRecords();
			const prev = all[packKey];
			all[packKey] = {
				best: Math.max(prev?.best ?? 0, correct),
				total: correct >= (prev?.best ?? 0) ? total : (prev?.total ?? total),
				plays: (prev?.plays ?? 0) + 1,
				date: DateUtils.getTimestamp(),
				wrongUids,
			};
			await AsyncStorage.setItem(KEY.EXAM, JSON.stringify(all));
		} catch {
			/* noop */
		}
	},

	async clearAll(): Promise<void> {
		await Promise.all([write(KEY.LEVEL, []), write(KEY.TYPE, []), AsyncStorage.removeItem(KEY.EXAM)]);
	},
};

export default TestHistoryService;
