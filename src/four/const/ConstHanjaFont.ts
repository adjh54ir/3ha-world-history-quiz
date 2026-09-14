/**
 * 한자 글씨체
 * -------------------------------------------------
 * 기본은 기기의 시스템 고딕이다 — 어느 화면에 섞여도 본문과 톤이 맞고 작은 크기에서 가장 또렷하다.
 * 획이 많은 한자를 크게 볼 때는 명조 계열이 획을 구분하기 좋아, 눈에 맞는 자형을 설정에서 고를 수 있게 한다.
 *
 * 화면들은 `StyleSheet.create` 안에서 값을 **모듈 로드 시점에** 읽어 가므로,
 * 테마와 같은 방식으로 다룬다 — 값을 바꾼 뒤 ThemeRegistry 로 스타일을 다시 만든다(HanjaFontUtils).
 * 스타일에서는 `...getHanjaTextStyle()` 로 펼쳐 쓴다.
 *
 * 다른 모듈을 import 하지 않는다 — 모든 화면이 import 하는 자리라 순환 참조를 피한다.
 */
import { Platform, TextStyle } from 'react-native';

/** 번들 서체의 패밀리 이름 — src/assets/fonts/HanpickHanjaSerif.otf (Source Han Serif K 서브셋) */
export const HANJA_FONT_NAME = 'HanpickHanjaSerif';

/** 스타일에 그대로 얹는 값 — 굵기 변형을 주는 항목이 있어 객체로 다룬다 */
export type HanjaFontStyle = {
	fontFamily: string;
	fontWeight?: TextStyle['fontWeight'];
	includeFontPadding?: boolean;
};

export interface HanjaFontOption {
	/** 저장되는 값 */
	key: string;
	label: string;
	/** 목록에서 한 줄로 보여 주는 설명 */
	hint: string;
	style: HanjaFontStyle;
}

/** 기본값 — 시스템 고딕 */
export const DEFAULT_HANJA_FONT_KEY = Platform.select({ ios: 'appleGothic', default: 'systemSans' })!;

const BUNDLED: HanjaFontOption = {
	key: 'bundled',
	label: '전용 명조',
	hint: '앱에 담은 전용 서체 · 모든 기기에서 같은 자형',
	style: { fontFamily: HANJA_FONT_NAME },
};

/**
 * 고를 수 있는 글씨체 목록.
 * iOS 는 중국·한국 계열 서체를 여러 벌 갖고 있어 서체 자체를 바꾸고,
 * Android 는 CJK 서체가 Noto Sans/Serif 두 벌뿐이라 굵기 변형을 함께 쓴다.
 */
export const HANJA_FONT_OPTIONS: HanjaFontOption[] = Platform.select<HanjaFontOption[]>({
	ios: [
		BUNDLED,
		{ key: 'appleMyungjo', label: '시스템 명조', hint: 'AppleMyungjo · 획 끝이 살아 있는 정통 명조', style: { fontFamily: 'AppleMyungjo' } },
		{
			key: 'appleGothic',
			label: '시스템 고딕',
			hint: 'Apple SD Gothic Neo · 획이 고른 산세리프',
			style: { fontFamily: 'AppleSDGothicNeo-Regular' },
		},
		{ key: 'songti', label: '송체', hint: 'Songti SC · 가로획이 얇은 인쇄체', style: { fontFamily: 'Songti SC' } },
		{ key: 'kaiti', label: '해서체', hint: 'Kaiti SC · 붓으로 쓴 듯한 자형', style: { fontFamily: 'Kaiti SC' } },
	],
	default: [
		BUNDLED,
		{ key: 'systemSerif', label: '시스템 명조', hint: 'Noto Serif CJK · 기기에 담긴 명조', style: { fontFamily: 'serif' } },
		{
			key: 'systemSerifBold',
			label: '시스템 명조 굵게',
			hint: '시스템 명조를 굵게 · 획이 또렷하게 보입니다',
			style: { fontFamily: 'serif', fontWeight: '700' },
		},
		{ key: 'systemSans', label: '시스템 고딕', hint: 'Noto Sans CJK · 획이 고른 산세리프', style: { fontFamily: 'sans-serif' } },
		{
			key: 'systemSansBold',
			label: '시스템 고딕 굵게',
			hint: '시스템 고딕을 굵게 · 작은 글자도 잘 보입니다',
			style: { fontFamily: 'sans-serif', fontWeight: '700' },
		},
	],
})!;

/** 저장된 값이 이 플랫폼에 없는 키면(기기를 바꿨거나 목록이 바뀐 경우) 기본값으로 되돌린다 */
export const toHanjaFontOption = (key: string | null | undefined): HanjaFontOption =>
	HANJA_FONT_OPTIONS.find((item) => item.key === key) ??
	HANJA_FONT_OPTIONS.find((item) => item.key === DEFAULT_HANJA_FONT_KEY) ??
	HANJA_FONT_OPTIONS[0];

let currentOption: HanjaFontOption = toHanjaFontOption(DEFAULT_HANJA_FONT_KEY);

/**
 * 지금 고른 글씨체 — 스타일에서 `...getHanjaTextStyle()` 로 펼쳐 쓴다.
 *
 * 안드로이드 기본값은 index.js 에서 includeFontPadding=false 로 눌러 두었다(아이콘과 높이 맞추기).
 * 한자는 글리프가 em 상자를 꽉 채우고 화면에서 아주 크게(최대 72pt) 쓰이는 자리가 있어
 * 그 여백을 없애면 서체에 따라 위아래가 잘린다 — 한자 텍스트만 다시 켠다.
 */
export const getHanjaTextStyle = (): HanjaFontStyle =>
	Platform.OS === 'android' ? { ...currentOption.style, includeFontPadding: true } : currentOption.style;

/** 지금 고른 항목 (설정 화면 표시용) */
export const getHanjaFontOption = (): HanjaFontOption => currentOption;

/** 값만 바꾼다. 화면 갱신은 HanjaFontUtils 가 처리한다 */
export const setHanjaFontOption = (key: string | null | undefined): void => {
	currentOption = toHanjaFontOption(key);
};
