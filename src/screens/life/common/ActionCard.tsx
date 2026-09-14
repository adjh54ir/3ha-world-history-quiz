import React from 'react';
import { Animated, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import { Palette, onSurface } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useScreenEnter } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

interface Props {
	/** 목록에서 몇 번째인지 — 카드가 순서대로 떠오르게 만든다 */
	index?: number;
	iconName: string;
	iconType?: 'materialIcons' | 'materialCommunityIcons';
	label: string;
	description: string;
	/** 아이콘 색 — 배경은 같은 색을 옅게 깐다 */
	color: string;
	/** 아이콘 뒤 배경색 (없으면 color 를 옅게) */
	tint?: string;
	/** 오른쪽 위 NEW 뱃지 */
	isNew?: boolean;
	/** 카드 바깥 크기 — 태블릿에서 두 칸 그리드로 놓을 때 부모가 넘겨준다 */
	style?: StyleProp<ViewStyle>;
	onPress: () => void;
}

/**
 * 홈의 큰 액션 카드 한 줄.
 * -------------------------------------------------
 * 아이콘 · 제목 · 설명 · 화살표가 늘 같은 자리에 오도록 한곳에서 모양을 정한다.
 * 좌우 여백은 카드가 스스로 갖고, 카드 사이 간격은 부모의 gap 이 맡는다.
 */
const ActionCard = ({ index = 0, iconName, iconType = 'materialCommunityIcons', label, description, color, tint, isNew, style, onPress }: Props) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	// 아래에서 살짝 떠오르며 등장 — 아래쪽 카드일수록 천천히 떠서 순서대로 오는 것처럼 보인다
	const enterStyle = useScreenEnter(16, 260 + Math.min(index, 8) * 45);

	return (
		<Animated.View style={[style, enterStyle]}>
			<PressableScale style={styles.card} onPress={onPress} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={label}>
				<View style={[styles.iconBox, { backgroundColor: tint ?? `${color}1F` }]}>
					<IconComponent type={iconType} name={iconName} size={22} color={color} />
				</View>
				<View style={styles.textBox}>
					<View style={styles.labelRow}>
						<Text style={styles.label} numberOfLines={1}>
							{label}
						</Text>
						{isNew && (
							<View style={styles.newChip}>
								<Text style={styles.newText}>NEW</Text>
							</View>
						)}
					</View>
					<Text style={styles.description} numberOfLines={2}>
						{description}
					</Text>
				</View>
				<IconComponent type="materialIcons" name="chevron-right" size={22} color={Colors.textMuted} />
			</PressableScale>
		</Animated.View>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		card: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			paddingVertical: SpacingV.md,
			paddingHorizontal: Spacing.lg,
			borderRadius: Radius.xl,
			backgroundColor: Colors.surface,
			...Shadow.card,
		},
		iconBox: {
			width: scaleWidth(46),
			height: scaleWidth(46),
			borderRadius: Radius.md,
			alignItems: 'center',
			justifyContent: 'center',
		},
		textBox: { flex: 1, gap: scaleHeight(3) },
		labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
		label: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.textStrong },
		newChip: {
			paddingHorizontal: Spacing.sm,
			height: scaleHeight(18),
			borderRadius: Radius.pill,
			backgroundColor: Colors.error,
			alignItems: 'center',
			justifyContent: 'center',
		},
		// 다크에서 error 는 밝은 살몬(#F87171)이 되어 흰 글씨가 2.8:1 로 뭉개진다 — 면 밝기에 맞춰 고른다
		newText: { fontSize: scaledSize(9), fontWeight: FontWeight.heavy, color: onSurface(Colors.error), letterSpacing: 0.3 },
		description: { fontSize: Typography.bodySm, color: Colors.textSecondary, lineHeight: scaledSize(19) },
	});

export default ActionCard;
