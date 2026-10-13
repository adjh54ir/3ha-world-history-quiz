import notifee, { AlarmType, AndroidImportance, AndroidVisibility, AuthorizationStatus, RepeatFrequency, TriggerType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateUtils from '@/src/utils/DateUtils';
import DailyWordService from '@/src/services/DailyWordService';
import AttendanceService from '@/src/services/AttendanceService';
import i18n from '@/src/translations';

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
 * - 지정 시각(기본 21:00)에 1회성 알림. 이미 시각이 지났으면 예약하지 않음.
 * - 같은 id로 기존 예약을 먼저 취소해 중복을 방지합니다.
 * @param streak 현재 연속 출석일
 */
const ScheduleStreakReminder = async (streak: number, hour = 21, minute = 0) => {
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
				? i18n.t('svc.notification.streakBodyOn', { streak })
                : i18n.t('svc.notification.streakBodyOff');

        await notifee.createTriggerNotification(
            {
                id: STREAK_REMINDER_ID,
                title: i18n.t('svc.notification.streakTitle'),
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
				title: i18n.t('svc.notification.dailyWordTitle'),
                body: i18n.t('svc.notification.dailyWordBody'),
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

/** 오늘의 퀴즈 알림 시각 저장 키 (켜짐 여부는 TODAY_QUIZ_ALARM_ON) */
const TODAY_QUIZ_TIME_KEY = 'TODAY_QUIZ_ALARM_TIME';
const TODAY_QUIZ_DEFAULT_TIME = { hour: 9, minute: 0 };

/** 사용자가 고른 오늘의 퀴즈 알림 시각 (없거나 깨졌으면 09:00) */
const GetTodayQuizReminderTime = async (): Promise<{ hour: number; minute: number }> => {
    try {
        const raw = await AsyncStorage.getItem(TODAY_QUIZ_TIME_KEY);
        const v = raw ? (JSON.parse(raw) as { hour: number; minute: number }) : null;
        const valid = !!v && Number.isInteger(v.hour) && Number.isInteger(v.minute) && v.hour >= 0 && v.hour < 24 && v.minute >= 0 && v.minute < 60;
        return valid ? v! : TODAY_QUIZ_DEFAULT_TIME;
    } catch {
        return TODAY_QUIZ_DEFAULT_TIME;
    }
};

const SetTodayQuizReminderTime = async (time: { hour: number; minute: number }) => {
    await AsyncStorage.setItem(TODAY_QUIZ_TIME_KEY, JSON.stringify(time));
};

/**
 * 알림 미리 받아보기 — 지금 바로 한 번 띄워 알림이 제대로 오는지 확인한다.
 * @return 권한이 없거나 실패하면 false
 */
const SendTestNotification = async (): Promise<boolean> => {
    try {
        if (!(await RequestNotificationPermission())) return false;
        const channelId = await notifee.createChannel({
            id: 'daily-word-notification',
            name: 'Daily Word',
            importance: AndroidImportance.HIGH,
        });
        await notifee.displayNotification({
            id: 'test-notification',
            title: i18n.t('svc.notification.testTitle'),
            body: i18n.t('svc.notification.testBody'),
            android: {
                channelId,
                importance: AndroidImportance.HIGH,
                pressAction: { id: 'default' },
                smallIcon: 'ic_notification',
                visibility: AndroidVisibility.PUBLIC,
            },
            ios: { sound: 'default', foregroundPresentationOptions: { banner: true, list: true, sound: true } },
        });
        return true;
    } catch (error) {
        console.error('Failed to send test notification:', error);
        return false;
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
                title: i18n.t('svc.notification.todayQuizTitle'),
                body: i18n.t('svc.notification.todayQuizBody'),
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
        if (todayQuizEnabled) {
            const { hour, minute } = await GetTodayQuizReminderTime();
            await ScheduleTodayQuizReminder(hour, minute);
        }
        else await CancelTodayQuizReminder();

        // 출석 스트릭 리마인더 — 오늘 아직 출석 안 했을 때만 21시에 알린다(끊기기 직전)
        const attendance = await AttendanceService.getState();
        const checkedToday = await AttendanceService.isCheckedToday();
        if (checkedToday) await CancelStreakReminder();
        else {
            await ScheduleStreakReminder(attendance.streak, 21, 0);
            // 예약하는 사이 홈 진입 자동 출석이 끝났을 수 있다 — 그쪽 취소가 먼저 돌았으면 방금 만든 예약이 살아남는다
            if (await AttendanceService.isCheckedToday()) await CancelStreakReminder();
        }
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
 * @param count 문구에 넣을 개수. 함수를 넘기면 실제 알림 시각을 받아 '그 시각까지 복습할 차례가 되는 수'를 센다.
 */
const ScheduleWrongReviewReminder = async (count: number | ((at: number) => Promise<number>), hour = 9) => {
    try {
        // 이미 앞으로 울릴 예약이 있으면 그 시각은 그대로 두고 문구의 개수만 갱신한다
        // (아침에 퀴즈를 풀었다고 오늘 9시 알림이 내일로 밀리면 안 된다)
        let existingAt: number | undefined;
        if (await isScheduledAt(WRONG_REVIEW_REMINDER_ID, hour, 0)) {
            const found = (await notifee.getTriggerNotifications()).find((t) => t.notification?.id === WRONG_REVIEW_REMINDER_ID);
            existingAt = (found?.trigger as { timestamp?: number } | undefined)?.timestamp;
        }
        const countAt = (at: number) => (typeof count === 'function' ? count(at) : Promise.resolve(count));
        let targetAt = existingAt ?? DateUtils.getLocalTimeAfterDays(1, hour).getTime();
        let n = await countAt(targetAt);
        // 오늘 예약분은 이미 다 복습했고 새로 틀린 문제만 남았다면(내일 차례) 내일 같은 시각으로 넘긴다
        if (n <= 0 && existingAt !== undefined) {
            targetAt = DateUtils.getLocalTimeAfterDays(1, hour).getTime();
            n = await countAt(targetAt);
        }
        await notifee.cancelTriggerNotification(WRONG_REVIEW_REMINDER_ID);
        if (n <= 0) return;

        const channelId = await notifee.createChannel({
            id: 'wrong-review-notification',
            name: 'Wrong Review',
            importance: AndroidImportance.HIGH,
        });

        await notifee.createTriggerNotification(
            {
                id: WRONG_REVIEW_REMINDER_ID,
                title: i18n.t('svc.notification.wrongReviewTitle'),
                body: i18n.t('svc.notification.wrongReviewBody', { n }),
                // 누르면 바로 오답 복습으로
                data: { moveToScreen: 'quiz/wrong-review' },
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
                timestamp: targetAt,
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
	GetTodayQuizReminderTime,
	SetTodayQuizReminderTime,
	SendTestNotification,
	ReconcileNotificationSchedules,
    ScheduleWrongReviewReminder,
    CancelWrongReviewReminder,
}
