import AsyncStorage from '@react-native-async-storage/async-storage';
import { MainStorageKeyType } from '@/src/types/MainStorageKeyType';
import { IAP_REMOVE_AD_KEY } from '@/src/const/EnvCompat';
import PurchaseSyncService from './PurchaseSyncService';

/**
 * 광고 제거 인앱 결제 서비스 (react-native-iap v16 / OpenIAP)
 * - 자동갱신 구독(월간/연간) → 구독 기간 동안 광고 제거
 * - 평생(비소모성) 1회 구매 → 영구 광고 제거
 * - 네이티브 모듈 미링크(prebuild 전) 환경에서도 앱이 죽지 않도록 모든 호출을 lazy require + guard 처리
 * - 연결은 지연 재시도(ensureConnected)로 처리해 앱 시작 직후 진입에도 구매/가격 조회가 실패하지 않음
 * - 소유 권한은 "스토어 실제 구매 이력"을 진실의 원천으로 삼고(verifyEntitlement),
 *   AsyncStorage(AD_REMOVED) 플래그는 오프라인 캐시로만 사용 → 로컬 값 조작으로 우회 불가
 */

/** 평생 광고 제거 (비소모성 1회 구매) */
export const REMOVE_AD_SKU = IAP_REMOVE_AD_KEY || 'com.tha.worldhistoryquiz.remove_ad';

export type SubPlan = 'monthly' | 'yearly';
export const SUB_SKUS: Record<SubPlan, string> = {
	monthly: `${REMOVE_AD_SKU}.monthly`,
	yearly: `${REMOVE_AD_SKU}.yearly`,
};
export type Plan = SubPlan | 'lifetime';
export const PLAN_SKUS: Record<Plan, string> = { ...SUB_SKUS, lifetime: REMOVE_AD_SKU };
const ENTITLEMENT_SKUS = Object.values(PLAN_SKUS);
const isEntitlementSku = (id?: string) => !!id && ENTITLEMENT_SKUS.includes(id);

// ─── 광고 제거 플래그 (동기 캐시 + 구독) ───────────────────────
let adsRemovedCache = false;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

/** 광고 컴포넌트에서 동기적으로 조회 */
export const isAdsRemoved = (): boolean => adsRemovedCache;

/** 상태 변경 구독 (useSyncExternalStore 호환) */
export const subscribeAdsRemoved = (listener: () => void): (() => void) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};

// ─── [개발용] 미구매 상태 강제 오버라이드 ──────────────────────
// 스토어 구매 이력이 남아 있으면 verifyEntitlement 가 매 실행마다 true 로 정정하므로,
// __DEV__ 에서 광고 노출을 테스트할 수 있도록 '강제 미구매' 플래그를 둔다.
const DEV_ADS_OFF_KEY = 'DEV_FORCE_ADS_ON';
let devForceAdsOn = false;

/**
 * 광고 테스트 도구 노출 스위치
 * ⚠️ 테스트 단계라 릴리즈(prd) 빌드에서도 활성. 정식 출시 전 false 로 변경할 것.
 */
export const ADS_TEST_TOOLS_ENABLED = __DEV__;

/** 강제 미구매 오버라이드 활성 여부 */
export const isDevAdsOverrideOn = (): boolean => ADS_TEST_TOOLS_ENABLED && devForceAdsOn;

/** 앱 시작 시 저장된 플래그 로드 */
export const loadAdsRemoved = async (): Promise<boolean> => {
	try {
		if (ADS_TEST_TOOLS_ENABLED) devForceAdsOn = (await AsyncStorage.getItem(DEV_ADS_OFF_KEY)) === '1';
		const v = await AsyncStorage.getItem(MainStorageKeyType.AD_REMOVED);
		adsRemovedCache = v === 'true';
	} catch {
		adsRemovedCache = false;
	}
	if (isDevAdsOverrideOn()) adsRemovedCache = false;
	notify();
	return adsRemovedCache;
};

/**
 * @param removed 광고 제거 여부
 * @param userAction 사용자가 직접 구매·복원한 결과인지 여부
 *  - true  : 강제 미구매 오버라이드를 자동 해제하고 값 반영(테스트 중 재구매가 먹지 않던 문제 방지)
 *  - false : 백그라운드 재검증 → 오버라이드가 켜져 있으면 미구매 상태 유지
 */
