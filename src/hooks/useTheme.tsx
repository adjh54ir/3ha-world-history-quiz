import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkColors, LightColors, Palette } from '@/src/const/ConstColors';
import { HanjaGlyph, applyShadowTheme } from '@/src/const/ConstDesign';
import { HanjaFontStyle, useHanjaFont } from '@/src/hooks/useHanjaFont';
import { applyTheme as applyFourTheme } from '@/src/four/const/ConstColors';
import { emitAppearanceChange, rebuildThemedStyles } from '@/src/four/const/ThemeRegistry';

export type { Palette };

/**
 * 사용자가 고르는 값 — 기기(OS) 설정은 따라가지 않는다.
 * 아무것도 고르지 않은 사용자는 항상 라이트로 시작하고, 설정 화면에서만 바꾼다.
 */
export type ThemeMode = 'light' | 'dark';

/** 실제 적용되는 결과 — 고른 값이 그대로 스킴이 된다 */
export type ThemeScheme = ThemeMode;

/** 아무것도 고르지 않았을 때의 기본값 */
export const DEFAULT_THEME_MODE: ThemeMode = 'light';

const STORAGE_KEY = 'HANJA_THEME_MODE';

interface ThemeContextValue {
	/** 저장된 선택값 (light / dark) */
	mode: ThemeMode;
	/** 실제 적용 중인 스킴 */
	scheme: ThemeScheme;
	isDark: boolean;
	colors: Palette;
	setMode: (next: ThemeMode) => void;
}

const isThemeMode = (value: unknown): value is ThemeMode => value === 'light' || value === 'dark';

/**
 * 저장된 테마 선택값을 읽는다.
 * 앱 시작 시(스플래시가 떠 있는 동안) 미리 읽어 두면 다크 사용자에게 흰 화면이 한 번 번쩍이지 않는다.
 */
export const readThemeMode = async (): Promise<ThemeMode> => {
	try {
		const saved = await AsyncStorage.getItem(STORAGE_KEY);
		// 예전 버전이 저장해 둔 'system' 도 여기로 떨어져 기본값(라이트)이 된다
		return isThemeMode(saved) ? saved : DEFAULT_THEME_MODE;
	} catch (e) {
		console.warn('테마 설정 조회 실패:', e);
		return DEFAULT_THEME_MODE;
	}
};

const ThemeContext = createContext<ThemeContextValue>({
	mode: DEFAULT_THEME_MODE,
	scheme: DEFAULT_THEME_MODE,
	isDark: false,
	colors: LightColors,
	setMode: () => undefined,
});

/**
 * 앱 전역 테마 공급자
 * - 선택값은 AsyncStorage 에 저장해 다음 실행에도 유지한다.
 * - 기기(OS)의 다크 설정은 보지 않는다. 고르기 전에는 항상 라이트다.
 */
