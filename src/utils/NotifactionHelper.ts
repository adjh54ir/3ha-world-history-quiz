import notifee, { AlarmType, AndroidImportance, AndroidVisibility, AuthorizationStatus, RepeatFrequency, TriggerType } from "@notifee/react-native";
import DateUtils from "@/src/utils/DateUtils";
import { createSerialQueue } from "@/src/utils/SerialQueue";

/**
 * 학습 리마인더는 '캘린더/알람 시계' 앱이 아니므로 USE_EXACT_ALARM / SCHEDULE_EXACT_ALARM 을 쓸 수 없다
 * (Google Play 정책 위반 — 두 권한 모두 매니페스트에서 제거함).
 * ALLOW_WHILE_IDLE 은 권한 없이도 Doze 모드를 뚫고 울리며, 지정 시각에서 크게 벗어나지 않는다.
 */
const IDLE_ALARM = { type: AlarmType.SET_AND_ALLOW_WHILE_IDLE } as const;

/** 반복 알림 고정 id — 재예약 시 기존 것을 덮어쓰기 위함 */
const DAILY_NOTIFICATION_ID = 'daily-notification';
const WEEKLY_NOTIFICATION_ID = 'weekly-notification';

/**
 * 예약/취소를 한 줄로 세워 순서대로 처리한다.
 * 예약 한 번은 cancel → create 두 단계라 원자적이지 않다. 호출이 겹치면 옛 시각이 마지막에 남는다.
 * ("지정한 시간이 아닌 시각으로 계속 바뀌는" 증상의 원인 — SerialQueue.test.ts 에 재현/검증)
 */
const serialize = createSerialQueue();

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
 * 즉시 푸시메시지 전송
 * @param title 
 * @param body 
 */
const DirectNotification = async (title: string, body: string) => {
    try {
        const channelId = await notifee.createChannel({
            id: 'immediate-notification-silent',
            name: 'Immediate Notifications',
            importance: AndroidImportance.HIGH,
            // 진동은 쓰지 않는다. 채널 설정은 생성 뒤 못 바꾸므로 id 에 -silent 를 붙여 새로 만든다
            vibration: false,
        });

        await notifee.displayNotification({
            title,
            body,
            android: {
                channelId,
                importance: AndroidImportance.HIGH,
                pressAction: {
                    id: 'default',
                },
                smallIcon: 'ic_launcher_adaptive_fore',
                visibility: AndroidVisibility.PUBLIC,
            },
            ios: {
                sound: 'default',
            },
        });
    } catch (error) {
        console.error('Failed to send immediate notification:', error);
    }
}

/**
 * 매일 반복 푸시 메시지 전송
 * @param title 제목
 * @param body 내용
 * @param hour 시간 (0-23)
 * @param minute 분 (0-59)
 */
const TriggerDailyNotification = (
    title: string,
    body: string,
    hour: number,
    minute: number,
) => serialize(async () => {
    try {
        const channelId = await notifee.createChannel({
            id: 'daily-notification-silent',
            name: 'Daily Notifications',
            importance: AndroidImportance.HIGH,
            // 진동은 쓰지 않는다. 채널 설정은 생성 뒤 못 바꾸므로 id 에 -silent 를 붙여 새로 만든다
            vibration: false,
        });

        // 내 타임존 기준으로 "다음에 돌아올 hour:minute" — 오늘 시각이 지났으면 내일로 넘어간다
        const targetDate = DateUtils.getNextLocalOccurrence(hour, minute);

        // 고정 id — 없으면 호출할 때마다 예약이 쌓여 알림 시각이 제각각으로 늘어난다
        await notifee.cancelTriggerNotification(DAILY_NOTIFICATION_ID);
        await notifee.createTriggerNotification(
            {
                id: DAILY_NOTIFICATION_ID,
                title,
                body,
                android: {
                    channelId,
                    importance: AndroidImportance.HIGH,
                    pressAction: {
                        id: 'default',
                    },
                    smallIcon: 'ic_launcher_adaptive_fore',
                    visibility: AndroidVisibility.PUBLIC,
                },
                ios: {
                    sound: 'default',
                },
            },
            {
                type: TriggerType.TIMESTAMP,
                timestamp: targetDate.getTime(),
                repeatFrequency: RepeatFrequency.DAILY,
                alarmManager: IDLE_ALARM,
            }
        );
    } catch (error) {
        console.error('Failed to schedule daily notification:', error);
    }
})

/**
 * 주간 반복 푸시 메시지 전송
 * @param title 제목
 * @param body 내용
 * @param hour 시간 (0-23)
 * @param minute 분 (0-59)
 * @param dayOfWeek 요일 (0-6, 일요일부터 시작)
 */
