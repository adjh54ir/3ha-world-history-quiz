import { useFocusEffect } from '@/src/four/navigation/compat';
import { BackHandler } from 'react-native';
import { useCallback } from 'react';

/**
 * 뒤로가기(BackHandler)를 차단하는 커스텀 훅
 *
 * 사용방법 : 최상위에 넣음.
 * useBlockBackHandler(true); // 뒤로가기 모션 막기
 * 
 * 
 * ⭐️⭐️⭐️⭐️⭐️ iOS에서는 Navigation 내에 아래의 옵션을 두어서 막음
 * gestureEnabled: false, // ✅ 제스처로 뒤로 가기 방지
 *
 * @param condition - true일 때만 뒤로가기를 막음
 */
export const useBlockBackHandler = (condition: boolean = true) => {
	useFocusEffect(
		useCallback(() => {
			if (!condition) {
				return;
			}

			const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);

			return () => {
				subscription.remove(); // ✅ 이렇게 remove() 호출
			};
		}, [condition]),
	);
};
