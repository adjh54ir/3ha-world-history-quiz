import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds, useForeground } from 'react-native-google-mobile-ads';
import analytics from '@react-native-firebase/analytics';
import DeviceInfo from 'react-native-device-info';
import { themed } from '@/src/utils/ThemedStyles';
import DateUtils from '@/src/utils/DateUtils';
import { isAdClickCapped, recordAdClick } from '@/src/services/AdClickGuard';
import { markBannerSettled, skipAppOpenOnNextResume } from '@/src/services/AppOpenAdService';
import { GOOGLE_ADMOV_ANDROID_BANNER, GOOGLE_ADMOV_IOS_BANNER } from '@env';
import { resolveAdUnitId } from './adUnitId';

type AdUnitIdType = string;

// __DEV__ 는 테스트 유닛, 그 외는 운영 유닛 (adUnitId.ts)
const AD_UNIT_ID: AdUnitIdType = resolveAdUnitId(
	Platform.select({ ios: GOOGLE_ADMOV_IOS_BANNER, android: GOOGLE_ADMOV_ANDROID_BANNER }),
	TestIds.BANNER,
);

interface AdmobBannerAdProps {
	paramMarginTop?: number;
	paramMarginBottom?: number;
	visible?: boolean;
}

const AdmobBannerAd: React.FC<AdmobBannerAdProps> = ({
	paramMarginTop = 6,
	paramMarginBottom = 6,
	visible = true, // 표시 여부
}) => {
	const bannerRef = useRef<BannerAd | null>(null);
	const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	// 오늘 광고 클릭 상한(AdClickGuard)에 걸렸는지 — 확인 전(null)·상한 도달(true)이면 배너를 그리지 않는다
	const [capped, setCapped] = useState<boolean | null>(null);
	const refreshCap = useCallback(() => {
		void isAdClickCapped().then(setCapped);
	}, []);

	useEffect(() => {
		refreshCap();
		return () => clearTimeout(retryTimer.current);
	}, [refreshCap]);

	// 배너를 안 띄우는 날은 시작 광고 대기(스플래시)를 붙잡지 않는다
	useEffect(() => {
		if (capped) markBannerSettled();
	}, [capped]);

	// 로드 실패(오프라인 시작 등) 시 30초 뒤 재요청 — 빈 배너로 남지 않게
	const handleAdFailed = (e: Error) => {
		markBannerSettled();
		console.warn('❌ [AdMob] 배너 로드 실패:', AD_UNIT_ID, e);
		clearTimeout(retryTimer.current);
		retryTimer.current = setTimeout(() => bannerRef.current?.load(), 30000);
	};

	useForeground(() => {
		// 날짜가 바뀌었으면 상한이 풀린다
		refreshCap();
		if (Platform.OS === 'ios') {
			bannerRef.current?.load();
		}
	});

	// 배너 onAdOpened 는 사용자가 배너를 눌러 광고 랜딩이 열릴 때 온다 → 클릭으로 센다
	const handleAdOpened = async () => {
		// 광고 랜딩에서 돌아올 때 앱 열기 광고가 바로 붙지 않게
		skipAppOpenOnNextResume();
		void recordAdClick().then(refreshCap);
		try {
			const instanceId = await analytics().getAppInstanceId();
			await analytics().logEvent('ad_banner_opened', {
				ad_platform: 'admob',
				ad_format: 'banner',
				ad_unit_id: AD_UNIT_ID,
				app_name: DeviceInfo.getApplicationName(),
				app_version: DeviceInfo.getVersion(),
				build_number: DeviceInfo.getBuildNumber(),
				device_platform: Platform.OS,
				device_model: DeviceInfo.getModel(),
				device_brand: DeviceInfo.getBrand(),
				system_version: DeviceInfo.getSystemVersion(),
				app_instance_id: instanceId,
				timestamp: DateUtils.toISOString(),
			});
		} catch (error) {
			console.error('🔥 Failed to log ad click:', error);
		}
	};

	if (capped !== false) return null;

	return (
		<View
			style={[
				styles.container,
				{
					marginTop: paramMarginTop,
					marginBottom: paramMarginBottom,
					opacity: visible ? 1 : 0, // 렌더링 유지 + 가시성만 제어
					height: visible ? undefined : 0,
				},
			]}>
			<BannerAd
				ref={bannerRef}
				unitId={AD_UNIT_ID}
				size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
				// 첫 배너가 그려진 뒤에 스플래시를 걷는다 (빈 자리가 보였다가 광고가 툭 들어오지 않게)
				onAdLoaded={markBannerSettled}
				onAdOpened={handleAdOpened}
				onAdFailedToLoad={handleAdFailed}
			/>
		</View>
	);
};

const styles = themed(() => StyleSheet.create({
	// 너비는 화면 전체 — ANCHORED_ADAPTIVE_BANNER 가 이 폭에 맞춰 높이를 계산한다
	container: {
		width: '100%',
		alignItems: 'center',
		backgroundColor: 'transparent',
			},
}));

export default React.memo(AdmobBannerAd);
