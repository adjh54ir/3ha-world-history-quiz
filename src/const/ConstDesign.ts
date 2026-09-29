/**
 * 앱 통합 디자인 토큰 (타이포그래피 / 스페이싱 / 라운드 / 그림자)
 * -------------------------------------------------
 * 모든 화면·모달의 폰트 크기와 간격은 이 토큰을 기준점으로 사용합니다.
 * - 폰트/간격은 DementionUtils 의 반응형 스케일을 통과시켜 기기 크기에 비례합니다.
 * - 하드코딩된 숫자 대신 의미 단위(토큰)를 사용해 화면 간 통일성을 확보합니다.
 * - 색상은 src/const/ConstColors.ts(Colors) 를 함께 사용합니다.
 */
import { contentWidth, scaledSize, scaleHeight, scaleWidth } from '@/src/utils/DementionUtils';
import Colors, { isDark } from '@/src/const/ConstColors';
import { themed } from '@/src/utils/ThemedStyles';

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
 * 그림자는 '실제로 떠 있는' 요소(모달 시트, 하단 고정 바, FAB)에만 사용합니다.
 */
export const Shadow = {
	/** @deprecated 카드는 헤어라인 보더(CardSurface)로 통일. 그림자 없음. */
	card: {
		shadowColor: 'transparent',
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0,
		shadowRadius: 0,
	},
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
 * 공용 카드 표면 (surface + 헤어라인 보더 + 옅은 그림자)
 * -------------------------------------------------
 * 화면마다 개별 선언하던 `const card = {...}` 를 이 토큰 하나로 수렴시킵니다.
 * borderRadius 는 용도에 따라 다르므로 사용처에서 Radius 토큰으로 지정합니다.
 *   예) card: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg }
 */
export const CardSurface = themed(() => ({
	backgroundColor: Colors.surface,
	borderWidth: 1,
	borderColor: Colors.border,
	...Shadow.card,
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
	/** 진행바 두께 */
	barH: scaleHeight(6),
	/** 다이얼로그(가운데 팝업) 최대 폭 — 태블릿에서 카드가 화면 끝까지 늘어나지 않게 한다.
	 *  폰에서는 화면 폭보다 큰 값이라 적용되지 않는다(모바일 영향 없음). */
	dialogMaxWidth: scaleWidth(360),
	/** 바텀시트 최대 폭 — 본문 컬럼과 같은 폭으로 맞춘다(폰은 화면 폭 그대로라 무효) */
	sheetMaxWidth: contentWidth,
} as const;

export default { Typography, FontWeight, Spacing, SpacingV, Radius, Border, Tracking, Shadow, CardSurface, Layout };
