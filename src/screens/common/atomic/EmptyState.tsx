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
import { FadeInUp, Pulse } from '@/src/screens/common/anim/Motion';

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
		// 빈 화면도 살짝 떠오르며 등장하고, 일러스트는 숨 쉬듯 아주 작게 움직인다 ('동작 줄이기' 설정 시 정지)
		<FadeInUp style={styles.wrap} distance={18} duration={420}>
			<Pulse minOpacity={1} minScale={0.97} maxScale={1.03} duration={1600}>
				{lottie ? (
					<ExpoImage source={illustrationSource ?? getSharedStateIllustration(illustration)} style={styles.illustration} contentFit="contain" />
				) : (
					<View style={styles.iconCircle}>
						<IconComponent type="materialIcons" name={icon} size={scaledSize(40)} color={Colors.textMuted} />
					</View>
				)}
			</Pulse>
			<Text style={styles.text}>{text}</Text>
			{!!subText && <Text style={styles.sub} numberOfLines={2} ellipsizeMode="tail">{subText}</Text>}
		</FadeInUp>
	);
};

export default EmptyState;

const styles = themed(() => StyleSheet.create({
	wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxxl, paddingVertical: SpacingV.xxxxl },
	illustration: { width: scaleArt(148), height: scaleArt(148) },
	iconCircle: { width: scaledSize(84), height: scaledSize(84), borderRadius: scaledSize(42), backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
	text: { fontSize: Typography.body, color: Colors.textSecondary, fontWeight: '700', marginTop: SpacingV.lg, textAlign: 'center', lineHeight: scaleHeight(22) },
	sub: { fontSize: Typography.body, color: Colors.textMuted, marginTop: SpacingV.sm, textAlign: 'center', lineHeight: scaleHeight(20) },
}));
