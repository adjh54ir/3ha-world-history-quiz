/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import withRemountOnFocus from '@/src/screens/common/withRemountOnFocus';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing } from 'react-native';
import { useScrollToTop } from '@react-navigation/native';
import { router, useFocusEffect } from 'expo-router';
import FitText from '@/src/screens/common/atomic/FitText';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Tag from '@/src/screens/common/atomic/Tag';
import Colors, { HEAT_GRADIENT, withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, CardSurface, Layout, Border } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth, contentWidth } from '@/src/utils';
import { FadeInUp, useReducedMotion } from '@/src/screens/common/anim/Motion';
import RankingService from '@/src/services/RankingService';
import LearnProgressService, { TimePlayRecord } from '@/src/services/LearnProgressService';
import { POINT_PER_CORRECT } from '@/src/const/ConstScoring';
import { randomNickname } from '@/src/utils/NicknameUtils';
import { useToast } from '@/src/context/ToastContext';
import { playPop } from '@/src/utils/SoundUtils';
import CharacterGuide, { useCharacterGuideOnce, CharacterGuideButton } from '@/src/screens/common/CharacterGuide';
import DateUtils from '@/src/utils/DateUtils';
import TabHeader from '@/src/screens/common/TabHeader';
import { TAB_ILLUSTRATIONS } from '@/src/const/ConstTabIllustrationAssets';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themed } from '@/src/utils/ThemedStyles';
import { Image } from 'expo-image';
import { TOWER_LEVELS } from '@/src/const/ConstTowerData';
import { ensureTowerDay, useTower } from '@/src/store/slice/TowerSlice';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';

type ModeKey = 'mix' | 'bundle' | 'ox' | 'blank' | 'initial' | 'picture' | 'flagMatch' | 'match' | 'bookmark' | 'wrongReview' | 'weakFocus' | 'exam' | 'league';

/** 제목·설명·태그는 렌더 시점에 challenge.modes.<key>.title/desc/tag 로 번역한다 */
interface ModeCard {
	key: ModeKey;
	href: string;
	icon: string;
	color: string;
}

type ChallengeTab = 'time' | 'tower' | 'mode';

const TIME_CHALLENGE_HREF = '/quiz/speed';
/** 마지막으로 신기록을 축하한 플레이 시각 — 같은 기록을 반복 축하하지 않기 위한 키 */
const BEST_CELEBRATED_KEY = 'TIME_BEST_CELEBRATED_AT';

const MODES: ModeCard[] = themed(() => ([
	{ key: 'mix', href: '/quiz/mix', icon: 'casino', color: Colors.primary },
	{ key: 'bundle', href: '/quiz/bundle', icon: 'library-add-check', color: Colors.primary },
	{ key: 'ox', href: '/quiz/ox', icon: 'rule', color: Colors.primary },
	{ key: 'blank', href: '/quiz/blank', icon: 'edit-note', color: Colors.primary },
	{ key: 'initial', href: '/quiz/initial', icon: 'abc', color: Colors.primary },
	{ key: 'picture', href: '/quiz/picture', icon: 'photo-library', color: Colors.primary },
	{ key: 'flagMatch', href: '/quiz/match-game?mode=flag', icon: 'flag', color: Colors.primary },
	{ key: 'match', href: '/quiz/match-game', icon: 'grid-view', color: Colors.primary },
	{ key: 'bookmark', href: '/quiz/bookmark', icon: 'bookmark', color: Colors.primary },
	{ key: 'wrongReview', href: '/quiz/wrong-review', icon: 'history-edu', color: Colors.primary },
	{ key: 'weakFocus', href: '/special/weak-focus', icon: 'track-changes', color: Colors.primary },
	{ key: 'exam', href: '/special/exam', icon: 'workspace-premium', color: Colors.primary },
	{ key: 'league', href: '/special/league', icon: 'leaderboard', color: Colors.primary },
]));

