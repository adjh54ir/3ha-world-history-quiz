import FourImages from '@/src/four/assets/FourImages';
import React, { useEffect, useRef } from 'react';
import AppModal from '@/src/four/screens/common/atomic/AppModal';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAnimationCleanup from '@/src/four/hooks/useAnimationCleanup';
import FastImage from '@/src/four/components/FastImage';
import MascotImage from '@/src/screens/common/atomic/MascotImage';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { MODAL_MAX_WIDTH, scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils';
import IconComponent from '../common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import { useAttendancePet, useStreak } from '@/src/hooks/useLife';
import { ATTENDANCE_FEED_CYCLE, attendanceFeedReward, daysToFeedMilestone } from '@/src/services/life/LifeRules';
import DateUtils from '@/src/four/utils/DateUtils';
import { Typography, FontWeight, Spacing, SpacingV, Radius, HitSlop } from '@/src/four/const/ConstDesign';
import { Colors } from '@/src/four/const/ConstColors';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';
import { getHanjaTextStyle } from '@/src/four/const/ConstHanjaFont';

/**
 * 달력 한글 로케일 — 기본값이 영어라 요일이 Sun·Mon 으로 나왔다.
 * 이 앱에서 달력을 쓰는 곳은 이 모달뿐이라 여기서 한 번만 등록한다.
 */
LocaleConfig.locales.ko = {
	monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
	monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
	dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
	dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
	today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

const CHECK_IN_MASCOT = FourImages.screen_fox_check_in;
const FEED_IMAGE = require('@/src/assets/illustrations/attendance-pet-feed.webp');
const FEED_CRATE_IMAGE = require('@/src/assets/illustrations/attendance-pet-feed-bundle.webp');

interface CheckInModalProps {
	visible: boolean;
	isCheckedIn: boolean;
	checkedInDates: { [date: string]: any };
	mascot: any;
	showStamp: boolean;
	stampStyle: any;
	/** 출석 도장을 찍고 보상을 받는다 — 아직 안 찍은 날에만 버튼이 보인다 */
	onClaim: () => void;
	onClose: () => void;
}

/**
 * 출석 팝업 — 출석의 보상은 "펫 먹이" 하나다.
 * -------------------------------------------------
 * 펫은 먹이를 먹어야 자라고, 먹이는 출석으로 들어온다. 그래서 이 팝업은 성장 단계가 아니라
 * 오늘 받은 먹이와 다음 특별 출석까지 남은 날만 보여 준다.
 * 먹이를 주는 일은 여기서 하지 않는다 — 수호신이 있는 '나의 활동'에서 준다.
 */
const CheckInModal: React.FC<CheckInModalProps> = ({ visible, isCheckedIn, checkedInDates, mascot, showStamp, stampStyle, onClaim, onClose }) => {
	const insets = useSafeAreaInsets();
	const { feeds, image: petImageRaw } = useAttendancePet();
	const { streak } = useStreak();
	/**
	 * 출석 완료 연출에 함께 세우는 나침반 올빼미.
	 * 먹이를 한 번도 주지 않았으면 아직 알조차 없다 — 없는 알을 미리 보여 주지 않고 사자만 세운다.
	 */
	const petImage = petImageRaw;
	/** 오늘 받은(또는 오늘 찍으면 받을) 먹이 수 — 7일마다 오는 특별 출석이면 여러 개다 */
	const todayFeeds = attendanceFeedReward(isCheckedIn ? streak : streak + 1);
	const isSpecial = todayFeeds > 1;
	/** 이번 7일 주기에서 몇 칸까지 왔는지 (0~7) */
	const cycleAt = isCheckedIn ? streak % ATTENDANCE_FEED_CYCLE || ATTENDANCE_FEED_CYCLE : streak % ATTENDANCE_FEED_CYCLE;
	const restDays = daysToFeedMilestone(isCheckedIn ? streak : streak);

	// 다른 모달과 같은 등장 연출(페이드 + 살짝 확대)
	const scaleAnim = useRef(new Animated.Value(0.9)).current;
	const opacityAnim = useRef(new Animated.Value(0)).current;
	/** 먹이 그림이 통통 튄다 — 오늘 받은 보상으로 눈이 먼저 가게 */
	const feedAnim = useRef(new Animated.Value(0)).current;
	useAnimationCleanup(scaleAnim, opacityAnim, feedAnim);

	useEffect(() => {
		if (!visible) {
			return;
		}
		scaleAnim.setValue(0.9);
		opacityAnim.setValue(0);
		const anim = Animated.parallel([
			Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
			Animated.timing(opacityAnim, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
		]);
		anim.start();

		feedAnim.setValue(0);
		const bounce = Animated.loop(
			Animated.sequence([
				Animated.timing(feedAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
				Animated.timing(feedAnim, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
			]),
		);
		bounce.start();
		return () => {
			anim.stop();
			bounce.stop();
		};
	}, [visible, scaleAnim, opacityAnim, feedAnim]);

	const feedStyle = {
		transform: [
			{ translateY: feedAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -scaleHeight(6)] }) },
			{ scale: feedAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) },
		],
	};

	return (
		<AppModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			{/* AppModal 이 시스템 바 아래까지 덮으므로 높은 카드가 가리지 않게 여백을 준다 */}
			<View style={[styles.modalOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
				<Animated.View style={[styles.modalContent, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
					<TouchableOpacity hitSlop={HitSlop} style={styles.modalCloseIcon} onPress={onClose} accessibilityRole="button" accessibilityLabel="닫기">
						<IconComponent type="materialIcons" name="close" size={scaledSize(24)} color={Colors.textSecondary} />
					</TouchableOpacity>

					<Text style={styles.modalTitle}>오늘의 출석</Text>

					{/* flexShrink 가 없으면 maxHeight 안에서 스크롤되지 않고 달력 아래가 잘린다 */}
					<ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
						{/* ── 오늘의 보상 : 먹이 ───────────────────────── */}
						<View style={[styles.rewardCard, isSpecial && styles.rewardCardSpecial]}>
							<View style={styles.rewardBadgeRow}>
								<IconComponent
									type="materialCommunityIcons"
									name={isSpecial ? 'star-four-points' : 'calendar-check'}
									size={scaledSize(12)}
									color={Colors.textInverse}
								/>
								<Text style={styles.rewardBadgeText}>{isSpecial ? `${streak}일 특별 출석` : '오늘의 출석 보상'}</Text>
							</View>

							<Animated.View style={[styles.rewardFeedBox, feedStyle]}>
								<FastImage source={isSpecial ? FEED_CRATE_IMAGE : FEED_IMAGE} style={styles.rewardFeedImage} resizeMode="contain" />
								<View style={styles.rewardCountChip}>
									<Text style={styles.rewardCountText}>{`+${todayFeeds}`}</Text>
								</View>
							</Animated.View>

							<Text style={styles.rewardTitle}>{isCheckedIn ? `펫 먹이 ${todayFeeds}개를 받았어요` : `출석하면 펫 먹이 ${todayFeeds}개`}</Text>
							<Text style={styles.rewardHint}>펫은 먹이를 먹어야 자라요. 먹이 주기는 '나의 활동'에서 해요</Text>

							<View style={styles.bagRow}>
								<IconComponent type="materialCommunityIcons" name="sack" size={scaledSize(14)} color={Colors.warningDark} />
								<Text style={styles.bagText}>{`가진 먹이 ${feeds}개`}</Text>
							</View>
						</View>

						{/* ── 특별 출석 트랙 : 7일마다 먹이를 더 준다 ───────── */}
						<View style={styles.trackCard}>
							<View style={styles.trackHead}>
								<Text style={styles.trackTitle}>{`${ATTENDANCE_FEED_CYCLE}일마다 특별 보상`}</Text>
								<Text style={styles.trackHint}>{restDays === ATTENDANCE_FEED_CYCLE && cycleAt === 0 ? '오늘부터 시작!' : `특별 출석까지 ${restDays}일`}</Text>
							</View>
							<View style={styles.trackRow}>
								{Array.from({ length: ATTENDANCE_FEED_CYCLE }).map((_, at) => {
									const filled = at < cycleAt;
									const last = at === ATTENDANCE_FEED_CYCLE - 1;
									return (
										<View key={at} style={[styles.trackDot, filled && styles.trackDotOn, last && styles.trackDotLast, last && filled && styles.trackDotLastOn]}>
											{last ? (
												<IconComponent
													type="materialCommunityIcons"
													name="treasure-chest"
													size={scaledSize(14)}
													color={filled ? Colors.textInverse : Colors.warningDark}
												/>
											) : (
												<Text style={[styles.trackDotText, filled && styles.trackDotTextOn]}>{at + 1}</Text>
											)}
										</View>
									);
								})}
							</View>
							<Text style={styles.trackNote}>7일 +3 · 14일 +4 · 21일 +5 · 28일 +6개를 한 번에 받아요</Text>
						</View>

						{/* ── 안내 캐릭터 ──────────────────────────────── */}
						<View style={styles.guideRow}>
							<MascotImage source={CHECK_IN_MASCOT} size={scaleWidth(60)} style={styles.guideImage} shadow={false} />
							<Text style={styles.guideText}>매일 접속하면 캐릭터가 출석 스탬프를 찍고 펫 먹이를 챙겨 줘요!</Text>
						</View>

						<View style={styles.calendarWrapper}>
							<Calendar
								markingType="custom"
								markedDates={checkedInDates}
								disableAllTouchEventsForDisabledDays={true}
								enableSwipeMonths={true}
								theme={{
									todayTextColor: Colors.error,
									todayBackgroundColor: Colors.errorBg,
									arrowColor: Colors.primary,
									textDayFontSize: scaledSize(13),
									textDayFontWeight: '600',
									textMonthFontSize: scaledSize(15),
									textMonthFontWeight: '800',
									textDayHeaderFontSize: scaledSize(11),
									textDayHeaderFontWeight: '700',
									calendarBackground: Colors.surface,
									textSectionTitleColor: Colors.textMuted,
									selectedDayBackgroundColor: Colors.primary,
									selectedDayTextColor: Colors.textInverse,
									dayTextColor: Colors.text,
									textDisabledColor: Colors.borderStrong,
								}}
								renderHeader={(date) => {
									const { year, month: localMonth } = DateUtils.getLocalDateParts(date);
									const month = localMonth.toString().padStart(2, '0');
									return <Text style={styles.calendarHeaderText}>{`${year}년 ${month}월`} 출석</Text>;
								}}
								style={styles.calendarContainer}
							/>
							<View style={styles.swipeHintRow}>
								<IconComponent type="materialIcons" name="swipe" size={scaledSize(13)} color={Colors.textMuted} />
								<Text style={styles.swipeHintText}>좌우 화살표 버튼을 눌러서 출석을 확인해보세요!</Text>
							</View>
						</View>

						{isCheckedIn && (
							<View style={styles.checkInCompleteRow}>
								<IconComponent type="materialCommunityIcons" name="party-popper" size={scaledSize(16)} color={Colors.primary} />
								<Text style={styles.checkInCompleteText}>오늘도 출석 완료!</Text>
							</View>
						)}
					</ScrollView>

					{/* 보상은 손으로 받는다 — 팝업이 뜨자마자 저절로 찍히면 무엇을 받았는지 남지 않는다 */}
					<PressableScale
						style={[styles.claimButton, isCheckedIn && styles.claimButtonDone]}
						onPress={isCheckedIn ? onClose : onClaim}
						scaleTo={0.97}
						accessibilityRole="button"
						accessibilityLabel={isCheckedIn ? '닫기' : '출석하고 보상받기'}>
						<IconComponent
							type="materialCommunityIcons"
							name={isCheckedIn ? 'check-decagram' : 'gift-open'}
							size={scaledSize(18)}
							color={isCheckedIn ? Colors.textSecondary : Colors.textInverse}
						/>
						<Text style={[styles.claimButtonText, isCheckedIn && styles.claimButtonTextDone]}>
							{isCheckedIn ? '확인' : `출석하고 보상받기 · 먹이 ${todayFeeds}개`}
						</Text>
					</PressableScale>

					{/*
					 * 출석 완료 연출 — 팝업 한 장을 통째로 덮는다.
					 * 스크롤 안에 두던 예전 방식은 달력까지 내려가야 보였고, 캐릭터 한 장만 떠서 심심했다.
					 * 이제 사자와 올빼미 펫이 함께 서고, 그 사이에 붉은 출석 도장(出席)이 내려앉는다.
					 */}
					{showStamp && (
						<View style={styles.stampOverlay} pointerEvents="none">
							<Animated.View style={[styles.stampStage, stampStyle]}>
								<View style={styles.stampDuoWrap}>
									<View style={styles.stampDuo}>
										<MascotImage source={mascot} size={scaleWidth(112)} motion="cheer" popIn shadow={false} />
										{/* 올빼미 펫 — 먹이를 한 번도 안 줬으면 아직 알이 없으므로 그리지 않는다 */}
										{!!petImage && (
											<MascotImage
												source={petImage}
												size={scaleWidth(94)}
												motion="float"
												popIn
												shadow={false}
												style={styles.stampPet}
												accessibilityLabel="나침반 올빼미 펫"
											/>
										)}
									</View>
										{/* 인장 — 두 캐릭터 발밑에 비스듬히 찍힌다. 낙관을 사 두면 글자와 색이 바뀐다 */}
									<View style={styles.stampSeal}>
										<Text allowFontScaling={false} style={styles.stampSealText}>
											出席
										</Text>
									</View>
								</View>
								<Text style={styles.stampText}>오늘 출석 완료!</Text>
								<Text style={styles.stampSub}>
									{isSpecial ? `${streak}일 특별 출석 · 먹이 ${todayFeeds}개` : streak > 1 ? `${streak}일 연속 출석 중` : '내일도 만나요'}
								</Text>
							</Animated.View>
						</View>
					)}
				</Animated.View>
			</View>
		</AppModal>
	);
};

export default CheckInModal;

const makeStyles = () =>
	StyleSheet.create({
		modalOverlay: {
			flex: 1,
			backgroundColor: Colors.scrim,
			justifyContent: 'center',
			alignItems: 'center',
		},
		modalContent: {
			width: '88%',
			maxWidth: MODAL_MAX_WIDTH,
			backgroundColor: Colors.surface,
			padding: Spacing.xl,
			// 다른 모달 카드와 같은 모달용 라운드
			borderRadius: Radius.xl,
			maxHeight: scaleHeight(700),
		},
		modalCloseIcon: {
			position: 'absolute',
			top: scaleHeight(16),
			right: scaleWidth(10),
			zIndex: 2,
			padding: Spacing.xs,
		},
		modalTitle: {
			fontSize: Typography.title,
			fontWeight: FontWeight.bold,
			color: Colors.text,
			marginBottom: SpacingV.lg,
			textAlign: 'center',
			marginTop: SpacingV.xs,
		},
		scroll: { width: '100%', flexShrink: 1 },
		scrollBody: { paddingBottom: SpacingV.xl, gap: SpacingV.md },

		// ── 오늘의 보상 ──
		rewardCard: {
			alignItems: 'center',
			gap: SpacingV.xs,
			paddingVertical: SpacingV.lg,
			paddingHorizontal: Spacing.lg,
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.warningPale,
			backgroundColor: Colors.warningBg,
		},
		// 특별 출석 날은 테두리와 바탕이 진해져 평소와 다른 날임이 바로 보인다
		rewardCardSpecial: { borderColor: Colors.warningBright, backgroundColor: Colors.warningTint },
		rewardBadgeRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.xxs,
			paddingHorizontal: Spacing.md,
			paddingVertical: SpacingV.xxs,
			borderRadius: Radius.pill,
			backgroundColor: Colors.warningDark,
		},
		rewardBadgeText: { fontSize: Typography.micro, fontWeight: FontWeight.heavy, color: Colors.textInverse },
		rewardFeedBox: { marginTop: SpacingV.sm, alignItems: 'center', justifyContent: 'center' },
		rewardFeedImage: { width: scaleWidth(88), height: scaleWidth(88) },
		rewardCountChip: {
			position: 'absolute',
			right: -scaleWidth(10),
			bottom: 0,
			minWidth: scaleWidth(38),
			paddingHorizontal: Spacing.sm,
			paddingVertical: SpacingV.xxs,
			borderRadius: Radius.pill,
			borderWidth: 2,
			borderColor: Colors.surface,
			backgroundColor: Colors.accentOrange,
			alignItems: 'center',
		},
		rewardCountText: { fontSize: Typography.footnote, fontWeight: FontWeight.heavy, color: Colors.textInverse },
		rewardTitle: { marginTop: SpacingV.sm, fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: Colors.textStrong, textAlign: 'center' },
		rewardHint: { fontSize: Typography.caption, color: Colors.textSecondary, textAlign: 'center', lineHeight: scaledSize(17) },
		bagRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.xs,
			marginTop: SpacingV.sm,
			paddingHorizontal: Spacing.md,
			paddingVertical: SpacingV.xxs,
			borderRadius: Radius.pill,
			backgroundColor: Colors.surface,
		},
		bagText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.warningDeep },

		// ── 7일 트랙 ──
		trackCard: {
			gap: SpacingV.sm,
			padding: Spacing.lg,
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.border,
			backgroundColor: Colors.surface,
		},
		trackHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
		trackTitle: { fontSize: Typography.footnote, fontWeight: FontWeight.heavy, color: Colors.textStrong },
		trackHint: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.primary },
		trackRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.xxs },
		trackDot: {
			flex: 1,
			height: scaleHeight(30),
			borderRadius: Radius.sm,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.surfaceAlt,
		},
		trackDotOn: { backgroundColor: Colors.primary },
		trackDotLast: { backgroundColor: Colors.warningSoft },
		trackDotLastOn: { backgroundColor: Colors.warningDark },
		trackDotText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textMuted },
		trackDotTextOn: { color: Colors.textInverse },
		trackNote: { fontSize: Typography.micro, color: Colors.textMuted, textAlign: 'center' },

		// ── 안내 캐릭터 ──
		guideRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
		guideImage: { width: scaleWidth(60), height: scaleWidth(60) },
		guideText: { flex: 1, fontSize: Typography.footnote, color: Colors.text, lineHeight: scaledSize(19), fontWeight: FontWeight.medium },

		// ── 출석 완료 연출 ──
		// 팝업 카드 전체를 덮는다 — 스크롤 위치와 상관없이 같은 자리에서 같은 크기로 보인다
		stampOverlay: {
			...StyleSheet.absoluteFillObject,
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.xl,
			backgroundColor: Colors.warningBg,
		},
		stampStage: { alignItems: 'center', gap: SpacingV.xs, paddingHorizontal: Spacing.xl },
		// 인장이 캐릭터 발밑으로 삐져나와야 해서 한 겹 더 감싼다 (여기 기준으로 절대배치한다)
		stampDuoWrap: { alignItems: 'center' },
		// 사자와 올빼미가 발밑을 맞춰 나란히 선다 — 올빼미를 살짝 겹쳐 한 무리로 보이게 한다
		stampDuo: { flexDirection: 'row', alignItems: 'flex-end' },
		stampPet: { marginLeft: -scaleWidth(16), marginBottom: scaleHeight(6) },
		/** 붉은 인장 — 두 캐릭터 발밑에 비스듬히 찍힌다 */
		stampSeal: {
			position: 'absolute',
			bottom: -scaleHeight(6),
			alignSelf: 'center',
			width: scaleWidth(62),
			height: scaleWidth(62),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.md,
			borderWidth: scaleWidth(3),
			borderColor: Colors.error,
			backgroundColor: Colors.errorBg,
			transform: [{ rotate: '-11deg' }],
		},
		// 명조 계열 한자 서체 — 인장에 새긴 글씨라 본문 고딕과 확실히 갈라 놓는다
		stampSealText: {
			...getHanjaTextStyle(),
			fontSize: scaledSize(22),
			lineHeight: scaledSize(26),
			color: Colors.error,
			textAlign: 'center',
			includeFontPadding: false,
		},
		// 축하 문구 — 예전 subtitle 크기·그림자 대신 크고 굵게, 자간을 벌려 현판처럼 읽힌다
		stampText: {
			marginTop: SpacingV.md,
			fontSize: Typography.h2,
			lineHeight: scaledSize(32),
			fontWeight: FontWeight.heavy,
			letterSpacing: scaledSize(-0.5),
			color: Colors.warningDeep,
			textAlign: 'center',
		},
		stampSub: {
			fontSize: Typography.footnote,
			fontWeight: FontWeight.bold,
			letterSpacing: scaledSize(0.6),
			color: Colors.textSecondary,
			textAlign: 'center',
		},
		calendarWrapper: { width: '100%' },
		calendarContainer: {
			width: '100%',
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.border,
			paddingVertical: SpacingV.sm,
			paddingHorizontal: Spacing.xs,
			overflow: 'hidden',
			backgroundColor: Colors.surface,
		},
		swipeHintRow: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: Spacing.xs,
			marginTop: SpacingV.sm,
		},
		swipeHintText: {
			fontSize: Typography.caption,
			color: Colors.textMuted,
			fontWeight: FontWeight.semibold,
		},
		calendarHeaderText: {
			fontSize: Typography.callout,
			fontWeight: FontWeight.heavy,
			color: Colors.text,
			textAlign: 'center',
			marginVertical: SpacingV.md,
		},
		// 아이콘 + 글씨 한 줄 — 이모지를 양쪽에 붙이면 기기마다 줄 높이가 흔들린다
		// 팝업 맨 아래 고정 버튼 — 스크롤 밖이라 달력을 내려 봐도 늘 같은 자리에 있다
		claimButton: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: Spacing.xs,
			marginTop: SpacingV.md,
			height: scaleHeight(52),
			borderRadius: Radius.pill,
			backgroundColor: Colors.primary,
		},
		claimButtonDone: { backgroundColor: Colors.surfaceAlt },
		claimButtonText: { fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: Colors.textInverse },
		claimButtonTextDone: { color: Colors.textSecondary },
		checkInCompleteRow: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: Spacing.xs,
		},
		checkInCompleteText: {
			fontSize: Typography.body,
			color: Colors.primary,
			fontWeight: FontWeight.bold,
			textAlign: 'center',
		},
	});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
