import React from 'react';
import { Text, TextProps } from 'react-native';

/**
 * 한 줄 고정 + 자동 축소 텍스트
 * - 기기 '큰 글씨' 접근성 설정에서 점수·정답률 같은 핵심 지표가 잘리는 것을 막는다.
 * - 축소 하한은 원래 크기의 80% (그 아래로는 가독성이 떨어져 줄이지 않는다).
 */
const FitText: React.FC<TextProps> = ({ children, ...rest }) => (
	<Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} {...rest}>
		{children}
	</Text>
);

export default FitText;
