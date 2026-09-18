import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppModal from '@/src/screens/common/atomic/AppModal';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { LANGUAGES, LANGUAGE_LABELS, type Language } from '@/src/translations/language';
import { CONTENT_MAX_WIDTH, scaleHeight, scaleWidth } from '@/src/utils';

interface Props {
	visible: boolean;
	/** 지금 쓰는 언어 — 목록에서 체크로 표시한다 */
	current: Language;
	onPick: (next: Language) => void;
	onClose: () => void;
}

/**
 * 언어 고르기 바텀 시트.
 * -------------------------------------------------
 * 설정 화면에 세 줄을 늘 펼쳐 두면, 언어를 한 번 고른 뒤에는 쓰지 않는 줄이 두 개 남는다.
 * 설정에는 지금 언어 한 줄만 두고, 누르면 여기서 고른다.
 *
 * 언어 이름은 번역하지 않는다 — '日本語' 는 어느 언어로 앱을 보고 있든 日本語 다.
 * 지금 언어를 모르는 사람이 목록에서 자기 언어를 찾는 것이 목적이라, 각 언어를 그 언어로 적는다.
 */
const LanguagePickerSheet = ({ visible, current, onPick, onClose }: Props) => {
	const { t } = useTranslation();
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const insets = useSafeAreaInsets();

	return (
		<AppModal visible={visible} onClose={onClose} align="bottom">
			<View style={[styles.sheet, { paddingBottom: SpacingV.lg + insets.bottom }]}>
				{/* 손잡이 — 아래에서 올라온 시트라는 것을 알린다 */}
				<View style={styles.handle} />

				<View style={styles.head}>
					<Text style={styles.title}>{t('setting.language.section')}</Text>
					<TouchableOpacity
						onPress={onClose}
						hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
						activeOpacity={0.7}
						accessibilityRole="button"
						accessibilityLabel={t('common.close')}>
						<IconComponent type="materialIcons" name="close" size={20} color={Colors.textSecondary} />
					</TouchableOpacity>
				</View>

				<View style={styles.list}>
					{LANGUAGES.map((code, index) => {
						const selected = code === current;
						return (
							<React.Fragment key={code}>
								{index > 0 && <View style={styles.divider} />}
								<TouchableOpacity
									style={styles.row}
									activeOpacity={0.7}
									accessibilityRole="button"
									accessibilityState={{ selected }}
									onPress={() => onPick(code)}>
									<View style={[styles.rowIcon, selected && styles.rowIconOn]}>
										<IconComponent
											type="materialCommunityIcons"
											name="translate"
											size={18}
											color={selected ? Colors.primaryDeep : Colors.textMuted}
										/>
									</View>
									<Text style={[styles.rowLabel, selected && styles.rowLabelOn]} numberOfLines={1} ellipsizeMode="tail">
										{LANGUAGE_LABELS[code]}
									</Text>
									{selected && <IconComponent type="materialCommunityIcons" name="check" size={20} color={Colors.primaryDeep} />}
								</TouchableOpacity>
							</React.Fragment>
						);
					})}
				</View>

				<Text style={styles.notice}>{t('setting.language.notice')}</Text>
			</View>
		</AppModal>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		sheet: {
			width: '100%',
			maxWidth: CONTENT_MAX_WIDTH,
			alignSelf: 'center',
			backgroundColor: Colors.surface,
			borderTopLeftRadius: Radius.xl,
			borderTopRightRadius: Radius.xl,
			paddingTop: SpacingV.sm,
			paddingHorizontal: Spacing.xl,
		},
		handle: {
			width: scaleWidth(40),
			height: scaleHeight(4),
			borderRadius: Radius.pill,
			backgroundColor: Colors.borderStrong,
			alignSelf: 'center',
			marginBottom: SpacingV.md,
		},
		head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SpacingV.sm },
		title: { flex: 1, fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.textStrong },
		list: { borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.md },
		row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, height: scaleHeight(52) },
		rowIcon: {
			width: scaleWidth(30),
			height: scaleWidth(30),
			borderRadius: Radius.md,
			backgroundColor: Colors.surface,
			alignItems: 'center',
			justifyContent: 'center',
		},
		rowIconOn: { backgroundColor: Colors.primarySoft },
		// 긴 언어 이름이 체크 표시를 밀어내지 않게 남은 폭만 쓴다
		rowLabel: { flex: 1, fontSize: Typography.body, color: Colors.text },
		rowLabelOn: { color: Colors.primaryDeep, fontWeight: FontWeight.bold },
		divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: scaleWidth(42) },
		notice: { marginTop: SpacingV.md, fontSize: Typography.caption, color: Colors.textMuted, lineHeight: Math.round(Typography.caption * 1.5) },
	});

export default LanguagePickerSheet;
