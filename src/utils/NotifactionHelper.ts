import notifee, { AlarmType, AndroidImportance, AndroidVisibility, AuthorizationStatus, RepeatFrequency, TriggerType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateUtils from '@/src/utils/DateUtils';
import DailyWordService from '@/src/services/DailyWordService';
import AttendanceService from '@/src/services/AttendanceService';

/**
 * 알림 권한 요청
 * @returns 권한 상태 (boolean)
 */
const RequestNotificationPermission = async (): Promise<boolean> => {
    try {
        const settings = await notifee.requestPermission();
        return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
    } catch (error) {
        console.error('Failed to request notification permission:', error);
        return false;
    }
};

/**
 * 정확한 알람(SCHEDULE_EXACT_ALARM) 대신 쓰는 알람 설정.
 * - 캘린더/알람시계 앱이 아니면 스토어 정책상 정확한 알람 권한을 쓸 수 없습니다.
 * - 도즈 모드에서도 발화하되 시스템이 몇 분 단위로 묶어서 보냅니다.
 */
const ALARM_MANAGER = { type: AlarmType.SET_AND_ALLOW_WHILE_IDLE } as const;

/**
 * 이미 같은 시각(시:분)으로 "앞으로" 예약돼 있는지 확인합니다.
 * - 앱이 포그라운드로 돌아올 때마다 도는 복구 로직이 매번 취소→재생성을 반복하면
 *   Android 알람이 계속 재등록되며 실제 발화 시각이 밀립니다. 유효하면 그대로 둡니다.
 * - 발화 시각이 과거면(앱 업데이트·재부팅으로 알람이 유실됐거나 발화가 밀린 경우)
 *   그대로 두면 다음 복구 시점에 즉시 발화해 "지정한 시간이 아닌 때" 알림이 뜬다.
 *   과거 timestamp 는 무효로 보고 다음 발생 시각으로 다시 잡는다.
 * - 조회에 실패하면 false 를 돌려 기존 동작(재예약)을 유지합니다.
 */
const isScheduledAt = async (id: string, hour: number, minute: number): Promise<boolean> => {
    try {
        const list = await notifee.getTriggerNotifications();
        const found = list.find((t) => t.notification?.id === id);
        const timestamp = (found?.trigger as { timestamp?: number } | undefined)?.timestamp;
        if (!timestamp) return false;
        const { hour: at, minute: min } = DateUtils.getZonedParts(new Date(timestamp));
        if (at !== hour || min !== minute) return false;
        return timestamp > DateUtils.getTimestamp();
    } catch {
        return false;
    }
};

/** 스트릭 리마인더 고정 알림 id (중복 예약 방지/취소용) */
const STREAK_REMINDER_ID = 'streak-reminder';

/**
 * 스트릭 끊김 방지 리마인더 예약 (오늘 미출석 시)
 * - 지정 시각(기본 20:00)에 1회성 알림. 이미 시각이 지났으면 예약하지 않음.
 * - 같은 id로 기존 예약을 먼저 취소해 중복을 방지합니다.
 * @param streak 현재 연속 출석일
 */
const ScheduleStreakReminder = async (streak: number, hour = 20, minute = 0) => {
    try {
        // 기존 예약 취소 (중복 방지)
        if (await isScheduledAt(STREAK_REMINDER_ID, hour, minute)) return;
        await notifee.cancelTriggerNotification(STREAK_REMINDER_ID);

        const now = DateUtils.now();
        const target = DateUtils.getLocalTimeToday(hour, minute);

        // 알림 시각이 이미 지났으면 오늘은 예약하지 않음
        if (target.getTime() <= now.getTime()) {
            return;
        }

        const channelId = await notifee.createChannel({
            id: 'streak-notification',
            name: 'Streak Reminders',
            importance: AndroidImportance.HIGH,
        });

        const body =
            streak > 0
				? `${streak}일 연속 출석 중! 오늘도 출석하고 기록을 이어가세요.`
                : '오늘 출석하고 세계 상식 하나 배워볼까요?';

        await notifee.createTriggerNotification(
            {
                id: STREAK_REMINDER_ID,
                title: '출석 잊지 마세요!',
                body,
                android: {
                    channelId,
                    importance: AndroidImportance.HIGH,
                    pressAction: { id: 'default' },
                    smallIcon: 'ic_notification',
                    visibility: AndroidVisibility.PUBLIC,
                },
                ios: { sound: 'default' },
            },
            {
                type: TriggerType.TIMESTAMP,
                timestamp: target.getTime(),
                alarmManager: ALARM_MANAGER,
            },
        );
    } catch (error) {
        console.error('Failed to schedule streak reminder:', error);
    }
};

/**
 * 스트릭 리마인더 취소 (오늘 출석 완료 시 호출)
 */
const CancelStreakReminder = async () => {
    try {
        await notifee.cancelTriggerNotification(STREAK_REMINDER_ID);
    } catch (error) {
        console.error('Failed to cancel streak reminder:', error);
    }
};

/** 오늘의 상식 아침 알림 고정 id (중복 예약 방지/취소용) */
const DAILY_WORD_REMINDER_ID = 'daily-word-reminder';

/** 오늘의 퀴즈 알림은 오늘의 상식 알림과 별도 ID를 사용해야 서로의 시간을 덮어쓰지 않습니다. */
const TODAY_QUIZ_REMINDER_ID = 'today-quiz-reminder';

/**
 * 오늘의 상식 매일 반복 알림 예약 (기본 08:00)
 * - 같은 id로 기존 예약을 먼저 취소해 중복을 방지합니다.
 */
const ScheduleDailyWordReminder = async (hour = 8, minute = 0) => {
    try {
        if (await isScheduledAt(DAILY_WORD_REMINDER_ID, hour, minute)) return;
        await notifee.cancelTriggerNotification(DAILY_WORD_REMINDER_ID);

        const channelId = await notifee.createChannel({
            id: 'daily-word-notification',
            name: 'Daily Word',
            importance: AndroidImportance.HIGH,
        });

        const target = DateUtils.getNextLocalTime(hour, minute);

        await notifee.createTriggerNotification(
            {
                id: DAILY_WORD_REMINDER_ID,
				title: '오늘의 상식',
                body: '오늘의 세계 상식 하나, 지금 확인해볼까요?',
                android: {
                    channelId,
                    importance: AndroidImportance.HIGH,
                    pressAction: { id: 'default' },
                    smallIcon: 'ic_notification',
                    visibility: AndroidVisibility.PUBLIC,
                },
                ios: { sound: 'default' },
            },
            {
                type: TriggerType.TIMESTAMP,
                timestamp: target.getTime(),
                alarmManager: ALARM_MANAGER,
                repeatFrequency: RepeatFrequency.DAILY,
            },
        );
    } catch (error) {
        console.error('Failed to schedule daily word reminder:', error);
    }
};

/** 오늘의 상식 아침 알림 취소 */
const CancelDailyWordReminder = async () => {
    try {
        await notifee.cancelTriggerNotification(DAILY_WORD_REMINDER_ID);
    } catch (error) {
        console.error('Failed to cancel daily word reminder:', error);
    }
};

/** 오늘의 퀴즈 매일 알림(기본 09:00) */
const ScheduleTodayQuizReminder = async (hour = 9, minute = 0) => {
    try {
        if (await isScheduledAt(TODAY_QUIZ_REMINDER_ID, hour, minute)) return;
        await notifee.cancelTriggerNotification(TODAY_QUIZ_REMINDER_ID);
        const channelId = await notifee.createChannel({
            id: 'today-quiz-notification',
            name: 'Today Quiz',
            importance: AndroidImportance.HIGH,
        });
        const target = DateUtils.getNextLocalTime(hour, minute);
        await notifee.createTriggerNotification(
            {
                id: TODAY_QUIZ_REMINDER_ID,
                title: '오늘의 퀴즈',
                body: '오늘의 세계 상식 퀴즈 5문제를 풀어볼까요?',
                data: { moveToScreen: 'quiz/today' },
                android: {
                    channelId,
                    importance: AndroidImportance.HIGH,
                    pressAction: { id: 'default' },
                    smallIcon: 'ic_notification',
                    visibility: AndroidVisibility.PUBLIC,
                },
                ios: { sound: 'default' },
            },
            {
                type: TriggerType.TIMESTAMP,
                timestamp: target.getTime(),
                alarmManager: ALARM_MANAGER,
                repeatFrequency: RepeatFrequency.DAILY,
            },
        );
    } catch (error) {
        console.error('Failed to schedule today quiz reminder:', error);
    }
};

const CancelTodayQuizReminder = async () => {
    try {
        await notifee.cancelTriggerNotification(TODAY_QUIZ_REMINDER_ID);
    } catch (error) {
        console.error('Failed to cancel today quiz reminder:', error);
    }
};

/**
 * 앱 업데이트/재시작 뒤에도 저장된 사용 시각으로 트리거를 복구합니다.
 * 과거에 두 기능이 공유하던 daily-word-reminder ID도 이 과정에서 정상 시각으로 교정됩니다.
 */
const ReconcileNotificationSchedules = async () => {
    try {
        const settings = await notifee.getNotificationSettings();
        if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) return;

        if (await DailyWordService.isReminderOn()) {
            const { hour, minute } = await DailyWordService.getReminderTime();
            await ScheduleDailyWordReminder(hour, minute);
        } else {
            await CancelDailyWordReminder();
        }

        const todayQuizEnabled = (await AsyncStorage.getItem('TODAY_QUIZ_ALARM_ON')) === '1';
        if (todayQuizEnabled) await ScheduleTodayQuizReminder(9, 0);
        else await CancelTodayQuizReminder();

        // 출석 스트릭 리마인더 — 오늘 아직 출석 안 했을 때만 21시에 알린다(끊기기 직전)
        const attendance = await AttendanceService.getState();
        const checkedToday = await AttendanceService.isCheckedToday();
        if (checkedToday) await CancelStreakReminder();
        else await ScheduleStreakReminder(attendance.streak, 21, 0);
    } catch (error) {
        console.error('Failed to reconcile notification schedules:', error);
    }
};

