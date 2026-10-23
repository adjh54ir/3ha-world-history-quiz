import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { GOOGLE_ADMOV_ANDROID_BANNER, GOOGLE_ADMOV_IOS_BANNER } from '@env';
import { themed } from '@/src/utils/ThemedStyles';
import AdGuardService, { useAdGuardBlocked } from '@/src/services/ads/AdGuardService';
import { USE_TEST_ADS, resolveAdUnitId } from './adUnitId';
import { logAdClick } from './adLogEvent';

// 앵커드 어댑티브 배너 전용 테스트 유닛 — 고정 배너 유닛(BANNER)은 어댑티브 크기로 부르면 채워지지 않을 때가 있다
const AD_UNIT_ID = resolveAdUnitId(Platform.select({ ios: GOOGLE_ADMOV_IOS_BANNER, android: GOOGLE_ADMOV_ANDROID_BANNER }), TestIds.ADAPTIVE_BANNER);

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
	// 클릭 어뷰징 차단 여부 — 배너 클릭 하루 5회(또는 광고 통합 5회) 이상이면 24시간 숨김
	const adBlocked = useAdGuardBlocked('banner');

	// useForeground(→ banner.load()) 는 앱이 앞으로 올 때마다 광고를 강제로 다시 불러온다(노출 없는 요청이 쌓인다).
	// 로드 실패 뒤 수동 재요청도 하지 않는다 — 갱신은 AdMob 콘솔의 자동 새로고침 설정에만 맡긴다.

	// 배너 onAdOpened 는 사용자가 배너를 눌러 광고 랜딩이 열릴 때 온다 → 클릭으로 센다
	const handleAdOpened = () => {
		AdGuardService.registerClick('banner');
	};

	// 클릭 어뷰징 차단 중에는 요청 자체를 하지 않는다 (렌더 제거 → 노출/요청 0)
	if (adBlocked) return null;

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
				unitId={AD_UNIT_ID}
				size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
				onAdOpened={handleAdOpened}
				onAdClicked={() => void logAdClick('banner', AD_UNIT_ID)}
				onAdFailedToLoad={(e: unknown) => { if (__DEV__) console.warn('❌ [AdMob] 배너 로드 실패:', AD_UNIT_ID, e); }}
			/>
			{/* 테스트 유닛 표시 — 운영(스토어) 설치에서는 USE_TEST_ADS 가 false 라 그려지지 않는다 */}
			{USE_TEST_ADS && (
				<View style={styles.badge} pointerEvents="none">
					<Text style={styles.badgeText}>TEST AD</Text>
				</View>
			)}
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
	// 개발용 표시라 테마를 따르지 않는다 — 어느 배경 위에서도 읽히는 고정 대비
	badge: { position: 'absolute', top: 0, left: 0, paddingHorizontal: 4, paddingVertical: 1, backgroundColor: '#D32F2F', borderBottomRightRadius: 4 },
	badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
}));

export default React.memo(AdmobBannerAd);
