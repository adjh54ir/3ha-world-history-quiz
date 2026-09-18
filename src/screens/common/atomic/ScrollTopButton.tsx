import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Dimensions, StyleSheet } from 'react-native';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useAnimationRunner } from '@/src/hooks/useAnimationRunner';
import { Radius, Shadow, Spacing, SpacingV } from '@/src/const/ConstDesign';
import { CONTENT_MAX_WIDTH, scaleWidth } from '@/src/utils';

interface Props {
	visible: boolean;
	onPress: () => void;
}

/**
 * 목록 맨 위로 올려 주는 떠 있는 버튼.
 * 스크롤을 조금만 내려도 뜨면 성가시므로, 언제 보일지는 부모가 정한다.
 */
const ScrollTopButton = ({ visible, onPress }: Props) => {
	const { t } = useTranslation();
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const run = useAnimationRunner();
	const anim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		run(Animated.spring(anim, { toValue: visible ? 1 : 0, friction: 8, tension: 120, useNativeDriver: true }));
	}, [visible, anim, run]);

	// 숨은 동안에는 투명하게 두고 터치만 막는다 — 뷰를 넣었다 뺐다 하면 사라지는 연출이 잘린다
	return (
		<Animated.View
			pointerEvents={visible ? 'box-none' : 'none'}
			style={[
				styles.wrap,
				{
					opacity: anim,
					transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
				},
			]}>
			<PressableScale style={styles.button} onPress={onPress} scaleTo={0.92} accessibilityRole="button" accessibilityLabel={t('common.scrollTop')}>
				<IconComponent type="materialIcons" name="keyboard-arrow-up" size={26} color={Colors.textInverse} />
			</PressableScale>
		</Animated.View>
	);
};

/** 본문 기둥의 오른쪽 바깥선 — 폰은 화면 끝(Spacing.lg)과 같다 */
const COLUMN_EDGE = Math.max(Spacing.lg, (Dimensions.get('window').width - CONTENT_MAX_WIDTH) / 2 + Spacing.lg);

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		// 태블릿은 본문이 가운데 기둥에 모여 있어, 화면 끝에 붙이면 내용에서 한참 떨어진다
		wrap: { position: 'absolute', right: COLUMN_EDGE, bottom: SpacingV.xl },
		button: {
			width: scaleWidth(44),
			height: scaleWidth(44),
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.primarySurface,
			...Shadow.floating, },
	});

export default ScrollTopButton;
