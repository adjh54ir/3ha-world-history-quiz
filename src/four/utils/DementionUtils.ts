import { Dimensions } from 'react-native';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

/**
 * 기기 자체의 화면 크기.
 * window 는 '앱 창'이라 iPadOS 26 윈도 모드나 안드로이드 분할 화면에서 기기보다 작아진다.
 * 태블릿인지 아닌지는 창이 아니라 기기로 판단해야 창 크기를 바꿔도 결과가 흔들리지 않는다.
 */
const { height: deviceHeight, width: deviceWidth } = Dimensions.get('screen');

// resolution changes as per design
export const designWidth = 375;
export const designHeight = 812;

/**
 * 태블릿 기준선 — 짧은 변이 600dp 이상이면 태블릿으로 본다.
 * 안드로이드 sw600dp 규칙과 같은 값이고, 아이패드(짧은 변 744pt 이상)도 함께 걸린다.
 *
 * DeviceInfo.isTablet() 을 쓰지 않는 이유 — 이 모듈은 ConstDesign 을 통해 부트스트랩
 * 아주 초기에 로드되므로 네이티브 모듈이 준비되기 전일 수 있다. 화면 크기는 항상 읽힌다.
 */
export const TABLET_MIN_SHORT_SIDE = 600;

/**
 * 반응형 배율 상한 — 폰 기준
 *
 * 스케일 함수는 `화면크기 / 설계크기` 를 그대로 곱한다. 설계 기준이 375x812(아이폰)이라
 * 아이패드에서는 가로 배율이 2.7배까지 올라가 글씨·여백이 전부 무너진다.
 * 배율에 천장을 씌워 태블릿을 "큰 폰" 크기로 묶는다.
 *
 * 폰의 최대 배율(440pt 기기 = 1.17배)보다 높게 잡아 폰 레이아웃은 하나도 바뀌지 않는다.
 * 축소(작은 폰)는 그대로 두고 확대만 막는다.
 */
export const MAX_SCALE = 1.25;

/**
 * 태블릿 배율 상한 (태블릿 크기 조정의 첫 번째 튜닝 값)
 *
 * 폰 상한(1.25)을 태블릿에 그대로 쓰면 본문 기둥은 설계폭의 1.6배인데 글씨·버튼은 1.25배라
 * 카드 안이 휑하고 글씨가 작아 보인다. 태블릿만 한 단계 더 키워 기둥 폭과 균형을 맞춘다.
 * 폰은 이 값을 쓰지 않으므로 폰 레이아웃에 영향이 없다.
 *
 * ponytail: 태블릿 전용 레이아웃 대신 배율 상한 하나로 처리. 실기기에서 너무 작거나
 * 크게 느껴지면 태블릿 레이아웃을 새로 짜기 전에 이 값부터 조정한다.
 */
export const TABLET_MAX_SCALE = 1.35;

/** 짧은 변 기준 태블릿 판정 */
export const isTabletSize = (width: number, height: number) =>
    Math.min(width, height) >= TABLET_MIN_SHORT_SIDE;

/** 지금 기기가 태블릿인지 (창이 아니라 기기 화면 기준) */
export const isTablet = isTabletSize(deviceWidth, deviceHeight);

/** 폰에서 쓰는 본문 기둥 폭 — 폰 화면이 이보다 좁아 실제로는 걸리지 않는다 */
const PHONE_CONTENT_MAX_WIDTH = 600;

/**
 * 태블릿에서 본문이 차지할 최대 폭 — 넘는 만큼은 좌우 여백으로 남긴다.
 *
 * 고정값 하나로 두면 11인치(짧은 변 820)와 13인치(1024)가 같은 폭을 써서, 큰 기기일수록
 * 좌우 회색 여백만 넓어지고 앱이 화면 가운데 박힌 폰처럼 보인다.
 * 기기 짧은 변에 비례시키되 상한을 둬 한 줄이 지나치게 길어지지 않게 한다.
 *   - 소형 태블릿(600) → 510 / 아이패드 미니(744) → 632 / 11인치(820) → 697 / 13인치(1024) → 700
 *
 * 하한을 두지 않는 이유 — 짧은 변 600dp 짜리 최소 태블릿에서는 하한이 기기 폭을 넘어
 * 좌우 여백이 사라진다. 비율만 쓰면 어떤 크기에서도 여백이 남는다.
 */
const TABLET_CONTENT_WIDTH_RATIO = 0.85;
const TABLET_CONTENT_MAX_WIDTH = 700;

