import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * 애니메이션을 대신 시작해 주고, 화면/모달이 사라질 때 남아 있는 것을 모두 정지한다.
 *
 * - 데이터 로드 콜백처럼 useEffect 밖에서 시작하는 연출도 정리 대상이 된다.
 * - 정리하지 않으면 언마운트 뒤에도 프레임 콜백이 돌아 값이 남거나 setState 경고가 난다.
 *
 * ```ts
 * const run = useAnimationRunner();
 * run(Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }));
 * ```
 */
export const useAnimationRunner = () => {
	const running = useRef<Animated.CompositeAnimation[]>([]);

	useEffect(
		() => () => {
			running.current.forEach((anim) => anim.stop());
			running.current = [];
		},
		[],
	);

	return useCallback((anim: Animated.CompositeAnimation, onEnd?: Animated.EndCallback) => {
		running.current.push(anim);
		anim.start((result) => {
			running.current = running.current.filter((item) => item !== anim);
			// stop() 은 완료 콜백을 finished:false 로 부른다 — 정리하려고 멈춘 것이므로 후속 동작은 건너뛴다
			if (!result.finished) {
				return;
			}
			onEnd?.(result);
		});
		return anim;
	}, []);
};

/**
 * 화면/시트 진입 연출용 애니메이션 스타일.
 * 아래에서 떠오르며 제자리를 살짝 지나쳤다가 돌아온다(오버슈트) — 게임 UI 처럼 통통 튀는 등장.
 * 언마운트 시 자동으로 정지된다.
 *
 * `Easing.out(Easing.back)` 은 끝에서 1을 넘겼다가 돌아오므로 위치·크기는 그 오버슈트를 그대로 쓰고,
 * 투명도만 clamp 해서 1을 넘지 않게 막는다 (opacity > 1 은 안드로이드에서 경고가 난다).
 *
 * @param offset 시작 위치(아래쪽으로 밀어 둘 px)
 */
export const useScreenEnter = (offset = 14, duration = 340) => {
	const enter = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		const anim = Animated.timing(enter, { toValue: 1, duration, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true });
		anim.start();
		return () => anim.stop();
	}, [enter, duration]);

	return useMemo(
		() => ({
			opacity: enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
			transform: [
				{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) },
				{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
			],
		}),
		[enter, offset],
	);
};

/**
 * 바텀시트·팝업 진입 연출.
 *
 * 화면 진입용({@link useScreenEnter})과 달리 `visible` 이 켜질 때마다 다시 재생한다.
 * RN `<Modal>` 은 닫혀 있어도 자식이 마운트된 채로 남아서, 마운트 기준 연출은 첫 번째로 열 때만 보인다.
 *
 * @param visible 모달 표시 여부
 * @param offset 시작 위치(아래로 밀어 둘 px)
 */
export const useSheetEnter = (visible: boolean, offset = 24, duration = 260) => {
	const enter = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!visible) {
			// 닫히면 다음 열기를 위해 시작 위치로 되돌린다
			enter.setValue(0);
			return;
		}
		const anim = Animated.timing(enter, { toValue: 1, duration, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true });
		anim.start();
		return () => anim.stop();
	}, [visible, enter, duration]);

	return useMemo(
		() => ({
			opacity: enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
			// 시트는 바닥에 붙어 있어 scale 을 주면 아래에 틈이 생긴다 — 위치만 튕긴다
			transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }],
		}),
		[enter, offset],
	);
};

export default useAnimationRunner;
