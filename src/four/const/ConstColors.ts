/**
 * 이식 화면 전용 팔레트
 * -------------------------------------------------
 * 옮겨 온 화면들은 `StyleSheet.create` 안에서 이 객체의 값을 **모듈 로드 시점에** 읽어 간다.
 * 그래서 훅(useColors)으로는 색을 넘길 수 없고, 값을 덮어쓸 수 있는 객체가 하나 필요하다.
 * 테마가 바뀌면 `applyTheme()` 로 이 객체를 덮어쓰고 ThemeRegistry 로 스타일을 다시 만든다
 * (연결은 `src/hooks/useTheme.tsx`).
 *
 * 토큰 이름은 원본(사자성어 앱)을 그대로 두고 **값만 이 앱의 브랜드(블루+민트+앰버)로** 바꿨다.
 * 이름을 바꾸면 9천 줄짜리 화면들을 전부 손봐야 하고, 값만 바꾸면 톤이 앱과 하나로 맞는다.
 */
const LIGHT_COLORS = {
	/** 브랜드 (Primary - Brand Blue) — 메인 액션/활성/정답 강조 */
	primary: '#1249C9',
	primaryDark: '#0F3DA8',
	primaryDeep: '#0B2E80',
	primaryLight: '#7FA3F0',
	primarySoft: '#DCE6FB',
	primaryBg: '#EEF3FE',

	/** 보조 (Secondary - Mint) — 서브 강조/링크/정보 */
	secondary: '#14B8A6',
	secondaryDark: '#0D9488',
	/**
	 * 채워진 버튼·배지의 면 — 위에 흰 글씨(textInverse)를 얹는 자리 전용.
	 * `secondaryDark` 는 다크에서 "옅은 틴트 위에 얹는 글씨"로 밝게 뒤집히므로 면으로 쓰면 흰 글씨가 사라진다.
	 */
	secondarySurface: '#0D9488',
	secondaryLight: '#5EEAD4',
	secondarySoft: '#CCFBF1',
	secondaryBg: '#F0FDFA',

	/** 포인트 (Accent - Amber) */
	accentAmber: '#F59E0B',
	accentAmberSoft: '#FEF3C7',
	accentOrange: '#F97316',

	/** 확장 팔레트 */
	secondaryPale: '#99F6E4',
	warningBright: '#FBBF24',
	warningLight: '#FCD34D',
	warningPale: '#FDE68A',
	warningDark: '#D97706',
	warningDeep: '#B45309',
	warningBg: '#FFFBEB',
	errorLight: '#F87171',
	errorPale: '#FCA5A5',
	errorBorder: '#FECACA',
	errorDeep: '#B91C1C',
	errorBg: '#FEF2F2',
	accentOrangeLight: '#FB923C',
	accentOrangeBg: '#FFF7ED',
	info: '#0EA5E9',
	teal: '#14B8A6',
	surfaceMuted: '#EEF2F7',

	/** 텍스트 (Slate) */
	text: '#334155',
	textDeep: '#475569',
	textStrong: '#1E293B',
	textSecondary: '#64748B',
	textMuted: '#7C8DA6',
	textInverse: '#FFFFFF',

	/** 배경/보더 */
	shadow: '#000',
	background: '#F8FAFC',
	surface: '#FFFFFF',
	surfaceAlt: '#F1F5F9',
	border: '#E2E8F0',
	borderStrong: '#CBD5E1',

	/** 시맨틱 — 정답/완료는 브랜드 블루와 구분되도록 초록을 그대로 쓴다 */
	success: '#22C55E',
	successSoft: '#DCFCE7',
	/** 정답 카드용 — soft(칩) 보다 옅은 면, 그 위에 얹는 테두리와 글씨 */
	successBg: '#F0FDF4',
	successBorder: '#86EFAC',
	successDark: '#16A34A',
	successDeep: '#15803D',
	error: '#EF4444',
	errorDark: '#DC2626',
	errorSoft: '#FEE2E2',
	warning: '#F59E0B',
	warningSoft: '#FEF3C7',

	/** 확장 팔레트 2 */
	surfaceMutedAlt: '#EEF2F6',
	darkPanel: '#2B2D3A',
	darkPanelDeep: '#21222C',
	darkPanelDeepest: '#191A21',
	primaryTint: '#BFD2FA',
	primaryTintBg: '#F3F7FF',
	primaryInk: '#082463',
	tealSoft: '#CCFBF1',
	tealDark: '#0F766E',
	tealDeep: '#115E59',
	infoDark: '#06B6D4',
	secondaryStrong: '#0D9488',
	secondaryInk: '#0F766E',
	accentOrangeSoft: '#FFEDD5',
	accentOrangePale: '#FED7AA',
	accentOrangeMid: '#FDBA74',
	accentOrangeDark: '#EA580C',
	accentOrangeDeep: '#C2410C',
	accentOrangeInk: '#9A3412',
	accentOrangeDeepest: '#7C2D12',
	warningInk: '#92400E',
	warningTint: '#FEF9EC',
	warningTintBg: '#FFFDF7',
	errorInk: '#7F1D1D',
	pink: '#EC4899',
	pinkLight: '#F472B6',

	/** 다크 모드 원본 토큰 (라이트에서도 이름으로 참조된다) */
	darkBackground: '#0F172A',
	darkSurface: '#1E293B',
	darkBorder: '#334155',
	darkText: '#F1F5F9',
	darkTextSecondary: '#94A3B8',

	/** 다크 패널 위에 얹는 레이어 */
	darkCard: 'rgba(255,255,255,0.08)',
	darkCardStrong: 'rgba(255,255,255,0.14)',
	darkCardBorder: 'rgba(255,255,255,0.15)',
	darkDivider: 'rgba(255,255,255,0.10)',
	darkOnPanel: 'rgba(255,255,255,0.92)',
	darkOnPanelSub: 'rgba(255,255,255,0.70)',
	darkOnPanelMuted: 'rgba(255,255,255,0.45)',

	/** 반전 표면 — 토스트·툴팁처럼 "배경보다 어두운 칩" */
	inverseSurface: '#1E293B',

	/** 모달·오버레이 딤 */
	scrim: 'rgba(15,23,42,0.55)',
	scrimStrong: 'rgba(15,23,42,0.92)',
} as const;

