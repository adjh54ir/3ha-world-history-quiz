import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import IconComponent from './IconComponent';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { scaleHeight, scaleWidth } from '@/src/utils';

interface Props {
	/** 표시할 문구 — 값이 있으면 뜨고, 지정 시간 뒤 스스로 사라진다 */
	message: string | null;
	/** 사라진 뒤 상위 상태를 비우도록 알린다 */
	onHide: () => void;
	icon?: string;
	/** 노출 시간(ms) */
	duration?: number;
	/** 되돌리기처럼 토스트 안에서 바로 누를 동작 — 있으면 토스트가 터치를 받는다 */
	actionLabel?: string;
	onAction?: () => void;
	/** 캐릭터 일러스트 — 있으면 아이콘 대신 마스코트가 톡 튀어나오는 카드형으로 바뀐다 */
	image?: ImageSourcePropType;
	/** 캐릭터 토스트의 둘째 줄 */
	subMessage?: string;
}

/**
 * 화면 하단 토스트
 * - 별도 라이브러리 없이 Animated 만 쓴다. 화면 위에 겹쳐 띄우려면 부모의 마지막 자식으로 둔다.
 */
const ToastMessage = ({ message, onHide, icon = 'check-circle', duration = 1400, actionLabel, onAction, image, subMessage }: Props) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const anim = useRef(new Animated.Value(0)).current;
	// 캐릭터만 한 박자 늦게 튀어나온다 — 카드가 뜨고 마스코트가 뒤따라야 눈이 캐릭터로 간다
	const pop = useRef(new Animated.Value(0)).current;
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	// 부모가 인라인 콜백을 넘겨도 effect 가 다시 돌지 않도록 최신 값만 참조로 들고 있는다
	const hideRef = useRef(onHide);
	hideRef.current = onHide;

	useEffect(() => {
		if (!message) {
			return;
		}
		Animated.timing(anim, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
		pop.setValue(0);
		Animated.spring(pop, { toValue: 1, delay: 90, friction: 5, tension: 90, useNativeDriver: true }).start();
		timer.current = setTimeout(() => {
			Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
				if (finished) {
					hideRef.current();
				}
			});
		}, duration);

		return () => {
			if (timer.current) {
				clearTimeout(timer.current);
			}
			// 타이머만 지우면 진행 중인 페이드가 남는다 — 값 자체도 정지시킨다
			anim.stopAnimation();
			pop.stopAnimation();
		};
	}, [message, duration, anim, pop]);

	if (!message) {
		return null;
	}

	return (
		<Animated.View
			// 동작 버튼이 있을 때만 터치를 받는다 — 평소에는 화면 조작을 가리지 않는다
			pointerEvents={onAction ? 'box-none' : 'none'}
			style={[
				styles.wrapper,
				{
					opacity: anim,
					transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(16), 0] }) }],
				},
			]}>
			<View style={[styles.toast, !!image && styles.toastCharacter]}>
				{image ? (
					<Animated.View
						style={[
							styles.mascotBox,
							{
								opacity: pop,
								transform: [
									{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
									{ rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '0deg'] }) },
								],
							},
						]}>
						<Image source={image} style={styles.mascot} contentFit="contain" accessible={false} />
						{/* 무엇을 알리는 토스트인지 캐릭터 어깨에 작은 배지로 얹는다 */}
						<View style={styles.mascotBadge}>
							<IconComponent type="materialCommunityIcons" name={icon} size={12} color={Colors.textInverse} />
						</View>
					</Animated.View>
				) : (
					<IconComponent type="materialCommunityIcons" name={icon} size={18} color={Colors.toastText} />
				)}
				<View style={styles.copy}>
					<Text style={styles.text}>{message}</Text>
					{!!subMessage && <Text style={styles.subText}>{subMessage}</Text>}
				</View>
				{!!actionLabel && !!onAction && (
					<TouchableOpacity style={styles.action} activeOpacity={0.8} onPress={onAction} hitSlop={8}>
						<Text style={styles.actionText}>{actionLabel}</Text>
					</TouchableOpacity>
				)}
			</View>
		</Animated.View>
	);
};

const createStyles = (Colors: Palette) => StyleSheet.create({
	wrapper: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: scaleHeight(96),
		alignItems: 'center',
		paddingHorizontal: Spacing.xl,
	},
	toast: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.lg,
		borderRadius: Radius.pill,
		backgroundColor: Colors.toastBg,
		...Shadow.floating,
	},
	toastCharacter: {
		minWidth: scaleWidth(286),
		maxWidth: scaleWidth(344),
		paddingVertical: SpacingV.sm,
		paddingLeft: Spacing.xs,
		paddingRight: Spacing.lg,
		borderRadius: Radius.xl,
		borderTopWidth: scaleHeight(2),
		borderTopColor: Colors.accentAmber,
	},
	mascotBox: { width: scaleWidth(58), height: scaleWidth(58), alignItems: 'center', justifyContent: 'center' },
	mascot: { width: '100%', height: '100%' },
	mascotBadge: {
		position: 'absolute',
		right: 0,
		bottom: scaleHeight(1),
		width: scaleWidth(18),
		height: scaleWidth(18),
		borderRadius: Radius.pill,
		backgroundColor: Colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	copy: { flexShrink: 1, gap: scaleHeight(2) },
	text: { fontSize: Typography.bodySm, fontWeight: FontWeight.semibold, color: Colors.toastText },
	subText: { fontSize: Typography.caption, color: Colors.toastText, opacity: 0.72 },
	action: {
		marginLeft: Spacing.xs,
		paddingHorizontal: Spacing.md,
		height: scaleHeight(28),
		borderRadius: Radius.pill,
		backgroundColor: Colors.primarySurface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textInverse },
});

export default ToastMessage;
