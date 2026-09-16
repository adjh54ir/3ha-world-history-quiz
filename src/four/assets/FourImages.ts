/**
 * 이식 화면이 쓰는 그림 — 이름은 원본(사자성어 앱)을 그대로 두고 그림만 이 앱 전용 에셋으로 바꾼다.
 *
 * 원본은 `require('@/assets/images/screen_fox_*.png')` 처럼 파일을 직접 가리켰다.
 * 같은 이름의 파일을 복사해 두면 29MB가 그대로 늘어나므로, 이름 → 실제 그림 매핑만 여기 둔다.
 * 새 화면을 더 이식할 때 필요한 이름이 생기면 여기에 한 줄만 추가한다.
 *
 * ponytail: 실제로 읽히는 이름만 남겼다. require 는 모듈이 열리는 순간 번들에 들어가므로,
 * 아무도 안 쓰는 이름을 놔두면 그림 파일이 그대로 앱에 실린다.
 */

/** 등급 마스코트 — 사자가 자라는 여섯 단계 */
const stage = [
	require('@/src/assets/illustrations/lion-stage-1.webp'),
	require('@/src/assets/illustrations/lion-stage-2.webp'),
	require('@/src/assets/illustrations/lion-stage-3.webp'),
	require('@/src/assets/illustrations/lion-stage-4.webp'),
	require('@/src/assets/illustrations/lion-stage-5.webp'),
	require('@/src/assets/illustrations/lion-stage-6-golden.webp'),
];

const FourImages = {
	screen_fox_check_in: require('@/src/assets/illustrations/lion-attendance.webp'),

	level1_mascote: stage[0],
	level2_mascote: stage[1],
	level3_mascote: stage[2],
	level4_mascote: stage[3],
	level5_mascote: stage[4],
	level6_mascote: stage[5],
	level7_mascote: stage[5],
};

export default FourImages;
