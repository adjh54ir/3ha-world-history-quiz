import React, { useEffect, useRef, useState } from 'react';
import AppModal from '@/src/screens/common/atomic/AppModal';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView, Easing } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import { Layout } from '@/src/const/ConstDesign';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { Typography, FontWeight, Spacing, SpacingV, Radius } from '@/src/const/ConstDesign';
import { Colors, LIGHT_COLORS, readableOn, withAlpha } from '@/src/const/ConstColors';
import { themed } from '@/src/utils/ThemedStyles';

interface TowerReward {
	name: string;
	description?: string;
	image: any;
}

interface TowerLevel {
	id: number;
	/** 층 번호 — 이 층 코스튬의 지속 효과를 찾는 열쇠 */
	level: number;
	name: string;
	bossImage: any;
	reward: TowerReward;
	questions: any[];
}

/** 한 문제의 종합 결과 한 줄 — 푸는 동안은 보기 색만 바뀌고, 해설은 여기서 한 번에 읽는다 */
export interface TowerReview {
	proverb: string;
	question: string;
	/** 내가 고른 보기 (안 고르고 끝났으면 빈 문자열) */
	picked: string;
	/** 정답 보기 */
	answer: string;
	explanation: string;
	isCorrect: boolean;
}

interface TowerResultModalProps {
	visible: boolean;
	isVictory: boolean;
	correctCount: number;
	totalQuestions: number;
	towerLevel: TowerLevel;
	/** 문제별 종합 결과 — 없으면 이 칸을 그리지 않는다 */
	reviews?: TowerReview[];
	onRetry: () => void;
	onHome: () => void;
	onNext?: () => void;
	/** 틀린 문제 복습하러 가기 — 틀린 문제가 하나라도 있을 때만 버튼을 세운다 */
	onReview?: () => void;
}

