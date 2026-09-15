/**
 * 이식 화면(src/four)이 AsyncStorage 에 직접 쌓아 둔 기록을 앱 쪽에서 지우고 되돌린다.
 * -------------------------------------------------
 * 앱의 기록은 두 군데에 나뉘어 있다.
 *   · redux(LifeSlice)      — 홈·나의 활동·펫·경험치
 *   · AsyncStorage(이식 화면) — 통계·오답노트·타워·타임챌린지·오늘의 퀴즈
 *
 * 설정의 초기화는 redux 만 비우고 있어서, 전체 초기화를 눌러도 통계 탭 숫자가 그대로 남았다.
 * 지우는 열쇠 목록을 여기 한 곳에 두고 설정 화면이 이걸 부른다.
 *
 * 설정값(테마·소리·글씨체·알림·광고 제거 구매)은 기록이 아니므로 건드리지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MainStorageKeyType } from '@/src/four/types/MainStorageKeyType';

/** 학습·퀴즈 기록 — '기록만 초기화' 와 '전체 초기화' 양쪽에서 지운다 */
const PROGRESS_KEYS: string[] = [
	MainStorageKeyType.TODAY_QUIZ_LIST,
	MainStorageKeyType.USER_STUDY_HISTORY,
	MainStorageKeyType.USER_QUIZ_HISTORY,
	MainStorageKeyType.TIME_CHALLENGE_HISTORY,
	MainStorageKeyType.TOWER_CHALLENGE_PROGRESS,
	MainStorageKeyType.USER_PROVERB_PRACTICE_RECORDS,
	MainStorageKeyType.REVIEW_SCHEDULE,
	MainStorageKeyType.DAILY_ACTIVITY,
	MainStorageKeyType.DAILY_MISSION_CLAIMED,
	MainStorageKeyType.STREAK_REWARD_CLAIMED,
	MainStorageKeyType.STREAK_FREEZE,
	MainStorageKeyType.WORD_CHAIN_BEST,
	MainStorageKeyType.LAST_SEEN_GRADE,
];

/** 모아 둔 것 — '전체 초기화' 에서만 지운다 (기록만 초기화는 즐겨찾기를 남긴다) */
const COLLECTION_KEYS: string[] = [
	MainStorageKeyType.FAVORITES_STORAGE_KEY,
	MainStorageKeyType.HANJA_FAVORITES,
	MainStorageKeyType.USER_PROVERB_BOOKS,
];

export type ResetScope = 'all' | 'progress';

/** 지우기 직전 값 — 되돌리기를 누르면 이걸 그대로 다시 넣는다 */
export type PortedSnapshot = [string, string | null][];

const keysFor = (scope: ResetScope): string[] => (scope === 'all' ? [...PROGRESS_KEYS, ...COLLECTION_KEYS] : PROGRESS_KEYS);

/**
 * 이식 화면 기록을 지운다. 지우기 전 값을 돌려주므로 되돌리기에 쓸 수 있다.
 * 저장소가 통째로 실패해도 초기화 자체는 이어가야 하므로 빈 스냅샷을 돌려준다.
 */
export const clearPortedProgress = async (scope: ResetScope): Promise<PortedSnapshot> => {
	const keys = keysFor(scope);
	try {
		const snapshot = (await AsyncStorage.multiGet(keys)) as PortedSnapshot;
		await AsyncStorage.multiRemove(keys);
		return snapshot;
	} catch (e) {
		console.warn('이식 화면 기록 삭제 실패:', e);
		return [];
	}
};

/** 되돌리기 — 값이 있던 열쇠만 다시 넣는다 (원래 비어 있던 건 비운 채로 둔다) */
export const restorePortedProgress = async (snapshot: PortedSnapshot): Promise<void> => {
	const entries = snapshot.filter((pair): pair is [string, string] => pair[1] !== null);
	if (entries.length === 0) {
		return;
	}
	try {
		await AsyncStorage.multiSet(entries);
	} catch (e) {
		console.warn('이식 화면 기록 복원 실패:', e);
	}
};
