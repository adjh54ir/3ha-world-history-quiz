import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import IconComponent from './IconComponent';
import { Palette } from '@/src/const/ConstColors';
import { useThemedStyles } from '@/src/hooks/useTheme';
import { Radius } from '@/src/const/ConstDesign';
import { scaleWidth } from '@/src/utils';

interface Props {
	/** 아이콘 이름 (close / star / star-outline …) */
	name: string;
	/** 아이콘 세트 — 기본은 MaterialIcons */
	type?: string;
	color: string;
	onPress: () => void;
	/** 아이콘 크기 — 기본 26 */
	size?: number;
	accessibilityLabel?: string;
	style?: StyleProp<ViewStyle>;
}

/**
 * 팝업 상단의 닫기·즐겨찾기 같은 아이콘 버튼.
 *
 * 아이콘만 두면 눌러야 할 곳이 작아 자꾸 빗나간다 — 40pt 정사각 터치 영역과
 * 옅은 배경 면을 함께 둬서 "누를 수 있는 자리"로 읽히게 한다.
 */
const ModalIconButton = ({ name, type = 'materialIcons', color, onPress, size, accessibilityLabel, style }: Props) => {
	const styles = useThemedStyles(createStyles);
	return (
		<TouchableOpacity
			style={[styles.button, style]}
			onPress={onPress}
			hitSlop={8}
			activeOpacity={0.7}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}>
			{/* IconComponent 가 크기를 한 번 더 반응형으로 키우므로 여기서는 기준값만 준다 */}
			<IconComponent type={type} name={name} size={size ?? 26} color={color} />
		</TouchableOpacity>
	);
};

const createStyles = (Colors: Palette) => StyleSheet.create({
	button: {
		width: scaleWidth(40),
		height: scaleWidth(40),
		borderRadius: Radius.pill,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.surfaceAlt,
	},
});

export default ModalIconButton;
