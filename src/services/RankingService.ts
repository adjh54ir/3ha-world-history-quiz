import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './SupabaseClient';
import LearnProgressService from './LearnProgressService';
import DateUtils from '@/src/utils/DateUtils';
import { POINT_PER_CORRECT } from '@/src/const/ConstScoring';

const LAST_TOTAL_KEY = 'RANKING_LAST_TOTAL';
const TIME_BEST_KEY = 'TIME_CHALLENGE_BEST';
/** (구) 주간 점수 제출 기준값 — 주간 보드를 걷어내며 미사용, 초기화 때만 정리한다 */
const WEEK_SENT_KEY = 'RANKING_WEEK_SENT';

/**
 * 랭킹 보드 종류
 * - 주간(weekly)은 화면에서 걷어내 클라이언트에서 쓰지 않는다(SQL RPC에는 남아 있음).
 *   다시 살릴 땐 submit()의 주간 누계 제출도 함께 복구해야 한다.
 */
export type RankBoard = 'total' | 'time';
export interface RankRow {
	rank: number;
	nickname: string;
	score: number;
	isMe: boolean;
}

/** 이번 주(월요일 시작) 날짜 문자열 */
const weekStart = (): string => {
	const today = DateUtils.getLocalDateString();
	const dow = DateUtils.getLocalDayOfWeek(today); // 0=일 ~ 6=토
	const offset = dow === 0 ? 6 : dow - 1; // 월요일 기준
	return DateUtils.addLocalDays(today, -offset);
};

const currentUid = async (): Promise<string | null> => {
	const { data } = await supabase.auth.getSession();
	return data.session?.user?.id ?? null;
};

