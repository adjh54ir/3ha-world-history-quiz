import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import AppModal from '@/src/screens/common/atomic/AppModal';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { SheetIn } from '@/src/screens/common/anim/Motion';
import Colors from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import { themed } from '@/src/utils/ThemedStyles';

interface Props {
	visible: boolean;
	/** 초기화 대상 이름 (예: 즐겨찾기) */
	label: string;
	/** 지워지는 데이터 설명 */
	desc?: string;
	/** 대상 아이콘 (materialIcons) */
	icon?: string;
	/** 초기화 진행 중 */
	busy?: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

/**
 * 데이터 초기화 전용 확인 팝업
 * - 공용 확인 팝업(showConfirm) 대신 '무엇이 지워지는지'를 카드로 보여준다.
 */
const ResetConfirmModal: React.FC<Props> = ({ visible, label, desc, icon = 'delete-forever', busy = false, onCancel, onConfirm }) => {
	const { t } = useTranslation();
	return (
		<AppModal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : onCancel}>
			<View style={styles.overlay}>
				<TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={busy ? undefined : onCancel} />
				<SheetIn visible={visible} distance={scaleHeight(24)} style={styles.card}>
					<View style={styles.iconWrap}>
						<IconComponent type="materialIcons" name={icon} size={scaledSize(28)} color={Colors.error} />
					</View>
					<Text style={styles.title}>{t('modal.reset.title', { label })}</Text>
					{!!desc && (
						<View style={styles.targetBox}>
							<Text style={styles.targetText}>{desc}</Text>
						</View>
					)}
					<View style={styles.warnRow}>
						<IconComponent type="materialIcons" name="warning-amber" size={scaledSize(16)} color={Colors.error} />
						<Text style={styles.warnText}>{t('modal.reset.warn')}</Text>
					</View>
					<View style={styles.btnRow}>
						<TouchableOpacity style={[styles.btn, styles.cancelBtn]} activeOpacity={0.85} disabled={busy} onPress={onCancel}>
							<Text style={styles.cancelText}>{t('common.cancel')}</Text>
						</TouchableOpacity>
						<TouchableOpacity style={[styles.btn, styles.confirmBtn, busy && styles.btnDisabled]} activeOpacity={0.9} disabled={busy} onPress={onConfirm}>
							{busy ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={styles.confirmText}>{t('common.reset')}</Text>}
						</TouchableOpacity>
					</View>
				</SheetIn>
			</View>
		</AppModal>
	);
};

export default ResetConfirmModal;

const styles = themed(() => StyleSheet.create({
	overlay: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
	card: { width: '100%', maxWidth: Layout.dialogMaxWidth, backgroundColor: Colors.surface, borderRadius: Radius.xl, paddingHorizontal: Spacing.xl, paddingVertical: SpacingV.xxl, alignItems: 'center' },
	iconWrap: { width: scaleWidth(56), height: scaleWidth(56), borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: SpacingV.md, backgroundColor: Colors.surfaceAlt },
	title: { fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong, textAlign: 'center' },
	targetBox: { alignSelf: 'stretch', marginTop: SpacingV.md, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.md, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt },
	targetText: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: scaleHeight(20) },
	warnRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: SpacingV.md },
	warnText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.error },
	btnRow: { flexDirection: 'row', alignSelf: 'stretch', gap: Spacing.sm, marginTop: SpacingV.xl },
	btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SpacingV.lg, borderRadius: Radius.md },
	btnDisabled: { opacity: 0.5 },
	cancelBtn: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong },
	confirmBtn: { backgroundColor: Colors.errorDark },
	cancelText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.text },
	confirmText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textInverse },
}));