const TriggerWeeklyNotification = (
    title: string,
    body: string,
    hour: number,
    minute: number,
    dayOfWeek: number,
) => serialize(async () => {
    try {
        const channelId = await notifee.createChannel({
            id: 'weekly-notification-silent',
            name: 'Weekly Notifications',
            importance: AndroidImportance.HIGH,
            // 진동은 쓰지 않는다. 채널 설정은 생성 뒤 못 바꾸므로 id 에 -silent 를 붙여 새로 만든다
            vibration: false,
        });

        // 내 타임존 기준으로 다음 hour:minute 을 먼저 잡고, 거기서 원하는 요일까지 밀어 준다
        // (요일 보정을 먼저 하면 "오늘이 지났으니 +1일" 때문에 한 주가 통째로 어긋난다)
        const targetDate = DateUtils.getNextLocalOccurrence(hour, minute);
        const daysUntilTarget = (dayOfWeek - DateUtils.getLocalDayOfWeek(targetDate) + 7) % 7;
        targetDate.setDate(targetDate.getDate() + daysUntilTarget);

        await notifee.cancelTriggerNotification(WEEKLY_NOTIFICATION_ID);
        await notifee.createTriggerNotification(
            {
                id: WEEKLY_NOTIFICATION_ID,
                title,
                body,
                android: {
                    channelId,
                    importance: AndroidImportance.HIGH,
                    pressAction: {
                        id: 'default',
                    },
                    smallIcon: 'ic_launcher_adaptive_fore',
                    visibility: AndroidVisibility.PUBLIC,
                },
                ios: {
                    sound: 'default',
                },
            },
            {
                type: TriggerType.TIMESTAMP,
                timestamp: targetDate.getTime(),
                repeatFrequency: RepeatFrequency.WEEKLY,
                alarmManager: IDLE_ALARM,
            }
        );
    } catch (error) {
        console.error('Failed to schedule weekly notification:', error);
    }
})

/** 스트릭 리마인더 고정 알림 id (중복 예약 방지/취소용) */
const STREAK_REMINDER_ID = 'streak-reminder';

/**
 * 스트릭 끊김 방지 리마인더 예약 (오늘 미출석 시)
 * - 지정 시각(기본 20:00)에 1회성 알림. 이미 시각이 지났으면 예약하지 않음.
 * - 같은 id로 기존 예약을 먼저 취소해 중복을 방지합니다.
 * @param streak 현재 연속 출석일
 */
const ScheduleStreakReminder = (streak: number, hour = 20, minute = 0) => serialize(async () => {
    try {
        // 기존 예약 취소 (중복 방지)
        await notifee.cancelTriggerNotification(STREAK_REMINDER_ID);

        const target = DateUtils.createLocalDateAtTime(hour, minute);

        // 알림 시각이 이미 지났으면 오늘은 예약하지 않음
        if (target.getTime() <= DateUtils.nowTime()) {
            return;
        }

        const channelId = await notifee.createChannel({
            id: 'streak-notification-silent',
            name: 'Streak Reminders',
            importance: AndroidImportance.HIGH,
            // 진동은 쓰지 않는다. 채널 설정은 생성 뒤 못 바꾸므로 id 에 -silent 를 붙여 새로 만든다
            vibration: false,
        });

        const body =
            streak > 0
                ? `🔥 ${streak}일 연속 학습 중! 오늘 아직 안 했어요 — 지금 하면 기록이 이어져요.`
                : '오늘 한 문제만 풀어도 연속 학습이 시작돼요.';

        await notifee.createTriggerNotification(
            {
                id: STREAK_REMINDER_ID,
                title: '연속 학습이 끊길 수 있어요',
                body,
                android: {
                    channelId,
                    importance: AndroidImportance.HIGH,
                    pressAction: { id: 'default' },
                    smallIcon: 'ic_launcher_adaptive_fore',
                    visibility: AndroidVisibility.PUBLIC,
                },
                ios: { sound: 'default' },
            },
            {
                type: TriggerType.TIMESTAMP,
                timestamp: target.getTime(),
                alarmManager: IDLE_ALARM,
            },
        );
    } catch (error) {
        console.error('Failed to schedule streak reminder:', error);
    }
});

/**
 * 스트릭 리마인더 취소 (오늘 출석 완료 시 호출)
 */
const CancelStreakReminder = () => serialize(async () => {
    try {
        await notifee.cancelTriggerNotification(STREAK_REMINDER_ID);
    } catch (error) {
        console.error('Failed to cancel streak reminder:', error);
    }
});

/** 아침 알림 고정 id (중복 예약 방지/취소용) */
const DAILY_WORD_REMINDER_ID = 'daily-word-reminder';

