/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ViewStyle } from 'react-native';
import DomainIcon from '@/src/screens/common/atomic/DomainIcon';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Colors, { readableOn } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, Layout } from '@/src/const/ConstDesign';
import { scaledSize } from '@/src/utils';
import LearnHubService from '@/src/services/LearnHubService';
import { themed } from '@/src/utils/ThemedStyles';

export const ALL_SCOPE = 'all';

interface CategoryScopeChipsProps {
	/** 현재 선택된 주제 키 (전체면 ALL_SCOPE) */
	value: string;
	/** 선택 변경 콜백 */
	onChange: (key: string) => void;
	/** '전체' 칩 노출 여부 (기본 true) */
	includeAll?: boolean;
	/** '전체' 칩 라벨 (기본 '전체') */
	allLabel?: string;
	/** 각 주제 칩에 데이터 개수 표기 (기본 true) */
	showCount?: boolean;
	/** 바 배경/여백 컨테이너 스타일 재정의 */
	style?: ViewStyle;
	/** 좌우 아이콘 표시 아이콘 표시 여부 (기본 true) */
	showIcon?: boolean;
}

/**
 * 공용 카테고리(주제) 선택 칩 바
 * - 가로 스크롤되는 주제 선택 UI. 검색/필터 등 여러 화면에서 재사용한다.
 * - 앱 상수(도메인) 아이콘을 좌측에 함께 노출하고, 선택 시 주제 색상으로 강조한다.
 */
const CategoryScopeChips: React.FC<CategoryScopeChipsProps> = ({
	value,
	onChange,
	includeAll = true,
	allLabel = '전체',
	showCount = true,
	style,
	showIcon = true,
}) => {
	const domains = LearnHubService.getDomainList();

	return (
		<View style={[styles.chipBar, style]}>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
				{includeAll && (
					<TouchableOpacity
						accessibilityRole="button"
						accessibilityState={{ selected: value === ALL_SCOPE }}
						accessibilityLabel="전체 주제"
						style={[styles.chip, value === ALL_SCOPE && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}
						activeOpacity={0.85}
						onPress={() => onChange(ALL_SCOPE)}>
						{showIcon && (
							<IconComponent type="materialIcons" name="apps" size={scaledSize(15)} color={value === ALL_SCOPE ? Colors.textInverse : Colors.textSecondary} />
						)}
						<Text style={[styles.chipText, value === ALL_SCOPE && { color: Colors.textInverse }]} numberOfLines={1} ellipsizeMode="tail">{allLabel}</Text>
					</TouchableOpacity>
				)}
				{domains.map((d) => {
					const active = value === d.key;
					return (
						<TouchableOpacity
							key={d.key}
							accessibilityRole="button"
							accessibilityState={{ selected: active }}
							accessibilityLabel={`${d.title}, ${d.total.toLocaleString()}개`}
							style={[styles.chip, active && { backgroundColor: d.color, borderColor: d.color }]}
							activeOpacity={0.85}
							onPress={() => onChange(d.key)}>
							{showIcon && (
								<DomainIcon mainIcon={d.mainIcon} icon={d.icon} iconType={d.iconType} size={scaledSize(15)} color={active ? readableOn(d.color) : d.color} />
							)}
							<Text style={[styles.chipText, active && { color: readableOn(d.color) }]} numberOfLines={1} ellipsizeMode="tail">
								{showCount ? `${d.title}(${d.total.toLocaleString()})` : d.title}
							</Text>
						</TouchableOpacity>
					);
				})}
			</ScrollView>
		</View>
	);
};

export default CategoryScopeChips;

const styles = themed(() => StyleSheet.create({
	chipBar: { backgroundColor: Colors.surface, paddingBottom: SpacingV.md },
	chipRow: { paddingHorizontal: Layout.screenH, gap: Spacing.sm },
	chip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm, borderRadius: Radius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
	chipText: { fontSize: Typography.body, fontWeight: '700', color: Colors.textSecondary },
}));
