// @/screens/TowerChallengeScreen.tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@/src/four/navigation/compat';
import FastImage from '@/src/four/components/FastImage';
import LinearGradient from 'react-native-linear-gradient';

import DateUtils from '@/src/four/utils/DateUtils';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils';
import { Paths } from '@/src/four/navigation/conf/Paths';
import { TOWER_LEVELS, TowerProgress } from '@/src/four/const/ConstTowerData';
import { Colors, onSurface, withAlpha } from '@/src/four/const/ConstColors';
import { FontWeight, Radius, Spacing, SpacingV, Typography } from '@/src/four/const/ConstDesign';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';

import IconComponent from './common/atomic/IconComponent';
import AdmobRewardAd from './common/ads/AdmobRewardAd';
import AnimatedListItem from './common/AnimatedListItem';
import BottomHomeButton from './common/BottomHomeButton';
import ChallengeCountdown from './common/ChallengeCountdown';
import CmmDelConfirmModal from './modal/CmmDelConfirmModal';
import CharacterGuide, { CharacterGuideButton, useCharacterGuideOnce } from './common/CharacterGuide';

const TOWER_STORAGE_KEY = 'TOWER_CHALLENGE_PROGRESS';
/** 광고로 얻을 수 있는 하루 최대 추가 도전 횟수 */
const MAX_AD_REWARD = 3;