/**
 * 아침 학습 알림 매일 반복 예약 (기본 08:00)
 * - 같은 id로 기존 예약을 먼저 취소해 중복을 방지합니다.
 */
const ScheduleDailyWordReminder = (hour = 8, minute = 0) => serialize(async () => {
    try {
        await notifee.cancelTriggerNotification(DAILY_WORD_REMINDER_ID);

        const channelId = await notifee.createChannel({
            id: 'daily-word-notification-silent',
            name: 'Daily Word',
            importance: AndroidImportance.HIGH,
            // 진동은 쓰지 않는다. 채널 설정은 생성 뒤 못 바꾸므로 id 에 -silent 를 붙여 새로 만든다
            vibration: false,
        });

        const target = DateUtils.getNextLocalOccurrence(hour, minute);

        await notifee.createTriggerNotification(
            {
                id: DAILY_WORD_REMINDER_ID,
                title: '📚 오늘의 세계 상식',
                body: '오늘의 문제 다섯 개, 지금 풀어 볼까요?',
                android: {
                    channelId,
                    importance: AndroidImportance.HIGH,
                    pressAction: { id: 'default' },
                    smallIcon: 'ic_launcher_adaptive_fore',
                    visibility: AndroidVisibility.PUBLIC,
                },
                ios: { sound: 'default' },
            },
            {
                type: TriggerType.TIMESTAMP,
                timestamp: target.getTime(),
                repeatFrequency: RepeatFrequency.DAILY,
                alarmManager: IDLE_ALARM,
            },
        );
    } catch (error) {
        console.error('Failed to schedule daily word reminder:', error);
    }
});

/** 아침 학습 알림 취소 */
const CancelDailyWordReminder = () => serialize(async () => {
    try {
        await notifee.cancelTriggerNotification(DAILY_WORD_REMINDER_ID);
    } catch (error) {
        console.error('Failed to cancel daily word reminder:', error);
    }
});

/** 매일 반복 알림(TriggerDailyNotification) 취소 */
const CancelDailyNotification = () => serialize(async () => {
    try {
        await notifee.cancelTriggerNotification(DAILY_NOTIFICATION_ID);
    } catch (error) {
        console.error('Failed to cancel daily notification:', error);
    }
});

/** 오답 복습 알림 고정 id (중복 예약 방지/취소용) */
const REVIEW_REMINDER_ID = 'review-reminder';

/**
 * 오답 복습 매일 반복 알림 예약
 * - 본문에 오늘 복습할 개수를 실어 알림만 봐도 할 일을 알 수 있게 한다.
 * - 반복 알림은 예약 당시 본문을 그대로 재사용하므로, 앱을 켤 때 다시 걸어 숫자를 갱신한다.
 */
const ScheduleReviewReminder = (body: string, hour: number, minute: number) => serialize(async () => {
    try {
        await notifee.cancelTriggerNotification(REVIEW_REMINDER_ID);

        const channelId = await notifee.createChannel({
            id: 'review-notification-silent',
            name: 'Review Reminders',
            importance: AndroidImportance.HIGH,
            // 진동은 쓰지 않는다
            vibration: false,
        });

        const target = DateUtils.getNextLocalOccurrence(hour, minute);

        await notifee.createTriggerNotification(
            {
                id: REVIEW_REMINDER_ID,
                title: '오답 복습을 해보세요!',
                body,
                android: {
                    channelId,
                    importance: AndroidImportance.HIGH,
                    pressAction: { id: 'default' },
                    smallIcon: 'ic_launcher_adaptive_fore',
                    visibility: AndroidVisibility.PUBLIC,
                },
                ios: { sound: 'default' },
            },
            {
                type: TriggerType.TIMESTAMP,
                timestamp: target.getTime(),
                repeatFrequency: RepeatFrequency.DAILY,
                alarmManager: IDLE_ALARM,
            },
        );
    } catch (error) {
        console.error('Failed to schedule review reminder:', error);
    }
});

/** 오답 복습 알림 취소 */
const CancelReviewReminder = () => serialize(async () => {
    try {
        await notifee.cancelTriggerNotification(REVIEW_REMINDER_ID);
    } catch (error) {
        console.error('Failed to cancel review reminder:', error);
    }
});

export {
    RequestNotificationPermission,
    DirectNotification,
    TriggerDailyNotification,
    CancelDailyNotification,
    TriggerWeeklyNotification,
    ScheduleStreakReminder,
    CancelStreakReminder,
    ScheduleDailyWordReminder,
    CancelDailyWordReminder,
    ScheduleReviewReminder,
    CancelReviewReminder,
}