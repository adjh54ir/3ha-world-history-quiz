import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { showConfirm } from '@/src/screens/common/modal/ConfirmModal';
import { Typography, FontWeight, Spacing, SpacingV, Radius, Layout } from '@/src/const/ConstDesign';

/** 화면 하단 HOME 띠 — 종료 확인 후 홈 탭으로 */
const BottomHomeButton = ({
	borderColor,
	textColor,
	iconColor,
	confirmTitle = '퀴즈를 종료할까요?',
	confirmMessage = '진행 중인 내용은 저장되지 않습니다.',
}: {
	borderColor: string;
	textColor: string;
	iconColor: string;
	confirmTitle?: string;
	confirmMessage?: string;
}) => {
	const onPress = async () => {
		const ok = await showConfirm({ title: confirmTitle, message: confirmMessage, confirmText: '나가기', destructive: true, icon: 'logout' });
		if (ok) router.dismissTo('/(tabs)/home');
	};

	return (
		<View style={styles.wrapper}>
			<TouchableOpacity style={[styles.button, { borderColor }]} onPress={onPress} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="홈으로">
				<IconComponent type="materialIcons" name="home" size={14} color={iconColor} />
				<Text style={[styles.text, { color: textColor }]}>HOME</Text>
			</TouchableOpacity>
		</View>
	);
};

export default BottomHomeButton;

const styles = StyleSheet.create({
	wrapper: { alignItems: 'center', justifyContent: 'center', marginHorizontal: Layout.screenH, paddingVertical: SpacingV.sm },
	button: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		borderWidth: 1,
		borderRadius: Radius.xxl,
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.xxl,
	},
	text: { fontSize: Typography.footnote, fontWeight: FontWeight.semibold },
});
