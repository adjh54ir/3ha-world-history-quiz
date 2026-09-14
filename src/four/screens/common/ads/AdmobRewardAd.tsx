import { GOOGLE_ADMOV_ANDROID_REWARD, GOOGLE_ADMOV_IOS_REWARD, REACT_NATIVE_APP_MODE } from '@env';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { RewardedAd, TestIds, RewardedAdEventType, AdEventType } from 'react-native-google-mobile-ads';
import { Colors } from '@/src/four/const/ConstColors';
import { Typography, FontWeight, SpacingV, Radius } from '@/src/four/const/ConstDesign';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';

/**
 * 테스트 광고 조건 — 앱 공통 AdmobFrontAd 와 같은 게이트를 쓴다.
 * 로컬 릴리스 빌드(__DEV__=false, APP_MODE=local)에서 운영 광고가 나가면 무효 트래픽이 된다.
 */
const USE_TEST_ADS = __DEV__ || REACT_NATIVE_APP_MODE !== 'prd';

const AD_UNIT_ID = USE_TEST_ADS
	? TestIds.REWARDED
	: Platform.select({ ios: GOOGLE_ADMOV_IOS_REWARD, android: GOOGLE_ADMOV_ANDROID_REWARD }) || TestIds.REWARDED;

const AdmobRewardAd: React.FC<{
	onRewarded: () => void; // 광고 완주 → 보상 지급
	onFailed: () => void; // 로드 실패
	onClosed: () => void; // 광고 닫힘 (보상 없이 닫은 경우 포함)
}> = ({ onRewarded, onFailed, onClosed }) => {
	const adRef = useRef<RewardedAd | null>(null);
	const rewardedRef = useRef(false); // 보상 중복 방지

	useEffect(() => {
		const ad = RewardedAd.createForAdRequest(AD_UNIT_ID, {
			requestNonPersonalizedAdsOnly: true,
		});
		adRef.current = ad;
		rewardedRef.current = false;

		const unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
			console.log('✅ 리워드 광고 로딩 완료');
			ad.show();
		});

		// 광고 끝까지 시청 완료 → 보상 지급
		const unsubscribeEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
			console.log('🎁 리워드 획득');
			rewardedRef.current = true;
			onRewarded();
		});

		// 광고 닫힘 (시청 완료 or 중간에 닫음)
		const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
			console.log('✅ 리워드 광고 닫힘');
			if (!rewardedRef.current) {
				// 보상 없이 닫은 경우
				onClosed();
			}
		});

		const unsubscribeFailed = ad.addAdEventListener(AdEventType.ERROR, (error) => {
			console.warn('❌ 리워드 광고 실패:', error?.message ?? error);
			onFailed();
		});

		ad.load();

		return () => {
			unsubscribeLoaded();
			unsubscribeEarned();
			unsubscribeClosed();
			unsubscribeFailed();
		};
	}, []);

	return (
		<View style={styles.adOverlay}>
			<View style={styles.container}>
				<ActivityIndicator size="large" color={Colors.primary} />
				<Text style={styles.loadingTxt}>광고를 준비 중이에요…</Text>
				<Text style={styles.subTxt}>시청 완료 시 도전 기회 +1회</Text>
			</View>
		</View>
	);
};

const makeStyles = () => StyleSheet.create({
	adOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: Colors.scrim,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 999,
	},
	container: {
		padding: SpacingV.xxl,
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		alignItems: 'center',
		justifyContent: 'center',
	},
	loadingTxt: {
		marginTop: SpacingV.md,
		fontSize: Typography.subtitle,
		color: Colors.text,
		fontWeight: FontWeight.semibold,
	},
	subTxt: {
		marginTop: SpacingV.xs,
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
	},
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});

export default AdmobRewardAd;
