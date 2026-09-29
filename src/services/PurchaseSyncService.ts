import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './SupabaseClient';
import RankingService from './RankingService';

/**
 * 인앱 구매 기록 서버 동기화 (Supabase Edge Function: worldquiz-purchase → iap_purchases)
 * - 기기 변경·재설치 시 스토어 복원과 별개로 서버 기록으로도 권한 회복
 * - 테이블 쓰기는 Edge Function(service_role)만 가능 — 클라이언트 직접 쓰기 차단
 * - 미설정(Supabase 키 없음) 환경에서도 앱이 죽지 않도록 모든 경로를 guard 처리
 */

const FUNCTION = 'worldquiz-purchase';

export interface PurchaseRecord {
	transactionId: string;
	productId: string;
	purchaseToken?: string | null;
	purchasedAt?: number | null;
	/** 구독 만료 시각(ms) — iOS 만 제공, Android 는 서버가 구독 기간으로 계산 */
	expiresAt?: number | null;
}

/** 익명 로그인 보장 후 함수 호출 (세션 JWT 가 자동 첨부됨) */
const invoke = async <T,>(body: Record<string, unknown>): Promise<T | null> => {
	if (!isSupabaseConfigured) return null;
	try {
		if (!(await RankingService.signIn())) return null;
		const { data, error } = await supabase.functions.invoke<T>(FUNCTION, { body });
		if (error) {
			console.warn(`[Purchase] ${String(body.action)} 실패:`, error.message);
			return null;
		}
		return data;
	} catch (e) {
		console.warn(`[Purchase] ${String(body.action)} 예외:`, e);
		return null;
	}
};

const PurchaseSyncService = {
	isConfigured: isSupabaseConfigured,

	/** 구매 기록 업로드 (소유권을 현재 uid 로 이관) */
	async upload(rec: PurchaseRecord): Promise<boolean> {
		if (!rec.transactionId) return false;
		const res = await invoke<{ ok: boolean }>({ action: 'record', platform: Platform.OS, ...rec });
		return !!res?.ok;
	},

	/**
	 * 서버 기준 광고 제거 권한 여부 (평생 구매 또는 만료 전 구독)
	 * @returns true/false, 조회 불가(미설정·네트워크 실패)면 null
	 */
	async isActive(): Promise<boolean | null> {
		const res = await invoke<{ active: boolean }>({ action: 'status' });
		return res ? res.active : null;
	},
};

export default PurchaseSyncService;
