import { useSyncExternalStore } from 'react';
import { isAdsRemoved, subscribeAdsRemoved } from '@/src/services/PurchaseService';

/** 광고 제거 구매 여부 (구매 즉시 모든 광고 컴포넌트에 실시간 반영) */
export const useAdsRemoved = (): boolean => useSyncExternalStore(subscribeAdsRemoved, isAdsRemoved, isAdsRemoved);

export default useAdsRemoved;
