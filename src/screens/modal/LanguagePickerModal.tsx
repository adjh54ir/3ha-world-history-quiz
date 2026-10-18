import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import BottomSheet from '@/src/screens/common/atomic/BottomSheet';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import Colors from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography } from '@/src/const/ConstDesign';
import { scaledSize, scaleWidth } from '@/src/utils';
import { themed } from '@/src/utils/ThemedStyles';
import { LANGUAGE_OPTIONS, appLanguage } from '@/src/translations';
import type { Language } from '@/src/hooks/language/schema';

interface Props {
	visible: boolean;
	onClose: () => void;
	onSelect: (code: Language) => void;
}

/**
 * 언어 선택 하단 시트
 * - 설정 화면에 6개 언어를 펼쳐 두지 않고, 현재 언어 한 줄만 보여 주다가 누르면 아래에서 올라오는 시트에서 고른다.
 */
const LanguagePickerModal: React.FC<Props> = ({ visible, onClose, onSelect }) => {
	const { t } = useTranslation();
	const current = appLanguage();
	return (
		<BottomSheet visible={visible} onClose={onClose}>
			<View style={styles.body}>
				<View style={styles.iconWrap}>
					<IconComponent type="materialIcons" name="translate" size={scaledSize(26)} color={Colors.primary} />
				</View>
				<Text style={styles.title}>{t('settings.language.pickTitle')}</Text>
				<Text style={styles.sub}>{t('settings.language.pickSub')}</Text>
				<View style={styles.list}>
					{LANGUAGE_OPTIONS.map((o, i) => {
						const on = current === o.code;
						return (
							<FadeInUp key={o.code} delay={60 + i * 40} distance={8}>
								<TouchableOpacity
									style={[styles.row, on && styles.rowOn]}
									activeOpacity={0.8}
									onPress={() => (on ? onClose() : onSelect(o.code))}
									accessibilityRole="radio"
									accessibilityState={{ selected: on }}>
									<View style={[styles.badge, on && styles.badgeOn]}>
										<Text style={[styles.badgeText, on && styles.badgeTextOn]} numberOfLines={1}>{o.badge}</Text>
									</View>
									<Text style={[styles.label, on && styles.labelOn]} numberOfLines={1} ellipsizeMode="tail">{o.label}</Text>
									{on && <IconComponent type="materialIcons" name="check-circle" size={scaledSize(20)} color={Colors.primary} />}
								</TouchableOpacity>
							</FadeInUp>
						);
					})}
				</View>
				<TouchableOpacity style={styles.closeBtn} activeOpacity={0.85} onPress={onClose}>
					<Text style={styles.closeText}>{t('common.close')}</Text>
				</TouchableOpacity>
			</View>
		</BottomSheet>
	);
};

export default LanguagePickerModal;

const styles = themed(() => StyleSheet.create({
	body: { alignItems: 'center' },
	iconWrap: { width: scaleWidth(52), height: scaleWidth(52), borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: SpacingV.md, backgroundColor: Colors.primaryBg },
	title: { fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong, textAlign: 'center' },
	sub: { fontSize: Typography.footnote, color: Colors.textSecondary, textAlign: 'center', marginTop: SpacingV.xs },
	list: { alignSelf: 'stretch', gap: SpacingV.sm, marginTop: SpacingV.lg },
	row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
	rowOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
	badge: { width: scaleWidth(34), height: scaleWidth(34), borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceAlt },
	badgeOn: { backgroundColor: Colors.primarySoft },
	badgeText: { fontSize: Typography.footnote, fontWeight: '800', letterSpacing: 0.5, color: Colors.textSecondary },
	badgeTextOn: { color: Colors.primary },
	label: { flex: 1, fontSize: Typography.callout, fontWeight: '700', color: Colors.textStrong },
	labelOn: { color: Colors.primary, fontWeight: '800' },
	closeBtn: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginTop: SpacingV.lg, paddingVertical: SpacingV.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderStrong },
	closeText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.text },
}));
