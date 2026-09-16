import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet } from 'react-native';

/** app.json의 네이티브 스플래시와 반드시 같은 값이어야 한다. */
const BACKGROUND_COLOR = '#1249C9';
/** app.json expo-splash-screen.imageWidth와 반드시 같은 값이어야 한다. */
const SPLASH_MARK_WIDTH = 220;
/** 이미지 디코딩 실패 시에도 네이티브 스플래시에 갇히지 않게 하는 안전망. */
const REVEAL_FALLBACK_MS = 1200;

type Props = {
	onReveal: () => void;
	onFinish: () => void;
};

/** 네이티브 스플래시와 같은 그림을 이어 받아 홈 화면까지 부드럽게 연결한다. */
const AnimatedSplash = ({ onReveal, onFinish }: Props) => {
	const markScale = useRef(new Animated.Value(1)).current;
	const backdropOpacity = useRef(new Animated.Value(1)).current;
	const didReveal = useRef(false);
	const [revealed, setRevealed] = useState(false);

	const reveal = useCallback(() => {
		if (didReveal.current) return;
		didReveal.current = true;
		SplashScreen.hideAsync().catch(() => undefined);
		onReveal();
		setRevealed(true);
	}, [onReveal]);

	useEffect(() => {
		if (revealed) return;
		const timer = setTimeout(reveal, REVEAL_FALLBACK_MS);
		return () => clearTimeout(timer);
	}, [revealed, reveal]);

	useEffect(() => {
		if (!revealed) return;

		let cancelled = false;
		let animation: Animated.CompositeAnimation | undefined;

		AccessibilityInfo.isReduceMotionEnabled().then((reduceMotionEnabled) => {
			if (cancelled) return;

			animation = reduceMotionEnabled
				? Animated.timing(backdropOpacity, {
						toValue: 0,
						duration: 180,
						useNativeDriver: true,
					})
				: Animated.sequence([
						Animated.delay(420),
						Animated.parallel([
							Animated.timing(markScale, {
								toValue: 1.035,
								duration: 620,
								easing: Easing.out(Easing.cubic),
								useNativeDriver: true,
							}),
							Animated.timing(backdropOpacity, {
								toValue: 0,
								duration: 620,
								delay: 180,
								easing: Easing.inOut(Easing.quad),
								useNativeDriver: true,
							}),
						]),
					]);

			animation.start(({ finished }) => {
				if (finished) onFinish();
			});
		});

		return () => {
			cancelled = true;
			animation?.stop();
		};
	}, [revealed, backdropOpacity, markScale, onFinish]);

	return (
		<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}>
			<Animated.Image
				source={require('@/assets/splash.png')}
				resizeMode="contain"
				onLoadEnd={reveal}
				style={[styles.mark, { transform: [{ scale: markScale }] }]}
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
	mark: {
		height: SPLASH_MARK_WIDTH,
		width: SPLASH_MARK_WIDTH,
	},
});

export default AnimatedSplash;
