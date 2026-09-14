import React from 'react';
import { Animated, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import type { ImageSource } from 'expo-image';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import MascotImage from '@/src/screens/common/atomic/MascotImage';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useScreenEnter } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

interface Props {
	/**
	 * 'page' — 목록이 통째로 비었을 때. 화면 가운데에 그림·제목·설명을 세운다.
	 * 'inline' — 카드 안 한 묶음만 비었을 때. 아이콘 + 한 줄로 조용히 알린다.
	 */
	variant?: 'page' | 'inline';
	/** 화면 일러스트 — 'page' 에서 아이콘 대신 쓴다 (둘 다 없으면 아이콘 기본값) */
	image?: ImageSource | number;
	/** 일러스트가 없을 때 쓸 아이콘 (MaterialCommunityIcons) */
	icon?: string;
	/** 굵은 한 줄 — 'inline' 에서는 두지 않는 편이 낫다 */
	title?: string;
	/** 왜 비었는지 · 무엇을 하면 되는지. 줄바꿈을 넣어도 된다 */
	message?: string;
	/** 빠져나갈 길 — 넘기면 설명 아래에 버튼이 붙는다 */
	actionLabel?: string;
	onAction?: () => void;
	style?: StyleProp<ViewStyle>;
}

/**
 * 빈 상태 공통 표시.
 *
 * 화면마다 캐릭터 말풍선 / 일러스트 + 제목 / 텍스트 한 줄로 제각각이던 것을 한 모양으로 모은다.
 * 나타날 때 살짝 떠오르며 들어오고, 화면을 벗어나면 연출은 자동으로 멈춘다(useScreenEnter).
 */
const EmptyState = ({ variant = 'page', image, icon = 'inbox-outline', title, message, actionLabel, onAction, style }: Props) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	// 진입 연출 — 언마운트 시 자동 정지된다
	const enterStyle = useScreenEnter();

	if (variant === 'inline') {
		return (
			<Animated.View style={[styles.inline, enterStyle, style]}>
				<IconComponent type="materialCommunityIcons" name={icon} size={20} color={Colors.textMuted} />
				<Text style={styles.inlineText}>{message}</Text>
			</Animated.View>
		);
	}

	return (
		<Animated.View style={[styles.page, enterStyle, style]}>
			{image ? (
				<MascotImage source={image} size={scaleWidth(168)} popIn style={styles.image} />
			) : (
				<View style={styles.iconBox}>
					<IconComponent type="materialCommunityIcons" name={icon} size={34} color={Colors.textMuted} />
				</View>
			)}
			{!!title && <Text style={styles.title}>{title}</Text>}
			{!!message && <Text style={styles.message}>{message}</Text>}
			{!!actionLabel && !!onAction && (
				<PressableScale style={styles.button} accessibilityRole="button" onPress={onAction}>
					<Text style={styles.buttonText}>{actionLabel}</Text>
				</PressableScale>
			)}
		</Animated.View>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		// 목록이 통째로 빈 자리 — 가운데로 모으고 위아래 여백을 넉넉히 준다
		page: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: SpacingV.xxxl, gap: SpacingV.sm },
		image: { marginBottom: SpacingV.sm },
		iconBox: {
			width: scaleWidth(72),
			height: scaleWidth(72),
			borderRadius: Radius.pill,
			backgroundColor: Colors.surfaceAlt,
			alignItems: 'center',
			justifyContent: 'center',
			marginBottom: SpacingV.sm,
		},
		title: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.text, textAlign: 'center' },
		message: { fontSize: Typography.bodySm, color: Colors.textSecondary, textAlign: 'center', lineHeight: scaledSize(20) },
		button: {
			marginTop: SpacingV.md,
			paddingHorizontal: Spacing.xxl,
			height: scaleHeight(46),
			borderRadius: Radius.lg,
			backgroundColor: Colors.primarySurface,
			alignItems: 'center',
			justifyContent: 'center',
			...Shadow.card,
		},
		buttonText: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textInverse },

		// 카드 안 한 묶음만 빈 자리 — 아이콘 하나와 한 줄로 조용히
		inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: SpacingV.sm },
		inlineText: { flex: 1, fontSize: Typography.bodySm, color: Colors.textMuted, lineHeight: scaledSize(19) },
	});

export default EmptyState;
