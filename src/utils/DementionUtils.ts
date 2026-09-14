import { Dimensions } from 'react-native';

/**
 * 태블릿 관련 값은 이식 화면(src/four)이 쓰는 모듈에서 그대로 가져온다.
 * -------------------------------------------------
 * 실제 라우트 15개 중 7개가 src/four/screens 의 화면이고, 그쪽은 이미 이 값들로 태블릿을 맞춰 뒀다.
 * 여기서 숫자를 따로 들고 있으면 같은 앱 안에서 화면마다 기둥 폭·글자 크기가 달라진다.
 * 배율 상한·기둥 폭·모달 폭의 기준점은 한 곳(src/four/utils/DementionUtils)만 둔다.
 */
export {
	CONTENT_MAX_WIDTH,
	isTablet,
	isTabletSize,
	MAX_SCALE,
	MODAL_MAX_WIDTH,
	TABLET_MAX_SCALE,
	TABLET_MIN_SHORT_SIDE,
} from '@/src/four/utils/DementionUtils';

import { isTablet, MAX_SCALE, TABLET_MAX_SCALE } from '@/src/four/utils/DementionUtils';

// resolution changes as per design
export const designWidth = 375;
export const designHeight = 812;

/**
 * 안드로이드는 앱 콜드 스타트 시 모듈이 로드되는 시점에 window 크기가 아직 확정되지 않아
 * Dimensions.get('window')이 실제보다 작은 값을 돌려주는 경우가 있다.
 * 그 값을 모듈 상수로 굳혀 두면 세션 내내 모든 폰트·여백이 작게 계산되므로 호출 시점에 읽는다.
 * (Dimensions.get은 JS 캐시 조회라 매 호출 비용이 사실상 없음)
 */
const win = () => Dimensions.get('window');

/**
 * 태블릿은 창(window)이 아니라 기기 화면(screen)으로 배율을 잡는다 — 창 크기가 바뀌어도 값이 흔들리지 않는다.
 * 폰은 위 주석대로 window 를 그때그때 읽는다.
 */
const box = () => (isTablet ? Dimensions.get('screen') : win());

/** 배율 상한 — 폰은 MAX_SCALE(1.25), 태블릿은 한 단계 위(TABLET_MAX_SCALE) */
const ceiling = () => (isTablet ? TABLET_MAX_SCALE : MAX_SCALE);

const widthRatio = () => Math.min(box().width / designWidth, ceiling());

const heightRatio = () => Math.min(box().height / designHeight, ceiling());

const scaleWidth = (val: number) => val * widthRatio();

const scaleHeight = (val: number) => val * heightRatio();

const scale = () => Math.min(widthRatio(), heightRatio());

const moderateScale = (size: number, factor = 1) => size + (scaleWidth(size) - size) * factor;

/** 기본 본문 폰트 크기 — style에 fontSize를 지정하지 않는 Text는 이 값을 쓸 것 (RN 기본 14는 디자인 스케일 밖) */
export const DEFAULT_FONT_SIZE = 14;

const scaledSize = (size: number = DEFAULT_FONT_SIZE) => Math.ceil(size * scale());

/** @deprecated 화면 회전·분할화면에서 값이 굳어버림. scaleWidth/scaleHeight를 쓰세요 */
const screenWidth = Dimensions.get('window').width;
/** @deprecated 화면 회전·분할화면에서 값이 굳어버림. scaleWidth/scaleHeight를 쓰세요 */
const screenHeight = Dimensions.get('window').height;

export { moderateScale, scaledSize, scaleHeight, scaleWidth, screenHeight, screenWidth };
