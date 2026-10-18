import { Dimensions } from 'react-native';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

// resolution changes as per design
export const designWidth = 375;
export const designHeight = 812;

/**
 * 태블릿 판정 — 짧은 변 600dp 이상 (iPad / 안드로이드 태블릿 공통 기준)
 * 회전해도 값이 바뀌지 않도록 긴 변이 아닌 '짧은 변'으로 판정한다.
 */
const shortSide = Math.min(screenWidth, screenHeight);
export const isTablet = shortSide >= 600;

/**
 * 태블릿 전용 고정 배율
 * -------------------------------------------------
 * 기준 해상도(375x812)를 그대로 나누면 iPad 에서 배율이 2.0~3.6 이 되어
 * 폰트·여백·라운드가 전부 과장된다(본문 14pt → 24pt, 카드 라운드 16 → 58).
 * 태블릿은 "조금 큰 폰 UI"가 되도록 배율을 1.25 로 고정한다.
 * 가로/세로 모두 같은 값이라 회전해도 레이아웃이 흔들리지 않는다.
 * ⚠️ 폰(isTablet=false)은 아래 계산식이 기존과 동일하다 — 모바일 영향 없음.
 */
export const TABLET_SCALE = 1.25;

/**
 * 바텀시트 최대 폭 — 화면 본문은 태블릿에서도 가로를 가득 쓰지만,
 * 하단 시트는 1024 폭 끝까지 늘어나면 목록·버튼이 판자처럼 보여 상한을 둔다. 폰은 화면 폭 그대로라 무효.
 */
export const TABLET_SHEET_MAX_WIDTH = 720;

/**
 * 태블릿 그리드 열 수 — 화면 폭(좌우 여백 제외)을 셀 최소 폭으로 나눠 정한다.
 * mini 744 → 2열 / 11" 834 → 2열 / 12.9" 1024 → 2~3열 (minCell 에 따라). 폰은 항상 1열.
 */
export const gridColumns = (minCellWidth = 320, maxColumns = 3) =>
	// 좌우 여백 = Layout.screenH(20) × 2 — ConstDesign 이 이 파일을 import 하므로 값을 직접 계산한다
	isTablet ? Math.max(1, Math.min(maxColumns, Math.floor((screenWidth - scaleWidth(40)) / minCellWidth))) : 1;

// 폰은 기존 식을 글자 그대로 유지한다(부동소수점 결과까지 동일 → 모바일 무영향 보장)
const scaleWidth = (val: number) => (isTablet ? val * TABLET_SCALE : (screenWidth * val) / designWidth);

const scaleHeight = (val: number) => (isTablet ? val * TABLET_SCALE : (screenHeight * val) / designHeight);

/**
 * 장식용 일러스트·로티 전용 배율.
 * 본문 폭은 폰 대비 1.6~1.9배로 넓어지는데 아트만 1.25배면 시각적 비중이 3분의 1 줄어 허전해진다.
 * 폰(isTablet=false)은 scaleWidth 와 완전히 같은 식 — 모바일 영향 없음.
 * 다이얼로그(최대 450) 안의 아트는 이미 비율이 맞으므로 쓰지 않는다.
 */
export const TABLET_ART_SCALE = 1.6;

const scaleArt = (val: number) => (isTablet ? val * TABLET_ART_SCALE : (screenWidth * val) / designWidth);

const scale = isTablet ? TABLET_SCALE : Math.min(screenWidth / designWidth, screenHeight / designHeight);

const moderateScale = (size: number, factor = 1) =>
    size + (scaleWidth(size) - size) * factor;

const scaledSize = (size: number) => Math.ceil(size * scale);

export {
    moderateScale,
    scaleArt,
    scaledSize,
    scaleHeight,
    scaleWidth,
    screenHeight,
    screenWidth,
};
