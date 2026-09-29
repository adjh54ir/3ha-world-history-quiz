// services/AchievementService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import CONST_ACHIEVEMENTS, { AchievementDef } from '@/src/const/ConstAchievements';
import DateUtils from '@/src/utils/DateUtils';
import { LearnStats } from '@/src/services/LearnProgressService';

/** 이미 축하 연출을 보여준 업적 id — 퀴즈든 학습이든 한 번만 알리기 위한 공용 기록 */
const SEEN_KEY = 'ACHIEVEMENT_SEEN_IDS';
/** 업적별 해금 시각(ms) — 홈 뱃지 목록을 최신 획득순으로 보여주기 위한 기록 */
const UNLOCKED_AT_KEY = 'ACHIEVEMENT_UNLOCKED_AT';

export interface AchievementStatus {
	def: AchievementDef;
	current: number;
	unlocked: boolean;
	ratio: number; // 0~1
	unlockedAt?: number; // 해금 시각(ms) — 기록 이전에 해금된 업적은 도입 시점으로 일괄 기록됨
}

/**
 * 업적 평가 서비스 (통계 기반)
 */
const AchievementService = {
	/** 전체 업적 진행 상태 — 해금 우선, 진행률 높은 순 */
	evaluate(stats: LearnStats): AchievementStatus[] {
		return CONST_ACHIEVEMENTS.map((def) => {
			const current = Math.min(def.current(stats), def.target);
			const unlocked = current >= def.target;
			return { def, current, unlocked, ratio: def.target > 0 ? current / def.target : 0 };
		}).sort((a, b) => {
			if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
			return b.ratio - a.ratio;
		});
	},

	/** 해금 개수 / 전체 개수 */
	summary(stats: LearnStats): { unlocked: number; total: number } {
		const list = this.evaluate(stats);
		return { unlocked: list.filter((a) => a.unlocked).length, total: list.length };
	},

	/** 업적별 해금 시각 기록 */
	async unlockedAtMap(): Promise<Record<string, number>> {
		try {
			const raw = await AsyncStorage.getItem(UNLOCKED_AT_KEY);
			return raw ? JSON.parse(raw) : {};
		} catch {
			return {};
		}
	},

	/** 아직 시각이 없는 해금 업적만 지금 시각으로 채운다(기존 해금분은 같은 시각으로 일괄 기록) */
	async stampUnlocked(ids: string[]): Promise<Record<string, number>> {
		const map = await this.unlockedAtMap();
		const fresh = ids.filter((id) => map[id] == null);
		if (fresh.length === 0) return map;
		const now = DateUtils.getTimestamp();
		fresh.forEach((id) => {
			map[id] = now;
		});
		try {
			await AsyncStorage.setItem(UNLOCKED_AT_KEY, JSON.stringify(map));
		} catch {
			/* noop */
		}
		return map;
	},

	/**
	 * 해금한 업적을 획득 최신순으로 — 홈 뱃지 목록용.
	 * 같은 시각(도입 시점 일괄 기록)끼리는 evaluate 순서(해금·진행률)를 유지한다.
	 */
	async recentUnlocked(stats: LearnStats): Promise<AchievementStatus[]> {
		const unlocked = this.evaluate(stats).filter((a) => a.unlocked);
		const map = await this.stampUnlocked(unlocked.map((a) => a.def.id));
		return unlocked
			.map((a) => ({ ...a, unlockedAt: map[a.def.id] }))
			.sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0));
	},

	/** 축하 연출을 이미 본 업적으로 기록 */
	async markSeen(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		try {
			const raw = await AsyncStorage.getItem(SEEN_KEY);
			const seen: string[] = raw ? JSON.parse(raw) : [];
			await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(new Set([...seen, ...ids]))));
		} catch {
			/* noop */
		}
	},

	/**
	 * 아직 축하하지 않은 신규 해금 업적을 돌려주고 즉시 '봤음'으로 기록.
	 * 최초 실행(기록 자체가 없을 때)엔 기존 해금분을 전부 seen 처리해 알림 폭탄을 막는다.
	 */
	async pickNewlyUnlocked(stats: LearnStats): Promise<AchievementDef[]> {
		const unlocked = this.evaluate(stats).filter((a) => a.unlocked);
		try {
			const raw = await AsyncStorage.getItem(SEEN_KEY);
			if (raw == null) {
				await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(unlocked.map((a) => a.def.id)));
				return [];
			}
			const seen = new Set<string>(JSON.parse(raw));
			const fresh = unlocked.filter((a) => !seen.has(a.def.id)).map((a) => a.def);
			await this.markSeen(fresh.map((d) => d.id));
			return fresh;
		} catch {
			return [];
		}
	},
};

export default AchievementService;
