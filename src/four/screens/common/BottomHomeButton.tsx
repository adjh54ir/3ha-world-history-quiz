import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppModal from '@/src/four/screens/common/atomic/AppModal';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@/src/four/navigation/compat';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils/DementionUtils';
import { Paths } from '@/src/four/navigation/conf/Paths';
import IconComponent from './atomic/IconComponent';
import { Typography, FontWeight, Spacing, SpacingV, Radius } from '@/src/four/const/ConstDesign';
import { Colors, onSurface } from '@/src/four/const/ConstColors';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';

const BottomHomeButton = ({
	paddingBottom,
	backgroundColor = Colors.surface,
	borderColor = Colors.border,
	textColor = Colors.text,
	iconColor = Colors.textDeep,
	confirmTitle,
	confirmMessage,
}: {
	paddingBottom?: number;
	backgroundColor?: string;
	borderColor?: string;
	textColor?: string;
	iconColor?: string;
	confirmTitle?: string;
	confirmMessage?: string;
}) => {
	const { t } = useTranslation();
	const title = confirmTitle ?? t('exitQuiz.title');
	const message = confirmMessage ?? t('exitQuiz.body');
	const navigation = useNavigation<any>();
	const [showConfirm, setShowConfirm] = useState(false);

	const styles = StyleSheet.create({
		wrapper: {
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor,
			// 화면 폭을 꽉 채운 띠로 보이지 않게 좌우를 줄이고 모서리를 둥글린다
			marginHorizontal: Spacing.lg,
			borderRadius: Radius.lg,
			// 위아래 여백을 같게 줘야 버튼이 띠 한가운데 온다.
			// 화면 아래 끝과의 간격은 padding 이 아니라 margin 으로 띄운다 — padding 으로 주면 버튼이 위로 밀린다.
			paddingVertical: SpacingV.sm,
		},
		button: {
			borderColor,
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.sm,
			borderWidth: 1,
			borderRadius: Radius.xxl,
			paddingVertical: SpacingV.sm,
			paddingHorizontal: Spacing.xxl,
			backgroundColor,
		},
		text: {
			fontSize: Typography.footnote,
			fontWeight: FontWeight.semibold,
			color: textColor,
		},
	});

	const goHome = () => {
		setShowConfirm(false);
		// replace 는 스택 아래에 이미 있는 MAIN_TAB 을 그대로 두고 새 인스턴스를 하나 더 얹는다.
		// navigate 면 기존 탭으로 되돌아가므로 중복 마운트가 없다.
		navigation.navigate(Paths.MAIN_TAB, { screen: Paths.HOME });
	};

	return (
		// 화면 대부분이 SafeAreaView edges에 'bottom'을 포함해 인셋을 이미 먹는다.
		// 여기서 또 더하면 여백이 두 겹으로 벌어진다 — 넘겨받은 값만 쓴다.
		<View style={[styles.wrapper, { marginBottom: scaleHeight(paddingBottom ?? 0) }]}>
			<TouchableOpacity style={styles.button} onPress={() => setShowConfirm(true)} activeOpacity={0.85}>
				<IconComponent type="MaterialIcons" name="home" size={scaledSize(14)} color={iconColor} />
				<Text style={styles.text}>HOME</Text>
			</TouchableOpacity>

			<AppModal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
				<View style={modalStyles.overlay}>
					<View style={modalStyles.card}>
						<View style={modalStyles.iconCircle}>
							<IconComponent type="materialIcons" name="logout" size={scaledSize(26)} color={Colors.error} />
						</View>
						<Text style={modalStyles.title}>{title}</Text>
						<Text style={modalStyles.message}>{message}</Text>
						<View style={modalStyles.buttonRow}>
							<TouchableOpacity style={modalStyles.cancelBtn} onPress={() => setShowConfirm(false)} activeOpacity={0.85}>
								<Text style={modalStyles.cancelText}>{t('common.cancel')}</Text>
							</TouchableOpacity>
							<TouchableOpacity style={modalStyles.confirmBtn} onPress={goHome} activeOpacity={0.85}>
								<Text style={modalStyles.confirmText}>{t('common.leave')}</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</AppModal>
		</View>
	);
};

export default BottomHomeButton;

const makeModalStyles = () => StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: Colors.scrim,
		justifyContent: 'center',
		alignItems: 'center',
		padding: Spacing.xxl,
	},
	card: {
		width: '100%',
		maxWidth: scaleWidth(320),
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		paddingVertical: SpacingV.xxl,
		paddingHorizontal: Spacing.xl,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: Colors.border,
	},
	iconCircle: {
		width: scaleWidth(52),
		height: scaleWidth(52),
		borderRadius: scaleWidth(26),
		backgroundColor: Colors.errorBg,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: SpacingV.md,
	},
	title: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.heavy,
		color: Colors.textStrong,
		marginBottom: SpacingV.sm,
		textAlign: 'center',
	},
	message: {
		fontSize: Typography.body,
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: scaledSize(19),
		marginBottom: SpacingV.xl,
	},
	buttonRow: { flexDirection: 'row', gap: Spacing.md, width: '100%' },
	cancelBtn: {
		flex: 1,
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.md,
		alignItems: 'center',
	},
	cancelText: { fontSize: Typography.body, fontWeight: FontWeight.heavy, color: Colors.textSecondary },
	confirmBtn: {
		flex: 1,
		backgroundColor: Colors.error,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.md,
		alignItems: 'center',
	},
	// 나가기 버튼 면은 error — 다크에서 밝은 살몬(#F87171)이 되어 흰 글씨가 2.8:1 로 뭉개진다
	confirmText: { fontSize: Typography.body, fontWeight: FontWeight.heavy, color: onSurface(Colors.error) },
});
let modalStyles = makeModalStyles();
registerThemedStyles(() => {
	modalStyles = makeModalStyles();
});
