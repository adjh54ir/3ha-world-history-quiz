import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateUtils from '@/src/utils/DateUtils';
import {
	AdFormat,
	AdGuardState,
	TOTAL_BLOCK_HOURS,
	TOTAL_CLICK_LIMIT,
	applyClick,
	emptyFormats,
	emptyState,
	isAllBlocked,
	isBlocked,
	isCapped,
	rollover,
} from './AdGuardRules';

/**
 * 광고 클릭 어뷰징 방지 (AdMob 무효 트래픽 보호)
 * -------------------------------------------------
 * 두 겹으로 막는다.
 *
 *  1) 통합 가드 — 형식을 가리지 않고 하루 TOTAL_CLICK_LIMIT회를 넘게 누르면
 *     TOTAL_BLOCK_HOURS 동안 **모든** 광고를 내린다.
 *     형식별로만 세면 배너 4회 + 전면 4회처럼 어느 한도도 안 넘기면서 하루 8번을 누를 수 있다 —
 *     AdMob 이 무효 트래픽으로 보는 것은 형식별 횟수가 아니라 그 기기의 전체 클릭 패턴이다.
 *  2) 형식별 가드 — 한 형식만 유독 많이 눌린 경우 그 형식만 먼저 내린다.
 *
 * 판정 계산은 전부 AdGuardRules 에 있고(테스트로 검증), 여기서는 저장·복원·구독만 맡는다 —
 * 같은 규칙을 두 곳에 두면 한쪽만 고쳐지고 그 사실을 아무도 모른다.
 */

export type { AdFormat };

// 상태 모양이 바뀌었다(통합 카운터 추가) — 예전 키를 그대로 읽으면 total 이 없는 채로 복원된다
const KEY = 'AD_GUARD_STATE_V3';

type Listener = () => void;

/** 기기 타임존 기준 오늘 날짜 (UTC가 아닌 로컬 자정에 리셋) */
const today = () => DateUtils.getLocalDateString();

class AdGuardServiceClass {
	private state: AdGuardState = emptyState(today());
	private listeners = new Set<Listener>();
	private loaded = false;
	private loading: Promise<void> | null = null;

	/** 저장소에서 상태 복원 (최초 1회, 중복 호출 안전) */
	init(): Promise<void> {
		if (this.loaded) return Promise.resolve();
		if (this.loading) return this.loading;
		this.loading = (async () => {
			try {
				const raw = await AsyncStorage.getItem(KEY);
				if (raw) {
					const parsed = JSON.parse(raw) as Partial<AdGuardState>;
					this.state = {
						day: parsed.day ?? today(),
						totalClickCount: parsed.totalClickCount ?? 0,
						totalBlockedUntil: parsed.totalBlockedUntil ?? null,
						formats: { ...emptyFormats(), ...(parsed.formats ?? {}) },
					};
				}
			} catch (e) {
				console.warn('AdGuard 상태 복원 실패:', e);
			}
			this.sync();
			this.loaded = true;
			this.notify();
		})();
		return this.loading;
	}

	/** 날짜 변경 시 카운트 리셋 + 만료된 차단 해제 */
	private sync() {
		rollover(this.state, today(), DateUtils.getTimestamp());
	}

	private async persist() {
		try {
			await AsyncStorage.setItem(KEY, JSON.stringify(this.state));
		} catch (e) {
			console.warn('AdGuard 상태 저장 실패:', e);
		}
	}

	private notify() {
		this.listeners.forEach((fn) => fn());
	}

	/**
	 * 클릭 1회 기록.
	 * 형식별 한도와 통합 한도를 함께 본다 — 둘 중 어느 쪽이든 먼저 걸리는 쪽이 광고를 내린다.
	 */
	async registerClick(format: AdFormat): Promise<void> {
		await this.init();
		this.sync();
		applyClick(this.state, format, DateUtils.getTimestamp());
		if (this.state.totalClickCount >= TOTAL_CLICK_LIMIT) {
			console.log(`🛡️ AdGuard: 통합 클릭 ${this.state.totalClickCount}회 → 모든 광고 ${TOTAL_BLOCK_HOURS}시간 숨김`);
		}
		await this.persist();
		this.notify();
	}

	/** 노출 1회 기록 — 하루 상한을 세는 데 쓴다 */
	async registerShow(format: AdFormat): Promise<void> {
		await this.init();
		this.sync();
		this.state.formats[format].showCount += 1;
		await this.persist();
		this.notify();
	}

	/** 오늘 노출 상한을 채웠는지 */
	isCapped(format: AdFormat): boolean {
		this.sync();
		return isCapped(this.state, format);
	}

	/** 형식과 무관하게 모든 광고가 내려가 있는지 (통합 클릭 한도 초과) */
	isAllBlocked(): boolean {
		this.sync();
		return isAllBlocked(this.state, DateUtils.getTimestamp());
	}

	/** 해당 형식을 지금 띄워도 되는지 — 통합 차단 · 형식별 차단 · 오늘 노출 상한을 모두 본다 */
	isBlocked(format: AdFormat): boolean {
		this.sync();
		return isBlocked(this.state, format, DateUtils.getTimestamp());
	}

	getState(): Readonly<AdGuardState> {
		return this.state;
	}

	subscribe(fn: Listener): () => void {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}
}

const AdGuardService = new AdGuardServiceClass();
export default AdGuardService;

/** 형식별 차단 여부 훅 — 차단 상태가 바뀌면 리렌더 */
export const useAdGuardBlocked = (format: AdFormat): boolean => {
	const [blocked, setBlocked] = useState(AdGuardService.isBlocked(format));
	useEffect(() => {
		const sync = () => setBlocked(AdGuardService.isBlocked(format));
		AdGuardService.init().then(sync);
		return AdGuardService.subscribe(sync);
	}, [format]);
	return blocked;
};
