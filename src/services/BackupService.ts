import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './SupabaseClient';
import RankingService from './RankingService';
import { MainStorageKeyType } from '@/src/types/MainStorageKeyType';

/**
 * 학습 진도 클라우드 백업 (supabase/backup.sql 의 RPC 사용)
 * - 저장: 기기의 AsyncStorage 를 통째로 올린다. 복원 코드는 서버가 발급.
 * - 복원: 코드로 내려받아 덮어쓴다.
 * - 결제 상태(광고 제거)와 인증 세션은 절대 백업하지 않는다.
 *   코드만 공유하면 광고 제거가 복제되기 때문. 광고 제거는 스토어 구매 복원으로만 되살린다.
 */

/** 백업에서 제외할 키 접두사 — supabase 세션(sb-*), 리덕스 persist 는 기기 고유값 */
const EXCLUDE_PREFIX = ['sb-', 'persist:'];

/** 백업에서 제외할 키 — 결제·기기 상태 */
const EXCLUDE_KEYS = new Set<string>([MainStorageKeyType.AD_REMOVED, 'DEV_ADS_OFF', 'BACKUP_LAST_CODE']);

const LAST_CODE_KEY = 'BACKUP_LAST_CODE';

const isBackupTarget = (key: string): boolean =>
	!EXCLUDE_KEYS.has(key) && !EXCLUDE_PREFIX.some((p) => key.startsWith(p));

export interface BackupInfo {
	code: string;
	updatedAt: string;
}

const BackupService = {
	isConfigured: isSupabaseConfigured,

	/** 마지막으로 발급받은 복원 코드 (오프라인에서도 보여주기 위해 로컬 캐시) */
	async getCachedCode(): Promise<string | null> {
		return AsyncStorage.getItem(LAST_CODE_KEY);
	},

	/** 서버에 저장된 내 백업 정보 */
	async getInfo(): Promise<BackupInfo | null> {
		if (!isSupabaseConfigured) return null;
		const uid = await RankingService.signIn();
		if (!uid) return null;
		const { data, error } = await supabase.rpc('world_quiz_my_backup');
		if (error || !data?.length) return null;
		return { code: data[0].code, updatedAt: data[0].updated_at };
	},

	/** 현재 기기 데이터를 백업 → 복원 코드 반환 (실패 시 null) */
	async backup(): Promise<string | null> {
		if (!isSupabaseConfigured) return null;
		const uid = await RankingService.signIn();
		if (!uid) return null;
		try {
			const keys = (await AsyncStorage.getAllKeys()).filter(isBackupTarget);
			const pairs = await AsyncStorage.multiGet(keys);
			const payload: Record<string, string> = {};
			pairs.forEach(([k, v]) => {
				if (v !== null) payload[k] = v;
			});

			const { data, error } = await supabase.rpc('world_quiz_save_backup', { p_payload: payload });
			if (error || !data) {
				console.warn('[Backup] 저장 실패:', error?.message);
				return null;
			}
			await AsyncStorage.setItem(LAST_CODE_KEY, data);
			return data as string;
		} catch (e) {
			console.warn('[Backup] backup 예외:', e);
			return null;
		}
	},

	/**
	 * 복원 코드로 덮어쓰기
	 * - 'not-found': 코드에 해당하는 백업 없음 / 'failed': 네트워크·서버 오류
	 */
	async restore(code: string): Promise<'ok' | 'not-found' | 'failed'> {
		if (!isSupabaseConfigured) return 'failed';
		const uid = await RankingService.signIn();
		if (!uid) return 'failed';
		try {
			const { data, error } = await supabase.rpc('world_quiz_restore_backup', { p_code: code.trim().toUpperCase() });
			if (error) {
				console.warn('[Backup] 복원 실패:', error.message);
				return 'failed';
			}
			if (!data) return 'not-found';

			const entries = Object.entries(data as Record<string, string>).filter(([k]) => isBackupTarget(k));
			if (!entries.length) return 'not-found';
			await AsyncStorage.multiSet(entries);
			return 'ok';
		} catch (e) {
			console.warn('[Backup] restore 예외:', e);
			return 'failed';
		}
	},
};

export default BackupService;
