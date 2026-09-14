/**
 * React Navigation → Expo Router 호환 레이어
 * -------------------------------------------------
 * 옮겨 온 화면들은 `useNavigation().navigate(Paths.QUIZ, { questionPool, title })` 처럼
 * **객체를 통째로** 다음 화면에 넘긴다. Expo Router 의 `useLocalSearchParams` 는 URL 문자열만
 * 다루므로 문제 목록 같은 배열은 그대로 실어 보낼 수 없다.
 *
 * 그래서 파라미터는 이 모듈의 메모리 저장소에 경로 이름으로 넣어 두고, 이동은 router 로 한다.
 * 다음 화면이 `useRoute().params` 를 읽을 때 자기 경로 이름으로 꺼내 간다.
 *
 * 한계: 같은 화면을 스택에 두 번 쌓으면 나중 파라미터가 앞 것을 덮는다.
 * 이식된 흐름(학습→퀴즈→결과)은 같은 화면을 겹쳐 쌓지 않아 문제가 없다.
 * ponytail: 경로별 1칸 저장소. 같은 화면을 겹쳐 쌓는 흐름이 생기면 스택 키로 바꾼다.
 */
import { useMemo } from 'react';
import { router, usePathname } from 'expo-router';

export { useIsFocused, useFocusEffect } from '@react-navigation/native';

/** 원본 코드가 타입 자리에만 쓰던 것 — 형태만 맞춰 둔다 */
export type RouteProp<ParamList, RouteName extends keyof ParamList = keyof ParamList> = {
	key: string;
	name: RouteName;
	params: ParamList[RouteName];
};

type Params = Record<string, unknown> | undefined;

/** 경로 이름 → 그 화면에 넘긴 파라미터 */
const store = new Map<string, Params>();

/** 경로 이름만 남긴다 — '/quiz' → 'quiz', '/main/home' → 'home' */
const routeName = (path: string): string => path.split('?')[0].split('/').filter(Boolean).pop() ?? '';

/**
 * 이동할 주소를 만든다.
 * React Navigation 의 중첩 이동(`navigate('main', { screen: 'home' })`)은
 * Expo Router 에서 `/main/home` 한 줄이 된다.
 */
const hrefOf = (name: string, params?: Params): string => {
	const screen = params && typeof params.screen === 'string' ? params.screen : undefined;
	if (screen) {
		return `/${name}/${screen}`;
	}
	store.set(name, params);
	return `/${name}`;
};

/** 이식 화면 밖(홈 등)에서 이 화면들로 보낼 때 파라미터를 미리 실어 둔다 */
export const setRouteParams = (name: string, params: Params): void => {
	store.set(name, params);
};

/** 원본의 useNavigation 자리 — 실제로 쓰이던 메서드만 갖춘다 */
export const useNavigation = <T = any>() =>
	useMemo(
		() =>
			({
				navigate: (name: string, params?: Params) => router.push(hrefOf(name, params) as never),
				push: (name: string, params?: Params) => router.push(hrefOf(name, params) as never),
				replace: (name: string, params?: Params) => router.replace(hrefOf(name, params) as never),
				goBack: () => (router.canGoBack() ? router.back() : router.replace('/main/home' as never)),
				/** 헤더를 쓰지 않는 화면들이라 옵션은 받아만 두고 버린다 */
				setOptions: () => undefined,
				/** 원본이 beforeRemove 등을 걸던 자리 — 해제 함수만 돌려준다 */
				addListener: () => () => undefined,
				canGoBack: () => router.canGoBack(),
			}) as T,
		[],
	);

/** 원본의 useRoute 자리 — 현재 경로 이름으로 저장해 둔 파라미터를 꺼낸다 */
export const useRoute = <T = { key: string; name: string; params: any }>(): T => {
	const pathname = usePathname();
	return useMemo(() => {
		const name = routeName(pathname);
		return { key: name, name, params: store.get(name) ?? {} } as T;
	}, [pathname]);
};
