// gesture-handler 초기화는 반드시 최상단 첫 import (Android에서 Modal/팝업 내부 터치가 죽는 것 방지)
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// fontSize 를 지정하지 않은 Text 가 안드로이드에서 작게 그려지는 문제 — 화면이 그려지기 전에 기본값을 깔아 둔다
import { applyTextDefaults } from '@/src/utils/TextDefaults';
// 운영 빌드에서는 콘솔을 완전히 막는다 — 다른 초기화보다 먼저 걸어야 초기 로그까지 잡힌다
import { silenceConsoleInProduction } from '@/src/utils/LogUtils';
// 콘솔을 막는 대신 오류는 Crashlytics 로 올린다 — 두 줄이 한 벌이다
import { installGlobalErrorHandler } from '@/src/utils/CrashReport';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { AppState, LogBox } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { persistor, Store } from '@/src/store/Store';
import ThemeProvider, { DEFAULT_THEME_MODE, ThemeMode, readThemeMode, useTheme } from '@/src/hooks/useTheme';
import { applyTheme as applyFourTheme } from '@/src/four/const/ConstColors';
import { rebuildThemedStyles } from '@/src/four/const/ThemeRegistry';
import { applyShadowTheme } from '@/src/const/ConstDesign';
import HanjaFontProvider, { DEFAULT_HANJA_FONT_KEY, readHanjaFontKey } from '@/src/hooks/useHanjaFont';
import VersionCheckModal from '@/src/screens/common/modal/VersionCheckModal';
import GlobalBannerAd from '@/src/screens/common/ads/GlobalBannerAd';
import GlobalToast from '@/src/screens/common/atomic/GlobalToast';
import AnimatedSplash from '@/src/screens/common/AnimatedSplash';
import ErrorBoundary from '@/src/screens/common/ErrorBoundary';
import LifeWatcher from '@/src/screens/life/common/LifeWatcher';
import LevelUpModal from '@/src/screens/life/modal/LevelUpModal';
import PetGrowthModal from '@/src/screens/life/modal/PetGrowthModal';
import { Paths } from '@/src/navigation/conf/Paths';
import { checkDeviceNetConListener } from '@/src/utils/NetworkUtils';
import { loadSoundSettings, prepareAudioSession } from '@/src/utils/SoundUtils';
import { requestAppTrackingPermission } from '@/src/utils/PermissionUtils';
import AdGuardService from '@/src/services/ads/AdGuardService';
import AppOpenAdService from '@/src/services/ads/AppOpenAdService';
import { REACT_NATIVE_APP_MODE } from '@env';

silenceConsoleInProduction();
installGlobalErrorHandler();
applyTextDefaults();
SplashScreen.preventAutoHideAsync();
// 스플래시가 뚝 끊기지 않고 홈으로 녹아들도록 (fade 는 iOS 전용, 안드로이드는 기본 전환을 그대로 쓴다)
SplashScreen.setOptions({ fade: true, duration: 400 });

/**
 * AdMob 초기화 (네이티브 모듈 미링크 시에도 앱이 죽지 않도록 가드)
 */
const initAdMob = () => {
	try {
		const ads = require('react-native-google-mobile-ads');
		const mobileAds = ads.default;
		const { AdsConsent, MaxAdContentRating } = ads;

		// 1) 동의 — EEA·영국 사용자에게는 UMP 양식을 띄워야 개인화 광고를 요청할 수 있다.
		//    그 밖의 지역에서는 양식 없이 곧바로 통과한다(gatherConsent 가 알아서 판단).
		//    실패해도 광고 초기화는 계속한다 — 동의를 못 받으면 비개인화 광고로 떨어질 뿐이다.
		AdsConsent?.gatherConsent?.().catch((e: unknown) => console.warn('광고 동의 확인 실패:', e));

		// 2) 콘텐츠 등급 — 한자 학습 앱이라 전체 이용가(G) 광고만 받는다
		mobileAds()
			.setRequestConfiguration({ maxAdContentRating: MaxAdContentRating?.G ?? 'G' })
			.catch((e: unknown) => console.warn('광고 설정 적용 실패:', e));

		mobileAds()
			.initialize()
			.then((s: unknown) => console.log('✅ AdMob 초기화 완료:', s))
			.catch((e: unknown) => console.warn('❌ AdMob 초기화 실패:', e));
	} catch (e) {
		console.warn('AdMob 모듈 로드 실패(미설치?):', e);
	}
};

