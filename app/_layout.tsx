// gesture-handler 초기화는 반드시 최상단 첫 import (Android 모달/팝업 터치 먹통 방지)
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';
import { AppState, LogBox, Platform, useColorScheme } from 'react-native';
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
import { ADMOB_TEST_DEVICES, REACT_NATIVE_APP_MODE } from '@env';
import AdGuardService from '@/src/services/ads/AdGuardService';
import { maybeShowOpeningAd, prepareOpeningAd } from '@/src/services/ads/AdOpening';
import { check, PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import '@/src/config/GlobalComponentDefaults';
import { ReconcileNotificationSchedules } from '@/src/utils/NotifactionHelper';
import { StatusBar } from 'expo-status-bar';
import Colors, { isDark } from '@/src/const/ConstColors';
import { KO_FONTS, LATIN_FONTS } from '@/src/const/ConstDesign';
import { ThemeProvider, DefaultTheme, DarkTheme } from 'expo-router/react-navigation';

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
 * - 테스트 기기·콘텐츠 등급은 initialize() **전에** 건다(SDK 규칙).
 *   'EMULATOR' — 시뮬레이터·에뮬레이터는 번들 종류와 무관하게 늘 테스트 광고를 받는다.
 *   실기기는 .env 의 EXPO_PUBLIC_ADMOB_TEST_DEVICES 에 적는다 — 릴리스 검수 중 운영 광고를 누르는 사고를 막는다.
 * - 광고 소리를 끈다 — 동영상 광고가 붙으면 아무것도 안 눌렀는데 소리부터 난다.
 *   안드로이드는 initialize() 전에 부르면 네이티브 IllegalStateException 으로 앱이 죽는다 → 반드시 초기화 뒤에 건다.
 * - 끝나면 오디오 세션을 우리 것(playback + mixWithOthers)으로 되돌린다.
 *   광고 SDK(GADAudioSession)가 초기화하며 세션을 ambient 로 바꿔 두어, 그대로 두면 iOS 무음 스위치가 켜진 기기에서 효과음·BGM 이 안 난다.
 * 프로미스를 돌려준다 — 오프닝 광고를 받기 전, 스플래시를 걷기 전에 기다린다.
 */
const initAdMob = async (): Promise<void> => {
	try {
		const { default: mobileAds, MaxAdContentRating } = require('react-native-google-mobile-ads');
		// 앱 등급(4+ / 전체이용가)에 맞지 않는 광고가 붙지 않게 광고 콘텐츠 등급 상한을 건다 (더 엄격히 하려면 G)
		await mobileAds()
			.setRequestConfiguration({ maxAdContentRating: MaxAdContentRating.PG, testDeviceIdentifiers: ['EMULATOR', ...ADMOB_TEST_DEVICES] })
			.catch((e: unknown) => console.warn('AdMob 요청 설정 실패:', e));
		const s = await mobileAds().initialize();
		try {
			mobileAds().setAppMuted(true);
			mobileAds().setAppVolume(0);
		} catch (e) {
			console.warn('AdMob 음소거 설정 실패:', e);
		}
		console.log('✅ AdMob 초기화 완료:', s);
	} catch (e) {
		console.warn('❌ AdMob 초기화 실패:', e);
	} finally {
		await ensureAudioMode();
	}
};

/** 광고 SDK 초기화를 기다려 주는 상한 — 넘으면 그냥 화면을 연다(사내망·기내에서 스플래시가 붙들리지 않게) */
const AD_INIT_TIMEOUT_MS = 3000;

// React 마운트를 기다리지 않고 번들 평가 시점에 시작한다 — 스플래시가 떠 있는 동안 끝나도록
const adReady = initAdMob();

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
 * iOS 추적(ATT) 동의를 아직 묻지 않았는가 — 첫 실행에서만 true.
 * 묻기 전에 광고를 요청하면 광고 식별자 없이 나가므로, 그때만 오프닝 광고 미리 받기를 동의 뒤로 미룬다.
 */
const isTrackingUndetermined = async (): Promise<boolean> => {
	if (Platform.OS !== 'ios') return false;
	const status = await check(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY).catch(() => RESULTS.UNAVAILABLE);
	return status === RESULTS.DENIED;
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
	// 설정에서 테마를 바꾸면 Appearance 가 바뀐다 — 구독해 두어야 아래 상태바·네비 테마가 그 자리에서 다시 그려진다
	useColorScheme();
	useNotifeeDeepLink();

	// 시스템 언어·알림 예약·오디오 세션은 앱이 active 인 시점에 동기화합니다.
	useEffect(() => {
		const runWhenActive = (state = AppState.currentState) => {
			if (state !== 'active') return;
			syncSystemLanguage().catch(() => {});
			ReconcileNotificationSchedules().catch(() => {});
			// 광고·통화 등이 오디오 세션을 바꿔 놓을 수 있어 active 될 때마다 mix 모드를 다시 지정
			ensureAudioMode().catch(() => {});
		};
		runWhenActive();
		const subscription = AppState.addEventListener('change', runWhenActive);
		return () => subscription.remove();
	}, []);

	/*
	 * iOS 광고 추적(ATT) — 앱이 활성 상태가 된 뒤 요청해야 시스템 팝업이 뜬다.
	 * 오프닝 광고는 **ATT 팝업이 끝난 뒤**에 띄운다. 둘을 같이 띄우면 시스템 팝업이 광고를 덮어
	 * 요청만 나가고 화면에는 안 뜬다(노출 없는 요청). 첫 실행은 건너뛰고 그다음부터 두 번에 한 번(AdOpening).
	 */
	useEffect(() => {
		if (!ready) return;
		const id = setTimeout(async () => {
			await requestTrackingPermission();
			maybeShowOpeningAd().catch((e) => console.warn('오프닝 광고 실패:', e));
		}, 700);
		return () => clearTimeout(id);
	}, [ready]);

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
				AdGuardService.init(); // 광고 클릭 차단 상태 복원
				/*
				 * 오프닝 광고를 스플래시가 떠 있는 동안 미리 받아 둔다 — 첫 화면이 뜨는 순간 곧바로 띄울 수 있게.
				 * iOS 첫 실행(추적 동의 전)만 예외다. 동의 전에 받으면 광고 식별자 없이 요청이 나가므로 동의 뒤에 받는다.
				 */
				adReady
					.then(async () => {
						if (!(await isTrackingUndetermined())) prepareOpeningAd();
					})
					.catch(() => undefined);
				// 제목·본문 서체 — 실패해도 시스템 서체로 그려지므로 앱 시작을 막지 않는다.
				// 설정에서 언어를 바로 바꿀 수 있어 지금 언어와 상관없이 묶음을 모두 올린다
				await Font.loadAsync({
					[KO_FONTS.display]: require('@/src/assets/fonts/BlackHanSans-Regular.ttf'),
					[KO_FONTS.regular]: require('@/src/assets/fonts/NanumSquareRoundR.ttf'),
					[KO_FONTS.bold]: require('@/src/assets/fonts/NanumSquareRoundB.ttf'),
					[KO_FONTS.heavy]: require('@/src/assets/fonts/NanumSquareRoundEB.ttf'),
					[LATIN_FONTS.display]: require('@/src/assets/fonts/Nunito-Black.ttf'),
					[LATIN_FONTS.regular]: require('@/src/assets/fonts/Nunito-Regular.ttf'),
					[LATIN_FONTS.bold]: require('@/src/assets/fonts/Nunito-Bold.ttf'),
					[LATIN_FONTS.heavy]: require('@/src/assets/fonts/Nunito-ExtraBold.ttf'),
				}).catch((e) => console.warn('앱 서체 로드 실패:', e));
				// 배너는 루트에 곧바로 마운트된다 — SDK 준비 전에 요청이 나가면 첫 광고가 비어 버리므로 초기화를 기다린다(상한 있음)
				await Promise.race([adReady, new Promise((resolve) => setTimeout(resolve, AD_INIT_TIMEOUT_MS))]);
			} catch (e) {
				console.warn('앱 초기화 중 오류:', e);
			} finally {
				setReady(true);
				// 네이티브 스플래시 페이드 아웃 — 오프닝 광고는 화면이 뜬 뒤(ATT 다음)에 띄운다.
				// 스플래시 위에 띄우면 SDK 가 붙을 화면을 못 찾아 요청만 나가고 노출은 안 된다
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
									<StatusBar style={isDark() ? 'light' : 'dark'} />
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
