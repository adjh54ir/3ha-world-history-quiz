/**
 * 앱 통합 디자인 토큰 (타이포그래피 / 스페이싱 / 라운드 / 그림자)
 * -------------------------------------------------
 * 모든 화면·모달의 폰트 크기와 간격은 이 토큰을 기준점으로 사용합니다.
 * - 폰트/간격은 DementionUtils 의 반응형 스케일을 통과시켜 기기 크기에 비례합니다.
 * - 하드코딩된 숫자 대신 의미 단위(토큰)를 사용해 화면 간 통일성을 확보합니다.
 * - 색상은 src/const/ConstColors.ts(Colors) 를 함께 사용합니다.
 */
import { scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils/DementionUtils';

/**
 * 타이포그래피 스케일 (반응형)
 * 시맨틱한 역할명으로 폰트 크기를 통일합니다.
 */
const BASE_TYPOGRAPHY = {
	/** 9pt — 마이크로 배지(NEW·공유 등 아주 작은 칩). 이보다 작은 폰트는 쓰지 않는다 */
	micro: scaledSize(9),
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
	/** 44pt — 히어로 숫자(결과 점수·큰 이모지) */
	hero: scaledSize(44),
	/** 56pt — 카운트다운 등 화면을 채우는 숫자 */
	heroLg: scaledSize(56),
	/** 72pt — 최대 크기(타임챌린지 카운트다운) */
	heroXl: scaledSize(72),
} as const;

/** 타이포 토큰 이름 */
export type TypographyToken = keyof typeof BASE_TYPOGRAPHY;

/**
 * 실제로 화면이 참조하는 타이포 스케일.
 *
 * 화면들이 `StyleSheet.create` 안에서 이 값을 **모듈 로드 시점에** 읽어 가므로,
 * 큰 글씨 모드처럼 글씨를 키우는 설정은 App import 전(index.js 부트스트랩)에
 * applyTypographyScale 로 값을 덮어써야 한다. 실행 중 변경은 BigTextModeUtils.applyBigTextMode 가 처리한다.
 */
export const Typography: Record<TypographyToken, number> = { ...BASE_TYPOGRAPHY };

/** 지금 적용된 글씨 배율 */
let activeFontScale = 1;

export const getFontScale = (): number => activeFontScale;

/**
 * 전체 글씨 크기에 배율을 적용한다.
 * Typography 객체를 교체하지 않고 덮어써야 이미 import 해 간 모듈이 같은 참조를 본다.
 * @param scale 1 = 기본, 1.15 = 큰 글씨 모드
 */
export const applyTypographyScale = (scale: number): void => {
	activeFontScale = scale;
	(Object.keys(BASE_TYPOGRAPHY) as TypographyToken[]).forEach((key) => {
		Typography[key] = Math.round(BASE_TYPOGRAPHY[key] * scale);
	});
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
 *
 * 4pt 그리드를 기준으로 한다. 화면에서 쓰이던 6·10·14·18 같은 그리드 밖 값은
 * 가장 가까운 토큰으로 스냅해서 화면 간 리듬을 맞춘다.
 * 새 간격이 필요하면 임의 숫자 대신 여기에 토큰을 추가한다.
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
	/** 40 */
	xxxxl: scaleWidth(40),
	/** 48 */
	xxxxxl: scaleWidth(48),
} as const;

/**
 * 세로 스페이싱 (세로 기준 반응형) — 섹션 간 상하 간격
 * 값 체계는 Spacing 과 동일한 4pt 그리드를 따른다.
 */
export const SpacingV = {
	/** 2 */
	xxs: scaleHeight(2),
	/** 4 */
	xs: scaleHeight(4),
	/** 8 */
	sm: scaleHeight(8),
	/** 12 */
	md: scaleHeight(12),
	/** 16 */
	lg: scaleHeight(16),
	/** 20 */
	xl: scaleHeight(20),
	/** 24 */
	xxl: scaleHeight(24),
	/** 32 */
	xxxl: scaleHeight(32),
	/** 40 */
	xxxxl: scaleHeight(40),
	/** 48 */
	xxxxxl: scaleHeight(48),
} as const;

/**
 * 라운드(보더 반경) 표준
 *
 * 간격과 같은 4pt 그리드를 쓴다. 화면마다 6·10·14·17·22 처럼 제각각이던 값은
 * 가장 가까운 토큰으로 스냅한다.
 * 원형(아바타·뱃지)처럼 `너비/2` 가 필요한 큰 반경은 토큰 대신 실제 값을 쓴다.
 */
export const Radius = {
	/** 4 — 칩/작은 태그 */
	xs: scaleWidth(4),
	/** 8 — 버튼, 작은 카드 */
	sm: scaleWidth(8),
	/** 12 — 기본 카드 */
	md: scaleWidth(12),
	/** 16 — 큰 카드, 시트 */
	lg: scaleWidth(16),
	/** 20 — 모달 */
	xl: scaleWidth(20),
	/** 24 — 바텀시트 상단 */
	xxl: scaleWidth(24),
	/** 완전 둥근 형태 */
	pill: scaleWidth(999),
} as const;

/**
 * 아이콘 전용 버튼의 터치 영역 확장값
 *
 * 닫기(X)·별표처럼 아이콘만 있는 버튼은 실제 그림 크기가 16~22pt 라
 * 손가락으로 누르기 어렵다. 눌리는 범위만 넓혀 44pt 권장 터치 영역을 확보한다.
 */
export const HitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;

export default { Typography, FontWeight, Spacing, SpacingV, Radius, HitSlop };