/**
 * 알림을 눌러 앱에 들어오면 홈으로 보낸다 (출석·오늘의 퀴즈가 홈에 있다).
 * - 알림은 매일 학습 리마인더 한 종류라 목적지가 하나뿐이다.
 * - 네이티브 모듈이 없더라도 앱이 죽지 않도록 require + try/catch 로 감싼다.
 */
const useDailyNotificationDeepLink = () => {
	useEffect(() => {
		let unsubscribe: (() => void) | undefined;
		try {
			const notifee = require('@notifee/react-native').default;
			const { EventType } = require('@notifee/react-native');
			const goHome = () => router.push('/main/home' as never);
			unsubscribe = notifee.onForegroundEvent(({ type }: { type: number }) => {
				if (type === EventType.PRESS) goHome();
			});
			notifee.getInitialNotification().then((initial: unknown) => {
				if (initial) goHome();
			});
		} catch (e) {
			console.warn('notifee 모듈 로드 실패(미설치?):', e);
		}
		return () => unsubscribe?.();
	}, []);
};

/**
 * 앱이 뒤로 물러날 때 저장을 한 번 밀어 준다.
 * 저장을 1초로 묶어 두었으므로(Store.ts throttle), 마지막 1초치가 아직 안 써졌을 수 있다.
 * 홈 버튼을 누른 순간 밀어 두면 그대로 강제 종료돼도 잃는 게 없다.
 */
const useFlushOnBackground = () => {
	useEffect(() => {
		const subscription = AppState.addEventListener('change', (state) => {
			if (state !== 'active') {
				persistor.flush();
			}
		});
		return () => subscription.remove();
	}, []);
};

/** 상태 바 글자색은 테마를 따라간다 (다크에서 검은 글자면 아이콘이 안 보인다) */
const ThemedStatusBar = () => {
	const { isDark } = useTheme();
	return <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />;
};

