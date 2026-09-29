/**
 * 햅틱 피드백 유틸 (expo-haptics)
 * - 정답/오답/선택/가벼운 탭 등 상황별 진동 피드백을 공통 함수로 제공
 * - 설치: `npx expo install expo-haptics` 후 dev build 재빌드 필요
 * - 실패해도 앱 흐름에 영향 없도록 항상 안전하게 무시(catch)
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

/** 정답 등 성공 피드백 */
export const hapticSuccess = (): void => {
	if (!enabled) return;
	Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

/** 오답 등 실패 피드백 */
export const hapticError = (): void => {
	if (!enabled) return;
	Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
};

/** 카드 뒤집기 등 가벼운 탭 피드백 */
export const hapticLight = (): void => {
	if (!enabled) return;
	Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/** 항목 선택 피드백 */
export const hapticSelection = (): void => {
	if (!enabled) return;
	Haptics.selectionAsync().catch(() => {});
};

export default { hapticSuccess, hapticError, hapticLight, hapticSelection };
