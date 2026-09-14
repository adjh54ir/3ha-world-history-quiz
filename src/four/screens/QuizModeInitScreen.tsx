import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@/src/four/navigation/compat';
import { CONTENT_MAX_WIDTH, scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils/DementionUtils';
import { Paths } from '@/src/four/navigation/conf/Paths';
import { SafeAreaView } from 'react-native-safe-area-context';
import IconComponent from './common/atomic/IconComponent';
import MascotImage from '@/src/screens/common/atomic/MascotImage';
import PetAvatar from '@/src/screens/life/common/PetAvatar';
import { PetPerch, StudyRoomBackdrop, TitlePlaque } from '@/src/screens/life/common/LifeDecor';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import { useAttendancePet, usePet } from '@/src/hooks/useLife';
import BottomHomeButton from './common/BottomHomeButton';
import Colors, { onSurface, withAlpha } from '@/src/four/const/ConstColors';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';
import { Typography, FontWeight, Spacing, SpacingV, Radius } from '@/src/four/const/ConstDesign';


/**
 * 퀴즈 모드 네 갈래.
 *
 * 색은 `ink`(글씨·아이콘)와 `tint`(면) 두 짝으로 쓴다. 예전에는 원색 하나를 칩 면에 통째로 깔아
 * 네 칸이 서로 소리치듯 튀었다. 면은 옅게 깔고 색은 글씨에만 남겨 카드끼리 같은 무게로 읽히게 한다.
 *
 * 네 색은 난이도 램프(민트 → 파랑 → 앰버 → 진한 주황)와 같은 계단을 쓴다 — 한 앱에서 색 체계가 둘이면
 * 같은 민트가 화면마다 다른 뜻을 갖는다.
 */
const makeModes = () => [
	{
		key: 'meaning',
		label: '뜻 맞추기',
		desc: '한자어를 보고 올바른 뜻을 고르세요',
		icon: 'lightbulb',
		type: 'fontAwesome6',
		ink: Colors.tealDark,
		tint: Colors.tealSoft,
	},
	{
		key: 'proverb',
		label: '한자어 찾기',
		desc: '뜻을 보고 알맞은 한자어를 고르세요',
		icon: 'quote-left',
		type: 'fontAwesome6',
		ink: Colors.primaryDark,
		tint: Colors.primarySoft,
	},
	{
		key: 'blank',
		label: '빈 칸 채우기',
		desc: '한자어의 빠진 글자를 채워보세요',
		icon: 'pen',
		type: 'fontAwesome6',
		ink: Colors.warningDark,
		tint: Colors.warningSoft,
	},
	{
		key: 'example',
		label: '예문 빈칸',
		desc: '예문 속 빈칸에 들어갈 한자어를 고르세요',
		icon: 'align-left',
		type: 'fontAwesome6',
		ink: Colors.accentOrangeDeep,
		tint: Colors.accentOrangeSoft,
	},
];

/** 테마가 바뀌면 팔레트가 덮어써지므로 이 표도 다시 만든다 (ThemeRegistry 규약) */
let MODES = makeModes();
registerThemedStyles(() => {
	MODES = makeModes();
});

import CharacterGuide, { useCharacterGuideOnce, CharacterGuideButton } from './common/CharacterGuide';

const QuizModeInitScreen = () => {
	const navigation = useNavigation();
	const [accordionOpen, setAccordionOpen] = useState(false);
	/** 홈과 같은 캐릭터·펫을 세운다 — 키우던 판다와 출석 수호신이 퀴즈 앞까지 따라온다 */
	const pet = usePet();
	const attendancePet = useAttendancePet();
	const guide = useCharacterGuideOnce('quiz-mode-init');

	// 진입 애니메이션 (페이드 + 슬라이드 업) — 언마운트 시 정리
	const enterAnim = useRef(new Animated.Value(0)).current;

	const scrollRef = useRef<ScrollView>(null);

	// 화면에 다시 들어오면 펼쳐 둔 안내를 접고 맨 위에서 시작한다
	useFocusEffect(
		useCallback(() => {
			setAccordionOpen(false);
			scrollRef.current?.scrollTo({ y: 0, animated: false });
		}, []),
	);

	useEffect(() => {
		const animation = Animated.timing(enterAnim, {
			toValue: 1,
			duration: 420,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: true,
		});
		animation.start();
		return () => {
			animation.stop();
			enterAnim.stopAnimation();
		};
	}, [enterAnim]);

	const handleSelectMode = (mode: string) => {
		// @ts-ignore
		navigation.navigate(Paths.QUIZ_MODE, { mode }); // mode: 'meaning' | 'proverb' | 'fill-blank'
	};

	return (
		<SafeAreaView style={styles.main} edges={['left', 'right', 'bottom']}>
			<View style={styles.container}>
				<Animated.View
					style={{
						flex: 1,
						width: '100%',
						opacity: enterAnim,
						transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(18), 0] }) }],
					}}>
				<ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
					{/* 시작 패널 — 내 캐릭터와 펫이 서 있는 게임 HUD 한 장 */}
					<View style={styles.hero}>
						<LinearGradient
							pointerEvents="none"
							colors={[Colors.primary, Colors.primaryDeep]}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
							style={styles.heroBg}
						/>
						<View style={styles.heroTopRow}>
							<View style={styles.heroLevelChip}>
								<IconComponent type="materialCommunityIcons" name="shield-star" size={scaledSize(13)} color={Colors.textInverse} />
								<Text style={styles.heroLevelText} numberOfLines={1}>{`Lv.${pet.level} ${pet.stage.label}`}</Text>
							</View>
							<CharacterGuideButton onPress={guide.open} size={scaledSize(20)} color={Colors.textInverse} />
						</View>

						{/* 캐릭터는 판 한가운데 고정, 펫은 그 오른쪽에 겹쳐 세운다 — 홈 히어로와 같은 배치 */}
						<View style={styles.heroDuo}>
							{/* 글방 — 사 둔 사람에게만 캐릭터 뒤에 깔린다 (홈·통계와 같은 꾸미기) */}
							<StudyRoomBackdrop width={scaleWidth(268)} height={scaleWidth(116)} />
							<PetAvatar size={scaleWidth(124)} plate={false} />
							{!!attendancePet.image && (
								<View style={styles.heroPetSlot} pointerEvents="none">
									<View style={styles.heroPetPerch}>
										<PetPerch size={scaleWidth(62)} />
									</View>
									<MascotImage source={attendancePet.image} size={scaleWidth(68)} motion="float" shadow={false} />
								</View>
							)}
						</View>

						{/* 칭호 — 사 둔 사람에게만 캐릭터 아래에 현판이 붙는다 */}
						<TitlePlaque onBrand />

						{/* 2단계(난이도 고르기) 화면과 같은 칩 — 두 화면이 한 흐름으로 읽힌다 */}
						<View style={styles.heroStepChip}>
							<IconComponent type="materialCommunityIcons" name="flag-checkered" size={scaledSize(12)} color={Colors.textInverse} />
							<Text style={styles.heroStepText}>STEP 1</Text>
						</View>
						<Text style={styles.heroTitle}>퀴즈 준비됐나요?</Text>
						<Text style={styles.heroSub}>도전할 퀴즈 모드를 골라 주세요</Text>
					</View>

					<View style={styles.gridWrap}>
						{MODES.map((mode, at) => (
							<PressableScale
								key={mode.key}
								style={[styles.modeCardFull, { borderColor: withAlpha(mode.ink, 0.22) }]}
								scaleTo={0.98}
								accessibilityRole="button"
								accessibilityLabel={mode.label}
								onPress={() => handleSelectMode(mode.key)}>
								<View style={[styles.modeIconChipFull, { backgroundColor: mode.tint }]}>
									<IconComponent type={mode.type} name={mode.icon} size={scaledSize(24)} color={mode.ink} />
								</View>
								<View style={styles.modeTextWrap}>
									{/* 몇 번째 모드인지 — 스테이지 번호처럼 제목 위에 작은 칩으로 올린다 */}
									<View style={[styles.modeStepChip, { backgroundColor: mode.tint }]}>
										<Text style={[styles.modeStepText, { color: mode.ink }]}>{`MODE ${at + 1}`}</Text>
									</View>
									<Text style={styles.modeLabelFull} numberOfLines={1}>
										{mode.label}
									</Text>
									<Text style={styles.modeDescFull} numberOfLines={2}>
										{mode.desc}
									</Text>
								</View>
								<View style={[styles.modeGo, { backgroundColor: mode.tint }]}>
									<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(20)} color={mode.ink} />
								</View>
							</PressableScale>
						))}
					</View>
					{/* 아코디언 안내 */}
					<TouchableOpacity
						style={styles.accordionHeader}
						activeOpacity={0.7}
						onPress={() => setAccordionOpen((prev) => !prev)}>
						<View style={styles.accordionHeaderLeft}>
							<IconComponent type="materialCommunityIcons" name="help-circle-outline" size={scaledSize(18)} color={Colors.primary} />
							<Text style={styles.accordionHeaderText}>틀린 문제는 어떻게 다시 풀 수 있나요?</Text>
						</View>
						<IconComponent
							type="MaterialIcons"
							name={accordionOpen ? 'expand-less' : 'expand-more'}
							size={scaledSize(20)}
							color={Colors.text}
						/>
					</TouchableOpacity>

					{accordionOpen && (
						<View style={styles.accordionContent}>
							<View style={styles.accordionDescBox}>
								<View style={styles.accordionRow}>
									<IconComponent type="FontAwesome5" name="book" size={scaledSize(16)} color={Colors.accentOrange} />
									<Text style={styles.accordionText}>틀린 문제는 오답 복습에서 다시 확인할 수 있습니다.</Text>
								</View>

								<View style={styles.accordionRow}>
									<IconComponent type="MaterialCommunityIcons" name="reload" size={scaledSize(18)} color={Colors.primary} />
									<Text style={[styles.accordionText, styles.warningText]}>
										다시 풀기는 설정 탭에서 '퀴즈 다시 풀기'에서 할 수 있지만, 이전 기록이 초기화되니 꼭 참고하세요!
									</Text>
								</View>
							</View>
							<View style={styles.accordionButtonsRow}>
								<TouchableOpacity
									style={[styles.accordionButton, { backgroundColor: Colors.accentOrange }]}
									// @ts-ignore
									onPress={() => navigation.navigate(Paths.QUIZ_WRONG)}>
									<IconComponent type="FontAwesome5" name="book" size={scaledSize(16)} color={onSurface(Colors.accentOrange)} />
									<Text style={[styles.accordionButtonText, { color: onSurface(Colors.accentOrange) }]}>오답 복습</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={[styles.accordionButton, { backgroundColor: Colors.secondarySurface }]}
									// @ts-ignore
									onPress={() => navigation.navigate(Paths.MAIN_TAB, { screen: Paths.SETTING })}>
									<IconComponent type="MaterialCommunityIcons" name="reload" size={scaledSize(18)} color={Colors.textInverse} />
									<Text style={styles.accordionButtonText}>다시 풀기</Text>
								</TouchableOpacity>
							</View>
						</View>
					)}
				</ScrollView>
				</Animated.View>
			</View>
			<BottomHomeButton />
		
	<CharacterGuide
		visible={guide.visible}
		onClose={guide.close}
		lines={[
			'퀴즈를 풀기 전에 어떤 방식으로 풀지 고르는 화면입니다.',
			'모드 카드를 누르면 그 방식으로 바로 문제가 시작됩니다.',
			'아래 안내에서 오답 복습으로도 바로 갈 수 있습니다!',
		]}
		title="퀴즈 시작, 이렇게 합니다"
	/>
