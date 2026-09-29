import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

/**
 * 공용 Lottie 래퍼 (크래시 세이프)
 * - lottie-react-native 네이티브 모듈이 아직 링크되지 않은 빌드에서도 앱이 죽지 않도록
 *   동적 require로 로드하고, 없으면 빈 View로 폴백합니다(재빌드 후 정상 재생).
 * - 애셋: src/assets/lottie/*.json → source={require('.../xxx.json')}
 */
let LottieView: any = null;
try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	LottieView = require('lottie-react-native').default ?? require('lottie-react-native');
} catch {
	LottieView = null;
}

interface LottieBoxProps {
	source: any;
	autoPlay?: boolean;
	loop?: boolean;
	speed?: number;
	style?: StyleProp<ViewStyle>;
	onFinish?: () => void;
}

const LottieBox: React.FC<LottieBoxProps> = ({ source, autoPlay = true, loop = false, speed = 1, style, onFinish }) => {
	if (!LottieView) {
		// 네이티브 모듈 미링크 시 레이아웃만 차지하고 조용히 폴백
		return <View style={style} />;
	}
	return (
		<LottieView
			source={source}
			autoPlay={autoPlay}
			loop={loop}
			speed={speed}
			resizeMode="contain"
			style={style}
			onAnimationFinish={onFinish}
		/>
	);
};

export default LottieBox;