const RankingService = {
	isConfigured: isSupabaseConfigured,

	/** 익명 로그인(세션 없으면 생성) → uid */
	async signIn(): Promise<string | null> {
		if (!isSupabaseConfigured) return null;
		try {
			const existing = await currentUid();
			if (existing) return existing;
			const { data, error } = await supabase.auth.signInAnonymously();
			if (error) {
				console.warn('[Ranking] 익명 로그인 실패 — Supabase Auth에서 Anonymous sign-ins 활성화 필요:', error.message);
				return null;
			}
			return data.user?.id ?? null;
		} catch (e) {
			console.warn('[Ranking] signIn 예외:', e);
			return null;
		}
	},

	async getNickname(): Promise<string | null> {
		if (!isSupabaseConfigured) return null;
		const uid = await this.signIn();
		if (!uid) return null;
		const { data } = await supabase.from('world_quiz_profiles').select('nickname').eq('id', uid).maybeSingle();
		return data?.nickname ?? null;
	},

	async setNickname(nickname: string, characterKey?: string): Promise<boolean> {
		if (!isSupabaseConfigured) return false;
		const uid = await this.signIn();
		if (!uid) {
			console.warn('[Ranking] 닉네임 저장 불가 — 로그인(uid) 없음');
			return false;
		}
		const { error } = await supabase
			.from('world_quiz_profiles')
			.upsert({ id: uid, nickname: nickname.trim().slice(0, 16), character_key: characterKey ?? null, updated_at: DateUtils.toISOString() });
		if (error) {
			console.warn('[Ranking] 프로필 저장 실패 — SQL(world_quiz_profiles) 실행/RLS 확인:', error.message);
			return false;
		}
		await this.submit();
		return true;
	},

	/** 타임챌린지 로컬 최고 점수 조회 (신기록 판정용) */
	async getTimeBest(): Promise<number> {
		try {
			const raw = await AsyncStorage.getItem(TIME_BEST_KEY);
			return raw ? parseInt(raw, 10) : 0;
		} catch {
			return 0;
		}
	},

	/** 타임챌린지 최고 점수 로컬 기록(제출 대상) */
	async recordTimeChallenge(score: number): Promise<void> {
		try {
			const raw = await AsyncStorage.getItem(TIME_BEST_KEY);
			const prev = raw ? parseInt(raw, 10) : 0;
			if (score > prev) await AsyncStorage.setItem(TIME_BEST_KEY, String(score));
		} catch {
			// ignore
		}
	},

	/** 최고 기록 제출 (전체 점수 · 타임챌린지 최고점) */
	async submit(): Promise<void> {
		if (!isSupabaseConfigured) return;
		try {
			const uid = await this.signIn();
			if (!uid) return;
			const nick = await this.getNickname();
			if (!nick) return; // 닉네임 설정 전에는 랭킹 미참여

			// getStats는 쓰기 큐가 비워진 뒤 읽으므로, 방금 푼 마지막 문항까지 반영된 점수가 제출된다
			const stats = await LearnProgressService.getStats();
			const total = stats.totalCorrect * POINT_PER_CORRECT;
			const timeRaw = await AsyncStorage.getItem(TIME_BEST_KEY);
			const timeBest = timeRaw ? parseInt(timeRaw, 10) : 0;

			await supabase.rpc('world_quiz_submit_scores', { p_total: total, p_time_best: timeBest });
		} catch {
			// 네트워크 실패 등은 조용히 무시(다음 진입 시 재시도)
		}
	},

	async board(type: RankBoard): Promise<RankRow[]> {
		if (!isSupabaseConfigured) return [];
		try {
			const uid = await currentUid();
			const { data, error } = await supabase.rpc('world_quiz_leaderboard', { p_type: type, p_week: weekStart(), p_limit: 100 });
			if (error || !data) return [];
			return (data as { user_id: string; nickname: string; score: number; rank: number }[]).map((r) => ({
				rank: r.rank,
				nickname: r.nickname,
				score: r.score,
				isMe: r.user_id === uid,
			}));
		} catch {
			return [];
		}
	},

	/**
	 * 내 랭킹 기록 초기화 (서버 점수 삭제 + 로컬 제출 기준값 삭제)
	 * - 서버: world_quiz_reset_scores RPC (전체/타임챌린지/주간 점수 행 삭제, 닉네임은 유지)
	 * - 로컬: 타임챌린지 최고점·주간 증가분 기준값 → 남겨두면 다음 제출에서 옛 점수가 되살아남
	 * @param opts.keepTimeBest 타임챌린지 최고점은 남긴다(퀴즈만 초기화하는 경우).
	 *   서버 RPC는 전체/타임챌린지를 한 번에 지우므로, 지운 뒤 남은 기록을 즉시 재제출해 복구한다.
	 * @returns 서버 점수까지 지웠으면 true. RPC 미배포·네트워크 실패면 false(로컬만 삭제됨)
	 */
	async reset(opts?: { keepTimeBest?: boolean }): Promise<boolean> {
		const keptTimeBest = opts?.keepTimeBest ? await AsyncStorage.getItem(TIME_BEST_KEY) : null;
		await AsyncStorage.multiRemove([TIME_BEST_KEY, LAST_TOTAL_KEY, WEEK_SENT_KEY]);
		if (keptTimeBest) await AsyncStorage.setItem(TIME_BEST_KEY, keptTimeBest);
		if (!isSupabaseConfigured) return true; // 랭킹 미사용 빌드 — 로컬 삭제로 충분
		try {
			const uid = await this.signIn();
			if (!uid) return false;
			const { error } = await supabase.rpc('world_quiz_reset_scores');
			if (error) {
				// SQL(world_quiz_reset_scores) 미실행이면 여기로 — 호출부에서 사용자에게 알린다
				console.warn('[Ranking] 초기화 실패 — world_quiz_reset_scores RPC 확인:', error.message);
				return false;
			}
			// 지우지 않기로 한 기록(타임챌린지 최고점 · 남아 있는 누적 점수)을 서버에 다시 올린다
			await this.submit();
			return true;
		} catch {
			return false;
		}
	},

	async myRank(type: RankBoard): Promise<{ rank: number; score: number } | null> {
		if (!isSupabaseConfigured) return null;
		try {
			const { data, error } = await supabase.rpc('world_quiz_my_rank', { p_type: type, p_week: weekStart() });
			const row = (data as { rank: number; score: number }[] | null)?.[0];
			if (error || !row) return null;
			return { rank: row.rank, score: row.score };
		} catch {
			return null;
		}
	},
};

export default RankingService;
