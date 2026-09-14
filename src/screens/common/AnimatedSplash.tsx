import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { isTablet } from '@/src/utils/DementionUtils';

/**
 * 네이티브 스플래시 배경색과 같은 값 — 두 화면이 한 장면으로 이어져 보이도록.
 * 네이티브 스플래시(app.json expo-splash-screen)와 같은 그림·같은 파랑을 쓰므로 두 화면이 한 장면처럼 이어진다.
 */
const BACKGROUND_COLOR = '#1249C9';
/** 캐릭터와 아이콘이 화면 가로를 차지하는 비율 */
const LOGO_WIDTH_RATIO = 0.62;

/**
 * 그림을 못 읽는 경우에도 앱이 네이티브 스플래시에 갇히지 않도록 하는 안전망 (ms).
 * 이 시간이 지나면 onLoadEnd 가 오지 않았어도 그냥 연출을 시작한다.
 */
const REVEAL_FALLBACK_MS = 1200;

/**
 * 태블릿 로고 폭 — 네이티브 스플래시와 같은 값으로 고정한다.
 * -------------------------------------------------
 * 비율(0.62)만 쓰면 아이패드(폭 1024)에서 로고가 635pt 로 뜬다. 바로 앞에 지나간 네이티브
 * 스플래시는 220pt 라(app.json 의 expo-splash-screen imageWidth) 화면이 걷힐 때 로고가 세 배로 튄다.
 *
 * imageWidth 는 기기 종류와 무관한 단일 값이다 — 플러그인의 iOS 설정에 tabletImage 는 있어도
 * tabletImageWidth 는 없어서(storyboard 가 폭 하나만 쓴다) 네이티브 쪽을 키울 방법이 없다.
 * 그래서 JS 쪽을 네이티브에 맞춘다. 이 값을 바꿀 땐 app.json 의 imageWidth 도 같이 바꿔야 한다.
 *
 * 폰은 비율 그대로다 (가장 넓은 폰 440pt 에서도 273pt — 네이티브 220 과 큰 차이가 없다).
 */
const TABLET_LOGO_WIDTH = 220;

type Props = {
	/**
	 * 스플래시 그림이 실제로 화면에 올라온 순간 호출 — 부모는 이때부터 앱 내용을 붙인다.
	 * (이 순서를 지키지 않으면 홈 화면이 스플래시보다 먼저 한 번 보인다)
	 */
	onReveal: () => void;
	/** 퇴장 애니메이션까지 끝났을 때 호출 — 부모가 이 컴포넌트를 걷어낸다 */
	onFinish: () => void;
};

/**
 * 네이티브 스플래시가 사라진 직후 잠깐 덮어 주는 커스텀 스플래시.
 * - 네이티브의 서 있는 팬더 → 힘을 모으는 팬더 → 앱 아이콘 순으로 짧은 3컷을 만든다.
 * - 안드로이드 12+ 는 OS 가 아이콘 크기를 고정해 버려서, 큰 아이콘은 이렇게 JS 로 그려야 한다.
 * - 준비 자세에서 앱 아이콘으로 교차 전환한 뒤, 살짝 확대하며 홈 화면에 녹아든다.
 */
