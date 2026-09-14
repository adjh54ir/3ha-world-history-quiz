/**
 * 이식 화면용 전역 토스트 — 앱 공통 토스트(GlobalToast)로 넘긴다.
 * -------------------------------------------------
 * 예전에는 이 파일이 토스트 UI 를 직접 그렸다. 그런데 그 호스트 컴포넌트를 어디에서도
 * 마운트하지 않아 `showToast` 호출이 전부 조용히 삼켜졌다.
 * (오늘의 퀴즈 알림 설정·해제 안내, 즐겨찾기 실패 안내가 안 뜨던 원인)
 *
 * 앱 루트에는 이미 토스트 호스트가 하나 올라가 있으니 그쪽으로 보낸다.
 * 호출부는 그대로 두고, 생김새만 앱 전체와 같아진다.
 *
 * ⚠️ RN Modal 안에서 부르면 루트 호스트가 모달 뒤로 가려진다.
 *    모달 안에서 띄워야 하는 토스트는 FavoriteToast 처럼 모달 트리 안에 직접 둔다.
 */
import { showToast as showAppToast } from '@/src/screens/common/atomic/GlobalToast';

export type ToastType = 'success' | 'error' | 'info';

/** 원본이 쓰던 종류 → 앱 토스트의 MaterialCommunityIcons 이름 */
const ICON: Record<ToastType, string> = {
	success: 'check-circle',
	error: 'alert-circle-outline',
	info: 'information-outline',
};

/** 어디서든 호출 가능한 토스트 트리거 */
export const showToast = (message: string, options?: { subMessage?: string; type?: ToastType }): void => {
	showAppToast(message, ICON[options?.type ?? 'success'], { subMessage: options?.subMessage });
};
