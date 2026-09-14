/**
 * 폭죽(컨페티) 래퍼
 * -------------------------------------------------
 * `react-native-confetti-cannon` 는 componentWillUnmount 가 없다.
 *  1) autoStart 는 `setTimeout(this.start)` 로 시작하므로, 마운트 직후 화면이 닫히면
 *     사라진 컴포넌트에서 애니메이션이 새로 시작된다.
 *  2) 시작된 Animated.sequence 를 아무도 stop() 하지 않아 언마운트 뒤에도 계속 돈다.
 *     신아키텍처(Fabric)에서는 이미 떼어낸 네이티브 노드를 계속 갱신하다 앱이 죽는다.
 *
 * 그래서 autoStart 를 끄고 이 래퍼가 직접 start/stop 을 관리한다.
 * 모달·결과 화면에서 조건부로 붙였다 떼는 곳이 많으므로 반드시 이 컴포넌트를 쓴다.
 */
import React, { useEffect, useRef } from 'react';
import ConfettiCannon, { ExplosionProps } from 'react-native-confetti-cannon';

/**
 * 조각 하나가 Animated.View + 보간 7개라서 개수가 그대로 네이티브 노드 수가 된다.
 * ponytail: 상한만 걸어 둔다. 저가 안드로이드에서 더 버벅이면 값을 낮춘다.
 */
const MAX_COUNT = 120;

const Confetti = ({ count, autoStart: _autoStart, autoStartDelay: _autoStartDelay, ...rest }: ExplosionProps) => {
	const cannonRef = useRef<ConfettiCannon>(null);

	useEffect(() => {
		// 언마운트 시 ref 가 먼저 끊길 수 있어(passive effect 정리가 ref detach 뒤) 인스턴스를 잡아 둔다
		const cannon = cannonRef.current;
		cannon?.start();
		return () => cannon?.stop();
	}, []);

	return <ConfettiCannon ref={cannonRef} {...rest} count={Math.min(count, MAX_COUNT)} autoStart={false} />;
};

export default Confetti;
