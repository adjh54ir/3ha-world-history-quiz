import { Stack } from 'expo-router';
import Colors from '@/src/const/ConstColors';

/**
 * 특별 콘텐츠 — 테스트/탐색/성장 요소 모음
 * 테스트 진행형 화면만 스와이프 뒤로가기를 막습니다.
 */
export default function SpecialLayout() {
	return (
		<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background }, animation: 'slide_from_right', gestureEnabled: true }}>
			<Stack.Screen name="level-test" options={{ gestureEnabled: false }} />
			<Stack.Screen name="type-test" options={{ gestureEnabled: false }} />
			<Stack.Screen name="weak-focus" options={{ gestureEnabled: false }} />
			<Stack.Screen name="shorts" options={{ gestureEnabled: false }} />
		</Stack>
	);
}
