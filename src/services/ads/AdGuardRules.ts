/**
 * 광고 가드의 판정 규칙 (순수 함수).
 * -------------------------------------------------
 * 저장소·구독은 AdGuardService 가 맡고, "지금 광고를 띄워도 되는가" 를 정하는 계산만 여기 둔다.
 * 이 판단이 틀리면 AdMob 이 무효 트래픽으로 보고 계정을 정지시킬 수 있어서,
 * react-native 의존 없이 `node --test` 로 그대로 돌려 검증한다.
 *
 * 실행 검증: yarn test (AdGuardRules.test.ts)
 */

export type AdFormat = 'banner' | 'interstitial' | 'rewarded';

/** 형식을 가리지 않은 하루 클릭 한도. 넘으면 모든 광고를 내린다 */
export const TOTAL_CLICK_LIMIT = 5;

/** 통합 한도를 넘겼을 때 광고를 내리는 시간 */
export const TOTAL_BLOCK_HOURS = 24;

/**
 * 형식별 정책
 * - clickLimit: 하루 허용 클릭 수 (넘으면 blockHours 동안 그 형식만 숨김)
 * - showLimit: 하루 노출 상한. 광고가 과하면 흐름이 끊기고 이탈로 이어져 형식별로 막아 둔다.
 *   (배너는 상시 노출이라 상한 없음 = null)
 */
export const POLICY: Record<AdFormat, { clickLimit: number; blockHours: number; showLimit: number | null }> = {
	banner: { clickLimit: 5, blockHours: 24, showLimit: null },
	interstitial: { clickLimit: 5, blockHours: 24, showLimit: 5 },
	// 리워드는 사용자가 직접 눌러서 보는 광고다 — 노출 상한을 두면 생성 자체가 막혀 버린다
	rewarded: { clickLimit: 8, blockHours: 24, showLimit: null },
};

export interface FormatState {
	clickCount: number;
	/** 오늘 노출한 횟수 (날짜가 바뀌면 리셋) */
	showCount: number;
	/** 차단 해제 시각(epoch ms), null이면 차단 아님 */
	blockedUntil: number | null;
}

export interface AdGuardState {
	/** 집계 기준일 (YYYY-MM-DD, 기기 타임존 기준) — 날짜가 바뀌면 카운트 리셋 */
	day: string;
	/** 오늘 누른 광고 클릭 총합 (형식 무관) */
	totalClickCount: number;
	/** 전체 차단 해제 시각(epoch ms). null 이면 차단 아님 */
	totalBlockedUntil: number | null;
	formats: Record<AdFormat, FormatState>;
}

const HOUR_MS = 3600 * 1000;

export const emptyFormats = (): Record<AdFormat, FormatState> => ({
	banner: { clickCount: 0, showCount: 0, blockedUntil: null },
	interstitial: { clickCount: 0, showCount: 0, blockedUntil: null },
	rewarded: { clickCount: 0, showCount: 0, blockedUntil: null },
});

export const emptyState = (day: string): AdGuardState => ({
	day,
	totalClickCount: 0,
	totalBlockedUntil: null,
	formats: emptyFormats(),
});

/**
 * 날짜가 바뀌었으면 카운트를 리셋하고, 기간이 지난 차단을 푼다. (state 를 직접 고친다)
 *
 * 카운트는 날짜 기준이지만 **차단 기간은 날짜와 무관하다** — 23시에 걸린 차단이
 * 자정 한 시간 만에 풀리면 하루 한도를 우회하는 길이 생긴다.
 */
export const rollover = (state: AdGuardState, today: string, now: number): void => {
	if (state.day !== today) {
		state.day = today;
		state.totalClickCount = 0;
		(Object.keys(state.formats) as AdFormat[]).forEach((f) => {
			state.formats[f].clickCount = 0;
			state.formats[f].showCount = 0;
		});
	}
	if (state.totalBlockedUntil != null && now >= state.totalBlockedUntil) {
		state.totalBlockedUntil = null;
	}
	(Object.keys(state.formats) as AdFormat[]).forEach((f) => {
		const fs = state.formats[f];
		if (fs.blockedUntil != null && now >= fs.blockedUntil) {
			fs.blockedUntil = null;
		}
	});
};

/** 클릭 1회를 반영한다 (형식별·통합 카운터를 함께 올리고, 한도에 닿으면 차단을 건다) */
export const applyClick = (state: AdGuardState, format: AdFormat, now: number): void => {
	const fs = state.formats[format];
	const { clickLimit, blockHours } = POLICY[format];

	fs.clickCount += 1;
	if (fs.clickCount >= clickLimit && fs.blockedUntil == null) {
		fs.blockedUntil = now + blockHours * HOUR_MS;
	}

	state.totalClickCount += 1;
	if (state.totalClickCount >= TOTAL_CLICK_LIMIT && state.totalBlockedUntil == null) {
		state.totalBlockedUntil = now + TOTAL_BLOCK_HOURS * HOUR_MS;
	}
};

/** 형식과 무관하게 모든 광고가 내려가 있는지 (통합 클릭 한도 초과) */
export const isAllBlocked = (state: AdGuardState, now: number): boolean =>
	state.totalBlockedUntil != null && now < state.totalBlockedUntil;

/** 오늘 노출 상한을 채웠는지 */
export const isCapped = (state: AdGuardState, format: AdFormat): boolean => {
	const { showLimit } = POLICY[format];
	return showLimit != null && state.formats[format].showCount >= showLimit;
};

/** 해당 형식을 지금 띄워도 되는지 — 통합 차단 · 형식별 차단 · 오늘 노출 상한을 모두 본다 */
export const isBlocked = (state: AdGuardState, format: AdFormat, now: number): boolean => {
	if (isAllBlocked(state, now)) {
		return true;
	}
	const fs = state.formats[format];
	const blocked = fs.blockedUntil != null && now < fs.blockedUntil;
	return blocked || isCapped(state, format);
};
