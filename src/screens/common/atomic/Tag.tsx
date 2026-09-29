import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Colors, { readableOn, withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography } from '@/src/const/ConstDesign';
import { scaledSize } from '@/src/utils';
import { themed } from '@/src/utils/ThemedStyles';

/**
 * soft: 색을 옅게 깐 배경 + 색 글자 (기본)
 * solid: 색 배경 + 흰 글자 (획득·달성처럼 강조)
 * outline: 배경 없이 색 테두리
 * plain: 회색 배경 + 보조 글자색 (수치·메타 정보)
 */
type TagVariant = 'soft' | 'solid' | 'outline' | 'plain';

interface TagProps {
	label: string;
	/** 강조색 (plain 은 무시) */
	color?: string;
	variant?: TagVariant;
	/** MaterialIcons 이름 — 라벨 왼쪽 아이콘 */
	icon?: string;
	/** micro(기본) / caption */
	size?: 'sm' | 'md';
	style?: StyleProp<ViewStyle>;
	textStyle?: StyleProp<TextStyle>;
}

/**
 * 공통 태그(칩)
 * - 화면마다 따로 만들던 칩 스타일(희귀도·정답률·모드 라벨 등)을 한 곳으로 모은다.
 * - 누르는 칩(필터·정렬 탭)은 대상이 아니다. 표시 전용.
 */
const Tag: React.FC<TagProps> = ({ label, color = Colors.primary, variant = 'soft', icon, size = 'sm', style, textStyle }) => {
	const isSolid = variant === 'solid';
	const isPlain = variant === 'plain';
	const bg = isPlain ? Colors.surfaceAlt : isSolid ? color : variant === 'outline' ? 'transparent' : withAlpha(color, '14');
	const fg = isPlain ? Colors.textSecondary : isSolid ? readableOn(color) : color;
	const iconSize = size === 'md' ? scaledSize(13) : scaledSize(11);

	return (
		<View
			style={[
				styles.tag,
				size === 'md' && styles.tagMd,
				{ backgroundColor: bg },
				variant === 'outline' && { borderWidth: 1, borderColor: color },
				style,
			]}>
			{!!icon && <IconComponent type="materialIcons" name={icon} size={iconSize} color={fg} />}
			<Text style={[styles.text, size === 'md' && styles.textMd, { color: fg }, textStyle]} numberOfLines={1} ellipsizeMode="tail">
				{label}
			</Text>
		</View>
	);
};

export default Tag;

const styles = themed(() => StyleSheet.create({
	tag: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.xxs,
		alignSelf: 'flex-start',
		flexShrink: 1,
		borderRadius: Radius.pill,
		paddingHorizontal: Spacing.sm,
		paddingVertical: SpacingV.xxs,
	},
	tagMd: { paddingVertical: SpacingV.xxs, paddingHorizontal: Spacing.md },
	text: { flexShrink: 1, fontSize: Typography.micro, fontWeight: '800' },
	textMd: { fontSize: Typography.footnote },
}));
