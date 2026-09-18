import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { LifeGuideButton } from './LifeCharacterGuide';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Layout, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { scaleHeight, scaleWidth } from '@/src/utils';

interface Props {
	title: string;
	/** 제목 아래 한 줄 설명 */
	subtitle?: string;
	/** 뒤로가기 버튼 노출 (스택 화면) */
	showBack?: boolean;
	/** 우측 액션 버튼 */
	rightIcon?: string;
	rightLabel?: string;
	onPressRight?: () => void;
	/** 제목 오른쪽에 붙일 보조 요소 */
	right?: React.ReactNode;
	/** 물음표(도움말 다시보기) 버튼 — 넘기면 제목 오른쪽에 붙는다 */
	onPressGuide?: () => void;
}

/**
 * 화면 상단 공통 헤더
 * - 탭/스택 화면 모두 같은 높이·여백을 쓰도록 한 곳에서 관리한다.
 */
const LifeHeader = ({ title, subtitle, showBack = false, rightIcon, rightLabel, onPressRight, right, onPressGuide }: Props) => {
	const { t } = useTranslation();
	const navigation = useNavigation();
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);

	return (
		<View style={styles.wrapper}>
			<View style={styles.row}>
				{showBack && (
					<TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.goBack')}>
						<IconComponent type="materialIcons" name="arrow-back" size={22} color={Colors.text} />
					</TouchableOpacity>
				)}
				<View style={styles.titleBox}>
					<Text style={styles.title} numberOfLines={1}>
						{title}
					</Text>
					{!!subtitle && (
						<Text style={styles.subtitle} numberOfLines={1}>
							{subtitle}
						</Text>
					)}
				</View>
				{!!onPressGuide && <LifeGuideButton onPress={onPressGuide} />}
				{!!onPressRight && (
					<TouchableOpacity style={styles.rightButton} onPress={onPressRight} activeOpacity={0.8}>
						{!!rightIcon && <IconComponent type="materialCommunityIcons" name={rightIcon} size={16} color={Colors.primaryDark} />}
						{!!rightLabel && <Text style={styles.rightLabel}>{rightLabel}</Text>}
					</TouchableOpacity>
				)}
				{right}
			</View>
		</View>
	);
};

const createStyles = (Colors: Palette) => StyleSheet.create({
	wrapper: {
		paddingHorizontal: Spacing.lg,
		// 상단은 전역 배너 바로 아래에 붙으므로 여백을 최소로 둔다
		paddingTop: SpacingV.sm,
		paddingBottom: SpacingV.md,
		backgroundColor: Colors.background,
	},
	// 태블릿에서 제목이 화면 왼쪽 끝에 붙지 않도록 본문 카드와 같은 칼럼에 맞춘다
	row: {
		...Layout.column,
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
	},
	backButton: {
		width: scaleWidth(32),
		height: scaleWidth(32),
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: -scaleWidth(6), },
	titleBox: { flex: 1 },
	title: {
		fontSize: Typography.h2,
		fontWeight: FontWeight.bold,
		color: Colors.textStrong,
		letterSpacing: -0.3,
	},
	subtitle: {
		marginTop: scaleHeight(3),
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
	},
	rightButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: scaleWidth(4),
		paddingHorizontal: Spacing.md,
		height: scaleHeight(34),
		borderRadius: Radius.pill,
		backgroundColor: Colors.primarySoft,
	},
	rightLabel: {
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.bold,
		color: Colors.primaryDark,
	},
});

export default LifeHeader;
