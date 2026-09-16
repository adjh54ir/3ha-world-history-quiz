import React from 'react';
import { Animated, Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import LifeHeader from './common/LifeHeader';
import LifeCharacterGuide, { LifeGuideButton, useCharacterGuideOnce } from './common/LifeCharacterGuide';
import EmptyState from './common/EmptyState';
import PetAvatar from './common/PetAvatar';
import BadgeMedal, { BadgeRarityChip } from './common/BadgeMedal';
import BadgeDetailModal, { type BadgeDetail } from './modal/BadgeDetailModal';
import MascotImage from '@/src/screens/common/atomic/MascotImage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ATTENDANCE_PET_IMAGES, PET_STAGE_IMAGES } from '@/src/const/data/life/ConstPetImages';
import ProgressBar from './common/ProgressBar';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useFeedAttendancePet, useLife, usePet } from '@/src/hooks/useLife';
import { useScreenEnter } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { ATTENDANCE_PET_STAGES, BADGES, PET_STAGES } from '@/src/const/data/life/ConstLifeRewards';
import { playPop } from '@/src/utils/SoundUtils';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

/**
 * 캐릭터가 서는 자리 높이 — 글방 배경과 캐릭터 줄이 같은 값을 쓴다.
 * 따로 두면 배경이 줄 밖으로 삐져나와 이름·게이지 뒤에 바닥 띠가 깔린다.
 */
/**
 * 나의 활동 탭 — "내가 가진 것" 을 위에서 아래로 훑는 화면.
 * -------------------------------------------------
 * 내 보유 → 캐릭터 → 펫 → 뱃지 순서다.
 *
 * 여기서 내린 것들과 그 이유
 * - 챌린지 기록·주간 출석 : 통계 탭과 같은 숫자다. 두 곳에서 관리하면 한쪽이 먼저 낡는다.
 * - 설정 톱니 : 설정 탭이 따로 있다. 그 자리는 화면 사용법(물음표)에 넘겼다.
 */
