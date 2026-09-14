/**
 * 앱 통합 디자인 토큰 (타이포그래피 / 스페이싱 / 라운드 / 그림자)
 * -------------------------------------------------
 * 모든 화면·모달의 폰트 크기와 간격은 이 토큰을 기준점으로 사용합니다.
 * - 폰트/간격은 DementionUtils 의 반응형 스케일을 통과시켜 기기 크기에 비례합니다.
 * - 하드코딩된 숫자 대신 의미 단위(토큰)를 사용해 화면 간 통일성을 확보합니다.
 * - 색상은 src/const/ConstColors.ts(Colors) 를 함께 사용합니다.
 */
import type { ViewStyle } from 'react-native';
import { CONTENT_MAX_WIDTH, isTablet, MODAL_MAX_WIDTH, scaledSize, scaleHeight, scaleWidth } from '@/src/utils/DementionUtils';
import { HANJA_FONT_NAME } from '@/src/utils/FontUtils';

/**
 * 한자 전용 서체 (명조 계열)
 * -------------------------------------------------
 * 획이 많은 글자는 산세리프에서 뭉쳐 보인다. OS 기본 명조는 자형이 기기·플랫폼마다 달라
 * 같은 글자가 다르게 보이므로, 한국 자형(K)으로 만든 Source Han Serif 서브셋을 번들에 담아 쓴다.
 * - 앱이 다루는 한자 6,301자 + 훈음 한글을 모두 담고 있다 (누락 글자 없음)
 * - 실제 로드는 app/_layout.tsx 의 loadHanjaFont() 가 스플래시 동안 처리한다
 *
 * 사용자가 설정에서 글씨체를 바꿀 수 있으므로(useHanjaFont), 화면 스타일은 이 상수 대신
 * `createStyles(Colors, HanjaFont)` 의 두 번째 인자를 펼쳐 쓴다. 여기 값은 기본값(번들 서체)일 뿐이다.
 */
export const HanjaFontFamily = HANJA_FONT_NAME;

/** 한자 글자에 그대로 얹는 스타일 — `style={[styles.char, HanjaTextStyle]}` */
export const HanjaTextStyle = { fontFamily: HanjaFontFamily } as const;

/**
 * 타이포그래피 스케일 (반응형)
 * 시맨틱한 역할명으로 폰트 크기를 통일합니다.
 */
export const Typography = {
	/** 11pt — 캡션, 보조 라벨 */
	caption: scaledSize(11),
	/** 12pt — 각주, 탭 라벨 */
	footnote: scaledSize(12),
	/** 13pt — 작은 본문 */
	bodySm: scaledSize(13),
	/** 14pt — 기본 본문 */
	body: scaledSize(14),
	/** 15pt — 강조 본문 */
	callout: scaledSize(15),
	/** 16pt — 소제목 */
	subtitle: scaledSize(16),
	/** 18pt — 카드 제목, 헤더 */
	title: scaledSize(18),
	/** 20pt — 섹션 제목 */
	h3: scaledSize(20),
	/** 24pt — 화면 제목 */
	h2: scaledSize(24),
	/** 28pt — 큰 제목 */
	h1: scaledSize(28),
	/** 34pt — 디스플레이(점수/타이머 등) */
	display: scaledSize(34),
	/** 48pt — 화면에서 가장 큰 숫자(최고 기록·합격 확률·출석 도장) */
	hero: scaledSize(48),
} as const;

/**
 * 한자 글자 전용 크기 스케일
 * -------------------------------------------------
 * 한자는 본문 텍스트가 아니라 "보여주는 대상"이라 타이포 스케일과 별도로 관리한다.
 * 화면마다 72/76/84/118 처럼 제각각이던 값을 역할 4단계로 묶는다.
 */
export const HanjaGlyph = {
	/** 리스트·칩 안의 작은 한자 */
	sm: scaledSize(28),
	/** 카드 안 중간 한자 (해설 모달 등) */
	md: scaledSize(44),
	/** 상세·문제 등 주인공 한자 */
	lg: scaledSize(80),
	/** 학습 카드 앞면 — 화면에서 가장 큰 한자 */
	xl: scaledSize(116),
} as const;

/**
 * 폰트 두께 표준
 */
export const FontWeight = {
	regular: '400',
	medium: '500',
	semibold: '600',
	bold: '700',
	heavy: '800',
} as const;

/**
 * 스페이싱 스케일 (가로 기준 반응형) — padding/margin/gap 통일
 */
export const Spacing = {
	/** 2 */
	xxs: scaleWidth(2),
	/** 4 */
	xs: scaleWidth(4),
	/** 8 */
	sm: scaleWidth(8),
	/** 12 */
	md: scaleWidth(12),
	/** 16 — 화면 기본 좌우 여백 */
	lg: scaleWidth(16),
	/** 20 */
	xl: scaleWidth(20),
	/** 24 */
	xxl: scaleWidth(24),
	/** 32 */
	xxxl: scaleWidth(32),
} as const;

/**
 * 세로 스페이싱 (세로 기준 반응형) — 섹션 간 상하 간격
 */
