import React, { useState } from 'react';
import { LayoutAnimation, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image, type ImageLoadEventData } from 'expo-image';
import { useTranslation } from 'react-i18next';
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
	/** 목록 썸네일처럼 작은 틀 — 실패 시 안내 문구 없이 아이콘만 */
	compact?: boolean;
	/** 눌러서 크게 보기 — 상세 팝업처럼 그림을 자세히 볼 자리에서만 켠다 (놓인 자리의 폭까지 커진다) */
	zoomable?: boolean;
}

/** 크게 볼 때 받아 올 폭 — 위키미디어가 미리 만들어 둔 칸(ConstFigureImages 참고) */
const ZOOM_FETCH_WIDTH = 960;

/**
 * 세계 상식 항목 그림 (국기·신화·천체는 앱 내장, 위인 초상·랜드마크 사진은 위키미디어에서 받아 온다)
 * - 받아 오지 못하면 대체 그림을, 그것도 없으면 '그림을 불러오지 못했어요' 자리를 보여 준다.
 *   빈 네모만 남으면 그림 문항에서 무엇을 묻는지 알 수 없다.
 * - 참조가 바뀌면(다음 문항) 실패 표시를 되돌린다 — 실패한 참조를 들고 있어 따로 초기화하지 않는다.
 * - 그림 모서리를 살짝 굴린다 (국기는 작게, 초상·사진은 크게). 틀이 아니라 그림 크기에 맞춰 굴려야 여백 쪽 모서리가 각지지 않는다.
 * - zoomable 이면 눌러서 놓인 자리 폭만큼 키웠다 줄인다 (팝업을 하나 더 띄우지 않는다 — 시트 위 모달은 앞 모달이 닫혀야 뜬다).
 */
const EntryImage: React.FC<Props> = ({ imageRef, width: baseWidth, fetchWidth, style, compact, zoomable }) => {
	const { t } = useTranslation();
	const [brokenRef, setBrokenRef] = useState<string | null>(null);
	// 받아 온 그림의 가로세로 비 — 그림 크기에 딱 맞춘 틀에 모서리를 굴려야 contain 으로 남는 여백 없이 그림 자체가 둥글어진다
	const [loaded, setLoaded] = useState<{ ref: string; ratio: number } | null>(null);
	// 크게 보기 — 놓인 자리의 폭을 재 두고 그 폭까지 키운다. 참조째 들고 있어 다른 항목으로 바뀌면 작게 돌아간다
	const [zoomedRef, setZoomedRef] = useState<string | null>(null);
	const [roomW, setRoomW] = useState(0);
	const broken = brokenRef === imageRef;
	const canZoom = !!zoomable && !broken && roomW > baseWidth;
	const big = canZoom && zoomedRef === imageRef;
	const width = big ? roomW : baseWidth;
	const { source, fallback } = resolveImageRef(imageRef, big ? ZOOM_FETCH_WIDTH : fetchWidth);
	// 크게 받는 동안에는 이미 받아 둔 작은 그림을 깔아 빈 틀이 보이지 않게 한다 (큰 그림을 못 받으면 작게 되돌린다)
	const lowRes = big ? resolveImageRef(imageRef, fetchWidth).source : undefined;
	const wide = isWideImageRef(imageRef);
	const height = wide ? Math.round(width * 0.62) : width;

	// 틀 안쪽(국기 틀은 안쪽 여백이 있다)에 그림 비율대로 맞춘 크기 — 비율을 알기 전에는 틀을 꽉 채운다
	const flatPad = StyleSheet.flatten(style)?.padding;
	const pad = typeof flatPad === 'number' ? flatPad : wide ? (compact ? Spacing.xs : Spacing.md) : 0;
	const boxW = width - pad * 2;
	const boxH = height - pad * 2;
	const ratio = loaded?.ref === imageRef ? loaded.ratio : null;
	const fit = ratio ? (ratio > boxW / boxH ? { width: boxW, height: boxW / ratio } : { width: boxH * ratio, height: boxH }) : styles.image;
	// 작은 틀일수록 덜 굴린다 — 목록 썸네일 국기는 CountryFlags 와 같은 반경
	const round = { borderRadius: compact ? (wide ? Radius.sm / 2 : Radius.sm) : wide ? Radius.sm : Radius.md };
	const onLoad = (e: ImageLoadEventData) => {
		const { width: w, height: h } = e.source;
		if (w > 0 && h > 0) setLoaded({ ref: imageRef, ratio: w / h });
	};

	const toggleZoom = () => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setZoomedRef(big ? null : imageRef);
	};

	const frame = (
		// 국기는 옅은 면 위에 얹는다 — 흰 바탕 국기(일본·캐나다)가 흰 카드에 묻히지 않게
		// 그림을 끝내 못 그리면 옅은 면을 깔아 빈 자리가 아니라 '그림 자리' 로 보이게 한다
		<View style={[styles.frame, wide && styles.wideFrame, wide && compact && styles.compactWide, !wide && (broken || !source) && !fallback && styles.brokenFrame, { width, height }, style]}>
			{source && !broken ? (
				<Image source={source} placeholder={lowRes} placeholderContentFit="contain" style={[fit, round]} contentFit="contain" transition={160} cachePolicy="memory-disk" onLoad={onLoad} onError={() => (big ? setZoomedRef(null) : setBrokenRef(imageRef))} accessibilityIgnoresInvertColors />
			) : fallback ? (
				<Image source={fallback} style={[fit, round]} contentFit="contain" transition={160} onLoad={onLoad} />
			) : (
				<View style={styles.broken}>
					<IconComponent type="materialIcons" name="image-not-supported" size={scaledSize(compact ? 20 : 28)} color={Colors.textMuted} />
					{!compact && <Text style={styles.brokenText}>{t('atomic.entryImage.broken')}</Text>}
				</View>
			)}
			{canZoom && (
				<View style={styles.zoomBadge} pointerEvents="none">
					<IconComponent type="materialIcons" name={big ? 'zoom-in-map' : 'zoom-out-map'} size={scaledSize(14)} color={Colors.textSecondary} />
				</View>
			)}
		</View>
	);

	if (!zoomable) return frame;
	return (
		<View style={styles.zoomRoom} onLayout={(e) => setRoomW(Math.floor(e.nativeEvent.layout.width))}>
			<Pressable onPress={toggleZoom} disabled={!canZoom} accessibilityRole="button" accessibilityLabel={t(big ? 'atomic.entryImage.zoomOut' : 'atomic.entryImage.zoomIn')}>
				{frame}
			</Pressable>
		</View>
	);
};

const styles = themed(() =>
	StyleSheet.create({
		frame: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
		wideFrame: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md },
		compactWide: { padding: Spacing.xs },
		image: { width: '100%', height: '100%' },
		brokenFrame: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md },
		broken: { alignItems: 'center', gap: SpacingV.xs },
		brokenText: { fontSize: Typography.caption, color: Colors.textMuted },
		// 크게 보기 — 놓인 자리 폭을 재는 줄, 오른쪽 아래 확대 표시
		zoomRoom: { alignSelf: 'stretch', alignItems: 'center' },
		zoomBadge: { position: 'absolute', right: Spacing.xs, bottom: Spacing.xs, width: scaledSize(24), height: scaledSize(24), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
	}),
);

export default EntryImage;
