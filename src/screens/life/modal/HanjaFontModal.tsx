import React, { useRef, useState } from 'react';
import {Keyboard, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import AppModal from '@/src/screens/common/atomic/AppModal';
import ModalIconButton from '@/src/screens/common/atomic/ModalIconButton';
import { Palette } from '@/src/const/ConstColors';
import { HanjaGlyphSize, useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { HANJA_FONT_OPTIONS, HANJA_SIZE_OPTIONS, HanjaFontStyle, HanjaSizeKey } from '@/src/hooks/useHanjaFont';
import { useAnimationRunner, useSheetEnter } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

interface Props {
	visible: boolean;
	/** 지금 적용 중인 글씨체 키 */
	current: string;
	/** 지금 적용 중인 글자 크기 */
	currentSize: HanjaSizeKey;
	onSelect: (key: string) => void;
	onSelectSize: (key: HanjaSizeKey) => void;
	onClose: () => void;
}

/** 미리보기 글자 — 획이 많고 적은 글자를 섞어야 서체 차이가 드러난다 */
const PREVIEW_TEXT = '漢字';
/** 미리보기·크기 칩의 기준 글자 크기 (여기에 배율을 곱해 보여 준다) */
const PREVIEW_SIZE = scaledSize(44);
const SIZE_CHIP_CHAR = scaledSize(20);
const SAMPLE_CHAR = '漢';

/**
 * 한자 글씨체 선택 모달
 * - 위쪽 미리보기가 고른 서체로 즉시 바뀌고(페이드), "적용"을 눌러야 실제로 저장된다.
 * - 목록의 샘플 글자도 각 서체로 그려 눌러 보지 않고도 차이를 알 수 있다.
 */
const HanjaFontModal = (props: Props) => (props.visible ? <HanjaFontSheet {...props} /> : null);

/** 시트 본체 — 열릴 때마다 새로 마운트되므로 임시 선택은 첫 렌더에 한 번만 받아 온다 */
const HanjaFontSheet = ({ visible, current, currentSize, onSelect, onSelectSize, onClose }: Props) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const insets = useSafeAreaInsets();
	const enterStyle = useSheetEnter(visible, scaleHeight(24));
	const run = useAnimationRunner();
	// 모달 안에서만 쓰는 임시 선택 — 확정은 "적용"을 눌렀을 때
	const [picked, setPicked] = useState(current);
	/** 글자 크기도 같은 모달에서 고른다 — 서체와 크기는 함께 보면서 정해야 감이 온다 */
	const [pickedSize, setPickedSize] = useState<HanjaSizeKey>(currentSize);
	const fade = useRef(new Animated.Value(1)).current;

	/** 미리보기 글자가 툭 바뀌지 않도록 살짝 흐려졌다가 돌아온다 */
	const onPick = (key: string) => {
		if (key === picked) {
			return;
		}
		setPicked(key);
		fade.setValue(0.15);
		run(Animated.timing(fade, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }));
	};

	const pickedOption = HANJA_FONT_OPTIONS.find((item) => item.key === picked) ?? HANJA_FONT_OPTIONS[0];
	const pickedSizeOption = HANJA_SIZE_OPTIONS.find((item) => item.key === pickedSize) ?? HANJA_SIZE_OPTIONS[0];

	// 닫히는 순간 바로 언마운트(위 래퍼) — 다음 모달과 사라지는 애니메이션이 겹치지 않도록
	return (
		<AppModal visible={visible} onClose={onClose} align="bottom">
			<Animated.View style={[styles.sheet, { paddingBottom: SpacingV.md + insets.bottom }, enterStyle]}>
					<View style={styles.handle} />
					<View style={styles.headerRow}>
						<View>
							<Text style={styles.title}>한자 글씨체</Text>
							<Text style={styles.subtitle}>학습·퀴즈 화면의 한자에 모두 적용됩니다</Text>
						</View>
						<ModalIconButton name="close" color={Colors.textSecondary} onPress={onClose} accessibilityLabel="닫기" />
					</View>

					{/* 미리보기 — 고른 서체와 크기가 즉시 반영된다 */}
					<View style={styles.preview}>
						<Animated.Text
							style={[
								styles.previewChar,
								pickedOption.style,
								{ opacity: fade, fontSize: Math.round(PREVIEW_SIZE * pickedSizeOption.scale) },
							]}>
							{PREVIEW_TEXT}
						</Animated.Text>
						<Text style={styles.previewLabel}>
							{`${pickedOption.label} · ${pickedSizeOption.label}`}
						</Text>
					</View>

					{/* 글자 크기 — 획이 많은 한자를 크게 볼 수 있게 배율로 조절한다 */}
					<View style={styles.sizeRow}>
						{HANJA_SIZE_OPTIONS.map((item) => {
							const selected = item.key === pickedSize;
							return (
								<TouchableOpacity
									key={item.key}
									style={[styles.sizeChip, selected && styles.sizeChipOn]}
									activeOpacity={0.85}
									accessibilityRole="button"
									accessibilityState={{ selected }}
									onPress={() => setPickedSize(item.key)}>
									<Text
										style={[
											styles.sizeChipChar,
											pickedOption.style,
											// lineHeight 를 함께 주지 않으면 안드로이드에서 큰 글자의 위아래가 잘린다
											{ fontSize: Math.round(SIZE_CHIP_CHAR * item.scale), lineHeight: Math.round(SIZE_CHIP_CHAR * item.scale * 1.35) },
											selected && styles.sizeChipTextOn,
										]}>
										字
									</Text>
									<Text style={[styles.sizeChipText, selected && styles.sizeChipTextOn]}>{item.label}</Text>
								</TouchableOpacity>
							);
						})}
					</View>

					<ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>
						{HANJA_FONT_OPTIONS.map((item) => {
							const selected = item.key === picked;
							return (
								<TouchableOpacity
									key={item.key}
									style={[styles.item, selected && styles.itemSelected]}
									activeOpacity={0.8}
									accessibilityRole="button"
									accessibilityState={{ selected }}
									onPress={() => onPick(item.key)}>
									<View style={[styles.sample, selected && styles.sampleSelected]}>
										<Text style={[styles.sampleChar, item.style, selected && styles.sampleCharSelected]}>{SAMPLE_CHAR}</Text>
									</View>
									<View style={styles.itemBody}>
										<Text style={[styles.itemTitle, selected && styles.itemTitleSelected]}>{item.label}</Text>
										<Text style={styles.itemMeta} numberOfLines={2}>
											{item.hint}
										</Text>
									</View>
									<IconComponent
										type="materialIcons"
										name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
										size={22}
										color={selected ? Colors.primary : Colors.borderStrong}
									/>
								</TouchableOpacity>
							);
						})}
					</ScrollView>

					<Text style={styles.notice}>
						기본 서체(기본 명조)만 앱에 담겨 있어 어느 기기에서나 같은 자형으로 보입니다. 나머지는 기기에 있는 서체를 쓰므로 기기·OS에 따라
						자형이 조금 다를 수 있습니다.
					</Text>

					<PressableScale
						style={styles.applyButton}
						accessibilityRole="button"
						onPress={() => {
							onSelect(picked);
							onSelectSize(pickedSize);
							onClose();
						}}>
						<Text style={styles.applyText}>
							{`${pickedOption.label} · ${pickedSizeOption.label} 적용`}
						</Text>
					</PressableScale>
			</Animated.View>
		</AppModal>
	);
};

