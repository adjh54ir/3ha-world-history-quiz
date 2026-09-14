import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateUtils from '@/src/utils/DateUtils';

/**
 * 광고 클릭 어뷰징 방지 (AdMob 무효 트래픽 보호)
 * -------------------------------------------------
 * - 광고 클릭을 "형식별로 따로" 일 단위 집계 (배너 / 전면)
 * - 형식별로 하루 CLICK_LIMIT회 이상 클릭하면 BLOCK_HOURS시간 동안 해당 형식만 숨김
 *   (예: 배너 5회 → 배너만 차단, 전면 광고는 계속 노출)
 * - AsyncStorage 영속 → 앱 재시작해도 차단 유지, 기간이 지나면 자동 해제
 * - 구독 패턴으로 화면(광고 컴포넌트)에 즉시 반영
 */

export type AdFormat = 'banner' | 'interstitial' | 'appOpen';

const KEY = 'AD_GUARD_STATE_V2';

/**
 * 형식별 정책
 * - clickLimit: 하루 허용 클릭 수 (넘으면 blockHours 동안 숨김)
 * - showLimit: 하루 노출 상한. 광고가 과하면 학습 흐름이 끊기고 이탈로 이어져서 형식별로 막아 둔다.
 *   (배너는 상시 노출이라 상한 없음 = null)
 */
const POLICY: Record<AdFormat, { clickLimit: number; blockHours: number; showLimit: number | null }> = {
	banner: { clickLimit: 5, blockHours: 24, showLimit: null },
	interstitial: { clickLimit: 5, blockHours: 24, showLimit: 5 },
	// 앱 오프닝은 실행당 최대 1회라 상한이 크게 필요 없지만, 앱을 껐다 켜기를 반복하는 경우를 막아 둔다
	appOpen: { clickLimit: 5, blockHours: 24, showLimit: 5 },
};

interface FormatState {
	clickCount: number;
	/** 오늘 노출한 횟수 (날짜가 바뀌면 리셋) */
	showCount: number;
	/** 차단 해제 시각(epoch ms), null이면 차단 아님 */
	blockedUntil: number | null;
}

interface AdGuardState {
	/** 집계 기준일 (YYYY-MM-DD, 기기 타임존 기준) — 날짜가 바뀌면 카운트 리셋 */
	day: string;
	formats: Record<AdFormat, FormatState>;
}

type Listener = () => void;

/** 기기 타임존 기준 오늘 날짜 (UTC가 아닌 로컬 자정에 리셋) */
const today = () => DateUtils.getLocalDateString();

const emptyFormats = (): Record<AdFormat, FormatState> => ({
	banner: { clickCount: 0, showCount: 0, blockedUntil: null },
	interstitial: { clickCount: 0, showCount: 0, blockedUntil: null },
	appOpen: { clickCount: 0, showCount: 0, blockedUntil: null },
});

class AdGuardServiceClass {
	private state: AdGuardState = { day: today(), formats: emptyFormats() };
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
						formats: { ...emptyFormats(), ...(parsed.formats ?? {}) },
					};
				}
			} catch (e) {
				console.warn('AdGuard 상태 복원 실패:', e);
			}
			this.rollover();
			this.loaded = true;
			this.notify();
		})();
		return this.loading;
	}

	/** 날짜 변경 시 카운트 리셋 + 만료된 차단 해제 */
	private rollover() {
		const d = today();
		if (this.state.day !== d) {
			this.state.day = d;
			(Object.keys(this.state.formats) as AdFormat[]).forEach((f) => {
				this.state.formats[f].clickCount = 0;
				this.state.formats[f].showCount = 0;
			});
		}
		(Object.keys(this.state.formats) as AdFormat[]).forEach((f) => {
			const fs = this.state.formats[f];
			if (fs.blockedUntil != null && DateUtils.nowTime() >= fs.blockedUntil) fs.blockedUntil = null;
		});
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

	/** 해당 형식의 클릭 1회 기록 — 한도 도달 시 그 형식만 차단 시작 */
	async registerClick(format: AdFormat): Promise<void> {
		await this.init();
		this.rollover();
		const fs = this.state.formats[format];
		const { clickLimit, blockHours } = POLICY[format];
		fs.clickCount += 1;
		if (fs.clickCount >= clickLimit && fs.blockedUntil == null) {
			fs.blockedUntil = DateUtils.nowTime() + blockHours * 3600 * 1000;
			console.log(`🛡️ AdGuard[${format}]: 클릭 ${fs.clickCount}회 → ${blockHours}시간 숨김`);
		}
		await this.persist();
		this.notify();
	}

	/** 노출 1회 기록 — 하루 상한을 세는 데 쓴다 */
	async registerShow(format: AdFormat): Promise<void> {
		await this.init();
		this.rollover();
		this.state.formats[format].showCount += 1;
		await this.persist();
		this.notify();
	}

	/** 오늘 노출 상한을 채웠는지 */
	isCapped(format: AdFormat): boolean {
		this.rollover();
		const { showLimit } = POLICY[format];
		return showLimit != null && this.state.formats[format].showCount >= showLimit;
	}

	/** 해당 형식의 차단 여부 — 클릭 어뷰징 차단 중이거나 오늘 노출 상한을 채운 경우 */
	isBlocked(format: AdFormat): boolean {
		this.rollover();
		const fs = this.state.formats[format];
		const blocked = fs.blockedUntil != null && DateUtils.nowTime() < fs.blockedUntil;
		return blocked || this.isCapped(format);
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
