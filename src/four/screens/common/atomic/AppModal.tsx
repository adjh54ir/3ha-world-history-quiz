import React, { useEffect, useState } from 'react';
import { Keyboard, Modal, ModalProps, Platform, StyleSheet, View } from 'react-native';

/**
 * 안드로이드 모달 창의 키보드 높이
 * -------------------------------------------------
 * 액티비티는 windowSoftInputMode="adjustResize" 라 키보드가 뜨면 화면이 알아서 줄어든다.
 * 그런데 모달은 별도 창이고, 아래에서 켜는 statusBarTranslucent 가 창에
 * FLAG_LAYOUT_NO_LIMITS 를 걸어 **그 리사이즈가 적용되지 않는다**.
 * 그래서 모달 안의 TextInput 은 키보드에 그대로 덮이고, KeyboardAvoidingView 의
 * behavior="height" 도 (줄어들 창이 없으니) 아무 일도 하지 않는다.
 *
 * 키보드 높이만큼 무대 아래를 잘라 내면 가운데 정렬 카드는 위로 올라오고,
 * 바텀시트는 키보드 위에 붙는다 — 모달마다 따로 처리하지 않아도 된다.
 *
 * iOS 는 모달 창이 리사이즈되지 않는 대신 KeyboardAvoidingView behavior="padding" 이
 * 정상 동작하므로 여기서는 건드리지 않는다.
 */
const useAndroidKeyboardInset = (enabled: boolean): number => {
	const [height, setHeight] = useState(0);

	useEffect(() => {
		if (Platform.OS !== 'android' || !enabled) {
			setHeight(0);
			return;
		}
		const show = Keyboard.addListener('keyboardDidShow', (event) => setHeight(event.endCoordinates.height));
		const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
		return () => {
			show.remove();
			hide.remove();
		};
	}, [enabled]);

	return height;
};

/**
 * 앱 공용 모달
 * -------------------------------------------------
 * react-native 의 Modal 을 그대로 쓰면 안드로이드에서 모달 창이 상태바·내비게이션바를
 * **비켜서** 열린다. 그러면 `flex: 1` 로 깔아 둔 딤(scrim) 이 화면 위아래 끝까지 닿지 못해
 * 배경이 잘린 띠처럼 보이고, 하단 시트는 내비게이션 버튼과 겹친다.
 *
 * 두 속성을 항상 켜서 모달을 화면 전체에 깔고, 시스템 바에 가리면 안 되는 내용은
 * 각 모달이 `useSafeAreaInsets()` 로 여백을 준다.
 *
 * navigationBarTranslucent 는 statusBarTranslucent 가 함께 켜져 있어야 동작한다(RN 문서).
 *
 * animationType="none" 은 안드로이드에서 "애니메이션 없음"이 아니다. RN 이 쓰는
 * Theme.FullScreenDialog 에는 windowAnimationStyle 이 없어 액티비티 테마의 기본값
 * (Animation.Activity = 화면 최하단에서 올라오는 진입 애니메이션)이 그대로 적용된다.
 * 그래서 JS Animated 로 직접 등장 연출을 하는 모달(BadgeDetailPopup 등)은 OS 슬라이드업이
 * 먼저 보이고 뒤이어 JS 애니메이션이 겹쳐 두 번 움직이는 것처럼 보인다.
 * 안드로이드에서는 none 을 fade 로 바꿔 창 애니메이션을 짧은 페이드로 고정한다.
 */
const AppModal = ({ children, animationType, ...props }: ModalProps) => {
	const keyboardInset = useAndroidKeyboardInset(props.visible !== false);

	return (
		<Modal
			statusBarTranslucent
			navigationBarTranslucent
			animationType={Platform.OS === 'android' && animationType === 'none' ? 'fade' : animationType}
			{...props}>
			<View style={[styles.stage, keyboardInset > 0 && { paddingBottom: keyboardInset }]}>{children}</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	/**
	 * 모달 무대는 화면 전체를 그대로 쓴다.
	 *
	 * 예전엔 여기서 본문 기둥(CONTENT_MAX_WIDTH) 폭으로 잘라 태블릿 카드가 늘어나는 걸 막았다.
	 * 그런데 딤(scrim)은 각 모달이 자기 안에서 칠하므로, 무대를 좁히면 딤도 같이 좁아져
	 * 태블릿에서 기둥 바깥 좌우가 안 어두워지고(아이패드 13인치는 한쪽만 160pt) 그 영역 터치가
	 * 뒤 화면으로 새어 들어갔다.
	 * 그래서 폭 제한은 무대가 아니라 **카드 쪽**에서 한다 — 대화상자는 MODAL_MAX_WIDTH,
	 * 바텀시트·전체화면 패널은 CONTENT_MAX_WIDTH 를 각자 건다.
	 */
	stage: { flex: 1 },
});

export default AppModal;
