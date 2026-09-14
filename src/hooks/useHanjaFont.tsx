import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, TextStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HANJA_FONT_NAME } from '@/src/utils/FontUtils';

/**
 * 한자 글씨체 선택
 * -------------------------------------------------
 * 번들 서체(기본 명조) 하나에 OS 내장 서체를 더해 5가지를 고를 수 있게 한다.
 * - 번들 서체는 앱이 다루는 6,301자를 모두 담고 있어 어느 기기에서나 같은 자형으로 보인다.
 * - 나머지는 OS가 가진 서체라 앱 용량이 늘지 않는 대신 기기·플랫폼마다 자형이 조금씩 다르다.
 * - iOS/Android가 가진 서체가 달라 목록도 플랫폼별로 다르게 둔다 (양쪽 모두 눈에 띄게 다른 5가지).
 */

/** 스타일에 그대로 얹는 글씨체 값 — fontWeight 로 굵기 변형을 주는 항목이 있어 객체로 다룬다 */
export type HanjaFontStyle = { fontFamily: string; fontWeight?: TextStyle['fontWeight'] };

export interface HanjaFontOption {
	/** 저장되는 값 */
	key: string;
	label: string;
	hint: string;
	style: HanjaFontStyle;
}

/** 기본값 — 번들 서체 */
export const DEFAULT_HANJA_FONT_KEY = 'bundled';

const BUNDLED: HanjaFontOption = {
	key: DEFAULT_HANJA_FONT_KEY,
	label: '기본 명조',
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

/** 한자 글자 크기 — 획이 많은 글자는 기본 크기로는 잘 안 보인다는 의견이 많아 배율로 조절한다 */
export type HanjaSizeKey = 'normal' | 'large' | 'xlarge';

export interface HanjaSizeOption {
	key: HanjaSizeKey;
	label: string;
	/** HanjaGlyph 값에 곱하는 배율 */
	scale: number;
}

export const HANJA_SIZE_OPTIONS: HanjaSizeOption[] = [
	{ key: 'normal', label: '보통', scale: 1 },
	{ key: 'large', label: '크게', scale: 1.15 },
	{ key: 'xlarge', label: '아주 크게', scale: 1.3 },
];

export const DEFAULT_HANJA_SIZE_KEY: HanjaSizeKey = 'normal';

const toSizeOption = (key: string | null): HanjaSizeOption =>
	HANJA_SIZE_OPTIONS.find((item) => item.key === key) ?? HANJA_SIZE_OPTIONS[0];

const STORAGE_KEY = 'HANJA_FONT_KEY';
const SIZE_STORAGE_KEY = 'HANJA_FONT_SIZE_KEY';

/** 저장된 값이 이 플랫폼에 없는 키면(기기를 바꿨거나 목록이 바뀐 경우) 기본값으로 되돌린다 */
const toOption = (key: string | null): HanjaFontOption =>
	HANJA_FONT_OPTIONS.find((item) => item.key === key) ?? HANJA_FONT_OPTIONS[0];

/**
 * 저장된 글씨체 선택값을 읽는다.
 * 앱 시작 시(스플래시가 떠 있는 동안) 미리 읽어 두면 첫 화면에서 글자가 한 번 바뀌어 보이지 않는다.
 */
export const readHanjaFontKey = async (): Promise<string> => {
	try {
		return toOption(await AsyncStorage.getItem(STORAGE_KEY)).key;
	} catch (e) {
		console.warn('한자 서체 설정 조회 실패:', e);
		return DEFAULT_HANJA_FONT_KEY;
	}
};

interface HanjaFontContextValue {
	/** 저장된 선택값 */
	key: string;
	option: HanjaFontOption;
	/** 스타일에 얹는 값 — `{ ...hanjaFont, fontSize: ... }` */
	style: HanjaFontStyle;
	setKey: (next: string) => void;
	/** 저장된 글자 크기 선택값 */
	sizeKey: HanjaSizeKey;
	sizeOption: HanjaSizeOption;
	setSizeKey: (next: HanjaSizeKey) => void;
}

const HanjaFontContext = createContext<HanjaFontContextValue>({
	key: DEFAULT_HANJA_FONT_KEY,
	option: BUNDLED,
	style: BUNDLED.style,
	setKey: () => undefined,
	sizeKey: DEFAULT_HANJA_SIZE_KEY,
	sizeOption: HANJA_SIZE_OPTIONS[0],
	setSizeKey: () => undefined,
});

/** 앱 전역 한자 글씨체 공급자 — 선택값은 AsyncStorage 에 저장해 다음 실행에도 유지한다 */
export const HanjaFontProvider = ({ children, initialKey }: { children: React.ReactNode; initialKey?: string }) => {
	const [key, setKeyState] = useState<string>(initialKey ?? DEFAULT_HANJA_FONT_KEY);
	const [sizeKey, setSizeKeyState] = useState<HanjaSizeKey>(DEFAULT_HANJA_SIZE_KEY);

	// 시작 시 미리 읽어 넘겨받지 못한 경우에만 저장소에서 다시 읽는다
	useEffect(() => {
		if (initialKey) {
			return;
		}
		readHanjaFontKey().then(setKeyState);
	}, [initialKey]);

	// 글자 크기는 스플래시에서 미리 읽지 않는다 — 배율만 바뀌므로 첫 프레임이 살짝 달라도 눈에 띄지 않는다
	useEffect(() => {
		AsyncStorage.getItem(SIZE_STORAGE_KEY)
			.then((saved) => setSizeKeyState(toSizeOption(saved).key))
			.catch((e) => console.warn('한자 크기 설정 조회 실패:', e));
	}, []);

	const setKey = useCallback((next: string) => {
		setKeyState(next);
		AsyncStorage.setItem(STORAGE_KEY, next).catch((e) => console.warn('한자 서체 설정 저장 실패:', e));
	}, []);

	const setSizeKey = useCallback((next: HanjaSizeKey) => {
		setSizeKeyState(next);
		AsyncStorage.setItem(SIZE_STORAGE_KEY, next).catch((e) => console.warn('한자 크기 설정 저장 실패:', e));
	}, []);

	const value = useMemo<HanjaFontContextValue>(() => {
		const option = toOption(key);
		const sizeOption = toSizeOption(sizeKey);
		return { key: option.key, option, style: option.style, setKey, sizeKey: sizeOption.key, sizeOption, setSizeKey };
	}, [key, sizeKey, setKey, setSizeKey]);

	return <HanjaFontContext.Provider value={value}>{children}</HanjaFontContext.Provider>;
};

/** 설정 화면에서 글씨체를 바꿀 때 사용 */
export const useHanjaFont = () => useContext(HanjaFontContext);

export default HanjaFontProvider;
