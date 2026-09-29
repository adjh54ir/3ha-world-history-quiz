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

/** 태블릿 본문 최대 폭 — 카드/문장이 화면 끝까지 늘어나 읽기 힘들어지는 것을 막는다 */
export const TABLET_MAX_CONTENT_WIDTH = 720;

/**
 * 실제 본문이 차지하는 폭 (폰은 화면 폭 그대로)
 * 태블릿은 화면 폭의 82%를 쓰되 720 을 넘지 않는다.
 * - 고정값 하나로 묶으면 12.9" 에서 좌우가 과하게 비고, 안 묶으면 한 줄이 너무 길어진다.
 * - mini 744 → 610 / 11" 834 → 684 / Pro 12.9" 1024 → 720
 */
export const contentWidth = isTablet
	? Math.min(Math.round(screenWidth * 0.82), TABLET_MAX_CONTENT_WIDTH)
	: screenWidth;

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
