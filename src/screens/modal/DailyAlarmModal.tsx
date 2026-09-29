/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform, Linking } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import AppModal from '@/src/screens/common/atomic/AppModal';
import { SheetIn } from '@/src/screens/common/anim/Motion';
import Colors, { isDark } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Typography, Radius, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import DailyWordService from '@/src/services/DailyWordService';
import { RequestNotificationPermission, ScheduleDailyWordReminder, CancelDailyWordReminder } from '@/src/utils/NotifactionHelper';
import DateUtils from '@/src/utils/DateUtils';
import { useToast } from '@/src/context/ToastContext';
import { themed } from '@/src/utils/ThemedStyles';

interface Props {
	visible: boolean;
	onClose: () => void;
	/** 저장 후 현재 on/off 상태 전달 */
	onChange?: (on: boolean) => void;
}

const pad = (n: number) => `${n}`.padStart(2, '0');
const label = (h: number, m: number) => {
	const ampm = h < 12 ? '오전' : '오후';
	const h12 = h % 12 === 0 ? 12 : h % 12;
	return `${ampm} ${h12}:${pad(m)}`;
};

/**
 * 오늘의 상식 알람 설정 모달
 * - 알람 on/off + 시간 선택 + 권한 처리
 */
const DailyAlarmModal: React.FC<Props> = ({ visible, onClose, onChange }) => {
	const { showToast } = useToast();
	const [on, setOn] = useState(false);
	const [time, setTime] = useState<{ hour: number; minute: number }>({ hour: 8, minute: 0 });
	const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
	const [saving, setSaving] = useState(false);
	// 권한 안내는 모달 안 배너로 표시한다 — 열린 모달 위에 또 모달을 띄우면 기기에 따라 보이지 않는다
	const [permWarn, setPermWarn] = useState(false);

	useEffect(() => {
		if (!visible) return;
		setPermWarn(false);
		DailyWordService.isReminderOn().then(setOn);
		DailyWordService.getReminderTime().then(setTime);
		setShowPicker(Platform.OS === 'ios');
	}, [visible]);

	const onPickTime = (_e: unknown, date?: Date) => {
		if (Platform.OS === 'android') setShowPicker(false);
		if (date) {
			const { hour, minute } = DateUtils.getZonedParts(date);
			setTime({ hour, minute });
		}
	};

	const toggle = async (next: boolean) => {
		if (next && !(await RequestNotificationPermission())) {
			setPermWarn(true);
			return;
		}
		setPermWarn(false);
		setOn(next);
	};

	const save = async () => {
		setSaving(true);
		try {
			await DailyWordService.setReminderOn(on);
			await DailyWordService.setReminderTime(time);
			if (on) {
				await ScheduleDailyWordReminder(time.hour, time.minute);
			} else {
				await CancelDailyWordReminder();
			}
			onChange?.(on);
			showToast(on ? '오늘의 상식 알림을 켰어요' : '오늘의 상식 알림을 껐어요', on ? 'notifications-active' : 'notifications-off');
			onClose();
		} finally {
			setSaving(false);
		}
	};

	const pickerDate = DateUtils.getLocalTimeToday(time.hour, time.minute);

	return (
		<AppModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={styles.overlay}>
				<SheetIn visible={visible} style={styles.sheet}>
					<TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={10}>
						<IconComponent type="materialIcons" name="close" size={scaledSize(22)} color={Colors.textSecondary} />
					</TouchableOpacity>

					<View style={styles.headIcon}>
						<IconComponent type="materialIcons" name="notifications-active" size={scaledSize(26)} color={Colors.primary} />
					</View>
					<Text style={styles.title}>오늘의 상식 알람</Text>
					<Text style={styles.sub}>매일 정해진 시간에 오늘의 상식을 알려드려요</Text>

					{permWarn && (
						<View style={styles.permWarn}>
							<IconComponent type="materialIcons" name="notifications-off" size={scaledSize(18)} color={Colors.errorDark} />
							<Text style={styles.permWarnText}>설정에서 알림 권한을 허용해주세요.</Text>
							<TouchableOpacity style={styles.permWarnBtn} activeOpacity={0.85} onPress={() => Linking.openSettings().catch(() => {})}>
								<Text style={styles.permWarnBtnText}>설정 열기</Text>
							</TouchableOpacity>
						</View>
					)}

					<View style={styles.toggleRow}>
						<Text style={styles.toggleLabel}>알람 사용</Text>
						<Switch value={on} onValueChange={toggle} trackColor={{ true: Colors.primary, false: Colors.borderStrong }} thumbColor={Colors.textInverse} />
					</View>

					<View style={[styles.timeRow, !on && { opacity: 0.45 }]}>
						<Text style={styles.timeLabel}>알람 시간</Text>
						{Platform.OS === 'android' ? (
							<TouchableOpacity style={styles.timeBtn} activeOpacity={0.8} disabled={!on} onPress={() => setShowPicker(true)}>
								<IconComponent type="materialIcons" name="schedule" size={scaledSize(18)} color={Colors.primary} />
								<Text style={styles.timeValue}>{label(time.hour, time.minute)}</Text>
							</TouchableOpacity>
						) : (
							<Text style={styles.timeValue}>{label(time.hour, time.minute)}</Text>
						)}
					</View>

					{showPicker && on && (
						<View style={styles.pickerWrap}>
							<DateTimePicker value={pickerDate} mode="time" themeVariant={isDark() ? 'dark' : 'light'} is24Hour={false} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onPickTime} />
						</View>
					)}

					<TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.primary }]} activeOpacity={0.9} disabled={saving} onPress={save}>
						<Text style={styles.saveBtnText}>저장</Text>
					</TouchableOpacity>
				</SheetIn>
			</View>
		</AppModal>
	);
};

