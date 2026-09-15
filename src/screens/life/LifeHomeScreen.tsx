import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useDispatch } from 'react-redux';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import ScrollTopButton from '@/src/screens/common/atomic/ScrollTopButton';
import MascotImage from '@/src/screens/common/atomic/MascotImage';
import { showToast } from '@/src/screens/common/atomic/GlobalToast';
import ActionCard from './common/ActionCard';
import MissionCard from './common/MissionCard';
import PetAvatar from './common/PetAvatar';
import LifeCharacterGuide, { LifeGuideButton, useCharacterGuideOnce } from './common/LifeCharacterGuide';
import ProgressBar from './common/ProgressBar';
import { Palette, onSurface } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useAttendancePet, useLife, usePet, useStreak } from '@/src/hooks/useLife';
import { useAnimationRunner, useScreenEnter } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { checkIn, ensureDaily } from '@/src/store/slice/LifeSlice';
import { BADGES } from '@/src/const/data/life/ConstLifeRewards';
import { attendanceExpReward, attendanceFeedReward, TIME_CHALLENGE_SEC, TOWER_LIVES } from '@/src/services/life/LifeRules';
import { Paths, tabPath } from '@/src/navigation/conf/Paths';
import { playAttendance, playPop } from '@/src/utils/SoundUtils';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import DateUtils from '@/src/utils/DateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CheckInModal from '@/src/four/screens/modal/CheckInModal';
import StudyModeModal from './modal/StudyModeModal';
import BadgeMedal from './common/BadgeMedal';
import BadgeDetailModal, { type BadgeDetail } from './modal/BadgeDetailModal';
import TowerRewardSection from '@/src/four/screens/common/TowerRewardSection';
import { MainStorageKeyType } from '@/src/four/types/MainStorageKeyType';
import { selectPetImage } from '@/src/const/data/life/ConstPetImages';

const ATTEND_MASCOT = require('@/src/assets/illustrations/lion-attendance.webp');

/** 지금 시각대에 맞는 인사말 */
const greeting = () => {
	const hour = DateUtils.getLocalHour();
	if (hour < 6) return '늦은 밤, 한 문제만 더 볼까요?' as const;
	if (hour < 12) return '좋은 아침! 오늘의 퀴즈로 시작해요' as const;
	if (hour < 18) return '오후에도 한 걸음, 한 가지씩' as const;
	return '하루를 정리하며 세계 한 바퀴' as const;
};

/** 펫을 누를 때마다 돌아가며 나오는 말 */
const PET_SPEECH = ['오늘도 한 가지, 같이 해요!', '세계는 넓고 볼 것은 많아요', '조금씩 매일이 제일 빨라요', '출석 도장 잊지 마세요!'] as const;

/** 출석 수호신(청룡)이 하는 말 — 사자와 같은 말풍선을 쓰므로 문장으로 누가 말하는지 알린다 */
const DRAGON_SPEECH = ['청룡이에요. 먹이 주면 무럭무럭 자라요!', '출석 도장을 찍으면 먹이가 하나 생겨요', '나의 활동에서 저를 먹일 수 있어요', '같이 세계 한 바퀴 돌아요!'] as const;

/**
 * 히어로 무대 높이 — 글방 배경과 캐릭터 줄이 같은 값을 쓴다.
 * 따로 두면 글방이 줄 아래로 삐져나와 "사자를 누르면 한마디 해요" 글씨 뒤에 바닥 띠가 깔렸다.
 */
/** 이만큼 내려가면 "맨 위로" 버튼을 띄운다 */
const SCROLL_TOP_THRESHOLD = scaleHeight(420);

/**
 * 앱을 켠 뒤 출석 팝업을 한 번 띄웠는지.
 * 모듈 변수라 앱이 살아 있는 동안 유지된다 — 홈 탭을 오갈 때마다 팝업이 다시 뜨지 않는다.
 * (앱을 완전히 껐다 켜면 다시 false 가 되어 그날 첫 실행에 또 뜬다)
 */
let openedOnLaunch = false;

/** 스플래시 연출이 끝나고 홈이 자리를 잡은 뒤에 팝업을 띄운다 */
const LAUNCH_POPUP_DELAY = 900;

/**
 * 홈 — 펫·출석·레벨을 담은 히어로 위에, 할 일을 큰 카드로 죽 늘어놓는다.
 * 카드 묶음 사이에는 안내 배너를 끼워 어디까지가 한 묶음인지 보이게 한다.
 */
