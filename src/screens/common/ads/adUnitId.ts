/**
 * AdMob 광고 유닛 ID 결정 (공통)
 * - 개발(__DEV__) 빌드: 테스트 유닛.
 * - 그 외(운영 빌드): 운영 유닛.
 * - 배너·앱 열기·보상형 모두 이 함수를 거친다.
 *   ⚠️ 광고 유닛 ID는 `.env` 한 곳에서만 관리한다. `.env.production` 에는 넣지 않는다.
 */

/**
 * @param configured .env 에서 읽은 플랫폼별 운영 유닛 ID
 * @param testId react-native-google-mobile-ads 의 TestIds 값
 */
export const resolveAdUnitId = (configured: string | undefined, testId: string): string =>
	__DEV__ ? testId : (configured ?? '').trim();
