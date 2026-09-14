/* Jest 공통 셋업 — AsyncStorage 인메모리 목 */
jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/* notifee 네이티브 모듈 목 — 서비스가 알림 예약을 호출해도 테스트가 네이티브에 의존하지 않게 한다 */
jest.mock('@notifee/react-native', () => ({
	__esModule: true,
	default: {
		requestPermission: jest.fn(async () => ({ authorizationStatus: 1 })),
		getNotificationSettings: jest.fn(async () => ({ authorizationStatus: 1, android: { alarm: 1 } })),
		openAlarmPermissionSettings: jest.fn(async () => {}),
		createChannel: jest.fn(async ({ id }) => id),
		createTriggerNotification: jest.fn(async () => {}),
		cancelTriggerNotification: jest.fn(async () => {}),
		getTriggerNotifications: jest.fn(async () => []),
		displayNotification: jest.fn(async () => {}),
	},
	AlarmType: { SET_AND_ALLOW_WHILE_IDLE: 1 },
	AndroidImportance: { HIGH: 4 },
	AndroidNotificationSetting: { ENABLED: 1 },
	AndroidVisibility: { PUBLIC: 1 },
	AuthorizationStatus: { AUTHORIZED: 1 },
	RepeatFrequency: { DAILY: 0, WEEKLY: 1 },
	TriggerType: { TIMESTAMP: 0 },
}));
