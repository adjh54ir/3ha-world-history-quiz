/**
 * 앱 통합 디자인 토큰 (타이포그래피 / 스페이싱 / 라운드 / 그림자)
 * -------------------------------------------------
 * 모든 화면·모달의 폰트 크기와 간격은 이 토큰을 기준점으로 사용합니다.
 * - 폰트/간격은 DementionUtils 의 반응형 스케일을 통과시켜 기기 크기에 비례합니다.
 * - 하드코딩된 숫자 대신 의미 단위(토큰)를 사용해 화면 간 통일성을 확보합니다.
 * - 색상은 src/const/ConstColors.ts(Colors) 를 함께 사용합니다.
 */
import { isTablet, scaledSize, scaleHeight, scaleWidth, screenWidth, TABLET_SHEET_MAX_WIDTH } from '@/src/utils/DementionUtils';
import Colors, { isDark } from '@/src/const/ConstColors';
import { themed } from '@/src/utils/ThemedStyles';
import i18n from '@/src/translations';

/**
 * 타이포그래피 스케일 (반응형) — 2pt 등간격 위계
 * -------------------------------------------------
 * 인접한 1pt 차이(11/12, 13/14, 15/16)는 화면에서 구분되지 않으면서
 * 통일감만 해쳤기 때문에 같은 값으로 병합했습니다.
 * 역할명은 그대로 두어 호출부 수정 없이 위계만 수렴시킵니다.
 * 실제 단계: 10 / 12 / 14 / 16 / 18 / 20 / 24 / 28 / 34
 */
export const Typography = {
	/** 10pt — 마이크로 라벨(배지 안 글자, 아주 작은 단위 표기) */
	micro: scaledSize(10),
	/** 12pt — 캡션, 보조 라벨 (footnote 와 동일 단계) */
	caption: scaledSize(12),
	/** 12pt — 각주, 탭 라벨 */
	footnote: scaledSize(12),
	/** 14pt — 작은 본문 (body 와 동일 단계) */
	bodySm: scaledSize(14),
	/** 14pt — 기본 본문 */
	body: scaledSize(14),
	/** 16pt — 강조 본문 (subtitle 과 동일 단계) */
	callout: scaledSize(16),
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
	/** 40pt — 대형 마크(OX 표시·GO 문구) */
	mark: scaledSize(40),
	/** 44pt — 히어로 점수(전체 점수·등급 점수) */
	displayLg: scaledSize(44),
	/** 52pt — 결과 화면 최종 점수 */
	displayXl: scaledSize(52),
	/** 84pt — 퀴즈 시작 카운트다운 숫자(전용) */
	countdown: scaledSize(84),
} as const;

/**
 * 앱 서체 — 제목체 하나 + 본문 굵기 셋을 한 묶음으로 둔다.
 * - 제목체는 제목(탭 헤더·화면 헤더·섹션 제목·히어로)에만 쓴다. 굵기 하나짜리라 fontWeight 를 400 으로 되돌린다
 *   (안드로이드는 굵기를 주면 가짜 볼드로 뭉갠다).
 * - 본문은 앱 전역 Text 가 fontWeight 에 맞는 파일을 고른다 (GlobalComponentDefaults). 굵기마다 파일이 따로라
 *   fontWeight 로 굵게 하지 않고 서체 이름을 바꾼다.
 * - 서체가 아직 안 올라왔으면 시스템 서체로 그려진다 (app/_layout 에서 스플래시 전에 올린다).
 * - 그 언어 글자가 다 들어 있는 묶음만 쓴다 — 빠진 글자만 시스템 서체로 그려지면 한 낱말 안에서 서체가 섞인다.
 *   한국어 묶음(블랙한산스·나눔스퀘어라운드)에는 악센트 라틴 글자(é ñ ç)가 없어 영어·스페인어·프랑스어는 Nunito 를 쓴다.
 *   중국어·일본어는 한자·가나를 다 담은 둥근 서체가 수십 MB 라 시스템 서체 + 굵기로 그린다.
 */
export interface FontSet {
	display: string;
	regular: string;
	bold: string;
	heavy: string;
}

/** 한국어 — 블랙한산스(정글 탐험대 표지판처럼 굵게 깎은 제목체) + 나눔스퀘어라운드(NAVER). 둘 다 OFL */
export const KO_FONTS: FontSet = { display: 'BlackHanSans', regular: 'NanumSquareRoundR', bold: 'NanumSquareRoundB', heavy: 'NanumSquareRoundEB' };

