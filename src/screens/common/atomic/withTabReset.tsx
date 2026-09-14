import React, { ComponentType, useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from 'expo-router';

/**
 * 탭 화면을 "누를 때마다 처음 상태"로 되돌리는 래퍼
 * -------------------------------------------------
 * React Navigation 7 에서 unmountOnBlur 가 빠지면서, 탭을 옮겼다 돌아와도
 * 스크롤 위치·펼침 상태·선택값이 그대로 남는다. 화면마다 초기화 코드를 넣는 대신
 * key 를 갈아 끼워 자식 트리를 통째로 다시 만든다 (useState 초깃값부터 다시 잡힌다).
 *
 * - 탭 버튼을 누르면(이미 그 탭에 있어도) 초기화
 * - 다른 화면에 갔다가 탭으로 돌아와도 초기화
 */
const withTabReset = <P extends object>(Screen: ComponentType<P>) => {
	const TabResettableScreen = (props: P) => {
		const navigation = useNavigation();
		const [resetKey, setResetKey] = useState(0);

		// 탭 버튼 터치 — 같은 탭을 다시 눌러도 처음 상태로 돌린다
		React.useEffect(() => {
			const unsubscribe = navigation.addListener('tabPress' as never, () => {
				setResetKey((key) => key + 1);
			});
			return unsubscribe;
		}, [navigation]);

		// 화면을 벗어날 때 다음 진입을 위해 미리 새 key 를 잡아 둔다
		useFocusEffect(
			useCallback(() => {
				return () => setResetKey((key) => key + 1);
			}, []),
		);

		return <Screen key={resetKey} {...props} />;
	};

	TabResettableScreen.displayName = `withTabReset(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
	return TabResettableScreen;
};

export default withTabReset;