export type ColorToken = keyof typeof LIGHT_COLORS;
export type Palette = Record<ColorToken, string>;

/**
 * 다크 모드 오버라이드
 * 브랜드 원색은 그대로 두고 **표면 · 텍스트 · 보더 · 옅은 틴트**만 어두운 값으로 바꾼다.
 * `textInverse` 는 컬러 버튼 위 흰 글씨라 다크에서도 흰색을 유지한다.
 */
const DARK_OVERRIDES: Partial<Palette> = {
	// 표면
	background: '#0F172A',
	surface: '#1B263B',
	surfaceAlt: '#27354D',
	surfaceMuted: '#243149',
	surfaceMutedAlt: '#243149',
	border: '#334155',
	borderStrong: '#475569',

	// 텍스트
	text: '#E2E8F0',
	textStrong: '#F8FAFC',
	textDeep: '#CBD5E1',
	textSecondary: '#A3B1C2',
	textMuted: '#7C8CA0',

	// 브랜드 — 다크 배경에서 채도 높은 파랑은 가라앉으므로 한 톤 밝게
	primary: '#3B6FE0',
	primaryLight: '#5B8DEF',
	secondary: '#2DD4BF',
	secondaryLight: '#14B8A6',
	accentAmber: '#FBBF24',
	accentOrange: '#FB923C',
	success: '#4ADE80',
	error: '#F87171',
	warning: '#FBBF24',

	// 옅은 틴트 배경 → 어두운 틴트
	primarySoft: '#1B2E5C',
	primaryBg: '#16223F',
	primaryTint: '#22407C',
	primaryTintBg: '#16223F',
	secondarySoft: '#134E4A',
	secondaryBg: '#112E2B',
	secondaryPale: '#155E56',
	warningSoft: '#3B2F12',
	warningPale: '#5B4113',
	warningBg: '#2E2410',
	warningTint: '#2E2410',
	warningTintBg: '#241C0C',
	errorSoft: '#4A1D1D',
	errorBorder: '#5C2626',
	errorBg: '#2E1616',
	accentOrangeSoft: '#4A2A12',
	accentOrangePale: '#5C3416',
	accentOrangeBg: '#2E1B0C',
	successSoft: '#14532D',
	successBg: '#102A1B',
	successBorder: '#1E5C36',
	tealSoft: '#0E3B37',

	// 틴트 위에 얹는 글씨 — 어두운 배경에서 읽히도록 밝은 쪽으로
	primaryDeep: '#A9C2F7',
	primaryDark: '#5B8DEF',
	primaryInk: '#DCE6FB',
	secondaryDark: '#5EEAD4',
	// 면은 밝게 뒤집지 않는다 — 위에 얹는 흰 글씨가 읽혀야 한다 (대비 5.5:1)
	secondarySurface: '#0F766E',
	secondaryInk: '#5EEAD4',
	secondaryStrong: '#2DD4BF',
	errorDark: '#FCA5A5',
	successDark: '#4ADE80',
	successDeep: '#86EFAC',
	warningDeep: '#FCD34D',
	warningDark: '#FBBF24',
	warningInk: '#FDE68A',
	errorDeep: '#FCA5A5',
	errorInk: '#FECACA',
	accentOrangeInk: '#FDBA74',
	accentOrangeDeep: '#FB923C',
	accentOrangeDeepest: '#FDBA74',
	tealDeep: '#5EEAD4',
	tealDark: '#2DD4BF',

	// 반전 표면 — 다크에서는 배경(#0F172A)보다 밝아야 칩이 구분된다
	inverseSurface: '#3C4C66',

	// 딤 — 다크에서는 더 진하게
	scrim: 'rgba(2,6,23,0.70)',
	scrimStrong: 'rgba(2,6,23,0.95)',
};

