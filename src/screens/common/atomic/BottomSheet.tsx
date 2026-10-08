import React from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AppModal from '@/src/screens/common/atomic/AppModal';
import { SheetIn } from '@/src/screens/common/anim/Motion';
import Colors, { isDark } from '@/src/const/ConstColors';
import { SpacingV, Radius, Layout } from '@/src/const/ConstDesign';
import { scaleHeight, scaleWidth } from '@/src/utils';
import { themed } from '@/src/utils/ThemedStyles';

interface Props {
	visible: boolean;
	onClose: () => void;
	children: React.ReactNode;
	/** 시트 최대 높이 비율(0~1). 내용이 짧으면 그만큼만 차지한다 */
	maxHeightRatio?: number;
	/** 항상 같은 높이가 필요할 때(탭·그리드가 들어가는 시트) */
	heightRatio?: number;
	/** 상단 손잡이 표시 */
	handle?: boolean;
	/** 시트 하단에 고정되는 영역(주요 버튼 등) — 본문 스크롤과 분리된다 */
	footer?: React.ReactNode;
	/** 시트 본문 추가 스타일 */
	contentStyle?: StyleProp<ViewStyle>;
}

/**
 * 앱 공통 하단 시트.
 * - 화면 바닥에 항상 붙고(안전영역만큼만 안쪽 여백), 최대 높이를 넘으면 내부에서 스크롤된다.
 * - 배경 탭 영역을 시트 위에 겹치지 않게 깔아 내부 스크롤 제스처를 가로채지 않는다.
 * - 새 하단 팝업은 반드시 이 컴포넌트를 쓴다. (오버레이·손잡이·insets 를 화면마다 다시 만들지 말 것)
 */
/** 시트 안 빈 영역을 누르면 키보드를 닫는다 (터치는 가로채지 않는다) */
const dismissKeyboard = () => {
	Keyboard.dismiss();
	return false;
};

const BottomSheet: React.FC<Props> = ({ visible, onClose, children, maxHeightRatio = 0.88, heightRatio, handle = true, footer, contentStyle }) => {
	const { t } = useTranslation();
	const insets = useSafeAreaInsets();
	// 태블릿에서 시트가 화면 끝까지 늘어나지 않도록 폭 상한을 애니메이션 래퍼에 건다
	// (안쪽 sheet 의 width:'100%' 는 이 래퍼 기준이므로 상한을 여기 둬야 한다)
	const sizeStyle: ViewStyle = {
		width: '100%',
		maxWidth: Layout.sheetMaxWidth,
		...(heightRatio ? { height: `${heightRatio * 100}%` as const } : { maxHeight: `${maxHeightRatio * 100}%` as const }),
	};

	return (
		<AppModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			{/* 시트 안에 입력창이 있으면 키보드에 가려지므로 공통으로 밀어 올린다 */}
			<KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
				<TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} accessibilityLabel={t('common.close')} onPress={onClose} />
				<SheetIn visible={visible} style={sizeStyle}>
					<View accessibilityViewIsModal onStartShouldSetResponder={dismissKeyboard} style={[styles.sheet, heightRatio ? styles.sheetFill : null, { paddingBottom: SpacingV.lg + insets.bottom }, contentStyle]}>
						{handle && <View style={styles.handle} />}
						{children}
						{footer}
					</View>
				</SheetIn>
			</KeyboardAvoidingView>
		</AppModal>
	);
};

export default BottomSheet;

const styles = themed(() => StyleSheet.create({
	overlay: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'flex-end', alignItems: 'center' },
	sheet: { width: '100%', maxHeight: '100%', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingHorizontal: Layout.screenH, paddingTop: SpacingV.md },
	sheetFill: { flex: 1 },
	handle: { alignSelf: 'center', width: scaleWidth(40), height: scaleHeight(4), borderRadius: scaleWidth(2), backgroundColor: isDark() ? Colors.borderStrong : Colors.border, marginBottom: SpacingV.lg },
}));