export default DailyAlarmModal;

const styles = themed(() => StyleSheet.create({
	permWarn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'stretch', backgroundColor: Colors.errorSoft, borderWidth: 1, borderColor: Colors.errorBorder, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm, marginTop: SpacingV.md },
	permWarnText: { flex: 1, fontSize: Typography.footnote, fontWeight: '700', color: isDark() ? Colors.error : Colors.errorDark, lineHeight: scaleHeight(17) },
	permWarnBtn: { paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.md, backgroundColor: Colors.errorDark },
	permWarnBtnText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textInverse },
	overlay: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
	sheet: { width: '100%', maxWidth: Layout.dialogMaxWidth, backgroundColor: Colors.surface, borderRadius: Radius.xl, paddingHorizontal: Spacing.xl, paddingTop: SpacingV.xxl, paddingBottom: SpacingV.xxl, alignItems: 'center' },
	closeBtn: { position: 'absolute', top: SpacingV.md, right: Spacing.md, zIndex: 2, padding: Spacing.xs },
	headIcon: { width: scaleWidth(56), height: scaleWidth(56), borderRadius: Radius.lg, backgroundColor: Colors.primarySoft, justifyContent: 'center', alignItems: 'center' },
	title: { fontSize: Typography.h3, fontWeight: '900', color: Colors.textStrong, marginTop: SpacingV.md },
	sub: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: SpacingV.xs, textAlign: 'center' },
	toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: SpacingV.xl, paddingVertical: SpacingV.sm },
	toggleLabel: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textStrong },
	timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: SpacingV.sm, borderTopWidth: 1, borderTopColor: Colors.border },
	timeLabel: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textStrong },
	timeBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.sm, borderRadius: Radius.md },
	timeValue: { fontSize: Typography.callout, fontWeight: '800', color: Colors.primary },
	pickerWrap: { alignSelf: 'stretch', alignItems: 'center' },
	saveBtn: { alignSelf: 'stretch', paddingVertical: SpacingV.lg, borderRadius: Radius.md, alignItems: 'center', marginTop: SpacingV.xl },
	saveBtnText: { flexShrink: 1, textAlign: 'center', color: Colors.textInverse, fontSize: Typography.callout, fontWeight: '800' },
}));
