/**
 * Text / TextInput 기본 폰트 크기 보정 (앱 진입 시 1회 실행)
 * -------------------------------------------------
 * style 에 fontSize 를 주지 않은 <Text> 는 RN 기본값(14pt, 반응형 스케일 미적용)으로 그려진다.
 * 안드로이드는 여기에 시스템 글꼴 배율까지 겹쳐 나머지 글자보다 눈에 띄게 작게 보인다.
 * 그래서 앱 전역에서 DEFAULT_FONT_SIZE(스케일 적용값)를 바닥값으로 깔아 준다.
 *
 * React 19 는 함수형 컴포넌트의 defaultProps 를 무시하므로 JSX 런타임에서 한 번만 감싼다.
 * 기본값을 style 배열 맨 앞에 두므로 fontSize 를 지정한 곳은 지금까지와 똑같이 동작한다.
 */
import { Platform, Text, TextInput } from 'react-native';
import { DEFAULT_FONT_SIZE, scaledSize } from './DementionUtils';

/**
 * style 미지정 텍스트에 깔아 주는 바닥값.
 *
 * 안드로이드는 글꼴 위아래에 눈에 보이지 않는 여백(font padding)을 얹는다. 그래서 아이콘과
 * 텍스트를 나란히 놓으면 글자만 아래로 몇 px 밀려 보인다 — 앱 전반에서 높이가 안 맞던 원인이다.
 * includeFontPadding 을 끄고 세로 정렬을 가운데로 고정해 아이콘 중심선과 글자 중심선을 맞춘다.
 * (개별 스타일에서 다시 지정하면 그 값이 이긴다 — 바닥값이라 항상 배열 맨 앞이다)
 */
export const DEFAULT_TEXT_STYLE = {
	fontSize: scaledSize(DEFAULT_FONT_SIZE),
	...Platform.select({
		android: { includeFontPadding: false, textAlignVertical: 'center' as const },
		default: {},
	}),
};

type JsxFn = (type: unknown, props: Record<string, unknown> | null, ...rest: unknown[]) => unknown;

/** jsx / jsxs / jsxDEV 중 하나를 감싼다. 이미 감쌌으면 건너뛴다 */
const wrap = (runtime: Record<string, unknown> | undefined, key: string) => {
	const original = runtime?.[key] as JsxFn | undefined;
	if (typeof original !== 'function' || (original as { __textDefaultsPatched?: boolean }).__textDefaultsPatched) {
		return;
	}
	const patched: JsxFn = (type, props, ...rest) =>
		type === Text || type === TextInput
			? original(type, { ...props, style: [DEFAULT_TEXT_STYLE, props?.style] }, ...rest)
			: original(type, props, ...rest);
	(patched as { __textDefaultsPatched?: boolean }).__textDefaultsPatched = true;
	runtime![key] = patched;
};

/**
 * 기본 폰트 크기 적용. 런타임 모듈 구조가 바뀌어도 앱이 죽지 않도록 실패는 경고만 남긴다.
 */
export const applyTextDefaults = (): void => {
	try {
		const runtime = require('react/jsx-runtime');
		wrap(runtime, 'jsx');
		wrap(runtime, 'jsxs');
	} catch (e) {
		console.warn('기본 폰트 크기 적용 실패(jsx-runtime):', e);
	}
	try {
		wrap(require('react/jsx-dev-runtime'), 'jsxDEV');
	} catch {
		// 프로덕션 번들에는 dev 런타임이 없다 — 무시
	}

	if (__DEV__) {
		// 패치가 실제로 걸렸는지 확인 — JSX 로 만든 Text 의 style 배열 맨 앞에 바닥값이 들어와야 한다
		const jsx = require('react/jsx-runtime').jsx as JsxFn | undefined;
		const el = jsx?.(Text, {}) as { props?: { style?: unknown[] } } | undefined;
		if (!Array.isArray(el?.props?.style) || el.props.style[0] !== DEFAULT_TEXT_STYLE) {
			console.warn('기본 폰트 크기 패치가 적용되지 않았습니다 — Text 기본 크기가 RN 기본값(14)으로 남습니다.');
		}
	}
};
