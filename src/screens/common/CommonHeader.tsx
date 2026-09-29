import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import IconComponent from './atomic/IconComponent';
import { Colors } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Typography, FontWeight, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleWidth } from '@/src/utils/DementionUtils';
import { themed } from '@/src/utils/ThemedStyles';

interface CommonHeaderProps {
	/** 가운데 표시할 제목 */
	title?: string;
	/** 제목 아래 보조 설명(선택) */
	subtitle?: string;
	/** 왼쪽 뒤로가기/닫기 버튼 핸들러 (없으면 좌측 자리만 확보) */
	onBack?: () => void;
	/** 왼쪽 아이콘 (기본: arrow-back) */
	backIcon?: string;
	/** 오른쪽 영역(액션 버튼 등) */
	right?: React.ReactNode;
	/** 하단 구분선 표시 여부 */
	border?: boolean;
	/** 제목 좌측 정렬(기본 가운데 정렬) */
	alignLeft?: boolean;
	style?: StyleProp<ViewStyle>;
}

/**
 * 화면 공통 헤더
 * - 모든 Stack/BottomTab 화면의 상단 제목 영역을 통일된 폰트·간격·정렬로 표시합니다.
 * - 좌(뒤로가기) · 중(제목) · 우(액션) 3분할로 제목이 항상 정중앙에 오도록 정렬을 보장합니다.
 */
const CommonHeader = ({
	title,
	subtitle,
	onBack,
	backIcon = 'arrow-back-ios-new',
	right,
	border = true,
	alignLeft = false,
	style,
}: CommonHeaderProps) => {
	return (
		<View style={[styles.container, border && styles.bordered, style]}>
			<View style={styles.side}>
				{onBack && (
					<TouchableOpacity
						onPress={onBack}
						style={styles.backBtn}
						hitSlop={Layout.hitSlop}
						activeOpacity={0.7}>
						<IconComponent type="materialIcons" name={backIcon} size={scaledSize(18)} color={Colors.text} />
					</TouchableOpacity>
				)}
			</View>

			<View style={[styles.center, alignLeft && styles.centerLeft]}>
				{!!title && (
					<Text style={[styles.title, alignLeft && styles.titleLeft]} numberOfLines={1} ellipsizeMode="tail">
						{title}
					</Text>
				)}
				{!!subtitle && (
					<Text style={[styles.subtitle, alignLeft && styles.titleLeft]} numberOfLines={1} ellipsizeMode="tail">
						{subtitle}
					</Text>
				)}
			</View>

			<View style={[styles.side, styles.sideRight]}>{right}</View>
		</View>
	);
};

export default CommonHeader;

const SIDE_WIDTH = Layout.touch;

const styles = themed(() => StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.surface,
		paddingHorizontal: Spacing.sm, // 뒤로가기 아이콘 좌측선을 본문(Layout.screenH)과 맞춘다
		paddingVertical: SpacingV.sm,
		minHeight: scaleWidth(56),
	},
	bordered: {
		borderBottomWidth: 1,
		borderBottomColor: Colors.border,
	},
	side: {
		width: SIDE_WIDTH,
		justifyContent: 'center',
	},
	sideRight: {
		alignItems: 'flex-end',
	},
	backBtn: {
		width: Layout.touch,
		height: Layout.touch,
		alignItems: 'center',
		justifyContent: 'center',
	},
	center: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	centerLeft: {
		alignItems: 'flex-start',
	},
	title: {
		fontSize: Typography.title,
		fontWeight: FontWeight.heavy,
		color: Colors.textStrong,
		textAlign: 'center',
	},
	titleLeft: {
		textAlign: 'left',
	},
	subtitle: {
		fontSize: Typography.footnote,
		fontWeight: FontWeight.medium,
		color: Colors.textSecondary,
		marginTop: SpacingV.xs,
		textAlign: 'center',
	},
}));
