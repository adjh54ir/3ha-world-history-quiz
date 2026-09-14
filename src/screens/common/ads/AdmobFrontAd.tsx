import { scaleHeight, scaleWidth } from '@/src/utils';
import { GOOGLE_ADMOV_ANDROID_FRONT, GOOGLE_ADMOV_IOS_FRONT, REACT_NATIVE_APP_MODE } from '@env';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { InterstitialAd, TestIds, AdEventType } from 'react-native-google-mobile-ads';
import { logAdEvent } from '@/src/services/ads/AdAnalytics';
import AdGuardService from '@/src/services/ads/AdGuardService';
import { Palette } from '@/src/const/ConstColors';
import { Radius, Typography } from '@/src/const/ConstDesign';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';

/**
 * 테스트 광고 조건: 디버그 빌드이거나, 번들된 env 가 운영(prd)이 아닐 때.
 * Xcode/gradle 로컬 릴리스 빌드는 __DEV__=false 지만 .env(APP_MODE=local)로 빌드되므로
 * 이 게이트가 없으면 로컬 릴리스 테스트에서 운영 광고가 나간다 (무효 트래픽 위험).
 * 운영 광고는 .env.production(APP_MODE=prd)으로 빌드된 배포본에서만.
 * (환경 변수가 비어 있어도 테스트 광고로 떨어뜨려 잘못된 단위로 요청하지 않게 한다)
 */
const USE_TEST_ADS = __DEV__ || REACT_NATIVE_APP_MODE !== 'prd';

const AD_UNIT_ID = USE_TEST_ADS
	? TestIds.INTERSTITIAL
	: Platform.select({ ios: GOOGLE_ADMOV_IOS_FRONT, android: GOOGLE_ADMOV_ANDROID_FRONT }) || TestIds.INTERSTITIAL;

/** 이 시간(ms) 안에 광고가 뜨지도, 실패를 알려 주지도 않으면 광고를 건너뛰고 원래 흐름으로 돌려보낸다 */
const LOAD_TIMEOUT_MS = 6000;

/**
 * 일반 전면 광고 (보상 없음)
 *
 *
 *
	const shouldShowAd = Math.random() < 0.2; // 20% 확률
	const [showAd, setShowAd] = useState(false);
  const [nextContinent, setNextContinent] = useState<ContinentType | null>(null);

  onPress={() => {
  if (item.key === 'all') {
	if (shouldShowAd) {
	  setShowAd(true);
	} else {
	  moveToHandler.quizMain(); // 바로 퀴즈로 이동
	}
  }
  if (item.key === 'region') moveToHandler.quizRegin();

  {showAd && (
	<AdmobFrontAd
	  onAdClosed={() => {
		setShowAd(false);
		const allCountries = CountryServices.selectCountryRandomList();
		router.push(toHref(Paths.QUIZ_MAIN, {
		  questionPool: allCountries,
		  title: '전체 퀴즈',
		}) as never);
	  }}
	/>
  )}

}}>
 *
 *
 */
const AdmobFrontAd: React.FC<{ onAdClosed?: () => void }> = ({ onAdClosed }) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const [loaded, setLoaded] = useState(false);
	// 클릭 어뷰징 차단 중 — 광고를 건너뛰고 즉시 닫힘 처리했는지 여부
	const [skipped, setSkipped] = useState(false);
	const adRef = useRef<InterstitialAd | null>(null);
	// 매번 새로 생기는 인라인 콜백이어도 effect 를 다시 돌리지 않게 ref 로 최신 값만 따로 들고 있는다
	const onAdClosedRef = useRef(onAdClosed);
	onAdClosedRef.current = onAdClosed;

	useEffect(() => {
		// ✅ 개발 모드(__DEV__)에서는 테스트 광고조차 노출하지 않고 즉시 닫힘 처리
		if (__DEV__) {
			onAdClosedRef.current?.();
			return;
		}

		// 🛡️ 차단 중이거나 오늘 노출 상한을 채웠으면 로드/노출 없이 즉시 통과
		if (AdGuardService.isBlocked('interstitial')) {
			setSkipped(true);
			onAdClosedRef.current?.();
			return;
		}

		const ad = InterstitialAd.createForAdRequest(AD_UNIT_ID);
		adRef.current = ad;

		/**
		 * 안전장치 — 로드도 실패도 알려 주지 않는 경우(네트워크가 아주 느리거나 SDK 가 응답을 안 줄 때)
		 * "광고를 준비 중" 화면에 갇혀 퀴즈 결과를 못 보게 된다. 일정 시간이 지나면 광고를 건너뛴다.
		 * 광고가 뜨기 시작하면(LOADED) 이 타이머는 끊는다 — 보는 도중에 뒤에서 결과가 열리면 안 된다.
		 */
		let waitTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
			waitTimer = null;
			setSkipped(true);
			onAdClosedRef.current?.();
		}, LOAD_TIMEOUT_MS);
		const clearWait = () => {
			if (waitTimer) {
				clearTimeout(waitTimer);
				waitTimer = null;
			}
		};

		const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
			clearWait();
			logAdEvent('ad_interstitial_loaded', 'interstitial', AD_UNIT_ID);
			setLoaded(true);
			// 하루 노출 상한 집계 — 상한을 넘기면 다음부터 로드 자체를 건너뛴다
			AdGuardService.registerShow('interstitial');
			ad.show();
		});

		const unsubscribeClicked = ad.addAdEventListener(AdEventType.CLICKED, () => {
			// 🛡️ 전면 전용 카운터로 집계 (하루 5회 → 24시간 전면 광고만 숨김)
			AdGuardService.registerClick('interstitial');
			logAdEvent('ad_interstitial_clicked', 'interstitial', AD_UNIT_ID);
		});

		const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
			clearWait();
			logAdEvent('ad_interstitial_closed', 'interstitial', AD_UNIT_ID);
			setLoaded(false);
			onAdClosedRef.current?.();
		});

		const unsubscribeFailed = ad.addAdEventListener(AdEventType.ERROR, (error) => {
			clearWait();
			console.warn('❌ 광고 로딩 실패:', error?.message ?? error);
			logAdEvent('ad_interstitial_failed', 'interstitial', AD_UNIT_ID, { error_message: error?.message ?? String(error) });
			setLoaded(false);
			onAdClosedRef.current?.();
		});

		logAdEvent('ad_interstitial_request', 'interstitial', AD_UNIT_ID);
		ad.load();

		return () => {
			clearWait();
			unsubscribeLoaded();
			unsubscribeClicked();
			unsubscribeClosed();
			unsubscribeFailed();
		};
	}, []);

	// ✅ 개발 모드/차단 중에는 광고 UI 자체를 렌더링하지 않음
	if (__DEV__ || skipped) {
		return null;
	}

	return (
		<View style={styles.adOverlay}>
			<View style={styles.container}>
				<ActivityIndicator size="large" color={Colors.primary} />
				<Text style={styles.loadingTxt}>광고를 준비 중이에요…</Text>
			</View>
		</View>
	);
};

const createStyles = (Colors: Palette) => StyleSheet.create({
	// styles 변경 부분

	container: {
		padding: scaleHeight(32),
		paddingHorizontal: scaleWidth(28),
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
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
		backgroundColor: 'rgba(10,10,16,0.65)',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 999,
	},

	loadingTxt: {
		marginTop: scaleHeight(16),
		fontSize: Typography.callout,
		color: Colors.textStrong,
		fontWeight: '600',
		textAlign: 'center',
	},

});

export default AdmobFrontAd;
