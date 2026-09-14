import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { Radius } from '@/src/const/ConstDesign';
import { useTheme } from '@/src/hooks/useTheme';

/** 대기 동작 — float: 숨 쉬듯 천천히 뜬다 / cheer: 신나서 빠르게 갸웃거린다 / none: 정지 */
export type MascotMotion = 'float' | 'cheer' | 'none';

interface Props {
	source: ImageSource | number;
	/** 정사각형 한 변(px) */
	size: number;
	motion?: MascotMotion;
	/** 등장할 때 작게 있다가 통통 튀며 커진다 */
	popIn?: boolean;
	/** 바닥 그림자 — 캐릭터가 뜬 만큼 작아지고 옅어진다 */
	shadow?: boolean;
	/** 뒤에 까는 둥근 판 색 (없으면 깔지 않는다) */
	plateColor?: string;
	/** 밖에서 밀어 넣는 추가 도약(0~1) — 눌렀을 때 뛰어오르는 연출 등 */
	lift?: Animated.Value;
	/** 이미지 위에 얹을 것 — 몸과 같이 눌리고 늘어난다 */
	children?: React.ReactNode;
	style?: StyleProp<ViewStyle>;
	accessibilityLabel?: string;
}

/**
 * 캐릭터 그림 한 장 — 앱의 사자가 나오는 자리는 모두 이 컴포넌트를 쓴다.
 * -------------------------------------------------
 * 가만히 있는 그림은 스티커처럼 보인다. 게임 캐릭터처럼 보이려면 세 가지가 같이 움직여야 한다.
 * 1) 뜨고 가라앉기 : 위아래로 움직이며 몸이 눌리고(스쿼시) 늘어난다(스트레치)
 * 2) 바닥 그림자   : 캐릭터가 뜬 만큼 작고 옅어진다 — 바닥이 있어야 "떠 있다"로 보인다
 * 3) 등장          : 작게 시작해 제 크기를 살짝 지나쳤다가 자리를 잡는다
 *
 * 전부 transform/opacity 라 네이티브 드라이버로 돌아간다(JS 스레드와 무관하게 매끄럽다).
 */
const MOTION: Record<MascotMotion, { duration: number; rise: number; squashX: number[]; squashY: number[]; tilt: number }> = {
	float: { duration: 1400, rise: 0.05, squashX: [1.025, 0.985], squashY: [0.975, 1.02], tilt: 2 },
	cheer: { duration: 620, rise: 0.035, squashX: [1.03, 0.97], squashY: [0.97, 1.03], tilt: 6 },
	// 정지 — 값이 0에 멈춰 있어도 원래 크기 그대로여야 한다
	none: { duration: 0, rise: 0, squashX: [1, 1], squashY: [1, 1], tilt: 0 },
};

const MascotImage = ({ source, size, motion = 'float', popIn = false, shadow = true, plateColor, lift, children, style, accessibilityLabel }: Props) => {
	const idle = useRef(new Animated.Value(0)).current;
	const pop = useRef(new Animated.Value(popIn ? 0 : 1)).current;
	const preset = MOTION[motion];
	const { isDark } = useTheme();

	useEffect(() => {
		if (motion === 'none') {
			return;
		}
		const { duration } = MOTION[motion];

		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(idle, { toValue: 1, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
				Animated.timing(idle, { toValue: 0, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
			]),
		);
		loop.start();
		return () => loop.stop();
	}, [idle, motion]);

	useEffect(() => {
		if (!popIn) {
			return;
		}
		const anim = Animated.spring(pop, { toValue: 1, friction: 5, tension: 110, useNativeDriver: true });
		anim.start();
		return () => anim.stop();
	}, [pop, popIn]);

	/** 대기 + 도약 + 등장을 한 벌의 transform 으로 합친다 */
	const bodyStyle = useMemo(() => {
		const rise = idle.interpolate({ inputRange: [0, 1], outputRange: [0, -size * preset.rise] });
		const jump = lift?.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.22] });
		const idleX = idle.interpolate({ inputRange: [0, 1], outputRange: preset.squashX });
		const idleY = idle.interpolate({ inputRange: [0, 1], outputRange: preset.squashY });
		const jumpX = lift?.interpolate({ inputRange: [0, 1], outputRange: [1, 0.93] });
		const jumpY = lift?.interpolate({ inputRange: [0, 1], outputRange: [1, 1.09] });
		// 등장 스프링은 1을 넘겼다 돌아온다 — 크기는 그 오버슈트를 쓰고 투명도만 clamp 한다
		const bodyX = jumpX ? Animated.multiply(idleX, jumpX) : idleX;
		const bodyY = jumpY ? Animated.multiply(idleY, jumpY) : idleY;
		const scaleX = popIn ? Animated.multiply(bodyX, pop) : bodyX;
		const scaleY = popIn ? Animated.multiply(bodyY, pop) : bodyY;
		return {
			opacity: popIn ? pop.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' as const }) : 1,
			transform: [
				{ translateY: jump ? Animated.add(rise, jump) : rise },
				{ scaleX },
				{ scaleY },
				{ rotate: idle.interpolate({ inputRange: [0, 1], outputRange: [`-${preset.tilt}deg`, `${preset.tilt}deg`] }) },
			],
		};
	}, [idle, lift, pop, popIn, preset, size]);

	/** 바닥 그림자 — 뜬 만큼 작아지고 옅어진다 */
	const shadowStyle = useMemo(() => {
		const height = lift ? Animated.add(idle, lift) : idle;
		return {
			opacity: height.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.07], extrapolate: 'clamp' as const }),
			transform: [{ scaleX: height.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7], extrapolate: 'clamp' as const }) }],
		};
	}, [idle, lift]);

	return (
		<Animated.View style={[styles.wrap, { width: size, height: size }, style]} accessibilityLabel={accessibilityLabel}>
			{!!plateColor && <Animated.View style={[styles.plate, { width: size, height: size, borderRadius: Radius.pill, backgroundColor: plateColor }]} />}
			{shadow && (
				<Animated.View
					style={[
						styles.shadow,
						// 다크 배경(#0F172A)과 그림자 색이 같으면 그림자가 사라진다 — 다크에서는 순검정으로 깐다
						{ width: size * 0.46, height: size * 0.07, bottom: size * 0.02, borderRadius: Radius.pill, backgroundColor: isDark ? '#000000' : '#0F172A' },
						shadowStyle,
					]}
				/>
			)}
			<Animated.View style={[styles.body, { width: size, height: size }, bodyStyle]}>
				<Image source={source} style={{ width: size, height: size }} contentFit="contain" transition={300} accessible={false} />
				{children}
			</Animated.View>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	wrap: { alignItems: 'center', justifyContent: 'center' },
	plate: { position: 'absolute' },
	shadow: { position: 'absolute' },
	body: { alignItems: 'center', justifyContent: 'center' },
});

export default MascotImage;
