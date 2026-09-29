import { Text, TextInput } from 'react-native';

import { Typography } from '@/src/const/ConstDesign';
import Colors from '@/src/const/ConstColors';

type ComponentWithDefaultProps = {
	defaultProps?: Record<string, unknown>;
};

/**
 * OS 큰 글씨 설정에서 글자가 커지는 배율 상한.
 * 화면 대부분이 numberOfLines 로 줄 수를 고정하고 있어 배율이 무제한이면 문장이 잘린다.
 * 접근성은 살리되(1.3배까지 커짐) 레이아웃이 깨지지 않는 선에서 자른다.
 */
const MAX_FONT_SCALE = 1.3;

/**
 * React Native의 플랫폼 기본값에 기대지 않고 앱의 기본 글자 크기를 고정합니다.
 * 명시적인 style이 있는 Text/TextInput은 기존 화면별 크기를 그대로 사용합니다.
 * 색이 걸린 기본값은 테마를 바꿀 때 다시 덮어써야 하므로, 테마 적용 시 한 번 더 호출된다.
 */
export const installGlobalComponentDefaults = () => {
	const text = Text as typeof Text & ComponentWithDefaultProps;
	text.defaultProps = {
		...text.defaultProps,
		maxFontSizeMultiplier: text.defaultProps?.maxFontSizeMultiplier ?? MAX_FONT_SCALE,
		// 색을 지정하지 않으면 RN 기본값이 검정이라 다크 모드에서 글자가 배경에 묻는다
		style: { fontSize: Typography.body, color: Colors.text },
	};

	const textInput = TextInput as typeof TextInput & ComponentWithDefaultProps;
	textInput.defaultProps = {
		...textInput.defaultProps,
		maxFontSizeMultiplier: textInput.defaultProps?.maxFontSizeMultiplier ?? MAX_FONT_SCALE,
		placeholderTextColor: Colors.textMuted,
		style: { fontSize: Typography.callout, color: Colors.textStrong },
	};
};

installGlobalComponentDefaults();