const createStyles = (Colors: Palette, _HanjaFont: HanjaFontStyle, Glyph: HanjaGlyphSize) => StyleSheet.create({
	sheet: {
		...Layout.modalSheet,
		maxHeight: '86%',
		backgroundColor: Colors.surface,
		borderTopLeftRadius: Radius.xl,
		borderTopRightRadius: Radius.xl,
		paddingHorizontal: Spacing.lg,
		...Shadow.floating,
	},
	handle: {
		alignSelf: 'center',
		width: scaleWidth(38),
		height: scaleHeight(4),
		borderRadius: Radius.pill,
		backgroundColor: Colors.borderStrong,
		marginTop: SpacingV.md,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingTop: SpacingV.lg,
		paddingBottom: SpacingV.md,
	},
	title: { fontSize: Typography.title, fontWeight: FontWeight.bold, color: Colors.textStrong },
	subtitle: { marginTop: scaleHeight(2), fontSize: Typography.caption, color: Colors.textMuted },

	preview: {
		alignItems: 'center',
		justifyContent: 'center',
		gap: SpacingV.xs,
		paddingVertical: SpacingV.lg,
		marginBottom: SpacingV.md,
		borderRadius: Radius.lg,
		backgroundColor: Colors.surfaceAlt,
	},
	// lineHeight 를 함께 주지 않으면 안드로이드에서 큰 한자의 위아래가 잘린다
	// 크기 칩과 아래 글씨체 목록이 붙어 겹쳐 보이던 문제 — 위아래 간격을 분명히 벌린다
	sizeRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: SpacingV.md, marginBottom: SpacingV.lg },
	sizeChip: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: scaleHeight(4),
		paddingVertical: SpacingV.sm,
		minHeight: scaleHeight(70),
		borderRadius: Radius.lg,
		borderWidth: 1.5,
		borderColor: Colors.border,
		backgroundColor: Colors.surface,
	},
	sizeChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
	sizeChipChar: { color: Colors.textSecondary },
	sizeChipText: { fontSize: Typography.caption, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
	sizeChipTextOn: { color: Colors.primaryDeep },

	previewChar: { fontSize: Glyph.md, lineHeight: Math.round(Glyph.md * 1.3), color: Colors.textStrong },
	previewLabel: { fontSize: Typography.caption, fontWeight: FontWeight.semibold, color: Colors.textSecondary },

	listContent: { paddingTop: scaleHeight(2), paddingBottom: SpacingV.sm, gap: SpacingV.sm },
	item: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.md,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.md,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		backgroundColor: Colors.surface,
	},
	itemSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
	sample: {
		width: scaleWidth(46),
		height: scaleWidth(46),
		borderRadius: Radius.md,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.surfaceAlt,
	},
	sampleSelected: { backgroundColor: Colors.primarySoft },
	sampleChar: { fontSize: Typography.h2, lineHeight: Math.round(Typography.h2 * 1.3), color: Colors.textSecondary },
	sampleCharSelected: { color: Colors.primaryDeep },
	itemBody: { flex: 1 },
	itemTitle: { fontSize: Typography.body, fontWeight: FontWeight.semibold, color: Colors.text },
	itemTitleSelected: { color: Colors.primaryDeep },
	itemMeta: { marginTop: scaleHeight(3), fontSize: Typography.caption, color: Colors.textMuted },

	notice: {
		marginTop: SpacingV.sm,
		paddingHorizontal: Spacing.xs,
		fontSize: Typography.caption,
		color: Colors.textMuted,
		lineHeight: scaleHeight(17),
	},

	applyButton: {
		marginTop: SpacingV.md,
		height: scaleHeight(52),
		borderRadius: Radius.lg,
		backgroundColor: Colors.primarySurface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	applyText: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textInverse },
});

export default HanjaFontModal;
