import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BottomSheet from '@/src/screens/common/atomic/BottomSheet';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Colors, { withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, Layout } from '@/src/const/ConstDesign';
import { categoryIcon, difficultyIcon } from '@/src/const/ConstQuizMeta';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import { themed } from '@/src/utils/ThemedStyles';

export type FilterOptionKind = 'category' | 'difficulty';

interface Props {
	visible: boolean;
	title: string;
	kind: FilterOptionKind;
	options: readonly string[];
	value: string;
	accent: string;
	allValue: string;
	allLabel?: string;
	/** 옵션별 커스텀 아이콘(주제 선택 등). null 반환 시 기본 아이콘 사용 */
	iconForOption?: (option: string) => React.ReactNode | null;
	onSelect: (value: string) => void;
	onClose: () => void;
}

/** 검색·데이터 탐색에서 공용으로 사용하는 카테고리/난이도 선택 시트 */
const FilterOptionSheet: React.FC<Props> = ({
	visible,
	title,
	kind,
	options,
	value,
	accent,
	allValue,
	allLabel = '전체',
	iconForOption,
	onSelect,
	onClose,
}) => {
	const items = Array.from(new Set([allValue, ...options.filter((option) => option && option !== allValue)]));

	return (
		<BottomSheet visible={visible} onClose={onClose} maxHeightRatio={0.76}>
				<View style={styles.body}>
					<View style={styles.header}>
						<View style={[styles.titleIcon, { backgroundColor: withAlpha(accent, '14') }]}>
							<IconComponent
								type="materialIcons"
								name={kind === 'category' ? 'category' : 'bar-chart'}
								size={scaledSize(18)}
								color={accent}
							/>
						</View>
						<Text accessibilityRole="header" style={styles.title} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
						<TouchableOpacity accessibilityRole="button" accessibilityLabel="선택 창 닫기" style={styles.close} hitSlop={Layout.hitSlop} activeOpacity={0.7} onPress={onClose}>
							<IconComponent type="materialIcons" name="close" size={scaledSize(20)} color={Colors.textMuted} />
						</TouchableOpacity>
					</View>
					<ScrollView
						style={styles.scroll}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
						contentContainerStyle={styles.scrollBody}>
						{items.map((option) => {
							const active = option === value;
							const isAll = option === allValue;
							const custom = !isAll && iconForOption ? iconForOption(option) : null;
							const icon = isAll ? 'apps' : kind === 'category' ? categoryIcon(option) : difficultyIcon(option);
							return (
								<TouchableOpacity
									key={option}
									accessibilityRole="radio"
									accessibilityState={{ selected: active }}
									accessibilityLabel={`${isAll ? allLabel : option}${active ? ', 선택됨' : ''}`}
									style={[styles.item, active && { backgroundColor: withAlpha(accent, '10'), borderColor: withAlpha(accent, '36') }]}
									activeOpacity={0.75}
									onPress={() => onSelect(option)}>
									<View style={[styles.itemIcon, active && { backgroundColor: withAlpha(accent, '18') }]}>
										{custom ?? <IconComponent type="materialIcons" name={icon} size={scaledSize(17)} color={active ? accent : Colors.textMuted} />}
									</View>
									<Text style={[styles.itemText, active && { color: accent, fontWeight: '900' }]}>{isAll ? allLabel : option}</Text>
									{active && <IconComponent type="materialIcons" name="check-circle" size={scaledSize(20)} color={accent} />}
								</TouchableOpacity>
							);
						})}
					</ScrollView>
				</View>
		</BottomSheet>
	);
};

export default FilterOptionSheet;

const styles = themed(() => StyleSheet.create({
	body: { flexShrink: 1, maxHeight: '100%' },
	scroll: { flexGrow: 0, flexShrink: 1 },
	header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingBottom: SpacingV.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
	titleIcon: { width: scaleWidth(36), height: scaleWidth(36), borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
	title: { flex: 1, fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong },
	close: { width: Layout.touch, height: Layout.touch, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceAlt },
	scrollBody: { paddingTop: SpacingV.sm, gap: Layout.itemGap },
	item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: scaleHeight(52), paddingHorizontal: Spacing.sm, borderRadius: Radius.lg, borderWidth: 1, borderColor: 'transparent' },
	itemIcon: { width: scaleWidth(34), height: scaleWidth(34), borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceAlt },
	itemText: { flex: 1, fontSize: Typography.callout, fontWeight: '700', color: Colors.text },
}));
