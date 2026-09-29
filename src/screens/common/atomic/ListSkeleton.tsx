import React from 'react';
import { StyleSheet, View } from 'react-native';
import Skeleton from './Skeleton';
import { Layout, Radius } from '@/src/const/ConstDesign';
import { scaleHeight } from '@/src/utils';
import { themed } from '@/src/utils/ThemedStyles';

interface Props {
	/** 표시할 자리표시자 카드 수 */
	rows?: number;
	/** 카드 한 장의 높이 */
	height?: number;
}

/**
 * 리스트 로딩 자리표시자
 * - 스피너 대신 실제 카드와 비슷한 덩어리를 보여줘 로딩 후 레이아웃이 튀지 않게 한다.
 */
const ListSkeleton: React.FC<Props> = ({ rows = 5, height = scaleHeight(78) }) => (
	<View style={styles.wrap}>
		{Array.from({ length: rows }).map((_, i) => (
			<Skeleton key={i} height={height} radius={Radius.lg} style={styles.row} />
		))}
	</View>
);

export default ListSkeleton;

const styles = themed(() => StyleSheet.create({
	wrap: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop },
	row: { marginBottom: Layout.itemGap },
}));
