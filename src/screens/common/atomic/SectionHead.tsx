import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Colors from '@/src/const/ConstColors';
import { DisplayText, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { themed } from '@/src/utils/ThemedStyles';

interface Props {
	/** 섹션 제목 */
	title: string;
	/** 제목 아래 한 줄 설명 */
	sub?: string;
	/** 우측 액션 (펼치기·더보기 등) */
	right?: React.ReactNode;
	style?: StyleProp<ViewStyle>;
}

/**
 * 섹션 헤더 (전 화면 공통)
 * - 화면마다 제각각이던 섹션 제목(sectionTitle / sectionHead / lead)을 하나로 모은다.
 * - 제목은 한 줄 고정, 넘치면 말줄임. 우측 액션은 제목을 밀지 않는다.
 */
const SectionHead: React.FC<Props> = ({ title, sub, right, style }) => (
	<View style={[styles.head, style]}>
		<View style={styles.left}>
			<Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
			{!!sub && <Text style={styles.sub} numberOfLines={2} ellipsizeMode="tail">{sub}</Text>}
		</View>
		{right}
	</View>
);

export default SectionHead;

const styles = themed(() => StyleSheet.create({
	head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SpacingV.md },
	left: { flex: 1, paddingRight: Spacing.sm },
	title: { fontSize: Typography.title, ...DisplayText, color: Colors.textStrong },
	sub: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xs },
}));
