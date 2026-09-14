/**
 * 테마 런타임 레지스트리
 * -------------------------------------------------
 * 화면들은 `StyleSheet.create` 결과를 모듈 스코프 변수에 담아 쓴다.
 * 그 안의 색·글씨 크기는 **생성 시점의 팔레트 값이 복사된 것**이라,
 * 설정에서 테마나 큰 글씨 모드를 바꿔도 이미 만들어진 스타일은 그대로다.
 *
 * 그래서 각 화면은 스타일을 만드는 함수를 여기 등록해 두고,
 * 설정이 바뀌면 `rebuildThemedStyles()` 로 전부 다시 만든 뒤
 * `emitAppearanceChange()` 로 화면 트리를 갈아 끼운다(ApplicationNavigator).
 *
 * 스타일뿐 아니라 **모듈 최상위에서 팔레트 값을 복사해 둔 상수**(드롭다운 항목 색, 카테고리 색 표 등)도
 * 같은 이유로 낡는다. 그런 상수는 만드는 함수를 빼서 여기 함께 등록한다.
 *   `let ITEMS = makeItems(); registerThemedStyles(() => { ITEMS = makeItems(); });`
 *
 * 다른 모듈을 import 하지 않는다 — 모든 화면이 import 하는 자리라 순환 참조를 피한다.
 */

type Rebuild = () => void;

const rebuilders = new Set<Rebuild>();
const listeners = new Set<() => void>();

/** 화면이 자기 스타일 재생성 함수를 등록한다 (코드젠으로 각 StyleSheet 아래에 붙는다) */
export const registerThemedStyles = (rebuild: Rebuild): void => {
	rebuilders.add(rebuild);
};

/** 등록된 모든 스타일을 지금 팔레트로 다시 만든다 */
export const rebuildThemedStyles = (): void => {
	rebuilders.forEach((rebuild) => rebuild());
};

/** 테마·글씨 배율이 바뀌면 알림을 받는다. 해제 함수를 돌려준다. */
export const onAppearanceChange = (listener: () => void): (() => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

/** 구독자에게 변경을 알린다 (스타일 재생성 이후에 호출) */
export const emitAppearanceChange = (): void => {
	listeners.forEach((listener) => listener());
};
