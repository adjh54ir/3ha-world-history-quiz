jest.mock('@notifee/react-native', () => {
	const api = {
		cancelTriggerNotification: jest.fn(async () => {}),
		createChannel: jest.fn(async ({ id }: { id: string }) => id),
		createTriggerNotification: jest.fn(async () => {}),
		getNotificationSettings: jest.fn(async () => ({ authorizationStatus: 1, android: { alarm: 1 } })),
		getTriggerNotifications: jest.fn(async () => [] as unknown[]),
		openAlarmPermissionSettings: jest.fn(async () => {}),
	};
	return {
		__esModule: true,
		default: api,
		AlarmType: { SET: 0, SET_AND_ALLOW_WHILE_IDLE: 1, SET_EXACT: 2, SET_EXACT_AND_ALLOW_WHILE_IDLE: 3, SET_ALARM_CLOCK: 4 },
		AndroidImportance: { HIGH: 4 },
		AndroidNotificationSetting: { ENABLED: 1 },
		AndroidVisibility: { PUBLIC: 1 },
		AuthorizationStatus: { AUTHORIZED: 1 },
		RepeatFrequency: { DAILY: 0, WEEKLY: 1 },
		TriggerType: { TIMESTAMP: 0 },
	};
});

jest.mock('@/src/services/DailyWordService', () => ({
	__esModule: true,
	default: {
		isReminderOn: jest.fn(async () => false),
		getReminderTime: jest.fn(async () => ({ hour: 8, minute: 0 })),
	},
}));

import { ScheduleDailyWordReminder, ScheduleTodayQuizReminder } from '@/src/utils/NotifactionHelper';

const notifeeMock = jest.requireMock('@notifee/react-native').default as {
	cancelTriggerNotification: jest.Mock;
	createTriggerNotification: jest.Mock;
	getTriggerNotifications: jest.Mock;
};

describe('notification schedule isolation', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		notifeeMock.getTriggerNotifications.mockResolvedValue([]);
	});

	it('이미 같은 시각으로 예약돼 있으면 재예약하지 않는다 (반복 호출로 알람이 밀리는 문제 방지)', async () => {
		const at = new Date();
		at.setHours(at.getHours() + 1, 30, 0, 0);
		notifeeMock.getTriggerNotifications.mockResolvedValue([
			{ notification: { id: 'daily-word-reminder' }, trigger: { timestamp: at.getTime() } },
		]);

		await ScheduleDailyWordReminder(at.getHours(), 30);
		expect(notifeeMock.cancelTriggerNotification).not.toHaveBeenCalled();
		expect(notifeeMock.createTriggerNotification).not.toHaveBeenCalled();

		// 시각이 바뀌면 다시 예약한다
		await ScheduleDailyWordReminder(at.getHours(), 45);
		expect(notifeeMock.createTriggerNotification).toHaveBeenCalledTimes(1);
	});

	it('발화 시각이 과거면(앱 업데이트·재부팅으로 유실) 다음 발생 시각으로 다시 잡는다', async () => {
		// 과거 timestamp 를 그대로 두면 복구 시점에 즉시 발화해 지정하지 않은 시간에 알림이 뜬다
		const fired = new Date();
		fired.setDate(fired.getDate() - 1);
		fired.setHours(8, 20, 0, 0);
		notifeeMock.getTriggerNotifications.mockResolvedValue([{ notification: { id: 'daily-word-reminder' }, trigger: { timestamp: fired.getTime() } }]);

		await ScheduleDailyWordReminder(8, 20);
		expect(notifeeMock.createTriggerNotification).toHaveBeenCalledTimes(1);
		expect(notifeeMock.createTriggerNotification.mock.calls[0][1].alarmManager).toEqual({ type: 1 });
		// 다시 잡은 시각은 반드시 미래여야 한다
		expect(notifeeMock.createTriggerNotification.mock.calls[0][1].timestamp).toBeGreaterThan(Date.now());
	});

	it('uses separate stable ids so updating one reminder cannot change the other time', async () => {
		await ScheduleDailyWordReminder(8, 20);
		await ScheduleTodayQuizReminder(9, 0);

		expect(notifeeMock.cancelTriggerNotification).toHaveBeenNthCalledWith(1, 'daily-word-reminder');
		expect(notifeeMock.cancelTriggerNotification).toHaveBeenNthCalledWith(2, 'today-quiz-reminder');
		expect(notifeeMock.createTriggerNotification.mock.calls[0][0].id).toBe('daily-word-reminder');
		expect(notifeeMock.createTriggerNotification.mock.calls[1][0].id).toBe('today-quiz-reminder');
		expect(notifeeMock.createTriggerNotification.mock.calls[0][1].timestamp).not.toBe(notifeeMock.createTriggerNotification.mock.calls[1][1].timestamp);
	});
});
