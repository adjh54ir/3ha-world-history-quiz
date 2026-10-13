import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useNavigation, useRoute, type ParamListBase } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

/** 탭 화면의 스크롤 위치 기억 — useScrollTop 이 저장하고, 리마운트 직후 한 번 꺼내 복원한다 */
export interface ScrollMemory {
	save: (y: number) => void;
	/** 복원할 위치를 한 번만 돌려주고 비운다 (0 이면 맨 위에서 시작) */
	takeRestore: () => number;
}

export const ScrollMemoryContext = createContext<ScrollMemory | null>(null);

/**
 * 탭으로 다시 들어오면 화면을 통째로 remount 해 내부 상태(탭/필터/펼침 등)를 초기화한다.
 * - react-navigation v7 에서 unmountOnBlur 가 사라져 key 변경으로 대체한다.
 * - 최초 포커스는 이미 mount 된 직후라 건너뛴다(불필요한 2중 마운트 방지).
 * - 다른 탭으로 갔다 오면 맨 위에서 시작하고, 이 탭 위에 쌓인 화면(퀴즈·상세 등)에서 돌아오면
 *   데이터는 새로 읽되(리마운트) 보던 스크롤 위치는 되살린다.
 * - 다른 탭으로 떠나면 전환 애니메이션이 끝난 뒤 화면을 내려 둔다. 돌아올 때 이전 상태가
 *   한 프레임 보였다가 초기화되는 깜빡임이 없고, 마운트 이펙트도 한 번만 돈다.
 * - 이미 보고 있는 탭을 다시 눌러도 처음 상태로 초기화한다.
 */
export const withRemountOnFocus = <P extends object>(Screen: React.ComponentType<P>) => {
	const Wrapped: React.FC<P> = (props) => {
		const navigation = useNavigation<BottomTabNavigationProp<ParamListBase>>();
		const route = useRoute();
		const [key, setKey] = useState(0);
		const first = useRef(true);
		/** 마지막으로 본 스크롤 위치 */
		const savedY = useRef(0);
		/** 다음 마운트가 복원할 위치 */
		const restoreY = useRef(0);
		/** 직전 blur 가 '이 탭 위에 화면이 쌓여서'였는지 (탭 전환이면 false) */
		const covered = useRef(false);
		/** 다른 탭으로 떠나 화면을 내려 둔 상태인지 */
		const [mounted, setMounted] = useState(true);
		const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
		useEffect(() => () => { if (unmountTimer.current) clearTimeout(unmountTimer.current); }, []);

		const memory = useMemo<ScrollMemory>(
			() => ({
				save: (y) => {
					savedY.current = y;
				},
				takeRestore: () => {
					const y = restoreY.current;
					restoreY.current = 0;
					return y;
				},
			}),
			[],
		);

		useFocusEffect(
			useCallback(() => {
				if (unmountTimer.current) {
					clearTimeout(unmountTimer.current);
					unmountTimer.current = null;
				}
				if (first.current) {
					first.current = false;
				} else {
					restoreY.current = covered.current ? savedY.current : 0;
					if (!covered.current) savedY.current = 0;
					setMounted(true);
					setKey((k) => k + 1);
				}
				return () => {
					// blur 시점에 탭 내비게이터가 여전히 이 탭을 가리키면 = 위에 스택 화면이 올라온 것
					const state = navigation.getState();
					covered.current = !!state && state.routes[state.index]?.key === route.key;
					// 탭 전환이면 페이드가 끝난 뒤 화면을 내린다 (스택이 덮은 경우는 뒤로가기 제스처에 보여야 하므로 유지)
					if (!covered.current) {
						unmountTimer.current = setTimeout(() => {
							unmountTimer.current = null;
							setMounted(false);
						}, 350);
					}
				};
			}, [navigation, route.key]),
		);

		// 이미 보고 있는 탭을 다시 누르면 처음 상태로 되돌린다 (포커스 변화가 없어 위 로직이 돌지 않는다)
		useEffect(
			() =>
				navigation.addListener('tabPress', () => {
					if (!navigation.isFocused()) return;
					restoreY.current = 0;
					savedY.current = 0;
					setKey((k) => k + 1);
				}),
			[navigation],
		);

		return (
			<ScrollMemoryContext.Provider value={memory}>
				{mounted && <Screen key={key} {...props} />}
			</ScrollMemoryContext.Provider>
		);
	};
	Wrapped.displayName = `RemountOnFocus(${Screen.displayName || Screen.name || 'Screen'})`;
	return Wrapped;
};

export default withRemountOnFocus;