/** 영어·스페인어·프랑스어 — Nunito (OFL). 나눔스퀘어라운드처럼 획 끝이 둥글다. 제목은 가장 굵은 Black */
export const LATIN_FONTS: FontSet = { display: 'Nunito-Black', regular: 'Nunito-Regular', bold: 'Nunito-Bold', heavy: 'Nunito-ExtraBold' };

const FONT_SETS: Partial<Record<string, FontSet>> = { 'ko-KR': KO_FONTS, 'en-EN': LATIN_FONTS, 'es-ES': LATIN_FONTS, 'fr-FR': LATIN_FONTS };

/** 지금 언어의 서체 묶음 (없으면 시스템 서체). 앱 전역 Text 가 글자마다 부르므로 문자열 조회만 한다 */
export const appFonts = (): FontSet | undefined => FONT_SETS[i18n.language];

export const appFontsOn = (): boolean => !!appFonts();

/** 언어를 바꾸면 서체도 바뀌므로 읽는 시점의 언어로 고른다 (스타일 팩토리 안에서 펼쳐 쓴다) */
export const DisplayText = themed(() => {
	const fonts = appFonts();
	return fonts ? ({ fontFamily: fonts.display, fontWeight: '400' } as const) : ({ fontWeight: '800' } as const);
});

const BODY_WEIGHTS = { regular: '400', bold: '700', heavy: '800' } as const;
type BodyWeight = keyof typeof BODY_WEIGHTS;

/** 서체를 직접 고를 때 — 앱 서체가 있는 언어는 서체 파일, 없는 언어는 시스템 서체의 굵기 */
export const bodyFont = (weight: BodyWeight): { fontFamily: string } | { fontWeight: (typeof BODY_WEIGHTS)[BodyWeight] } => {
	const fonts = appFonts();
	return fonts ? { fontFamily: fonts[weight] } : { fontWeight: BODY_WEIGHTS[weight] };
};

/** fontWeight → 본문 서체 파일. 300 이하 얇은 굵기는 파일을 두지 않아 regular 로 그린다 */
export const bodyFontFor = (weight?: string | number): string => {
	const fonts = appFonts() ?? KO_FONTS;
	const w = weight === 'bold' ? 700 : Number(weight) || 400;
	if (w >= 800) return fonts.heavy;
	if (w >= 600) return fonts.bold;
	return fonts.regular;
};

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
	/** 40 — 빈 상태 등 넓은 좌우 여백 */
	xxxxl: scaleWidth(40),
} as const;

/**
 * 세로 스페이싱 (세로 기준 반응형) — 섹션 간 상하 간격
 */
export const SpacingV = {
	xxs: scaleHeight(2),
	xs: scaleHeight(4),
	sm: scaleHeight(8),
	md: scaleHeight(12),
	lg: scaleHeight(16),
	xl: scaleHeight(20),
	xxl: scaleHeight(24),
	xxxl: scaleHeight(32),
	/** 40 — 빈 상태 등 넓은 상하 여백 */
	xxxxl: scaleHeight(40),
} as const;

/**
 * 테두리 두께 표준
 * -------------------------------------------------
 * 선 두께는 화면 크기에 비례시키지 않습니다(스케일하면 서브픽셀이 되어 흐려짐).
 * 화면마다 1.5 / 2 / 2.5 를 직접 적던 것을 이 토큰으로 수렴시킵니다.
 */
export const Border = {
	/** 1 — 카드·구분선 헤어라인 */
	hairline: 1,
	/** 1.5 — 선택 상태 강조 테두리 */
	thin: 1.5,
	/** 2 — 강한 강조(획득 뱃지·정답 보기) */
	thick: 2,
	/** 2.5 — 최상위 강조(1위 아바타 링) */
	heavy: 2.5,
} as const;

/**
 * 자간(letterSpacing) 표준 — 대문자 코드·라벨 강조용
 */
export const Tracking = {
	/** 0.3 — 소형 라벨 */
	tight: 0.3,
	/** 0.5 — 일반 라벨 */
	normal: 0.5,
	/** 0.8 — 강조 라벨 */
	wide: 0.8,
	/** 2 — 코드/카운트다운처럼 글자를 벌려 읽히게 */
	wider: 2,
} as const;

/**
 * 라운드(보더 반경) 표준
 */
export const Radius = {
	/** 8 — 칩·태그 등 작은 면 */
	sm: scaleWidth(8),
	/** 12 — 리스트 행·작은 카드 */
	md: scaleWidth(12),
	/** 16 — 기본 카드 */
	lg: scaleWidth(16),
	/** 20 — 큰 카드·모달 시트 */
	xl: scaleWidth(20),
	/** 24 — 히어로 카드 */
	xxl: scaleWidth(24),
	/** 완전 둥근 알약 */
	pill: scaleWidth(999),
} as const;

