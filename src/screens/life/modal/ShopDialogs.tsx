import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import AppModal from '@/src/screens/common/atomic/AppModal';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { Palette } from '@/src/const/ConstColors';
import { useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { MODAL_MAX_WIDTH, scaleHeight, scaleWidth } from '@/src/utils';
import type { InventoryItem } from '@/src/hooks/useLife';

/**
 * 내 가방에서 하나를 눌렀을 때 보여 줄 값.
 * 목록 자체는 useInventory 한 곳에서 오고(홈·상점 공용), 여기서는 "쓰러 가는 길" 만 덧붙인다.
 */
export interface BagItem extends InventoryItem {
	/**
	 * 이 물건을 실제로 쓰는 자리로 보내는 길 — 없으면 닫기 버튼만 둔다.
	 * 설명만 읽고 끝나면 "그럼 어디서 쓰지?" 가 남는다. 쓰는 화면이 정해진 물건은 여기서 바로 보낸다.
	 */
	action?: { label: string; icon: string; onPress: () => void };
}

/**
 * 내 가방 상세 — 칩만 보면 개수만 알 수 있어, 눌러서 무슨 물건인지 읽게 한다.
 */
export const BagItemModal = ({ item, onClose }: { item: BagItem | null; onClose: () => void }) => {
	const styles = useThemedStyles(createStyles);
	const pop = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!item) {
			return;
		}
		pop.setValue(0);
		const enter = Animated.spring(pop, { toValue: 1, friction: 7, tension: 110, useNativeDriver: true });
		enter.start();
		return () => enter.stop();
	}, [item, pop]);

	if (!item) {
		return null;
	}

	return (
		<AppModal visible onClose={onClose}>
			<Animated.View style={[styles.card, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
				<View style={[styles.ribbon, styles.ribbonBag]}>
					<IconComponent type="materialCommunityIcons" name="bag-personal" size={13} color="#FFFFFF" />
					<Text style={styles.ribbonText}>내 가방</Text>
				</View>

				<View style={styles.productStage}>
					<Image source={item.image} style={styles.productImage} contentFit="contain" accessible={false} />
					<View style={styles.countBadge}>
						<Text style={styles.countText}>{`×${item.count}`}</Text>
					</View>
				</View>

				<Text style={styles.name} numberOfLines={2}>
					{item.label}
				</Text>
				<Text style={styles.desc}>{item.hint}</Text>

				{item.action ? (
					<View style={styles.buttonRow}>
						<PressableScale style={styles.ghost} onPress={onClose} scaleTo={0.96} accessibilityRole="button">
							<Text style={styles.ghostText}>닫기</Text>
						</PressableScale>
						<PressableScale
							style={styles.go}
							onPress={() => {
								const go = item.action?.onPress;
								onClose();
								go?.();
							}}
							scaleTo={0.96}
							accessibilityRole="button"
							accessibilityLabel={item.action.label}>
							<IconComponent type="materialCommunityIcons" name={item.action.icon} size={17} color="#FFFFFF" />
							<Text style={styles.confirmText}>{item.action.label}</Text>
							<IconComponent type="materialIcons" name="chevron-right" size={18} color="#FFFFFF" />
						</PressableScale>
					</View>
				) : (
					<PressableScale style={styles.single} onPress={onClose} scaleTo={0.96} accessibilityRole="button">
						<Text style={styles.confirmText}>닫기</Text>
					</PressableScale>
				)}
			</Animated.View>
		</AppModal>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		card: {
			width: '100%',
			maxWidth: MODAL_MAX_WIDTH,
			alignSelf: 'center',
			alignItems: 'center',
			gap: SpacingV.sm,
			paddingHorizontal: Spacing.xl,
			paddingTop: SpacingV.xl,
			paddingBottom: SpacingV.xl,
			borderRadius: Radius.xl,
			backgroundColor: Colors.surface,
			...Shadow.floating,
		},
		ribbon: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.xs,
			paddingHorizontal: Spacing.md,
			height: scaleHeight(26),
			borderRadius: Radius.pill,
			backgroundColor: Colors.accentOrange,
		},
		ribbonBag: { backgroundColor: Colors.primary },
		ribbonText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: '#FFFFFF' },

		productStage: {
			width: scaleWidth(130),
			height: scaleWidth(130),
			marginTop: SpacingV.sm,
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.xl,
			overflow: 'hidden',
			backgroundColor: Colors.accentAmberSoft,
		},
		productImage: { width: scaleWidth(100), height: scaleWidth(100) },
		countBadge: {
			position: 'absolute',
			right: scaleWidth(8),
			bottom: scaleHeight(8),
			paddingHorizontal: Spacing.md,
			height: scaleHeight(26),
			justifyContent: 'center',
			borderRadius: Radius.pill,
			backgroundColor: Colors.primarySurface,
		},
		countText: { fontSize: Typography.footnote, fontWeight: FontWeight.heavy, color: Colors.textInverse },

		name: { marginTop: SpacingV.xs, fontSize: Typography.h3, fontWeight: FontWeight.heavy, color: Colors.textStrong, textAlign: 'center' },
		desc: { fontSize: Typography.bodySm, color: Colors.textSecondary, textAlign: 'center', lineHeight: scaleHeight(19) },

		confirmText: { fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: Colors.textInverse },
		single: {
			width: '100%',
			height: scaleHeight(48),
			marginTop: SpacingV.md,
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.pill,
			backgroundColor: Colors.primary,
		},
		// 쓰는 자리로 보내는 길이 있는 물건 — 닫기는 옆으로 물러나고 "가기"가 주 버튼이 된다
		buttonRow: { flexDirection: 'row', gap: Spacing.sm, width: '100%', marginTop: SpacingV.md },
		ghost: {
			paddingHorizontal: Spacing.xl,
			height: scaleHeight(48),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.pill,
			backgroundColor: Colors.surfaceAlt,
		},
		ghostText: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textSecondary },
		go: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: Spacing.xxs,
			height: scaleHeight(48),
			borderRadius: Radius.pill,
			backgroundColor: Colors.primary,
		},
	});
