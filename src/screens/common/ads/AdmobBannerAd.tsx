import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { GOOGLE_ADMOV_ANDROID_BANNER, GOOGLE_ADMOV_IOS_BANNER } from '@env';
import { logAdEvent } from '@/src/services/ads/AdAnalytics';
import AdGuardService, { useAdGuardBlocked } from '@/src/services/ads/AdGuardService';
import { scaleHeight } from '@/src/utils';

type AdUnitIdType = string;

/**
 * ⚠️ 지금은 배너를 항상 "테스트 광고"로만 띄운다 (운영 배포본 포함).
 * 검수 중 배너 노출을 확인하는 동안 운영 유닛으로 요청이 나가면 무효 트래픽이 되므로 막아 둔다.
 * 운영 광고를 다시 켤 때는 아래 상수를 원래 조건으로 되돌린다 —
 *   const FORCE_TEST_ADS = __DEV__ || REACT_NATIVE_APP_MODE !== 'prd';
 * (환경 변수가 비어 있어도 테스트 광고로 떨어뜨려 잘못된 단위로 요청하지 않게 한다)
 */
const FORCE_TEST_ADS = true;

const AD_UNIT_ID: AdUnitIdType = FORCE_TEST_ADS
	? TestIds.BANNER
	: Platform.select({ ios: GOOGLE_ADMOV_IOS_BANNER, android: GOOGLE_ADMOV_ANDROID_BANNER }) || TestIds.BANNER;

/**
 * 로드 전에도 자리를 잡아 두려고 예약하는 높이.
 * ANCHORED_ADAPTIVE_BANNER 는 기기 너비에 맞춰 높이를 스스로 고른다(보통 50~90dp).
 * 실제 높이를 미리 알 수는 없으므로 앵커 배너의 최소 높이(50dp)만 잡아 둔다 —
 * 더 크게 잡으면 광고 아래에 빈 띠가 남고, 아예 안 잡으면 로드 순간 화면이 밀린다.
 */
const RESERVED_HEIGHT = 50;

/**
 * 배너는 props 를 받지 않는다.
 * 여백·표시 여부를 밖에서 조절할 수 있게 열어 두면 그 값이 바뀔 때마다 배너가 다시 그려지고,
 * 높이를 0으로 접는 순간 AdMob 이 새 광고를 받아 온다. 항상 같은 모양으로만 둔다.
 *
 * 로드 실패해도 자리를 접지 않는다. 접었다 펴는 것 자체가 재요청을 부르고,
 * 예전처럼 실패 상태를 붙들고 있으면 앱을 다시 켜기 전까지 배너가 영영 비어 있게 된다.
 */
const AdmobBannerAd: React.FC = () => {
	// 클릭 어뷰징 차단 여부 — 배너 클릭 하루 5회 이상 시 24시간 숨김 (배너 전용 카운터)
	const adBlocked = useAdGuardBlocked('banner');

	// useForeground(→ banner.load()) 는 앱이 다시 앞으로 올 때마다 광고를 강제로 다시 불러온다.
	// 갱신은 AdMob 콘솔의 자동 새로고침 설정에만 맡긴다.

	const handleAdOpened = () => {
		// 클릭 집계 — 배너 전용 카운터, 하루 5회 이상이면 24시간 배너만 숨김
		AdGuardService.registerClick('banner');
		logAdEvent('ad_banner_opened', 'banner', AD_UNIT_ID);
	};

	// 클릭 어뷰징 차단 중에는 요청 자체를 하지 않음 (렌더 제거 → 노출/요청 0)
	if (adBlocked) return null;

	return (
		<View style={styles.container}>
			<BannerAd
				unitId={AD_UNIT_ID}
				size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
				onAdOpened={handleAdOpened}
				onAdLoaded={() => { if (__DEV__) console.log('✅ 배너 광고 로드 완료'); }}
				onAdFailedToLoad={(e: unknown) => { if (__DEV__) console.warn('❌ 배너 광고 로드 실패:', e); }}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		// 앵커 배너는 화면 너비를 가득 쓰는 것을 전제로 높이를 고른다 — 폭을 좁히면 광고가 잘린다
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		// 로드 전에도 자리를 잡아 레이아웃이 튀지 않게 예약해 둔다
		minHeight: scaleHeight(RESERVED_HEIGHT),
		backgroundColor: 'transparent',
	},
});

export default React.memo(AdmobBannerAd);
