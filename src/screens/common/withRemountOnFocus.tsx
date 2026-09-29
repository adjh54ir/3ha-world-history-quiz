import React, { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * 탭을 다시 선택하면 화면을 통째로 remount 해 내부 상태(탭/필터/스크롤/펼침 등)를 초기화한다.
 * - react-navigation v7 에서 unmountOnBlur 가 사라져 key 변경으로 대체한다.
 * - 최초 포커스는 이미 mount 된 직후라 건너뛴다(불필요한 2중 마운트 방지).
 */
export const withRemountOnFocus = <P extends object>(Screen: React.ComponentType<P>) => {
	const Wrapped: React.FC<P> = (props) => {
		const [key, setKey] = useState(0);
		const first = useRef(true);
		useFocusEffect(
			useCallback(() => {
				if (first.current) {
					first.current = false;
					return;
				}
				setKey((k) => k + 1);
			}, []),
		);
		return <Screen key={key} {...props} />;
	};
	Wrapped.displayName = `RemountOnFocus(${Screen.displayName || Screen.name || 'Screen'})`;
	return Wrapped;
};

export default withRemountOnFocus;
