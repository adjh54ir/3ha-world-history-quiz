/**
 * AdMob 광고 유닛 ID 결정 (공통)
 * - 개발(__DEV__)에서는 항상 테스트 유닛.
 * - 운영에서도 .env 값이 실제 유닛 ID 형식이 아니면(미설정·자리 표시자) 테스트 유닛으로 폴백한다.
 *   → 유효하지 않은 ID로 요청해 아무 광고도 뜨지 않는 상태를 막는다.
 * - 실제 ID를 .env 에 넣으면 자동으로 운영 광고로 전환된다(코드 수정 불필요).
 *   ⚠️ 광고 유닛 ID는 `.env` 한 곳에서만 관리한다. `.env.production` 에는 넣지 않는다.
 */

/** ca-app-pub-<16자리>/<7~12자리> 형식만 실제 유닛 ID로 인정한다 */
const UNIT_ID_PATTERN = /^ca-app-pub-\d{16}\/\d{7,12}$/;

export const isRealAdUnitId = (id?: string | null): boolean => !!id && UNIT_ID_PATTERN.test(id.trim());

/**
 * @param configured .env 에서 읽은 플랫폼별 유닛 ID
 * @param testId react-native-google-mobile-ads 의 TestIds 값
 * @param label 어떤 광고인지 식별용 이름(폴백 경고에 표시)
 */
export const resolveAdUnitId = (configured: string | undefined, testId: string, label = 'unknown'): string => {
	if (__DEV__) return testId;
	if (isRealAdUnitId(configured)) return configured!.trim();
	console.warn(
		`⚠️ [AdMob] "${label}" 운영 유닛 ID 미설정(값: ${configured || '(없음)'}) → 테스트 광고로 대체됨. .env 확인 필요.`,
	);
	return testId;
};