/**
 * 면 밝기에 맞는 글씨색 — 층 배지·모드 칩처럼 면 색이 데이터에서 오는 자리에 쓴다.
 * 구현은 앱 팔레트 한 곳에 두고 여기서 다시 내보낸다.
 */
// 노드에서 돌리는 색 테스트가 이 파일을 그대로 읽을 수 있게 상대 경로로 둔다 (@ 별칭은 번들러만 안다)
export { onSurface } from '../../const/ConstColors.ts';

/** 사용자가 고를 수 있는 테마 모드 */
export type ThemeMode = 'light' | 'dark';

/**
 * 이식 화면 전역 팔레트.
 * 화면들이 모듈 로드 시점에 값을 읽어 가므로 **객체를 교체하지 않고 그대로 덮어쓴다**.
 */
export const Colors: Palette = { ...LIGHT_COLORS };

let activeScheme: 'light' | 'dark' = 'light';

/** 지금 화면에 적용돼 있는 테마 */
export const getActiveScheme = (): 'light' | 'dark' => activeScheme;

/** 다크 여부 */
export const isDarkTheme = (): boolean => activeScheme === 'dark';

/** 팔레트를 해당 테마 값으로 채운다 */
export const applyTheme = (scheme: 'light' | 'dark'): void => {
	activeScheme = scheme;
	Object.assign(Colors, LIGHT_COLORS);
	if (scheme === 'dark') {
		Object.assign(Colors, DARK_OVERRIDES);
	}
};

/**
 * 팔레트 토큰에 투명도를 입힌다.
 *
 * hex(#RGB·#RRGGBB) 가 아닌 값이 들어오면 parseInt 가 NaN 을 내고
 * 'rgba(NaN, NaN, NaN, 0.2)' 라는 못 쓰는 색이 만들어진다 — 안드로이드는 그 값에서 죽는다.
 * 데이터에서 온 색(분야·난이도 배지)에도 쓰이므로 못 읽는 값이면 원래 색을 그대로 돌려준다.
 *
 * @example withAlpha(Colors.warning, 0.2) // 'rgba(245, 158, 11, 0.2)'
 */
export const withAlpha = (hexColor: string, alpha: number): string => {
	if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hexColor)) {
		return hexColor;
	}
	const hex = hexColor.replace('#', '');
	const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
	const int = parseInt(full, 16);
	// eslint-disable-next-line no-bitwise
	return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
};

export default Colors;
