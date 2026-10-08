import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import AppModal from '@/src/screens/common/atomic/AppModal';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { SheetIn } from '@/src/screens/common/anim/Motion';
import Colors, { withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, Layout, DisplayText } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import { themed } from '@/src/utils/ThemedStyles';

export interface ConfirmOptions {
	title: string;
	message?: string;
	/** 확인 버튼 문구 */
	confirmText?: string;
	/** 취소 버튼 문구. null 이면 확인 버튼만 있는 안내 팝업 */
	cancelText?: string | null;
	/** 삭제·초기화 등 되돌릴 수 없는 동작 — 확인 버튼을 빨간색으로 */
	destructive?: boolean;
	/** 상단 원형 아이콘 (materialIcons) */
	icon?: string;
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

let emit: ((p: Pending | null) => void) | null = null;

/**
 * 앱 공통 확인 팝업 — 네이티브 Alert 대체.
 * 화면/유틸 어디서든 `await showConfirm({...})` 로 호출한다. (Alert.alert 금지)
 */
export const showConfirm = (options: ConfirmOptions): Promise<boolean> =>
	new Promise((resolve) => {
		if (!emit) {
			resolve(false);
			return;
		}
		emit({ ...options, resolve });
	});

/** 확인 버튼만 있는 안내 팝업 */
export const showAlert = (title: string, message?: string, icon?: string): Promise<boolean> =>
	showConfirm({ title, message, icon, cancelText: null });

/** 루트 레이아웃에 1회만 마운트 */
export const ConfirmModalHost: React.FC = () => {
	const { t } = useTranslation();
	const [pending, setPending] = useState<Pending | null>(null);

	useEffect(() => {
		emit = setPending;
		return () => {
			emit = null;
		};
	}, []);

	const close = (ok: boolean) => {
		pending?.resolve(ok);
		setPending(null);
	};

	const accent = pending?.destructive ? Colors.error : Colors.primary;

	return (
		<AppModal visible={!!pending} transparent animationType="fade" onRequestClose={() => close(false)}>
			<View style={styles.overlay}>
				<TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => close(false)} />
				{!!pending && (
					<SheetIn visible distance={scaleHeight(24)} style={styles.card}>
						{!!pending.icon && (
							<View style={[styles.iconWrap, { backgroundColor: withAlpha(accent, '14') }]}>
								<IconComponent type="materialIcons" name={pending.icon} size={scaledSize(28)} color={accent} />
							</View>
						)}
						<Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{pending.title}</Text>
						{!!pending.message && <Text style={styles.message}>{pending.message}</Text>}
						<View style={styles.btnRow}>
							{pending.cancelText !== null && (
								<TouchableOpacity style={[styles.btn, styles.cancelBtn]} activeOpacity={0.85} onPress={() => close(false)}>
									<Text style={styles.cancelText}>{pending.cancelText ?? t('common.cancel')}</Text>
								</TouchableOpacity>
							)}
							<TouchableOpacity style={[styles.btn, { backgroundColor: pending?.destructive ? Colors.errorDark : Colors.primary }]} activeOpacity={0.9} onPress={() => close(true)}>
								<Text style={[styles.confirmText, !pending?.destructive && { color: Colors.onFill }]}>{pending.confirmText ?? t('common.confirm')}</Text>
							</TouchableOpacity>
						</View>
					</SheetIn>
				)}
			</View>
		</AppModal>
	);
};

export default ConfirmModalHost;

const styles = themed(() => StyleSheet.create({
	overlay: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
	card: { width: '100%', maxWidth: Layout.dialogMaxWidth, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.xl, paddingHorizontal: Spacing.xl, paddingVertical: SpacingV.xxl, alignItems: 'center' },
	iconWrap: { width: scaleWidth(56), height: scaleWidth(56), borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: SpacingV.md },
	title: { fontSize: Typography.title, ...DisplayText, color: Colors.textStrong, textAlign: 'center' },
	message: { marginTop: SpacingV.sm, fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: scaleHeight(21) },
	btnRow: { flexDirection: 'row', alignSelf: 'stretch', gap: Spacing.sm, marginTop: SpacingV.xl },
	btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SpacingV.lg, borderRadius: Radius.md },
	cancelBtn: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong },
	cancelText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.text },
	confirmText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textInverse },
}));
