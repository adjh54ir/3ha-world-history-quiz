/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import withRemountOnFocus from '@/src/screens/common/withRemountOnFocus';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing } from 'react-native';
import { useIsFocused, useScrollToTop } from '@react-navigation/native';
import { router, useFocusEffect } from 'expo-router';
import FitText from '@/src/screens/common/atomic/FitText';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Tag from '@/src/screens/common/atomic/Tag';
import Colors, { HEAT_GRADIENT, withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, CardSurface, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth, contentWidth, isTablet } from '@/src/utils';
import { FadeInUp, useReducedMotion } from '@/src/screens/common/anim/Motion';
import LearnProgressService, { TimePlayRecord } from '@/src/services/LearnProgressService';
import { POINT_PER_CORRECT } from '@/src/const/ConstScoring';
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
import { compareTowerRun, ensureTowerDay, useTower, type TowerRun } from '@/src/store/slice/TowerSlice';
import { useToast } from '@/src/context/ToastContext';
import { buildRecordShareMessage, shareCapture } from '@/src/utils/BadgeShare';
import { RANK_TIERS } from '@/src/screens/common/RankBoardView';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import ScrollTopButton, { useScrollTop, useScrollTopOnChange } from '@/src/screens/common/atomic/ScrollTopButton';

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
/** 화면이 포커스마다 다시 마운트되므로 마지막 탭을 모듈에 기억한다(타워·모드에서 돌아와도 보던 탭 유지) */
const tabMemory: { last: ChallengeTab } = { last: 'time' };
/** 마지막으로 신기록을 축하한 플레이 시각 — 같은 기록을 반복 축하하지 않기 위한 키 */
const BEST_CELEBRATED_KEY = 'TIME_BEST_CELEBRATED_AT';
/** 마지막으로 축하한 타워 최고층 판의 시각 — 같은 판을 다시 축하하지 않기 위한 키 */
const TOWER_CELEBRATED_KEY = 'TOWER_BEST_CELEBRATED_AT';

/** 개인 랭킹에 보여 줄 판 수 */
const RANK_LIMIT = 10;

/**
 * 개인 랭킹 한 줄 — 1~3위는 금·은·동 메달, 나머지는 순위 숫자.
 * 기록은 기기에만 남는 내 기록이다(서버 랭킹에 올리지 않는다).
 */