const LifeHomeScreen = () => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const guide = useCharacterGuideOnce('life-home');
	const dispatch = useDispatch();
	const life = useLife();
	const pet = usePet();
	const attendancePet = useAttendancePet();
	const { streak, checkedToday } = useStreak();
	const enterStyle = useScreenEnter();
	const run = useAnimationRunner();
	const scrollRef = useRef<ScrollView>(null);
	const [showTop, setShowTop] = useState(false);
	const stamp = useRef(new Animated.Value(1)).current;
	const speechAnim = useRef(new Animated.Value(0)).current;
	const [speech, setSpeech] = useState<string | null>(null);
	/** 출석 달력 팝업 — 도장을 찍고 나면 달력과 펫 보상 진행도를 함께 보여 준다 */
	const [showCheckIn, setShowCheckIn] = useState(false);
	/** 학습 방식 고르기 팝업 — 카드 학습 / 숏폼 학습 */
	const [showStudyMode, setShowStudyMode] = useState(false);
	/** 상세로 펼쳐 둔 뱃지 — 홈 뱃지 줄에서 하나를 누르면 채워진다 */
	const [badgeDetail, setBadgeDetail] = useState<BadgeDetail | null>(null);
	const [showStamp, setShowStamp] = useState(false);
	const stampAnim = useRef(new Animated.Value(0)).current;
	/** 도장을 지우는 타이머 — 화면을 벗어나도 살아남으므로 핸들을 들고 있는다 */
	const stampTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	/** 말풍선을 지우는 타이머 — 화면을 벗어나도 살아남으므로 핸들을 들고 있는다 */
	const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	/** 타워 챌린지에서 깬 층의 보상 — 타워 화면이 AsyncStorage 에 직접 쓰므로 여기서 읽어 온다 */
	const [towerRewards, setTowerRewards] = useState<number[]>([]);
	const attendanceExp = attendanceExpReward(streak + 1);

	// 탭으로 돌아올 때마다 확인한다 — 날짜가 바뀌었거나 설정에서 초기화한 뒤에도 오늘의 퀴즈가 비지 않게
	useFocusEffect(
		useCallback(() => {
			dispatch(ensureDaily());
			AsyncStorage.getItem(MainStorageKeyType.TOWER_CHALLENGE_PROGRESS)
				.then((saved) => setTowerRewards(saved ? (JSON.parse(saved).unlockedRewards ?? []) : []))
				.catch(() => setTowerRewards([]));
			return () => {
				if (speechTimer.current) {
					clearTimeout(speechTimer.current);
					speechTimer.current = null;
				}
				if (stampTimer.current) {
					clearTimeout(stampTimer.current);
					stampTimer.current = null;
				}
			};
		}, [dispatch]),
	);

	/**
	 * 출석 팝업을 연다 — 도장은 팝업 안 '출석하고 보상받기' 버튼으로 직접 찍는다.
	 */
	const openCheckIn = useCallback(() => {
		playPop();
		setShowCheckIn(true);
	}, []);

	/**
	 * 출석 도장을 찍고 보상을 받는다 — 팝업의 버튼에서만 부른다.
	 * 예전에는 팝업이 열리는 순간 저절로 찍혀 무엇을 받았는지 남지 않았다.
	 */
	const claimCheckIn = useCallback(() => {
		if (checkedToday) {
			return;
		}
		dispatch(checkIn());
		playAttendance();
		stamp.setValue(0.6);
		run(Animated.spring(stamp, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }));
		// 7일마다 오는 특별 출석은 먹이를 여러 개 준다 — 리듀서와 같은 규칙으로 미리 세어 알린다
		const feeds = attendanceFeedReward(streak + 1);
		showToast(`출석 완료! +${attendanceExp}EXP · 펫 먹이 ${feeds}개`, 'calendar-check', {
			image: ATTEND_MASCOT,
			subMessage: feeds > 1 ? `${streak + 1}일 특별 출석! 먹이를 ${feeds}개 받았어요` : streak + 1 > 1 ? `${streak + 1}일 연속 출석 중이에요` : '내일도 만나요!',
		});

		// 팝업은 이미 열려 있다 — 그 안에서 도장이 찍히는 연출만 돌린다
		setShowStamp(true);
		stampAnim.setValue(0);
		// 오버슈트 키프레임을 넣어 뒀으므로 가속 곡선은 완만하게 둔다 (exp 면 중간 단계가 다 지나가 버린다)
		run(Animated.timing(stampAnim, { toValue: 1, duration: 760, easing: Easing.out(Easing.cubic), useNativeDriver: true }), () => {
			if (stampTimer.current) {
				clearTimeout(stampTimer.current);
			}
			stampTimer.current = setTimeout(() => setShowStamp(false), 3200);
		});
	}, [attendanceExp, checkedToday, dispatch, run, stamp, stampAnim, streak]);

	/**
	 * 앱을 켜면 출석 팝업이 저절로 뜬다 — 도장은 사용자가 버튼으로 찍는다.
	 * 스플래시·앱 오프닝 광고와 겹치지 않게 잠깐 뒤에 연다.
	 */
	useEffect(() => {
		if (openedOnLaunch) {
			return;
		}
		openedOnLaunch = true;
		const timer = setTimeout(() => setShowCheckIn(true), LAUNCH_POPUP_DELAY);
		return () => clearTimeout(timer);
		// 앱 실행당 한 번만 도는 연출이다
	}, []);

	/**
	 * 달력에 칠할 출석일.
	 * 오늘은 다른 색으로 두어 "오늘 찍었다"가 한눈에 보이게 한다.
	 */
	const checkedInDates = useMemo(() => {
		const today = DateUtils.getLocalDateString();
		return Object.fromEntries(
			life.attendance.map((date) => [
				date,
				{
					customStyles: {
						container: { backgroundColor: date === today ? Colors.secondaryDark : Colors.primary, borderRadius: Radius.sm },
						text: { color: Colors.textInverse, fontWeight: FontWeight.bold },
					},
				},
			]),
		);
	}, [Colors.primary, Colors.secondaryDark, Colors.textInverse, life.attendance]);

	/**
	 * 팝업 위로 쿵 내려앉는 출석 도장.
	 * 자리는 팝업(CheckInModal)이 잡는다 — 여기서는 움직임만 만든다.
	 * 크게 들어와 제 크기를 지나쳤다가 자리를 잡고, 기울어졌던 몸이 바로 선다.
	 */
	const stampStyle = useMemo(
		() => ({
			opacity: stampAnim.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 1, 1] }),
			transform: [
				{ scale: stampAnim.interpolate({ inputRange: [0, 0.45, 0.72, 1], outputRange: [0.35, 1.16, 0.96, 1] }) },
				{ rotate: stampAnim.interpolate({ inputRange: [0, 0.72, 1], outputRange: ['-14deg', '3deg', '0deg'] }) },
			],
		}),
		[stampAnim],
	);

	/**
	 * 캐릭터를 누르면 말풍선이 잠깐 떴다 사라진다 (뛰어오르는 연출은 PetAvatar 가 스스로 한다).
	 * 사자와 청룡이 말풍선 하나를 같이 쓴다 — 청룡 옆에 따로 띄우면 말풍선이 사자 머리를 덮었다.
	 */
	const speak = useCallback(
		(lines: readonly string[]) => {
			playPop();
			setSpeech(lines[Math.floor(Math.random() * lines.length)]);
			speechAnim.setValue(0);
			run(Animated.spring(speechAnim, { toValue: 1, friction: 7, tension: 120, useNativeDriver: true }));
			if (speechTimer.current) {
				clearTimeout(speechTimer.current);
			}
			speechTimer.current = setTimeout(() => setSpeech(null), 2400);
		},
		[run, speechAnim],
	);
	const onPressPet = useCallback(() => speak(PET_SPEECH), [speak]);

	const go = (pathname: string, params?: Record<string, string>) => {
		playPop();
		router.push({ pathname: `/${pathname}`, params } as never);
	};

	/**
	 * 청룡 누르기.
	 * 먹이를 들고 있으면 한마디 하는 것보다 먹이러 가는 편이 낫다 — 출석으로 받은 먹이가
	 * 가방에만 쌓여 성장으로 이어지지 않던 고리를 여기서 잇는다.
	 * 다 자랐거나 먹이가 없으면 예전처럼 한마디 한다.
	 */
	const onPressDragon = useCallback(() => {
		if (attendancePet.feeds > 0 && attendancePet.next) {
			playPop();
			router.push(`/${tabPath(Paths.PROFILE)}` as never);
			return;
		}
		speak(DRAGON_SPEECH);
	}, [attendancePet.feeds, attendancePet.next, speak]);

	const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		setShowTop(event.nativeEvent.contentOffset.y > SCROLL_TOP_THRESHOLD);
	};

	/** 딴 뱃지 — 획득 일시를 함께 들고 다녀 상세에서 "언제 땄는지" 까지 보여 준다 */
	const earnedBadges = life.badges
		.map((item) => {
			const badge = BADGES.find((entry) => entry.id === item.id);
			return badge ? { badge, at: item.at } : null;
		})
		.filter((item) => !!item);

	return (
		<SafeAreaView style={styles.safe} edges={['left', 'right']}>
			<ScrollView
				ref={scrollRef}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				onScrollBeginDrag={Keyboard.dismiss}
				onScroll={onScroll}
				scrollEventThrottle={64}>
				<Animated.View style={[styles.stack, enterStyle]}>
					{/* ── 히어로 : 펫 · 레벨 · 출석 ───────────────────────── */}
					<View style={styles.hero}>
						{/* 히어로 광택 — 왼쪽 위에서 빛이 들어오고 아래로 갈수록 깊어진다 (게임 HUD 패널 느낌) */}
						<LinearGradient
							pointerEvents="none"
							colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0.14)']}
							locations={[0, 0.55, 1]}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
							style={styles.heroGlow}
						/>
						<View style={styles.heroTop}>
							<View style={[styles.streakChip, streak > 0 && styles.streakChipActive]}>
								<IconComponent type="materialCommunityIcons" name="fire" size={14} color={streak > 0 ? Colors.accentAmber : Colors.brandBlockMuted} />
								<Text style={styles.streakText} numberOfLines={1}>
									{streak > 0 ? `${streak}일 연속 출석` : '오늘 출석하고 스트릭 시작'}
								</Text>
							</View>
							<View style={styles.heroTopRight}>
								{/* 화면 사용법 다시보기 — 히어로는 진한 파랑 판이라 밝은 톤으로 둔다 */}
								<LifeGuideButton onPress={guide.open} color={Colors.brandBlockMuted} size={20} />
							</View>
						</View>

						{/* 인사 말풍선 — 펫을 누르면 펫의 말로 바뀐다 */}
						<View style={styles.speechWrap}>
							<Animated.View
								style={[
									styles.speechBubble,
									speech
										? {
												opacity: speechAnim,
												transform: [{ scale: speechAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
											}
										: null,
								]}>
								<Text style={styles.speechText} numberOfLines={2}>
									{speech ?? greeting()}
								</Text>
							</Animated.View>
							<View style={styles.speechTail} />
						</View>

						{/* 캐릭터는 화면 한가운데 고정, 출석 수호신은 그 오른쪽에 겹쳐 세운다 */}
						<View style={styles.heroDuo}>
							<PetAvatar size={scaleWidth(112)} plate={false} onPress={onPressPet} />
							<View style={styles.heroPetSlot} pointerEvents="box-none">
								<FloatingPet pet={attendancePet} onPress={onPressDragon} />
							</View>
						</View>
						<Text style={styles.petHint}>역사 사자를 누르면 한마디 해요</Text>
						<View style={styles.levelRow}>
							<Text style={styles.petName} numberOfLines={1}>
								{pet.petName}
							</Text>
							<PressableScale style={styles.levelChip} onPress={() => go(Paths.GRADE)} scaleTo={0.94} accessibilityRole="button">
								<Text style={styles.levelText}>{`Lv.${pet.level} ${pet.stage.label}`}</Text>
								<IconComponent type="materialIcons" name="chevron-right" size={14} color={Colors.brandBlockText} />
							</PressableScale>
						</View>
						<View style={styles.gaugeBox}>
							<ProgressBar ratio={pet.ratio} color={Colors.brandBlockMuted} trackColor="rgba(255,255,255,0.18)" height={scaleHeight(8)} shine />
							<Text style={styles.gaugeText}>{pet.next ? `다음 단계까지 ${(pet.next.minExp - pet.exp).toLocaleString()}EXP` : '마지막 단계에 도달했어요'}</Text>
						</View>

						<Animated.View style={[styles.checkWrap, { transform: [{ scale: stamp }] }]}>
							<PressableScale
								style={[styles.checkButton, checkedToday && styles.checkButtonDone]}
								onPress={openCheckIn}
								accessibilityRole="button"
								accessibilityLabel={checkedToday ? '오늘 출석 완료' : `출석 체크, 경험치 ${attendanceExp}`}>
								<IconComponent type="materialCommunityIcons" name="star-four-points-circle" size={scaleWidth(24)} color={Colors.brandBlockText} />
								<Text style={[styles.checkText, checkedToday && styles.checkTextDone]}>
									{checkedToday ? '오늘 출석 완료' : `출석 체크  +${attendanceExp}EXP`}
								</Text>
							</PressableScale>
						</Animated.View>

						{/* 모은 뱃지 — 희귀도 색 메달로 세우고, 누르면 상세가 열린다 (없으면 줄 자체를 두지 않는다) */}
						{earnedBadges.length > 0 && (
							<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll} contentContainerStyle={styles.badgeRow}>
								{earnedBadges.map((item) => (
									<PressableScale
										key={item.badge.id}
										onPress={() => {
											playPop();
											setBadgeDetail(item);
										}}
										scaleTo={0.9}
										accessibilityRole="button"
										accessibilityLabel={`${item.badge.label} 뱃지 자세히 보기`}>
										<BadgeMedal badge={item.badge} size={scaleWidth(38)} showStars />
									</PressableScale>
								))}
							</ScrollView>
						)}
					</View>

					{/* ── 오늘의 미션 — 퀴즈 · 학습 · 오답 복습 ── */}
					<MissionCard
						onPressMission={(key) => (key === 'review' ? go(Paths.WORLD_QUIZ, { source: 'wrong' }) : go(Paths.WORLD))}
					/>

					{/* ── 배우기 ─────────────────────────────────────────── */}
					<Text style={styles.sectionTitle}>배우기</Text>
					<View style={styles.cardGrid}>
						<ActionCard
							index={0}
							style={styles.gridCard}
							iconName="head-question"
							label="퀴즈 시작하기"
							description="수도·국기·신화·별자리까지 주제를 골라서 풀어요"
							color={Colors.primary}
							tint={Colors.primarySoft}
							onPress={() => go(Paths.WORLD)}
						/>
						<ActionCard
							index={1}
							style={styles.gridCard}
							iconName="cards"
							label="학습 모드"
							description="카드로 한 장씩, 숏폼으로 주르륵 — 골라서 익혀요"
							color={Colors.secondaryDark}
							tint={Colors.secondarySoft}
							onPress={() => {
								playPop();
								setShowStudyMode(true);
							}}
						/>
					</View>

					<ActionCard
						index={2}
						iconName="notebook-edit"
						label="오답 복습"
						description={life.wrong.length ? `틀린 문제 ${life.wrong.length}개가 기다려요. 두 번 맞히면 졸업!` : '오답 노트가 깨끗해요. 퀴즈를 풀면 여기에 모여요'}
						color={Colors.error}
						tint={Colors.errorSoft}
						onPress={() => go(Paths.WORLD_QUIZ, { source: 'wrong' })}
					/>
					{/* ── 도전 ───────────────────────────────────────────── */}
					<Text style={styles.sectionTitle}>도전하기</Text>
					<View style={styles.cardGrid}>
						<ActionCard
							index={4}
							style={styles.gridCard}
							iconName="timer"
							label="타임 챌린지"
							description={life.bestTime ? `최고 ${life.bestTime}점 · 오늘 기록을 넘어 볼까요?` : `${TIME_CHALLENGE_SEC}초 안에 최대한 많이 맞혀 보세요`}
							color={Colors.accentOrange}
							tint={Colors.warningSoft}
							onPress={() => go(Paths.TIME_CHALLENGE_INIT)}
						/>
						<ActionCard
							index={5}
							style={styles.gridCard}
							iconName="office-building"
							label="타워 챌린지"
							description={life.bestTower ? `최고 ${life.bestTower}층 · 더 높이 올라가 볼까요?` : `목숨 ${TOWER_LIVES}개로 한 층씩 올라가요`}
							color={Colors.primaryDeep}
							tint={Colors.primarySoft}
							onPress={() => go(Paths.TOWER)}
						/>
					</View>

					{/* 타워에서 얻은 보상 — 하나도 없으면 아무것도 그리지 않는다 */}
					<TowerRewardSection unlockedRewards={towerRewards} />

					{/* ── 기록 ───────────────────────────────────────────── */}
					<Text style={styles.sectionTitle}>기록 보기</Text>
					<View style={styles.quickRow}>
						<PressableScale style={styles.quick} onPress={() => go(tabPath(Paths.PROFILE))}>
							<View style={[styles.quickIcon, { backgroundColor: Colors.warningSoft }]}>
								<IconComponent type="materialCommunityIcons" name="trophy-variant" size={20} color={Colors.warning} />
							</View>
							<Text style={styles.quickTitle}>뱃지</Text>
							<Text style={styles.quickSub} numberOfLines={1}>
								{`${life.badges.length} / ${BADGES.length}개`}
							</Text>
						</PressableScale>
						<PressableScale
							style={styles.quick}
							onPress={() => {
								playPop();
								setShowCheckIn(true);
							}}>
							<View style={[styles.quickIcon, { backgroundColor: Colors.primarySoft }]}>
								<IconComponent type="materialCommunityIcons" name="calendar-check" size={20} color={Colors.primaryDark} />
							</View>
							<Text style={styles.quickTitle}>출석</Text>
							<Text style={styles.quickSub} numberOfLines={1}>
								{`${life.attendance.length}일 출석`}
							</Text>
						</PressableScale>
					</View>

				</Animated.View>
			</ScrollView>

			<ScrollTopButton visible={showTop} onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} />


			{/* 뱃지 상세 — 이름·설명·획득 조건·희귀도를 한 장에 */}
			<BadgeDetailModal detail={badgeDetail} onClose={() => setBadgeDetail(null)} />

			{/* 학습 방식 고르기 — 고르면 시트를 먼저 닫고 이동한다 */}
			<StudyModeModal
				visible={showStudyMode}
				onClose={() => setShowStudyMode(false)}
				onPickCard={() => {
					setShowStudyMode(false);
					go(Paths.WORLD);
				}}
				onPickShorts={() => {
					setShowStudyMode(false);
					go(Paths.SHORTS);
				}}
			/>

			{/* 출석 달력 — 도장·오늘 받은 펫 먹이·특별 출석 진행도를 한 장에 모아 보여 준다 */}
			<CheckInModal
				visible={showCheckIn}
				isCheckedIn={checkedToday}
				checkedInDates={checkedInDates}
				mascot={selectPetImage(pet.level)}
				showStamp={showStamp}
				stampStyle={stampStyle}
				onClaim={claimCheckIn}
				onClose={() => {
					setShowCheckIn(false);
					setShowStamp(false);
				}}
			/>
			{/* 화면 사용법 — 처음 들어오면 한 번, 이후에는 헤더의 물음표로 다시 본다 */}
			<LifeCharacterGuide visible={guide.visible} onClose={guide.close} lines={[
				'홈은 하루를 시작하는 자리예요. 출석 도장을 찍으면 경험치와 펫 먹이를 받아요.',
				'사자를 누르면 한마디 하고, 학습할수록 단계가 올라가요.',
				'아래 카드로 학습·퀴즈·챌린지에 바로 들어갈 수 있어요.',
			]} />
		</SafeAreaView>
	);
};

