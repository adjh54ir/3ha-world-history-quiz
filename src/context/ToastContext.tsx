/* eslint-disable react-native/no-inline-styles */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

interface ToastViewState {
	message: string;
	icon: string;
	action: ToastAction | null;
	anim: Animated.Value;
	hide: () => void;
	/** 토스트가 화면에 떠 있는지 — 우하단 버튼들이 겹치지 않게 비켜 줄 때 쓴다 */
	shown: boolean;
	/** 지금 떠 있는 모달 안 토스트 자리(ToastHost) — 마지막 것이 맨 위 모달 */
	hosts: number[];
	setHosts: React.Dispatch<React.SetStateAction<number[]>>;
}

const ToastViewContext = createContext<ToastViewState | null>(null);

/**
 * 공통 토스트 Provider
 * - 화면 어디서든 useToast().showToast('메시지') 로 하단 토스트 호출
 * - 네이티브 Modal 은 별도 창이라 루트에 그린 토스트가 가려진다.
 *   그래서 모달(AppModal)마다 ToastHost 를 두고, 모달이 떠 있으면 맨 위 모달 안에 그린다.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [message, setMessage] = useState('');
	const [icon, setIcon] = useState('check-circle');
	const [action, setAction] = useState<ToastAction | null>(null);
	const [hosts, setHosts] = useState<number[]>([]);
	const [shown, setShown] = useState(false);
	const anim = useRef(new Animated.Value(0)).current;
	const timer = useRef<NodeJS.Timeout | null>(null);

	const hide = useCallback(() => {
		if (timer.current) clearTimeout(timer.current);
		Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
			// 사라지는 도중 새 토스트가 오면 이 애니메이션은 중단(finished=false)된다 — 그때는 상태를 지우지 않는다
			if (!finished) return;
			setAction(null);
			setShown(false);
		});
	}, [anim]);

	const showToast = useCallback(
		(msg: string, ic = 'check-circle', act?: ToastAction) => {
			setMessage(msg);
			setIcon(ic);
			setAction(act ?? null);
			setShown(true);
			if (timer.current) clearTimeout(timer.current);
			Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
			// 실행취소가 있으면 조금 더 오래 노출
			timer.current = setTimeout(() => {
				Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
					if (!finished) return;
					setAction(null);
					setShown(false);
				});
			}, act ? 2800 : 1600);
		},
		[anim],
	);

	const api = useMemo(() => ({ showToast }), [showToast]);
	const view: ToastViewState = { message, icon, action, anim, hide, shown, hosts, setHosts };

	return (
		<ToastContext.Provider value={api}>
			<ToastViewContext.Provider value={view}>
				{children}
				{hosts.length === 0 && <ToastView {...view} />}
			</ToastViewContext.Provider>
		</ToastContext.Provider>
	);
};

/** 토스트가 떠 있는 동안 true — 우하단 떠 있는 버튼이 토스트와 겹치지 않게 위로 비켜 줄 때 쓴다 */
export const useToastShown = (): boolean => useContext(ToastViewContext)?.shown ?? false;

let hostSeq = 0;

/** 모달 안 토스트 자리 — AppModal 이 자동으로 넣는다 (직접 쓸 일 없음) */
export const ToastHost = () => {
	const ctx = useContext(ToastViewContext);
	const id = useRef(0);
	if (!id.current) id.current = ++hostSeq;
	const setHosts = ctx?.setHosts;
	useEffect(() => {
		if (!setHosts) return;
		const me = id.current;
		setHosts((h) => [...h, me]);
		return () => setHosts((h) => h.filter((x) => x !== me));
	}, [setHosts]);
	if (!ctx || ctx.hosts[ctx.hosts.length - 1] !== id.current) return null;
	return <ToastView {...ctx} />;
};

const ToastView = ({ message, icon, action, anim, hide }: ToastViewState) => {
	// 모달 안에서는 안드로이드 내비게이션 키 위로 올라와야 한다 (모달 창은 키 영역까지 덮는다)
	const insets = useSafeAreaInsets();
	if (!message) return null;
	return (
		<View pointerEvents="box-none" style={[styles.wrap, { bottom: scaleHeight(48) + insets.bottom }]}>
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
	);
};

const styles = themed(() => StyleSheet.create({
	// 좌우 screenH 여백 — 긴 문구도 화면 끝에 붙지 않는다. 폭은 maxWidth 로 태블릿에서도 폰 크기로 가운데 정렬
	wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: Layout.screenH },
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
	// flexShrink — 긴 문구가 실행취소 버튼을 밀어내지 않고 줄바꿈된다
	text: { flexShrink: 1, color: Colors.textInverse, fontSize: Typography.body, fontWeight: '700' },
	actionBtn: { marginLeft: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, borderRadius: Radius.sm, backgroundColor: Colors.onBrandSurfaceStrong },
	actionText: { color: Colors.textInverse, fontSize: Typography.footnote, fontWeight: '900' },
}));