const PersonalRankRow: React.FC<{ rank: number; meta: string; isNew?: boolean; tags: React.ReactNode; value: string; unit: string; first?: boolean }> = ({ rank, meta, isNew, tags, value, unit, first }) => {
	const { t } = useTranslation();
	const tier = rank <= 3 ? RANK_TIERS[rank - 1] : null;
	return (
		<FadeInUp delay={Math.min(rank - 1, 6) * 50} distance={10}>
			<View style={[styles.histRow, !first && styles.histRowBorder, rank === 1 && styles.histRowBest]}>
				<View style={[styles.histIndex, tier && { backgroundColor: rank === 1 ? Colors.surface : tier.soft }]}>
					{tier ? <IconComponent type="materialIcons" name={tier.icon} size={scaledSize(15)} color={tier.main} /> : <Text style={styles.histIndexText}>{rank}</Text>}
				</View>
				<View style={styles.histBody}>
					<View style={styles.histMetaRow}>
						<Text style={styles.histMeta} numberOfLines={1} ellipsizeMode="tail">{meta}</Text>
						{isNew && <Text style={styles.histNew}>{t('challenge.rank.new')}</Text>}
					</View>
					<View style={styles.histTagRow}>{tags}</View>
				</View>
				<View style={styles.histScoreWrap}>
					<Text style={[styles.histScore, rank === 1 && { color: Colors.goldDeep }]}>{value}</Text>
					<Text style={styles.histScoreUnit}>{unit}</Text>
				</View>
			</View>
		</FadeInUp>
	);
};

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
	const scrollTop = useScrollTop(scrollRef);
	useScrollToTop(scrollRef);
	const [tab, setTab] = useState<ChallengeTab>(tabMemory.last);
	useEffect(() => {
		tabMemory.last = tab;
	}, [tab]);
	// 필터·탭을 바꾸면 목록 맨 위부터 보여 준다
	useScrollTopOnChange(scrollRef, [tab]);
	// 규칙 안내 — 처음 들어온 사용자에게만 1회
	const guide = useCharacterGuideOnce('time-challenge');
	const [bestCombo, setBestCombo] = useState(0);
	const [timePlays, setTimePlays] = useState(0);
	const [localBest, setLocalBest] = useState(0);
	// 플레이별 점수 (최신순) — 기본 3판 노출, true면 전체 기록
	const [timeHistory, setTimeHistory] = useState<TimePlayRecord[]>([]);
	// 신기록 축하 (직전 판이 역대 최고일 때 1회)
	const [celebrateBest, setCelebrateBest] = useState(false);
	// 축하 대기 중인 판의 시각 — 컨페티가 실제로 보인 뒤 기록한다
	const celebrateAtRef = useRef<number | null>(null);
	// 최고 점수 히어로 연출 — 빛 흐름 + 트로피 펄스 (언마운트 시 정리)
	const shineAnim = useRef(new Animated.Value(0)).current;
	const trophyPulse = useRef(new Animated.Value(0)).current;
	const reducedMotion = useReducedMotion();
	// 다른 화면(타임챌린지 플레이 등)이 위에 떠 있는 동안 루프 연출을 멈춘다
	const focused = useIsFocused();
	const tower = useTower();
	const towerNext = TOWER_LEVELS.find((f) => !tower.clearedLevels.includes(f.level));
	const dispatch = useDispatch();
	const { showToast } = useToast();
	// 기록 공유 — 개인 랭킹 카드를 그대로 캡처한다
	const timeRankRef = useRef<View>(null);
	const towerRankRef = useRef<View>(null);
	// 타워 개인 최고층 갱신 축하 (방금 판이 지금까지 깬 층 중 가장 높을 때 1회)
	const [celebrateTower, setCelebrateTower] = useState<TowerRun | null>(null);

	useFocusEffect(
		useCallback(() => {
			dispatch(ensureTowerDay());
		}, [dispatch]),
	);

	// 타임챌린지 탭일 때만 내 기록 로드
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
			return () => {
				alive = false;
			};
		}, [tab]),
	);

	// 안내 모달이 떠 있는 동안에는 컨페티가 가려지므로 미뤄둔다
	const showCelebrateBest = celebrateBest && !guide.visible;
	const showCelebrateTower = !!celebrateTower && !guide.visible;
	const towerRuns = tower.runs;

	useFocusEffect(
		useCallback(() => {
			if (tab !== 'tower') return;
			const runs = towerRuns ?? [];
			const latest = runs.reduce<TowerRun | null>((m, r) => (!m || r.at > m.at ? r : m), null);
			if (!latest?.cleared || runs.some((r) => r !== latest && r.cleared && r.level >= latest.level)) return;
			let alive = true;
			AsyncStorage.getItem(TOWER_CELEBRATED_KEY).then((raw) => {
				if (alive && raw !== String(latest.at)) setCelebrateTower(latest);
			});
			return () => {
				alive = false;
			};
		}, [tab, towerRuns, setCelebrateTower]),
	);
	// 컨페티가 실제로 보일 때 축하 문구도 함께 (안내 모달에 가려진 동안은 미룬다)
	useEffect(() => {
		if (showCelebrateTower && celebrateTower) showToast(t('challenge.rank.towerBest', { n: celebrateTower.level }), 'emoji-events');
	}, [showCelebrateTower, celebrateTower, showToast, t]);

	// 최고 점수 히어로 루프 애니메이션 (타임챌린지 탭에서만)
	useEffect(() => {
		if (tab !== 'time' || reducedMotion || !focused) return;
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
	}, [tab, reducedMotion, focused, shineAnim, trophyPulse]);

	// 개인 랭킹 — 점수 높은 순(동점이면 최근 판 먼저). 가장 최근 판에는 NEW 표시
	const timeRanked = [...timeHistory].sort((a, b) => b.correct - a.correct || b.at - a.at).slice(0, RANK_LIMIT);
	const latestTimeAt = timeHistory[0]?.at;
	const towerRanked = [...(tower.runs ?? [])].sort(compareTowerRun).slice(0, RANK_LIMIT);
	const latestTowerAt = (tower.runs ?? []).reduce((m, r) => Math.max(m, r.at), 0);

	const TABS: { key: ChallengeTab; icon: string }[] = [
		{ key: 'time', icon: 'bolt' },
		{ key: 'tower', icon: 'apartment' },
		{ key: 'mode', icon: 'apps' },
	];

	return (
		<View style={styles.safe}>
			<ScrollView onScroll={scrollTop.onScroll} onContentSizeChange={scrollTop.onContentSizeChange} scrollEventThrottle={16} ref={scrollRef} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
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
									<Text style={styles.bestLabel} numberOfLines={1} ellipsizeMode="tail">{t('challenge.time.myBest')}</Text>
									<FitText style={styles.bestValue}>{t('challenge.time.scoreValue', { value: localBest.toLocaleString() })}</FitText>
								</View>
							</View>
						</View>

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

						{/* 개인 랭킹 — 내 플레이를 점수순으로 (서버 랭킹 없이 기기에만 저장) */}
						{timeRanked.length > 0 && (
							<View ref={timeRankRef} collapsable={false} style={styles.histCard}>
								<View style={styles.histHead}>
									<IconComponent type="materialIcons" name="leaderboard" size={scaledSize(18)} color={Colors.primary} />
									<Text style={styles.histTitle}>{t('challenge.rank.title')}</Text>
									<Tag label={t('challenge.rank.top', { count: timeRanked.length })} variant="plain" />
									<TouchableOpacity
										style={styles.shareBtn}
										activeOpacity={0.8}
										hitSlop={Layout.hitSlop}
										accessibilityRole="button"
										accessibilityLabel={t('challenge.rank.share')}
										onPress={() => shareCapture(timeRankRef, buildRecordShareMessage(t('challenge.rank.shareTime', { score: localBest.toLocaleString() })))}>
										<IconComponent type="materialIcons" name="ios-share" size={scaledSize(16)} color={Colors.primary} />
									</TouchableOpacity>
								</View>
								{timeRanked.map((h, i) => (
									<PersonalRankRow
										key={`${h.at}-${i}`}
										rank={i + 1}
										first={i === 0}
										meta={DateUtils.formatTimestamp(h.at, 'type2')}
										isNew={h.at === latestTimeAt && timeHistory.length > 1}
										value={(h.correct * POINT_PER_CORRECT).toLocaleString()}
										unit={t('challenge.time.unit')}
										tags={
											<>
												<View style={styles.histTag}>
													<IconComponent type="materialIcons" name="check-circle" size={scaledSize(12)} color={Colors.success} />
													<Text style={styles.histTagText}>{h.correct}/{h.solved}</Text>
												</View>
												<View style={styles.histCombo}>
													<IconComponent type="materialIcons" name="local-fire-department" size={scaledSize(12)} color={Colors.error} />
													<Text style={styles.histComboText}>{h.bestCombo}</Text>
												</View>
											</>
										}
									/>
								))}
							</View>
						)}

						{/* 주 행동 — 하단 고정 대신 기록 목록 바로 아래에 둔다 */}
						<TouchableOpacity style={styles.startBtn} activeOpacity={0.9} onPress={() => router.push(TIME_CHALLENGE_HREF as never)}>
							<IconComponent type="materialIcons" name="bolt" size={scaledSize(20)} color={Colors.onFill} />
							<Text style={styles.startBtnText}>{t('challenge.time.start')}</Text>
						</TouchableOpacity>

					</FadeInUp>
				) : tab === 'tower' ? (
					<FadeInUp>
						{(() => {
							const cleared = tower.clearedLevels.length;
							const next = towerNext;
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
						{/* 현재 층 표지판 — 지금 몇 층을 오르는 중인지 한눈에 */}
						<View style={styles.floorPlate} accessible accessibilityLabel={towerNext ? t('challenge.tower.current', { n: towerNext.level }) : t('challenge.tower.allCleared')}>
							<View style={styles.floorIcon}>
								<IconComponent type="materialIcons" name={towerNext ? 'north' : 'emoji-events'} size={scaledSize(18)} color={Colors.onFill} />
							</View>
							<Text style={styles.floorLabel} numberOfLines={1}>{towerNext ? t('challenge.tower.currentLabel') : t('challenge.tower.allCleared')}</Text>
							{towerNext && (
								<Text style={styles.floorNum}>
									{towerNext.level}
									<Text style={styles.floorUnit}>{t('challenge.tower.floorUnit')}</Text>
								</Text>
							)}
						</View>
						{/* 개인 랭킹 — 높이 오른 판 순 (깨지 못한 판도 남는다) */}
						<View ref={towerRankRef} collapsable={false} style={[styles.histCard, styles.towerRankCard]}>
							<View style={styles.histHead}>
								<IconComponent type="materialIcons" name="leaderboard" size={scaledSize(18)} color={Colors.primary} />
								<Text style={styles.histTitle}>{t('challenge.rank.title')}</Text>
								{towerRanked.length > 0 && (
									<>
										<Tag label={t('challenge.rank.top', { count: towerRanked.length })} variant="plain" />
										<TouchableOpacity
											style={styles.shareBtn}
											activeOpacity={0.8}
											hitSlop={Layout.hitSlop}
											accessibilityRole="button"
											accessibilityLabel={t('challenge.rank.share')}
											onPress={() => shareCapture(towerRankRef, buildRecordShareMessage(t('challenge.rank.shareTower', { n: towerRanked[0].level })))}>
											<IconComponent type="materialIcons" name="ios-share" size={scaledSize(16)} color={Colors.primary} />
										</TouchableOpacity>
									</>
								)}
							</View>
							{towerRanked.length === 0 ? (
								<View style={styles.rankEmptyWrap}>
									<View style={styles.rankEmptyIcon}>
										<IconComponent type="materialIcons" name="north" size={scaledSize(20)} color={Colors.primary} />
									</View>
									<Text style={styles.rankEmpty}>{t('challenge.rank.towerEmpty')}</Text>
								</View>
							) : (
								towerRanked.map((r, i) => {
									const boss = TOWER_LEVELS.find((f) => f.level === r.level)?.bossName;
									return (
										<PersonalRankRow
											key={`${r.at}-${i}`}
											rank={i + 1}
											first={i === 0}
											meta={DateUtils.formatTimestamp(r.at, 'type2')}
											isNew={r.at === latestTowerAt && towerRanked.length > 1}
											value={String(r.level)}
											unit={t('challenge.tower.floorUnit')}
											tags={
												<>
													<View style={r.cleared ? styles.histTag : styles.histTagMuted}>
														<IconComponent type="materialIcons" name={r.cleared ? 'flag' : 'replay'} size={scaledSize(12)} color={r.cleared ? Colors.success : Colors.textSecondary} />
														<Text style={r.cleared ? styles.histTagText : styles.histTagMutedText}>{r.cleared ? t('challenge.rank.cleared') : t('challenge.rank.failed')}</Text>
													</View>
													<View style={styles.histTagMuted}>
														<IconComponent type="materialIcons" name="star" size={scaledSize(12)} color={Colors.gold} />
														<Text style={styles.histTagMutedText}>{r.correct}/{r.total}</Text>
													</View>
													{!!boss && <Text style={styles.histBoss} numberOfLines={1} ellipsizeMode="tail">{boss}</Text>}
												</>
											}
										/>
									);
								})
							)}
						</View>
						<TouchableOpacity style={styles.startBtn} activeOpacity={0.9} onPress={() => router.push('/quiz/tower' as never)}>
							<IconComponent type="materialIcons" name="apartment" size={scaledSize(20)} color={Colors.onFill} />
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
			{/* 긴 목록 — 우하단 맨 위로 버튼 */}
			<ScrollTopButton visible={scrollTop.visible} toTop={scrollTop.toTop} progress={scrollTop.progress} />

			{/* 🎉 신기록 축하 — 한 번 터지고 스스로 정리된다 */}
			{/* 타임챌린지 규칙 안내 — 최초 1회, 홈에서 고른 캐릭터가 설명 */}
			<CharacterGuide
				visible={guide.visible}
				onClose={guide.close}
				// 점수는 정답 수 × POINT_PER_CORRECT(콤보 가산 없음)
				lines={[t('challenge.guide.line1', { point: POINT_PER_CORRECT }), t('challenge.guide.line2'), t('challenge.guide.line3')]}
				title={t('challenge.guide.title')}
				accent={Colors.heatDark}
			/>

			{(showCelebrateBest || showCelebrateTower) && (
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
							if (celebrateTower) AsyncStorage.setItem(TOWER_CELEBRATED_KEY, String(celebrateTower.at)).catch(() => {});
							setCelebrateBest(false);
							setCelebrateTower(null);
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

	rankHeadBody: { flex: 1, minWidth: 0 },
	// 내 최고 점수 히어로
	bestHero: { overflow: 'hidden', borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.lg, marginBottom: Layout.sectionGap },
	bestShine: { position: 'absolute', top: scaleHeight(-40), left: 0, width: scaleWidth(56), height: scaleHeight(200), backgroundColor: Colors.onBrandDivider },
	bestHeroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
	bestTrophy: { width: scaleWidth(42), height: scaleWidth(42), borderRadius: Radius.pill, backgroundColor: Colors.onBrandDivider, alignItems: 'center', justifyContent: 'center' },
	bestLabel: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textInverse, opacity: 0.92 },
	bestValue: { fontSize: Typography.h2, fontWeight: '900', color: Colors.textInverse, marginTop: SpacingV.xxs },

	// 타임챌린지 탭 — 내 기록
	statRow: { ...CardSurface, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', paddingVertical: SpacingV.lg, marginBottom: Layout.sectionGap },
	statBox: { flex: 1, alignItems: 'center' },
	statNum: { fontSize: Typography.h2, fontWeight: '900', color: Colors.textStrong },
	statLabel: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary, marginTop: SpacingV.xxs },
	statDivider: { width: 1, height: scaleHeight(32), backgroundColor: Colors.border },
	// 플레이별 점수 아코디언
	// 타임챌린지 시작 — 기록 목록 아래 인라인 pill 버튼
	startBtn: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, minHeight: Layout.ctaMinH, paddingHorizontal: Spacing.xxl, borderRadius: Radius.xl, backgroundColor: Colors.primary, marginTop: SpacingV.md },
	startBtnText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.onFill },
	// 타워챌린지 탭
	timeHeroCard: { ...CardSurface, overflow: 'hidden', borderRadius: Radius.lg, marginBottom: Layout.sectionGap },
	towerCard: { ...CardSurface, overflow: 'hidden', borderRadius: Radius.lg },
	// 태블릿은 본문 폭이 넓어 16:9 면 히어로가 화면 3분의 1을 차지한다 — 2:1 로 눌러 아래 내용이 첫 화면에 들어오게
	towerHero: { width: '100%', aspectRatio: isTablet ? 2 : 16 / 9 },
	towerBody: { paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.lg, gap: SpacingV.xs },
	towerProgressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SpacingV.sm },
	// 현재 층 표지판
	floorPlate: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: SpacingV.lg, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.sm, borderRadius: Radius.lg, backgroundColor: Colors.primarySoft },
	floorIcon: { width: scaleWidth(32), height: scaleWidth(32), borderRadius: Radius.pill, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
	floorLabel: { flex: 1, fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary },
	floorNum: { fontSize: Typography.display, fontWeight: '900', color: Colors.primaryDeep },
	floorUnit: { fontSize: Typography.callout },
	towerMeta: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary },
	towerTrack: { height: scaleHeight(8), borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt, overflow: 'hidden' },
	towerFill: { height: '100%', borderRadius: Radius.pill, backgroundColor: Colors.primary },
	// 아래 시작 버튼(marginTop md)과의 간격을 타워 탭(카드→버튼 md)과 맞춘다 — 둘 다 주면 두 배가 된다
	histCard: { ...CardSurface, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.md },
	histHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: SpacingV.sm },
	shareBtn: { width: scaleWidth(32), height: scaleWidth(32), borderRadius: Radius.pill, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
	histTitle: { flex: 1, fontSize: Typography.body, fontWeight: '900', color: Colors.textStrong },
	histRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: SpacingV.md },
	histRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
	histRowBest: { backgroundColor: Colors.goldBg, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, marginHorizontal: -Spacing.sm },
	histIndex: { width: scaleWidth(26), height: scaleWidth(26), borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
	histIndexText: { fontSize: Typography.footnote, fontWeight: '900', color: Colors.textSecondary },
	histBody: { flex: 1 },
	// 점수를 행의 주인공으로 — 오른쪽에 크게, 부가 정보는 태그로
	histScoreWrap: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xxs },
	histScore: { fontSize: Typography.title, fontWeight: '900', color: Colors.primary },
	histScoreUnit: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary },
	histMeta: { flexShrink: 1, fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary },
	histMetaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
	histNew: { fontSize: Typography.micro, fontWeight: '900', color: Colors.onFill, backgroundColor: Colors.error, borderRadius: Radius.pill, overflow: 'hidden', paddingHorizontal: Spacing.xs, paddingVertical: SpacingV.xxs },
	histTagMuted: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, borderRadius: Radius.pill },
	histTagMutedText: { fontSize: Typography.micro, fontWeight: '900', color: Colors.textSecondary },
	histBoss: { flexShrink: 1, fontSize: Typography.micro, fontWeight: '700', color: Colors.textMuted },
	towerRankCard: { marginTop: Layout.sectionGap },
	rankEmptyWrap: { alignItems: 'center', gap: SpacingV.sm, paddingVertical: SpacingV.lg },
	rankEmptyIcon: { width: scaleWidth(40), height: scaleWidth(40), borderRadius: Radius.pill, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
	rankEmpty: { fontSize: Typography.footnote, fontWeight: '600', color: Colors.textMuted, textAlign: 'center' },
	histTagRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: SpacingV.xxs },
	histTag: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, backgroundColor: Colors.successSoft, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, borderRadius: Radius.pill },
	histTagText: { fontSize: Typography.micro, fontWeight: '900', color: Colors.success },
	histCombo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, backgroundColor: Colors.errorSoft, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, borderRadius: Radius.pill },
	histComboText: { fontSize: Typography.micro, fontWeight: '900', color: Colors.error },


	// 모드 카드
	card: { ...CardSurface, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.lg, marginBottom: Layout.itemGap },
	iconChip: { width: scaleWidth(52), height: scaleWidth(52), borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
	cardBody: { flex: 1 },
	cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
	cardTitle: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textStrong },
	cardDesc: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xs, lineHeight: scaleHeight(18) },
}));