const persistAdsRemoved = async (removed: boolean, userAction = false) => {
	if (removed && userAction && devForceAdsOn) {
		devForceAdsOn = false;
		try {
			await AsyncStorage.removeItem(DEV_ADS_OFF_KEY);
		} catch {}
	}
	// 강제 미구매 중에는 true 승격을 무시(스토어 재검증에도 미구매 유지)
	const next = isDevAdsOverrideOn() ? false : removed;
	if (adsRemovedCache !== next) {
		adsRemovedCache = next;
		notify();
	}
	try {
		await AsyncStorage.setItem(MainStorageKeyType.AD_REMOVED, removed ? 'true' : 'false');
	} catch {}
};

// ─── IAP 모듈 lazy 로드 ───────────────────────────────────────
type IapModule = typeof import('react-native-iap');
type PurchaseLike = {
	id?: string;
	productId?: string;
	purchaseToken?: string | null;
	transactionDate?: number;
	purchaseState?: string;
	expirationDateIOS?: number | null;
	environmentIOS?: string | null;
};

/** 스토어 구매 목록에서 유효한 광고 제거 권한 찾기 (결제 대기·만료된 iOS 구독 제외) */
const findOwned = (purchases: PurchaseLike[] | null): PurchaseLike | undefined =>
	(purchases ?? []).find(
		(p) =>
			isEntitlementSku(p?.productId) &&
			p.purchaseState !== 'pending' &&
			!(p.expirationDateIOS && p.expirationDateIOS < Date.now()),
	);

// Xcode StoreKit 로컬 테스트 거래는 ID가 0,1,2… 로 겹치므로 서버에 올리지 않는다 (빈 ID → upload 가 건너뜀)
const toRecord = (p: PurchaseLike) => ({
	transactionId: p.environmentIOS === 'Xcode' ? '' : (p.id ?? ''),
	productId: p.productId ?? REMOVE_AD_SKU,
	purchaseToken: p.purchaseToken ?? null,
	purchasedAt: p.transactionDate ?? null,
	expiresAt: p.expirationDateIOS ?? null,
});

let iap: IapModule | null = null;
const getIap = (): IapModule | null => {
	if (iap) return iap;
	try {
		iap = require('react-native-iap') as IapModule;
		return iap;
	} catch (e) {
		console.warn('react-native-iap 모듈 로드 실패(미설치/미링크?):', e);
		return null;
	}
};

let connected = false;
let connecting: Promise<boolean> | null = null;
let listenersAttached = false;
let updateSub: { remove: () => void } | null = null;
let errorSub: { remove: () => void } | null = null;

// ─── 구매 에러 전달 (스토어 → 화면) ───────────────────────────
export interface IapError {
	code?: string;
	message?: string;
}
const errorListeners = new Set<(e: IapError) => void>();

/** 구매 에러 구독 (화면에서 안내 문구 표시용) */
export const subscribePurchaseError = (cb: (e: IapError) => void): (() => void) => {
	errorListeners.add(cb);
	return () => errorListeners.delete(cb);
};

/** 사용자 취소 여부 판별 (플랫폼별 코드 상이) */
export const isCancelError = (code?: string): boolean => /cancel/i.test(String(code ?? ''));

/** 구매 성공 처리: 플래그 저장 → 서버 기록 → 트랜잭션 마무리 */
const grantAndFinish = async (mod: IapModule, purchase: PurchaseLike) => {
	// pending(결제 대기: 편의점 결제 등)은 권한 부여하지 않음
	if (purchase.purchaseState === 'pending') return;
	// 사용자 구매 결과 → 테스트용 강제 미구매 오버라이드가 있어도 구매 상태로 반영
	await persistAdsRemoved(true, true);
	// 서버 동기화(Supabase)는 타임아웃이 없어 지연될 수 있으므로 트랜잭션 마무리를 막지 않는다
	try {
		await mod.finishTransaction({ purchase: purchase as never, isConsumable: false });
	} catch (e) {
		console.warn('구매 마무리 실패:', e);
	}
	PurchaseSyncService.upload(toRecord(purchase)).catch(() => {});
};

