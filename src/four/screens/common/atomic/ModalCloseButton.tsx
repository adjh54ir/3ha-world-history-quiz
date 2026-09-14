/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils';
import IconComponent from './IconComponent';
import { Colors } from '@/src/four/const/ConstColors';
import { Spacing } from '@/src/four/const/ConstDesign';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';

/**
 * 모달 공통 닫기(X) 버튼 — 모든 콘텐츠 모달의 닫기 위치/아이콘/색을 통일합니다.
 * - 위치: 카드(컨테이너) 우상단 고정
 * - 컨테이너에 position:relative 또는 overflow 설정이 있으면 그 기준으로 배치됩니다.
 */
interface ModalCloseButtonProps {
	onPress: () => void;
	/** 컬러 헤더 밴드 위에 올릴 때 흰색 등으로 변경 */
	color?: string;
	style?: StyleProp<ViewStyle>;
}

const ModalCloseButton: React.FC<ModalCloseButtonProps> = ({ onPress, color = Colors.textSecondary, style }) => {
	return (
		<TouchableOpacity
			style={[styles.btn, style]}
			onPress={onPress}
			activeOpacity={0.7}
			accessibilityRole="button"
			accessibilityLabel="닫기"
			hitSlop={{ top: scaleHeight(8), bottom: scaleHeight(8), left: scaleWidth(8), right: scaleWidth(8) }}>
			<IconComponent type="materialIcons" name="close" size={scaledSize(22)} color={color} />
		</TouchableOpacity>
	);
};

export default ModalCloseButton;

const makeStyles = () => StyleSheet.create({
	btn: {
		position: 'absolute',
		top: scaleHeight(12),
		right: scaleWidth(12),
		zIndex: 20,
		padding: Spacing.xs,
	},
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
