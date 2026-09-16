/**
 * 펫 성장 단계별 이미지 — PET_STAGES 와 같은 순서.
 * 데이터 파일(ConstLifeRewards)은 node 테스트에서도 읽으므로 이미지 require 는 여기 따로 둔다.
 *
 * 앱 아이콘의 사자 캐릭터가 초보 학습자에서 세계사 대가로 성장한다.
 */
export const PET_STAGE_IMAGES: number[] = [
	require('@/src/assets/illustrations/lion-stage-1.webp'),
	require('@/src/assets/illustrations/lion-stage-2.webp'),
	require('@/src/assets/illustrations/lion-stage-3.webp'),
	require('@/src/assets/illustrations/lion-stage-4.webp'),
	require('@/src/assets/illustrations/lion-stage-5.webp'),
	require('@/src/assets/illustrations/lion-stage-6-golden.webp'),
];

/** 단계(1부터) → 이미지. 범위를 벗어나면 마지막 그림 */
export const selectPetImage = (level: number): number => PET_STAGE_IMAGES[Math.min(PET_STAGE_IMAGES.length, Math.max(1, level)) - 1];

/** 출석 보상 나침반 올빼미 — ATTENDANCE_PET_STAGES 와 같은 순서 */
export const ATTENDANCE_PET_IMAGES: number[] = [
	require('@/src/assets/illustrations/world-owl-stage-1.webp'),
	require('@/src/assets/illustrations/world-owl-stage-2.webp'),
	require('@/src/assets/illustrations/world-owl-stage-3.webp'),
	require('@/src/assets/illustrations/world-owl-stage-4.webp'),
	require('@/src/assets/illustrations/world-owl-stage-5.webp'),
	require('@/src/assets/illustrations/world-owl-stage-6-golden.webp'),
];
