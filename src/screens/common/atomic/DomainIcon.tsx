/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Image } from 'expo-image';
import IconComponent from '@/src/screens/common/atomic/IconComponent';

interface Props {
	/** 앱 메인 아이콘 이미지(require). 있으면 이미지로, 없으면 벡터 아이콘으로 렌더 */
	mainIcon?: number;
	icon: string;
	iconType: string;
	size: number;
	color: string;
	/** 이미지 모서리 둥글기 (기본 size*0.28) */
	radius?: number;
}

/**
 * 도메인(주제) 아이콘 — CommonAppsData의 앱 메인 아이콘이 있으면 이미지로, 없으면 벡터 아이콘으로 표시
 */
const DomainIcon: React.FC<Props> = ({ mainIcon, icon, iconType, size, color, radius }) => {
	if (mainIcon) {
		return (
			<Image
				source={mainIcon}
				style={{ width: size, height: size, borderRadius: radius ?? size * 0.28 }}
				contentFit="cover"
				cachePolicy="memory-disk"
			/>
		);
	}
	return <IconComponent type={iconType} name={icon} size={size} color={color} />;
};

export default DomainIcon;
