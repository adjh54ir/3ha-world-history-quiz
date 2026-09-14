import FourImages from '@/src/four/assets/FourImages';
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { CONTENT_MAX_WIDTH, scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MainDataType } from '@/src/four/types/MainDataType';
import IconComponent from './common/atomic/IconComponent';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@/src/four/navigation/compat';
import { Paths } from '@/src/four/navigation/conf/Paths';
import { MainStorageKeyType } from '@/src/four/types/MainStorageKeyType';
import AdmobFrontAd from './common/ads/AdmobFrontAd';
import BottomHomeButton from './common/BottomHomeButton';
import ChallengeCountdown from './common/ChallengeCountdown';
import DateUtils from '@/src/four/utils/DateUtils';
import { Typography, FontWeight, Spacing, SpacingV, Radius } from '@/src/four/const/ConstDesign';
import { Colors } from '@/src/four/const/ConstColors';

import CharacterGuide, { useCharacterGuideOnce, CharacterGuideButton } from './common/CharacterGuide';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';

const InitTimeChallengeScreen = () => {
	const STORAGE_KEY = MainStorageKeyType.TIME_CHALLENGE_HISTORY;
	const navigation = useNavigation();
	const [showAllRules, setShowAllRules] = useState(false);
	const guide = useCharacterGuideOnce('init-time-challenge');
	const [isCountingDown, setIsCountingDown] = useState(false);
	const [top5History, setTop5History] = useState<MainDataType.TimeChallengeResult[]>([]);

	const [showAd, setShowAd] = useState(false);
	const [adWatched, setAdWatched] = useState(false);
	const shouldShowAdRef = useRef(Math.random() < 0.5);

	// 챌린지를 끝내고 돌아오면 최고 기록이 갱신돼야 하므로 포커스마다 다시 읽는다.
	useFocusEffect(
		useCallback(() => {
			fetchTopHistory();
		}, []),
	);

	const fetchTopHistory = async () => {
		try {
			const raw = await AsyncStorage.getItem(STORAGE_KEY);
			const history: MainDataType.TimeChallengeResult[] = raw ? JSON.parse(raw) : [];

			const sorted = history.sort((a, b) => b.finalScore - a.finalScore);
			setTop5History(sorted.slice(0, 5));
		} catch (e) {
			console.error('기록 불러오기 실패', e);
		}
	};

	const getRelativeDateLabel = (isoString: string): string => {
		try {
			const inputDate = new Date(isoString);
			const diffDays = DateUtils.getLocalDayDifference(inputDate);
			const { year, month, day, hour, minute } = DateUtils.getLocalDateParts(inputDate);
			const timeStr = `${hour}:${String(minute).padStart(2, '0')}`;

			if (diffDays === 0) {
				return `오늘, ${timeStr}`;
			}
			if (diffDays === 1) {
				return `어제, ${timeStr}`;
			}
			if (diffDays === 2) {
				return `그제, ${timeStr}`;
			}
			if (diffDays < 7) {
				return `${diffDays}일 전`;
			}
			if (diffDays < 30) {
				return `${Math.floor(diffDays / 7)}주 전`;
			}

			return `${year}. ${String(month).padStart(2, '0')}. ${String(day).padStart(2, '0')}. ${timeStr}`;
		} catch {
			return isoString;
		}
	};

	/** 3 · 2 · 1 · 시작! 연출은 ChallengeCountdown 이 맡는다 (타워 챌린지와 같은 연출·같은 효과음) */
	const startCountdown = () => {
		setShowAllRules(false);
		setIsCountingDown(true);
	};

	const handleStartChallenge = () => {
		// 타임 챌린지 시작 시에는 광고를 노출하지 않음
		startCountdown();
	};

	return (
		<SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
			<View style={styles.contentWrapper}>
				<ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
					{/* 🎯 대표 이미지 영역 */}
					<View style={styles.heroImageContainer}>
						<Image
							source={FourImages.screen_fox_time_challenge}
							style={styles.heroImage}
							contentFit="cover"
						/>
						<View style={styles.heroOverlay}>
							<View style={styles.heroTitleRow}>
								<View style={styles.heroTitleBox}>
									<IconComponent type="materialCommunityIcons" name="timer-outline" size={scaledSize(20)} color={Colors.textInverse} />
									<Text style={styles.heroTitle}>타임 챌린지</Text>
								</View>
								<CharacterGuideButton onPress={guide.open} size={scaledSize(20)} color={Colors.textInverse} />
							</View>
							<Text style={styles.heroSubtitle}>180초 안에 최대한 많이 맞혀보세요!</Text>
						</View>
					</View>

					{/* 📋 규칙 박스 */}
					<View style={styles.challengeRuleBox}>
						<View style={styles.ruleHeader}>
							<IconComponent name="info-circle" type="FontAwesome" size={scaledSize(20)} color={Colors.errorLight} />
							<Text style={styles.ruleHeaderText}>게임 규칙</Text>
						</View>

						{showAllRules ? (
							<>
								<View style={styles.ruleItem}>
									<IconComponent type="materialIcons" name="timer" size={scaledSize(15)} color={Colors.accentOrange} />
									<Text style={styles.ruleText} numberOfLines={1}>180초 안에 의미 최대한 많이 맞히기</Text>
								</View>
								<View style={styles.ruleItem}>
									<IconComponent type="materialIcons" name="favorite" size={scaledSize(15)} color={Colors.error} />
									<Text style={styles.ruleText} numberOfLines={1}>틀리면 하트 1개 감소 (총 5개)</Text>
								</View>
								<View style={styles.ruleItem}>
									<IconComponent type="materialIcons" name="skip-next" size={scaledSize(15)} color={Colors.info} />
									<Text style={styles.ruleText} numberOfLines={1}>스킵 1회 · 어려운 문제 건너뛰기</Text>
								</View>
								<View style={styles.ruleItem}>
									<IconComponent type="materialIcons" name="auto-awesome" size={scaledSize(15)} color={Colors.primaryDark} />
									<Text style={styles.ruleText} numberOfLines={1}>찬스 1회 · 한자 뜻·예문 확인</Text>
								</View>
								<View style={styles.ruleItem}>
									<IconComponent type="materialIcons" name="info-outline" size={scaledSize(15)} color={Colors.textMuted} />
									<Text style={styles.ruleText} numberOfLines={1}>중간 종료 시 기록 미저장</Text>
								</View>

								<View style={styles.bonusSection}>
									<View style={styles.bonusTitleRow}>
										<IconComponent type="materialCommunityIcons" name="diamond-stone" size={scaledSize(15)} color={Colors.primary} />
										<Text style={styles.bonusTitle}>점수별 보너스</Text>
									</View>
									<View style={styles.bonusSummaryRow}>
										<IconComponent type="materialCommunityIcons" name="clock-plus-outline" size={scaledSize(15)} color={Colors.accentOrange} style={styles.bonusSummaryIcon} />
										<Text style={styles.bonusSummaryText}>
											<Text style={styles.bonusSummaryStrong}>100점</Text>마다 시간{' '}
											<Text style={styles.bonusSummaryStrong}>+10초</Text>
										</Text>
									</View>
									<View style={styles.bonusSummaryRow}>
										<IconComponent type="materialCommunityIcons" name="heart-plus-outline" size={scaledSize(15)} color={Colors.error} style={styles.bonusSummaryIcon} />
										<Text style={styles.bonusSummaryText}>
											<Text style={styles.bonusSummaryStrong}>200 · 500점</Text> 달성 시 하트{' '}
											<Text style={styles.bonusSummaryStrong}>+1</Text>
										</Text>
									</View>
								</View>

								<View style={styles.bonusSection}>
									<View style={styles.bonusTitleRow}>
										<IconComponent type="materialCommunityIcons" name="fire" size={scaledSize(15)} color={Colors.accentOrange} />
										<Text style={styles.bonusTitle}>콤보 보너스</Text>
									</View>
									<View style={styles.comboList}>
										<View style={styles.comboItem}>
											<Text style={styles.comboCount}>3콤보</Text>
											<Text style={styles.comboReward}>+5점</Text>
										</View>
										<View style={styles.comboItem}>
											<Text style={styles.comboCount}>4콤보</Text>
											<Text style={styles.comboReward}>+10점</Text>
										</View>
										<View style={styles.comboItem}>
											<Text style={styles.comboCount}>5콤보</Text>
											<Text style={styles.comboReward}>+20점</Text>
										</View>
										<View style={styles.comboItem}>
											<Text style={styles.comboCount}>6콤보+</Text>
											<Text style={styles.comboReward}>+30점</Text>
										</View>
									</View>
								</View>

								<View style={styles.warningBox}>
									<IconComponent name="alert-circle" type="Feather" size={scaledSize(16)} color={Colors.errorLight} />
									<Text style={styles.warningText}>시작 버튼을 누르면 3초 뒤에 퀴즈가 시작됩니다!</Text>
								</View>

								<TouchableOpacity onPress={() => setShowAllRules(false)} style={styles.toggleButton}>
									<Text style={styles.toggleText}>간단히 보기</Text>
									<IconComponent name="chevron-up" type="Feather" size={scaledSize(16)} color={Colors.primary} />
								</TouchableOpacity>
							</>
						) : (
							<>
								<View style={styles.ruleItem}>
									<IconComponent type="materialIcons" name="timer" size={scaledSize(15)} color={Colors.accentOrange} />
									<Text style={styles.ruleText} numberOfLines={1}>180초 안에 의미 최대한 많이 맞히기</Text>
								</View>
								<View style={styles.ruleItem}>
									<IconComponent type="materialIcons" name="favorite" size={scaledSize(15)} color={Colors.error} />
									<Text style={styles.ruleText} numberOfLines={1}>틀리면 하트 1개 감소 (총 5개)</Text>
								</View>

								<View style={styles.warningBox}>
									<IconComponent name="alert-circle" type="Feather" size={scaledSize(16)} color={Colors.errorLight} />
									<Text style={styles.warningText}>시작 버튼을 누르면 3초 뒤에 퀴즈가 시작됩니다!</Text>
								</View>

								<TouchableOpacity onPress={() => setShowAllRules(true)} style={styles.toggleButton}>
									<Text style={styles.toggleText}>자세히 보기</Text>
									<IconComponent name="chevron-down" type="Feather" size={scaledSize(16)} color={Colors.primary} />
								</TouchableOpacity>
							</>
						)}
					</View>

					{/* 🏆 TOP 3 랭킹 */}
					<View style={styles.rankingBox}>
						<View style={styles.rankingHeader}>
							<IconComponent name="trophy" type="FontAwesome" size={scaledSize(20)} color={Colors.warningBright} />
							<Text style={styles.rankingTitle}>나의 베스트 기록</Text>
						</View>

						{top5History.length === 0 ? (
							<View style={styles.emptyState}>
								<IconComponent name="emoji-events" type="MaterialIcons" size={scaledSize(48)} color={Colors.textMuted} />
								<Text style={styles.emptyText}>아직 기록이 없습니다</Text>
								<Text style={styles.emptySubtext}>첫 챌린지를 시작해보세요!</Text>
							</View>
						) : (
							top5History.slice(0, 3).map((item, index) => {
								// 메달은 이모지 대신 아이콘 — 기기마다 그림·크기가 달라 줄이 흔들리던 자리다
								const medalColors = [Colors.warningBright, Colors.borderStrong, Colors.accentOrangeLight];
								const gradients = [
									{ from: Colors.warningBright, to: Colors.warning },
									{ from: Colors.borderStrong, to: Colors.textMuted },
									{ from: Colors.accentOrangeLight, to: Colors.accentOrangeInk },
								];

								return (
									<View
										key={index}
										style={[
											styles.rankCard,
											index === 0 && styles.rankCardFirst,
											index === 1 && styles.rankCardSecond,
											index === 2 && styles.rankCardThird,
										]}>
										<View style={styles.rankLeft}>
											<IconComponent type="materialCommunityIcons" name="medal" size={scaledSize(26)} color={medalColors[index]} style={styles.medalIcon} />
											<View style={styles.rankInfo}>
												<Text style={[styles.rankScore, index === 0 && styles.rankScoreFirst]}>{item.finalScore}점</Text>
												<Text style={styles.rankDate}>{getRelativeDateLabel(item.quizDate)}</Text>
											</View>
										</View>
										<View style={styles.rankBadge}>
											<Text style={styles.rankNumber}>{index + 1}등</Text>
										</View>
									</View>
								);
							})
						)}
					</View>

					{/*
					 * 시작 버튼 — 하단 고정이 아니라 내용의 맨 끝에 둔다.
					 * 고정 바가 규칙·기록 위를 계속 덮고 있어, 아래까지 읽고 나서 누르는 흐름이 끊겼다.
					 */}
					<View style={styles.startBar}>
						<TouchableOpacity style={styles.startButton} onPress={handleStartChallenge} activeOpacity={0.85}>
							<Text style={styles.startButtonText}>챌린지 시작하기</Text>
							<IconComponent
								name="play-circle"
								type="Feather"
								size={scaledSize(22)}
								color={Colors.textInverse}
								style={{ marginLeft: Spacing.sm }}
							/>
						</TouchableOpacity>
					</View>
				</ScrollView>
			</View>
			<BottomHomeButton />

			{/* 3 · 2 · 1 · 시작! — 타워 챌린지와 같은 연출을 쓴다 */}
			<ChallengeCountdown
				visible={isCountingDown}
				onDone={() => {
					setIsCountingDown(false);
					// @ts-ignore
					navigation.navigate(Paths.TIME_CHANLLENGE);
				}}
			/>

			{showAd && (
				<AdmobFrontAd
					onAdClosed={() => {
						setShowAd(false);
						setAdWatched(true);
						startCountdown(); // ✅ handleStartChallenge 대신 카운트다운 직접 호출
					}}
				/>
			)}
		
	<CharacterGuide
		visible={guide.visible}
		onClose={guide.close}
		lines={[
			'타임 챌린지는 180초 안에 최대한 많이 맞히는 모드입니다.',
			'아래 규칙을 훑어보고 준비되면 시작 버튼을 누릅니다.',
			'기록은 저장되니 최고 점수에 계속 도전해봐요!',
		]}
		title="타임 챌린지, 이렇게 합니다"
	/>
</SafeAreaView>
	);
};