/** 구매/에러 리스너 등록 (연결과 무관하게 1회만) */
const attachListeners = (mod: IapModule) => {
	if (listenersAttached) return;
	listenersAttached = true;
	updateSub = mod.purchaseUpdatedListener(async (purchase) => {
		try {
			const p = purchase as PurchaseLike;
			if (isEntitlementSku(p.productId)) await grantAndFinish(mod, p);
			else await mod.finishTransaction({ purchase, isConsumable: false });
		} catch (e) {
			console.warn('구매 처리 실패:', e);
		}
	});
	errorSub = mod.purchaseErrorListener((e) => {
		console.log('[IAP] purchase error:', e.code, e.message);
		const payload: IapError = { code: String(e.code ?? ''), message: e.message };
		errorListeners.forEach((cb) => cb(payload));
	});
};

/**
 * 스토어 연결 보장 (미연결이면 즉시 연결 시도, 동시 호출은 하나의 Promise 공유)
 * @returns 연결 성공 여부
 */
export const ensureConnected = async (): Promise<boolean> => {
	if (connected) return true;
	const mod = getIap();
	if (!mod) return false;
	if (connecting) return connecting;
	connecting = (async () => {
		try {
			await mod.initConnection();
			connected = true;
			attachListeners(mod);
			return true;
		} catch (e) {
			console.warn('IAP 연결 실패:', e);
			connected = false;
			return false;
		} finally {
			connecting = null;
		}
	})();
	return connecting;
};

/**
 * 스토어 실제 구매 이력으로 권한 재검증
 * - 소유 O → 플래그 true + 서버 기록 갱신
 * - 소유 X → 서버에도 유효 권한이 없으면 플래그 false 로 정정 (구독 만료·로컬 조작 반영)
 * - 조회 실패(오프라인 등) → 기존 캐시 값 유지 (그레이스)
 */
export const verifyEntitlement = async (): Promise<boolean> => {
	const mod = getIap();
	if (!mod) return adsRemovedCache;
	const ok = await ensureConnected();
	if (!ok) return adsRemovedCache;
	try {
		const purchases = (await mod.getAvailablePurchases()) as PurchaseLike[] | null;
		const owned = findOwned(purchases);
		if (owned) {
			await persistAdsRemoved(true);
			await PurchaseSyncService.upload(toRecord(owned));
			return true;
		}
		// 스토어에 없음 → 서버 기록으로 2차 확인 (계정 이전·스토어 일시 오류 대비)
		const serverOwned = await PurchaseSyncService.isActive();
		if (serverOwned === true) return true;
		if (serverOwned === false) await persistAdsRemoved(false);
		return adsRemovedCache;
	} catch (e) {
		console.warn('권한 검증 실패:', e);
		return adsRemovedCache;
	}
};

/**
 * 앱 시작 시 1회 호출: 저장 플래그 로드 → 스토어 연결 → 권한 재검증
 * - 광고 노출 판단이 늦어지지 않도록 플래그 로드를 먼저 await
 */
export const initPurchase = async (): Promise<void> => {
	// 출시 사고 방지: 릴리즈 번들에 테스트 도구가 켜진 채 나가면 시작 로그로 경고
	if (ADS_TEST_TOOLS_ENABLED && !__DEV__) {
		console.warn(
			'[IAP] ⚠️ ADS_TEST_TOOLS_ENABLED=true 상태로 릴리즈 빌드가 실행되었습니다. ' +
				'정식 출시 전 src/services/PurchaseService.ts 에서 false 로 변경하세요.',
		);
	}
	await loadAdsRemoved();
	await ensureConnected();
	await logDiagnostics();
	await verifyEntitlement();
};

/** 스토어 연결 해제 (필요 시) */
export const endPurchase = async (): Promise<void> => {
	const mod = getIap();
	if (!mod) return;
	try {
		updateSub?.remove();
		errorSub?.remove();
		updateSub = null;
		errorSub = null;
		listenersAttached = false;
		await mod.endConnection();
	} catch {}
	connected = false;
};

type StoreProduct = {
	id?: string;
	displayPrice?: string;
	price?: number | null;
	currency?: string;
	subscriptionOffers?: { offerTokenAndroid?: string | null }[] | null;
};

