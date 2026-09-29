/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import BottomSheet from '@/src/screens/common/atomic/BottomSheet';
import Colors from '@/src/const/ConstColors';
import { Spacing, SpacingV, Typography, Radius, Border, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import { themed } from '@/src/utils/ThemedStyles';

export interface DifficultyOption {
	key: string;
	label: string;
	icon: string;
	desc?: string;
	/** 해당 난이도 문제 수 (있으면 설명 대신 'N문제' 표기) */
	count?: number;
}

interface Props {
	visible: boolean;
	/** 현재 선택된 난이도 라벨(초급/중급/고급/특급). null·undefined = 전체 */
	value?: string | null;
	onClose: () => void;
	/** 난이도 선택 결과. 전체를 고르면 null 을 전달 */
	onSelect: (level: string | null) => void;
	/** 도메인별 커스텀 옵션(없으면 기본 전체·초급~특급) */
	options?: DifficultyOption[];
	/** 상단 부제 문구 커스텀 */
	subtitle?: string;
}

/**
 * 난이도 선택 bottom sheet (홈/묶음 퀴즈 공용)
 * - 데이터 난이도 라벨(초급/중급/고급/특급)만 제공
 */
const OPTIONS: { key: string; label: string; icon: string; desc: string }[] = [
	{ key: '', label: '전체', icon: 'apps', desc: '모든 난이도에서 골고루 출제' },
	{ key: '초급', label: '초급', icon: 'signal-cellular-alt', desc: '기초부터 차근차근' },
	{ key: '중급', label: '중급', icon: 'bar-chart', desc: '한 단계씩 올라가기' },
	{ key: '고급', label: '고급', icon: 'trending-up', desc: '실력을 단단하게' },
	{ key: '특급', label: '특급', icon: 'whatshot', desc: '최고 난도에 도전' },
];

const DifficultyPickerModal: React.FC<Props> = ({ visible, value, onClose, onSelect, options, subtitle }) => {
	const rows = options ?? OPTIONS;

	const currentKey = value ?? '';

	const pick = (key: string) => {
		// 빈 key = '전체' → null 로 전달(전체 난이도 출제)
		onSelect(key === '' ? null : key);
	};

	return (
		<BottomSheet visible={visible} onClose={onClose}>
				<View style={styles.body}>
					<TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={10} activeOpacity={0.7}>
						<IconComponent type="materialIcons" name="close" size={scaledSize(22)} color={Colors.textSecondary} />
					</TouchableOpacity>

					<View style={styles.headIcon}>
						<IconComponent type="materialIcons" name="tune" size={scaledSize(26)} color={Colors.primary} />
					</View>
					<Text style={styles.title}>난이도 선택</Text>
					<Text style={styles.sub} numberOfLines={3} ellipsizeMode="tail">{subtitle ?? '원하는 난이도로 퀴즈를 시작해요'}</Text>

					{/* 항목이 많으면 시트 안에서 스크롤 */}
					<ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
						{rows.map((opt) => {
							const on = opt.key === currentKey;
							const descLine = opt.count != null ? `${opt.count.toLocaleString()}문제` : opt.desc;
							return (
								<TouchableOpacity
									key={opt.key}
									style={[styles.row, on && styles.rowOn]}
									activeOpacity={0.85}
									onPress={() => pick(opt.key)}>
									<View style={[styles.rowIcon, on ? styles.rowIconOn : styles.rowIconOff]}>
										<IconComponent type="materialIcons" name={opt.icon} size={scaledSize(20)} color={on ? Colors.textInverse : Colors.primary} />
									</View>
									<View style={styles.rowBody}>
										<Text style={[styles.rowLabel, on && { color: Colors.primary }]} numberOfLines={1} ellipsizeMode="tail">{opt.label}</Text>
										{!!descLine && <Text style={styles.rowDesc} numberOfLines={3} ellipsizeMode="tail">{descLine}</Text>}
									</View>
									{/* '전체'(빈 key)는 선택 여부와 무관하게 다른 항목과 동일하게 > 로 표기 */}
									<IconComponent
										type="materialIcons"
										name={on && opt.key !== '' ? 'check-circle' : 'chevron-right'}
										size={scaledSize(on && opt.key !== '' ? 22 : 20)}
										color={on && opt.key !== '' ? Colors.primary : Colors.textMuted}
									/>
								</TouchableOpacity>
							);
						})}
					</ScrollView>
				</View>
		</BottomSheet>
	);
};

export default DifficultyPickerModal;

const styles = themed(() => StyleSheet.create({
	body: { flexShrink: 1 },
	closeBtn: { position: 'absolute', top: 0, right: 0, width: Layout.touch, height: Layout.touch, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
	headIcon: { alignSelf: 'center', width: scaleWidth(56), height: scaleWidth(56), borderRadius: Radius.lg, backgroundColor: Colors.primaryBg, justifyContent: 'center', alignItems: 'center' },
	title: { fontSize: Typography.h3, fontWeight: '900', color: Colors.textStrong, marginTop: SpacingV.md, textAlign: 'center' },
	sub: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: SpacingV.xs, textAlign: 'center' },
	list: { marginTop: SpacingV.xl, gap: SpacingV.sm },
	row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderWidth: Border.thin, borderColor: 'transparent', borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.md },
	rowOn: { backgroundColor: Colors.primaryBg, borderColor: Colors.primarySoft },
	rowIcon: { width: scaleWidth(42), height: scaleWidth(42), borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
	rowIconOn: { backgroundColor: Colors.primary },
	rowIconOff: { backgroundColor: Colors.primarySoft },
	rowBody: { flex: 1 },
	rowLabel: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textStrong },
	rowDesc: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xs },
}));
