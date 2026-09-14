import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Radius, Spacing, Typography } from '@/src/const/ConstDesign';
import { selectLevel } from '@/src/const/data/life/ConstLifeLevels';
import type { LifeType } from '@/src/types/data/LifeType';
import { scaleHeight, scaleWidth } from '@/src/utils';

interface Props {
	level: LifeType.Level;
	/** 작은 목록용 — 아이콘을 빼고 높이를 줄인다 */
	compact?: boolean;
}

/** 난이도 칩 — 초급에서 특급으로 갈수록 색이 진해진다 */
const LevelChip = ({ level, compact = false }: Props) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const meta = selectLevel(level);

	return (
		<View
			style={[styles.chip, compact && styles.chipCompact, { backgroundColor: Colors[meta.tint] }]}
			accessibilityLabel={`난이도 ${meta.label}`}>
			<IconComponent type="materialCommunityIcons" name={meta.icon} size={compact ? 11 : 12} color={Colors[meta.color]} />
			<Text style={[styles.text, { color: Colors[meta.color] }]}>{meta.label}</Text>
		</View>
	);
};

const createStyles = () =>
	StyleSheet.create({
		chip: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(4),
			paddingHorizontal: Spacing.md,
			height: scaleHeight(28),
			borderRadius: Radius.pill,
		},
		// 작은 칩은 아이콘이 들어가도 좁아 보이게 — 글자와의 사이만 한 칸 줄인다
		chipCompact: { paddingHorizontal: Spacing.sm, height: scaleHeight(22), gap: scaleWidth(3) },
		text: { fontSize: Typography.caption, fontWeight: FontWeight.bold },
	});

export default LevelChip;
