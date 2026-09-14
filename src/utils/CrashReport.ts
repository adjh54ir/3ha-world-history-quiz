/**
 * 크래시 보고 — Crashlytics 로 올린다.
 * -------------------------------------------------
 * 운영 빌드는 콘솔을 전부 막아 두므로(LogUtils), 여기로 올리지 않으면 JS 오류가 아무 데도 남지 않는다.
 * 네이티브 모듈이 없을 수 있는 환경(테스트·개발 셸)에서도 앱이 죽지 않게 require 를 감싼다.
 */

/** Crashlytics 인스턴스 — 모듈이 없으면 null (그 경우 조용히 넘어간다) */
const crashlytics = (): { recordError: (e: Error) => void; log: (m: string) => void } | null => {
	try {
		return require('@react-native-firebase/crashlytics').default();
	} catch {
		return null;
	}
};

/** 화면이 죽을 만한 오류 — 컴포넌트 트리 정보까지 같이 남긴다 */
export const reportFatal = (error: Error, componentStack?: string): void => {
	const client = crashlytics();
	if (!client) {
		return;
	}
	if (componentStack) {
		client.log(`componentStack: ${componentStack}`);
	}
	client.recordError(error);
};

/** 화면은 살아 있지만 기록해 둘 만한 오류 (저장 실패·파싱 실패 등) */
export const reportError = (error: unknown, context?: string): void => {
	const client = crashlytics();
	if (!client) {
		return;
	}
	if (context) {
		client.log(context);
	}
	client.recordError(error instanceof Error ? error : new Error(String(error)));
};

/**
 * 어디서도 잡지 못한 JS 오류를 Crashlytics 로 넘긴다. 앱 진입 시 한 번 건다.
 * 기존 핸들러(개발 중 빨간 화면)는 그대로 이어서 부른다.
 */
export const installGlobalErrorHandler = (): void => {
	const globalHandlers = (global as unknown as { ErrorUtils?: { getGlobalHandler: () => (e: Error, isFatal?: boolean) => void; setGlobalHandler: (h: (e: Error, isFatal?: boolean) => void) => void } }).ErrorUtils;
	if (!globalHandlers) {
		return;
	}
	const previous = globalHandlers.getGlobalHandler();
	globalHandlers.setGlobalHandler((error, isFatal) => {
		reportFatal(error instanceof Error ? error : new Error(String(error)), isFatal ? 'isFatal' : undefined);
		previous?.(error, isFatal);
	});
};
