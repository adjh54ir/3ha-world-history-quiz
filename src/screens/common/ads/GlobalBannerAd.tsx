import React from 'react';
import { StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdmobBannerAd from './AdmobBannerAd';
import { Palette } from '@/src/const/ConstColors';
import { useThemedStyles } from '@/src/hooks/useTheme';
import { Paths } from '@/src/navigation/conf/Paths';
import { SpacingV } from '@/src/const/ConstDesign';

/**
 * 배너를 걷어내는 화면 — 문제를 푸는 동안에는 위쪽에 아무것도 두지 않는다.
 * 타임·타워 챌린지는 제한 시간과 목숨이 걸린 판이라 시작 화면까지 통째로 뺀다 —
 * 남은 시간을 보는 눈 바로 위에서 배너가 갈아 끼워지면 그것만으로 판이 망가진다.
 */
const AD_FREE_PATHS: string[] = [
	`/${Paths.QUIZ}`,
	`/${Paths.TIME_CHALLENGE}`,
	`/${Paths.TIME_CHALLENGE_INIT}`,
	`/${Paths.TOWER}`,
	`/${Paths.TOWER_QUIZ}`,
];

/**
 * 전역 상단 배너
 * - 루트 레이아웃에 한 번만 붙어 화면 전환과 무관하게 계속 마운트 상태를 유지한다.
 *   → 화면마다 배너를 두던 때와 달리 재마운트/재요청이 일어나지 않는다.
 * - 로드된 배너를 다른 것으로 가리지 않는다 (AdMob 정책). 걷어낼 때는 배너를 아예 그리지 않는다.
 * - 상단 안전영역(상태바)도 여기서 확보한다. 각 화면은 top edge 를 쓰지 않는다.
 * - 예외는 AD_FREE_PATHS 뿐이다. 그 화면에서도 이 뷰 자체는 남겨 상태바 자리를 계속 잡아 준다 —
 *   통째로 걷어내면 화면 내용이 상태바 밑으로 올라간다.
 */
const GlobalBannerAd = () => {
	const styles = useThemedStyles(createStyles);
	const insets = useSafeAreaInsets();
	const pathname = usePathname();
	const adFree = AD_FREE_PATHS.includes(pathname);

	return (
		<View style={[styles.wrapper, { paddingTop: insets.top }, adFree && styles.adFree]}>
			{!adFree && <AdmobBannerAd />}
		</View>
	);
};

const createStyles = (Colors: Palette) => StyleSheet.create({
	// 배너 아래 여백 — 광고와 화면 내용이 맞붙으면 어디까지가 광고인지 읽히지 않는다
	wrapper: { backgroundColor: Colors.background, paddingBottom: SpacingV.md },
	// 배너가 빠진 자리 — 상태바 여백만 남기고 아래 여백은 걷는다
	adFree: { paddingBottom: 0 },
});

export default React.memo(GlobalBannerAd);
