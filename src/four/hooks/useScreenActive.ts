import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useIsFocused } from '@/src/four/navigation/compat';

/**
 * 화면이 "실제로 사용 중"인지 판단한다 — 네비게이션 포커스 + 앱 포그라운드를 함께 본다.
 *
 * 퀴즈 타이머는 화면이 언마운트될 때만 정리되기 때문에,
 *  - 다른 화면을 위로 띄우거나(스택이 유지됨)
 *  - 앱을 백그라운드로 보내면
 * 타이머가 계속 돌아 시간이 깎이고 효과음까지 났다. 모든 타이머를 이 값으로 함께 잠근다.
 */
export const useScreenActive = (): boolean => {
	const isFocused = useIsFocused();
	const [isForeground, setIsForeground] = useState(AppState.currentState === 'active');

	useEffect(() => {
		const sub = AppState.addEventListener('change', (state: AppStateStatus) => setIsForeground(state === 'active'));
		return () => sub.remove();
	}, []);

	return isFocused && isForeground;
};

export default useScreenActive;
