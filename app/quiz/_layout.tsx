import { Stack } from 'expo-router';
import Colors from '@/src/const/ConstColors';

/**
 * 퀴즈 모드 플로우 — 진행 중 이탈 방지를 위해 스와이프 뒤로가기 비활성화
 */
export default function QuizLayout() {
	return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background }, animation: 'slide_from_right', gestureEnabled: false }} />;
}
