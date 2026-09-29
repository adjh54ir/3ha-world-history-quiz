
import { SpacingV, Radius, Typography, Shadow } from '@/src/const/ConstDesign';
import { GOOGLE_ADMOV_ANDROID_REWARD, GOOGLE_ADMOV_IOS_REWARD } from '@env';
import React, { useEffect, useRef } from 'react';
import { Platform, View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { RewardedAd, TestIds, RewardedAdEventType, AdEventType } from 'react-native-google-mobile-ads';
import { isAdsRemoved } from '@/src/services/PurchaseService';
import Colors from '@/src/const/ConstColors';
import { resolveAdUnitId } from './adUnitId';
import { themed } from '@/src/utils/ThemedStyles';

const AD_UNIT_ID = resolveAdUnitId(
	Platform.select({ ios: GOOGLE_ADMOV_IOS_REWARD, android: GOOGLE_ADMOV_ANDROID_REWARD }),
	TestIds.REWARDED,
	'reward',
);

const AdmobRewardAd: React.FC<{
	onRewarded: () => void; // 광고 완주 → 보상 지급
	onFailed: () => void; // 로드 실패
	onClosed: () => void; // 광고 닫힘 (보상 없이 닫은 경우 포함)
}> = ({ onRewarded, onFailed, onClosed }) => {
	const adRef = useRef<RewardedAd | null>(null);
	const rewardedRef = useRef(false); // 보상 중복 방지

	useEffect(() => {
		// ✅ 광고 제거 구매자는 광고 시청 없이 즉시 보상 지급
		if (isAdsRemoved()) {
			rewardedRef.current = true;
			onRewarded();
			return;
		}
		const ad = RewardedAd.createForAdRequest(AD_UNIT_ID, {
			requestNonPersonalizedAdsOnly: true,
		});
		adRef.current = ad;
		rewardedRef.current = false;

		const unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
			ad.show();
		});

		const unsubscribeEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
			rewardedRef.current = true;
			onRewarded();
		});

		const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
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

	// ✅ 광고 제거 구매자는 로딩 오버레이도 표시하지 않음
	if (isAdsRemoved()) return null;

	return (
		<View style={styles.adOverlay}>
			<View style={styles.container}>
				<ActivityIndicator size="large" color={Colors.success} />
				<Text style={styles.loadingTxt}>광고를 준비 중이에요…</Text>
				<Text style={styles.subTxt}>시청 완료 시 도전 기회 +1회</Text>
			</View>
		</View>
	);
};

const styles = themed(() => StyleSheet.create({
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
	container: {
		padding: SpacingV.xxl,
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: Colors.border,
		...Shadow.floating,
	},
	loadingTxt: {
		marginTop: SpacingV.md,
		fontSize: Typography.callout,
		color: Colors.textStrong,
		fontWeight: '600',
	},
	subTxt: {
		marginTop: SpacingV.xs,
		fontSize: Typography.body,
		color: Colors.textSecondary,
	},
}));

export default AdmobRewardAd;
