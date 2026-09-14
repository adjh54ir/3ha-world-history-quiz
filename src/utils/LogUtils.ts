/**
 * 운영 빌드에서는 콘솔 출력을 모두 막는다.
 * -------------------------------------------------
 * - 로그에 학습 기록·기기 정보가 실려 나가고, 릴리스에서도 문자열 조립 비용이 계속 든다.
 * - babel 플러그인(transform-remove-console) 대신 런타임에서 끊는다. 새 의존성이 필요 없고,
 *   여기서 한 번만 갈아 끼우면 앱·라이브러리가 부르는 콘솔까지 같이 조용해진다.
 * - 오류는 CrashReport(installGlobalErrorHandler·ErrorBoundary)가 Crashlytics 로 올린다 — 콘솔을 막아도 잃지 않는다.
 */
/** 콘솔에서 지울 메서드 — console.error 까지 포함한다(운영에서는 어떤 출력도 남기지 않는다) */
const MUTED_METHODS = ['log', 'warn', 'error', 'info', 'debug', 'trace', 'table', 'dir', 'group', 'groupEnd'] as const;

const noop = () => {};

/**
 * 운영(릴리스) 빌드인지.
 * - __DEV__ 만 본다. APP_MODE(prd/dev/loc) 를 함께 보면 preview·사내 배포 릴리스에서 로그가 그대로 남는다.
 * - 릴리스 번들이면 어떤 채널이든 콘솔을 막는 것이 맞다. 개발 중에는 __DEV__ 가 true 라 그대로 보인다.
 */
export const isProductionBuild = (): boolean => !__DEV__;

/**
 * 운영 빌드에서 콘솔을 무음 처리한다. 앱 진입 시 1회 호출한다.
 * @returns 실제로 막았는지 여부
 */
export const silenceConsoleInProduction = (): boolean => {
	if (!isProductionBuild()) {
		return false;
	}
	const target = console as unknown as Record<string, unknown>;
	MUTED_METHODS.forEach((method) => {
		target[method] = noop;
	});
	return true;
};