/** 기기 크기에서 본문 기둥 폭을 뽑는다 (테스트에서 임의 기기를 넣어 검증할 수 있게 순수 함수) */
export const computeContentMaxWidth = (width: number, height: number) => {
    if (!isTabletSize(width, height)) {
        return PHONE_CONTENT_MAX_WIDTH;
    }
    const target = Math.min(width, height) * TABLET_CONTENT_WIDTH_RATIO;
    return Math.round(Math.min(target, TABLET_CONTENT_MAX_WIDTH));
};

export const CONTENT_MAX_WIDTH = computeContentMaxWidth(deviceWidth, deviceHeight);

/**
 * 모달 카드가 차지할 최대 폭 (본문 기둥보다 좁아야 대화상자처럼 보인다).
 *
 * 태블릿은 기둥이 넓어진 만큼 카드도 같이 키우되, 기둥의 90% 를 넘지 않게 묶는다.
 * 짧은 변 600dp 짜리 최소 태블릿은 기둥 자체가 510 이라 고정값 500 을 쓰면
 * 카드가 기둥에 꽉 차 딤 배경이 보이지 않고 대화상자로 읽히지 않는다.
 * 폰은 화면이 460 보다 좁아 영향이 없다.
 */
export const computeModalMaxWidth = (width: number, height: number) =>
    isTabletSize(width, height) ? Math.round(Math.min(500, computeContentMaxWidth(width, height) * 0.9)) : 460;

export const MODAL_MAX_WIDTH = computeModalMaxWidth(deviceWidth, deviceHeight);

/**
 * AppModal 이 실제로 잡는 무대(stage)의 폭 = 화면 폭.
 *
 * 모달 안에서 '가운데'를 계산할 때(컨페티 발사 지점 등) 쓴다.
 * 예전에는 무대를 본문 기둥 폭으로 잘랐어서 이 값도 기둥 폭이었는데,
 * 딤이 기둥 밖까지 닿지 않는 문제로 무대를 화면 전체로 되돌렸다(AppModal 주석 참고).
 * 이름을 유지하는 이유 — 호출부(컨페티)가 '무대 기준 가운데'를 뜻하기 때문.
 */
export const MODAL_STAGE_WIDTH = screenWidth;

/**
 * 화면 크기에서 가로/세로 배율을 뽑는다. 상한(기본 MAX_SCALE)을 넘지 않는다.
 * 순수 함수로 분리해 둔 이유 — 테스트에서 임의 기기 크기를 넣어 검증할 수 있게.
 */
export const computeScaleRatios = (width: number, height: number, maxScale: number = MAX_SCALE) => ({
    widthRatio: Math.min(width / designWidth, maxScale),
    heightRatio: Math.min(height / designHeight, maxScale),
});

/**
 * 태블릿은 창(window)이 아니라 기기 화면(screen)으로 배율을 잡는다.
 *
 * 이 모듈은 크기를 모듈 로드 때 딱 한 번 읽고, 그 값으로 만든 StyleSheet 는 다시 계산되지
 * 않는다. iPadOS 26 윈도 모드와 안드로이드 분할 화면에서는 창 크기가 실행 중에 바뀌므로
 * 창을 따라 계산하면 리사이즈 뒤 값이 어긋난다. 기기 크기는 변하지 않아 결과가 흔들리지 않는다.
 *
 * 상한만 씌우고 실제 비율을 쓰는 이유 — 짧은 변 600dp 짜리 작은 태블릿은 세로가 960dp 밖에
 * 안 돼(설계 812 대비 1.18배) 상한값을 그대로 박으면 세로로 짠 화면이 넘친다.
 * 큰 태블릿은 어차피 상한에 걸려 같은 크기를 유지한다.
 */
const { widthRatio, heightRatio } = isTablet
    ? computeScaleRatios(deviceWidth, deviceHeight, TABLET_MAX_SCALE)
    : computeScaleRatios(screenWidth, screenHeight);

const scaleWidth = (val: number) => val * widthRatio;

const scaleHeight = (val: number) => val * heightRatio;

const scale = Math.min(widthRatio, heightRatio);

const moderateScale = (size: number, factor = 1) =>
    size + (scaleWidth(size) - size) * factor;

const scaledSize = (size: number) => Math.ceil(size * scale);

export {
    moderateScale,
    scaledSize,
    scaleHeight,
    scaleWidth,
    screenHeight,
    screenWidth,
};
