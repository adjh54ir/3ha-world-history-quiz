import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, TouchableOpacity, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Colors from '@/src/const/ConstColors';
import { Layout, Radius, Shadow, SpacingV } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import { themed } from '@/src/utils/ThemedStyles';
import { useToastShown } from '@/src/context/ToastContext';
import { ScrollMemoryContext } from '@/src/screens/common/withRemountOnFocus';

/** 이만큼 내려가면 버튼이 나온다 (화면 높이의 절반 정도 — 한 화면을 넘긴 목록에서만 보인다) */
const SHOW_AFTER = scaleHeight(400);
/** 위치 복원은 데이터가 늦게 그려지는 것까지 이만큼만 기다린다 */
const RESTORE_WAIT_MS = 2000;
/** 버튼 지름과 진행률 링 두께 */
const BTN = scaleWidth(46);
const RING = scaleWidth(2.5);
const RING_R = (BTN - RING) / 2;
const RING_LEN = 2 * Math.PI * RING_R;
/** 토스트가 뜨면 이만큼 위로 비켜 준다 (토스트 한 줄 높이 + 여백) */
const TOAST_LIFT = scaleHeight(56);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Scrollable = { scrollTo?: (o: { y: number; animated: boolean }) => void; scrollToOffset?: (o: { offset: number; animated: boolean }) => void } | null;

/**
 * 긴 목록의 '맨 위로' 버튼 상태.
 * - 스크롤 컨테이너에 ref·onScroll·scrollEventThrottle 을 붙이고, 같은 부모 안에 <ScrollTopButton visible toTop /> 를 둔다.
 * - 아래에 고정 버튼이 있는 화면은 스크롤과 버튼을 flex:1 View 로 묶어 그 영역 기준으로 띄운다(inset={false}).
 * - 화면이 이미 쓰는 ref 가 있으면 넘긴다(탭 재선택 시 맨 위로 등 기존 동작 유지).
 * - 탭 화면(withRemountOnFocus)이면 스크롤 위치를 기억해 두고, 위에 쌓인 화면에서 돌아올 때
 *   onContentSizeChange 에서 내용이 충분히 그려지는 순간 그 위치로 되돌린다.
 */
export const useScrollTop = (externalRef?: React.RefObject<Scrollable>) => {
	// ScrollView·FlatList 어느 쪽에도 붙일 수 있게 any 로 연다 (실제 호출은 아래 toTop 이 메서드 존재로 가른다)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const ownRef = useRef<any>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const ref = (externalRef ?? ownRef) as React.RefObject<any>;
	const [visible, setVisible] = useState(false);
	/** 0~1 — 목록을 얼마나 내려왔는지 (버튼 테두리 링) */
	const progress = useRef(new Animated.Value(0)).current;
	const memory = useContext(ScrollMemoryContext);
	// 마운트 때 한 번만 꺼낸다 (렌더마다 꺼내면 두 번째부터 0 이 된다)
	const pendingRestore = useRef<number | null>(null);
	if (pendingRestore.current === null) pendingRestore.current = memory?.takeRestore() ?? 0;

	useEffect(() => {
		if (!pendingRestore.current) return;
		// 목록이 그만큼 길어지지 않으면(데이터가 줄었으면) 복원을 포기하고 맨 위에서 시작한다
		const t = setTimeout(() => {
			pendingRestore.current = 0;
		}, RESTORE_WAIT_MS);
		return () => clearTimeout(t);
	}, []);

	const onScroll = useCallback(
		(e: NativeSyntheticEvent<NativeScrollEvent>) => {
			const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
			const y = contentOffset.y;
			memory?.save(y);
			const max = contentSize.height - layoutMeasurement.height;
			progress.setValue(max > 0 ? Math.min(1, Math.max(0, y / max)) : 0);
			const next = y > SHOW_AFTER;
			setVisible((prev) => (prev === next ? prev : next));
		},
		[memory, progress],
	);

	const onContentSizeChange = useCallback(
		(_w: number, h: number) => {
			const y = pendingRestore.current;
			// 복원할 위치 아래로 한 화면 정도가 그려졌을 때 옮긴다 (덜 그려졌을 때 옮기면 끝에서 튕긴다)
			if (!y || h < y + SHOW_AFTER) return;
			pendingRestore.current = 0;
			const r = ref.current;
			requestAnimationFrame(() => {
				if (r?.scrollToOffset) r.scrollToOffset({ offset: y, animated: false });
				else r?.scrollTo?.({ y, animated: false });
			});
		},
		[ref],
	);

	const toTop = useCallback(() => {
		const r = ref.current;
		if (r?.scrollToOffset) r.scrollToOffset({ offset: 0, animated: true });
		else r?.scrollTo?.({ y: 0, animated: true });
	}, [ref]);

	return { ref, onScroll, onContentSizeChange, visible, toTop, progress };
};

