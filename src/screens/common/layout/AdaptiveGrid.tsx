import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Layout } from '@/src/const/ConstDesign';
import { isTablet } from '@/src/utils/DementionUtils';
import { themed } from '@/src/utils/ThemedStyles';

interface Props {
	children: React.ReactNode;
	style?: StyleProp<ViewStyle>;
	/** 태블릿 열 수 (기본 2). 화면 폭에 맞추려면 gridColumns(최소 셀 폭) 을 넘긴다 */
	columns?: number;
}

/**
 * 태블릿에서만 세로 목록을 여러 열로 펼치는 래퍼.
 * - 폰(isTablet=false)에서는 자식을 그대로 통과시킨다 — 렌더 트리·스타일 변화 없음.
 * - 블록형 카드(제목·본문이 세로로 쌓이는 카드)에만 쓴다.
 *   아이콘+본문+chevron 형태의 가로 행 카드는 열을 나누면 본문 폭이 눌려 더 나빠진다.
 */
const AdaptiveGrid = ({ children, style, columns = 2 }: Props) => {
	if (!isTablet || columns <= 1) return <>{children}</>;

	return (
		<View style={[styles.grid, style]}>
			{React.Children.toArray(children).map((child, i) => (
				// 셀 key 는 자식 key 를 그대로 쓴다 — 인덱스로 주면 목록이 바뀔 때 카드가 통째로 리마운트된다
				// (마지막 줄에 하나만 남아도 폭이 늘어나지 않도록 고정 비율 셀)
				<View key={React.isValidElement(child) ? child.key ?? i : i} style={[styles.cell, { width: `${100 / columns}%` }]}>
					{child}
				</View>
			))}
		</View>
	);
};

export default AdaptiveGrid;

const styles = themed(() => StyleSheet.create({
	// 좌우 틈 = 카드 세로 간격(Layout.itemGap). 49% + space-between 은 틈이 화면 폭 따라 13~15 로 달라져 세로 간격과 어긋났다
	grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -Layout.itemGap / 2 },
	cell: { paddingHorizontal: Layout.itemGap / 2 },
}));
