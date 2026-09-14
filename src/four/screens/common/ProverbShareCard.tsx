import FourImages from '@/src/four/assets/FourImages';
import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/src/four/const/ConstColors';
import { Radius, FontWeight, Spacing, SpacingV, Typography } from '@/src/four/const/ConstDesign';
import type { MainDataType } from '@/src/four/types/MainDataType';
import { scaleWidth, scaledSize } from '@/src/four/utils/DementionUtils';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';
import { getHanjaTextStyle } from '@/src/four/const/ConstHanjaFont';

/** 공유 이미지 가로 크기 (정사각형에 가까운 카드) */
export const SHARE_CARD_WIDTH = scaleWidth(320);

interface Props {
	proverb: MainDataType.ProverbType;
}

/**
 * SNS 공유용 한자어 카드
 *
 * 화면에는 보이지 않는 위치에 그려 두고 `captureRef` 로 이미지를 떠 간다.
 * 캡처 대상이므로 애니메이션·스크롤 없이 정적인 레이아웃만 둔다.
 * 이미지는 캡처 전에 로드가 끝나 있어야 해서 원격이 아닌 번들 에셋만 쓴다.
 */
const ProverbShareCard = forwardRef<View, Props>(({ proverb }, ref) => (
	<View ref={ref} collapsable={false} style={styles.card}>
		<View style={styles.badge}>
			<Text style={styles.badgeText}>오늘의 한자어</Text>
		</View>

		<Text style={styles.hanja}>{proverb.hanja}</Text>
		<Text style={styles.hangul}>{proverb.hangul}</Text>

		<View style={styles.divider} />

		<Text style={styles.meaning} numberOfLines={4}>
			{proverb.shortMeaning || proverb.meaning}
		</Text>

		<View style={styles.footer}>
			<Image source={FourImages.mainIcon} style={styles.logo} resizeMode="contain" />
			<Text style={styles.footerText}>한자어 · 하루 한 문장</Text>
		</View>
	</View>
));

ProverbShareCard.displayName = 'ProverbShareCard';

export default ProverbShareCard;

const makeStyles = () => StyleSheet.create({
	card: {
		width: SHARE_CARD_WIDTH,
		paddingVertical: SpacingV.xxxl,
		paddingHorizontal: Spacing.xxl,
		borderRadius: Radius.xl,
		backgroundColor: Colors.surface,
		alignItems: 'center',
		gap: SpacingV.sm,
	},
	badge: {
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.xxs,
		borderRadius: Radius.pill,
		backgroundColor: Colors.primarySoft,
	},
	badgeText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: Colors.primaryDeep },
	hanja: { ...getHanjaTextStyle(),
		marginTop: SpacingV.md,
		fontSize: Typography.hero,
		fontWeight: FontWeight.heavy,
		letterSpacing: scaledSize(2),
		color: Colors.textStrong,
		textAlign: 'center',
	},
	hangul: { fontSize: Typography.h3, fontWeight: FontWeight.bold, color: Colors.primaryDark },
	divider: {
		width: scaleWidth(48),
		height: 1,
		marginVertical: SpacingV.md,
		backgroundColor: Colors.border,
	},
	meaning: {
		fontSize: Typography.callout,
		lineHeight: scaledSize(24),
		color: Colors.text,
		textAlign: 'center',
	},
	footer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		marginTop: SpacingV.xl,
	},
	logo: { width: scaleWidth(20), height: scaleWidth(20), borderRadius: Radius.xs },
	footerText: { fontSize: Typography.caption, fontWeight: FontWeight.semibold, color: Colors.textMuted },
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
