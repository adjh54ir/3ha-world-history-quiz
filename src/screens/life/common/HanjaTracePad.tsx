import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, StyleSheet } from 'react-native';
import Svg, { Circle, G, Path, Polyline } from 'react-native-svg';
import { Palette } from '@/src/const/ConstColors';
import { Radius } from '@/src/const/ConstDesign';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { selectStrokes } from '@/src/const/data/life/ConstHanjaStrokes';
import { isStrokeTraced, TracePoint } from '@/src/services/life/StrokeTrace';
import { playCorrect, playWrong } from '@/src/utils/SoundUtils';
import { scaleWidth } from '@/src/utils';

/** 이만큼(판 한 변 대비)은 움직여야 자취에 점을 하나 더 찍는다 */
const MIN_STEP = 0.015;

/** 한 글자를 다 쓰고 다음으로 넘어가기까지 머무는 시간 (ms) */
const COMPLETE_HOLD_MS = 600;

/** 시작점 표시 — 숨 쉬듯 커졌다 작아져 "여기서 출발" 이 눈에 걸린다 */
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
	/** 따라 쓸 한자 한 글자 */
	char: string;
	/** 판 한 변 (px) */
	size: number;
	/** 마지막 획까지 다 쓰면 한 번 */
	onComplete?: () => void;
}

/**
 * 한자 획순 따라 쓰기 판.
 * -------------------------------------------------
 * 보기만 하던 획순을 손가락으로 직접 긋게 한다 — 눈으로 본 순서와 손이 기억하는 순서는 다르다.
 * 지금 그을 획만 색으로 짚어 주고 시작점에 점을 찍어 둔다. 맞으면 그 획이 채워지고 다음 획으로,
 * 틀리면 판이 한 번 흔들리고 같은 획을 다시 받는다 (틀렸다고 처음부터 되돌리지 않는다).
 *
 * 채점은 화면 크기와 무관하게 0~1 로 환산한 좌표에서 한다 — 폰·태블릿에서 같은 난이도가 된다.
 *
 * 글자를 바꿀 때는 부르는 쪽에서 `key={char}` 로 새로 만든다 — 진행 상태를 effect 로 되돌리지 않는다.
 */
