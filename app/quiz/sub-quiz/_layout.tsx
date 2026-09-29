import { Stack } from 'expo-router';
import Colors from '@/src/const/ConstColors';

export default function SubQuizLayout() {
	return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background }, animation: 'slide_from_right', gestureEnabled: true }} />;
}
