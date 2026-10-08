import { scaledSize, scaleHeight, scaleWidth, scaleArt } from '@/src/utils';
import { Spacing, SpacingV, Typography, Radius } from '@/src/const/ConstDesign';
import { GOOGLE_ADMOV_ANDROID_FRONT, GOOGLE_ADMOV_IOS_FRONT } from '@env';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InterstitialAd, TestIds, AdEventType } from 'react-native-google-mobile-ads';
import analytics from '@react-native-firebase/analytics'; // Firebase Analytics
import DeviceInfo from 'react-native-device-info';
import DateUtils from '@/src/utils/DateUtils';
import Colors from '@/src/const/ConstColors';
import { resolveAdUnitId } from './adUnitId';
import { themed } from '@/src/utils/ThemedStyles';

const AD_UNIT_ID = resolveAdUnitId(
	Platform.select({ ios: GOOGLE_ADMOV_IOS_FRONT, android: GOOGLE_ADMOV_ANDROID_FRONT }),
	TestIds.INTERSTITIAL,
	'front',
);

/**
 * 일반 전면 광고 (보상 없음)
 */
const AdmobFrontAd: React.FC<{ onAdClosed?: () => void }> = ({ onAdClosed }) => {
	const { t } = useTranslation();
	const [, setLoaded] = useState(false);
	const adRef = useRef<InterstitialAd | null>(null);

	useEffect(() => {
		const ad = InterstitialAd.createForAdRequest(AD_UNIT_ID);
		adRef.current = ad;

		const logEvent = async (name: string, additionalParams = {}) => {
			const instanceId = await analytics().getAppInstanceId();
			try {
				await analytics().logEvent(name, {
					ad_platform: 'admob', // 📌 광고 플랫폼 이름 (예: admob, facebook 등)
					ad_format: 'interstitial', // 📌 광고 형식 (전면광고, 배너, 리워드 등)
					ad_unit_id: AD_UNIT_ID, // 📌 실제 사용 중인 광고 유닛 ID (식별/필터링용)
					app_name: DeviceInfo.getApplicationName(), // 📱 앱 이름 (예: "MyApp")
					app_version: DeviceInfo.getVersion(), // 🏷️ 앱 버전 (예: "1.0.3")
					build_number: DeviceInfo.getBuildNumber(), // 🏗️ 빌드 번호 (예: "100")
					device_platform: Platform.OS, // 💻 디바이스 플랫폼 ('ios' 또는 'android')
					device_model: DeviceInfo.getModel(), // 📱 기기 모델명 (예: "iPhone 15 Pro")
					device_brand: DeviceInfo.getBrand(), // 🏷️ 제조사 (예: "Apple", "Samsung")
					system_version: DeviceInfo.getSystemVersion(), // 🧪 OS 버전 (예: "17.5")
					app_instance_id: instanceId, // 🆔 Firebase 고유 사용자 식별자 (익명 추적 ID)
					timestamp: DateUtils.toISOString(),
					...additionalParams, // 🧩 기타 추가 파라미터 (사용자 정의 값)
				});
			} catch (error) {
				console.error(`❌ Failed to log ${name}:`, error);
			}
		};

		const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
			logEvent('ad_interstitial_loaded');
			setLoaded(true);
			ad.show();
		});

		const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
			logEvent('ad_interstitial_closed');
			setLoaded(false);
			onAdClosed?.();
		});

		const unsubscribeFailed = ad.addAdEventListener(AdEventType.ERROR, (error) => {
			console.warn('❌ 광고 로딩 실패:', error?.message ?? error);
			logEvent('ad_interstitial_failed', { error_message: error?.message ?? String(error) });
			setLoaded(false);
			onAdClosed?.();
		});

		logEvent('ad_interstitial_request');
		ad.load();

		return () => {
			unsubscribeLoaded();
			unsubscribeClosed();
			unsubscribeFailed();
		};
	}, []);

	return (
		<View style={styles.adOverlay}>
			<View style={styles.container}>
				<ActivityIndicator size="large" color={Colors.success} />
				<Text style={styles.loadingTxt}>{t('ads.preparing')}</Text>
			</View>
		</View>
	);
};

const styles = themed(() => StyleSheet.create({
	// styles 변경 부분

	container: {
		paddingVertical: SpacingV.xxxl,
		paddingHorizontal: Spacing.xxl,
		backgroundColor: Colors.surface,
		borderRadius: Radius.xxl,
		borderWidth: 1,
		borderColor: Colors.border,
		alignItems: 'center',
		justifyContent: 'center',
		width: scaleWidth(260),
	},

	adOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: Colors.backdrop,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 999,
	},

	loadingTxt: {
		marginTop: SpacingV.lg,
		fontSize: Typography.callout,
		color: Colors.textStrong,
		fontWeight: '600',
		textAlign: 'center',
	},

	subTxt: {
		marginTop: SpacingV.sm,
		fontSize: Typography.body,
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: scaledSize(20),
	},

	progressBar: {
		marginTop: SpacingV.xl,
		width: '100%',
		height: scaleHeight(4),
		backgroundColor: Colors.surfaceAlt,
		borderRadius: 99,
		overflow: 'hidden',
	},

	mascotImage: {
		width: scaleArt(80),
		height: scaleArt(80),
		marginBottom: SpacingV.lg,
		opacity: 0.9,
	},
}));

export default AdmobFrontAd;