/**
 * 공통 그림자 프리셋 (iOS/Android 동시 대응)
 * -------------------------------------------------
 * 정돈형 원칙: 평면에 놓인 카드는 그림자를 쓰지 않고 헤어라인 보더로 경계를 만듭니다.
 * 그림자는 '실제로 떠 있는' 요소에만 남기며, 현재는 광고 보상 팝업(AdMob, 수정 금지)만 사용합니다.
 * elevation 은 쓰지 않는다 — 안드로이드·iOS 모양이 갈리므로 경계는 보더·배경 톤으로 만든다.
 */
export const Shadow = {
	/** 떠 있는 요소 전용 — 모달 시트 / 하단 고정 바 / FAB. 다크 배경에선 0.12 가 안 보여 농도를 올린다(themed 팩토리에서 스프레드되므로 테마마다 다시 읽힌다) */
	get floating() {
		return {
			shadowColor: isDark() ? Colors.nightDeep : Colors.ink,
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: isDark() ? 0.5 : 0.12,
			shadowRadius: 14,
		};
	},
} as const;

/**
 * 공용 카드 표면 (surface + 헤어라인 보더, 그림자 없음)
 * -------------------------------------------------
 * 화면마다 개별 선언하던 `const card = {...}` 를 이 토큰 하나로 수렴시킵니다.
 * borderRadius 는 용도에 따라 다르므로 사용처에서 Radius 토큰으로 지정합니다.
 *   예) card: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg }
 */
export const CardSurface = themed(() => ({
	backgroundColor: Colors.surface,
	borderWidth: 1,
	borderColor: Colors.border,
} as const));

/**
 * 화면 공통 레이아웃 기준
 * - screenH: 모든 화면 컨테이너의 좌우 여백 기준값(통일)
 * - sectionGap: 섹션(카드 묶음) 사이 세로 간격
 * - itemGap: 리스트 아이템 사이 세로 간격
 */
export const Layout = {
	/** 화면 좌우 여백 — 헤더·본문·리스트가 같은 좌측선을 쓰도록 통일 */
	screenH: Spacing.xl,
	/** 스크롤 컨테이너 상단 여백 */
	screenTop: SpacingV.md,
	/** 스크롤 컨테이너 하단 여백 (마지막 카드가 탭바/홈 인디케이터에 붙지 않게) */
	screenBottom: scaleHeight(40),
	/** 섹션(카드 묶음) 사이 세로 간격 */
	sectionGap: scaleHeight(28),
	/** 리스트 아이템 사이 세로 간격 */
	itemGap: SpacingV.sm,
	/** 최소 터치 영역 (iOS HIG 44pt) */
	touch: scaleWidth(44),
	/** 작은 아이콘 버튼의 터치 여유 — 실제 손가락 크기 기준이라 화면 크기에 비례시키지 않는다 */
	hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
	/** 퀴즈 보기 버튼 최소 높이 — 화면마다 패딩으로만 정하던 높이를 통일 */
	optionMinH: scaleHeight(56),
	/** 퀴즈 보기 버튼 최대 높이 — 남는 높이를 채우되 판자처럼 커지지 않게 */
	optionMaxH: scaleHeight(88),
	/** 하단 주요 버튼 최소 높이 */
	ctaMinH: scaleHeight(52),
	/** 진행바 두께 */
	barH: scaleHeight(6),
	/** 다이얼로그(가운데 팝업) 최대 폭 — 태블릿에서 카드가 화면 끝까지 늘어나지 않게 한다.
	 *  폰에서는 화면 폭보다 큰 값이라 적용되지 않는다(모바일 영향 없음). */
	dialogMaxWidth: scaleWidth(360),
	/** 태블릿 가득 폭 히어로 배너 비율 — 16:9·2:1 그대로면 높이가 400~550pt 로 첫 화면을 다 먹는다 (cover 라 위아래만 잘린다) */
	heroAspectTablet: 2.4,
	/** 바텀시트 최대 폭 — 태블릿은 720 상한(폰은 화면 폭 그대로라 무효) */
	sheetMaxWidth: isTablet ? Math.min(screenWidth, TABLET_SHEET_MAX_WIDTH) : screenWidth,
} as const;

export default { Typography, FontWeight, Spacing, SpacingV, Radius, Border, Tracking, Shadow, CardSurface, Layout };
