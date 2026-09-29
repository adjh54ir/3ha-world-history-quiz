import React, { useState } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Colors from '@/src/const/ConstColors';
import { Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { scaledSize } from '@/src/utils';
import { isWideImageRef, resolveImageRef } from '@/src/const/data/world/ConstWorldImages';
import { themed } from '@/src/utils/ThemedStyles';

interface Props {
	/** 'flag:np' 꼴의 그림 참조 (LearnType.ImageRef) */
	imageRef: string;
	/** 틀의 폭 — 높이는 그림 갈래(국기는 가로로 긴 틀, 나머지는 정사각)에 맞춰 정한다 */
	width: number;
	/** 위키미디어에서 받아 올 그림 폭(px) — 작은 썸네일이면 낮춰 데이터를 아낀다 */
	fetchWidth?: number;
	style?: StyleProp<ViewStyle>;
}

/**
 * 세계 상식 항목 그림 (국기·신화·천체는 앱 내장, 위인 초상·랜드마크 사진은 위키미디어에서 받아 온다)
 * - 받아 오지 못하면 대체 그림을, 그것도 없으면 '그림을 불러오지 못했어요' 자리를 보여 준다.
 *   빈 네모만 남으면 그림 문항에서 무엇을 묻는지 알 수 없다.
 * - 참조가 바뀌면(다음 문항) 실패 표시를 되돌린다 — 실패한 참조를 들고 있어 따로 초기화하지 않는다.
 */
const EntryImage: React.FC<Props> = ({ imageRef, width, fetchWidth, style }) => {
	const [brokenRef, setBrokenRef] = useState<string | null>(null);
	const broken = brokenRef === imageRef;
	const { source, fallback } = resolveImageRef(imageRef, fetchWidth);
	const wide = isWideImageRef(imageRef);
	const height = wide ? Math.round(width * 0.62) : width;

	return (
		// 국기는 옅은 면 위에 얹는다 — 흰 바탕 국기(일본·캐나다)가 흰 카드에 묻히지 않게
		<View style={[styles.frame, wide && styles.wideFrame, { width, height }, style]}>
			{source && !broken ? (
				<Image source={source} style={styles.image} contentFit="contain" transition={160} cachePolicy="memory-disk" onError={() => setBrokenRef(imageRef)} accessibilityIgnoresInvertColors />
			) : fallback ? (
				<Image source={fallback} style={styles.image} contentFit="contain" transition={160} />
			) : (
				<View style={styles.broken}>
					<IconComponent type="materialIcons" name="image-not-supported" size={scaledSize(28)} color={Colors.textMuted} />
					<Text style={styles.brokenText}>그림을 불러오지 못했어요</Text>
				</View>
			)}
		</View>
	);
};

const styles = themed(() =>
	StyleSheet.create({
		frame: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
		wideFrame: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md },
		image: { width: '100%', height: '100%' },
		broken: { alignItems: 'center', gap: SpacingV.xs },
		brokenText: { fontSize: Typography.caption, color: Colors.textMuted },
	}),
);

export default EntryImage;