/**
 * 히어로 오른쪽에 서는 출석 보상 청룡.
 * -------------------------------------------------
 * 첫 출석 전에는 보이지 않고, 획득 뒤에는 현재 성장 단계 이미지가 그 자리에 선다.
 * 말풍선은 스스로 띄우지 않는다 — 청룡 위에 띄우면 사자 머리를 덮었다.
 * 누르면 히어로 한가운데의 말풍선 하나가 대신 말한다 (onPress).
 */
const FloatingPet = ({ pet, onPress }: { pet: ReturnType<typeof useAttendancePet>; onPress: () => void }) => {
	const styles = useThemedStyles(createStyles);
	const Colors = useColors();
	/** 아직 안 준 먹이 — 다 자란 뒤에는 줘도 소용없으므로 배지를 달지 않는다 */
	const waiting = pet.next ? pet.feeds : 0;

	if (!pet.stage || !pet.image) {
		return null;
	}

	return (
		<View style={styles.floatWrap} pointerEvents="box-none">
			<Pressable
				onPress={onPress}
				accessibilityRole="button"
				accessibilityLabel={
					waiting > 0
						? `${pet.stage.label}, 안 준 먹이 ${waiting}개. 누르면 먹이러 가요`
						: `${pet.stage.label}, 먹이 ${pet.fed}개 준 출석 수호신`
				}>
				<MascotImage source={pet.image} size={scaleWidth(66)} motion="float" shadow={false} />
				{/* 안 준 먹이 — 출석으로 받은 먹이가 가방에 잠들지 않게 청룡 위에 직접 붙인다 */}
				{waiting > 0 && (
					<View style={styles.feedBadge} pointerEvents="none">
						<IconComponent type="materialCommunityIcons" name="food-drumstick" size={scaleWidth(10)} color={Colors.brandBlockText} />
						<Text style={styles.feedBadgeText}>{waiting}</Text>
					</View>
				)}
			</Pressable>
		</View>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: Colors.background },
		content: { ...Layout.column, paddingHorizontal: Spacing.lg, paddingTop: SpacingV.sm, paddingBottom: SpacingV.xxxl },
		// 카드 사이 간격은 여기 한 곳에서만 준다 (카드마다 margin 을 두면 배너와 어긋난다)
		stack: { gap: SpacingV.md },
		/**
		 * 액션 카드 묶음 — 태블릿은 두 칸씩 흘려 놓는다.
		 * 폰은 gap 만 있는 세로 나열이라 예전과 똑같이 보인다 (flexBasis 를 세로에 잘못 먹이지 않게 분기한다)
		 */
		cardGrid: Layout.isTablet ? { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md } : { gap: SpacingV.md },
		gridCard: Layout.isTablet ? { flexBasis: '48%', flexGrow: 1 } : {},

		hero: { backgroundColor: Colors.brandBlock, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', gap: SpacingV.sm, ...Shadow.floating },
		// 그림자를 자르지 않으려고 hero 에 overflow:hidden 을 주지 않는다 — 광택 레이어가 스스로 같은 반경을 갖는다
		heroGlow: { ...StyleSheet.absoluteFillObject, borderRadius: Radius.xl },
		heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: SpacingV.xs },
		// 화면 사용법 버튼을 오른쪽 끝에 붙인다
		heroTopRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
		streakChip: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(4),
			paddingHorizontal: Spacing.md,
			height: scaleHeight(32),
			borderRadius: Radius.pill,
			backgroundColor: 'rgba(255,255,255,0.14)',
		},
		streakChipActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
		shieldTag: { flexDirection: 'row', alignItems: 'center', gap: scaleWidth(1), marginLeft: scaleWidth(2), paddingHorizontal: scaleWidth(5), height: scaleHeight(18), borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.2)' },
		shieldTagText: { fontSize: scaledSize(10), fontWeight: FontWeight.heavy, color: Colors.brandBlockText },

		/** 이전 버전의 가방 카드 스타일 */
		bagCard: {
			gap: SpacingV.sm,
			paddingVertical: SpacingV.md,
			paddingHorizontal: Spacing.lg,
			borderRadius: Radius.xl,
			backgroundColor: Colors.surface,
			...Shadow.card,
		},
		/**
		 * 지금 걸려 있는 효과 — 가방과 같은 카드 언어를 쓰되 초록 테로 "켜져 있다" 를 구분한다.
		 * 가로 스크롤 칩 한 줄이라 효과가 늘어도 홈 높이가 늘지 않는다.
		 */
		effectCard: {
			gap: SpacingV.sm,
			paddingVertical: SpacingV.md,
			paddingHorizontal: Spacing.lg,
			borderRadius: Radius.xl,
			borderWidth: 1,
			borderColor: Colors.success,
			backgroundColor: Colors.successSoft,
		},
		effectTitle: { flex: 1, fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: onSurface(Colors.successSoft) },
		effectCount: {
			minWidth: scaleWidth(22),
			height: scaleHeight(20),
			paddingHorizontal: Spacing.xs,
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.surface,
		},
		effectCountText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: Colors.success, fontVariant: ['tabular-nums'] },
		effectRow: { gap: Spacing.sm, paddingRight: Spacing.xs },
		effectChip: {
			width: scaleWidth(212),
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.sm,
			paddingVertical: SpacingV.sm,
			paddingHorizontal: Spacing.md,
			borderRadius: Radius.lg,
			backgroundColor: Colors.surface,
		},
		effectAsset: { width: scaleWidth(30), height: scaleWidth(30) },
		effectBody: { flex: 1, gap: scaleHeight(1) },
		effectLabel: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: Colors.textStrong },
		effectText: { fontSize: scaledSize(10), color: Colors.textSecondary, lineHeight: scaledSize(14) },
		effectBadge: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(2),
			paddingHorizontal: Spacing.xs,
			height: scaleHeight(20),
			borderRadius: Radius.pill,
			backgroundColor: Colors.primarySoft,
		},
		effectBadgeForever: { backgroundColor: Colors.secondarySoft },
		effectBadgeText: { fontSize: scaledSize(10), fontWeight: FontWeight.heavy, color: Colors.primaryDark },
		effectBadgeTextForever: { color: Colors.secondaryDark },

		bagHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
		bagTitle: { flex: 1, fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: Colors.textStrong },
		bagMore: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingLeft: Spacing.sm,
			paddingRight: scaleWidth(2),
			height: scaleHeight(24),
			borderRadius: Radius.pill,
			backgroundColor: Colors.primarySoft,
		},
		bagMoreText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.primaryDark },
		bagRow: { gap: Spacing.md, paddingRight: Spacing.xs },
		bagChip: { width: scaleWidth(58), alignItems: 'center', gap: scaleHeight(3) },
		bagAssetBox: { width: scaleWidth(48), height: scaleWidth(48), alignItems: 'center', justifyContent: 'center' },
		bagAsset: { width: scaleWidth(44), height: scaleWidth(44) },
		bagBadge: {
			position: 'absolute',
			right: -scaleWidth(2),
			bottom: 0,
			minWidth: scaleWidth(18),
			height: scaleHeight(18),
			paddingHorizontal: scaleWidth(4),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.pill,
			borderWidth: 1.5,
			borderColor: Colors.surface,
			backgroundColor: Colors.primarySurface,
		},
		bagCount: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: Colors.textInverse },
		bagLabel: { fontSize: Typography.caption, color: Colors.textSecondary, textAlign: 'center' },

		streakText: { fontSize: Typography.bodySm, fontWeight: FontWeight.bold, color: Colors.brandBlockText },

		// 캐릭터 + 출석 수호신 — 발밑을 맞춰 나란히 세운다
		// 펫이 있든 없든 캐릭터가 가운데에 그대로 있어야 한다 — 펫을 같은 줄에 세우면 캐릭터가 왼쪽으로 밀린다
		heroDuo: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'flex-end' },
		// 글방을 깔았을 때만 높이를 배경과 같게 고정한다 — 안 그러면 배경이 아래 글씨 위로 삐져나온다.
		// 안 산 사람에게 빈 높이를 미리 잡아 두면 캐릭터 위에 이유 없는 여백이 생긴다
		// 좌대 자리 — 펫 그림(66) 바닥에 맞춰 가운데 아래에 붙인다
		// 캐릭터(112) 반지름 56 + 한 뼘(8) → 중앙 기준 오른쪽에 앉힌다. 둘의 그림이 닿지 않는 최소 거리다
		heroPetSlot: { position: 'absolute', left: '50%', bottom: 0, marginLeft: scaleWidth(64), width: scaleWidth(66) },

		speechWrap: { alignItems: 'center' },
		speechBubble: {
			maxWidth: scaleWidth(260),
			paddingHorizontal: Spacing.lg,
			paddingVertical: SpacingV.sm,
			borderRadius: Radius.lg,
			backgroundColor: 'rgba(255,255,255,0.16)',
		},
		speechText: { fontSize: Typography.bodySm, fontWeight: FontWeight.semibold, color: Colors.brandBlockText, textAlign: 'center' },
		// 말풍선 꼬리 — 아래를 향한 작은 삼각형
		speechTail: {
			width: 0,
			height: 0,
			borderLeftWidth: scaleWidth(6),
			borderRightWidth: scaleWidth(6),
			borderTopWidth: scaleWidth(7),
			borderLeftColor: 'transparent',
			borderRightColor: 'transparent',
			borderTopColor: 'rgba(255,255,255,0.16)',
		},
		petHint: { fontSize: Typography.caption, color: Colors.brandBlockMuted },

		levelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: SpacingV.xs },
		petName: { fontSize: Typography.title, fontWeight: FontWeight.bold, color: Colors.brandBlockText },
		levelChip: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(2),
			paddingLeft: Spacing.sm,
			paddingRight: scaleWidth(2),
			height: scaleHeight(24),
			borderRadius: Radius.pill,
			backgroundColor: 'rgba(255,255,255,0.16)',
		},
		levelText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.brandBlockText },
		gaugeBox: { width: '100%', gap: scaleHeight(6), marginTop: SpacingV.xs },
		gaugeText: { fontSize: Typography.caption, color: Colors.brandBlockMuted, textAlign: 'center' },

		// 히어로가 가운데 정렬이라 폭을 주지 않으면 버튼이 글자 폭으로 쪼그라든다
		checkWrap: { width: '100%' },
		checkButton: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: Spacing.sm,
			width: '100%',
			height: scaleHeight(50),
			marginTop: SpacingV.sm,
			borderRadius: Radius.lg,
			backgroundColor: Colors.brandBlockText,
		},
		checkButtonDone: { backgroundColor: 'rgba(255,255,255,0.14)' },
		// 다크에서는 primaryDeep 이 밝은 초록이라 밝은 버튼 위에서 사라진다 — 버튼과 대비되는 brandBlock 을 쓴다
		checkText: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.brandBlock },
		checkTextDone: { color: Colors.brandBlockText },

		badgeScroll: { alignSelf: 'stretch' },
		badgeRow: { gap: Spacing.sm, paddingTop: SpacingV.sm },

		// 카드 묶음의 머리 — 배너를 걷어내고 글자만 남겼다
		sectionTitle: { marginTop: SpacingV.sm, fontSize: Typography.title, fontWeight: FontWeight.bold, color: Colors.textStrong },

		quickRow: { flexDirection: 'row', gap: Spacing.sm },
		quick: {
			flex: 1,
			alignItems: 'center',
			gap: scaleHeight(4),
			paddingVertical: SpacingV.lg,
			paddingHorizontal: Spacing.sm,
			borderRadius: Radius.lg,
			backgroundColor: Colors.surface,
			...Shadow.card,
		},
		quickIcon: { width: scaleWidth(42), height: scaleWidth(42), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginBottom: scaleHeight(2) },
		quickTitle: { fontSize: Typography.bodySm, fontWeight: FontWeight.bold, color: Colors.textStrong },
		// textMuted 는 비활성·placeholder 용이라 라이트에서 2.6:1 로 읽히지 않는다 — 보이는 설명은 textSecondary
		quickSub: { fontSize: Typography.caption, color: Colors.textSecondary },

		/** 출석 수호신 — 캐릭터 오른쪽에 나란히 선다 (말풍선은 자리를 차지하지 않게 위로 띄운다) */
		floatWrap: { alignItems: 'center' },
		// 안 준 먹이 배지 — 청룡 오른쪽 위에 걸쳐 붙는다. 히어로가 진한 파랑 면이라 테를 같은 면 색으로 둘러 떼어 낸다
		feedBadge: {
			position: 'absolute',
			top: scaleWidth(-2),
			right: scaleWidth(-6),
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(2),
			minWidth: scaleWidth(22),
			height: scaleWidth(18),
			paddingHorizontal: scaleWidth(4),
			justifyContent: 'center',
			borderRadius: Radius.pill,
			borderWidth: scaleWidth(1.5),
			borderColor: Colors.brandBlock,
			backgroundColor: Colors.accentOrange,
		},
		feedBadgeText: { fontSize: scaledSize(10), fontWeight: FontWeight.heavy, color: Colors.brandBlockText, fontVariant: ['tabular-nums'] },

	});

export default LifeHomeScreen;
