import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import AppModal from '@/src/screens/common/atomic/AppModal';
import ModalIconButton from '@/src/screens/common/atomic/ModalIconButton';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useScreenEnter, useSheetEnter } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Layout, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

interface Props {
	visible: boolean;
	onClose: () => void;
	/** 카드 학습 — 분야를 고르고 캐러셀로 넘겨 본다 */
	onPickCard: () => void;
	/** 숏폼 학습 — 한 화면에 한 단어, 위로 넘긴다 */
	onPickShorts: () => void;
}

/** 한 갈래 — 아이콘·제목·설명이 늘 같은 자리에 오도록 한곳에서 모양을 정한다 */
const ModeRow = ({
	index,
	icon,
	label,
	description,
	color,
	tint,
	onPress,
}: {
	index: number;
	icon: string;
	label: string;
	description: string;
	color: string;
	tint: string;
	onPress: () => void;
}) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	// 시트가 올라온 뒤 갈래가 차례로 떠오른다
	const enterStyle = useScreenEnter(12, 260 + index * 70);

	return (
		<Animated.View style={enterStyle}>
			<PressableScale style={styles.row} onPress={onPress} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={label}>
				<View style={[styles.iconBox, { backgroundColor: tint }]}>
					<IconComponent type="materialCommunityIcons" name={icon} size={24} color={color} />
				</View>
				<View style={styles.rowText}>
					<Text style={styles.rowLabel}>{label}</Text>
					<Text style={styles.rowDesc}>{description}</Text>
				</View>
				<IconComponent type="materialIcons" name="chevron-right" size={22} color={Colors.textMuted} />
			</PressableScale>
		</Animated.View>
	);
};

/**
 * 학습 방식 고르기 — 홈의 "학습 모드" 카드를 누르면 아래에서 올라온다.
 * 카드 학습과 숏폼 학습은 같은 단어를 다르게 보여 주는 두 갈래라, 화면을 나누지 않고 한 시트에서 고른다.
 */
const StudyModeModal = ({ visible, onClose, onPickCard, onPickShorts }: Props) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const insets = useSafeAreaInsets();
	const enterStyle = useSheetEnter(visible, scaleHeight(24));

	return (
		<AppModal visible={visible} onClose={onClose} align="bottom">
			<Animated.View style={[styles.sheet, { paddingBottom: SpacingV.xl + insets.bottom }, enterStyle]}>
				<View style={styles.handle} />
				<View style={styles.headRow}>
					<View style={styles.headText}>
						<Text style={styles.title}>어떻게 학습할까요?</Text>
						<Text style={styles.subtitle}>고른 단어를 두 가지 방식으로 볼 수 있어요</Text>
					</View>
					<ModalIconButton name="close" color={Colors.textSecondary} onPress={onClose} accessibilityLabel="닫기" />
				</View>

				<View style={styles.list}>
					<ModeRow
						index={0}
						icon="cards"
						label="카드 학습"
						description="카드를 좌우로 넘기며 한 장씩 익혀요"
						color={Colors.primaryDark}
						tint={Colors.primarySoft}
						onPress={onPickCard}
					/>
					<ModeRow
						index={1}
						icon="gesture-swipe-vertical"
						label="숏폼 학습"
						description="한 화면에 한 단어. 위로 넘기며 쭉 훑어요"
						color={Colors.secondaryDark}
						tint={Colors.secondarySoft}
						onPress={onPickShorts}
					/>
				</View>
			</Animated.View>
		</AppModal>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		sheet: {
			...Layout.modalSheet,
			paddingHorizontal: Spacing.xl,
			paddingTop: SpacingV.sm,
			borderTopLeftRadius: Radius.xl,
			borderTopRightRadius: Radius.xl,
			backgroundColor: Colors.surface,
			gap: SpacingV.md,
		},
		handle: { alignSelf: 'center', width: scaleWidth(40), height: scaleHeight(4), borderRadius: Radius.pill, backgroundColor: Colors.borderStrong },
		headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
		headText: { flex: 1, gap: scaleHeight(3) },
		title: { fontSize: Typography.title, fontWeight: FontWeight.bold, color: Colors.textStrong },
		subtitle: { fontSize: Typography.bodySm, color: Colors.textSecondary },

		list: { gap: SpacingV.sm },
		row: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			paddingHorizontal: Spacing.lg,
			paddingVertical: SpacingV.md,
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.border,
			backgroundColor: Colors.surface,
		},
		iconBox: { width: scaleWidth(48), height: scaleWidth(48), borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
		rowText: { flex: 1, gap: scaleHeight(3) },
		rowLabel: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.textStrong },
		rowDesc: { fontSize: Typography.bodySm, color: Colors.textSecondary, lineHeight: scaledSize(19) },
	});

export default StudyModeModal;