export default function RootLayout() {
	const [ready, setReady] = useState(false);
	// 스플래시가 떠 있는 동안 테마를 먼저 읽어 둔다 — 다크 사용자에게 첫 화면이 흰색으로 번쩍이지 않도록
	const [themeMode, setThemeMode] = useState<ThemeMode>(DEFAULT_THEME_MODE);
	// 한자 글씨체도 같은 이유로 먼저 읽어 둔다 — 화면이 그려진 뒤 바뀌면 한자가 한 번 튄다
	const [hanjaFontKey, setHanjaFontKey] = useState<string>(DEFAULT_HANJA_FONT_KEY);
	// 네이티브 스플래시(OS 가 아이콘 크기를 고정) 뒤에 큰 로고를 직접 그려 준다
	const [splashVisible, setSplashVisible] = useState(true);
	// 스플래시 그림이 실제로 화면에 올라온 뒤에야 앱 내용을 붙인다 — 홈 화면이 스플래시보다 먼저 한 번 비치던 문제
	const [contentVisible, setContentVisible] = useState(false);
	const revealContent = useCallback(() => setContentVisible(true), []);
	const hideSplash = useCallback(() => {
		setSplashVisible(false);
		// 스플래시가 끝난 뒤에 앱 오프닝 광고를 띄운다 (스플래시 위에 겹치면 로고가 잘려 보인다)
		// iOS ATT 팝업이 떠 있는 동안에는 전면 광고를 present 할 수 없어 첫 실행이 늘 실패했다.
		// 응답이 끝난 뒤 요청한다 (Android/이미 응답한 사용자는 즉시 resolve 되어 지연 없음).
		requestAppTrackingPermission()
			.catch((error) => console.warn('ATT 권한 요청 실패:', error))
			.finally(() => AppOpenAdService.showAppOpenAd());
	}, []);
	useDailyNotificationDeepLink();
	useFlushOnBackground();

	useEffect(() => {
		(async () => {
			try {
				LogBox.ignoreAllLogs();
				console.log('Now env mode : [', REACT_NATIVE_APP_MODE, ']');
				// AdMob 은 앱이 뜨자마자 초기화한다 — 배너는 루트에 곧바로 마운트되므로
				// SDK 준비 전에 요청이 나가면 첫 광고가 실패하고 그대로 비어 버린다.
				initAdMob();
				checkDeviceNetConListener();
				const savedTheme = await readThemeMode();
				setThemeMode(savedTheme);
				// 이식 화면(src/four)은 모듈이 읽히는 순간 팔레트를 복사해 StyleSheet 를 굽는다.
				// Expo Router 가 라우트를 먼저 읽어 갔을 수 있으므로, 팔레트를 채운 뒤 한 번 다시 만든다.
				// (이걸 빼면 다크 사용자가 이식 화면에 처음 들어갈 때만 라이트로 보인다)
				applyFourTheme(savedTheme);
				// 그림자도 같은 시점에 맞춘다 — 다크 그림자는 색이 배경과 달라야 카드 경계가 보인다
				applyShadowTheme(savedTheme);
				rebuildThemedStyles();
				setHanjaFontKey(await readHanjaFontKey());
				// 저장된 효과음·배경음 on/off 를 먼저 읽어 둔다 (기본 ON)
				await loadSoundSettings();
				// 오디오 세션을 미리 mixWithOthers 로 잡는다 — 사용자가 듣던 음악·영상이 앱 진입만으로 끊기지 않게 한다
				prepareAudioSession();
				AdGuardService.init(); // 광고 클릭 차단 상태 복원
			} catch (e) {
				console.warn('앱 초기화 중 오류:', e);
			} finally {
				// 네이티브 스플래시는 AnimatedSplash 가 한 프레임 그린 뒤 스스로 걷는다
				// (여기서 먼저 걷으면 JS 가 그려지기 전의 흰 화면이 한 번 번쩍인다)
				setReady(true);
			}
		})();
	}, []);

	if (!ready) return null;

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			{/* 렌더 중 터진 오류를 잡아 흰 화면 대신 다시 시도 버튼을 보여 준다 */}
			<ErrorBoundary>
				{/* 스플래시가 이미 화면을 덮은 뒤에 앱 내용을 붙인다 (AnimatedSplash 의 onReveal) */}
				{contentVisible && (
					<Provider store={Store}>
						<PersistGate loading={null} persistor={persistor}>
							<ThemeProvider initialMode={themeMode}>
								<HanjaFontProvider initialKey={hanjaFontKey}>
									<SafeAreaProvider initialMetrics={initialWindowMetrics}>
										<ThemedStatusBar />
										{/* 배너 광고는 여기 한 곳에서만 관리한다 (화면별 배치·재요청 없음) */}
										<GlobalBannerAd />
										{/* iOS 좌측 스와이프(뒤로가기) 전역 차단 — 헤더 뒤로가기 버튼으로만 이동 */}
										<Stack screenOptions={{ headerShown: false, gestureEnabled: false, fullScreenGestureEnabled: false }}>
											<Stack.Screen name="index" />
											<Stack.Screen name={Paths.MAIN_TAB} />
											<Stack.Screen name={Paths.GRADE} />
											<Stack.Screen name={Paths.SHORTS} />
											<Stack.Screen name={Paths.QUIZ} />
											<Stack.Screen name={Paths.WRONG} />
											<Stack.Screen name={Paths.TIME_CHALLENGE} />
											<Stack.Screen name={Paths.TIME_CHALLENGE_INIT} />
											<Stack.Screen name={Paths.TOWER} />
											<Stack.Screen name={Paths.TOWER_QUIZ} />
											<Stack.Screen name={Paths.WORLD} />
											<Stack.Screen name={Paths.WORLD_STUDY} />
											<Stack.Screen name={Paths.WORLD_QUIZ} />
										</Stack>
										{/* 저장 동작 피드백 — 화면 어디서든 showToast() 로 띄운다 */}
										<GlobalToast />
										{/* 새 뱃지 알림 · 매일 알림 재예약 — 화면과 무관하게 상태를 지켜본다 */}
										<LifeWatcher />
										{/* 레벨업 — 펫 단계가 오르면 탭 화면에서 한 번 축하한다 (상자보다 먼저) */}
										<LevelUpModal />
										{/* 수호신 성장 — 먹이를 줘 단계가 오르면 검은 화면으로 덮고 새 모습을 보여 준다 */}
										<PetGrowthModal />
										{/* 필수 : 버전 관리 및 체크를 수행 */}
										<VersionCheckModal />
									</SafeAreaProvider>
								</HanjaFontProvider>
							</ThemeProvider>
						</PersistGate>
					</Provider>
				)}
				{/* 커스텀 스플래시 — 화면을 가득 채우는 로고. 그림이 올라오면 네이티브 스플래시를 걷고, 애니메이션이 끝나면 스스로 사라진다 */}
				{splashVisible && <AnimatedSplash onReveal={revealContent} onFinish={hideSplash} />}
			</ErrorBoundary>
		</GestureHandlerRootView>
	);
}
