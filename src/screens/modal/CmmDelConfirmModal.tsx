// CommonConfirmModal.tsx
import React, { FC, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import AppModal from '@/src/screens/common/atomic/AppModal';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import { Palette, onSurface } from '@/src/const/ConstColors';
import { FontWeight, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { useThemedStyles } from '@/src/hooks/useTheme';
import { MODAL_MAX_WIDTH, scaleHeight, scaleWidth } from '@/src/utils';

type Props = {
	visible: boolean;
	onCancel: () => void;
	onConfirm?: () => void;
	onRequestClose?: () => void; // Android 백버튼 대응 (없으면 onCancel로 fallback)

	// 제목은 문자열 또는 커스텀 노드(아이콘 포함 타이틀 등) 모두 지원
	title?: string;
	renderTitle?: () => React.ReactNode;

	// 본문 요약/설명
	summary?: string;
	children?: React.ReactNode; // 커스텀 콘텐츠가 필요할 때 사용

	// 버튼 텍스트와 스타일
	cancelText?: string;
	confirmText?: string;
	confirmVariant?: 'default' | 'delete'; // delete는 빨강 버튼 적용

	/** 확인 버튼만 필요한 안내용 모달 — 취소 버튼을 숨긴다 */
	hideCancel?: boolean;
};

const CmmDelConfirmModal: FC<Props> = ({
	visible,
	onCancel,
	onConfirm,
	onRequestClose,
	title,
	renderTitle,
	summary,
	children,
	cancelText,
	confirmText,
	confirmVariant = 'delete',
	hideCancel = false,
}) => {
	const { t } = useTranslation();
	const _onRequestClose = onRequestClose ?? onCancel;
	const styles = useThemedStyles(createStyles);

	// 카드가 살짝 커지며 떠오르는 진입 연출 — 열 때마다 처음부터 다시 돈다.
	// (마운트 기준으로 걸면 닫힌 채 마운트된 뒤 첫 열기부터 연출 없이 툭 뜬다)
	const pop = useRef(new Animated.Value(0)).current;
	useEffect(() => {
		if (!visible) {
			pop.setValue(0);
			return;
		}
		const anim = Animated.timing(pop, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true });
		anim.start();
		return () => anim.stop();
	}, [visible, pop]);

	// 닫히는 순간 바로 언마운트한다. 사라지는 애니메이션 동안 이미 비워진 내용이 남아 "이전 모달이 깜빡"이는 것처럼 보인다
	if (!visible) {
		return null;
	}

	return (
		<AppModal visible={visible} onClose={_onRequestClose} avoidKeyboard>
			<Animated.View
					style={[
						styles.modalContainer,
						{
							opacity: pop,
							transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
						},
					]}>
					{renderTitle ? (
						renderTitle()
					) : title ? (
						<Text style={styles.modalTitle} numberOfLines={2} ellipsizeMode="tail">
							{title}
						</Text>
					) : null}

					{summary ? <Text style={styles.modalSummary}>{summary}</Text> : null}
					{children}

					<View style={styles.modalButtons}>
						{!hideCancel && (
							<PressableScale style={[styles.modalButton, styles.modalCancel]} accessibilityRole="button" onPress={onCancel}>
								<Text style={styles.modalCancelText} numberOfLines={1}>
									{cancelText ?? t('common.cancel')}
								</Text>
							</PressableScale>
						)}
						<PressableScale
							style={[styles.modalButton, confirmVariant === 'delete' ? styles.modalDelete : styles.modalDefault]}
							accessibilityRole="button"
							onPress={onConfirm}>
							{/* 삭제 버튼 면은 error — 다크에서 밝은 살몬이 되어 흰 글씨가 뭉개지므로 면 밝기에 맞춘다 */}
							<Text
								style={[styles.modalConfirmText, confirmVariant === 'delete' && styles.modalConfirmTextDelete]}
								numberOfLines={1}>
								{confirmText ?? t('common.delete')}
							</Text>
						</PressableScale>
					</View>
			</Animated.View>
		</AppModal>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		modalContainer: {
			width: '100%',
			maxWidth: Math.min(scaleWidth(340), MODAL_MAX_WIDTH),
			alignSelf: 'center',
			backgroundColor: Colors.surface,
			borderRadius: Radius.xl,
			paddingTop: SpacingV.xxl,
			paddingBottom: SpacingV.xl,
			paddingHorizontal: Spacing.xl,
		},
		modalTitle: {
			fontSize: Typography.subtitle,
			fontWeight: FontWeight.bold,
			color: Colors.textStrong,
			textAlign: 'center',
			marginBottom: SpacingV.sm,
		},
		modalSummary: {
			fontSize: Typography.body,
			color: Colors.textSecondary,
			textAlign: 'center',
			lineHeight: Math.round(Typography.body * 1.55),
			marginBottom: SpacingV.xxl,
		},
		modalButtons: {
			flexDirection: 'row',
			gap: Spacing.md,
		},
		modalButton: {
			flex: 1,
			minHeight: scaleHeight(48),
			borderRadius: Radius.md,
			alignItems: 'center',
			justifyContent: 'center', paddingVertical: SpacingV.sm, },
		modalCancel: {
			backgroundColor: Colors.surfaceAlt,
		},
		modalDelete: {
			backgroundColor: Colors.error,
		},
		modalDefault: {
			backgroundColor: Colors.primarySurface,
		},
		modalCancelText: {
			color: Colors.textSecondary,
			fontSize: Typography.body,
			fontWeight: FontWeight.semibold,
		},
		// 삭제 버튼 면은 error — 다크에서 밝은 살몬(#F87171)이 되어 흰 글씨가 2.8:1 로 뭉개진다
		modalConfirmTextDelete: { color: onSurface(Colors.error) },
		modalConfirmText: {
			color: Colors.textInverse,
			fontSize: Typography.body,
			fontWeight: FontWeight.bold,
		},
	});

export default CmmDelConfirmModal;
