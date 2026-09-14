import React, { ReactNode, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/src/hooks/useTheme';
import { Spacing } from '@/src/const/ConstDesign';

type Align = 'center' | 'bottom';

interface Props {
	visible: boolean;
	onClose?: () => void;
	children: ReactNode;
	/** 카드를 화면 가운데 둘지, 바닥에 붙일지 (바텀시트) */
	align?: Align;
	/** 배경을 눌렀을 때 닫을지 — 강제 팝업(업데이트 등)은 false */
	dismissOnBackdrop?: boolean;
	/** 안드로이드 하드웨어 뒤로가기로 닫을지 — 강제 팝업은 false */
	dismissOnHardwareBack?: boolean;
	/** 내부에 TextInput 이 있으면 키보드만큼 밀어 올린다 */
	avoidKeyboard?: boolean;
	backdropStyle?: ViewStyle;
	testID?: string;
}

/**
 * 앱 공통 모달 껍데기
 * -------------------------------------------------
 * 화면마다 제각각이던 Modal 설정을 한곳으로 모은다. 개별 화면에서 빠뜨리면
 * 눈에 잘 안 띄는 버그가 생기던 것들을 여기서 항상 켜 준다.
 *
 * 1) 이전 내용이 깜박 보이는 문제
 *    Modal 은 visible=false 여도 자식을 그대로 들고 있다. 다음에 열면 이전 값이
 *    한 프레임 보였다가 새 값으로 바뀐다. 닫혀 있을 때 아예 null 을 돌려주고,
 *    열릴 때마다 key 를 새로 줘서 자식을 처음부터 다시 그리게 한다.
 *
 * 2) 배경이 화면을 다 덮지 못하는 문제
 *    statusBarTranslucent / navigationBarTranslucent 를 켜지 않으면 안드로이드에서
 *    상태바·내비게이션바 자리가 비어 첫 표시 때 흰 띠가 보인다. presentationStyle 은
 *    iOS 에서 카드형으로 축소되는 것을 막는다.
 *
 * 3) 키보드 가림
 *    avoidKeyboard 를 켜면 입력창이 키보드에 가리지 않게 밀어 올리고,
 *    배경을 누르면 키보드부터 닫는다.
 */
const AppModal = ({
	visible,
	onClose,
	children,
	align = 'center',
	dismissOnBackdrop = true,
	dismissOnHardwareBack = true,
	avoidKeyboard = false,
	backdropStyle,
	testID,
}: Props) => {
	const Colors = useColors();
	const insets = useSafeAreaInsets();
	// 열릴 때마다 1 씩 올려 자식 트리를 새로 만든다 (이전 상태가 남아 깜박이지 않게).
	// effect 로 올리면 한 번 더 그리고 되돌리는 깜빡임이 생겨 렌더 중에 센다.
	const openCount = useRef(0);
	const wasVisible = useRef(false);
	if (visible && !wasVisible.current) {
		openCount.current += 1;
	}
	wasVisible.current = visible;

	// 닫혀 있으면 자식을 아예 만들지 않는다 — 이전 화면이 한 프레임 비치는 원인
	if (!visible) {
		return null;
	}

	const onBackdrop = () => {
		Keyboard.dismiss();
		if (dismissOnBackdrop) {
			onClose?.();
		}
	};

	const backdrop = (
		<View
			style={[
				styles.backdrop,
				align === 'bottom' ? styles.bottom : styles.center,
				{ backgroundColor: Colors.overlay, paddingTop: insets.top, paddingBottom: insets.bottom },
				backdropStyle,
			]}>
			{/* 배경 탭 — 카드보다 아래 깔아 두고 카드 터치는 그대로 통과시킨다 */}
			<Pressable style={StyleSheet.absoluteFill} onPress={onBackdrop} accessible={false} />
			{children}
		</View>
	);

	return (
		<Modal
			key={openCount.current}
			visible
			transparent
			animationType="fade"
			statusBarTranslucent
			navigationBarTranslucent
			presentationStyle="overFullScreen"
			testID={testID}
			onRequestClose={() => {
				if (dismissOnHardwareBack) {
					onClose?.();
				}
			}}>
			{avoidKeyboard ? (
				<KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
					{backdrop}
				</KeyboardAvoidingView>
			) : (
				backdrop
			)}
		</Modal>
	);
};

const styles = StyleSheet.create({
	fill: { flex: 1 },
	// absoluteFill 로 두면 안드로이드 첫 표시에서 높이가 0 으로 잡히는 순간이 없다
	backdrop: { ...StyleSheet.absoluteFillObject, paddingHorizontal: Spacing.xxl },
	center: { justifyContent: 'center', alignItems: 'center' },
	bottom: { justifyContent: 'flex-end', paddingHorizontal: 0 },
});

export default AppModal;