/**
 * 챌린지 (Toss 스타일)
 * - 플랫 카드 · 명확한 위계 · 일관된 간격
 */
const Challenge = () => {
	const { t } = useTranslation();
	const scrollRef = useRef<any>(null);
	useScrollToTop(scrollRef);
	const [tab, setTab] = useState<ChallengeTab>('time');
	// 타임챌린지 탭: 내 기록만 노출(전체 순위는 랭킹 화면에서) + 랭킹 참여 상태
	const [myRank, setMyRank] = useState<{ rank: number; score: number } | null>(null);
	// 규칙 안내 — 처음 들어온 사용자에게만 1회
	const guide = useCharacterGuideOnce('time-challenge');
	const [nickname, setNickname] = useState<string | null>(null);
	const [nickInput, setNickInput] = useState(() => randomNickname());
	const [joining, setJoining] = useState(false);
	const [bestCombo, setBestCombo] = useState(0);
	const [timePlays, setTimePlays] = useState(0);
	const [localBest, setLocalBest] = useState(0);
	// 플레이별 점수 (최신순) — 기본 3판 노출, true면 전체 기록
	const [timeHistory, setTimeHistory] = useState<TimePlayRecord[]>([]);
	// 신기록 축하 (직전 판이 역대 최고일 때 1회)
	const [celebrateBest, setCelebrateBest] = useState(false);
	// 축하 대기 중인 판의 시각 — 컨페티가 실제로 보인 뒤 기록한다
	const celebrateAtRef = useRef<number | null>(null);
	const diceSpin = useRef(new Animated.Value(0)).current;
	// 최고 점수 히어로 연출 — 빛 흐름 + 트로피 펄스 (언마운트 시 정리)
	const shineAnim = useRef(new Animated.Value(0)).current;
	const trophyPulse = useRef(new Animated.Value(0)).current;
	const { showToast } = useToast();
	const rankingReady = RankingService.isConfigured;
	const reducedMotion = useReducedMotion();
	const tower = useTower();
	const dispatch = useDispatch();

	/** 서버 최신 점수 반영 후 내 순위 조회 (참여한 사용자만) */
	const refreshMyRank = useCallback(async () => {
		await RankingService.submit();
		const r = await RankingService.myRank('time');
		setMyRank(r);
	}, []);

	// 탭에 들어올 때마다 화면 상태를 최초 상태로 되돌린다
	useFocusEffect(
		useCallback(() => {
			setTab('time');
			setJoining(false);
			dispatch(ensureTowerDay());
		}, [dispatch]),
	);

	// 타임챌린지 탭일 때만 랭킹/기록 로드 (모드 탭에선 불필요한 네트워크 호출 방지)
	useFocusEffect(
		useCallback(() => {
			if (tab !== 'time') return;
			let alive = true;
			LearnProgressService.getStats().then((s) => {
				if (!alive) return;
				setBestCombo(s.bestComboOverall ?? 0);
				setTimePlays(s.byMode?.time ?? 0);
				setTimeHistory(s.timeHistory ?? []);
				const history = s.timeHistory ?? [];
				setLocalBest(history.reduce((m, h) => Math.max(m, h.correct * POINT_PER_CORRECT), 0));
				// 직전 판이 역대 최고 점수면(동점 제외) 아직 축하 안 한 경우에만 컨페티
				const [latest, ...rest] = history;
				if (!latest || rest.length === 0) return;
				const latestScore = latest.correct * POINT_PER_CORRECT;
				const prevBest = rest.reduce((m, h) => Math.max(m, h.correct * POINT_PER_CORRECT), 0);
				if (latestScore <= prevBest) return;
				AsyncStorage.getItem(BEST_CELEBRATED_KEY).then((raw) => {
					if (!alive || raw === String(latest.at)) return;
					// 실제로 컨페티가 보인 뒤에 '축하함'으로 기록한다 — 안내 모달에 가려진 채 소모되면 다시는 못 본다
					celebrateAtRef.current = latest.at;
					setCelebrateBest(true);
				});
			});
			// 여기서 early return 하면 아래 cleanup 이 등록되지 않아 위 getStats 콜백이 언마운트 후에도 setState 한다
			if (rankingReady) {
				(async () => {
					const nick = await RankingService.getNickname();
					if (!alive) return;
					setNickname(nick);
					if (!nick) return; // 미참여 — 참여 버튼만 노출
					await refreshMyRank();
				})().catch(() => {});
			}
			return () => {
				alive = false;
			};
		}, [tab, rankingReady, refreshMyRank]),
	);

	// 언마운트 시 주사위 회전 애니메이션 정리
	useEffect(() => () => diceSpin.stopAnimation(), [diceSpin]);

	// 안내 모달이 떠 있는 동안에는 컨페티가 가려지므로 미뤄둔다
	const showCelebrateBest = celebrateBest && !guide.visible;

	// 최고 점수 히어로 루프 애니메이션 (타임챌린지 탭에서만)
	useEffect(() => {
		if (tab !== 'time' || reducedMotion) return;
		const shine = Animated.loop(
			Animated.sequence([
				Animated.timing(shineAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
				Animated.delay(1400),
			]),
		);
		const pulse = Animated.loop(
			Animated.sequence([
				Animated.timing(trophyPulse, { toValue: 1, duration: 720, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
				Animated.timing(trophyPulse, { toValue: 0, duration: 720, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
			]),
		);
		shine.start();
		pulse.start();
		return () => {
			shine.stop();
			pulse.stop();
			shineAnim.setValue(0);
			trophyPulse.setValue(0);
		};
	}, [tab, reducedMotion, shineAnim, trophyPulse]);

	// 동점이 여러 판이면 왕관은 가장 최근 한 판에만 (목록은 최신순)
	const bestHistIndex = localBest > 0 ? timeHistory.findIndex((h) => h.correct * POINT_PER_CORRECT === localBest) : -1;

	/** 주사위 굴리기 — 닉네임 재추첨 + 회전 애니메이션 */
	const rollNickname = () => {
		playPop();
		setNickInput(randomNickname());
		diceSpin.setValue(0);
		Animated.timing(diceSpin, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
	};

	/** 랭킹 참여 — 닉네임 저장(Supabase) 후 점수 제출·내 순위 갱신 */
	const joinRanking = async () => {
		if (joining) return;
		setJoining(true);
		const nick = nickInput.trim() || randomNickname();
		const ok = await RankingService.setNickname(nick);
		if (ok) {
			setNickname(nick);
			playPop();
			showToast(t('challenge.time.joinedToast'), 'emoji-events');
			await refreshMyRank().catch(() => {});
		} else {
			showToast(t('challenge.time.joinFailedToast'), 'cloud-off');
		}
		setJoining(false);
	};

	const TABS: { key: ChallengeTab; icon: string }[] = [
		{ key: 'time', icon: 'bolt' },
		{ key: 'tower', icon: 'apartment' },
		{ key: 'mode', icon: 'apps' },
	];

	return (
		<View style={styles.safe}>
			<ScrollView ref={scrollRef} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
				<TabHeader
					title={t('challenge.header.title')}
					sub={t('challenge.header.sub')}
					illustration={TAB_ILLUSTRATIONS.challenge}
					right={<CharacterGuideButton onPress={guide.open} />}
				/>

				{/* 탭 (타임챌린지 / 타워챌린지 / 모드 선택) */}
				<View style={styles.tabBar}>
					{TABS.map((item) => {
						const on = tab === item.key;
						return (
							<TouchableOpacity key={item.key} style={[styles.tabBtn, on && styles.tabBtnOn]} activeOpacity={0.85} onPress={() => {
									setTab(item.key);
								}}>
								<IconComponent type="materialIcons" name={item.icon} size={scaledSize(16)} color={on ? Colors.primary : Colors.textMuted} />
								<Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>{t(`challenge.tabs.${item.key}`)}</Text>
							</TouchableOpacity>
						);
					})}
				</View>

				{tab === 'time' ? (
					<FadeInUp>
						<View style={styles.timeHeroCard}>
							<Image
								source={require('@/src/assets/time/time-challenge-hero.webp')}
								style={styles.towerHero}
								contentFit="cover"
								accessible={false}
							/>
							<View style={styles.towerBody}>
								<Text style={styles.cardTitle}>{t('challenge.time.heroTitle')}</Text>
								<Text style={styles.cardDesc}>{t('challenge.time.heroDesc')}</Text>
							</View>
						</View>
						{/* 타임챌린지 랭킹 — 랭킹 화면의 타임챌린지 보드를 그대로 사용 */}
						<View style={styles.boardHead}>
							<View style={styles.rankHeadLeft}>
								<View style={styles.rankIcon}>
									<IconComponent type="materialIcons" name="bolt" size={scaledSize(18)} color={Colors.primary} />
								</View>
								<View style={styles.rankHeadBody}>
									<Text style={styles.rankTitle}>{t('challenge.time.rankTitle')}</Text>
									<Text style={styles.rankDesc}>{t('challenge.time.rankDesc')}</Text>
								</View>
							</View>
							<TouchableOpacity style={styles.moreBtn} activeOpacity={0.85} onPress={() => router.push({ pathname: '/special/ranking', params: { board: 'time' } } as never)}>
								<Text style={styles.moreText}>{t('challenge.time.viewAll')}</Text>
								<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(16)} color={Colors.primary} />
							</TouchableOpacity>
						</View>

						{/* 최고 점수 히어로 — 그라데이션 + 빛 흐름 + 트로피 펄스 */}
						<View style={styles.bestHero}>
							<LinearGradient colors={HEAT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
							<Animated.View
								pointerEvents="none"
								style={[styles.bestShine, { transform: [{ translateX: shineAnim.interpolate({ inputRange: [0, 1], outputRange: [-scaleWidth(160), Math.max(scaleWidth(420), contentWidth)] }) }, { rotate: '18deg' }] }]}
							/>
							<View style={styles.bestHeroTop}>
								<Animated.View style={[styles.bestTrophy, { transform: [{ scale: trophyPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }]}>
									<IconComponent type="materialIcons" name="emoji-events" size={scaledSize(22)} color={Colors.gold} />
								</Animated.View>
								<View style={styles.rankHeadBody}>
									<Text style={styles.bestLabel} numberOfLines={1} ellipsizeMode="tail">{nickname ? t('challenge.time.bestWithNick', { nickname }) : t('challenge.time.myBest')}</Text>
									<FitText style={styles.bestValue}>{t('challenge.time.scoreValue', { value: Math.max(myRank?.score ?? 0, localBest).toLocaleString() })}</FitText>
								</View>
							</View>
							{/* 내 순위 — 점수와 같은 줄에 두면 폭이 좁은 기기에서 칩이 밀려 잘렸다. 아래 줄로 분리 */}
							<View style={styles.bestRankRow}>
								<Text style={styles.bestRankLabel}>{t('challenge.time.myRank')}</Text>
								<View style={styles.bestPill}>
									<Text style={styles.bestPillText} numberOfLines={1}>{myRank ? t('challenge.time.rankValue', { rank: myRank.rank }) : t('challenge.time.notJoined')}</Text>
								</View>
							</View>
							{nickname && <Text style={styles.bestHint}>{t('challenge.time.bestHint')}</Text>}
						</View>

						{/* 랭킹 미참여 — 닉네임 발급 후 참여 */}
						{!nickname && (
							<View style={styles.myCard}>
								{rankingReady ? (
									<>
										<Text style={styles.joinTitle}>{t('challenge.time.joinTitle')}</Text>
										<View style={styles.nickCard}>
											<Text style={styles.nickValue} numberOfLines={1}>{nickInput}</Text>
											<TouchableOpacity style={styles.diceBtn} activeOpacity={0.8} onPress={rollNickname} accessibilityRole="button" accessibilityLabel={t('challenge.time.rollA11y')}>
												<Animated.View style={{ transform: [{ rotate: diceSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
													<IconComponent type="materialIcons" name="casino" size={scaledSize(22)} color={Colors.primary} />
												</Animated.View>
											</TouchableOpacity>
										</View>
										<TouchableOpacity style={[styles.joinBtn, joining && { opacity: 0.6 }]} activeOpacity={0.9} disabled={joining} onPress={joinRanking}>
											<IconComponent type="materialIcons" name="emoji-events" size={scaledSize(18)} color={Colors.textInverse} />
											<Text style={styles.joinBtnText}>{joining ? t('challenge.time.joining') : t('challenge.time.join')}</Text>
										</TouchableOpacity>
										<Text style={styles.joinHint}>{t('challenge.time.joinHint')}</Text>
									</>
								) : (
									<Text style={styles.myCardHint}>{t('challenge.time.notReady')}</Text>
								)}
							</View>
						)}

						{/* 내 기록 요약 */}
						<View style={styles.statRow}>
							<View style={styles.statBox}>
								<FitText style={styles.statNum}>{timePlays.toLocaleString()}</FitText>
								<FitText style={styles.statLabel}>{t('challenge.time.plays')}</FitText>
							</View>
							<View style={styles.statDivider} />
							<View style={styles.statBox}>
								<FitText style={[styles.statNum, { color: Colors.error }]}>{bestCombo.toLocaleString()}</FitText>
								<FitText style={styles.statLabel}>{t('challenge.time.bestCombo')}</FitText>
							</View>
						</View>

							{/* 플레이별 점수 — 전체 기록 노출 */}
						{timeHistory.length > 0 && (
							<View style={styles.histCard}>
								<View style={styles.histHead}>
									<Text style={styles.histTitle}>{t('challenge.time.historyTitle')}</Text>
									<Tag label={t('challenge.time.historyCount', { count: timeHistory.length })} variant="plain" />
								</View>
								{timeHistory.map((h, i) => {
									// 역대 최고 점수 행은 왕관 + 배경으로 바로 눈에 띄게 (동점이면 가장 최근 한 판만)
									const score = h.correct * POINT_PER_CORRECT;
									const isBest = i === bestHistIndex;
									return (
									<View key={`${h.at}-${i}`} style={[styles.histRow, i > 0 && styles.histRowBorder, isBest && styles.histRowBest]}>
										<View style={[styles.histIndex, isBest && styles.histIndexBest]}>
											{isBest ? (
												<IconComponent type="materialIcons" name="emoji-events" size={scaledSize(14)} color={Colors.gold} />
											) : (
												<Text style={styles.histIndexText}>{timeHistory.length - i}</Text>
											)}
										</View>
										<View style={styles.histBody}>
											<Text style={styles.histMeta} numberOfLines={2} ellipsizeMode="tail">{DateUtils.formatTimestamp(h.at, 'type2')}</Text>
											<View style={styles.histTagRow}>
												<View style={styles.histTag}>
													<IconComponent type="materialIcons" name="check-circle" size={scaledSize(12)} color={Colors.success} />
													<Text style={styles.histTagText}>{h.correct}/{h.solved}</Text>
												</View>
												<View style={styles.histCombo}>
													<IconComponent type="materialIcons" name="local-fire-department" size={scaledSize(12)} color={Colors.error} />
													<Text style={styles.histComboText}>{h.bestCombo}</Text>
												</View>
											</View>
										</View>
										<View style={styles.histScoreWrap}>
											<Text style={styles.histScore}>{score.toLocaleString()}</Text>
											<Text style={styles.histScoreUnit}>{t('challenge.time.unit')}</Text>
										</View>
									</View>
									);
								})}
							</View>
						)}

						{/* 주 행동 — 하단 고정 대신 기록 목록 바로 아래에 둔다 */}
						<TouchableOpacity style={styles.startBtn} activeOpacity={0.9} onPress={() => router.push(TIME_CHALLENGE_HREF as never)}>
							<IconComponent type="materialIcons" name="bolt" size={scaledSize(20)} color={Colors.textInverse} />
							<Text style={styles.startBtnText}>{t('challenge.time.start')}</Text>
						</TouchableOpacity>

					</FadeInUp>
				) : tab === 'tower' ? (
					<FadeInUp>
						{(() => {
							const cleared = tower.clearedLevels.length;
							const next = TOWER_LEVELS.find((f) => !tower.clearedLevels.includes(f.level));
							return (
								<TouchableOpacity style={styles.towerCard} activeOpacity={0.9} onPress={() => router.push('/quiz/tower' as never)}>
									<Image source={require('@/src/assets/tower/tower-challenge-hero.webp')} style={styles.towerHero} contentFit="cover" />
									<View style={styles.towerBody}>
										<Text style={styles.cardTitle}>{next ? `LV.${next.level} ${next.bossName}` : t('challenge.tower.allCleared')}</Text>
										<Text style={styles.cardDesc}>{t('challenge.tower.desc')}</Text>
										<View style={styles.towerProgressRow}>
											<Text style={styles.towerMeta}>{t('challenge.tower.cleared', { cleared, total: TOWER_LEVELS.length })}</Text>
											<Text style={styles.towerMeta}>{t('challenge.tower.attempts', { count: tower.attempts })}</Text>
										</View>
										<View style={styles.towerTrack}>
											<View style={[styles.towerFill, { width: `${(cleared / TOWER_LEVELS.length) * 100}%` }]} />
										</View>
									</View>
								</TouchableOpacity>
							);
						})()}
						<TouchableOpacity style={styles.startBtn} activeOpacity={0.9} onPress={() => router.push('/quiz/tower' as never)}>
							<IconComponent type="materialIcons" name="apartment" size={scaledSize(20)} color={Colors.textInverse} />
							<Text style={styles.startBtnText}>{t('challenge.tower.enter')}</Text>
						</TouchableOpacity>
					</FadeInUp>
				) : (
					<>
				{MODES.map((m, i) => (
					<FadeInUp key={m.href} delay={50 + i * 45}>
						<TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => router.push(m.href as never)}>
							<View style={[styles.iconChip, { backgroundColor: withAlpha(m.color, '14') }]}>
								<IconComponent type="materialIcons" name={m.icon} size={scaledSize(25)} color={m.color} />
							</View>
							<View style={styles.cardBody}>
								<View style={styles.cardTitleRow}>
									<Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">{t(`challenge.modes.${m.key}.title`)}</Text>
									<Tag label={t(`challenge.modes.${m.key}.tag`)} color={m.color} />
								</View>
								<Text style={styles.cardDesc} numberOfLines={2}>{t(`challenge.modes.${m.key}.desc`)}</Text>
							</View>
							<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
						</TouchableOpacity>
					</FadeInUp>
				))}

					</>
				)}
		</ScrollView>

			{/* 🎉 신기록 축하 — 한 번 터지고 스스로 정리된다 */}
			{/* 타임챌린지 규칙 안내 — 최초 1회, 홈에서 고른 캐릭터가 설명 */}
			<CharacterGuide
				visible={guide.visible}
				onClose={guide.close}
				// 점수는 정답 수 × POINT_PER_CORRECT(콤보 가산 없음), 랭킹은 한 판 최고점만 반영 — RankingService.recordTimeChallenge
				lines={[t('challenge.guide.line1'), t('challenge.guide.line2', { point: POINT_PER_CORRECT }), t('challenge.guide.line3')]}
				title={t('challenge.guide.title')}
				accent={Colors.heatDark}
			/>

			{showCelebrateBest && (
				<View pointerEvents="none" style={StyleSheet.absoluteFill}>
					<ConfettiCannon
						count={120}
						origin={{ x: contentWidth / 2, y: -10 }}
						fadeOut
						autoStart
						explosionSpeed={380}
						// 실제로 재생을 마친 시점에만 '축하함'으로 기록 — 가려진 채 소모되지 않게
						onAnimationEnd={() => {
							if (celebrateAtRef.current != null) {
								AsyncStorage.setItem(BEST_CELEBRATED_KEY, String(celebrateAtRef.current)).catch(() => {});
								celebrateAtRef.current = null;
							}
							setCelebrateBest(false);
						}}
					/>
				</View>
			)}
		</View>
	);
};

export default withRemountOnFocus(Challenge);

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.background },
	container: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },

	// 탭 바
	tabBar: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: Spacing.xs, marginBottom: SpacingV.xl },
	tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: SpacingV.sm, borderRadius: Radius.md },
	tabBtnOn: { backgroundColor: Colors.surface },
	tabText: { fontSize: Typography.body, fontWeight: '800', color: Colors.textMuted },
	tabTextOn: { color: Colors.primary },

	// 타임챌린지 탭 — 랭킹 보드 (랭킹 화면 공용 컴포넌트 사용)
	boardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, marginBottom: SpacingV.lg },
	rankHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
	rankHeadBody: { flex: 1, minWidth: 0 },
	rankIcon: { width: scaleWidth(38), height: scaleWidth(38), borderRadius: Radius.md, backgroundColor: withAlpha(Colors.primary, '14'), alignItems: 'center', justifyContent: 'center' },
	rankTitle: { fontSize: Typography.callout, fontWeight: '900', color: Colors.textStrong },
	rankDesc: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xxs },
	moreBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, backgroundColor: Colors.primaryBg, borderRadius: Radius.pill, paddingLeft: Spacing.md, paddingRight: Spacing.sm, paddingVertical: SpacingV.xs },
	moreText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.primary },
	// 내 기록 카드 + 랭킹 참여
	myCard: { backgroundColor: Colors.primaryBg, borderWidth: 1, borderColor: Colors.primarySoft, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.lg, marginBottom: SpacingV.md },
	bestHero: { overflow: 'hidden', borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.lg, marginBottom: SpacingV.md },
	bestShine: { position: 'absolute', top: scaleHeight(-40), left: 0, width: scaleWidth(56), height: scaleHeight(200), backgroundColor: Colors.onBrandDivider },
	bestHeroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
	bestTrophy: { width: scaleWidth(42), height: scaleWidth(42), borderRadius: Radius.pill, backgroundColor: Colors.onBrandDivider, alignItems: 'center', justifyContent: 'center' },
	bestLabel: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textInverse, opacity: 0.92 },
	bestValue: { fontSize: Typography.h2, fontWeight: '900', color: Colors.textInverse, marginTop: SpacingV.xxs },
	bestRankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SpacingV.md },
	bestRankLabel: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textInverse, opacity: 0.92 },
	// flexShrink:0 — 점수가 길어져도 '내 순위' 칩이 눌려 잘리지 않게 고정
	bestPill: { flexShrink: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm },
	bestPillText: { fontSize: Typography.footnote, fontWeight: '900', color: Colors.heatDeep },
	bestHint: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textInverse, opacity: 0.9, marginTop: SpacingV.md },
	myCardHint: { fontSize: Typography.footnote, fontWeight: '600', color: Colors.textSecondary, marginTop: SpacingV.md },
	joinTitle: { fontSize: Typography.body, fontWeight: '800', color: Colors.textStrong, marginBottom: SpacingV.md },
	nickCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderWidth: Border.thin, borderColor: Colors.primarySoft, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.md },
	nickValue: { flex: 1, fontSize: Typography.callout, fontWeight: '900', color: Colors.textStrong },
	diceBtn: { width: scaleWidth(40), height: scaleWidth(40), borderRadius: Radius.md, backgroundColor: Colors.primaryBg, borderWidth: 1, borderColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
	joinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: SpacingV.md, marginTop: SpacingV.md },
	joinBtnText: { flexShrink: 1, color: Colors.textInverse, fontSize: Typography.body, fontWeight: '900' },
	joinHint: { fontSize: Typography.footnote, fontWeight: '600', color: Colors.textMuted, textAlign: 'center', marginTop: SpacingV.sm },

	// 타임챌린지 탭 — 내 기록
	statRow: { ...CardSurface, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', paddingVertical: SpacingV.lg, marginBottom: SpacingV.md },
	statBox: { flex: 1, alignItems: 'center' },
	statNum: { fontSize: Typography.h2, fontWeight: '900', color: Colors.textStrong },
	statLabel: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary, marginTop: SpacingV.xxs },
	statDivider: { width: 1, height: scaleHeight(32), backgroundColor: Colors.border },
	// 플레이별 점수 아코디언
	// 타임챌린지 시작 — 기록 목록 아래 인라인 pill 버튼
	startBtn: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, minHeight: scaleHeight(46), paddingHorizontal: Spacing.xxl, borderRadius: Radius.xl, backgroundColor: Colors.primary, marginTop: SpacingV.md },
	startBtnText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textInverse },
	// 타워챌린지 탭
	timeHeroCard: { ...CardSurface, overflow: 'hidden', borderRadius: Radius.lg, marginBottom: SpacingV.lg },
	towerCard: { ...CardSurface, overflow: 'hidden', borderRadius: Radius.lg },
	towerHero: { width: '100%', aspectRatio: 16 / 9 },
	towerBody: { paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.lg, gap: SpacingV.xs },
	towerProgressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SpacingV.sm },
	towerMeta: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary },
	towerTrack: { height: scaleHeight(8), borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt, overflow: 'hidden' },
	towerFill: { height: '100%', borderRadius: Radius.pill, backgroundColor: Colors.primary },
	histCard: { ...CardSurface, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.md, marginBottom: SpacingV.md },
	histHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: SpacingV.sm },
	histTitle: { flex: 1, fontSize: Typography.body, fontWeight: '900', color: Colors.textStrong },
	histRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: SpacingV.md },
	histRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
	histRowBest: { backgroundColor: Colors.goldBg, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, marginHorizontal: -Spacing.sm },
	histIndexBest: { backgroundColor: Colors.surface },
	histIndex: { width: scaleWidth(26), height: scaleWidth(26), borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
	histIndexText: { fontSize: Typography.footnote, fontWeight: '900', color: Colors.textSecondary },
	histBody: { flex: 1 },
	// 점수를 행의 주인공으로 — 오른쪽에 크게, 부가 정보는 태그로
	histScoreWrap: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xxs },
	histScore: { fontSize: Typography.title, fontWeight: '900', color: Colors.primary },
	histScoreUnit: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary },
	histMeta: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary },
	histTagRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: SpacingV.xxs },
	histTag: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, backgroundColor: Colors.successSoft, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, borderRadius: Radius.pill },
	histTagText: { fontSize: Typography.micro, fontWeight: '900', color: Colors.success },
	histCombo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, backgroundColor: Colors.errorSoft, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, borderRadius: Radius.pill },
	histComboText: { fontSize: Typography.micro, fontWeight: '900', color: Colors.error },


	// 모드 카드
	card: { ...CardSurface, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, marginBottom: Layout.itemGap },
	iconChip: { width: scaleWidth(52), height: scaleWidth(52), borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.lg },
	cardBody: { flex: 1 },
	cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
	cardTitle: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textStrong },
	cardDesc: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xs, lineHeight: scaleHeight(18) },
}));
