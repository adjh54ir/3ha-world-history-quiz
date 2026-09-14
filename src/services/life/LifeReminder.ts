import { CancelDailyNotification, RequestNotificationPermission, TriggerDailyNotification } from '@/src/utils/NotifactionHelper';

export interface Reminder {
	enabled: boolean;
	hour: number;
	minute: number;
}

/**
 * 매일 학습 알림을 설정값대로 다시 건다.
 * - 켤 때는 권한을 먼저 받는다. 거부되면 false 를 돌려 화면이 스위치를 되돌린다.
 * - 앱을 켤 때마다 다시 걸어도 안전하다 (고정 id 로 예약이 쌓이지 않는다).
 */
export const applyReminder = async (reminder: Reminder): Promise<boolean> => {
	try {
		if (!reminder.enabled) {
			await CancelDailyNotification();
			return true;
		}
		const granted = await RequestNotificationPermission();
		if (!granted) {
			return false;
		}
		await TriggerDailyNotification('오늘의 한자 한 줌', '출석 체크하고 오늘의 퀴즈 5문제로 하루를 채워요', reminder.hour, reminder.minute);
		return true;
	} catch (e) {
		console.warn('알림 예약 실패:', e);
		return false;
	}
};