export const ThemeProvider = ({ children, initialMode }: { children: React.ReactNode; initialMode?: ThemeMode }) => {
	const [mode, setModeState] = useState<ThemeMode>(initialMode ?? DEFAULT_THEME_MODE);

	// 시작 시 미리 읽어 넘겨받지 못한 경우에만 저장소에서 다시 읽는다
	useEffect(() => {
		if (initialMode) {
			return;
		}
		readThemeMode().then(setModeState);
	}, [initialMode]);

	const setMode = useCallback((next: ThemeMode) => {
		setModeState(next);
		AsyncStorage.setItem(STORAGE_KEY, next).catch((e) => console.warn('테마 설정 저장 실패:', e));
	}, []);

	const value = useMemo<ThemeContextValue>(
		() => ({ mode, scheme: mode, isDark: mode === 'dark', colors: mode === 'dark' ? DarkColors : LightColors, setMode }),
		[mode, setMode],
	);

	/**
	 * 이식 화면(src/four)은 훅이 아니라 모듈 전역 팔레트를 읽어 StyleSheet 를 굽는다.
	 * 테마가 바뀌면 그 팔레트를 덮어쓰고 구워 둔 스타일을 다시 만든 뒤, 화면에 알려 다시 그리게 한다.
	 * 첫 렌더 전에도 값이 맞아 있어야 하므로 effect 가 아니라 렌더 중에 맞춘다.
	 */
	const appliedScheme = useRef<ThemeScheme | null>(null);
	if (appliedScheme.current !== value.scheme) {
		const isFirst = appliedScheme.current === null;
		appliedScheme.current = value.scheme;
		applyFourTheme(value.scheme);
		// 그림자도 같은 시점에 갈아 끼운다 — 다크에서 라이트 그림자는 배경색과 같아 카드 경계가 사라진다
		applyShadowTheme(value.scheme);
		// 첫 적용은 아직 구워진 스타일이 없다 — 다시 만들 것도, 알릴 것도 없다
		if (!isFirst) {
			rebuildThemedStyles();
			emitAppearanceChange();
		}
	}

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/** 테마 전체 (설정 화면에서 모드를 바꿀 때 사용) */
export const useTheme = () => useContext(ThemeContext);

/** 화면에서 색만 필요할 때 — 기존 `Colors` 자리에 그대로 넣어 쓴다 */
export const useColors = (): Palette => useContext(ThemeContext).colors;

/** 스킴 + 한자 글씨체 + 글자 크기 조합별로 한 번씩만 만든 StyleSheet 를 재사용한다 */
const styleCache = new WeakMap<object, Map<string, unknown>>();

/** 설정에서 고른 배율이 적용된 한자 글자 크기 — 화면 스타일은 상수 대신 이 값을 쓴다 */
export type HanjaGlyphSize = Record<keyof typeof HanjaGlyph, number>;

const scaleGlyph = (scale: number): HanjaGlyphSize =>
	Object.fromEntries(Object.entries(HanjaGlyph).map(([key, value]) => [key, Math.round(value * scale)])) as HanjaGlyphSize;

/**
 * 배율이 적용된 한자 글자 크기를 화면 코드에서 바로 쓸 때 — StyleSheet 가 아니라
 * 캔버스 한 변처럼 JSX 에 숫자로 넣어야 하는 자리에 쓴다.
 */
export const useHanjaGlyph = (): HanjaGlyphSize => {
	const { sizeOption } = useHanjaFont();
	return useMemo(() => scaleGlyph(sizeOption.scale), [sizeOption]);
};

/**
 * 팔레트(와 한자 글씨체·글자 크기)를 받아 StyleSheet 를 만드는 팩토리를 조합별로 캐시해 준다.
 *
 * ```ts
 * const createStyles = (Colors: Palette) => StyleSheet.create({ ... });
 * // 한자를 그리는 화면은 글씨체와 글자 크기(설정에서 고른 배율이 적용된 값)를 함께 받는다
 * const createStyles = (Colors: Palette, HanjaFont: HanjaFontStyle, Glyph: HanjaGlyphSize) => StyleSheet.create({
 *   char: { ...HanjaFont, fontSize: Glyph.lg },
 * });
 * const styles = useThemedStyles(createStyles);
 * ```
 */
export const useThemedStyles = <T,>(factory: (colors: Palette, hanjaFont: HanjaFontStyle, glyph: HanjaGlyphSize) => T): T => {
	const { scheme, colors } = useContext(ThemeContext);
	const { key: hanjaFontKey, style: hanjaFont, sizeOption } = useHanjaFont();
	return useMemo(() => {
		const cached = styleCache.get(factory) ?? new Map<string, unknown>();
		const cacheKey = `${scheme}|${hanjaFontKey}|${sizeOption.key}`;
		if (!cached.has(cacheKey)) {
			cached.set(cacheKey, factory(colors, hanjaFont, scaleGlyph(sizeOption.scale)));
			styleCache.set(factory, cached);
		}
		return cached.get(cacheKey) as T;
	}, [factory, scheme, colors, hanjaFontKey, hanjaFont, sizeOption]);
};

export default ThemeProvider;