const HanjaTracePad = ({ char, size, onComplete }: Props) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const data = useMemo(() => selectStrokes(char), [char]);
	/** 다 쓴 획 수 */
	const [done, setDone] = useState(0);
	/** 지금 손가락이 지나간 자리 (판 픽셀 좌표) — 그리기용 */
	const [drawing, setDrawing] = useState<TracePoint[]>([]);
	/**
	 * 같은 자취의 ref 사본.
	 * 손을 뗄 때 채점하려면 최신 자취가 필요한데, setState 업데이터 안에서 다른 setState 를 부르면
	 * 업데이터가 두 번 도는 순간 획이 두 번 채점된다 — 값은 ref 로 들고 채점은 밖에서 한다.
	 */
	const drawnRef = useRef<TracePoint[]>([]);
	/** 손을 처음 댄 자리 (판 픽셀 좌표) — 이동량을 여기에 더해 자취를 만든다 */
	const origin = useRef<TracePoint>({ x: 0, y: 0 });
	const shake = useRef(new Animated.Value(0)).current;
	/** 시작점 맥박 */
	const pulse = useRef(new Animated.Value(0)).current;
	/** PanResponder 는 처음 렌더의 함수를 붙들고 있다 — 최신 값을 ref 로 넘긴다 */
	const state = useRef({ done: 0, size });
	state.current = { done, size };
	const finished = useRef(onComplete);
	finished.current = onComplete;
	/** 다 쓴 글자를 잠깐 보여 주고 넘어가는 타이머 — 화면을 벗어나도 살아남으므로 붙잡아 둔다 */
	const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	/**
	 * 획 중심선을 0~1 좌표로 옮겨 둔다.
	 * 바깥선 자료(1024)는 y 축이 위를 향해 화면에서 한 번 뒤집히므로 같은 식으로 뒤집어 준다.
	 * 중심선 자료(109)는 뒤집을 것이 없다.
	 */
	const targets = useMemo<TracePoint[][]>(() => {
		if (!data) {
			return [];
		}
		const span = data.mode === 'line' ? 109 : 1024;
		return data.medians.map((median) =>
			median.map(([x, y]) => ({ x: x / span, y: (data.mode === 'line' ? y : 900 - y) / span })),
		);
	}, [data]);

	useEffect(
		() => () => {
			shake.stopAnimation();
			if (doneTimer.current) {
				clearTimeout(doneTimer.current);
			}
		},
		[shake],
	);

	/** 시작점이 천천히 커졌다 작아진다 — SVG 속성은 네이티브 드라이버로 못 돌린다 */
	useEffect(() => {
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
				Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
			]),
		);
		loop.start();
		return () => loop.stop();
	}, [pulse]);

	const rejectStroke = useCallback(() => {
		playWrong();
		shake.setValue(0);
		Animated.sequence([
			Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
			Animated.timing(shake, { toValue: -1, duration: 120, useNativeDriver: true }),
			Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
		]).start();
	}, [shake]);

	const responder = useMemo(
		() =>
			PanResponder.create({
				onStartShouldSetPanResponder: () => true,
				onMoveShouldSetPanResponder: () => true,
				// 시트 안에 있어도 판 위에서는 스크롤에 손가락을 넘기지 않는다
				onStartShouldSetPanResponderCapture: () => true,
				onMoveShouldSetPanResponderCapture: () => true,
				onPanResponderGrant: (event) => {
					const { locationX, locationY } = event.nativeEvent;
					origin.current = { x: locationX, y: locationY };
					drawnRef.current = [{ x: locationX, y: locationY }];
					setDrawing(drawnRef.current);
				},
				onPanResponderMove: (_event, gesture) => {
					/**
					 * 판 안의 자리는 **손을 댄 지점 + 제스처 이동량** 으로 잡는다.
					 * nativeEvent.locationX 는 그 프레임에 손가락이 얹힌 뷰를 기준으로 오므로, 움직이는 중에는
					 * 안드로이드에서 기준 뷰가 바뀌며 좌표가 튄다 — 획이 엉뚱한 자리로 기록돼 채점이 자주 틀렸다.
					 */
					const point = { x: origin.current.x + gesture.dx, y: origin.current.y + gesture.dy };
					const last = drawnRef.current[drawnRef.current.length - 1];
					// 손가락이 거의 안 움직인 프레임은 버린다 — 점이 수백 개 쌓이면 선만 무거워지고 채점 결과는 그대로다
					if (last && Math.hypot(point.x - last.x, point.y - last.y) < state.current.size * MIN_STEP) {
						return;
					}
					drawnRef.current = [...drawnRef.current, point];
					setDrawing(drawnRef.current);
				},
				onPanResponderRelease: () => {
					const { done: at, size: box } = state.current;
					const drawn = drawnRef.current;
					drawnRef.current = [];
					setDrawing([]);
					const target = targets[at];
					if (!target) {
						return;
					}
					const normalized = drawn.map((point) => ({ x: point.x / box, y: point.y / box }));
					if (!isStrokeTraced(normalized, target)) {
						rejectStroke();
						return;
					}
					playCorrect();
					const next = at + 1;
					setDone(next);
					if (next >= targets.length) {
						// 마지막 획이 채워진 글자를 잠깐 보여 주고 넘어간다 — 바로 바뀌면 다 썼다는 실감이 없다
						doneTimer.current = setTimeout(() => finished.current?.(), COMPLETE_HOLD_MS);
					}
				},
				onPanResponderTerminate: () => {
					drawnRef.current = [];
					setDrawing([]);
				},
			}),
		[rejectStroke, targets],
	);

	if (!data) {
		return null;
	}

	/** 지금 그을 획의 시작점 — 원본 좌표 그대로 두고 G 변환에 맡긴다 */
	const startPoint = data.medians[done]?.[0];
	// 시작점 표시는 자료 좌표계 기준이라 두 자료(1024·109)의 크기를 따로 잡는다
	const dotRadius = data.mode === 'line' ? 5 : 42;

	const strokePath = (median: number[][]) => median.map(([x, y], at) => `${at === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');

	return (
		<Animated.View
			style={[
				styles.pad,
				{ width: size, height: size },
				{ transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-scaleWidth(8), scaleWidth(8)] }) }] },
			]}
			{...responder.panHandlers}>
			{/* 밑그림 · 다 쓴 획 · 지금 그을 획 */}
			<Svg width={size} height={size} viewBox={data.viewBox} style={styles.layer} pointerEvents="none">
				<G transform={data.transform}>
					{data.mode === 'line'
						? data.medians.map((median, at) => (
								<Path
									key={`line-${at}`}
									d={strokePath(median)}
									stroke={at < done ? Colors.textStrong : at === done ? Colors.primaryLight : Colors.border}
									strokeWidth={7.5}
									strokeLinecap="round"
									strokeLinejoin="round"
									fill="none"
								/>
							))
						: data.outlines.map((outline, at) => (
								<Path key={`fill-${at}`} d={outline} fill={at < done ? Colors.textStrong : at === done ? Colors.primarySoft : Colors.border} />
							))}

					{/* 시작점 — 맥박 치는 테두리 + 가운데 점으로 "여기서 출발" 을 못박는다 */}
					{!!startPoint && (
						<>
							<AnimatedCircle
								cx={startPoint[0]}
								cy={startPoint[1]}
								r={pulse.interpolate({ inputRange: [0, 1], outputRange: [dotRadius * 1.6, dotRadius * 2.6] })}
								fill={Colors.primary}
								opacity={pulse.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0.06] })}
							/>
							<Circle cx={startPoint[0]} cy={startPoint[1]} r={dotRadius} fill={Colors.primaryDark} />
						</>
					)}
				</G>
			</Svg>

			{/* 손가락 자취 — 판 픽셀 좌표를 그대로 쓴다 */}
			{drawing.length > 1 && (
				<Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={styles.layer} pointerEvents="none">
					<Polyline
						points={drawing.map((point) => `${point.x},${point.y}`).join(' ')}
						stroke={Colors.accentAmber}
						strokeWidth={scaleWidth(10)}
						strokeLinecap="round"
						strokeLinejoin="round"
						fill="none"
						opacity={0.9}
					/>
				</Svg>
			)}
		</Animated.View>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		pad: {
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.border,
			backgroundColor: Colors.surfaceAlt,
			overflow: 'hidden',
		},
		layer: { ...StyleSheet.absoluteFillObject },
	});

export default HanjaTracePad;
