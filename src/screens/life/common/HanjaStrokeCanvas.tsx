import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { ClipPath, Defs, G, Path } from 'react-native-svg';
import { selectStrokes } from '@/src/const/data/life/ConstHanjaStrokes';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** 한 획을 긋는 데 걸리는 시간 (ms) — 획 길이에 비례해 조금씩 늘린다 */
const STROKE_MS = 520;
/** 획과 획 사이 숨 고르는 시간 (ms) */
const GAP_MS = 90;
/**
 * 붓 굵기 — 획 바깥선 안쪽을 남김없이 덮을 만큼 두껍게 잡는다.
 * (1024 좌표계 기준. 얇으면 획 끝 모서리가 안 칠해진 채 남는다)
 */
const BRUSH_WIDTH = 190;
/**
 * 중심선 자료(109 좌표계)의 획 굵기.
 * 바깥선이 없어 이 선 자체가 글자가 된다 — 실제 붓 굵기에 가깝게 잡는다.
 */
const LINE_WIDTH = 7.5;

interface Props {
	/** 그릴 한자 한 글자 */
	char: string;
	/** 캔버스 한 변 (px) */
	size: number;
	/** 다 그린 글자의 색 */
	color: string;
	/** 아직 안 그린 획을 옅게 깔아 두는 색 — 없으면 밑그림을 두지 않는다 */
	ghostColor?: string;
	/** 획을 그리는 동안 붓이 지나간 자리를 강조하는 색 — 없으면 color 를 쓴다 */
	brushColor?: string;
	/**
	 * 지금 이 글자를 그릴 차례인지.
	 * false 면 연출 없이 다 쓴 모습으로만 둔다 (앞서 쓴 글자·아직 차례가 아닌 글자).
	 */
	playing?: boolean;
	/** 아직 차례가 아닌 글자는 밑그림만 두고 비워 둔다 */
	pending?: boolean;
	/** 이 값이 바뀌면 처음부터 다시 그린다 */
	playToken?: number;
	/** 마지막 획까지 다 그렸을 때 한 번 */
	onDone?: () => void;
}