/**
 * 상품 조회 (스토어 일시 오류 대비 재시도)
 * - 첫 호출이 앱 시작 직후면 StoreKit 응답이 비는 경우가 있어 짧은 백오프로 재시도
 */
const PRODUCT_RETRY_DELAYS_MS = [0, 600, 1500];
const fetchStoreProducts = async (mod: IapModule, type: 'subs' | 'in-app'): Promise<StoreProduct[]> => {
	const skus = type === 'subs' ? Object.values(SUB_SKUS) : [REMOVE_AD_SKU];
	for (const wait of PRODUCT_RETRY_DELAYS_MS) {
		if (wait) await new Promise((r) => setTimeout(r, wait));
		try {
			const products = ((await mod.fetchProducts({ skus, type })) ?? []) as StoreProduct[];
			if (products.length) return products;
			console.warn(`[IAP] ${type} 상품 0개 — SKU=${skus.join(', ')}`);
		} catch (e) {
			console.warn('[IAP] 상품 조회 실패:', e);
		}
	}
	return [];
};

export interface SubPlanInfo {
	displayPrice: string;
	price?: number | null;
	currency?: string;
}

/** 플랜별 스토어 표시 가격 (조회 실패한 플랜은 빠짐 → 화면에서 기본 가격 표기) */
export const getPlans = async (): Promise<Partial<Record<Plan, SubPlanInfo>>> => {
	const mod = getIap();
	if (!mod || !(await ensureConnected())) return {};
	const [subs, inApp] = await Promise.all([fetchStoreProducts(mod, 'subs'), fetchStoreProducts(mod, 'in-app')]);
	const products = [...subs, ...inApp];
	const out: Partial<Record<Plan, SubPlanInfo>> = {};
	(Object.keys(PLAN_SKUS) as Plan[]).forEach((plan) => {
		const p = products.find((it) => it.id === PLAN_SKUS[plan]);
		if (p?.displayPrice) out[plan] = { displayPrice: p.displayPrice, price: p.price, currency: p.currency };
	});
	return out;
};

export type PurchaseFailReason = 'no-module' | 'not-connected' | 'no-product' | 'cancelled' | 'failed';
export interface PurchaseRequestResult {
	ok: boolean;
	reason?: PurchaseFailReason;
	message?: string;
}

/**
 * 광고 제거 구매 요청 — 구독(월간/연간) 또는 평생 1회 구매 (성공 결과는 purchaseUpdatedListener에서 처리)
 * - Android 구독은 기본 요금제(base plan)의 offerToken 이 필수
 */
export const purchasePlan = async (plan: Plan): Promise<PurchaseRequestResult> => {
	const mod = getIap();
	if (!mod) return { ok: false, reason: 'no-module' };
	if (!(await ensureConnected())) return { ok: false, reason: 'not-connected' };

	const sku = PLAN_SKUS[plan];
	const type = plan === 'lifetime' ? 'in-app' : 'subs';
	const product = (await fetchStoreProducts(mod, type)).find((p) => p.id === sku);
	if (!product) return { ok: false, reason: 'no-product' };
	const offerToken = product.subscriptionOffers?.find((o) => o.offerTokenAndroid)?.offerTokenAndroid;

	try {
		if (type === 'in-app') {
			await mod.requestPurchase({ request: { apple: { sku }, google: { skus: [sku] } }, type });
		} else {
			await mod.requestPurchase({
				request: {
					apple: { sku },
					google: { skus: [sku], subscriptionOffers: offerToken ? [{ sku, offerToken }] : undefined },
				},
				type,
			});
		}
		return { ok: true };
	} catch (e) {
		const err = e as IapError;
		if (isCancelError(err?.code)) return { ok: false, reason: 'cancelled' };
		// 이미 보유 중 → 소유 상태로 간주해 즉시 반영
		if (/already[\s_-]?own/i.test(`${err?.code ?? ''} ${err?.message ?? ''}`)) {
			await persistAdsRemoved(true, true);
			return { ok: true };
		}
		console.warn('[IAP] 구매 요청 실패:', err?.code, err?.message);
		return { ok: false, reason: 'failed', message: err?.message };
	}
};

