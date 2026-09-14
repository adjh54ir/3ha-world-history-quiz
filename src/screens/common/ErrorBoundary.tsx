import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { reportFatal } from '@/src/utils/CrashReport';

interface Props {
	children: React.ReactNode;
}

interface State {
	error: Error | null;
}

/**
 * 화면 렌더 중 터진 예외를 여기서 잡는다.
 * -------------------------------------------------
 * 이게 없으면 릴리스 빌드에서 화면이 하얗게 비고 빠져나갈 길이 없다 (콘솔도 막혀 있다).
 * 잡은 오류는 Crashlytics 로 올리고, 사용자에게는 다시 그려 볼 버튼 하나만 준다.
 *
 * 색은 테마 훅을 쓰지 않고 직접 적는다 — 테마 Provider 안에서 터진 오류도 이 화면이 받아야 한다.
 */
class ErrorBoundary extends React.Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		reportFatal(error, info.componentStack ?? undefined);
		// 첫 렌더에서 터지면 네이티브 스플래시를 걷는 코드(AnimatedSplash)까지 못 간다 —
		// 그대로 두면 이 화면이 스플래시에 가려 영영 안 보인다.
		SplashScreen.hideAsync().catch(() => undefined);
	}

	private retry = () => this.setState({ error: null });

	render() {
		if (!this.state.error) {
			return this.props.children;
		}
		return (
			<View style={styles.screen}>
				<Text style={styles.title}>잠시 문제가 생겼어요</Text>
				<Text style={styles.body}>기록은 그대로 저장돼 있어요. 아래를 눌러 다시 열어 보세요.</Text>
				<Pressable style={styles.button} onPress={this.retry} accessibilityRole="button">
					<Text style={styles.buttonText}>다시 시도</Text>
				</Pressable>
			</View>
		);
	}
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		paddingHorizontal: 32,
		backgroundColor: '#FFFFFF',
	},
	title: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center' },
	body: { fontSize: 14, lineHeight: 20, color: '#4B5563', textAlign: 'center' },
	button: {
		marginTop: 8,
		paddingHorizontal: 28,
		paddingVertical: 12,
		borderRadius: 999,
		backgroundColor: '#1249C9',
	},
	buttonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

export default ErrorBoundary;