const TowerResultModal: React.FC<TowerResultModalProps> = ({
	visible,
	isVictory,
	correctCount,
	totalQuestions,
	towerLevel,
	reviews,
	onRetry,
	onHome,
	onNext,
	onReview,
}) => {
	const { t } = useTranslation();
	const scaleAnim = useRef(new Animated.Value(0)).current;
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const starAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
	const scoreCountAnim = useRef(new Animated.Value(0)).current;
	const glowAnim = useRef(new Animated.Value(0.4)).current;
	const bossAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!visible) {
			return;
		}
		/*
		 * 연출 전체를 핸들 하나로 묶는다.
		 * 예전엔 별마다 따로 start() 하고 핸들을 버려, 닫을 때 stopAnimation() 이 Animated.delay(400~700ms) 대기 중인
		 * 별을 멈추지 못했다 — 닫힌 뒤에 별이 1 로 튀어 올라 있었고, 다음에 열면 이미 커진 별이라 연출이 사라졌다.
		 */
		const steps: Animated.CompositeAnimation[] = [
			Animated.loop(
				Animated.sequence([
					Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
					Animated.timing(glowAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
				]),
			),
			Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
			Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
			Animated.timing(bossAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
			Animated.timing(scoreCountAnim, { toValue: correctCount, duration: 800, delay: 300, useNativeDriver: false }),
		];
		if (isVictory) {
			/*
			 * ⭐ 별은 하나씩 차례로 크게(1.5배) 튀어 올랐다가 1 로 내려앉는다.
			 * 0→1 로만 커지면 "나타났다" 로 끝나 별을 얻은 순간이 약하다 — 한 번 넘쳤다 돌아와야 손에 쥔 느낌이 난다.
			 */
			steps.push(
				Animated.sequence([
					Animated.delay(400),
					Animated.stagger(
						150,
						starAnims.map((anim) =>
							Animated.sequence([
								Animated.timing(anim, { toValue: 1.5, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
								Animated.spring(anim, { toValue: 1, tension: 120, friction: 5, useNativeDriver: true }),
							]),
						),
					),
				]),
			);
		}
		const animation = Animated.parallel(steps);
		animation.start();

		// 닫힘/언마운트 때 멈추고 시작 상태로 되돌린다.
		// 여는 쪽에서 되돌리면 첫 프레임이 지난번 끝 값(커진 창·별)으로 한 번 그려져 깜빡이므로, 닫을 때 미리 되돌려 둔다.
		return () => {
			animation.stop();
			scaleAnim.setValue(0);
			fadeAnim.setValue(0);
			scoreCountAnim.setValue(0);
			bossAnim.setValue(0);
			glowAnim.setValue(0.4);
			starAnims.forEach((anim) => anim.setValue(0));
			// 다음 판에서 지난 판의 펼침 상태가 남아 있지 않게 함께 되돌린다
			setOpened([]);
		};
	}, [visible, isVictory]);

	const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
	/**
	 * 해설을 펼쳐 둔 문제 번호.
	 * 다섯 문제의 해설을 한꺼번에 펼치면 창(화면 높이의 80%) 안에서 한참을 굴려야 버튼에 닿는다.
	 * 되짚어야 하는 건 틀린 문제라, 틀린 것만 펼친 채로 열고 맞힌 것은 눌러서 펼친다.
	 */
	const [opened, setOpened] = useState<number[]>([]);
	/** 이번 판에서 틀린 문제 수 — 복습 버튼을 세울지 정한다 */
	const wrongCount = reviews?.filter((item) => !item.isCorrect).length ?? 0;
	const accentColor = isVictory ? Colors.gold : Colors.errorPale;
	/*
	 * 창 바탕 — 탑은 테마와 무관하게 늘 어두운 패널이다(ConstTowerData 와 같은 규칙).
	 * 예전에는 primaryInk / errorInk 를 썼는데, 이 둘은 다크에서 밝은 쪽으로 뒤집히는 '글씨용' 토큰이라
	 * 다크 모드에서 창이 흰 판이 되고 그 위 글씨(darkOnPanel·textInverse)는 그대로 흰색이라 전부 사라졌다.
	 * 뒤집히지 않는 고정값으로 둔다 — 라이트에서 쓰던 남색·진홍 그대로다.
	 */
	const bgColor = isVictory ? '#082463' : '#7F1D1D';
	// 패배 띠도 창과 같은 이유로 고정값 — errorDeep 은 다크에서 연분홍(#FCA5A5) 글씨색으로 뒤집혀 어두운 창 위에 밝은 띠가 떴다
	const headerBgColor = isVictory ? Colors.primary : '#B91C1C';
	const borderColor = isVictory ? Colors.primary : Colors.error;
	/**
	 * 어두운 패널 위 '맞힘' 표시색 — primary 는 라이트에서 짙은 파랑(#1249C9)이라 남색 창 위 대비가 2.2:1 이었다.
	 * 어두운 면 위에 얹는 밝은 파랑(primaryLight)을 쓴다.
	 * 다크의 primaryLight 는 짙은 남색(#1E3A5F)으로 뒤집혀 남색 창에 묻히므로 라이트 원값을 고정한다.
	 */
	const correctColor = LIGHT_COLORS.primaryLight;

	const renderScoreDots = () =>
		Array.from({ length: totalQuestions }).map((_, i) => (
			<View
				key={i}
				style={[
					styles.scoreDot,
					{
						backgroundColor: i < correctCount ? accentColor : Colors.onBrandSurface,
						borderColor: i < correctCount ? accentColor : Colors.onBrandWatermark,
					},
				]}>
				{i < correctCount && <IconComponent type="materialIcons" name="check" size={10} color={Colors.darkBackground} />}
			</View>
		));

	// statusBarTranslucent 는 AppModal 이 이미 켜 둔다 — 개별 모달에서 다시 주지 않는다
	return (
		<AppModal visible={visible} transparent animationType="none" onRequestClose={onHome}>
			{/* 오버레이 */}
			<Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
				{/* 모달 전체 컨테이너: 화면 높이의 일정 비율로 고정 */}
				<Animated.View
					style={[
						styles.modalContainer,
						{
							transform: [{ scale: scaleAnim }],
							backgroundColor: bgColor,
							borderColor,
						},
					]}>
					{/* 헤더 - 고정 */}
					<View style={[styles.titleBanner, { backgroundColor: headerBgColor }]}>
						{/* 다크에서 errorDeep 는 밝은 살몬(#FCA5A5)이 되어 흰 글씨가 1.9:1 로 사라졌다 — 면 밝기에 맞춰 고른다 */}
						<Text style={[styles.resultTitle, { color: readableOn(headerBgColor) }]}>{isVictory ? '⚔️  VICTORY  ⚔️' : '💀  DEFEAT  💀'}</Text>
					</View>

					{/* 보스 이미지 - 헤더 바로 아래, 스크롤 밖 */}
					<Animated.View style={[styles.bossContainer, { opacity: bossAnim, transform: [{ scale: bossAnim }] }]}>
						<Animated.View style={[styles.bossGlowRing, { opacity: glowAnim, borderColor: accentColor }]} />
						<View style={[styles.bossImageWrapper, { borderColor: accentColor }]}>
							<Image
								source={towerLevel.bossImage}
								style={[styles.bossImage, !isVictory && styles.bossImageDefeated]}
								contentFit="contain"
							/>
							{!isVictory && (
								<View style={styles.defeatOverlay}>
									<Text style={styles.defeatOverlayText}>✗</Text>
								</View>
							)}
						</View>
						{isVictory && (
							<View style={styles.crownBadge}>
								<Text style={styles.crownText}>👑</Text>
							</View>
						)}
						<Text style={styles.levelName}>{towerLevel.name}</Text>
					</Animated.View>

					{/* 스크롤 가능한 본문 */}
					<ScrollView
						style={styles.scrollArea}
						showsVerticalScrollIndicator={false}
						contentContainerStyle={styles.scrollContent}>
						{/* 점수 */}
						<View style={styles.scoreMainBox}>
							<Text style={styles.scoreLabel}>SCORE</Text>
							<View style={styles.scoreRow}>
								<Text style={[styles.scoreCorrect, { color: accentColor }]}>{correctCount}</Text>
								<Text style={styles.scoreSlash}> / </Text>
								<Text style={styles.scoreTotal}>{totalQuestions}</Text>
							</View>
							<View style={styles.scoreDotsRow}>{renderScoreDots()}</View>
							<View style={styles.percentBarBg}>
								<Animated.View
									style={[
										styles.percentBarFill,
										{
											width: scoreCountAnim.interpolate({
												inputRange: [0, totalQuestions],
												outputRange: ['0%', '100%'],
											}),
											backgroundColor: accentColor,
										},
									]}
								/>
							</View>
							<Text style={[styles.percentText, { color: accentColor }]}>{scorePercentage}%</Text>
						</View>

						{/* 승리 별 */}
						{isVictory && (
							<View style={styles.starsContainer}>
								{starAnims.map((anim, i) => (
									<Animated.View
										key={i}
										style={{
											transform: [
												{ scale: anim },
												{
													// 커지는 동안 반 바퀴 돌며 들어오고, 1 을 넘어 튀는 동안은 돌지 않는다(넘친 값만큼 더 돌면 내려앉을 때 거꾸로 돈다)
													rotate: anim.interpolate({
														inputRange: [0, 1],
														outputRange: ['-180deg', '0deg'],
														extrapolate: 'clamp',
													}),
												},
											],
										}}>
										<IconComponent type="materialIcons" name="star" size={36} color={Colors.gold} />
									</Animated.View>
								))}
							</View>
						)}

						{/* 보상 */}
						{isVictory && (
							<View style={styles.rewardSection}>
								<View
									style={[
										styles.rewardHeader,
										{ backgroundColor: withAlpha(Colors.gold, '26'), borderBottomColor: withAlpha(Colors.gold, '4D') },
									]}>
									<Text style={styles.rewardHeaderText}>🎁 REWARD UNLOCKED</Text>
								</View>
								<View style={styles.rewardBody}>
									<Image source={towerLevel.reward.image} style={styles.rewardImage} contentFit="contain" />
									<View style={styles.rewardInfo}>
										<Text style={styles.rewardName}>{towerLevel.reward.name}</Text>
										{!!towerLevel.reward.description && <Text style={styles.rewardDescription}>{towerLevel.reward.description}</Text>}
									</View>
								</View>
							</View>
						)}

						{/*
						 * 종합 결과 — 모든 문제를 한자리에서 되짚는다.
						 * 문제마다 해설을 펼치면 흐름이 끊겨, 다 푼 뒤 한 번에 읽도록 이리로 모았다.
						 */}
						{!!reviews?.length && (
							<View style={styles.reviewSection}>
								<View style={styles.reviewHeadRow}>
									<Text style={styles.reviewHeader}>{t('tower.result.reviewTitle')}</Text>
									<Text style={styles.reviewHeadHint}>{t('tower.result.wrongCount', { count: wrongCount })}</Text>
								</View>
								{reviews.map((review, index) => {
									const open = !review.isCorrect || opened.includes(index);
									return (
										<TouchableOpacity
											key={`${review.proverb}-${index}`}
											activeOpacity={0.85}
											onPress={() => setOpened((prev) => (prev.includes(index) ? prev.filter((at) => at !== index) : [...prev, index]))}
											style={[styles.reviewCard, { borderColor: review.isCorrect ? withAlpha(correctColor, '80') : withAlpha(Colors.error, '80') }]}
											accessibilityRole="button"
											accessibilityLabel={t('tower.result.reviewA11y', {
											no: index + 1,
											word: review.proverb,
											result: review.isCorrect ? t('tower.result.correct') : t('tower.result.wrong'),
											action: open ? t('tower.result.collapse') : t('tower.result.expand'),
										})}>
											<View style={styles.reviewTop}>
												<View style={[styles.reviewNo, { backgroundColor: review.isCorrect ? correctColor : Colors.error }]}>
													<Text style={[styles.reviewNoText, { color: readableOn(review.isCorrect ? correctColor : Colors.error) }]}>{index + 1}</Text>
												</View>
												<Text style={styles.reviewWord} numberOfLines={1}>
													{review.proverb}
												</Text>
												<IconComponent
													type="materialIcons"
													name={review.isCorrect ? 'check-circle' : 'cancel'}
													size={18}
													color={review.isCorrect ? correctColor : Colors.errorPale}
												/>
												{/* 맞힌 문제만 접힌 채로 열리므로, 펼칠 수 있다는 표시도 그쪽에만 둔다 */}
												{review.isCorrect && (
													<IconComponent
														type="materialIcons"
														name={open ? 'expand-less' : 'expand-more'}
														size={18}
														color={Colors.onBrandTextSoft}
													/>
												)}
											</View>
											{open && (
												<>
													{/* 틀린 문제만 "내가 고른 답" 을 보여 준다 — 맞힌 문제에 같은 줄을 두면 읽을 것만 늘어난다 */}
													{!review.isCorrect && (
														<Text style={styles.reviewPicked} numberOfLines={2}>
															{t('tower.result.myAnswer', { answer: review.picked || t('tower.result.notPicked') })}
														</Text>
													)}
													<Text style={styles.reviewAnswer} numberOfLines={2}>
														{t('tower.result.answer', { answer: review.answer })}
													</Text>
													<Text style={styles.reviewExplain}>{review.explanation}</Text>
												</>
											)}
										</TouchableOpacity>
									);
								})}

								{/*
								 * 결과를 읽고 바로 갈 곳 — RETRY 는 문제 다섯 개를 새로 뽑으므로 방금 틀린 말이 다시 나온다는 보장이 없다.
								 * 틀린 말은 이미 오답 노트에 쌓였으니, 그 노트를 그대로 푸는 자리로 보낸다.
								 */}
								{wrongCount > 0 && !!onReview && (
									<TouchableOpacity style={styles.reviewGoButton} onPress={onReview} activeOpacity={0.85} accessibilityRole="button">
										<IconComponent type="materialCommunityIcons" name="notebook-edit-outline" size={18} color={Colors.gold} />
										<Text style={styles.reviewGoText}>{t('tower.result.goReview', { count: wrongCount })}</Text>
										<IconComponent type="materialIcons" name="chevron-right" size={18} color={Colors.gold} />
									</TouchableOpacity>
								)}
							</View>
						)}

						{/* 패배 메시지 */}
						{!isVictory && (
							<View style={styles.failSection}>
								<Text style={styles.failLabel}>MISSION FAILED</Text>
								<Text style={styles.failText}>{t('tower.result.failText')}</Text>
							</View>
						)}
					</ScrollView>

					{/* 버튼 - 항상 하단 고정 */}
					<View style={styles.buttonsContainer}>
						<TouchableOpacity onPress={onHome} style={styles.btnSecondary}>
							<IconComponent type="materialIcons" name="home" size={20} color={Colors.textInverse} />
							<Text style={styles.btnSecondaryText}>{t('tower.result.home')}</Text>
						</TouchableOpacity>

						{isVictory ? (
							onNext && (
								<TouchableOpacity onPress={onNext} style={[styles.btnPrimary, { backgroundColor: Colors.warning }]}>
									<Text style={[styles.btnPrimaryText, { color: Colors.darkBackground }]}>NEXT LEVEL</Text>
									<IconComponent type="materialIcons" name="arrow-forward" size={20} color={Colors.darkBackground} />
								</TouchableOpacity>
							)
						) : (
							<TouchableOpacity onPress={onRetry} style={[styles.btnPrimary, { backgroundColor: Colors.error }]}>
								{/* 다크에서 error 는 밝은 살몬(#F87171)이 되어 흰 글씨가 2.8:1 로 뭉개진다 — 면 밝기에 맞춰 고른다 */}
								<IconComponent type="materialIcons" name="refresh" size={20} color={readableOn(Colors.error)} />
								<Text style={[styles.btnPrimaryText, { color: readableOn(Colors.error) }]}>RETRY</Text>
							</TouchableOpacity>
						)}
					</View>
				</Animated.View>
			</Animated.View>
		</AppModal>
	);
};

export default TowerResultModal;

const makeStyles = () => StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: Colors.overlayStrong,
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContainer: {
		// 모듈 로드 때 읽은 창 크기 대신 비율로 — 아이패드 창 크기를 바꾸거나 분할 화면이어도 무대(화면 전체)를 따라간다
		width: '90%',
		maxWidth: Layout.dialogMaxWidth,
		// 화면 높이의 80%로 고정 → 버튼이 항상 화면 안에 들어옴
		height: '80%',
		borderRadius: Radius.xl,
		overflow: 'hidden',
		borderWidth: 1.5,
		// flex 구조: 헤더(고정) + 보스(고정) + 스크롤 + 버튼(고정)
		flexDirection: 'column',
	},
	titleBanner: {
		paddingVertical: SpacingV.lg,
		alignItems: 'center',
		// flex 없음 → 컨텐츠 크기만큼만 차지
	},
	resultTitle: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.heavy, // 디자인 토큰 최대 굵기(heavy)로 통일 — 900은 스케일 밖
		color: Colors.textInverse,
		letterSpacing: 3,
		textShadowColor: Colors.backdrop,
		textShadowOffset: { width: 0, height: scaleHeight(2) },
		textShadowRadius: 4,
	},
	bossContainer: {
		alignItems: 'center',
		paddingVertical: SpacingV.lg,
		// flex 없음 → 고정 높이
	},
	bossGlowRing: {
		position: 'absolute',
		// 보스 사진(90)과 같은 중심 — 사진 윗변(bossContainer 위 여백)에서 두 원 반지름 차(10)만큼 올린다
		top: SpacingV.lg - scaleWidth(10),
		width: scaleWidth(110),
		height: scaleWidth(110),
		borderRadius: scaleWidth(55),
		borderWidth: 2,
	},
	bossImageWrapper: {
		width: scaleWidth(90),
		height: scaleWidth(90),
		borderRadius: scaleWidth(45),
		borderWidth: 3,
		overflow: 'hidden',
		backgroundColor: Colors.backdrop,
	},
	bossImage: {
		width: '100%',
		height: '100%',
	},
	bossImageDefeated: {
		opacity: 0.4,
	},
	defeatOverlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: Colors.backdrop,
	},
	defeatOverlayText: {
		fontSize: Typography.displayLg,
		color: Colors.error,
		fontWeight: FontWeight.bold,
	},
	crownBadge: {
		position: 'absolute',
		top: scaleHeight(6),
	},
	crownText: {
		fontSize: Typography.h3,
		color: Colors.text,
	},
	levelName: {
		marginTop: SpacingV.sm,
		textAlign: 'center',
		fontSize: Typography.footnote,
		color: Colors.onBrandTextSoft,
		letterSpacing: 2,
		textTransform: 'uppercase',
	},
	// 스크롤 영역이 남은 공간 전부 차지
	scrollArea: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: Spacing.xl,
		paddingBottom: SpacingV.sm,
	},
	scoreMainBox: {
		backgroundColor: Colors.backdrop,
		borderRadius: Radius.lg,
		padding: Spacing.lg,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: Colors.onBrandWatermark,
	},
	scoreLabel: {
		fontSize: Typography.caption,
		color: Colors.onBrandBorder,
		letterSpacing: 3,
		marginBottom: SpacingV.xs,
	},
	scoreRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
	},
	scoreCorrect: {
		fontSize: Typography.displayLg,
		fontWeight: FontWeight.heavy, // 디자인 토큰 최대 굵기(heavy)로 통일 — 900은 스케일 밖
	},
	scoreSlash: {
		fontSize: Typography.h1,
		color: Colors.onBrandBorder,
		fontWeight: FontWeight.regular, // 토큰 스케일(regular) 로 통일
	},
	scoreTotal: {
		fontSize: Typography.display,
		fontWeight: FontWeight.bold,
		color: Colors.onBrandTextSoft,
	},
	scoreDotsRow: {
		flexDirection: 'row',
		gap: Spacing.sm,
		marginTop: SpacingV.md,
		marginBottom: SpacingV.md,
	},
	scoreDot: {
		width: scaleWidth(24),
		height: scaleWidth(24),
		borderRadius: Radius.md,
		borderWidth: 1.5,
		justifyContent: 'center',
		alignItems: 'center',
	},
	percentBarBg: {
		width: '100%',
		height: scaleHeight(6),
		backgroundColor: Colors.onBrandWatermark,
		borderRadius: Radius.sm,
		overflow: 'hidden',
	},
	percentBarFill: {
		height: '100%',
		borderRadius: Radius.sm,
	},
	percentText: {
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.bold,
		marginTop: SpacingV.sm,
		letterSpacing: 1,
	},
	starsContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: Spacing.md,
		marginTop: SpacingV.md,
	},
	rewardSection: {
		marginTop: SpacingV.md,
		borderRadius: Radius.lg,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: withAlpha(Colors.gold, '59'),
		backgroundColor: Colors.backdrop,
	},
	rewardHeader: {
		paddingVertical: SpacingV.sm,
		alignItems: 'center',
		borderBottomWidth: 1,
	},
	rewardHeaderText: {
		fontSize: Typography.caption,
		fontWeight: FontWeight.heavy,
		color: Colors.gold,
		letterSpacing: 2,
	},
	rewardBody: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: Spacing.lg,
		gap: Spacing.lg,
	},
	rewardImage: {
		width: scaleWidth(52),
		height: scaleWidth(52),
		borderRadius: scaleWidth(26),
		borderWidth: 2,
		borderColor: withAlpha(Colors.gold, '66'),
	},
	rewardInfo: {
		flex: 1,
	},
	rewardName: {
		fontSize: Typography.body,
		fontWeight: FontWeight.bold,
		color: Colors.textInverse,
		marginBottom: SpacingV.xs,
	},
	rewardDescription: {
		fontSize: Typography.footnote,
		color: Colors.onBrandTextSoft,
		lineHeight: scaledSize(18),
	},
	// 지속 효과 한 줄 — 보상 칸 아래에 붙는다

	// 종합 결과 — 문제 하나가 카드 한 장
	reviewSection: { marginTop: SpacingV.lg, gap: SpacingV.sm },
	reviewHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
	reviewHeader: { fontSize: Typography.footnote, fontWeight: FontWeight.heavy, color: Colors.textInverse, letterSpacing: 1 },
	reviewHeadHint: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.onBrandTextSoft },
	reviewCard: {
		gap: SpacingV.xs,
		padding: Spacing.md,
		borderRadius: Radius.lg,
		borderWidth: 1,
		backgroundColor: Colors.backdrop,
	},
	reviewTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	reviewNo: {
		width: scaleWidth(20),
		height: scaleWidth(20),
		borderRadius: Radius.pill,
		alignItems: 'center',
		justifyContent: 'center',
	},
	reviewNoText: { fontSize: Typography.micro, fontWeight: FontWeight.heavy },
	reviewWord: { flex: 1, fontSize: Typography.bodySm, fontWeight: FontWeight.bold, color: Colors.textInverse },
	reviewPicked: { fontSize: Typography.caption, color: Colors.errorPale },
	reviewAnswer: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.onBrandText },
	reviewExplain: { fontSize: Typography.caption, color: Colors.onBrandTextSoft, lineHeight: scaledSize(17) },
	reviewGoButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		marginTop: SpacingV.xs,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.md,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: withAlpha(Colors.gold, '73'),
		backgroundColor: withAlpha(Colors.gold, '1F'),
	},
	reviewGoText: { flex: 1, fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.gold },

	failSection: {
		marginTop: SpacingV.md,
		backgroundColor: Colors.backdrop,
		borderRadius: Radius.lg,
		padding: Spacing.lg,
		borderWidth: 1,
		borderColor: withAlpha(Colors.errorPale, '40'),
		alignItems: 'center',
	},
	failLabel: {
		fontSize: Typography.caption,
		fontWeight: FontWeight.heavy,
		color: Colors.errorPale,
		letterSpacing: 3,
		marginBottom: SpacingV.sm,
	},
	failText: {
		fontSize: Typography.bodySm,
		color: Colors.onBrandTextSoft,
		textAlign: 'center',
		lineHeight: scaledSize(22),
	},
	// 버튼: flex 없음 → 항상 하단에 고정
	buttonsContainer: {
		flexDirection: 'row',
		gap: Spacing.md,
		paddingHorizontal: Spacing.xl,
		paddingVertical: SpacingV.lg,
		borderTopWidth: 1,
		borderTopColor: Colors.onBrandWatermark,
	},
	btnSecondary: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.sm,
		paddingVertical: SpacingV.lg,
		borderRadius: Radius.md,
		backgroundColor: Colors.onBrandWatermark,
		borderWidth: 1,
		borderColor: Colors.onBrandWatermark,
	},
	btnSecondaryText: {
		// 옆에 나란히 선 기본 버튼(btnPrimaryText)과 같은 크기여야 한 쌍으로 읽힌다
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
		color: Colors.textInverse,
	},
	btnPrimary: {
		flex: 2,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.sm,
		paddingVertical: SpacingV.lg,
		borderRadius: Radius.md,
	},
	btnPrimaryText: {
		fontSize: Typography.callout,
		fontWeight: FontWeight.heavy, // 디자인 토큰 최대 굵기(heavy)로 통일 — 900은 스케일 밖
		letterSpacing: 1,
	},
});
const styles = themed(makeStyles);
