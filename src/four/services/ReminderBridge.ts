/**
 * 이식 화면의 알림 예약 → 앱의 매일 알림 하나로 잇는다
 * -------------------------------------------------
 * 옮겨 온 오늘의 퀴즈 화면은 자기 알림('daily-quiz-reminder')을 직접 예약했다.
 * 그런데 이 앱은 설정 탭·LifeWatcher 가 이미 매일 알림('daily-notification')을 걸고 있어,
 * 그대로 두면 **하루에 알림이 두 번 오고 시각을 고치는 곳도 두 군데**가 된다.
 *
 * 그래서 예약·해제만 이 다리를 지나가게 하고, 실제 알림은 앱 것 하나로 남긴다.
 * 설정 탭이 보는 값(redux reminder)도 같이 맞춰 둔다 — 두 화면이 같은 시각을 보여야 한다.
 */
import { Store } from '@/src/store/Store';
import { setReminder } from '@/src/store/slice/LifeSlice';
import { applyReminder, type Reminder } from '@/src/services/life/LifeReminder';

/** 지금 걸려 있는 앱 알림 설정 — 설정 탭에서 바꾼 값도 여기로 들어온다 */
export const readAppReminder = (): Reminder => Store.getState().life.reminder;

/** 예약 — 권한이 거부되면 false. 그때는 켜진 것으로 저장하지 않는다 */
export const scheduleAppReminder = async (hour: number, minute = 0): Promise<boolean> => {
	const granted = await applyReminder({ enabled: true, hour, minute });
	Store.dispatch(setReminder({ enabled: granted, hour, minute }));
	return granted;
};

/** 해제 — 시각은 그대로 두고 끈 상태만 저장한다 (다시 켤 때 마지막 시각을 쓴다) */
export const cancelAppReminder = async (): Promise<void> => {
	const { hour, minute } = Store.getState().life.reminder;
	await applyReminder({ enabled: false, hour, minute });
	Store.dispatch(setReminder({ enabled: false, hour, minute }));
};
