/* eslint-disable react-native/no-inline-styles */
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Colors from '@/src/const/ConstColors';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import { Layout, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { themed } from '@/src/utils/ThemedStyles';

export interface ToastAction {
	label: string;
	onPress: () => void;
}

interface ToastApi {
	showToast: (message: string, icon?: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastApi>({ showToast: () => {} });

export const useToast = (): ToastApi => useContext(ToastContext);

/**
 * 공통 토스트 Provider
 * - 화면 어디서든 useToast().showToast('메시지') 로 하단 토스트 호출
 * - 일반 화면(숏폼/카드/학습) 공통 호출용. (네이티브 Modal 위에는 표시되지 않으므로 모달 내부는 별도 처리)
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [message, setMessage] = useState('');
	const [icon, setIcon] = useState('check-circle');
	const [action, setAction] = useState<ToastAction | null>(null);
	const anim = useRef(new Animated.Value(0)).current;
	const timer = useRef<NodeJS.Timeout | null>(null);

	const hide = useCallback(() => {
		if (timer.current) clearTimeout(timer.current);
		Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setAction(null));
	}, [anim]);

	const showToast = useCallback(
		(msg: string, ic = 'check-circle', act?: ToastAction) => {
			setMessage(msg);
			setIcon(ic);
			setAction(act ?? null);
			if (timer.current) clearTimeout(timer.current);
			Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
			// 실행취소가 있으면 조금 더 오래 노출
			timer.current = setTimeout(() => {
				Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setAction(null));
			}, act ? 2800 : 1600);
		},
		[anim],
	);

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
			{!!message && (
				<View pointerEvents="box-none" style={styles.wrap}>
					<Animated.View
						pointerEvents={action ? 'auto' : 'none'}
						style={[
							styles.toast,
							{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(24), 0] }) }] },
						]}>
						<IconComponent type="materialIcons" name={icon} size={scaledSize(16)} color={Colors.textInverse} />
						<Text style={styles.text}>{message}</Text>
						{!!action && (
							<TouchableOpacity
								style={styles.actionBtn}
								activeOpacity={0.7}
								hitSlop={Layout.hitSlop}
								onPress={() => { action.onPress(); hide(); }}>
								<Text style={styles.actionText}>{action.label}</Text>
							</TouchableOpacity>
						)}
					</Animated.View>
				</View>
			)}
		</ToastContext.Provider>
	);
};

const styles = themed(() => StyleSheet.create({
	wrap: { position: 'absolute', left: 0, right: 0, bottom: scaleHeight(48), alignItems: 'center' },
	toast: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.sm,
		backgroundColor: Colors.overlayStrong,
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		paddingHorizontal: Spacing.lg,
		paddingVertical: SpacingV.md,
		borderRadius: Radius.pill,
		maxWidth: scaleWidth(300),
	},
	text: { color: Colors.textInverse, fontSize: Typography.body, fontWeight: '700' },
	actionBtn: { marginLeft: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, borderRadius: Radius.sm, backgroundColor: Colors.onBrandSurfaceStrong },
	actionText: { color: Colors.textInverse, fontSize: Typography.footnote, fontWeight: '900' },
}));
