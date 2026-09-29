/**
 * 점수 정책 (전 화면 공통)
 * - 정답 1개당 획득 점수. 홈/퀴즈/점수상세 등에서 동일하게 사용합니다.
 */
export const POINT_PER_CORRECT = 10;

/** 정답 개수 → 점수 환산 */
export const toScore = (correct: number): number => correct * POINT_PER_CORRECT;

export default POINT_PER_CORRECT;
