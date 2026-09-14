import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppModal from '@/src/four/screens/common/atomic/AppModal';
import { Colors, withAlpha } from '@/src/four/const/ConstColors';
import { FontWeight, Radius, SpacingV, Typography } from '@/src/four/const/ConstDesign';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils';
import { playCountdown, playGo } from '@/src/utils/SoundUtils';

/** 한 칸(3 → 2 → 1 → 시작!)이 머무는 시간 */
const STEP_MS = 800;
/** '시작!' 을 보여 주고 다음 화면으로 넘어가기까지 */
const GO_HOLD_MS = 620;

/** 칸마다 붙는 한마디 — 숫자만 세면 기다리는 시간이 그냥 빈다 */
const STEP_TEXT: Record<number, string> = {
	3: '심호흡 하세요',
	2: '준비하세요!',
	1: '곧 시작됩니다!',
	0: '화이팅!',
};

interface Props {
	/** 켜지는 순간 3부터 세기 시작한다 */
	visible: boolean;
	/** '시작!' 까지 다 보여 준 뒤 — 여기서 다음 화면으로 넘어간다 */
	onDone: () => void;
}

/**
 * 챌린지 시작 카운트다운
 * -------------------------------------------------
 * 타임 챌린지와 타워 챌린지가 같은 연출을 쓴다. 두 화면에 따로 적어 두면 한쪽만 손보게 된다.
 *
 * 연출은 세 겹이다.
 *  1) 회전하는 두 겹 링 — 서로 반대로 돌아 "돌아가는 판" 처럼 보인다
 *  2) 숫자 — 크게 들어와 제 크기를 지나쳤다가 자리를 잡는다(스프링)
 *  3) 퍼지는 파문 — 칸이 바뀔 때마다 링 밖으로 한 번 퍼진다
 * 소리는 3·2·1 에 짧은 클릭, '시작!' 에 올라가는 큐 음이 붙는다.
 *
 * 새 라이브러리를 붙이지 않는다 — 전부 Animated(네이티브 드라이버) 와 그라데이션 한 장이다.
 */
const ChallengeCountdown = ({ visible, onDone }: Props) => {
	/** 지금 보여 주는 칸. 3 → 2 → 1 → 0('시작!') */
	const [step, setStep] = useState(3);
	/** 숫자가 튀어 들어오는 값 */
	const pop = useRef(new Animated.Value(0)).current;
	/** 칸이 바뀔 때 링 밖으로 퍼지는 파문 */
	const ripple = useRef(new Animated.Value(0)).current;
	/** 계속 도는 링 */
	const spin = useRef(new Animated.Value(0)).current;
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
	/** 다음 화면으로 넘기는 콜백 — 타이머가 잡아 두면 낡은 함수가 불린다 */
	const doneRef = useRef(onDone);
	doneRef.current = onDone;

	/** 한 칸을 보여 준다 — 소리와 움직임을 함께 낸다 */
	const beat = useCallback(
		(value: number) => {
			setStep(value);
			if (value > 0) {
				playCountdown();
			} else {
				playGo();
			}
			pop.setValue(0);
			ripple.setValue(0);
			Animated.spring(pop, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
			Animated.timing(ripple, { toValue: 1, duration: 620, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
		},
		[pop, ripple],
	);

	useEffect(() => {
		if (!visible) {
			return;
		}
		const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true }));
		spin.setValue(0);
		loop.start();

		beat(3);
		timers.current = [
			setTimeout(() => beat(2), STEP_MS),
			setTimeout(() => beat(1), STEP_MS * 2),
			setTimeout(() => beat(0), STEP_MS * 3),
			setTimeout(() => doneRef.current(), STEP_MS * 3 + GO_HOLD_MS),
		];

		return () => {
			loop.stop();
			timers.current.forEach(clearTimeout);
			timers.current = [];
		};
	}, [visible, beat, spin]);

	if (!visible) {
		return null;
	}

	const isGo = step === 0;
	const numberStyle = {
		opacity: pop.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] }),
		transform: [
			{ scale: pop.interpolate({ inputRange: [0, 0.55, 1], outputRange: [2.4, 0.88, 1] }) },
			{ rotate: pop.interpolate({ inputRange: [0, 1], outputRange: [isGo ? '-8deg' : '12deg', '0deg'] }) },
		],
	};
	const rippleStyle = {
		opacity: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
		transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] }) }],
	};
	const spinStyle = { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] };
	const spinBackStyle = { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] }) }] };

	return (
		<AppModal visible transparent animationType="fade" onRequestClose={() => {}}>
			<View style={styles.overlay}>
				<View style={styles.stage}>
					{/* 파문 — 칸이 바뀔 때마다 한 번 퍼진다 */}
					<Animated.View style={[styles.ripple, rippleStyle]} pointerEvents="none" />
					{/* 바깥 링과 안쪽 링이 서로 반대로 돈다 */}
					<Animated.View style={[styles.ringOuter, spinStyle]} pointerEvents="none" />
					<Animated.View style={[styles.ringInner, spinBackStyle]} pointerEvents="none" />
					<LinearGradient
						colors={isGo ? [Colors.secondarySurface, Colors.primaryDeep] : [Colors.primary, Colors.primaryDeep]}
						start={{ x: 0.2, y: 0 }}
						end={{ x: 0.8, y: 1 }}
						style={styles.disc}
					/>
					<Animated.Text style={[styles.number, isGo && styles.numberGo, numberStyle]} allowFontScaling={false}>
						{isGo ? '시작!' : String(step)}
					</Animated.Text>
				</View>
				<Text style={styles.message}>{STEP_TEXT[step]}</Text>
			</View>
		</AppModal>
	);
};

const DISC = scaleWidth(168);

const makeStyles = () =>
	StyleSheet.create({
		overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SpacingV.xxl, backgroundColor: Colors.scrimStrong },
		stage: { width: DISC * 1.9, height: DISC * 1.9, alignItems: 'center', justifyContent: 'center' },
		disc: { width: DISC, height: DISC, borderRadius: Radius.pill },
		// 링은 한쪽 변만 색을 줘서 회전이 눈에 보이게 한다
		ringOuter: {
			position: 'absolute',
			width: DISC * 1.72,
			height: DISC * 1.72,
			borderRadius: Radius.pill,
			borderWidth: scaleWidth(3),
			borderColor: 'transparent',
			borderTopColor: Colors.accentOrangeLight,
			borderRightColor: withAlpha(Colors.accentOrangeLight, 0.28),
		},
		ringInner: {
			position: 'absolute',
			width: DISC * 1.34,
			height: DISC * 1.34,
			borderRadius: Radius.pill,
			borderWidth: scaleWidth(2),
			borderColor: 'transparent',
			borderBottomColor: Colors.primaryLight,
			borderLeftColor: withAlpha(Colors.primaryLight, 0.28),
		},
		ripple: {
			position: 'absolute',
			width: DISC,
			height: DISC,
			borderRadius: Radius.pill,
			borderWidth: scaleWidth(2),
			borderColor: Colors.accentOrangeLight,
		},
		number: {
			position: 'absolute',
			fontSize: scaledSize(84),
			lineHeight: scaledSize(96),
			fontWeight: FontWeight.heavy,
			color: Colors.textInverse,
			includeFontPadding: false,
		},
		numberGo: { fontSize: scaledSize(52), lineHeight: scaledSize(62) },
		message: {
			minHeight: scaleHeight(26),
			fontSize: Typography.subtitle,
			fontWeight: FontWeight.bold,
			color: Colors.textInverse,
		},
	});

let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});

export default ChallengeCountdown;
