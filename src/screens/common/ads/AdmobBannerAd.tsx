import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds, useForeground } from 'react-native-google-mobile-ads';
import analytics from '@react-native-firebase/analytics';
import DeviceInfo from 'react-native-device-info';
import { scaleHeight } from '@/src/utils';
import { themed } from '@/src/utils/ThemedStyles';

type AdUnitIdType = string;

// 배너는 운영 빌드에서도 테스트(DEV) 유닛으로 고정한다.
// 운영 광고로 되돌리려면: resolveAdUnitId(Platform.select({ ios: GOOGLE_ADMOV_IOS_BANNER, android: GOOGLE_ADMOV_ANDROID_BANNER }), TestIds.BANNER, 'banner')
const AD_UNIT_ID: AdUnitIdType = TestIds.BANNER;

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

	useEffect(() => () => clearTimeout(retryTimer.current), []);

	// 로드 실패(오프라인 시작 등) 시 30초 뒤 재요청 — 빈 배너로 남지 않게
	const handleAdFailed = (e: Error) => {
		console.warn('❌ [AdMob] 배너 로드 실패:', AD_UNIT_ID, e);
		clearTimeout(retryTimer.current);
		retryTimer.current = setTimeout(() => bannerRef.current?.load(), 30000);
	};

	useForeground(() => {
		if (Platform.OS === 'ios') {
			bannerRef.current?.load();
		}
	});

	const handleAdOpened = async () => {
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
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			console.error('🔥 Failed to log ad click:', error);
		}
	};

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
				onAdOpened={handleAdOpened}
				onAdFailedToLoad={handleAdFailed}
			/>
		</View>
	);
};

const styles = themed(() => StyleSheet.create({
	container: {
		alignItems: 'center',
		backgroundColor: 'transparent',
		marginBottom: scaleHeight(3),
	},
}));

export default React.memo(AdmobBannerAd);
