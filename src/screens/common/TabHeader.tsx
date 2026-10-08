import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image as ExpoImage, type ImageSource } from 'expo-image';
import Colors from '@/src/const/ConstColors';
import { DisplayText, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { isTablet, scaleArt, scaleHeight } from '@/src/utils';
import { themed } from '@/src/utils/ThemedStyles';

interface Props {
	/** 탭 이름 (예: 챌린지) */
	title: string;
	/** 제목 아래 한 줄 설명 */
	sub?: string;
	/** 우측 일러스트 */
	illustration?: ImageSource;
	/** 제목 옆 액션 (도움말 버튼 등) */
	right?: React.ReactNode;
	style?: StyleProp<ViewStyle>;
}

/**
 * 탭 화면 상단 헤더 (BottomTab 전용)
 * - 탭마다 제각각이던 높이·일러스트 크기·여백을 하나로 맞춘다.
 * - 높이는 세로 스케일(scaleHeight)로 잡는다. 가로 스케일로 잡으면 화면비가 다른 기기에서 탭끼리 높이가 어긋난다.
 */
const TabHeader: React.FC<Props> = ({ title, sub, illustration, right, style }) => (
	<View style={[styles.header, style]}>
		<View style={styles.copy}>
			<View style={styles.titleRow}>
				<Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
				{right}
			</View>
			{!!sub && <Text style={styles.sub} numberOfLines={2} ellipsizeMode="tail">{sub}</Text>}
		</View>
		{!!illustration && <ExpoImage source={illustration} style={styles.illustration} contentFit="contain" accessible={false} />}
	</View>
);

export default TabHeader;

const styles = themed(() => StyleSheet.create({
	header: { flexDirection: 'row', alignItems: 'center', minHeight: isTablet ? scaleArt(104) : scaleHeight(98), marginBottom: SpacingV.lg },
	copy: { flex: 1, paddingRight: Spacing.sm },
	titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	title: { fontSize: Typography.h1, ...DisplayText, color: Colors.textStrong, flexShrink: 1 },
	sub: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: SpacingV.xs, lineHeight: scaleHeight(19) },
	illustration: { width: scaleArt(104), height: scaleArt(104) },
}));
