import { Stack } from 'expo-router';
import Colors from '@/src/const/ConstColors';

/**
 * 학습 플로우 — 주제 선택 → 카드 학습 → 확인 퀴즈
 * 학습/퀴즈 진행 중에는 스와이프 뒤로가기를 막습니다.
 */
export default function LearnLayout() {
	return (
		<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background }, animation: 'slide_from_right' }}>
			<Stack.Screen name="category" options={{ gestureEnabled: true }} />
			<Stack.Screen name="study" options={{ gestureEnabled: false }} />
			<Stack.Screen name="quiz" options={{ gestureEnabled: false }} />
			<Stack.Screen name="bundle" options={{ gestureEnabled: false }} />
		</Stack>
	);
}