/** 오답 복습 리마인더 고정 id */
const WRONG_REVIEW_REMINDER_ID = 'wrong-review-reminder';

/**
 * 오답 복습 리마인더 예약 — 다음 날 지정 시각(기본 09:00) 1회 알림
 * - 오답이 쌓였을 때 호출. 같은 id로 기존 예약을 취소해 중복을 방지합니다.
 * - 알림 권한이 없으면 조용히 무시됩니다(가드).
 */
const ScheduleWrongReviewReminder = async (count: number, hour = 9) => {
    try {
        if (count > 0 && (await isScheduledAt(WRONG_REVIEW_REMINDER_ID, hour, 0))) return;
        await notifee.cancelTriggerNotification(WRONG_REVIEW_REMINDER_ID);
        if (count <= 0) return;

        const channelId = await notifee.createChannel({
            id: 'wrong-review-notification',
            name: 'Wrong Review',
            importance: AndroidImportance.HIGH,
        });

        const target = DateUtils.getLocalTimeAfterDays(1, hour);

        await notifee.createTriggerNotification(
            {
                id: WRONG_REVIEW_REMINDER_ID,
                title: '오답 복습 시간이에요',
                body: `어제 틀린 ${count}문제, 지금 다시 풀어볼까요?`,
                android: {
                    channelId,
                    importance: AndroidImportance.HIGH,
                    pressAction: { id: 'default' },
                    smallIcon: 'ic_notification',
                    visibility: AndroidVisibility.PUBLIC,
                },
                ios: { sound: 'default' },
            },
            {
                type: TriggerType.TIMESTAMP,
                timestamp: target.getTime(),
                alarmManager: ALARM_MANAGER,
            },
        );
    } catch (error) {
        console.error('Failed to schedule wrong review reminder:', error);
    }
};

/** 오답 복습 리마인더 취소 (오답노트가 비었을 때) */
const CancelWrongReviewReminder = async () => {
    try {
        await notifee.cancelTriggerNotification(WRONG_REVIEW_REMINDER_ID);
    } catch (error) {
        console.error('Failed to cancel wrong review reminder:', error);
    }
};

export {
    RequestNotificationPermission,
    ScheduleStreakReminder,
    CancelStreakReminder,
    ScheduleDailyWordReminder,
    CancelDailyWordReminder,
	ScheduleTodayQuizReminder,
	CancelTodayQuizReminder,
	ReconcileNotificationSchedules,
    ScheduleWrongReviewReminder,
    CancelWrongReviewReminder,
}
