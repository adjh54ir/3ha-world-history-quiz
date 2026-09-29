import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { isTablet } from '@/src/utils/DementionUtils';
import { themed } from '@/src/utils/ThemedStyles';

interface Props {
	children: React.ReactNode;
	style?: StyleProp<ViewStyle>;
}

/**
 * 태블릿에서만 세로 목록을 2단으로 펼치는 래퍼.
 * - 폰(isTablet=false)에서는 자식을 그대로 통과시킨다 — 렌더 트리·스타일 변화 없음.
 * - 블록형 카드(제목·본문이 세로로 쌓이는 카드)에만 쓴다.
 *   아이콘+본문+chevron 형태의 가로 행 카드는 열을 나누면 본문 폭이 눌려 더 나빠진다.
 */
const AdaptiveGrid = ({ children, style }: Props) => {
	if (!isTablet) return <>{children}</>;

	return (
		<View style={[styles.grid, style]}>
			{React.Children.toArray(children).map((child, i) => (
				// 셀 key 는 자식 key 를 그대로 쓴다 — 인덱스로 주면 목록이 바뀔 때 카드가 통째로 리마운트된다
				// (마지막 줄에 하나만 남아도 폭이 늘어나지 않도록 고정 비율 셀)
				<View key={React.isValidElement(child) ? child.key ?? i : i} style={styles.cell}>
					{child}
				</View>
			))}
		</View>
	);
};

export default AdaptiveGrid;

const styles = themed(() => StyleSheet.create({
	grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
	cell: { width: '49%' },
}));
