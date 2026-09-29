/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Stack, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/src/const/ConstColors';
import { SpacingV } from '@/src/const/ConstDesign';

import AdmobBannerAd from '@/src/screens/common/ads/AdmobBannerAd';
import useAdsRemoved from '@/src/hooks/useAdsRemoved';
import { useTopBarColor } from '@/src/utils/TopBarColor';
import { contentWidth, isTablet } from '@/src/utils/DementionUtils';
import { themed } from '@/src/utils/ThemedStyles';

/**
 * 광고를 노출할 경로 (pathname 접두사 기준)
 * - expo-router에서 (tabs) 그룹은 pathname에 나타나지 않으므로 '/home' 형태로 지정
 */
// 배너를 노출하지 '않을' 경로 — 그 외 모든 화면에 상단 배너를 노출한다.
// (허용 목록으로 관리하니 새 화면이 추가될 때마다 광고가 조용히 빠져 있었다)
// 광고는 전부 이 레이아웃에서만 통제한다 — 개별 화면에 배너를 직접 넣지 않는다.
const AD_BLOCKED_ROUTES = [
	'/special/shorts',
	'/learn/study',
	'/special/ranking',
	'/special/exam',
	'/special/weak-focus',
	'/special/level-test',
	'/special/type-test',
];
// 전체화면 경로 — 상단 인셋을 화면이 직접 처리한다(레이아웃은 인셋을 주지 않음)
const FULLSCREEN_ROUTES = ['/special/shorts'];
// 상단 인셋은 이 레이아웃이 전부 책임진다.
// 각 화면은 SafeAreaView edges 에 'top' 을 넣지 않는다(넣으면 여백이 두 번 들어감).
// 예외: /special/shorts 는 전체화면이라 화면이 직접 insets.top 을 쓴다(FULLSCREEN_ROUTES).

/**
 * 경로별 배너 뒤 배경색 (각 화면 배경과 맞춰 자연스럽게 보이도록)
 * - 값이 없으면 기본 배경색(Colors.background) 사용
 */
const ROUTE_BG: Record<string, string> = themed(() => ({
	'/home': Colors.background,
	'/challenge': Colors.background,
	'/stats': Colors.background,
	'/my': Colors.background,
	'/search': Colors.surface,
	'/special/shorts': Colors.night,
	// 타워 챌린지 — 늘 어두운 패널 (그라디언트 윗색)
	'/quiz/tower': Colors.inkSoft,
	'/quiz/tower-quiz': Colors.inkSoft,
	'/special/story-feed': Colors.background,
	'/special/ranking': Colors.background,
	// CommonHeader(surface)를 쓰는 화면 — 광고 뒤 배경을 헤더와 같은 색으로 잇는다
	'/library': Colors.surface,
	'/learn/bundle': Colors.surface,
	'/quiz/bookmark': Colors.surface,
	'/quiz/bundle': Colors.surface,
	'/quiz/match-game': Colors.surface,
	'/quiz/sub-quiz': Colors.surface,
	'/quiz/wrong-review': Colors.surface,
	'/special/league': Colors.surface,
	'/special/exam': Colors.surface,
	'/special/level-test': Colors.surface,
	'/special/type-test': Colors.surface,
	'/special/weak-focus': Colors.surface,
}));

/** 경로 → 배경색. 정확히 일치하는 값이 없으면 상위 경로(접두사)로 찾는다 */
const routeBgOf = (pathname: string): string =>
	ROUTE_BG[pathname] ?? Object.entries(ROUTE_BG).find(([p]) => pathname.startsWith(`${p}/`))?.[1] ?? Colors.background;

/**
 * 앱 공통 레이아웃 (상단 고정 배너 + 네비게이터)
 * - 배너는 개발/운영 모두 노출됩니다(개발에서는 AdMob 테스트 유닛 ID 사용).
 * - 배너를 루트에서 "한 번만" 마운트하고 visible로만 토글 → 페이지 이동 시 재로딩되지 않습니다.
 * - AD_BLOCKED_ROUTES 에 든 경로에서만 배너를 숨깁니다(height 0).
 * - 배너가 보이는 화면은 상태바를 가리지 않도록 상단 안전영역(top 인셋)을 항상 적용합니다.
 */