const LifeProfileScreen = () => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const guide = useCharacterGuideOnce('life-profile');
	const life = useLife();
	const pet = usePet();
	// 먹이 주기 규칙은 홈 출석 팝업과 공유한다 (useFeedAttendancePet)
	const { canFeed, grownUp, feed: onFeed, ...attendancePet } = useFeedAttendancePet();
	// 보호권 카드는 내렸지만 가진 장수는 여전히 '가방 속 물건' 에 포함된다
	const enterStyle = useScreenEnter();
	/** 상세로 펼쳐 둔 뱃지 — 뱃지 칸을 누르면 채워진다 (못 딴 뱃지도 조건을 볼 수 있다) */
	const [badgeDetail, setBadgeDetail] = React.useState<BadgeDetail | null>(null);
	/** 뱃지 전체 목록을 펼쳤는지 — 접혀 있을 때는 진열장과 다음 목표 세 개만 보인다 */
	const [showAllBadges, setShowAllBadges] = React.useState(false);
	/** 성장 현황을 보여 주는 보유 칸 세 개 */
	const vault = [
		{ label: '펫 먹이', value: `${life.petFeeds ?? 0}`, unit: '개', icon: 'food-drumstick' },
		{ label: '출석', value: `${life.attendance.length}`, unit: '일', icon: 'calendar-check' },
		{ label: '뱃지', value: `${life.badges.length}`, unit: `/${BADGES.length}`, icon: 'shield-star' },
	];

	const earnedMap = new Map(life.badges.map((item) => [item.id, item.at]));
	/** 딴 뱃지는 진열장으로, 못 딴 뱃지는 목표로 나눈다 — 스무 칸을 한 판에 늘어놓으면 어디를 볼지 모른다 */
	const earnedBadges = BADGES.filter((badge) => earnedMap.has(badge.id));
	const lockedBadges = BADGES.filter((badge) => !earnedMap.has(badge.id));
	/** 다음 목표 — 못 딴 뱃지 중 앞의 세 개만. 목록 순서가 쉬운 것부터라 그대로 쓴다 */
	const nextBadges = lockedBadges.slice(0, 3);
	const openBadge = (badge: (typeof BADGES)[number]) => {
		playPop();
		setBadgeDetail({ badge, at: earnedMap.get(badge.id) });
	};

	return (
		<SafeAreaView style={styles.safe} edges={['left', 'right']}>
			{/* 톱니를 내리고 그 자리에 화면 사용법(물음표)을 둔다 — 설정은 설정 탭으로 들어간다 */}
			<LifeHeader
				title="나의 활동"
				subtitle="학습 기록과 성장 현황"
				right={
					<View style={styles.headerRight}>
						<LifeGuideButton onPress={guide.open} />
					</View>
				}
			/>
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>
				<Animated.View style={[styles.sections, enterStyle]}>
					{/* 내 보유 — 밝은 카드 대신 진한 판 + 위쪽 광택으로 성장 현황을 모았다. */}
					<View style={styles.vaultPanel}>
						<LinearGradient
							pointerEvents="none"
							colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.02)']}
							start={{ x: 0.5, y: 0 }}
							end={{ x: 0.5, y: 1 }}
							style={styles.vaultGlow}
						/>
						<View style={styles.vaultHead}>
							<Text style={styles.vaultTitle}>내 보유</Text>
						<Text style={styles.vaultHint}>학습하며 모아 온 보상</Text>
						</View>

						<View style={styles.vaultRow}>
							{vault.map((slot) => (
								<View key={slot.label} style={styles.vaultCell}>
									<IconComponent type="materialCommunityIcons" name={slot.icon} size={18} color={Colors.brandBlockMuted} />
									<Text style={styles.vaultValue}>
										{slot.value}
										<Text style={styles.vaultUnit}>{slot.unit}</Text>
									</Text>
									<Text style={styles.vaultLabel} numberOfLines={1}>
										{slot.label}
									</Text>
								</View>
							))}
						</View>

				</View>

				<View style={styles.petCard}>
					<View style={styles.petRoom}>
						<PetAvatar size={scaleWidth(140)} />
					</View>
					<Text style={styles.petName}>{pet.petName}</Text>
						<Text style={styles.petStage}>
							Lv.{pet.level} {pet.stage.label} · {pet.exp.toLocaleString()}EXP
						</Text>
						<View style={styles.petBar}>
							<ProgressBar ratio={pet.ratio} />
						</View>
						<Text style={styles.petHint}>{pet.next ? `${(pet.next.minExp - pet.exp).toLocaleString()}EXP 더 모으면 ${pet.next.label}로 자라요` : `최고 단계인 ${pet.stage.label}이 됐어요`}</Text>
						<View style={styles.stageRow}>
							{PET_STAGES.map((stage, at) => (
								<View key={stage.label} style={[styles.stageDot, at < pet.level && styles.stageDotOn, at === pet.level - 1 && styles.stageDotNow]}>
									<Image source={PET_STAGE_IMAGES[at]} style={[styles.stageImage, at >= pet.level && styles.stageImageLocked]} contentFit="contain" />
								</View>
							))}
						</View>
					</View>

					{/*
					 * 펫 — 나침반 올빼미는 "먹이를 준 수" 로만 자란다. 출석은 그 먹이가 들어오는 경로 중 하나일 뿐이다.
					 * 그래서 카드 제목도 '출석' 이 아니라 '펫' 이고, 눈금도 날짜가 아니라 먹이로 센다.
					 * 주간 출석 줄은 통계 탭과 겹쳐 여기서 내렸다.
					 */}
					<View style={styles.card}>
						<View style={styles.cardHead}>
							<Text style={styles.cardTitle}>펫</Text>
							<Text style={styles.cardMeta}>
								<Text style={styles.cardMetaStrong}>{`먹이 ${attendancePet.fed}개`}</Text> {`줬어요 · 가진 먹이 ${attendancePet.feeds}개`}
							</Text>
						</View>
						<View style={styles.attendancePetPanel}>
							<View style={styles.attendancePetStage}>
								{/*
									 * 먹이를 한 번도 주지 않았으면 알조차 아직 없다 — 첫 단계 그림을 흐리게 깔면
									 * "이미 알을 받았다" 로 읽혀 먹이를 줄 이유가 사라진다. 빈 둥지만 둔다.
									 */}
								{attendancePet.image ? (
									<MascotImage
										source={attendancePet.image}
										size={scaleWidth(86)}
										motion="float"
										shadow={false}
										accessibilityLabel={`${attendancePet.stage?.label}, 먹이 ${attendancePet.fed}개 줬어요`}
									/>
								) : (
									<View style={styles.attendancePetEmpty} accessibilityLabel="아직 먹이를 주지 않아 알이 없어요">
										<IconComponent type="materialCommunityIcons" name="egg-outline" size={scaleWidth(34)} color={Colors.textMuted} />
										<Text style={styles.attendancePetEmptyText}>먹이 1개</Text>
									</View>
								)}
							</View>
							<View style={styles.attendancePetBody}>
								<Text style={styles.attendancePetEyebrow}>나침반 올빼미 · 먹이로 자라요</Text>
								<Text style={styles.attendancePetName}>{attendancePet.stage?.label ?? '아직 알이 없어요'}</Text>
								<Text style={styles.attendancePetHint}>
									{attendancePet.next
										? `${attendancePet.next.label}까지 먹이 ${attendancePet.next.minFeeds - attendancePet.fed}개 남았어요`
										: '먹이 35개를 다 준 최종 진화 황금 세계올빼미예요'}
								</Text>
								<ProgressBar ratio={attendancePet.ratio} />
								{/* 먹이를 줘야 단계가 오른다 — 버튼을 성장 칸 바로 아래에 붙여 원인과 결과가 한눈에 보이게 한다 */}
								<PressableScale
									style={[styles.feedButton, !canFeed && styles.feedButtonOff]}
									onPress={onFeed}
									scaleTo={0.96}
									accessibilityRole="button"
									accessibilityLabel="먹이 주기">
									<IconComponent
										type="materialCommunityIcons"
										name={grownUp ? 'party-popper' : 'food-drumstick'}
										size={16}
										color={canFeed ? Colors.textInverse : Colors.textMuted}
									/>
									<Text style={[styles.feedButtonText, !canFeed && styles.feedButtonTextOff]}>
										{grownUp
											? '다 자랐어요 · 먹이를 더 줄 필요가 없어요'
											: canFeed
												? `먹이 주기 · ${attendancePet.feeds}개 보유`
										: '먹이가 없어요 · 출석 보상으로 받아요'}
									</Text>
								</PressableScale>
							</View>
						</View>
						<View style={styles.attendanceStageRow}>
							{ATTENDANCE_PET_STAGES.map((stage, at) => {
								const earned = at <= attendancePet.level;
								const current = at === attendancePet.level;
								return (
									<View key={stage.minFeeds} style={styles.attendanceStage}>
										<View style={[styles.attendanceStageImageWrap, earned && styles.attendanceStageEarned, current && styles.attendanceStageCurrent]}>
											<Image source={ATTENDANCE_PET_IMAGES[at]} style={[styles.attendanceStageImage, !earned && styles.stageImageLocked]} contentFit="contain" />
										</View>
										<Text style={[styles.attendanceStageDay, earned && styles.attendanceStageDayEarned]}>{`먹이 ${stage.minFeeds}`}</Text>
									</View>
								);
							})}
						</View>
					</View>

					{/*
					 * 뱃지 — 딴 것은 진열장 한 줄로, 못 딴 것은 "다음 목표" 세 개로 좁힌다.
					 * 예전에는 스무 칸 모두를 설명까지 붙여 늘어놓아 목록으로만 읽혔다.
					 * 전체 목록은 눌러서 펼치고, 설명은 상세 팝업에서 읽는다.
					 */}
					<View style={styles.card}>
						<View style={styles.cardHead}>
							<Text style={styles.cardTitle}>뱃지</Text>
							<Text style={styles.cardMeta}>
								<Text style={styles.cardMetaStrong}>{life.badges.length}</Text> / {BADGES.length}
							</Text>
						</View>
						<ProgressBar ratio={BADGES.length ? life.badges.length / BADGES.length : 0} />

						{earnedBadges.length === 0 ? (
							<EmptyState variant="inline" icon="shield-star-outline" message="아직 딴 뱃지가 없어요. 아래 목표부터 하나씩 채워 봐요!" />
						) : (
							<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeShelf}>
								{earnedBadges.map((badge) => (
									<PressableScale
										key={badge.id}
										style={styles.badgeTrophy}
										onPress={() => openBadge(badge)}
										scaleTo={0.92}
										accessibilityRole="button"
										accessibilityLabel={`${badge.label} 뱃지 자세히 보기`}>
										<BadgeMedal badge={badge} size={scaleWidth(56)} showStars />
										<Text style={styles.badgeTrophyLabel} numberOfLines={1}>
											{badge.label}
										</Text>
									</PressableScale>
								))}
							</ScrollView>
						)}

						{nextBadges.length > 0 && (
							<View style={styles.badgeGoals}>
								<Text style={styles.badgeGoalHead}>다음 목표</Text>
								{nextBadges.map((badge) => (
									<PressableScale
										key={badge.id}
										style={styles.badgeGoal}
										onPress={() => openBadge(badge)}
										scaleTo={0.98}
										accessibilityRole="button"
										accessibilityLabel={`${badge.label} 뱃지 조건 보기`}>
										<BadgeMedal badge={badge} size={scaleWidth(36)} earned={false} />
										<View style={styles.badgeGoalBody}>
											<Text style={styles.badgeGoalLabel} numberOfLines={1}>
												{badge.label}
											</Text>
											<Text style={styles.badgeGoalReq} numberOfLines={1}>
												{badge.requirement}
											</Text>
										</View>
										<BadgeRarityChip rarity={badge.rarity} muted />
									</PressableScale>
								))}
							</View>
						)}

						<PressableScale
							style={styles.badgeMore}
							onPress={() => {
								playPop();
								setShowAllBadges((previous) => !previous);
							}}
							scaleTo={0.98}
							accessibilityRole="button"
							accessibilityState={{ expanded: showAllBadges }}>
							<Text style={styles.badgeMoreText}>{showAllBadges ? '접기' : `전체 ${BADGES.length}개 보기`}</Text>
							<IconComponent type="materialIcons" name={showAllBadges ? 'expand-less' : 'expand-more'} size={20} color={Colors.primaryDark} />
						</PressableScale>

						{showAllBadges && (
							<View style={styles.badgeGrid}>
								{BADGES.map((badge) => {
									const earned = earnedMap.has(badge.id);
									return (
										<PressableScale
											key={badge.id}
											style={styles.badgeCell}
											onPress={() => openBadge(badge)}
											scaleTo={0.94}
											accessibilityRole="button"
											accessibilityLabel={`${badge.label} 뱃지 자세히 보기`}>
											<BadgeMedal badge={badge} size={scaleWidth(46)} earned={earned} />
											<Text style={[styles.badgeLabel, !earned && styles.badgeLabelLocked]} numberOfLines={1}>
												{badge.label}
											</Text>
										</PressableScale>
									);
								})}
							</View>
						)}
					</View>

				</Animated.View>
			</ScrollView>
			{/* 뱃지 상세 — 이름·설명·획득 조건·희귀도를 한 장에 */}
			<BadgeDetailModal detail={badgeDetail} onClose={() => setBadgeDetail(null)} />
			{/* 화면 사용법 — 처음 들어오면 한 번, 이후에는 헤더의 물음표로 다시 본다 */}
			<LifeCharacterGuide visible={guide.visible} onClose={guide.close} lines={[
				'맨 위에서 출석과 학습 보상을 한눈에 봐요.',
				'나침반 올빼미는 먹이를 줄 때마다 자라요. 먹이 주기 버튼을 눌러 보세요.',
				'뱃지는 딴 것부터 진열되고, 전체 목록은 눌러서 펼쳐 봐요.',
			]} />
		</SafeAreaView>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: Colors.background },
		headerRight: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
		},
		content: {
			...Layout.column,
			paddingHorizontal: Spacing.lg,
			paddingBottom: SpacingV.xxxl,
		},
		sections: { gap: SpacingV.md },

		// 캐릭터가 서는 자리 — 글방 배경과 같은 높이라 배경이 이름·게이지 위로 넘치지 않는다
		petRoom: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'flex-end' },
		// 글방을 깔았을 때만 배경과 같은 높이를 잡는다 — 안 산 사람에게는 빈 여백이 생기지 않는다
		petCard: {
			backgroundColor: Colors.surface,
			borderRadius: Radius.xl,
			padding: Spacing.xl,
			alignItems: 'center',
			gap: scaleHeight(6),
			...Shadow.card,
		},
		petName: {
			fontSize: Typography.h3,
			fontWeight: FontWeight.bold,
			color: Colors.textStrong,
		},
		petStage: { fontSize: Typography.bodySm, color: Colors.textSecondary },
		petBar: { width: '100%', marginTop: SpacingV.sm },
		petHint: {
			fontSize: Typography.caption,
			color: Colors.textMuted,
			textAlign: 'center',
			lineHeight: scaledSize(17),
		},
		stageRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginTop: SpacingV.sm },
		stageDot: {
			width: scaleWidth(38),
			height: scaleWidth(38),
			borderRadius: Radius.pill,
			backgroundColor: Colors.surfaceAlt,
			alignItems: 'center',
			justifyContent: 'center',
		},
		stageDotOn: { backgroundColor: Colors.primarySoft },
		stageDotNow: { borderWidth: 2, borderColor: Colors.primary },
		stageImage: { width: scaleWidth(30), height: scaleWidth(30) },
		// 아직 못 간 단계는 실루엣처럼 흐리게
		stageImageLocked: { opacity: 0.25 },

		card: {
			backgroundColor: Colors.surface,
			borderRadius: Radius.xl,
			padding: Spacing.lg,
			gap: SpacingV.md,
			...Shadow.card,
		},
		cardHead: {
			flexDirection: 'row',
			alignItems: 'baseline',
			justifyContent: 'space-between',
			gap: Spacing.sm,
		},
		cardTitle: {
			fontSize: Typography.subtitle,
			fontWeight: FontWeight.bold,
			color: Colors.textStrong,
		},
		cardMeta: {
			flexShrink: 1,
			fontSize: Typography.caption,
			color: Colors.textSecondary,
			textAlign: 'right',
		},
		cardMetaStrong: {
			fontSize: Typography.body,
			fontWeight: FontWeight.heavy,
			color: Colors.primaryDeep,
		},
		attendancePetPanel: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			padding: Spacing.md,
			borderRadius: Radius.lg,
			backgroundColor: Colors.primaryBg,
		},
		// 먹이를 아직 안 준 상태 — 알 대신 빈 자리를 두고 필요한 먹이 수만 적는다
		attendancePetEmpty: {
			width: scaleWidth(86),
			height: scaleWidth(86),
			alignItems: 'center',
			justifyContent: 'center',
			gap: scaleHeight(2),
			borderRadius: Radius.pill,
			borderWidth: 1,
			borderStyle: 'dashed',
			borderColor: Colors.border,
			backgroundColor: Colors.surfaceAlt,
		},
		attendancePetEmptyText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textMuted },
		// 올빼미가 서는 자리 — 좌대를 발밑에 깔기 위해 한 겹 감싼다
		attendancePetStage: { alignItems: 'center', justifyContent: 'flex-end' },
		attendancePetPerch: { position: 'absolute', left: 0, right: 0, bottom: scaleHeight(2), alignItems: 'center' },
		feedButton: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: scaleWidth(6),
			height: scaleHeight(38),
			marginTop: SpacingV.sm,
			paddingHorizontal: Spacing.md,
			borderRadius: Radius.pill,
			backgroundColor: Colors.primary,
		},
		feedButtonOff: { backgroundColor: Colors.surfaceAlt },
		feedButtonText: { flexShrink: 1, fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textInverse },
		feedButtonTextOff: { color: Colors.textMuted },
		attendancePetBody: { flex: 1, gap: scaleHeight(4) },
		attendancePetEyebrow: {
			fontSize: Typography.caption,
			fontWeight: FontWeight.bold,
			color: Colors.primaryDark,
		},
		attendancePetName: {
			fontSize: Typography.subtitle,
			fontWeight: FontWeight.heavy,
			color: Colors.textStrong,
		},
		attendancePetHint: {
			fontSize: Typography.caption,
			color: Colors.textSecondary,
			lineHeight: scaledSize(17),
			marginBottom: scaleHeight(3),
		},
		attendanceStageRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			gap: Spacing.xs,
		},
		attendanceStage: { flex: 1, alignItems: 'center', gap: scaleHeight(3) },
		attendanceStageImageWrap: {
			width: scaleWidth(43),
			height: scaleWidth(43),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.md,
			backgroundColor: Colors.surfaceAlt,
		},
		attendanceStageEarned: { backgroundColor: Colors.primarySoft },
		attendanceStageCurrent: { borderWidth: 2, borderColor: Colors.primary },
		attendanceStageImage: { width: scaleWidth(38), height: scaleWidth(38) },
		attendanceStageDay: {
			fontSize: Typography.caption,
			color: Colors.textMuted,
		},
		attendanceStageDayEarned: {
			fontWeight: FontWeight.bold,
			color: Colors.primaryDark,
		},

		/** 딴 뱃지 진열장 — 가로 한 줄. 메달을 크게 세우고 이름만 붙인다 */
		badgeShelf: { gap: Spacing.md, paddingVertical: SpacingV.xs, paddingRight: Spacing.xs },
		badgeTrophy: { width: scaleWidth(64), alignItems: 'center', gap: scaleHeight(4) },
		badgeTrophyLabel: {
			fontSize: Typography.caption,
			fontWeight: FontWeight.bold,
			color: Colors.textStrong,
			textAlign: 'center',
		},

		/** 다음 목표 — 못 딴 뱃지 세 개만 한 줄씩. 조건이 한 줄로 읽혀 무엇을 하면 되는지가 남는다 */
		badgeGoals: { gap: SpacingV.sm, paddingTop: SpacingV.xs },
		badgeGoalHead: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: Colors.textMuted },
		badgeGoal: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			padding: Spacing.md,
			borderRadius: Radius.lg,
			backgroundColor: Colors.surfaceAlt,
		},
		badgeGoalBody: { flex: 1, gap: scaleHeight(2) },
		badgeGoalLabel: { fontSize: Typography.bodySm, fontWeight: FontWeight.bold, color: Colors.textStrong },
		badgeGoalReq: { fontSize: Typography.caption, color: Colors.textSecondary },

		/** 전체 펼치기 — 스무 칸을 늘 펼쳐 두면 화면이 뱃지 목록으로만 읽힌다 */
		badgeMore: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: Spacing.xxs,
			height: scaleHeight(42),
			borderRadius: Radius.pill,
			borderWidth: 1,
			borderColor: Colors.border,
		},
		badgeMoreText: { fontSize: Typography.bodySm, fontWeight: FontWeight.bold, color: Colors.primaryDark },

		badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingTop: SpacingV.xs },
		badgeCell: {
			width: '31%',
			alignItems: 'center',
			gap: scaleHeight(4),
			paddingVertical: SpacingV.md,
			paddingHorizontal: Spacing.xs,
			borderRadius: Radius.lg,
			backgroundColor: Colors.surfaceAlt,
		},
		badgeLabel: {
			fontSize: Typography.caption,
			fontWeight: FontWeight.bold,
			color: Colors.text,
			textAlign: 'center',
		},
		badgeLabelLocked: { color: Colors.textMuted },

		/**
		 * 내 보유 — 게임 HUD 판.
		 * 밝은 카드로 두면 아래 카드들과 같은 무게로 읽혀 "지갑" 으로 안 보였다.
		 * 진한 브랜드 면 + 위쪽 광택으로 홈 히어로와 같은 언어를 쓴다.
		 */
		vaultPanel: {
			gap: SpacingV.md,
			padding: Spacing.lg,
			borderRadius: Radius.xl,
			borderWidth: 1,
			borderColor: 'rgba(255, 255, 255, 0.10)',
			backgroundColor: Colors.brandBlock,
			overflow: 'hidden',
			...Shadow.card,
		},
		vaultGlow: { position: 'absolute', left: 0, right: 0, top: 0, height: '45%' },
		vaultHead: { gap: scaleHeight(2) },
		vaultTitle: { fontSize: Typography.subtitle, fontWeight: FontWeight.heavy, color: Colors.brandBlockText },
		vaultHint: { fontSize: Typography.caption, color: Colors.brandBlockMuted },

		vaultRow: { flexDirection: 'row', gap: Spacing.sm },
		/** 가방 줄 — 진한 판 위에 놓이는 인벤토리 칸들 */
		bagRow: { gap: Spacing.sm, paddingRight: Spacing.xs },
		bagChip: { width: scaleWidth(60), alignItems: 'center', gap: scaleHeight(4) },
		bagAssetBox: {
			width: scaleWidth(52),
			height: scaleWidth(52),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.md,
			backgroundColor: 'rgba(255,255,255,0.10)',
			borderWidth: 1,
			borderColor: 'rgba(255,255,255,0.16)',
		},
		bagAsset: { width: scaleWidth(38), height: scaleWidth(38) },
		// 개수 배지 — 칸 오른쪽 위에 걸친다 (게임 인벤토리와 같은 자리)
		bagBadge: {
			position: 'absolute',
			right: scaleWidth(-4),
			top: scaleHeight(-4),
			minWidth: scaleWidth(18),
			height: scaleWidth(18),
			paddingHorizontal: scaleWidth(4),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.pill,
			backgroundColor: Colors.accentAmber,
		},
		bagCount: { fontSize: scaledSize(10), fontWeight: FontWeight.heavy, color: '#2A1A05', fontVariant: ['tabular-nums'] },
		bagLabel: { fontSize: Typography.caption, color: Colors.brandBlockMuted, textAlign: 'center' },
		vaultCell: {
			flex: 1,
			alignItems: 'center',
			gap: scaleHeight(3),
			paddingVertical: SpacingV.md,
			paddingHorizontal: Spacing.xs,
			borderRadius: Radius.lg,
			backgroundColor: 'rgba(255, 255, 255, 0.08)',
		},
		vaultValue: { fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: Colors.brandBlockText, fontVariant: ['tabular-nums'] },
		// 단위(개·/24)는 숫자보다 한 단계 작게 — 값이 먼저 읽힌다
		vaultUnit: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.brandBlockMuted },
		vaultLabel: { fontSize: Typography.caption, color: Colors.brandBlockMuted },
	});

export default LifeProfileScreen;
