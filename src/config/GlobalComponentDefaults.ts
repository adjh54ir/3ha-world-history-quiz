import { createElement, useContext, type ComponentType } from 'react';
import { Platform, unstable_TextAncestorContext as TextAncestorContext, type TextProps, type TextStyle } from 'react-native';

import Colors from '@/src/const/ConstColors';
import { Typography } from '@/src/const/ConstDesign';

/**
 * OS 큰 글씨 설정에서 글자가 커지는 배율 상한.
 * 화면 대부분이 numberOfLines 로 줄 수를 고정하고 있어 배율이 무제한이면 문장이 잘린다.
 * 접근성은 살리되(1.3배까지 커짐) 레이아웃이 깨지지 않는 선에서 자른다.
 */
const MAX_FONT_SCALE = 1.3;

/**
 * 안드로이드는 글꼴 위아래에 여분(font padding)을 붙여 글자가 아래로 처진다.
 * 아이콘과 나란히 놓인 글자가 정중앙에 오지 않는 원인이라 전역으로 끈다.
 */
const ANDROID_TEXT_FIX: TextStyle = Platform.OS === 'android' ? { includeFontPadding: false, textAlignVertical: 'center' } : {};

// react-native 의 index 는 `get Text() {...}` 게터로 내보낸다 → 원본을 잡아 둔 뒤 게터를 앱 Text 로 바꿔 끼운다
// (깊은 경로 import 는 RN 0.80+ 에서 경고 대상이라 쓰지 않는다)
const ReactNativeExports = require('react-native') as { Text: ComponentType<TextProps> };
const OriginalText = ReactNativeExports.Text;

/**
 * 앱 전역 Text — React 19 의 JSX 런타임은 함수 컴포넌트의 defaultProps 를 읽지 않아
 * Text.defaultProps 로는 기본값이 걸리지 않는다. 그래서 react-native 가 돌려주는 Text 자체를 감싼다.
 * - 색을 지정하지 않은 글자도 다크 모드에서 배경에 묻히지 않도록 테마 기본 글자색을 깐다.
 * - 중첩 Text 는 부모 색을 물려받아야 하므로 기본 스타일을 깔지 않는다.
 * - 색은 렌더 시점에 읽어 테마를 바꾸면 리마운트 없이 따라간다.
 */
/**
 * adjustsFontSizeToFit 하한 — 안드로이드는 줄 수가 없거나 하한이 낮으면 글자를 읽을 수 없을 만큼 줄인다.
 * 화면이 더 낮게 줘도 안드로이드에서는 이 값 밑으로 내려가지 않는다.
 */
const MIN_FIT_SCALE = 0.8;

const fitProps = (props: TextProps): Partial<TextProps> => {
	if (!props.adjustsFontSizeToFit) return {};
	const requested = props.minimumFontScale ?? MIN_FIT_SCALE;
	return {
		// 줄 수가 없으면 안드로이드가 한 글자짜리 크기까지 줄인다 → 한 줄로 묶는다
		numberOfLines: props.numberOfLines ?? 1,
		minimumFontScale: Platform.OS === 'android' ? Math.max(requested, MIN_FIT_SCALE) : requested,
	};
};

const AppText = (props: TextProps) => {
	const nested = useContext(TextAncestorContext);
	return createElement(OriginalText, {
		maxFontSizeMultiplier: MAX_FONT_SCALE,
		...props,
		...fitProps(props),
		// fontSize 를 안 준 글자는 안드로이드에서 시스템 기본(아주 작게 보이는 경우가 있음) 대신 본문 크기로 그린다
		style: nested ? props.style : [{ color: Colors.text, fontSize: Typography.body }, ANDROID_TEXT_FIX, props.style],
	});
};
AppText.displayName = 'Text';

/** 앱 시작 시 1회 — `import { Text } from 'react-native'` 는 쓰는 순간마다 게터를 다시 읽는다 */
export const installGlobalComponentDefaults = () => {
	if (ReactNativeExports.Text === AppText) return;
	try {
		Object.defineProperty(ReactNativeExports, 'Text', { configurable: true, enumerable: true, get: () => AppText });
	} catch (e) {
		// 교체가 막힌 런타임이면 RN 기본 Text 를 그대로 쓴다 (화면별 style 로 색이 이미 지정돼 있다)
		if (__DEV__) console.warn('Text 전역 기본값 적용 실패', e);
	}
};

installGlobalComponentDefaults();