const AppLayout = () => {
	const pathname = usePathname();

	// 상단 안전영역 인셋 대상 경로 (탭 화면은 자체 SafeAreaView가 없어 여기서 top 인셋을 받음)
	// ⚠️ 광고 노출(__DEV__)과 분리한다: 릴리즈(__DEV__=false)에서도 top 인셋은 반드시 적용되어야 함
	const isAdRoute = useMemo(
		() => !AD_BLOCKED_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`)),
		[pathname],
	);
	// 광고 제거 구매자만 미노출
	const adsRemoved = useAdsRemoved();
	const showAd = isAdRoute && !adsRemoved;
	// 배너 실제 높이(측정값)까지 펴고 0 으로 접는다
	const [bannerH, setBannerH] = useState(0);
	const bannerClipH = useSharedValue(0);
	useEffect(() => {
		bannerClipH.value = withTiming(showAd ? bannerH : 0, { duration: 200 });
	}, [showAd, bannerH, bannerClipH]);
	const bannerClipStyle = useAnimatedStyle(() => ({ height: bannerClipH.value }));
	// 전체화면(숏폼)만 제외하고 항상 top 인셋을 준다.
	// 광고 제거 구매 여부와 무관해야 한다 — showAd 에 묶으면 구매자 화면이 상태바에 붙는다.
	const needsTopInset = useMemo(
		() => !FULLSCREEN_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`)),
		[pathname],
	);

	// 화면이 직접 올린 색이 최우선 (헤더 색이 상태에 따라 달라지는 화면용)
	const override = useTopBarColor();
	// 광고 뒤(= 상태바) 배경색 — 각 화면 상단과 맞춤
	const routeBg = routeBgOf(pathname);
	// 광고 영역·상태바 배경은 항상 그 화면 헤더 색을 따라간다 (화면이 올린 accent 우선)
	const bg = override ?? routeBg;

	return (
		<SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={needsTopInset ? ['top'] : []}>
			{/* 배너: 루트에서 한 번만 마운트하고 높이로만 토글 → 페이지 이동 시 재로딩 방지.
			    높이를 애니메이션으로 접고 펴서 차단 경로 진입·이탈 때 본문이 툭 튀지 않게 한다 */}
			<Animated.View style={[styles.bannerClip, { backgroundColor: bg }, bannerClipStyle]}>
				<View style={styles.bannerWrap} onLayout={(e) => setBannerH(e.nativeEvent.layout.height)}>
					<AdmobBannerAd paramMarginTop={Platform.OS === 'android' ? 4 : 2} paramMarginBottom={8} />
				</View>
			</Animated.View>

			{/* 태블릿: 본문을 최대 폭으로 묶어 가운데 정렬 — 카드·문장이 화면 끝까지 늘어나지 않게 한다.
			    전체화면 경로(숏폼)는 화면 전체를 써야 하므로 제외. 폰은 isTablet=false 라 기존과 동일.
			    바깥 View 가 좌우 여백까지 화면 배경색을 깔아 준다(상단바 색이 옆으로 새지 않게). */}
			<View style={styles.body}>
				<View style={[styles.stack, isTablet && needsTopInset && styles.stackTablet]}>
					<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background }, animation: 'slide_from_right' }}>
						{/* 탭 그룹: 홈 · 챌린지 · 통계 · MY */}
						<Stack.Screen name="index" />
						<Stack.Screen name="(tabs)" />
						{/* 플로우 그룹: 세부 옵션은 각 그룹의 _layout.tsx 에서 관리 */}
						<Stack.Screen name="learn" />
						<Stack.Screen name="quiz" />
						<Stack.Screen name="special" />
						{/* 단독 화면 */}
						<Stack.Screen name="library" options={{ gestureEnabled: true }} />
						<Stack.Screen name="opensource" options={{ gestureEnabled: true }} />
					</Stack>
				</View>
			</View>
		</SafeAreaView>
	);
};

export default AppLayout;

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1 },
	// 광고 위아래 간격 + 하단 구분선
	bannerClip: { overflow: 'hidden' },
	bannerWrap: { paddingTop: SpacingV.sm, paddingBottom: 0 },
	// 좌우 여백까지 화면 배경색으로 덮는다 — 태블릿에서 상단바 색이 양옆으로 새지 않게
	body: { flex: 1, backgroundColor: Colors.background },
	stack: { flex: 1 },
	// 태블릿 본문 최대 폭 + 가운데 정렬
	stackTablet: { width: '100%', maxWidth: contentWidth, alignSelf: 'center' },
}));