const AnimatedSplash = ({ onReveal, onFinish }: Props) => {
	const { width } = useWindowDimensions();
	const chargeOpacity = useRef(new Animated.Value(1)).current;
	const chargeScale = useRef(new Animated.Value(0.84)).current;
	const logoOpacity = useRef(new Animated.Value(0)).current;
	const logoScale = useRef(new Animated.Value(0.82)).current;
	const backdropOpacity = useRef(new Animated.Value(1)).current;
	// 스플래시 그림이 올라왔는지 — 이 값이 켜진 뒤에 연출이 돈다
	const [revealed, setRevealed] = useState(false);

	/**
	 * 첫 컷 그림이 실제로 올라온 순간에만 하는 일 — 한 번만 돈다.
	 * 1) 네이티브 스플래시를 걷는다. 레이아웃이 잡힌 시점(onLayout)에 걷으면 그림이 아직 디코딩되지
	 *    않아 파란 빈 화면이 한 번 비치고, 그 틈에 뒤쪽 화면이 먼저 보일 수 있다.
	 * 2) 부모에게 알려 앱 내용을 붙이게 한다 — 스플래시가 이미 덮고 있는 상태에서 붙으므로 안 비친다.
	 * 3) 연출을 시작한다. 마운트 때 시작하면 첫 스프링이 네이티브 스플래시 뒤에서 그냥 지나가 버린다.
	 */
	const reveal = useCallback(() => {
		SplashScreen.hideAsync().catch(() => {
			// 이미 걷힌 뒤면 무시한다
		});
		onReveal();
		setRevealed(true);
	}, [onReveal]);

	/** 그림을 못 읽는 경우에도 앱이 네이티브 스플래시에 갇히지 않도록 하는 안전망 */
	useEffect(() => {
		if (revealed) {
			return;
		}
		const timer = setTimeout(reveal, REVEAL_FALLBACK_MS);
		return () => clearTimeout(timer);
	}, [revealed, reveal]);

	useEffect(() => {
		if (!revealed) {
			return;
		}
		const anim = Animated.sequence([
			Animated.spring(chargeScale, {
				toValue: 1,
				friction: 6,
				tension: 62,
				useNativeDriver: true,
			}),
			Animated.delay(180),
			Animated.parallel([
				Animated.timing(chargeOpacity, {
					toValue: 0,
					duration: 220,
					easing: Easing.in(Easing.quad),
					useNativeDriver: true,
				}),
				Animated.timing(chargeScale, {
					toValue: 1.08,
					duration: 220,
					easing: Easing.in(Easing.quad),
					useNativeDriver: true,
				}),
				Animated.timing(logoOpacity, {
					toValue: 1,
					duration: 240,
					easing: Easing.out(Easing.quad),
					useNativeDriver: true,
				}),
				Animated.spring(logoScale, {
					toValue: 1,
					friction: 7,
					tension: 68,
					useNativeDriver: true,
				}),
			]),
			Animated.delay(420),
			Animated.parallel([
				Animated.timing(backdropOpacity, {
					toValue: 0,
					duration: 360,
					easing: Easing.in(Easing.quad),
					useNativeDriver: true,
				}),
				Animated.timing(logoScale, {
					toValue: 1.06,
					duration: 360,
					easing: Easing.in(Easing.quad),
					useNativeDriver: true,
				}),
			]),
		]);
		anim.start(({ finished }) => {
			if (finished) onFinish();
		});
		// 연출 도중 화면이 걷히면 프레임 콜백이 남는다 — 언마운트 때 끊는다
		return () => anim.stop();
	}, [revealed, backdropOpacity, chargeOpacity, chargeScale, logoOpacity, logoScale, onFinish]);

	const logoWidth = isTablet ? TABLET_LOGO_WIDTH : width * LOGO_WIDTH_RATIO;

	return (
		<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}>
			<Animated.Image
				source={require('@/src/assets/illustrations/panda-splash-charge.webp')}
				resizeMode="contain"
				onLoadEnd={reveal}
				style={[
					styles.centeredImage,
					{
						width: logoWidth,
						height: logoWidth,
						opacity: chargeOpacity,
						transform: [{ scale: chargeScale }],
					},
				]}
			/>
			<Animated.Image
				source={require('@/assets/splash.png')}
				resizeMode="contain"
				style={[
					styles.centeredImage,
					{
						width: logoWidth,
						height: logoWidth,
						opacity: logoOpacity,
						transform: [{ scale: logoScale }],
					},
				]}
			/>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	backdrop: {
		alignItems: 'center',
		backgroundColor: BACKGROUND_COLOR,
		justifyContent: 'center',
		zIndex: 9999,
	},
	centeredImage: {
		position: 'absolute',
	},
});

export default AnimatedSplash;
