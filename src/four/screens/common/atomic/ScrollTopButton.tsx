import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';

import { Colors } from '@/src/four/const/ConstColors';
import { HitSlop, Radius } from '@/src/four/const/ConstDesign';
import { scaleHeight, scaleWidth, scaledSize } from '@/src/four/utils/DementionUtils';
import IconComponent from './IconComponent';
import useAnimationCleanup from '@/src/four/hooks/useAnimationCleanup';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';

interface Props {
	/** 노출 여부 — 스크롤 위치에 따라 화면이 내려준다 */
	visible: boolean;
	onPress: () => void;
	/** 하단 고정 버튼과 겹치는 화면만 값을 올린다 (기본 16) */
	bottom?: number;
}

/**
 * 스크롤 최상단 이동 버튼 (공통)
 *
 * 화면마다 크기(40/45)·위치(16/24/32)·아이콘이 제각각이라 하나로 모았다.
 * 사라질 때도 애니메이션을 태워야 하므로 visible 이 false 가 된 뒤
 * 페이드아웃이 끝나면 언마운트한다.
 */
const ScrollTopButton = ({ visible, onPress, bottom }: Props) => {
	const progress = useRef(new Animated.Value(0)).current;
	const [mounted, setMounted] = useState(visible);

	useAnimationCleanup(progress);

	useEffect(() => {
		if (visible) {
			setMounted(true);
		}

		const anim = Animated.timing(progress, {
			toValue: visible ? 1 : 0,
			duration: 200,
			useNativeDriver: true,
		});
		anim.start(({ finished }) => {
			// 페이드아웃이 끝까지 간 경우에만 언마운트 (중간에 다시 보이면 유지)
			if (finished && !visible) {
				setMounted(false);
			}
		});

		return () => anim.stop();
	}, [visible, progress]);

	if (!mounted) {
		return null;
	}

	return (
		<Animated.View
			style={[
				styles.button,
				bottom !== undefined && { bottom },
				{
					opacity: progress,
					transform: [
						{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
						{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(12), 0] }) },
					],
				},
			]}>
			<TouchableOpacity
				activeOpacity={0.8}
				hitSlop={HitSlop}
				onPress={onPress}
				style={styles.touchArea}
				accessibilityRole="button"
				accessibilityLabel="맨 위로 이동">
				<IconComponent type="fontawesome6" name="arrow-up" size={scaledSize(20)} color={Colors.textInverse} />
			</TouchableOpacity>
		</Animated.View>
	);
};

export default ScrollTopButton;

const makeStyles = () => StyleSheet.create({
	button: {
		position: 'absolute',
		right: scaleWidth(16),
		bottom: scaleHeight(16),
		width: scaleWidth(44),
		height: scaleWidth(44),
		borderRadius: Radius.pill,
		backgroundColor: Colors.secondarySurface,
	},
	touchArea: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