const INITIAL_PROGRESS: TowerProgress = {
	level: 1,
	attempts: 1,
	adRewardUsed: 0,
	completedLevels: [],
	currentQuestion: 0,
	correctAnswers: 0,
	lastAttemptDate: DateUtils.getLocalDateString(),
	unlockedRewards: [],
};

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
	const navigation = useNavigation<any>();
	const [progress, setProgress] = useState<TowerProgress>(INITIAL_PROGRESS);
	/** 카운트다운 중인 층 — null 이면 연출을 그리지 않는다 */
	const [countdownLevel, setCountdownLevel] = useState<number | null>(null);
	const [showAd, setShowAd] = useState(false);
	const [showAdConfirm, setShowAdConfirm] = useState(false);
	// OS 기본 알림창 대신 앱 팝업으로 알린다 — 확인 버튼 하나짜리 안내
	const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
	const guide = useCharacterGuideOnce('tower-challenge');

	// 타워 퀴즈를 끝내고 돌아오면 클리어·남은 도전이 바뀌어 있으므로 포커스마다 다시 읽는다
	const scrollRef = useRef<ScrollView>(null);

	useFocusEffect(
		useCallback(() => {
			// 돌아오면 열려 있던 팝업을 닫고 층 목록을 맨 위로 올린다
			setShowAdConfirm(false);
			setNotice(null);
			scrollRef.current?.scrollTo({ y: 0, animated: false });
			loadProgress();
		}, []),
	);

	const loadProgress = async () => {
		try {
			const saved = await AsyncStorage.getItem(TOWER_STORAGE_KEY);
			if (!saved) {
				return;
			}
			const parsed: TowerProgress = JSON.parse(saved);
			const today = DateUtils.getLocalDateString();

			if (parsed.lastAttemptDate !== today) {
				parsed.attempts = 1;
				parsed.adRewardUsed = 0;
				parsed.lastAttemptDate = today;
			} else {
				parsed.attempts = Math.max(0, parsed.attempts ?? 1);
			}
			setProgress(parsed);
		} catch (error) {
			console.error('탑 도전 데이터 로드 실패:', error);
		}
	};

	const saveProgress = async (next: TowerProgress) => {
		try {
			await AsyncStorage.setItem(TOWER_STORAGE_KEY, JSON.stringify(next));
			setProgress(next);
		} catch (error) {
			console.error('탑 도전 데이터 저장 실패:', error);
		}
	};

	const clearedCount = progress.completedLevels.length;
	const isAllCleared = clearedCount >= TOWER_LEVELS.length;
	/** 지금 깰 차례인 층 — 아직 클리어하지 않은 가장 낮은 층 */
	const currentTower = useMemo<TowerLevel | undefined>(
		() => TOWER_LEVELS.find((tower) => !progress.completedLevels.includes(tower.level)),
		[progress.completedLevels],
	);

	const stateOf = (tower: TowerLevel): FloorState => {
		if (progress.completedLevels.includes(tower.level)) {
			return 'cleared';
		}
		return tower.level === currentTower?.level ? 'current' : 'locked';
	};

	const handleWatchAd = () => {
		if (progress.adRewardUsed >= MAX_AD_REWARD) {
			setNotice({ title: '알림', message: '오늘은 더 이상 광고를 볼 수 없습니다.' });
			return;
		}
		setShowAd(true);
	};

	const handleStartChallenge = (tower: TowerLevel) => {
		if (stateOf(tower) !== 'current') {
			return;
		}
		if (progress.attempts <= 0) {
			// OS 기본 확인창 대신 앱 팝업 — 타워 종료 확인과 같은 모양으로 맞춘다
			setShowAdConfirm(true);
			return;
		}

		saveProgress({ ...progress, attempts: Math.max(0, progress.attempts - 1) });
		// 도전 기회를 먼저 깎고 3 · 2 · 1 · 시작! 을 보여 준 뒤 층으로 들어간다 (타임 챌린지와 같은 연출)
		setCountdownLevel(tower.level);
	};

	const handleDevReset = () => {
		Alert.alert('개발자 모드', '작업을 선택하세요', [
			{ text: '취소', style: 'cancel' },
			...TOWER_LEVELS.map((tower) => ({
				text: `${tower.level}단계 클리어`,
				onPress: async () => {
					await saveProgress({
						...progress,
						level: Math.max(progress.level, tower.level + 1),
						completedLevels: [...new Set([...progress.completedLevels, tower.level])],
						unlockedRewards: [...new Set([...progress.unlockedRewards, tower.level])],
					});
				},
			})),
			{
				text: '처음 상태로 초기화',
				style: 'destructive',
				onPress: async () => {
					await AsyncStorage.removeItem(TOWER_STORAGE_KEY);
					setProgress({ ...INITIAL_PROGRESS, lastAttemptDate: DateUtils.getLocalDateString() });
				},
			},
		]);
	};

	/** 진행 카드 — 정복 현황 + 하트 + 광고 */
	const renderProgressCard = () => (
		<View style={styles.panel}>
			<View style={styles.progressHead}>
				<Text style={styles.progressTitle}>정복한 층</Text>
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
					<Text style={styles.attemptLabel}>오늘 남은 도전</Text>
					<View style={styles.heartRow}>
						{progress.attempts > 0 ? (
							Array.from({ length: Math.min(progress.attempts, 5) }).map((_, i) => (
								<IconComponent key={i} type="materialIcons" name="favorite" size={scaledSize(16)} color={Colors.error} />
							))
						) : (
							<IconComponent type="materialIcons" name="favorite-border" size={scaledSize(16)} color={Colors.darkOnPanelMuted} />
						)}
						<Text style={styles.attemptCount}>{progress.attempts}회</Text>
					</View>
				</View>

				<TouchableOpacity
					style={[styles.adButton, progress.adRewardUsed >= MAX_AD_REWARD && styles.adButtonDisabled]}
					onPress={handleWatchAd}
					disabled={progress.adRewardUsed >= MAX_AD_REWARD}
					activeOpacity={0.85}
					accessibilityRole="button"
					accessibilityLabel="광고 보고 도전 횟수 1회 늘리기">
					<IconComponent type="materialIcons" name="play-circle-filled" size={scaledSize(20)} color={Colors.textInverse} />
					<View style={styles.adTextWrap}>
						<Text style={styles.adTitle}>광고 보고 +1회</Text>
						<Text style={styles.adSub}>
							{progress.adRewardUsed >= MAX_AD_REWARD ? '오늘 모두 사용함' : `오늘 ${progress.adRewardUsed}/${MAX_AD_REWARD} 사용`}
						</Text>
					</View>
				</TouchableOpacity>
			</View>
		</View>
	);

	/** 도전 카드 — 지금 깰 차례인 층 하나 */
	const renderChallengeCard = (tower: TowerLevel) => {
		const canChallenge = progress.attempts > 0;
		return (
			<View style={[styles.panel, styles.challengePanel, { borderColor: withAlpha(tower.color, 0.55) }]}>
				<View style={styles.challengeHead}>
					<View style={[styles.levelBadge, { backgroundColor: tower.color }]}>
						{/* 층 색은 데이터에서 오므로 글씨색을 고정할 수 없다 — 면 밝기에 맞춰 고른다 */}
						<Text style={[styles.levelBadgeText, { color: onSurface(tower.color) }]}>LV.{tower.level}</Text>
					</View>
					<Text style={styles.challengeName}>{tower.name}</Text>
				</View>

				<View style={styles.bossRow}>
					<View style={[styles.bossFrame, { borderColor: tower.color, backgroundColor: withAlpha(tower.color, 0.18) }]}>
						<FastImage source={tower.bossImage} style={styles.bossImage} resizeMode={FastImage.resizeMode.contain} />
					</View>
					<View style={styles.bossTextWrap}>
						<Text style={styles.bossLabel}>{tower.bossTitle}</Text>
						<Text style={styles.bossName} numberOfLines={2}>
							{tower.bossName}
						</Text>
						<Text style={styles.bossDesc} numberOfLines={3}>
							{tower.bossDescription}
						</Text>
					</View>
				</View>

				<View style={styles.rewardRow}>
					<FastImage source={tower.reward.image} style={styles.rewardImage} resizeMode={FastImage.resizeMode.contain} />
					<View style={styles.rewardTextWrap}>
						<Text style={styles.rewardLabel}>클리어 보상</Text>
						<Text style={styles.rewardName} numberOfLines={1}>
							{tower.reward.name}
						</Text>
					</View>
				</View>

				<TouchableOpacity
					style={[styles.challengeButton, { backgroundColor: canChallenge ? tower.color : Colors.secondarySurface }]}
					onPress={() => handleStartChallenge(tower)}
					activeOpacity={0.85}
					accessibilityRole="button"
					accessibilityLabel={canChallenge ? `${tower.level}층 도전하기` : '광고 보고 도전하기'}>
					{/* 버튼 면이 층 색(민트·앰버 등 밝은 색 포함)이라 글씨·아이콘 색을 면 밝기에 맞춘다 */}
					<IconComponent
						type="materialIcons"
						name={canChallenge ? 'bolt' : 'play-circle-filled'}
						size={scaledSize(18)}
						color={canChallenge ? onSurface(tower.color) : Colors.textInverse}
					/>
					<Text style={[styles.challengeButtonText, canChallenge && { color: onSurface(tower.color) }]}>
						{canChallenge ? '도전하기 (하트 -1)' : '광고 보고 도전하기'}
					</Text>
				</TouchableOpacity>
			</View>
		);
	};

	/** 모든 층을 깼을 때 도전 카드 자리에 들어가는 마무리 카드 */
	const renderAllClearedCard = () => (
		<View style={[styles.panel, styles.challengePanel, styles.clearedPanel]}>
			<FastImage
				source={require('@/src/four/assets/tower/tower-challenge-complete.webp')}
				style={styles.clearedHero}
				resizeMode={FastImage.resizeMode.cover}
			/>
			<LinearGradient
				colors={['rgba(5, 12, 22, 0.04)', 'rgba(5, 12, 22, 0.92)']}
				style={StyleSheet.absoluteFillObject}
			/>
			<View style={styles.clearedCopy}>
				<View style={styles.clearedTitleRow}>
					<IconComponent type="materialIcons" name="emoji-events" size={scaledSize(24)} color={Colors.warningBright} />
					<Text style={styles.allClearedTitle}>모든 층을 정복했습니다!</Text>
				</View>
				<Text style={styles.allClearedSub}>정상에 올랐어요 · 보상은 홈 화면에서 확인할 수 있어요</Text>
			</View>
		</View>
	);

	/** 층 목록 한 줄 */
	const renderFloorRow = (tower: TowerLevel, index: number) => {
		const state = stateOf(tower);
		const isLocked = state === 'locked';
		return (
			<AnimatedListItem key={tower.level} index={index}>
				<View style={[styles.floorRow, state === 'current' && { borderColor: withAlpha(tower.color, 0.5) }]}>
					<View style={[styles.floorBadge, { backgroundColor: isLocked ? Colors.darkCardStrong : tower.color }]}>
						<Text style={[styles.floorBadgeText, !isLocked && { color: onSurface(tower.color) }]}>{tower.level}</Text>
					</View>
					{isLocked ? (
						<View style={styles.floorThumbLocked}>
							<IconComponent type="materialIcons" name="lock" size={scaledSize(18)} color={Colors.darkOnPanelMuted} />
						</View>
					) : (
						<FastImage source={tower.bossImage} style={styles.floorThumb} resizeMode={FastImage.resizeMode.contain} />
					)}
					<View style={styles.floorTextWrap}>
						<Text style={styles.floorName}>{tower.name}</Text>
						<Text style={styles.floorSub} numberOfLines={1}>
							{isLocked ? '이전 층을 먼저 깨야 열립니다' : tower.bossName}
						</Text>
					</View>
					{state === 'cleared' && <IconComponent type="materialIcons" name="check-circle" size={scaledSize(22)} color={Colors.primary} />}
					{state === 'current' && <Text style={[styles.floorTag, { color: tower.color }]}>도전 중</Text>}
					{isLocked && <IconComponent type="materialIcons" name="lock" size={scaledSize(18)} color={Colors.darkOnPanelMuted} />}
				</View>
			</AnimatedListItem>
		);
	};

	return (
		<View style={styles.container}>
			<LinearGradient colors={[Colors.darkPanel, Colors.darkPanelDeep, Colors.darkPanelDeepest]} style={StyleSheet.absoluteFillObject} />

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
						<Text style={styles.headerTitle}>타워 챌린지</Text>
						<Text style={styles.headerSub}>정상을 향한 여정</Text>
					</View>
					<View style={[styles.headerSide, styles.headerSideRight]}>
						<CharacterGuideButton onPress={guide.open} color={Colors.darkOnPanelSub} size={scaledSize(20)} />
					</View>
				</View>

				<ScrollView ref={scrollRef} style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
					<AnimatedListItem index={0}>
						<View style={styles.heroBanner}>
							<FastImage
								source={require('@/src/four/assets/tower/tower-challenge-hero.webp')}
								style={styles.heroBannerImage}
								resizeMode={FastImage.resizeMode.cover}
							/>
							<View style={styles.heroBannerShade} />
							<View style={styles.heroBannerCopy}>
								<Text style={styles.heroBannerEyebrow}>CLIMB TO THE TOP</Text>
								<Text style={styles.heroBannerTitle}>한 층씩, 정상을 향해</Text>
							</View>
						</View>
					</AnimatedListItem>

					<AnimatedListItem index={1}>{renderProgressCard()}</AnimatedListItem>

					<AnimatedListItem index={2}>
						{isAllCleared || !currentTower ? renderAllClearedCard() : renderChallengeCard(currentTower)}
					</AnimatedListItem>

					<Text style={styles.sectionTitle}>전체 층</Text>
					{TOWER_LEVELS.map((tower, index) => renderFloorRow(tower, index + 3))}

					<View style={styles.noticeBox}>
						<Text style={styles.noticeLine}>• 한 층마다 5문제를 모두 맞춰야 클리어예요</Text>
						<Text style={styles.noticeLine}>• 클리어하면 그 층의 보상을 받아요</Text>
						<Text style={styles.noticeLine}>• 도전은 하루 1회, 매일 자정에 다시 채워져요</Text>
						<Text style={styles.noticeLine}>• 광고를 보면 하루 {MAX_AD_REWARD}회까지 더 도전할 수 있어요</Text>
					</View>
				</ScrollView>

				<BottomHomeButton
					confirmTitle="타워 챌린지를 종료할까요?"
					backgroundColor="transparent"
					borderColor={Colors.darkCardBorder}
					textColor={Colors.darkOnPanel}
					iconColor={Colors.darkOnPanelSub}
				/>

				{/* 3 · 2 · 1 · 시작! — 타임 챌린지와 같은 연출 */}
				<ChallengeCountdown
					visible={countdownLevel !== null}
					onDone={() => {
						const level = countdownLevel;
						setCountdownLevel(null);
						if (level !== null) {
							navigation.navigate(Paths.TOWER_QUIZ, { level });
						}
					}}
				/>

				{showAd && (
					<AdmobRewardAd
						onRewarded={() => {
							saveProgress({
								...progress,
								attempts: progress.attempts + 1,
								adRewardUsed: progress.adRewardUsed + 1,
							});
							setShowAd(false);
							setNotice({ title: '성공!', message: '도전 기회 1회가 추가되었습니다! 🎉' });
						}}
						onClosed={() => {
							setShowAd(false);
							setNotice({ title: '알림', message: '광고를 끝까지 시청해야 보상이 지급됩니다.' });
						}}
						onFailed={() => {
							setShowAd(false);
							setNotice({ title: '알림', message: '광고를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' });
						}}
					/>
				)}

				<CmmDelConfirmModal
					visible={!!notice}
					title={notice?.title}
					summary={notice?.message}
					hideCancel
					confirmText="확인"
					confirmVariant="default"
					onCancel={() => setNotice(null)}
					onConfirm={() => setNotice(null)}
				/>

				<CmmDelConfirmModal
					visible={showAdConfirm}
					title="도전 횟수 부족"
					summary="광고를 시청하여 도전 기회를 얻으시겠습니까?"
					confirmText="광고 시청"
					confirmVariant="default"
					onCancel={() => setShowAdConfirm(false)}
					onConfirm={() => {
						setShowAdConfirm(false);
						handleWatchAd();
					}}
				/>

				<CharacterGuide
					visible={guide.visible}
					onClose={guide.close}
					lines={[
						'타워 챌린지는 층을 하나씩 깨며 올라가는 도전 모드입니다.',
						'지금 깰 차례인 층이 가운데 카드에 크게 나옵니다.',
						'도전은 하루 1회, 광고를 보면 최대 3번까지 더 도전할 수 있습니다!',
					]}
					title="타워 챌린지, 이렇게 올라갑니다"
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
		header: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: Spacing.lg,
			paddingTop: SpacingV.sm,
			paddingBottom: SpacingV.sm,
		},
		// 좌·우 슬롯 폭이 같아야 제목이 화면 정중앙에 온다
		headerSide: { width: scaleWidth(56), justifyContent: 'center' },
		headerSideRight: { alignItems: 'flex-end' },
		headerTitleWrap: { flex: 1, alignItems: 'center' },
		headerTitle: { fontSize: Typography.h3, fontWeight: FontWeight.heavy, color: Colors.textInverse },
		headerSub: { fontSize: Typography.caption, color: Colors.darkOnPanelSub, marginTop: SpacingV.xxs, letterSpacing: 1 },
		devButton: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.xxs,
			paddingHorizontal: Spacing.sm,
			paddingVertical: SpacingV.xxs,
			borderRadius: Radius.sm,
			borderWidth: 1,
			borderColor: withAlpha(Colors.warning, 0.5),
			backgroundColor: withAlpha(Colors.warning, 0.2),
		},
		devButtonText: { fontSize: Typography.micro, fontWeight: FontWeight.bold, color: Colors.warning },

		body: { flex: 1 },
		bodyContent: { paddingHorizontal: Spacing.lg, paddingBottom: SpacingV.xl, gap: SpacingV.md },
		heroBanner: {
			height: scaleHeight(176),
			borderRadius: Radius.xl,
			overflow: 'hidden',
			backgroundColor: Colors.darkCard,
			borderWidth: 1,
			borderColor: Colors.darkCardBorder,
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
		heroBannerEyebrow: { fontSize: Typography.micro, fontWeight: FontWeight.heavy, color: Colors.warningBright, letterSpacing: 1.2 },
		heroBannerTitle: { fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: Colors.textInverse },

		// ===== 공통 패널 =====
		panel: {
			backgroundColor: Colors.darkCard,
			borderRadius: Radius.xl,
			borderWidth: 1,
			borderColor: Colors.darkCardBorder,
			padding: Spacing.lg,
		},

		// ===== 진행 카드 =====
		progressHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
		progressTitle: { fontSize: Typography.bodySm, fontWeight: FontWeight.semibold, color: Colors.darkOnPanelSub },
		progressCount: { fontSize: Typography.h3, fontWeight: FontWeight.heavy, color: Colors.textInverse },
		progressTotal: { fontSize: Typography.bodySm, fontWeight: FontWeight.semibold, color: Colors.darkOnPanelSub },
		progressTrack: {
			height: scaleHeight(8),
			borderRadius: Radius.pill,
			backgroundColor: Colors.darkDivider,
			overflow: 'hidden',
			marginTop: SpacingV.sm,
		},
		progressFill: { height: '100%', borderRadius: Radius.pill, backgroundColor: Colors.primary },

		attemptRow: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.md, marginTop: SpacingV.md },
		attemptBox: {
			flex: 1,
			justifyContent: 'center',
			gap: SpacingV.xxs,
			paddingHorizontal: Spacing.md,
			paddingVertical: SpacingV.sm,
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: withAlpha(Colors.error, 0.35),
			backgroundColor: withAlpha(Colors.error, 0.12),
		},
		attemptLabel: { fontSize: Typography.caption, color: Colors.darkOnPanelSub, fontWeight: FontWeight.medium },
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
			backgroundColor: Colors.secondarySurface,
		},
		adButtonDisabled: { backgroundColor: Colors.darkCardStrong },
		adTextWrap: { flexShrink: 1 },
		adTitle: { fontSize: Typography.footnote, fontWeight: FontWeight.bold, color: Colors.textInverse },
		// 보조 문구는 제목(textInverse)보다 한 단계 흐려야 위계가 보인다
		adSub: { fontSize: Typography.micro, color: Colors.darkOnPanelSub, marginTop: SpacingV.xxs },

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
		bossLabel: { fontSize: Typography.micro, color: Colors.darkOnPanelSub, fontWeight: FontWeight.semibold },
		bossName: { fontSize: Typography.body, fontWeight: FontWeight.heavy, color: Colors.textInverse },
		bossDesc: { fontSize: Typography.caption, color: Colors.darkOnPanelSub, lineHeight: scaledSize(17) },

		rewardRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			paddingTop: SpacingV.md,
			borderTopWidth: 1,
			borderTopColor: Colors.darkDivider,
		},
		rewardImage: { width: scaleWidth(36), height: scaleWidth(36) },
		rewardTextWrap: { flex: 1 },
		rewardLabel: { fontSize: Typography.micro, color: Colors.darkOnPanelSub, fontWeight: FontWeight.semibold },
		rewardName: { fontSize: Typography.bodySm, fontWeight: FontWeight.bold, color: Colors.textInverse, marginTop: SpacingV.xxs },

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
			borderColor: withAlpha(Colors.warningBright, 0.5),
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
			color: Colors.darkOnPanelSub,
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
			borderColor: Colors.darkCardBorder,
			backgroundColor: Colors.darkCard,
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
			backgroundColor: Colors.darkCardStrong,
		},
		floorTextWrap: { flex: 1 },
		floorName: { fontSize: Typography.bodySm, fontWeight: FontWeight.bold, color: Colors.darkOnPanel },
		floorSub: { fontSize: Typography.micro, color: Colors.darkOnPanelSub, marginTop: SpacingV.xxs },
		floorTag: { fontSize: Typography.micro, fontWeight: FontWeight.heavy },

		// ===== 안내 =====
		noticeBox: {
			backgroundColor: Colors.darkCard,
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.darkDivider,
			padding: Spacing.lg,
			gap: SpacingV.xxs,
		},
		noticeLine: { fontSize: Typography.caption, color: Colors.darkOnPanelSub, lineHeight: scaledSize(18) },
	});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