export const SpacingV = {
	xs: scaleHeight(4),
	sm: scaleHeight(8),
	md: scaleHeight(12),
	lg: scaleHeight(16),
	xl: scaleHeight(20),
	xxl: scaleHeight(24),
	xxxl: scaleHeight(32),
} as const;

/**
 * 라운드(보더 반경) 표준
 */
export const Radius = {
	sm: scaleWidth(6),
	md: scaleWidth(10),
	lg: scaleWidth(14),
	xl: scaleWidth(20),
	pill: scaleWidth(999),
} as const;

/**
 * 태블릿 레이아웃
 * -------------------------------------------------
 * 아이패드는 폭이 폰의 두 배가 넘는다. 카드를 그 폭 그대로 늘리면 제목 하나에 한 줄이 다 날아가고
 * 좌우 끝이 너무 멀어 눈이 왕복해야 한다. 본문은 가운데 한 칼럼으로 묶고, 남는 폭은 여백으로 흘린다.
 *
 * 폰에서는 maxWidth 가 화면보다 넓어 아무 영향이 없다 — 화면마다 분기를 두지 않아도 된다.
 * 쓰는 곳: ScrollView/FlatList 의 contentContainerStyle, 상단 헤더, 하단 고정 버튼 바.
 * (세 곳이 같은 폭을 써야 헤더 제목과 본문 카드의 왼쪽 선이 맞는다)
 */
export const Layout = {
	/** 화면 본문 한 칼럼 */
	column: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' } as ViewStyle,
	/** 모달 카드 — 본문보다 좁게 (대화상자) */
	modalCard: { width: '100%', maxWidth: MODAL_MAX_WIDTH, alignSelf: 'center' } as ViewStyle,
	/**
	 * 바텀시트·전체화면 패널 — 대화상자보다 넉넉하게.
	 * 태블릿은 폭이 묶여 좌우에 틈이 생긴다. 위만 둥근 채로 두면 바닥에 붙지도 않은 각진 상자가 되므로
	 * 네 모서리를 모두 둥글려 떠 있는 카드로 보이게 한다 (시트 쪽 borderTop* 은 같은 값이라 덮어써도 무해).
	 */
	modalSheet: {
		width: '100%',
		maxWidth: CONTENT_MAX_WIDTH,
		alignSelf: 'center',
		...(isTablet ? { borderRadius: Radius.xl } : null),
	} as ViewStyle,
	/** 목록 열 수 — 태블릿은 두 칸씩 놓아 한 화면에 두 배로 보여 준다 */
	columns: isTablet ? 2 : 1,
	/** 태블릿인지 — 열 수·아이콘 크기처럼 값 자체가 달라져야 하는 곳에서만 쓴다 */
	isTablet,
} as const;

/**
 * 공통 그림자 프리셋 (iOS/Android 동시 대응)
 * -------------------------------------------------
 * elevation 은 쓰지 않는다 — 안드로이드에서 z-order 를 바꿔 겹친 요소가 뒤로 밀리고,
 * 배경이 투명한 뷰에 회색 사각형이 남는다. 그림자는 shadow* 속성만 쓴다.
 *
 * 라이트 값(#0F172A 6%)을 다크에서 그대로 쓰면 **화면 배경색과 그림자 색이 같아** 그림자가 사라진다.
 * 다크에서 카드(surface #1B263B)와 배경(#0F172A)의 밝기 차는 1.3:1 뿐이라, 그림자가 없으면
 * 카드 경계가 통째로 안 보인다. 그래서 테마마다 값을 갈아 끼운다.
 *
 * 화면들이 `...Shadow.card` 로 StyleSheet 를 구울 때 값을 복사해 가므로
 * **객체를 교체하지 않고 그대로 덮어쓴다** (연결은 `src/hooks/useTheme.tsx`).
 */
interface ShadowPreset {
	shadowColor: string;
	shadowOffset: { width: number; height: number };
	shadowOpacity: number;
	shadowRadius: number;
}

const LIGHT_SHADOW: Record<'card' | 'floating', ShadowPreset> = {
	card: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
	floating: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 14 },
};

const DARK_SHADOW: Record<'card' | 'floating', ShadowPreset> = {
	card: { shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.45, shadowRadius: 10 },
	floating: { shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.6, shadowRadius: 18 },
};

export const Shadow: Record<'card' | 'floating', ShadowPreset> = {
	card: { ...LIGHT_SHADOW.card, shadowOffset: { ...LIGHT_SHADOW.card.shadowOffset } },
	floating: { ...LIGHT_SHADOW.floating, shadowOffset: { ...LIGHT_SHADOW.floating.shadowOffset } },
};

/** 그림자 프리셋을 해당 테마 값으로 덮어쓴다 */
export const applyShadowTheme = (scheme: 'light' | 'dark'): void => {
	const next = scheme === 'dark' ? DARK_SHADOW : LIGHT_SHADOW;
	(['card', 'floating'] as const).forEach((key) => {
		Object.assign(Shadow[key], next[key], { shadowOffset: { ...next[key].shadowOffset } });
	});
};

export default { Typography, HanjaGlyph, FontWeight, Spacing, SpacingV, Layout, Radius, Shadow };
