import {
	CancelDailyNotification,
	CancelReviewReminder,
	CancelStreakReminder,
	RequestNotificationPermission,
	ScheduleReviewReminder,
	ScheduleStreakReminder,
	TriggerDailyNotification,
} from '@/src/utils/NotifactionHelper';

export interface Reminder {
	enabled: boolean;
	hour: number;
	minute: number;
}

/** 스트릭이 끊기기 전에 한 번 찔러 주는 시각 — 잠들기 전이면서 아직 앱을 열 수 있는 때 */
const STREAK_HOUR = 20;
/** 오답 복습을 권하는 시각 — 학습 알림과 겹치지 않게 저녁으로 민다 */
const REVIEW_HOUR = 19;

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
		await TriggerDailyNotification('오늘의 세계 한 바퀴', '출석 체크하고 오늘의 퀴즈 5문제로 하루를 채워요', reminder.hour, reminder.minute);
		return true;
	} catch (e) {
		console.warn('알림 예약 실패:', e);
		return false;
	}
};

/**
 * 학습 알림에 딸린 두 가지 — 스트릭 끊김 알림과 오답 복습 알림.
 * -------------------------------------------------
 * 둘 다 "지금 상태에 따라 걸거나 거두는" 알림이라 설정 스위치를 따로 두지 않는다.
 * 학습 알림을 끈 사람은 이것도 받지 않는다 (알림을 껐는데 다른 알림이 오면 껐다고 볼 수 없다).
 *
 * 반복 알림은 예약할 때의 본문을 그대로 다시 쓴다. 그래서 오답 수가 바뀌면 다시 걸어야
 * 알림에 적힌 숫자가 맞는다 — 앱을 켤 때와 판이 끝날 때 이 함수를 부른다.
 *
 * @param checkedToday 오늘 출석했는지 — 했으면 스트릭 알림을 거둔다
 * @param streak 지금 연속 출석일 (알림 본문에 싣는다)
 * @param wrongCount 오답 노트에 남은 개수 — 0 이면 복습 알림을 거둔다
 */
export const applyActivityReminders = async (
	reminder: Reminder,
	checkedToday: boolean,
	streak: number,
	wrongCount: number,
): Promise<void> => {
	try {
		if (!reminder.enabled) {
			await CancelStreakReminder();
			await CancelReviewReminder();
			return;
		}
		if (checkedToday) {
			await CancelStreakReminder();
		} else {
			await ScheduleStreakReminder(streak, STREAK_HOUR);
		}
		if (wrongCount > 0) {
			await ScheduleReviewReminder(`오답 노트에 ${wrongCount}개가 남아 있어요. 두 번 맞히면 졸업이에요!`, REVIEW_HOUR, 0);
		} else {
			await CancelReviewReminder();
		}
	} catch (e) {
		console.warn('활동 알림 예약 실패:', e);
	}
};
