/**
 * 테마·언어별 값 캐시 (StyleSheet / 색·글자를 품은 모듈 상수 공용)
 * -------------------------------------------------
 * 화면 모듈은 로드 시점에 Colors 의 '값'과 번역된 글자를 복사해 간다(StyleSheet.create, 상수 배열 등).
 * 그래서 실행 중 테마·언어를 바꾸면 이미 만들어진 객체는 이전 값을 그대로 들고 있었고,
 * 예전에는 번들을 통째로 다시 올려(reload) 해결했다.
 *
 * themed() 는 팩토리를 '테마·언어마다 한 번씩' 실행해 캐시하고, 프로퍼티를 읽는 순간
 * (= 렌더 시점) 지금 테마·언어의 결과를 돌려준다. 호출부는 그대로 `styles.xxx` 를 쓰면 된다.
 * 테마·언어가 바뀌면 화면들이 다시 렌더되며(리마운트 없음) 모든 읽기가 새 값으로 갈린다.
 * 언어는 서체(한국어만 앱 서체)도 가르므로 스타일도 언어마다 따로 만든다.
 *
 * localized() 는 색 없이 글자만 품은 값(세계 데이터·등급 이름 등)용 — 테마가 바뀌어도 다시 만들지 않는다.
 */
import { getThemeMode } from '@/src/const/ConstColors';
import i18n from '@/src/translations';

const cachedBy = <T extends object>(keyOf: () => string, factory: () => T): T => {
	// 모듈 로드 시점에 한 번 실행한다 — 기존(즉시 생성)과 오류 시점·비용을 맞춘다
	const first = factory();
	const cache = new Map<string, T>([[keyOf(), first]]);

	const resolve = (): T => {
		const key = keyOf();
		let value = cache.get(key);
		if (!value) {
			value = factory();
			cache.set(key, value);
		}
		return value;
	};

	// 배열이면 배열을 타깃으로 둔다 (Array.isArray / 스프레드가 그대로 동작하도록)
	const target = (Array.isArray(first) ? [] : {}) as T;

	return new Proxy(target, {
		get: (_t, key) => Reflect.get(resolve(), key),
		has: (_t, key) => key in resolve(),
		ownKeys: () => Reflect.ownKeys(resolve()),
		// 타깃은 비어 있으므로 configurable 을 붙여야 Proxy 불변식에 걸리지 않는다
		getOwnPropertyDescriptor: (_t, key) => {
			const desc = Object.getOwnPropertyDescriptor(resolve(), key);
			return desc && { ...desc, configurable: true };
		},
	});
};

export const themed = <T extends object>(factory: () => T): T => cachedBy(() => `${getThemeMode()}:${i18n.language}`, factory);

export const localized = <T extends object>(factory: () => T): T => cachedBy(() => i18n.language, factory);

export default themed;
