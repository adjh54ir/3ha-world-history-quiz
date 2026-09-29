// gesture-handler 초기화는 반드시 최상단 첫 import (Android 모달/팝업 터치 먹통 방지)
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AppState, LogBox, Platform } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';

import { persistor, Store } from '@/src/store/Store';
import { ToastProvider } from '@/src/context/ToastContext';
import i18n, { syncSystemLanguage } from '@/src/translations';
import VersionCheckModal from '@/src/screens/common/modal/VersionCheckModal';
import { ConfirmModalHost } from '@/src/screens/common/modal/ConfirmModal';
import AppLayout from '@/src/screens/common/layout/AppLayout';
import { ensureAudioMode, loadSoundSetting } from '@/src/utils/SoundUtils';
import { loadBgmSetting } from '@/src/utils/BgmUtils';
import { REACT_NATIVE_APP_MODE } from '@env';
import { check, PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import '@/src/config/GlobalComponentDefaults';
import { ReconcileNotificationSchedules } from '@/src/utils/NotifactionHelper';
import { StatusBar } from 'expo-status-bar';
import Colors, { isDark } from '@/src/const/ConstColors';
import { ThemeProvider, DefaultTheme, DarkTheme } from '@react-navigation/native';

/**
 * 네비게이터 기본 테마 — 지정하지 않으면 라이트(흰색)라 다크 모드에서
 * 화면 전환·오버스크롤 때 흰 배경이 비친다.
 */
const navigationTheme = () => {
	const base = isDark() ? DarkTheme : DefaultTheme;
	return {
		...base,
		colors: {
			...base.colors,
			background: Colors.background,
			card: Colors.surface,
			text: Colors.text,
			border: Colors.border,
			primary: Colors.primary,
		},
	};
};



/**
 * AdMob 초기화 (네이티브 모듈 미링크 시에도 앱이 죽지 않도록 가드)
 * - 앱 열기(오프닝) 광고는 로드가 가장 느리다 → 초기화가 끝나는 즉시 제일 먼저 요청한다.
 * - ATT 응답을 기다리지 않는다. 기다리면 첫 화면까지 몇 초가 더 걸린다.
 *   (동의 전에는 SDK가 비개인화 광고로 요청한다 — 추적은 하지 않는다)
 */
const initAdMob = () => {
	try {
		const mobileAds = require('react-native-google-mobile-ads').default;
		mobileAds()
			.initialize()
			.then((s: unknown) => {
				console.log('✅ AdMob 초기화 완료:', s);
				require('@/src/services/AppOpenAdService').initAppOpenAd();
			})
			.catch((e: unknown) => console.warn('❌ AdMob 초기화 실패:', e));
	} catch (e) {
		console.warn('AdMob 모듈 로드 실패(미설치?):', e);
	}
};

// 앱 열기 광고를 최대한 빨리 띄우려면 React 마운트를 기다릴 수 없다 → 번들 평가 시점에 시작
initAdMob();

// 네이티브 스플래시(expo-splash-screen, app.json)를 초기화가 끝날 때까지 붙잡아 두고 페이드로 걷는다.
// 한국어 퀴즈는 react-native-bootsplash 를 썼지만, 이 앱의 네이티브 프로젝트는 expo-splash-screen 으로 이미 짜여 있어 그대로 쓴다.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 400 });

/**
 * iOS 앱 추적 투명성(ATT) 권한 요청
 * - Apple 정책상 앱이 active 상태여야 하므로 마운트 후 약간의 지연을 두고 1회 요청
 * - 네이티브 모듈 미링크 시에도 앱이 죽지 않도록 가드
 */
const requestTrackingPermission = async () => {
	if (Platform.OS !== 'ios') return;
	try {
		const permission = PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY;
		const current = await check(permission);
		if (current === RESULTS.DENIED) await request(permission);
	} catch (e) {
		console.warn('ATT 권한 요청 실패:', e);
	}
};

/**
 * notifee 포그라운드 알림 클릭 시 해당 화면으로 이동
 */
const useNotifeeDeepLink = () => {
	useEffect(() => {
		let unsubscribe: (() => void) | undefined;
		try {
			const notifee = require('@notifee/react-native').default;
			const { EventType } = require('@notifee/react-native');
			unsubscribe = notifee.onForegroundEvent(({ type, detail }: any) => {
				if (type === EventType.PRESS) {
					const screenPath = detail.notification?.data?.moveToScreen;
					if (screenPath) router.push(`/${screenPath}` as never);
				}
			});
			notifee.getInitialNotification().then((initial: any) => {
				const screenPath = initial?.notification?.data?.moveToScreen;
				if (screenPath) router.push(`/${screenPath}` as never);
			});
		} catch (e) {
			console.warn('notifee 모듈 로드 실패(미설치?):', e);
		}
		return () => unsubscribe?.();
	}, []);
};

export default function RootLayout() {
	const [ready, setReady] = useState(false);
	useNotifeeDeepLink();

	// ATT와 시스템 언어는 앱이 active인 시점에 동기화합니다.
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const runWhenActive = (state: string = AppState.currentState) => {
			if (state !== 'active') return;
			syncSystemLanguage().catch(() => {});
			ReconcileNotificationSchedules().catch(() => {});
			// 광고·통화 등이 오디오 세션을 바꿔 놓을 수 있어 active 될 때마다 mix 모드를 다시 지정
			ensureAudioMode().catch(() => {});
			if (Platform.OS === 'ios' && !timer) {
				// 광고 초기화는 여기서 하지 않는다(모듈 로드 시점에 이미 시작됨)
				timer = setTimeout(() => {
					requestTrackingPermission().catch(() => {});
				}, 700);
			}
		};
		runWhenActive();
		const subscription = AppState.addEventListener('change', runWhenActive);
		return () => {
			subscription.remove();
			if (timer) clearTimeout(timer);
		};
	}, []);

	// 사운드 설정 로드 + 효과음 플레이어 프리로드 — 플랫폼 무관하게 시작 시 1회
	// (이전에는 iOS ATT 분기 안에 있어 안드로이드에서는 첫 효과음이 무음이었다)
	useEffect(() => {
		loadSoundSetting();
		loadBgmSetting();
	}, []);

	useEffect(() => {
		(async () => {
			try {
				LogBox.ignoreAllLogs();
				console.log('Now env mode : [', REACT_NATIVE_APP_MODE, ']');
			} catch (e) {
				console.warn('앱 초기화 중 오류:', e);
			} finally {
				setReady(true);
				// 네이티브 스플래시 페이드 아웃
				SplashScreen.hideAsync().catch(() => {});
			}
		})();
	}, []);

	if (!ready) return null;

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<Provider store={Store}>
				<PersistGate loading={null} persistor={persistor}>
					<I18nextProvider i18n={i18n}>
						<SafeAreaProvider initialMetrics={initialWindowMetrics}>
							<ThemeProvider value={navigationTheme()}>
								<ToastProvider>
									{/* 다크 모드면 상태바 아이콘을 밝게 — 어두운 배경에서 시간·배터리가 묻히지 않도록 */}
									<StatusBar style={isDark() ? 'light' : 'dark'} translucent backgroundColor="transparent" />
									<AppLayout />
									<VersionCheckModal />
									<ConfirmModalHost />
								</ToastProvider>
							</ThemeProvider>
						</SafeAreaProvider>
					</I18nextProvider>
				</PersistGate>
			</Provider>
		</GestureHandlerRootView>
	);
};
