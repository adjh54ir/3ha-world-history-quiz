/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage, type ImageSource } from 'expo-image';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Colors from '@/src/const/ConstColors';
import { Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { scaleArt, scaledSize, scaleHeight } from '@/src/utils';
import { getSharedStateIllustration, SharedStateIllustrationKey } from '@/src/const/ConstIllustrationAssets';
import { themed } from '@/src/utils/ThemedStyles';

interface Props {
	/** materialIcons 아이콘명 */
	icon: string;
	/** 안내 문구 */
	text: string;
	/** 보조 문구(선택) */
	subText?: string;
	/** 공용 상태 이미지 키 */
	illustration?: SharedStateIllustrationKey;
	/** 화면 맥락에 맞춘 전용 이미지. 지정하면 공용 상태 이미지보다 우선 */
	illustrationSource?: ImageSource | number;
	/** 상태 이미지 대신 아이콘을 사용할지 결정하는 기존 호환 옵션 */
	lottie?: boolean;
}

/**
 * 공통 빈 상태(Empty State)
 * - 리스트/검색/보관함 등에서 데이터가 없을 때 일관된 연출 + 문구를 표시
 * - 기본은 공용 빈 상태 이미지, lottie={false}면 기존 아이콘 표시
 */
const EmptyState: React.FC<Props> = ({ icon, text, subText, illustration = 'empty', illustrationSource, lottie = true }) => {
	return (
		<View style={styles.wrap}>
			{lottie ? (
				<ExpoImage source={illustrationSource ?? getSharedStateIllustration(illustration)} style={styles.illustration} contentFit="contain" />
			) : (
				<IconComponent type="materialIcons" name={icon} size={scaledSize(46)} color={Colors.textMuted} />
			)}
			<Text style={styles.text}>{text}</Text>
			{!!subText && <Text style={styles.sub} numberOfLines={2} ellipsizeMode="tail">{subText}</Text>}
		</View>
	);
};

export default EmptyState;

const styles = themed(() => StyleSheet.create({
	wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxxl, paddingVertical: SpacingV.xxxxl },
	illustration: { width: scaleArt(148), height: scaleArt(148) },
	text: { fontSize: Typography.body, color: Colors.textSecondary, fontWeight: '700', marginTop: SpacingV.lg, textAlign: 'center', lineHeight: scaleHeight(22) },
	sub: { fontSize: Typography.body, color: Colors.textMuted, marginTop: SpacingV.sm, textAlign: 'center' },
}));
