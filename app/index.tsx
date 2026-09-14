import { Redirect } from 'expo-router';

/** 앱 진입점: 메인 탭의 홈으로 */
export default function Index() {
	return <Redirect href="/main/home" />;
}