interface Props {
	visible: boolean;
	toTop: () => void;
	/**
	 * 기기 하단 안전영역(안드로이드 내비게이션 키·홈 인디케이터)만큼 더 올릴지.
	 * 기본은 탭 밖 화면에서만 올린다. 하단 고정 버튼 위 스크롤 영역에 둘 때는 false.
	 */
	inset?: boolean;
	/** 아이콘·진행률 링 색 — 화면 강조색에 맞출 때 */
	color?: string;
	/** 0~1 스크롤 진행률 (useScrollTop 의 progress) — 주면 버튼 테두리에 링으로 보여 준다 */
	progress?: Animated.Value;
}

/** 우하단 '맨 위로' 버튼 — 나타날 때 살짝 떠오르고, 숨을 땐 터치를 막는다 */
const ScrollTopButton: React.FC<Props> = ({ visible, toTop, inset, color = Colors.primary, progress }) => {
	const { t } = useTranslation();
	const anim = useRef(new Animated.Value(0)).current;
	const insets = useSafeAreaInsets();
	// 탭 화면은 탭 바가 하단 안전영역을 이미 차지한다 → 탭 밖(스택) 화면에서만 기기 키 높이를 더한다
	const inTab = useContext(BottomTabBarHeightContext) !== undefined;
	const bottom = SpacingV.xl + ((inset ?? !inTab) ? insets.bottom : 0);

	useEffect(() => {
		const a = Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true });
		a.start();
		return () => a.stop();
	}, [visible, anim]);

	// 토스트가 뜨면 위로 비켜 줬다가 사라지면 제자리로
	const toastShown = useToastShown();
	const lift = useRef(new Animated.Value(0)).current;
	useEffect(() => {
		const a = Animated.timing(lift, { toValue: toastShown ? 1 : 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true });
		a.start();
		return () => a.stop();
	}, [toastShown, lift]);

	return (
		<Animated.View
			pointerEvents={visible ? 'auto' : 'none'}
			style={[
				styles.wrap,
				{ bottom },
				{
					opacity: anim,
					transform: [
						{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
						{ translateY: Animated.add(anim.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(12), 0] }), lift.interpolate({ inputRange: [0, 1], outputRange: [0, -TOAST_LIFT] })) },
					],
				},
			]}>
			<TouchableOpacity style={styles.btn} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('common.toTop')} onPress={toTop} hitSlop={Layout.hitSlop}>
				{/* 진행률 링 — 12시 방향부터 시계 방향으로 찬다 (값은 스크롤 이벤트가 직접 밀어 넣어 리렌더 없음) */}
				{progress && (
					<View pointerEvents="none" style={styles.ringWrap}>
						<Svg width={BTN} height={BTN} style={styles.ring}>
							<AnimatedCircle
								cx={BTN / 2}
								cy={BTN / 2}
								r={RING_R}
								stroke={color}
								strokeWidth={RING}
								fill="none"
								strokeLinecap="round"
								strokeDasharray={`${RING_LEN} ${RING_LEN}`}
								strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [RING_LEN, 0] })}
							/>
						</Svg>
					</View>
				)}
				<IconComponent type="materialIcons" name="arrow-upward" size={scaledSize(22)} color={color} />
			</TouchableOpacity>
		</Animated.View>
	);
};

export default ScrollTopButton;

const styles = themed(() => StyleSheet.create({
	wrap: { position: 'absolute', right: Layout.screenH },
	// 면 색 + 옅은 테두리 — 아래쪽 주요 버튼(BottomButton·CTA)과 같은 강조색 덩어리가 겹쳐 경쟁하지 않게 한다
	// 버튼 테두리(1)까지 덮도록 바깥 모서리에 맞춘다
	ringWrap: { position: 'absolute', top: -1, left: -1 },
	ring: { transform: [{ rotate: '-90deg' }] },
	btn: { width: BTN, height: BTN, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, ...Shadow.floating },
}));