</SafeAreaView>
	);
};

const makeStyles = () => StyleSheet.create({
	main: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	container: {
		flex: 1,
		backgroundColor: Colors.background,
		// 좌우 여백은 scrollContent 한 곳에서만 준다(8+16+12=36 으로 세 겹 겹쳐 카드가 좁아졌다)
		alignItems: 'center', // 가로 중앙 정렬
	},
	scrollContent: {
		// 태블릿: 본문을 가운데 한 기둥으로 묶는다 (CharacterGuide 와 같은 폭)
		width: '100%',
		maxWidth: CONTENT_MAX_WIDTH,
		alignSelf: 'center',
		flexGrow: 1,
		justifyContent: 'center', // 중앙 정렬 (세로)
		alignItems: 'center', // 중앙 정렬 (가로)
		paddingHorizontal: Spacing.lg,
		paddingTop: SpacingV.sm,
		paddingBottom: SpacingV.xl,
	},
	progressContainer: {
		marginBottom: SpacingV.xxxl,
		width: '100%',
	},
	progressBarBackground: {
		width: '100%',
		height: scaleHeight(10),
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.xs,
	},
	progressBarFill: {
		width: '50%',
		height: '100%',
		backgroundColor: Colors.secondarySurface,
		borderRadius: Radius.xs,
	},
	title: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		textAlign: 'center',
		marginBottom: scaleHeight(52),
	},
	gridWrap: {
		width: '100%',
		rowGap: SpacingV.md,
		marginBottom: SpacingV.lg,
	},
	// 왼쪽 색 띠 없이 테두리 색만 모드 색으로 물들인다 — 좌우 안쪽 여백이 같은 값이 된다
	modeCardFull: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.lg,
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.lg,
		borderWidth: 1,
		borderColor: Colors.surfaceMuted,
	},
	modeIconChipFull: {
		width: scaleWidth(52),
		height: scaleWidth(52),
		borderRadius: Radius.lg,
		justifyContent: 'center',
		alignItems: 'center',
	},
	// 스테이지 번호 칩 — 제목 위에 얹어 "몇 번째 모드"가 먼저 읽히게 한다
	modeStepChip: {
		alignSelf: 'flex-start',
		paddingHorizontal: Spacing.sm,
		height: scaleHeight(18),
		justifyContent: 'center',
		borderRadius: Radius.xs,
		marginBottom: SpacingV.xs,
	},
	modeStepText: { fontSize: Typography.micro, fontWeight: FontWeight.heavy, letterSpacing: scaledSize(0.6) },
	modeGo: {
		width: scaleWidth(28),
		height: scaleWidth(28),
		borderRadius: scaleWidth(14),
		alignItems: 'center',
		justifyContent: 'center',
	},
	modeTextWrap: { flex: 1 },
	modeLabelFull: {
		color: Colors.textStrong,
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.heavy,
		marginBottom: SpacingV.xxs,
	},
	modeDescFull: {
		color: Colors.textSecondary,
		fontSize: Typography.bodySm,
		lineHeight: scaledSize(17),
	},
	gridButtonHalf: {
		width: '46%',
		aspectRatio: 1,
		borderRadius: Radius.lg,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
	},

	iconTextRow: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		gap: SpacingV.md,
	},
	modeIconChip: {
		width: scaleWidth(54),
		height: scaleWidth(54),
		borderRadius: scaleWidth(27),
		backgroundColor: Colors.darkCardBorder,
		justifyContent: 'center',
		alignItems: 'center',
	},
	modeLabel: {
		color: Colors.textInverse,
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		textAlign: 'center',
		lineHeight: scaledSize(24),
	},
	inner: {
		flex: 1,
		justifyContent: 'flex-start',
		alignItems: 'center',
		paddingHorizontal: Spacing.xl,
		paddingBottom: SpacingV.xl, // 아래쪽 여유는 유지
	},
	headerFixed: {
		width: '100%',
		maxWidth: '100%', // ✅ 적용 필요
		backgroundColor: Colors.surface,
		padding: Spacing.lg,
		paddingHorizontal: Spacing.xxxxl,
		marginBottom: SpacingV.xxxl,
		borderRadius: Radius.lg,
		marginTop: SpacingV.md,
		borderWidth: 1,
		borderColor: Colors.border,
	},

	progressStepText: {
		fontSize: Typography.body,
		color: Colors.text,
		fontWeight: FontWeight.semibold,
		marginBottom: SpacingV.sm,
	},
	titleWrap: {
		marginBottom: SpacingV.xl,
		alignItems: 'center',
	},
	titleLine: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		textAlign: 'center',
		marginBottom: SpacingV.sm,
	},
	/**
	 * 시작 패널 — 캐릭터·펫·인사말을 한 판에 담는다.
	 * 안쪽 여백을 사방 같은 값으로 두고 요소 사이만 gap 으로 벌린다 (여백이 겹치면 판이 한쪽으로 쏠려 보인다).
	 */
	hero: {
		width: '100%',
		alignItems: 'center',
		gap: SpacingV.sm,
		padding: Spacing.xl,
		marginTop: SpacingV.sm,
		marginBottom: SpacingV.xl,
		borderRadius: Radius.xl,
		overflow: 'hidden',
		backgroundColor: Colors.primary,
	},
	heroBg: { ...StyleSheet.absoluteFillObject },
	heroTopRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	heroLevelChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: scaleWidth(4),
		paddingHorizontal: Spacing.md,
		height: scaleHeight(28),
		borderRadius: Radius.xl,
		backgroundColor: 'rgba(255,255,255,0.18)',
	},
	heroLevelText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textInverse },
	// 펫이 있든 없든 캐릭터가 판 한가운데 그대로 있어야 한다 — 같은 줄에 세우면 캐릭터가 왼쪽으로 밀린다
	// 발밑을 맞춘다 — 가운데 정렬이면 글방 배경(116)이 캐릭터(124) 한가운데 떠서 바닥 띠가 발보다 위에 깔린다
	heroDuo: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'flex-end' },
	// 캐릭터(124) 반지름 62 + 여백 → 중앙 기준 오른쪽에 앉힌다
	heroPetSlot: { position: 'absolute', left: '50%', bottom: 0, marginLeft: scaleWidth(66), width: scaleWidth(68) },
	/** 청룡 좌대 — 펫보다 먼저 그려 발밑으로 들어간다 (안 샀으면 아무것도 안 그린다) */
	heroPetPerch: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
	heroStepChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: scaleWidth(4),
		marginTop: SpacingV.xs,
		paddingHorizontal: Spacing.md,
		height: scaleHeight(24),
		borderRadius: Radius.xl,
		backgroundColor: 'rgba(0,0,0,0.18)',
	},
	heroStepText: { fontSize: Typography.micro, fontWeight: FontWeight.heavy, color: Colors.textInverse, letterSpacing: scaledSize(1) },
	heroTitle: { fontSize: Typography.h3, fontWeight: FontWeight.heavy, color: Colors.textInverse, textAlign: 'center' },
	heroSub: { fontSize: Typography.bodySm, color: Colors.textInverse, opacity: 0.85, textAlign: 'center' },
	mascotCard: {
		width: '100%',
		alignItems: 'center',
		padding: SpacingV.lg,
		marginBottom: SpacingV.xl,
		borderRadius: Radius.lg,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	accordionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: '100%',
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.lg,
		borderRadius: Radius.md,
		backgroundColor: Colors.background,
		borderWidth: 1,
		borderColor: Colors.border,
		marginBottom: SpacingV.md,
	},
	accordionHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	accordionHeaderText: {
		flexShrink: 1,
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
		color: Colors.text,
	},
	accordionContent: {
		width: '100%',
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.surfaceAlt,
		borderRadius: Radius.md,
		padding: Spacing.lg,
		marginBottom: SpacingV.xl,
	},
	accordionButtonsRow: {
		flexDirection: 'row',
		gap: Spacing.md,
		justifyContent: 'center',
		alignItems: 'center',
	},
	accordionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.lg,
		borderRadius: Radius.xl,
	},
	accordionButtonText: {
		flexShrink: 1,
		color: Colors.textInverse,
		fontSize: Typography.body,
		fontWeight: FontWeight.semibold,
	},
	accordionDescBox: {
		width: '100%',
		gap: SpacingV.sm,
		marginBottom: SpacingV.md,
	},
	accordionRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: Spacing.sm,
	},
	accordionText: {
		flex: 1,
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
		lineHeight: scaledSize(20),
	},
	warningText: {
		color: Colors.errorDark,
		fontWeight: FontWeight.semibold,
	},
	bottomExitWrapper: {
		width: '100%',
		alignItems: 'center',
		paddingVertical: SpacingV.xs,
		borderColor: Colors.surfaceAlt,
	},
	homeButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.secondarySurface,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.xxxl,
		borderRadius: scaleWidth(30),
	},
	buttonText: {
		color: Colors.textInverse,
		fontSize: Typography.body,
		fontWeight: FontWeight.bold,
	},
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});

export default QuizModeInitScreen;
