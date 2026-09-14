import { Platform } from 'react-native';
import {
	check,
	checkNotifications,
	openSettings,
	Permission,
	PERMISSIONS,
	request,
	requestNotifications,
	RESULTS,
	PermissionStatus,
} from 'react-native-permissions';

export type AppPermissionKey = 'notifications' | 'tracking';

export type AppPermissionStatus = {
	key: AppPermissionKey;
	status: PermissionStatus;
};

const getPermission = (_key: Exclude<AppPermissionKey, 'notifications'>): Permission => {
	return PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY;
};

export const requestAppTrackingPermission = async (): Promise<PermissionStatus | null> => {
	if (Platform.OS !== 'ios') return null;
	const permission = PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY;
	const status = await check(permission);
	return status === RESULTS.DENIED ? request(permission) : status;
};

export const getAppPermissionStatuses = async (): Promise<AppPermissionStatus[]> => {
	const notificationStatus = (await checkNotifications()).status;
	const keys: Exclude<AppPermissionKey, 'notifications'>[] = Platform.OS === 'ios' ? ['tracking'] : [];
	const statuses = await Promise.all(keys.map((key) => check(getPermission(key))));

	return [
		{ key: 'notifications', status: notificationStatus },
		...keys.map((key, index) => ({ key, status: statuses[index] })),
	];
};

/** 권한 상태 → 화면에 띄우는 문구 */
export const toPermissionLabel = (status: PermissionStatus) => {
	switch (status) {
		case RESULTS.GRANTED:
			return '허용됨' as const;
		case RESULTS.LIMITED:
			return '제한 허용' as const;
		case RESULTS.BLOCKED:
			return '차단됨' as const;
		case RESULTS.UNAVAILABLE:
			return '지원 안 함' as const;
		default:
			return '미설정' as const;
	}
};

/** 사용자가 직접 손봐야 하는 상태인지 — 설정 화면에서 "설정하기" 버튼을 띄울 기준 */
export const isPermissionActionable = (status: PermissionStatus): boolean =>
	status === RESULTS.DENIED || status === RESULTS.BLOCKED || status === RESULTS.LIMITED;

export const requestAppPermission = async (key: AppPermissionKey): Promise<PermissionStatus> => {
	if (key === 'notifications') {
		const { status } = await requestNotifications(['alert', 'badge', 'sound']);
		// 이미 거부해 둔 알림은 다시 물어봐도 시스템 팝업이 뜨지 않으므로 설정 앱으로 보낸다
		if (status === RESULTS.BLOCKED) {
			await openSettings('application');
		}
		return status;
	}

	const permission = getPermission(key);
	const current = await check(permission);
	if (current === RESULTS.BLOCKED || current === RESULTS.UNAVAILABLE) {
		await openSettings('application');
		return current;
	}
	return request(permission);
};