/** 중심선 좌표를 SVG path 로 — 붓이 지나가는 길이다 */
const toPath = (median: number[][]) => median.map(([x, y], at) => `${at === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');

/** 중심선의 실제 길이 — strokeDasharray 를 이 길이에 맞춰야 획이 정확히 한 번 그어진다 */
const pathLength = (median: number[][]) => {
	let total = 0;
	for (let at = 1; at < median.length; at += 1) {
		total += Math.hypot(median[at][0] - median[at - 1][0], median[at][1] - median[at - 1][1]);
	}
	// 점이 하나뿐인 획(점 찍기)은 길이가 0 이라 애니메이션이 돌지 않는다 — 최소값을 준다
	return Math.max(total, 1);
};

/**
 * 한자를 획순대로 그려 주는 캔버스.
 * -------------------------------------------------
 * 획 하나하나를 "바깥선으로 오려낸 자리(clipPath) 안에서, 중심선을 따라 두꺼운 선을 그어" 채운다.
 * 사람이 붓으로 쓰는 것과 같은 순서·같은 방향으로 획이 자라난다.
 *
 * 자료가 없는 글자는 아무것도 그리지 않고 null 을 돌려준다 — 부르는 쪽에서 글자만 보여 주면 된다.
 */
const HanjaStrokeCanvas = ({ char, size, color, ghostColor, brushColor, playing = true, pending = false, playToken = 0, onDone }: Props) => {
	const data = useMemo(() => selectStrokes(char), [char]);
	/** 지금까지 다 그린 획 수 — 이만큼은 색을 채운 채로 둔다 */
	const [drawn, setDrawn] = useState(0);
	/** 지금 긋고 있는 획 번호 (-1: 없음) */
	const [active, setActive] = useState(-1);
	const progress = useRef(new Animated.Value(0)).current;
	/**
	 * 이 캔버스만의 clipPath 이름표.
	 * clipPath id 는 안드로이드 react-native-svg 에서 앱 전체가 한 이름 공간을 쓴다 —
	 * 캔버스가 여러 개 뜨면 id 가 겹쳐 엉뚱한 획으로 잘린다.
	 * useId 값에는 `:` 가 섞여 있어 url(#...) 에 그대로 못 쓰므로 글자·숫자만 남긴다.
	 */
	const uid = `hanja-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
	/** 획과 획 사이 기다리는 타이머 — 화면을 벗어나면 끊는다 */
	const gapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	/** 진행 중인 연출 — 글자가 바뀌거나 화면을 벗어나면 여기서 끊는다 */
	const running = useRef<Animated.CompositeAnimation | null>(null);
	const finished = useRef(onDone);
	finished.current = onDone;

	const medians = data?.medians;
	const mode = data?.mode;

	useEffect(() => {
		if (!medians?.length) {
			return;
		}
		// 내 차례가 아니면 연출을 돌리지 않는다 — 이미 쓴 글자는 채운 채로, 아직인 글자는 비운 채로 둔다
		if (!playing) {
			setActive(-1);
			setDrawn(pending ? 0 : medians.length);
			return;
		}
		let cancelled = false;
		setDrawn(0);
		setActive(-1);

		const drawFrom = (at: number) => {
			if (cancelled) {
				return;
			}
			if (at >= medians.length) {
				setActive(-1);
				setDrawn(medians.length);
				finished.current?.();
				return;
			}
			setActive(at);
			progress.setValue(0);
			// 긴 획은 조금 더 천천히 — 모든 획을 같은 시간에 그으면 짧은 획이 획 튀어 보인다
			// 좌표계가 1024 인 자료와 109 인 자료가 섞여 있어 각자의 한 변 기준으로 잰다
			const span = mode === 'line' ? 109 : 1024;
			const ratio = Math.min(1.6, Math.max(0.6, pathLength(medians[at]) / (span * 0.41)));
			running.current = Animated.timing(progress, {
				toValue: 1,
				duration: STROKE_MS * ratio,
				easing: Easing.inOut(Easing.quad),
				// strokeDashoffset 은 네이티브 드라이버로 못 돌린다 (레이아웃이 아닌 SVG 속성)
				useNativeDriver: false,
			});
			running.current.start(({ finished: done }) => {
				if (cancelled || !done) {
					return;
				}
				setDrawn(at + 1);
				gapTimer.current = setTimeout(() => drawFrom(at + 1), GAP_MS);
			});
		};

		drawFrom(0);
		return () => {
			cancelled = true;
			running.current?.stop();
			if (gapTimer.current) {
				clearTimeout(gapTimer.current);
				gapTimer.current = null;
			}
		};
	}, [medians, mode, pending, playing, playToken, progress]);

	if (!data) {
		return null;
	}

	// 중심선 자료 — 바깥선이 없으니 오려내지 않고 선을 그대로 굵게 긋는다
	if (data.mode === 'line') {
		return (
			<View style={[styles.box, { width: size, height: size }]}>
				<Svg width={size} height={size} viewBox={data.viewBox}>
					{/* 아직 안 그린 획 */}
					{!!ghostColor &&
						medians?.map((median, at) =>
							at >= drawn ? (
								<Path
									key={`ghost-${at}`}
									d={toPath(median)}
									stroke={ghostColor}
									strokeWidth={LINE_WIDTH}
									strokeLinecap="round"
									strokeLinejoin="round"
									fill="none"
								/>
							) : null,
						)}

					{/* 다 그린 획 */}
					{medians?.map((median, at) =>
						at < drawn ? (
							<Path
								key={`done-${at}`}
								d={toPath(median)}
								stroke={color}
								strokeWidth={LINE_WIDTH}
								strokeLinecap="round"
								strokeLinejoin="round"
								fill="none"
							/>
						) : null,
					)}

					{/* 지금 긋고 있는 획 — 선이 한쪽에서 자라난다 */}
					{active >= 0 && !!medians?.[active] && (
						<AnimatedPath
							d={toPath(medians[active])}
							stroke={brushColor ?? color}
							strokeWidth={LINE_WIDTH}
							strokeLinecap="round"
							strokeLinejoin="round"
							fill="none"
							strokeDasharray={`${pathLength(medians[active])},${pathLength(medians[active])}`}
							strokeDashoffset={progress.interpolate({
								inputRange: [0, 1],
								outputRange: [pathLength(medians[active]), 0],
							})}
						/>
					)}
				</Svg>
			</View>
		);
	}

	return (
		<View style={[styles.box, { width: size, height: size }]}>
			<Svg width={size} height={size} viewBox={data.viewBox}>
				<Defs>
					{data.outlines.map((outline, at) => (
						<ClipPath key={`clip-${at}`} id={`${uid}-${at}`}>
							<Path d={outline} />
						</ClipPath>
					))}
				</Defs>

				{/* 이 자료는 y 축이 위를 향한다 — 한 번 뒤집어 화면 좌표로 맞춘다 */}
				<G transform={data.transform}>
					{/* 아직 안 그린 획 — 어디에 무엇이 올지 옅게 깔아 둔다 */}
					{!!ghostColor &&
						data.outlines.map((outline, at) => (at >= drawn ? <Path key={`ghost-${at}`} d={outline} fill={ghostColor} /> : null))}

					{/* 다 그린 획 */}
					{data.outlines.map((outline, at) => (at < drawn ? <Path key={`done-${at}`} d={outline} fill={color} /> : null))}

					{/* 지금 긋고 있는 획 — 바깥선으로 오려낸 자리 안에서 중심선을 따라 자란다 */}
					{active >= 0 && !!medians?.[active] && (
						<G clipPath={`url(#${uid}-${active})`}>
							<AnimatedPath
								d={toPath(medians[active])}
								stroke={brushColor ?? color}
								strokeWidth={BRUSH_WIDTH}
								strokeLinecap="round"
								strokeLinejoin="round"
								fill="none"
								strokeDasharray={`${pathLength(medians[active])},${pathLength(medians[active])}`}
								strokeDashoffset={progress.interpolate({
									inputRange: [0, 1],
									outputRange: [pathLength(medians[active]), 0],
								})}
							/>
						</G>
					)}
				</G>
			</Svg>
		</View>
	);
};

const styles = StyleSheet.create({
	box: { alignItems: 'center', justifyContent: 'center' },
});

export default HanjaStrokeCanvas;