const makeStyles = () => StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	contentWrapper: {
		flex: 1,
	},
	scrollContainer: {
		// 태블릿: 본문을 가운데 한 기둥으로 묶는다 (CharacterGuide 와 같은 폭)
		width: '100%',
		maxWidth: CONTENT_MAX_WIDTH,
		alignSelf: 'center',
		paddingHorizontal: Spacing.lg,
		paddingTop: SpacingV.lg,
		paddingBottom: SpacingV.xxl,
	},


	// 히어로 이미지
	heroImageContainer: {
		width: '100%',
		height: scaleHeight(220),
		borderRadius: Radius.lg,
		overflow: 'hidden',
		marginBottom: SpacingV.xl,
		backgroundColor: Colors.darkPanel,
	},
	heroImage: {
		width: '100%',
		height: '100%',
	},
	heroOverlay: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: 'rgba(24, 12, 4, 0.82)',
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.xl,
	},
	// 아래 여백은 줄 자체에 준다 — 제목에만 주면 가이드 버튼과 세로 중심이 어긋난다
	heroTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SpacingV.xs },
	// 아이콘 + 제목 한 덩어리 — 이모지를 지우고 아이콘으로 바꾸면서 줄 높이가 흔들리지 않게 묶었다
	heroTitleBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	// 히어로 띠 면은 accentOrange — 다크에서 밝은 주황(#FB923C)이 되어 흰 글씨가 2.3:1 로 뭉개진다
	heroTitle: {
		fontSize: Typography.h2,
		fontWeight: FontWeight.bold,
		color: Colors.textInverse,
	},
	heroSubtitle: {
		fontSize: Typography.body,
		color: Colors.textInverse,
		opacity: 0.9,
	},

	// 규칙 박스
	challengeRuleBox: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		padding: Spacing.xl,
		marginBottom: SpacingV.xl,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	ruleHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: SpacingV.lg,
	},
	ruleHeaderText: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginLeft: Spacing.sm,
	},
	ruleItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		marginBottom: SpacingV.md,
	},
	ruleBullet: {
		fontSize: Typography.body,
		color: Colors.primary,
		marginRight: Spacing.sm,
		marginTop: SpacingV.xxs,
	},
	ruleText: {
		flex: 1,
		fontSize: Typography.body,
		color: Colors.textSecondary,
		lineHeight: scaledSize(22),
	},
	ruleBold: {
		fontWeight: FontWeight.semibold,
		color: Colors.text,
	},

	// 보너스 섹션
	bonusSection: {
		marginTop: SpacingV.xl,
		paddingTop: SpacingV.lg,
		borderTopWidth: 1,
		borderTopColor: Colors.border,
	},
	bonusTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: SpacingV.md },
	bonusTitle: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.text,
	},
	bonusSummaryRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.primaryBg,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.lg,
		borderWidth: 1,
		borderColor: Colors.primarySoft,
		marginBottom: SpacingV.sm,
		gap: Spacing.md,
	},
	// 아이콘으로 바뀌면서 글자 크기 대신 자리만 잡아 준다
	bonusSummaryIcon: {},
	bonusSummaryText: {
		flex: 1,
		fontSize: Typography.bodySm,
		color: Colors.textDeep,
	},
	bonusSummaryStrong: {
		fontWeight: FontWeight.bold,
		color: Colors.primaryDeep,
	},

	// 콤보 리스트
	comboList: {
		gap: SpacingV.sm,
	},
	comboItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: Colors.accentOrangeBg,
		borderRadius: Radius.sm,
		padding: Spacing.md,
		borderWidth: 1,
		borderColor: Colors.accentOrangeSoft,
	},
	comboCount: {
		fontSize: Typography.body,
		fontWeight: FontWeight.semibold,
		color: Colors.errorLight,
	},
	comboReward: {
		fontSize: Typography.body,
		fontWeight: FontWeight.bold,
		color: Colors.accentOrangeLight,
	},

	// 경고 박스
	warningBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.errorBg,
		borderRadius: Radius.sm,
		padding: Spacing.md,
		marginTop: SpacingV.lg,
		borderWidth: 1,
		borderColor: Colors.errorBorder,
	},
	warningText: {
		flex: 1,
		fontSize: Typography.bodySm,
		color: Colors.errorLight,
		fontWeight: FontWeight.semibold,
		marginLeft: Spacing.sm,
	},

	// 토글 버튼
	toggleButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: SpacingV.md,
		paddingVertical: SpacingV.sm,
	},
	toggleText: {
		fontSize: Typography.body,
		color: Colors.primary,
		fontWeight: FontWeight.semibold,
		marginRight: Spacing.xs,
	},

	// 랭킹 박스
	rankingBox: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		padding: Spacing.xl,
		marginBottom: SpacingV.xl,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	rankingHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: SpacingV.lg,
	},
	rankingTitle: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginLeft: Spacing.sm,
	},

	// 빈 상태
	emptyState: {
		alignItems: 'center',
		paddingVertical: SpacingV.xxxl,
	},
	emptyText: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.semibold,
		color: Colors.textMuted,
		marginTop: SpacingV.md,
	},
	emptySubtext: {
		fontSize: Typography.bodySm,
		color: Colors.textMuted,
		marginTop: SpacingV.xs,
	},

	// 랭킹 카드
	rankCard: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: Colors.background,
		borderRadius: Radius.md,
		padding: Spacing.lg,
		marginBottom: SpacingV.md,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	rankCardFirst: {
		backgroundColor: Colors.warningBg,
		borderColor: Colors.warningBright,
		borderWidth: 2,
	},
	rankCardSecond: {
		backgroundColor: Colors.surfaceAlt,
		borderColor: Colors.borderStrong,
	},
	rankCardThird: {
		backgroundColor: Colors.accentOrangeBg,
		borderColor: Colors.accentOrangeLight,
	},
	rankLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	medalIcon: {
		marginRight: Spacing.md,
	},
	rankInfo: {
		flex: 1,
	},
	rankScore: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.xxs,
	},
	rankScoreFirst: {
		fontSize: Typography.h3,
		color: Colors.accentOrangeLight,
	},
	rankDate: {
		fontSize: Typography.footnote,
		color: Colors.textMuted,
	},
	rankBadge: {
		backgroundColor: Colors.border,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.xs,
		paddingHorizontal: Spacing.md,
	},
	rankNumber: {
		fontSize: Typography.footnote,
		fontWeight: FontWeight.semibold,
		color: Colors.textSecondary,
	},

	// 시작 버튼 — 내용 맨 끝에 오는 줄이라 고정 바의 배경·구분선이 필요 없다
	startBar: {
		paddingTop: SpacingV.lg,
		paddingBottom: SpacingV.sm,
	},
	startButton: {
		flexDirection: 'row',
		backgroundColor: Colors.secondarySurface,
		paddingVertical: SpacingV.lg,
		borderRadius: Radius.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
	startButtonText: {
		flexShrink: 1,
		color: Colors.textInverse,
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
	},

	// 카운트다운
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});

export default InitTimeChallengeScreen;
