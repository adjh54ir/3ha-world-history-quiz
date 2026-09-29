/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Colors, { readableOn } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Typography, Radius, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import { themed } from '@/src/utils/ThemedStyles';

type Variant = 'primary' | 'secondary' | 'neutral';

interface BottomButtonProps {
	/** 주 버튼 라벨 */
	label: string;
	onPress: () => void;
	/** MaterialIcons 이름 (주 버튼 좌측 아이콘) */
	icon?: string;
	/** 스타일 변형 */
	variant?: Variant;
	/** 주 버튼 배경색 직접 지정(variant보다 우선) */
	color?: string;
	disabled?: boolean;

	/** 보조(왼쪽) 버튼 라벨 — 지정 시 2버튼(보조+주) 가로 배치 */
	secondaryLabel?: string;
	onSecondary?: () => void;
	secondaryIcon?: string;

	/** 바 배경색 (기본 surface) */
	barColor?: string;
	/** 바 상단 구분선 (기본 true) */
	divider?: boolean;
	style?: ViewStyle;
}

/**
 * 공용 하단 고정 버튼 (BottomButton)
 * - 최하단 고정 + SafeArea 하단 인셋 반영(기기 키/홈 인디케이터와 겹치지 않음)
 * - 단일: 텍스트 크기에 맞춘 중앙 버튼(가로 가득 X)
 * - 2버튼: 보조(아웃라인)+주(솔리드)를 가로 반반 배치
 */
const BottomButton: React.FC<BottomButtonProps> = ({
	label,
	onPress,
	icon,
	variant = 'primary',
	color,
	disabled,
	secondaryLabel,
	onSecondary,
	secondaryIcon,
	barColor = Colors.surface,
	divider = true,
	style,
}) => {
	const insets = useSafeAreaInsets();

	const bg = color ?? (variant === 'primary' ? Colors.primary : variant === 'secondary' ? Colors.secondaryDark : Colors.surfaceAlt);
	const fg = variant === 'neutral' ? Colors.textStrong : readableOn(bg);
	const twoButtons = !!secondaryLabel;

	return (
		<View
			style={[
				styles.bar,
				{ backgroundColor: barColor, paddingBottom: insets.bottom + SpacingV.md },
				divider && styles.barDivider,
				style,
			]}>
			{twoButtons ? (
				<View style={styles.row}>
					<TouchableOpacity style={[styles.half, styles.outline]} activeOpacity={0.85} onPress={onSecondary}>
						{!!secondaryIcon && <IconComponent type="materialIcons" name={secondaryIcon} size={scaledSize(20)} color={Colors.text} />}
						<Text style={[styles.label, { color: Colors.text }]} numberOfLines={1} ellipsizeMode="tail">{secondaryLabel}</Text>
					</TouchableOpacity>
					<TouchableOpacity style={[styles.half, { backgroundColor: bg }, disabled && styles.disabled]} activeOpacity={0.9} disabled={disabled} onPress={onPress}>
						{!!icon && <IconComponent type="materialIcons" name={icon} size={scaledSize(20)} color={fg} />}
						<Text style={[styles.label, { color: fg }]} numberOfLines={1} ellipsizeMode="tail">{label}</Text>
					</TouchableOpacity>
				</View>
			) : (
				<TouchableOpacity style={[styles.btn, { backgroundColor: bg }, disabled && styles.disabled]} activeOpacity={0.9} disabled={disabled} onPress={onPress}>
					{!!icon && <IconComponent type="materialIcons" name={icon} size={scaledSize(20)} color={fg} />}
					<Text style={[styles.label, { color: fg }]} numberOfLines={1} ellipsizeMode="tail">{label}</Text>
				</TouchableOpacity>
			)}
		</View>
	);
};

export default BottomButton;

const styles = themed(() => StyleSheet.create({
	bar: { paddingHorizontal: Layout.screenH, paddingTop: SpacingV.sm },
	barDivider: { borderTopWidth: 1, borderTopColor: Colors.border },
	// 단일: 텍스트 크기에 맞춘 중앙 pill 버튼 (컴팩트·깔끔)
	btn: {
		alignSelf: 'center',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.sm,
		minHeight: scaleHeight(42),
		paddingHorizontal: Spacing.xxl,
		borderRadius: Radius.xl,
		minWidth: scaleWidth(140),
	},
	// 2버튼: 가로 반반
	row: { flexDirection: 'row', gap: Spacing.sm },
	half: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.sm,
		minHeight: scaleHeight(44),
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.sm,
		borderRadius: Radius.xl,
	},
	// 아웃라인(보조): 흰 배경 + 얇고 은은한 보더
	outline: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
	disabled: { opacity: 0.5 },
	label: { flexShrink: 1, fontSize: Typography.callout, fontWeight: '800', textAlign: 'center' },
}));
