// @/screens/TowerChallengeScreen.tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { contentWidth, scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import { TOWER_LEVELS } from '@/src/const/ConstTowerData';
import { useDispatch } from 'react-redux';
import { addTowerAttemptByAd, devResetTower, ensureTowerDay, recordTower, spendTowerAttempt, TOWER_AD_REWARD_MAX, TOWER_DAILY_ATTEMPTS, useTower } from '@/src/store/slice/TowerSlice';
import { Colors, LIGHT_COLORS, readableOn, withAlpha } from '@/src/const/ConstColors';
import { FontWeight, Layout, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { themed } from '@/src/utils/ThemedStyles';

import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { useToast } from '@/src/context/ToastContext';
import AdmobRewardAd from '@/src/screens/common/ads/AdmobRewardAd';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import BottomHomeButton from './BottomHomeButton';
import ChallengeCountdown from './ChallengeCountdown';
import { showConfirm } from '@/src/screens/common/modal/ConfirmModal';
import CharacterGuide, { CharacterGuideButton, useCharacterGuideOnce } from '@/src/screens/common/CharacterGuide';

/** 광고로 얻을 수 있는 하루 최대 추가 도전 횟수 — 리듀서와 같은 값을 본다 */
const MAX_AD_REWARD = TOWER_AD_REWARD_MAX;

type TowerLevel = (typeof TOWER_LEVELS)[number];
type FloorState = 'cleared' | 'current' | 'locked';

/**
 * 타워 챌린지
 * -------------------------------------------------
 * 화면 구성은 위에서 아래로 딱 세 덩어리다.
 *  1) 진행 카드 — 정복한 층 / 남은 하트 / 광고로 하트 더 받기
 *  2) 도전 카드 — 지금 깰 차례인 층 하나만 크게 (보스·보상·도전 버튼)
 *  3) 층 목록 — 전체 층을 한 줄씩 (클리어 / 도전 중 / 잠김)
 *
 * 예전엔 층마다 큰 카드를 캐러셀로 넘겼는데, 카드 하나에 보스·보상·버튼을 다 넣느라
 * 높이를 화면 비율로 고정해야 했고 작은 기기에서 내용이 서로 겹쳤다.
 * 지금은 전부 세로로 흐르게 두어 고정 높이가 없다.
 *
 * 이 화면은 테마와 무관하게 항상 어두운 톤이다. 그래서 글씨·선은 라이트/다크에서 값이 뒤집히는
 * text/surfaceAlt 계열 대신 **darkOnPanel·darkCard 계열 토큰만** 쓴다.
 */
const TowerChallengeScreen = () => {
	const { t } = useTranslation();
	const { showToast } = useToast();
	const dispatch = useDispatch();
	/** 진행은 redux 한 벌뿐이다 — 홈·통계가 보는 값과 같아 두 곳이 어긋날 수 없다 */
	const tower = useTower();
	/** 카운트다운 중인 층 — null 이면 연출을 그리지 않는다 */
	const [countdownLevel, setCountdownLevel] = useState<number | null>(null);
	const [showAd, setShowAd] = useState(false);
	const guide = useCharacterGuideOnce('tower-challenge');

	const scrollRef = useRef<ScrollView>(null);

	useFocusEffect(
		useCallback(() => {
			// 돌아오면 층 목록을 맨 위로 올린다
			scrollRef.current?.scrollTo({ y: 0, animated: false });
			// 자정을 넘겼으면 오늘 몫 도전 기회를 채운다 (화면에 들어올 때마다 확인)
			dispatch(ensureTowerDay());
		}, [dispatch]),
	);

	const cleared = tower.clearedLevels;
	const clearedCount = cleared.length;
	const isAllCleared = clearedCount >= TOWER_LEVELS.length;
	/** 지금 깰 차례인 층 — 아직 클리어하지 않은 가장 낮은 층 */
	const currentTower = useMemo<TowerLevel | undefined>(() => TOWER_LEVELS.find((item) => !cleared.includes(item.level)), [cleared]);

	const stateOf = (item: TowerLevel): FloorState => {
		if (cleared.includes(item.level)) {
			return 'cleared';
		}
		return item.level === currentTower?.level ? 'current' : 'locked';
	};

	const handleWatchAd = () => {
		if (tower.adRewardUsed >= MAX_AD_REWARD) {
			showToast(t('tower.challenge.toast.adLimit'), 'alert-circle-outline');
			return;
		}
		setShowAd(true);
	};

	const handleStartChallenge = (item: TowerLevel) => {
		if (stateOf(item) !== 'current') {
			return;
		}
		if (tower.attempts <= 0) {
			showConfirm({
				title: t('tower.challenge.noAttempts.title'),
				message: t('tower.challenge.noAttempts.message'),
				confirmText: t('tower.challenge.noAttempts.confirm'),
				icon: 'play-circle-filled',
			}).then((ok) => ok && handleWatchAd());
			return;
		}

		dispatch(spendTowerAttempt());
		// 도전 기회를 먼저 깎고 3 · 2 · 1 · 시작! 을 보여 준 뒤 층으로 들어간다 (타임 챌린지와 같은 연출)
		setCountdownLevel(item.level);
	};

	const handleDevReset = () => {
		Alert.alert(t('tower.dev.title'), t('tower.dev.chooseAction'), [
			{ text: t('common.cancel'), style: 'cancel' },
			...TOWER_LEVELS.map((item) => ({
				text: t('tower.dev.clearLevel', { level: item.level }),
				onPress: () => dispatch(recordTower(item.level)),
			})),
			{
				text: t('tower.dev.reset'),
				style: 'destructive',
				onPress: () => dispatch(devResetTower()),
			},
		]);
	};

	/** 진행 카드 — 정복 현황 + 하트 + 광고 */
	const renderProgressCard = () => (
		<View style={styles.panel}>
			<View style={styles.progressHead}>
				<Text style={styles.progressTitle}>{t('tower.challenge.progressTitle')}</Text>
				<Text style={styles.progressCount}>
					{clearedCount}
					<Text style={styles.progressTotal}> / {TOWER_LEVELS.length}</Text>
				</Text>
			</View>
			<View style={styles.progressTrack}>
				<View style={[styles.progressFill, { width: `${(clearedCount / TOWER_LEVELS.length) * 100}%` }]} />
			</View>

			<View style={styles.attemptRow}>
				<View style={styles.attemptBox}>
					<Text style={styles.attemptLabel}>{t('tower.challenge.attemptsLeft')}</Text>
					<View style={styles.heartRow}>
						{tower.attempts > 0 ? (
							Array.from({ length: Math.min(tower.attempts, 5) }).map((_, i) => (
								<IconComponent key={i} type="materialIcons" name="favorite" size={scaledSize(16)} color={Colors.error} />
							))
						) : (
							<IconComponent type="materialIcons" name="favorite-border" size={scaledSize(16)} color={Colors.onBrandBorder} />
						)}
						<Text style={styles.attemptCount}>{t('tower.challenge.attemptCount', { count: tower.attempts })}</Text>
					</View>
				</View>

				<TouchableOpacity
					style={[styles.adButton, tower.adRewardUsed >= MAX_AD_REWARD && styles.adButtonDisabled]}
					onPress={handleWatchAd}
					disabled={tower.adRewardUsed >= MAX_AD_REWARD}
					activeOpacity={0.85}
					accessibilityRole="button"
					accessibilityLabel={t('tower.challenge.adA11y')}>
					<IconComponent type="materialIcons" name="play-circle-filled" size={scaledSize(20)} color={Colors.textInverse} />
					<View style={styles.adTextWrap}>
						<Text style={styles.adTitle}>{t('tower.challenge.adButton')}</Text>
						<Text style={styles.adSub}>
							{tower.adRewardUsed >= MAX_AD_REWARD
								? t('tower.challenge.adAllUsed')
								: t('tower.challenge.adUsed', { used: tower.adRewardUsed, max: MAX_AD_REWARD })}
						</Text>
					</View>
				</TouchableOpacity>
			</View>
		</View>
	);

	/** 도전 카드 — 지금 깰 차례인 층 하나 */
	const renderChallengeCard = (floor: TowerLevel) => {
		const canChallenge = tower.attempts > 0;
		return (
			<View style={[styles.panel, styles.challengePanel, { borderColor: withAlpha(floor.color, '8C') }]}>
				<View style={styles.challengeHead}>
					<View style={[styles.levelBadge, { backgroundColor: floor.color }]}>
						{/* 층 색은 데이터에서 오므로 글씨색을 고정할 수 없다 — 면 밝기에 맞춰 고른다 */}
						<Text style={[styles.levelBadgeText, { color: readableOn(floor.color) }]}>LV.{floor.level}</Text>
					</View>
					<Text style={styles.challengeName}>{floor.name}</Text>
				</View>

				<View style={styles.bossRow}>
					<View style={[styles.bossFrame, { borderColor: floor.color, backgroundColor: withAlpha(floor.color, '2E') }]}>
						<Image source={floor.bossImage} style={styles.bossImage} contentFit="contain" />
					</View>
					<View style={styles.bossTextWrap}>
						<Text style={styles.bossLabel}>{floor.bossTitle}</Text>
						<Text style={styles.bossName} numberOfLines={2}>
							{floor.bossName}
						</Text>
						<Text style={styles.bossDesc} numberOfLines={3}>
							{floor.bossDescription}
						</Text>
					</View>
				</View>

				{/*
				 * 클리어 보상 — 이름만 적으면 '옷 한 벌' 로 읽혀 도전할 이유가 되지 않았다.
				 * 이 층을 깨면 **앞으로 계속** 무엇이 좋아지는지를 이름 아래에 붙여 둔다.
				 */}
				<View style={styles.rewardRow}>
					<Image source={floor.reward.image} style={styles.rewardImage} contentFit="contain" />
					<View style={styles.rewardTextWrap}>
						<Text style={styles.rewardLabel}>{t('tower.challenge.rewardLabel')}</Text>
						<Text style={styles.rewardName} numberOfLines={1}>
							{floor.reward.name}
						</Text>
					</View>
				</View>

				<TouchableOpacity
					style={[styles.challengeButton, { backgroundColor: canChallenge ? floor.color : LIGHT_COLORS.secondaryDark }]}
					onPress={() => handleStartChallenge(floor)}
					activeOpacity={0.85}
					accessibilityRole="button"
					accessibilityLabel={canChallenge ? t('tower.challenge.startA11y', { level: floor.level }) : t('tower.challenge.watchAdToStart')}>
					{/* 버튼 면이 층 색(민트·앰버 등 밝은 색 포함)이라 글씨·아이콘 색을 면 밝기에 맞춘다 */}
					<IconComponent
						type="materialIcons"
						name={canChallenge ? 'bolt' : 'play-circle-filled'}
						size={scaledSize(18)}
						color={canChallenge ? readableOn(floor.color) : Colors.textInverse}
					/>
					<Text style={[styles.challengeButtonText, canChallenge && { color: readableOn(floor.color) }]}>
						{canChallenge ? t('tower.challenge.start') : t('tower.challenge.watchAdToStart')}
					</Text>
				</TouchableOpacity>
			</View>
		);
	};

	/** 모든 층을 깼을 때 도전 카드 자리에 들어가는 마무리 카드 */
	const renderAllClearedCard = () => (
		<View style={[styles.panel, styles.challengePanel, styles.clearedPanel]}>
			<Image
				source={require('@/src/assets/tower/tower-challenge-complete.webp')}
				style={styles.clearedHero}
				contentFit="cover"
			/>
			<LinearGradient
				colors={['rgba(5, 12, 22, 0.04)', 'rgba(5, 12, 22, 0.92)']}
				style={StyleSheet.absoluteFillObject}
			/>
			<View style={styles.clearedCopy}>
				<View style={styles.clearedTitleRow}>
					<IconComponent type="materialIcons" name="emoji-events" size={scaledSize(24)} color={Colors.gold} />
					<Text style={styles.allClearedTitle}>{t('tower.challenge.allClearedTitle')}</Text>
				</View>
				<Text style={styles.allClearedSub}>{t('tower.challenge.allClearedSub')}</Text>
			</View>
		</View>
	);

	/** 층 목록 한 줄 */
	const renderFloorRow = (floor: TowerLevel, index: number) => {
		const state = stateOf(floor);
		const isLocked = state === 'locked';
		return (
			<FadeInUp key={floor.level} delay={index * 30}>
				<View style={[styles.floorRow, state === 'current' && { borderColor: withAlpha(floor.color, '80') }]}>
					<View style={[styles.floorBadge, { backgroundColor: isLocked ? Colors.onBrandSurface : floor.color }]}>
						<Text style={[styles.floorBadgeText, !isLocked && { color: readableOn(floor.color) }]}>{floor.level}</Text>
					</View>
					{isLocked ? (
						<View style={styles.floorThumbLocked}>
							<IconComponent type="materialIcons" name="lock" size={scaledSize(18)} color={Colors.onBrandBorder} />
						</View>
					) : (
						<Image source={floor.bossImage} style={styles.floorThumb} contentFit="contain" />
					)}
					<View style={styles.floorTextWrap}>
						<Text style={styles.floorName}>{floor.name}</Text>
						<Text style={styles.floorSub} numberOfLines={1}>
							{isLocked ? t('tower.challenge.lockedHint') : floor.bossName}
						</Text>
					</View>
					{/* 어두운 패널 위 — primary 는 라이트 테마에서 1.8:1 로 묻혀 한 단 밝은 파랑을 쓴다 (다크의 primaryLight 는 남색이라 라이트 원값 고정) */}
					{state === 'cleared' && <IconComponent type="materialIcons" name="check-circle" size={scaledSize(22)} color={LIGHT_COLORS.primaryLight} />}
					{/* 작은 글씨를 층 색으로 두면 1층 파랑이 어두운 패널 위에서 4.5:1 아래로 떨어진다 — 층 색은 줄 테두리가 맡는다 */}
					{state === 'current' && <Text style={styles.floorTag}>{t('tower.challenge.currentTag')}</Text>}
					{isLocked && <IconComponent type="materialIcons" name="lock" size={scaledSize(18)} color={Colors.onBrandBorder} />}
				</View>
			</FadeInUp>
		);
	};

	return (
		<View style={styles.container}>
			<LinearGradient colors={[Colors.inkSoft, Colors.ink, Colors.nightDeep]} style={StyleSheet.absoluteFillObject} />

			{/* 상단 안전영역은 전역 배너가 이미 확보한다 — top 을 쓰면 여백이 두 번 들어간다 */}
			<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
				<View style={styles.header}>
					<View style={styles.headerSide}>
						{__DEV__ && (
							<TouchableOpacity onPress={handleDevReset} style={styles.devButton} activeOpacity={0.8}>
								<IconComponent type="materialIcons" name="build" size={scaledSize(16)} color={Colors.warning} />
								<Text style={styles.devButtonText}>DEV</Text>
							</TouchableOpacity>
						)}
					</View>
					<View style={styles.headerTitleWrap}>
						<Text style={styles.headerTitle}>{t('tower.challenge.title')}</Text>
						<Text style={styles.headerSub}>{t('tower.challenge.subtitle')}</Text>
					</View>
					<View style={[styles.headerSide, styles.headerSideRight]}>
						<CharacterGuideButton onPress={guide.open} color={Colors.onBrandTextSoft} size={scaledSize(20)} />
					</View>
				</View>

				<ScrollView ref={scrollRef} style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
					<FadeInUp delay={0}>
						<View style={styles.heroBanner}>
							<Image
								source={require('@/src/assets/tower/tower-challenge-hero.webp')}
								style={styles.heroBannerImage}
								contentFit="cover"
							/>
							<View style={styles.heroBannerShade} />
							<View style={styles.heroBannerCopy}>
								<Text style={styles.heroBannerEyebrow}>CLIMB TO THE TOP</Text>
								<Text style={styles.heroBannerTitle}>{t('tower.challenge.heroTitle')}</Text>
							</View>
						</View>
					</FadeInUp>

					<FadeInUp delay={30}>{renderProgressCard()}</FadeInUp>

					<FadeInUp delay={60}>
						{isAllCleared || !currentTower ? renderAllClearedCard() : renderChallengeCard(currentTower)}
					</FadeInUp>

					<Text style={styles.sectionTitle}>{t('tower.challenge.floorsTitle')}</Text>
					{TOWER_LEVELS.map((tower, index) => renderFloorRow(tower, index + 3))}

					<View style={styles.noticeBox}>
						<Text style={styles.noticeLine}>{t('tower.challenge.notice.clear')}</Text>
						<Text style={styles.noticeLine}>{t('tower.challenge.notice.reward')}</Text>
						<Text style={styles.noticeLine}>{t('tower.challenge.notice.daily', { daily: TOWER_DAILY_ATTEMPTS })}</Text>
						<Text style={styles.noticeLine}>{t('tower.challenge.notice.ad', { max: MAX_AD_REWARD })}</Text>
					</View>
				</ScrollView>

				<BottomHomeButton
					confirmTitle={t('tower.challenge.exitConfirm')}
					borderColor={Colors.onBrandSurface}
					textColor={Colors.onBrandText}
					iconColor={Colors.onBrandTextSoft}
				/>

				{/* 3 · 2 · 1 · 시작! — 타임 챌린지와 같은 연출 */}
				<ChallengeCountdown
					visible={countdownLevel !== null}
					onDone={() => {
						const level = countdownLevel;
						setCountdownLevel(null);
						if (level !== null) {
							router.push({ pathname: '/quiz/tower-quiz', params: { level: String(level) } });
						}
					}}
				/>

				{showAd && (
					<AdmobRewardAd
						onRewarded={() => {
							dispatch(addTowerAttemptByAd());
							setShowAd(false);
							showToast(t('tower.challenge.toast.adRewarded'), 'gift-outline');
						}}
						onClosed={() => {
							setShowAd(false);
							showToast(t('tower.challenge.toast.adClosed'), 'movie-open-off-outline');
						}}
						onFailed={() => {
							setShowAd(false);
							showToast(t('tower.challenge.toast.adFailed'), 'wifi-off');
						}}
					/>
				)}

				<CharacterGuide
					visible={guide.visible}
					onClose={guide.close}
					lines={[
						t('tower.challenge.guide.line1'),
						// 보상은 층마다 코스튬·캐릭터·아이템으로 갈린다 — '코스튬' 으로 못 박지 않는다
						t('tower.challenge.guide.line2'),
						t('tower.challenge.guide.line3', { daily: TOWER_DAILY_ATTEMPTS, max: MAX_AD_REWARD }),
					]}
					title={t('tower.challenge.guide.title')}
				/>
			</SafeAreaView>
		</View>
	);
};

export default TowerChallengeScreen;

const makeStyles = () =>
	StyleSheet.create({
		container: { flex: 1 },
		safeArea: { flex: 1 },

		// ===== 헤더 =====
		// 태블릿: 제목이 화면 왼쪽 끝에 붙지 않도록 본문 카드와 같은 기둥에 맞춘다
		header: {
			width: '100%',
			maxWidth: contentWidth,
			alignSelf: 'center',
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: Layout.screenH,
			paddingTop: SpacingV.sm,
			paddingBottom: SpacingV.sm,
		},
		// 좌·우 슬롯 폭이 같아야 제목이 화면 정중앙에 온다
		headerSide: { width: scaleWidth(56), justifyContent: 'center' },
		headerSideRight: { alignItems: 'flex-end' },
		headerTitleWrap: { flex: 1, alignItems: 'center' },
		headerTitle: { fontSize: Typography.h3, fontWeight: FontWeight.heavy, color: Colors.textInverse },
		headerSub: { fontSize: Typography.caption, color: Colors.onBrandTextSoft, marginTop: SpacingV.xxs, letterSpacing: 1 },
		devButton: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.xxs,
			paddingHorizontal: Spacing.sm,
			paddingVertical: SpacingV.xxs,
			borderRadius: Radius.sm,
			borderWidth: 1,
			borderColor: withAlpha(Colors.warning, '80'),
			backgroundColor: withAlpha(Colors.warning, '33'),
		},
		devButtonText: { fontSize: Typography.micro, fontWeight: FontWeight.bold, color: Colors.warning },

		body: { flex: 1 },
		// 태블릿: 본문을 가운데 한 기둥으로 묶는다 (헤더와 같은 폭이라 제목과 카드 왼쪽 선이 맞는다)
		bodyContent: { width: '100%', maxWidth: contentWidth, alignSelf: 'center', paddingHorizontal: Layout.screenH, paddingBottom: SpacingV.xl, gap: SpacingV.md },
		heroBanner: {
			height: scaleHeight(176),
			borderRadius: Radius.xl,
			overflow: 'hidden',
			backgroundColor: Colors.onBrandWatermark,
			borderWidth: 1,
			borderColor: Colors.onBrandSurface,
		},
		heroBannerImage: { width: '100%', height: '100%' },
		heroBannerShade: {
			position: 'absolute',
			left: 0,
			right: 0,
			bottom: 0,
			height: '48%',
			backgroundColor: 'rgba(5, 12, 22, 0.72)',
		},
		heroBannerCopy: { position: 'absolute', left: Spacing.lg, right: Spacing.lg, bottom: SpacingV.md, gap: SpacingV.xxs },
		heroBannerEyebrow: { fontSize: Typography.micro, fontWeight: FontWeight.heavy, color: Colors.gold, letterSpacing: 1.2 },
		heroBannerTitle: { fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: Colors.textInverse },

		// ===== 공통 패널 =====
		panel: {
			backgroundColor: Colors.onBrandWatermark,
			borderRadius: Radius.xl,
			borderWidth: 1,
			borderColor: Colors.onBrandSurface,
			padding: Spacing.lg,
		},

		// ===== 진행 카드 =====
		progressHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
		progressTitle: { fontSize: Typography.bodySm, fontWeight: FontWeight.semibold, color: Colors.onBrandTextSoft },
		progressCount: { fontSize: Typography.h3, fontWeight: FontWeight.heavy, color: Colors.textInverse },
		progressTotal: { fontSize: Typography.bodySm, fontWeight: FontWeight.semibold, color: Colors.onBrandTextSoft },
		progressTrack: {
			height: scaleHeight(8),
			borderRadius: Radius.pill,
			backgroundColor: Colors.onBrandWatermark,
			overflow: 'hidden',
			marginTop: SpacingV.sm,
		},
		// 어두운 패널 위 막대 — primary 는 라이트 테마에서 패널과 1.8:1 이라 채워진 길이가 안 보였다
		progressFill: { height: '100%', borderRadius: Radius.pill, backgroundColor: LIGHT_COLORS.primaryLight },

		attemptRow: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.md, marginTop: SpacingV.md },
		attemptBox: {
			flex: 1,
			justifyContent: 'center',
			gap: SpacingV.xxs,
			paddingHorizontal: Spacing.md,
			paddingVertical: SpacingV.sm,
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: withAlpha(Colors.error, '59'),
			backgroundColor: withAlpha(Colors.error, '1F'),
		},
		attemptLabel: { fontSize: Typography.caption, color: Colors.onBrandTextSoft, fontWeight: FontWeight.medium },
		heartRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
		attemptCount: { fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: Colors.textInverse, marginLeft: Spacing.xs },

		adButton: {
			flex: 1.3,
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.sm,
			paddingHorizontal: Spacing.md,
			paddingVertical: SpacingV.sm,
			borderRadius: Radius.lg,
			// 다크의 secondaryDark 는 밝은 회색(#CBD5E1)이라 흰 글씨가 사라진다 — 어두운 패널 전용이라 라이트 원값 고정
			backgroundColor: LIGHT_COLORS.secondaryDark,
		},
		adButtonDisabled: { backgroundColor: Colors.onBrandSurface },
		adTextWrap: { flexShrink: 1 },
		adTitle: { fontSize: Typography.footnote, fontWeight: FontWeight.bold, color: Colors.textInverse },
		// 보조 문구는 제목(textInverse)보다 한 단계 흐려야 위계가 보인다.
		// 단 민트 버튼 면 위라 70% 흰색(darkOnPanelSub)은 3.5:1 로 작은 글씨가 흐렸다 — 92% 로 (4.9:1)
		adSub: { fontSize: Typography.micro, color: Colors.onBrandText, marginTop: SpacingV.xxs },

		// ===== 도전 카드 =====
		challengePanel: { borderWidth: 1.5, gap: SpacingV.md },
		challengeHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
		levelBadge: { paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xxs, borderRadius: Radius.pill },
		levelBadgeText: { fontSize: Typography.micro, fontWeight: FontWeight.heavy, color: Colors.textInverse },
		challengeName: { flex: 1, fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: Colors.textInverse },

		bossRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
		bossFrame: {
			width: scaleWidth(96),
			height: scaleWidth(96),
			borderRadius: scaleWidth(48),
			borderWidth: 2,
			alignItems: 'center',
			justifyContent: 'center',
		},
		bossImage: { width: scaleWidth(78), height: scaleWidth(78) },
		bossTextWrap: { flex: 1, gap: SpacingV.xxs },
		bossLabel: { fontSize: Typography.micro, color: Colors.onBrandTextSoft, fontWeight: FontWeight.semibold },
		bossName: { fontSize: Typography.body, fontWeight: FontWeight.heavy, color: Colors.textInverse },
		bossDesc: { fontSize: Typography.caption, color: Colors.onBrandTextSoft, lineHeight: scaledSize(17) },

		rewardRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			paddingTop: SpacingV.md,
			borderTopWidth: 1,
			borderTopColor: Colors.onBrandWatermark,
		},
		rewardImage: { width: scaleWidth(36), height: scaleWidth(36) },
		rewardTextWrap: { flex: 1 },
		rewardLabel: { fontSize: Typography.micro, color: Colors.onBrandTextSoft, fontWeight: FontWeight.semibold },
		rewardName: { fontSize: Typography.bodySm, fontWeight: FontWeight.bold, color: Colors.textInverse, marginTop: SpacingV.xxs },
		// 지속 효과 한 줄 — 보상 이름 바로 아래. 층 색을 그대로 써서 '이 층의 것' 이라는 걸 색으로 잇는다

		challengeButton: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: Spacing.sm,
			minHeight: scaleHeight(48),
			borderRadius: Radius.md,
		},
		// 타임 챌린지의 '챌린지 시작하기' 버튼과 같은 글자 크기 — 두 챌린지의 주요 버튼을 한 언어로 맞춘다
		challengeButtonText: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.textInverse, letterSpacing: 0.3 },

		// ===== 모두 정복 =====
		clearedPanel: {
			height: scaleHeight(190),
			padding: 0,
			justifyContent: 'flex-end',
			overflow: 'hidden',
			borderColor: withAlpha(Colors.gold, '80'),
		},
		clearedHero: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
		clearedCopy: { gap: SpacingV.xs, padding: Spacing.lg },
		clearedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
		allClearedTitle: { fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: Colors.textInverse },
		allClearedSub: { fontSize: Typography.caption, color: Colors.textInverse, opacity: 0.82 },

		// ===== 층 목록 =====
		sectionTitle: {
			fontSize: Typography.footnote,
			fontWeight: FontWeight.bold,
			color: Colors.onBrandTextSoft,
			marginTop: SpacingV.xs,
			marginLeft: Spacing.xs,
		},
		floorRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			paddingHorizontal: Spacing.md,
			paddingVertical: SpacingV.sm,
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.onBrandSurface,
			backgroundColor: Colors.onBrandWatermark,
			// 줄 간격은 bodyContent 의 gap 하나로만 준다 — marginBottom 을 더하면 층 목록만 카드보다 벌어졌다
		},
		floorBadge: {
			width: scaleWidth(26),
			height: scaleWidth(26),
			borderRadius: scaleWidth(13),
			alignItems: 'center',
			justifyContent: 'center',
		},
		floorBadgeText: { fontSize: Typography.micro, fontWeight: FontWeight.heavy, color: Colors.textInverse },
		floorThumb: { width: scaleWidth(34), height: scaleWidth(34) },
		floorThumbLocked: {
			width: scaleWidth(34),
			height: scaleWidth(34),
			borderRadius: scaleWidth(17),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.onBrandSurface,
		},
		floorTextWrap: { flex: 1 },
		floorName: { fontSize: Typography.bodySm, fontWeight: FontWeight.bold, color: Colors.onBrandText },
		floorSub: { fontSize: Typography.micro, color: Colors.onBrandTextSoft, marginTop: SpacingV.xxs },
		floorTag: { fontSize: Typography.micro, fontWeight: FontWeight.heavy, color: Colors.onBrandText },

		// ===== 안내 =====
		noticeBox: {
			backgroundColor: Colors.onBrandWatermark,
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.onBrandWatermark,
			padding: Spacing.lg,
			gap: SpacingV.xxs,
		},
		noticeLine: { fontSize: Typography.caption, color: Colors.onBrandTextSoft, lineHeight: scaledSize(18) },
	});
const styles = themed(makeStyles);
