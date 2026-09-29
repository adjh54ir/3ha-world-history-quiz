import { Redirect } from 'expo-router';

/**
 * 앱 진입점: 홈 탭으로 이동.
 */
export default function Index() {
	return <Redirect href="/home" />;
}
