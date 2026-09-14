/**
 * 원형 진행 링 래퍼
 * -------------------------------------------------
 * `react-native-circular-progress` 의 AnimatedCircularProgress 는 `componentWillUnmount` 가 없다.
 *  1) `componentDidMount`/`componentDidUpdate` 에서 `Animated.timing(...).start()` 를 걸고 아무도 stop() 하지 않는다.
 *  2) `onFillChange` 를 넘기면 `addListener` 만 하고 떼지 않는다.
 *     신아키텍처(Fabric)에서는 이미 떼어낸 네이티브 노드를 계속 갱신하다 앱이 죽는다 (Confetti 와 같은 경로).
 *
 * 퀴즈 타이머처럼 1초마다 fill 이 바뀌는 자리에서 화면을 벗어나면 그 애니메이션이 그대로 남는다.
 * 라이브러리가 애니메이션 핸들을 내보내지 않으므로, 인스턴스가 들고 있는 Animated.Value 를 직접 끊는다.
 * 링을 쓰는 곳은 모두 이 컴포넌트를 쓴다.
 */
import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { AnimatedCircularProgress, AnimatedCircularProgressProps } from 'react-native-circular-progress';

/** 라이브러리가 state 를 타입으로 내보내지 않아 필요한 칸만 좁혀 본다 */
type WithFillAnimation = { state?: { fillAnimation?: Animated.Value } };

const CircularProgress = (props: AnimatedCircularProgressProps) => {
	const ref = useRef<AnimatedCircularProgress>(null);

	useEffect(() => {
		// 언마운트 시 ref 가 먼저 끊길 수 있어(정리 시점이 ref detach 뒤) 인스턴스를 잡아 둔다
		const instance = ref.current as unknown as WithFillAnimation | null;
		return () => {
			const value = instance?.state?.fillAnimation;
			value?.stopAnimation();
			value?.removeAllListeners();
		};
	}, []);

	return <AnimatedCircularProgress ref={ref} {...props} />;
};

export default CircularProgress;
