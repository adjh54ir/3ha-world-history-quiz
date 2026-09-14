/**
 * react-native-fast-image 자리 — 이 앱은 expo-image 를 쓴다.
 * 옮겨 온 화면들이 `resizeMode` 와 `FastImage.resizeMode.contain` 을 쓰므로
 * expo-image 의 `contentFit` 으로 바꿔 주는 얇은 껍데기만 둔다.
 */
import React from 'react';
import type { ImageStyle, StyleProp } from 'react-native';
import { Image, type ImageContentFit, type ImageSource } from 'expo-image';

type ResizeMode = 'contain' | 'cover' | 'stretch' | 'center';

interface Props {
	source: ImageSource | number | { uri: string };
	style?: StyleProp<ImageStyle>;
	resizeMode?: ResizeMode;
	tintColor?: string;
	accessible?: boolean;
	accessibilityLabel?: string;
}

/** resizeMode 이름이 expo-image 에서 두 개 다르다 — stretch 는 fill, center 는 none */
const CONTENT_FIT: Record<ResizeMode, ImageContentFit> = {
	contain: 'contain',
	cover: 'cover',
	stretch: 'fill',
	center: 'none',
};

const toContentFit = (mode?: ResizeMode): ImageContentFit => CONTENT_FIT[mode ?? 'cover'];

const FastImage = ({ source, style, resizeMode, tintColor, accessible, accessibilityLabel }: Props) => (
	<Image
		source={source as ImageSource}
		style={style as StyleProp<ImageStyle>}
		contentFit={toContentFit(resizeMode)}
		tintColor={tintColor}
		accessible={accessible}
		accessibilityLabel={accessibilityLabel}
		// 원본(FastImage)은 디스크 캐시가 기본이라 마스코트가 매번 다시 그려지지 않았다
		cachePolicy="memory-disk"
		transition={0}
	/>
);

/** `FastImage.resizeMode.contain` 꼴로 쓰던 자리 */
FastImage.resizeMode = { contain: 'contain', cover: 'cover', stretch: 'stretch', center: 'center' } as const;

export default FastImage;
