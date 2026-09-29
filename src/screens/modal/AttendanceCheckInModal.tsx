/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import AppModal from '@/src/screens/common/atomic/AppModal';
import { SheetIn } from '@/src/screens/common/anim/Motion';
import LottieBox from '@/src/screens/common/atomic/LottieBox';
import Colors, { BRAND_GRADIENT } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, Border, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth, screenWidth, isTablet } from '@/src/utils';
import AttendanceService, { AttendanceState } from '@/src/services/AttendanceService';
import { hapticSuccess } from '@/src/utils/HapticUtils';

const LOTTIE_CONFETTI = require('@/src/assets/lottie/confetti.json');
import { playFinish } from '@/src/utils/SoundUtils';
import DateUtils from '@/src/utils/DateUtils';
import { themed } from '@/src/utils/ThemedStyles';

// 달력 한국어 로케일 (요일/월 한글 표기)
LocaleConfig.locales.ko = {
	monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
	monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
	dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
	dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
	today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

interface Props {
	visible: boolean;
	onClose: () => void;
	/** 방금 자동 출석이 처리돼 열린 경우 — 축하 연출을 재생한다 */
	celebrateOnOpen?: boolean;
	/** 이번 출석이 보호권으로 살아났는지 (문구 분기) */
	shielded?: boolean;
}

const todayStr = (): string => DateUtils.getLocalDateString();


/** 연속 출석 뱃지 단계 — 가로 스크롤로 노출 */
const STREAK_MILESTONES = [
	{ days: 1, labelKey: 'modal.attendance.milestones.first', icon: 'flag' },
	{ days: 7, labelKey: 'modal.attendance.milestones.week', icon: 'looks-one' },
	{ days: 14, labelKey: 'modal.attendance.milestones.twoWeeks', icon: 'looks-two' },
	{ days: 30, labelKey: 'modal.attendance.milestones.month', icon: 'military-tech' },
	{ days: 50, labelKey: 'modal.attendance.milestones.fifty', icon: 'workspace-premium' },
	{ days: 60, labelKey: 'modal.attendance.milestones.twoMonths', icon: 'auto-awesome' },
	{ days: 100, labelKey: 'modal.attendance.milestones.hundred', icon: 'emoji-events' },
] as const;

/**
 * 출석체크 모달
 * - 달력: 참여한 날은 파란색, 오늘은 초록색
 * - 출석 시: 원형 도장 없이 '출석 완료' 축하 애니메이션(스케일 + 컨페티)
 */
const AttendanceCheckInModal: React.FC<Props> = ({ visible, onClose, celebrateOnOpen = false, shielded = false }) => {
	const { t } = useTranslation();
	const [state, setState] = useState<AttendanceState>({ dates: [], lastCheck: null, streak: 0, bestStreak: 0 });
	const [checkedToday, setCheckedToday] = useState(false);
	const [celebrate, setCelebrate] = useState(false);
	const successScale = useRef(new Animated.Value(0)).current;
	// 축하 연출 타이머 — 모달 언마운트 시 정리
	const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => () => { if (celebrateTimer.current) clearTimeout(celebrateTimer.current); }, []);

	const today = todayStr();

	/** 출석 처리는 홈 진입 시 자동으로 끝난다 — 팝업은 결과(연속·달력)만 보여준다 */
	const load = useCallback(() => {
		AttendanceService.getState().then((st) => {
			setState(st);
			setCheckedToday(st.lastCheck === today);
		});
	}, [today]);

	/** 방금 출석이 처리돼 열린 팝업이면 축하 연출을 재생한다 */
	const playCelebrate = useCallback(() => {
		hapticSuccess();
		playFinish(); // 🎉 출석 완료 축하 사운드
		setCelebrate(true);
		successScale.setValue(0);
		Animated.spring(successScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
		if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
		celebrateTimer.current = setTimeout(() => {
			Animated.timing(successScale, { toValue: 0, duration: 240, useNativeDriver: true }).start(() => setCelebrate(false));
		}, 1500);
	}, [successScale]);

	useEffect(() => {
		if (visible) {
			load();
			if (celebrateOnOpen) playCelebrate();
		} else {
			setCelebrate(false);
			successScale.setValue(0);
		}
	}, [visible, load, celebrateOnOpen, playCelebrate, successScale]);

	// 언마운트 시 애니메이션 정리
	useEffect(() => () => successScale.stopAnimation(), [successScale]);

	// 달력 마킹: 참여한 날은 파란색(채움), 오늘은 초록색 강조
	const marked: Record<string, any> = {};
	state.dates.forEach((d) => {
		marked[d] = { customStyles: { container: { backgroundColor: Colors.primary }, text: { color: Colors.textInverse, fontWeight: '800' } } };
	});
	// 보호권으로 살린 날 = 금색 (빠졌지만 연속은 유지된 날)
	(state.shieldDates ?? []).forEach((d) => {
		marked[d] = { customStyles: { container: { borderWidth: Border.thin, borderColor: Colors.goldDark, backgroundColor: Colors.goldBg }, text: { color: Colors.goldDeep, fontWeight: '800' } } };
	});
	// 오늘 = 초록색 (참여했으면 초록 채움, 미참여면 초록 테두리)
	const attendedToday = state.dates.includes(today);
	marked[today] = attendedToday
		? { customStyles: { container: { backgroundColor: Colors.successDeep }, text: { color: Colors.textInverse, fontWeight: '800' } } }
		: { customStyles: { container: { borderWidth: Border.thin, borderColor: Colors.success }, text: { color: Colors.success, fontWeight: '800' } } };

	const bestStreak = Math.max(state.streak, state.bestStreak);
	const successRotate = successScale.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '0deg'] });

	return (
		<AppModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={styles.overlay}>
				<SheetIn visible={visible} style={styles.sheet}>
					<TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={Layout.hitSlop} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('modal.attendance.closeA11y')}>
						<IconComponent type="materialIcons" name="close" size={scaledSize(22)} color={Colors.textInverse} />
					</TouchableOpacity>
					{/* 히어로 — 시트 상단을 가로로 꽉 채운다 (스크롤 밖에 둬야 폭이 정확히 잡힌다) */}
					<View style={styles.hero}>
						<LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
						<View pointerEvents="none" style={styles.heroWatermark}>
							<IconComponent type="materialIcons" name="event-available" size={scaledSize(96)} color={Colors.onBrandWatermark} />
						</View>
						<Text style={styles.heroEyebrow}>{t('modal.attendance.eyebrow')}</Text>
						<View style={styles.heroStreakRow}>
							<IconComponent type="materialIcons" name="local-fire-department" size={scaledSize(30)} color={Colors.goldSoft} />
							<Text style={styles.heroStreak}>{state.streak}</Text>
							<Text style={styles.heroStreakUnit}>{t('modal.attendance.streakUnit')}</Text>
						</View>
						<Text style={styles.heroSub} numberOfLines={3} ellipsizeMode="tail">{t(checkedToday ? 'modal.attendance.subDone' : 'modal.attendance.subTodo')}</Text>
					</View>

					<ScrollView style={styles.body} showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>

					{/* 연속 출석 뱃지 — 가로 스크롤 (1 → 7 → 14 → 30 → 50 → 60 → 100일) */}
					<View style={styles.milestoneSection}>
						<Text style={styles.milestoneHead}>{t('modal.attendance.milestoneHead')}</Text>
						<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.milestoneRow}>
							{STREAK_MILESTONES.map((m, i) => {
								const done = bestStreak >= m.days;
								return (
									<React.Fragment key={m.days}>
										{i > 0 && <IconComponent type="materialIcons" name="chevron-right" size={scaledSize(16)} color={Colors.textMuted} style={styles.milestoneArrow} />}
										<View style={[styles.milestoneItem, done && styles.milestoneItemDone]}>
											<View style={[styles.milestoneIcon, done && styles.milestoneIconDone]}>
												<IconComponent type="materialIcons" name={done ? m.icon : 'lock'} size={scaledSize(20)} color={done ? Colors.textInverse : Colors.textMuted} />
											</View>
											<Text style={[styles.milestoneDays, done && { color: Colors.primary }]}>{t('common.days', { count: m.days })}</Text>
											<Text style={styles.milestoneLabel} numberOfLines={1}>{t(m.labelKey)}</Text>
										</View>
									</React.Fragment>
								);
							})}
						</ScrollView>
					</View>

					{/* 달력 — 항상 펼친 상태로 보여준다 */}
					<View style={styles.calendarWrap}>
						<Calendar
							current={today}
							markingType="custom"
							markedDates={marked}
							hideExtraDays
							theme={{
								calendarBackground: 'transparent',
								textSectionTitleColor: Colors.textSecondary,
								monthTextColor: Colors.textStrong,
								textMonthFontWeight: '800',
								arrowColor: Colors.primary,
								todayTextColor: Colors.success,
								dayTextColor: Colors.text,
								textDisabledColor: Colors.textMuted,
							}}
							style={styles.calendar}
						/>
					</View>

					{/* 범례 */}
					<View style={styles.legendRow}>
						<View style={styles.legendItem}>
							<View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
							<Text style={styles.legendText}>{t('modal.attendance.legendAttended')}</Text>
						</View>
						<View style={styles.legendItem}>
							<View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
							<Text style={styles.legendText}>{t('modal.attendance.legendToday')}</Text>
						</View>
						{(state.shieldDates ?? []).length > 0 && (
							<View style={styles.legendItem}>
								<View style={[styles.legendDot, styles.legendDotShield]} />
								<Text style={styles.legendText}>{t('modal.attendance.legendShield')}</Text>
							</View>
						)}
					</View>

					</ScrollView>

					{/* 닫기 — 스크롤과 분리해 항상 같은 자리에 둔다 */}
					<TouchableOpacity style={styles.confirmBtn} activeOpacity={0.85} accessibilityRole="button" onPress={onClose}>
						<Text style={styles.confirmText}>{t('common.confirm')}</Text>
					</TouchableOpacity>

				</SheetIn>

				{/* 🎉 출석 완료 축하 */}
				{celebrate && (
					<>
						<ConfettiCannon count={120} origin={{ x: screenWidth / 2, y: -10 }} fadeOut autoStart explosionSpeed={380} />
						<View style={styles.celebrateLottieWrap} pointerEvents="none">
							<LottieBox source={LOTTIE_CONFETTI} autoPlay loop={false} style={styles.celebrateLottie} />
						</View>
						<View style={styles.celebrateWrap} pointerEvents="none">
							<Animated.View style={[styles.celebrateBadge, { transform: [{ scale: successScale }, { rotate: successRotate }] }]}>
								<View style={styles.celebrateIconCircle}>
									<IconComponent type="materialIcons" name="celebration" size={scaledSize(34)} color={Colors.primary} />
								</View>
								<Text style={styles.celebrateText}>{t(shielded ? 'modal.attendance.celebrateShielded' : 'modal.attendance.celebrateDone')}</Text>
								<Text style={styles.celebrateSub}>{t(shielded ? 'modal.attendance.celebrateSubShielded' : 'modal.attendance.celebrateSub', { count: state.streak })}</Text>
							</Animated.View>
						</View>
					</>
				)}
			</View>
		</AppModal>
	);
};

