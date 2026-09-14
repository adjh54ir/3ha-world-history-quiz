import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * 언마운트 시 Animated.Value 에 걸린 애니메이션을 모두 멈춘다.
 *
 * `Animated.timing(...).start(cb)` 처럼 이벤트 핸들러에서 시작한 애니메이션은
 * 화면이 사라져도 계속 돌면서 프레임 콜백으로 네이티브 노드를 갱신한다.
 * useRef 로 만든 값은 참조가 고정되므로 첫 렌더의 목록을 그대로 잡아두면 된다.
 *
 * 주의: `stopAnimation()` 은 완료 콜백을 `{ finished: false }` 로 한 번 호출한다.
 * 즉 이 훅만으로는 늦은 setState / onHide 를 막지 못한다.
 * `.start(cb)` 쪽에서 `finished` 를 반드시 확인해야 한다.
 *
 * @example
 * const fade = useRef(new Animated.Value(0)).current;
 * useAnimationCleanup(fade, scale);
 * // 그리고 완료 콜백에서
 * Animated.timing(fade, opts).start(({ finished }) => { if (!finished) return; ... });
 */
export const useAnimationCleanup = (...values: (Animated.Value | Animated.ValueXY)[]) => {
	const stored = useRef(values);

	useEffect(() => {
		const list = stored.current;
		return () => {
			list.forEach((value) => value.stopAnimation());
		};
	}, []);
};

export default useAnimationCleanup;
