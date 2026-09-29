/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import AppModal from '@/src/screens/common/atomic/AppModal';
import { SheetIn } from '@/src/screens/common/anim/Motion';
import Colors from '@/src/const/ConstColors';
import { Spacing, SpacingV, Typography, Radius, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import { themed } from '@/src/utils/ThemedStyles';

interface Props {
	visible: boolean;
	title?: string;
	message?: string;
	confirmText?: string;
	cancelText?: string;
	onCancel: () => void;
	onConfirm: () => void;
}

/**
 * 학습/퀴즈 종료 확인 모달 (공통)
 * - 숏폼·카드 학습 등에서 나가기 전에 확인
 */
const ExitConfirmModal: React.FC<Props> = ({
	visible,
	title = '학습을 종료하시겠습니까?',
	message = '지금 나가면 이번 학습 화면을 벗어나요.',
	confirmText = '종료',
	cancelText = '계속하기',
	onCancel,
	onConfirm,
}) => {
	return (
		<AppModal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
			<View style={styles.overlay}>
				<TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />
				<SheetIn visible={visible} style={styles.card}>
					<View style={styles.iconWrap}>
						<IconComponent type="materialIcons" name="logout" size={scaledSize(26)} color={Colors.primary} />
					</View>
					<Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
					<Text style={styles.message}>{message}</Text>
					<View style={styles.btnRow}>
						<TouchableOpacity style={[styles.btn, styles.cancelBtn]} activeOpacity={0.85} onPress={onCancel}>
							<Text style={styles.cancelText}>{cancelText}</Text>
						</TouchableOpacity>
						<TouchableOpacity style={[styles.btn, styles.confirmBtn]} activeOpacity={0.9} onPress={onConfirm}>
							<Text style={styles.confirmText}>{confirmText}</Text>
						</TouchableOpacity>
					</View>
				</SheetIn>
			</View>
		</AppModal>
	);
};

export default ExitConfirmModal;

const styles = themed(() => StyleSheet.create({
	overlay: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
	card: { width: '100%', maxWidth: Layout.dialogMaxWidth, backgroundColor: Colors.surface, borderRadius: Radius.xl, paddingHorizontal: Spacing.xl, paddingVertical: SpacingV.xxl, alignItems: 'center' },
	iconWrap: { width: scaleWidth(56), height: scaleWidth(56), borderRadius: Radius.lg, backgroundColor: Colors.primarySoft, justifyContent: 'center', alignItems: 'center', marginBottom: SpacingV.md },
	title: { fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong, textAlign: 'center' },
	message: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: SpacingV.sm, textAlign: 'center', lineHeight: scaleHeight(21) },
	btnRow: { flexDirection: 'row', gap: Spacing.sm, alignSelf: 'stretch', marginTop: SpacingV.xl },
	btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SpacingV.lg, borderRadius: Radius.md },
	cancelBtn: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong },
	cancelText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.text },
	confirmBtn: { backgroundColor: Colors.primary },
	confirmText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textInverse },
}));