export default AttendanceCheckInModal;

const styles = themed(() => StyleSheet.create({
	overlay: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
	// 히어로가 시트 상단까지 꽉 차도록 위쪽 여백은 히어로가 직접 가진다
	sheet: { width: '100%', maxWidth: Layout.dialogMaxWidth, backgroundColor: Colors.surface, borderRadius: Radius.xl, overflow: 'hidden', paddingHorizontal: 0, paddingTop: 0, paddingBottom: SpacingV.lg, maxHeight: isTablet ? scaleHeight(620) : '76%' },
	body: { alignSelf: 'stretch', flexGrow: 0, flexShrink: 1 },
	sheetBody: { alignItems: 'center', paddingHorizontal: Spacing.xl },
	closeBtn: { position: 'absolute', top: SpacingV.md, right: Spacing.md, zIndex: 2, padding: Spacing.xs },
	// 시트 상단 가로 전체를 채운다 (좌우 패딩은 아래 스크롤 영역이 가진다)
	hero: { alignSelf: 'stretch', overflow: 'hidden', paddingHorizontal: Spacing.xl, paddingTop: SpacingV.xl, paddingBottom: SpacingV.md, alignItems: 'center' },
	legendDotShield: { backgroundColor: Colors.goldBg, borderWidth: Border.thin, borderColor: Colors.goldDark },
	confirmBtn: { alignSelf: 'stretch', marginHorizontal: Spacing.xl, marginTop: SpacingV.lg, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: SpacingV.lg, alignItems: 'center' },
	confirmText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textInverse },
	heroWatermark: { position: 'absolute', right: scaleWidth(-16), bottom: scaleHeight(-20) },
	heroEyebrow: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textInverse, opacity: 0.9 },
	heroStreakRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs, marginTop: SpacingV.xs },
	heroStreak: { fontSize: Typography.h1, fontWeight: '900', color: Colors.textInverse },
	heroStreakUnit: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textInverse, marginBottom: SpacingV.xs },
	heroSub: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textInverse, opacity: 0.92, marginTop: SpacingV.xxs },
	milestoneSection: { alignSelf: 'stretch', marginTop: SpacingV.lg },
	milestoneHead: { fontSize: Typography.footnote, fontWeight: '900', color: Colors.textSecondary, marginBottom: SpacingV.sm },
	milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingRight: Spacing.sm },
	milestoneArrow: { marginHorizontal: scaleWidth(-2) },
	milestoneItem: { width: scaleWidth(64), alignItems: 'center', paddingVertical: SpacingV.sm, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
	milestoneItemDone: { borderColor: Colors.primarySoft, backgroundColor: Colors.primaryBg },
	milestoneIcon: { width: scaleWidth(34), height: scaleWidth(34), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
	milestoneIconDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
	milestoneDays: { fontSize: Typography.footnote, fontWeight: '900', color: Colors.textMuted, marginTop: SpacingV.xs },
	milestoneLabel: { fontSize: Typography.micro, fontWeight: '700', color: Colors.textSecondary, marginTop: SpacingV.xxs },
	calendarWrap: { alignSelf: 'stretch', marginTop: SpacingV.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, overflow: 'hidden', paddingBottom: SpacingV.xs },
	calendar: { borderRadius: Radius.lg },
	legendRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xl, marginTop: SpacingV.md },
	legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	legendDot: { width: scaleWidth(10), height: scaleWidth(10), borderRadius: Radius.pill },
	legendText: { fontSize: Typography.footnote, color: Colors.textSecondary, fontWeight: '700' },
	celebrateWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
	celebrateLottieWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-start', alignItems: 'center' },
	celebrateLottie: { width: '100%', height: scaleHeight(320) },
	celebrateBadge: { alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: Spacing.xxl, paddingVertical: SpacingV.xl, borderRadius: Radius.xl },
	celebrateIconCircle: { width: scaleWidth(56), height: scaleWidth(56), borderRadius: Radius.xl, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: SpacingV.xs },
	celebrateText: { color: Colors.textInverse, fontSize: Typography.h2, fontWeight: '900', marginTop: SpacingV.sm },
	celebrateSub: { color: Colors.onBrandText, fontSize: Typography.body, fontWeight: '700', marginTop: SpacingV.xs },
}));
