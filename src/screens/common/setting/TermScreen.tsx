// screens/TermsScreen.tsx
import React from 'react';

import { Spacing, SpacingV, Radius, Typography, Layout } from '@/src/const/ConstDesign';
import Colors from '@/src/const/ConstColors';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-native-markdown-display';
import { scaleHeight } from '@/src/utils/DementionUtils';
import { themed } from '@/src/utils/ThemedStyles';

/**
 * 개인정보처리방침 + 이용약관 (마크다운 본문은 i18n term.* 키)
 * - 상단 인셋은 AppLayout 이, 하단 여백은 Layout.screenBottom 이 맡는다.
 *   RN SafeAreaView 를 쓰면 상단 인셋이 두 번 들어가 View 로 둔다.
 */
const TermsScreen = () => {
	const { t } = useTranslation();
	return (
		<View style={styles.container}>
			<ScrollView contentContainerStyle={styles.scrollContainer}>
				<View style={styles.markdownBox}>
					<Markdown style={markdownStyles}>{`${t('term.privacyPolicy')}\n${t('term.termsOfUse')}`}</Markdown>
				</View>
			</ScrollView>
		</View>
	);
};

export default TermsScreen;

const styles = themed(() => StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.surface,
	},
	scrollContainer: {
		paddingTop: Layout.screenTop,
		paddingBottom: Layout.screenBottom,
		paddingHorizontal: Layout.screenH,
	},
	markdownBox: {
		backgroundColor: Colors.secondarySoft,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.secondaryLight,
		padding: Spacing.lg,
	},
}));

const markdownStyles = themed(() => ({
	body: {
		color: Colors.secondaryDark,
		fontSize: Typography.body,
		lineHeight: scaleHeight(24),
	},
	heading1: {
		fontSize: Typography.h2,
		fontWeight: 'bold',
		marginBottom: SpacingV.lg,
	},
	heading2: {
		fontSize: Typography.title,
		fontWeight: 'bold',
		marginTop: SpacingV.xxl,
		marginBottom: SpacingV.md,
	},
	heading3: {
		fontSize: Typography.callout,
		fontWeight: 'bold',
		marginTop: SpacingV.xl,
		marginBottom: SpacingV.sm,
	},
	bullet_list: {
		marginBottom: SpacingV.lg,
	},
	blockquote: {
		backgroundColor: Colors.secondaryBg,
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.sm,
		color: Colors.secondary,
	},
	link: {
		color: Colors.primary,
	},
}));