/** 결제 환경 진단 (앱 시작 시 로그 출력 — 콘솔에서 원인 즉시 확인용) */
export const logDiagnostics = async (): Promise<void> => {
	const mod = getIap();
	if (!mod) {
		console.warn('[IAP] ❌ 네이티브 모듈 없음 — pod install 후 앱 재빌드 필요');
		return;
	}
	const conn = await ensureConnected();
	if (!conn) {
		console.warn('[IAP] ❌ 스토어 연결 실패 — 시뮬레이터면 StoreKit Configuration 미선택 가능성');
		return;
	}
	const ps = [...(await fetchStoreProducts(mod, 'subs')), ...(await fetchStoreProducts(mod, 'in-app'))];
	if (!ps.length) console.warn('[IAP] ⚠️ 연결 OK / 상품 0개 — 유료 계약(Paid Apps)·상품 상태 확인');
	else console.log(`[IAP] ✅ 연결 OK — ${ps.map((p) => `${p.id}=${p.displayPrice}`).join(', ')}`);
};

/**
 * 구매 복원 (기기 변경/재설치) — 스토어 → 서버 기록 순으로 확인
 * @returns 광고 제거 구매 이력 존재 여부, 확인 불가면 null
 */
export const restorePurchases = async (): Promise<boolean | null> => {
	const mod = getIap();
	if (!mod) return null;
	if (!(await ensureConnected())) return null;
	try {
		const purchases = (await mod.getAvailablePurchases()) as PurchaseLike[] | null;
		const owned = findOwned(purchases);
		if (owned) {
			// 사용자가 직접 누른 '구매 복원' → 테스트용 강제 미구매 오버라이드도 해제
			await persistAdsRemoved(true, true);
			await PurchaseSyncService.upload(toRecord(owned));
			return true;
		}
		const serverOwned = await PurchaseSyncService.isActive();
		if (serverOwned === true) {
			await persistAdsRemoved(true, true);
			return true;
		}
		return false;
	} catch (e) {
		console.warn('구매 복원 실패:', e);
		return null;
	}
};

/**
 * [테스트용] 광고 제거 상태 되돌리기 — '강제 미구매' 오버라이드 ON
 * - ADS_TEST_TOOLS_ENABLED 일 때만 동작. 스토어 구매 이력·서버 기록은 건드리지 않음
 * - 오버라이드가 켜져 있으면 스토어 재검증(verifyEntitlement)에도 미구매 상태가 유지된다
 */
export const devResetAdsRemoved = async (): Promise<boolean> => {
	if (!ADS_TEST_TOOLS_ENABLED) return isAdsRemoved();
	devForceAdsOn = true;
	try {
		await AsyncStorage.setItem(DEV_ADS_OFF_KEY, '1');
	} catch {}
	await persistAdsRemoved(false);
	adsRemovedCache = false;
	notify();
	return false;
};

/**
 * [테스트용] 강제 미구매 오버라이드 해제 — 실제 구매 상태로 복귀
 * - 해제 후 스토어 재검증으로 구매 이력이 있으면 다시 광고 제거 상태가 된다
 */
export const devClearAdsOverride = async (): Promise<boolean> => {
	if (!ADS_TEST_TOOLS_ENABLED) return isAdsRemoved();
	devForceAdsOn = false;
	try {
		await AsyncStorage.removeItem(DEV_ADS_OFF_KEY);
	} catch {}
	// 저장소에 남아 있는 실제 구매 플래그를 먼저 복원
	// (스토어 미연결·시뮬레이터에서는 verifyEntitlement가 캐시값만 반환해 복귀되지 않던 문제)
	try {
		const saved = await AsyncStorage.getItem(MainStorageKeyType.AD_REMOVED);
		if (saved === 'true') {
			adsRemovedCache = true;
			notify();
		}
	} catch {}
	await verifyEntitlement();
	return isAdsRemoved();
};

export default {
	REMOVE_AD_SKU,
	SUB_SKUS,
	PLAN_SKUS,
	isAdsRemoved,
	subscribeAdsRemoved,
	subscribePurchaseError,
	isCancelError,
	loadAdsRemoved,
	ensureConnected,
	verifyEntitlement,
	logDiagnostics,
	initPurchase,
	endPurchase,
	getPlans,
	purchasePlan,
	restorePurchases,
	devResetAdsRemoved,
	devClearAdsOverride,
	isDevAdsOverrideOn,
};
