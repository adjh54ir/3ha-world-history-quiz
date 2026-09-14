import React, { useEffect, useRef } from 'react';
import AppModal from '@/src/four/screens/common/atomic/AppModal';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView } from 'react-native';
import FastImage from '@/src/four/components/FastImage';
import { MODAL_MAX_WIDTH, scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils';
import IconComponent from '../atomic/IconComponent';
import { Typography, FontWeight, Spacing, SpacingV, Radius } from '@/src/four/const/ConstDesign';
import { Colors, onSurface, withAlpha } from '@/src/four/const/ConstColors';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';

const { width, height } = Dimensions.get('window');

interface TowerReward {
	name: string;
	description?: string;
	image: any;
}

interface TowerLevel {
	id: number;
	name: string;
	bossImage: any;
	reward: TowerReward;
	questions: any[];
}

interface TowerResultModalProps {
	visible: boolean;
	isVictory: boolean;
	correctCount: number;
	totalQuestions: number;
	towerLevel: TowerLevel;
	onRetry: () => void;
	onHome: () => void;
	onNext?: () => void;
}

const TowerResultModal: React.FC<TowerResultModalProps> = ({
	visible,
	isVictory,
	correctCount,
	totalQuestions,
	towerLevel,
	onRetry,
	onHome,
	onNext,
}) => {
	const scaleAnim = useRef(new Animated.Value(0)).current;
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const starAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
	const scoreCountAnim = useRef(new Animated.Value(0)).current;
	const glowAnim = useRef(new Animated.Value(0.4)).current;
	const bossAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		let glowLoop: Animated.CompositeAnimation | null = null;
		if (visible) {
			glowLoop = Animated.loop(
				Animated.sequence([
					Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
					Animated.timing(glowAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
				]),
			);
			glowLoop.start();

			Animated.parallel([
				Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
				Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
				Animated.timing(bossAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
			]).start();

			Animated.timing(scoreCountAnim, {
				toValue: correctCount,
				duration: 800,
				delay: 300,
				useNativeDriver: false,
			}).start();

			if (isVictory) {
				starAnims.forEach((anim, index) => {
					Animated.sequence([
						Animated.delay(400 + index * 150),
						Animated.spring(anim, { toValue: 1, tension: 120, friction: 5, useNativeDriver: true }),
					]).start();
				});
			}
		} else {
			scaleAnim.setValue(0);
			fadeAnim.setValue(0);
			scoreCountAnim.setValue(0);
			bossAnim.setValue(0);
			glowAnim.setValue(0.4);
			starAnims.forEach((anim) => anim.setValue(0));
		}
		// ✅ 언마운트/visible 변경 시 애니메이션 정리 (메모리 누수 방지)
		return () => {
			glowLoop?.stop();
			scaleAnim.stopAnimation();
			fadeAnim.stopAnimation();
			scoreCountAnim.stopAnimation();
			bossAnim.stopAnimation();
			glowAnim.stopAnimation();
			starAnims.forEach((anim) => anim.stopAnimation());
		};
	}, [visible, isVictory]);

	const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
	const accentColor = isVictory ? Colors.warningBright : Colors.errorLight;
	const bgColor = isVictory ? Colors.primaryInk : Colors.errorInk;
	const headerBgColor = isVictory ? Colors.primary : Colors.errorDeep;
	const borderColor = isVictory ? Colors.primary : Colors.error;

	const renderScoreDots = () =>
		Array.from({ length: totalQuestions }).map((_, i) => (
			<View
				key={i}
				style={[
					styles.scoreDot,
					{
						backgroundColor: i < correctCount ? accentColor : Colors.darkCardBorder,
						borderColor: i < correctCount ? accentColor : Colors.darkDivider,
					},
				]}>
				{i < correctCount && <IconComponent type="materialIcons" name="check" size={scaledSize(10)} color={Colors.darkBackground} />}
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
						<Text style={styles.resultTitle}>{isVictory ? '⚔️  VICTORY  ⚔️' : '💀  DEFEAT  💀'}</Text>
					</View>

					{/* 보스 이미지 - 헤더 바로 아래, 스크롤 밖 */}
					<Animated.View style={[styles.bossContainer, { opacity: bossAnim, transform: [{ scale: bossAnim }] }]}>
						<Animated.View style={[styles.bossGlowRing, { opacity: glowAnim, borderColor: accentColor }]} />
						<View style={[styles.bossImageWrapper, { borderColor: accentColor }]}>
							<FastImage
								source={towerLevel.bossImage}
								style={[styles.bossImage, !isVictory && styles.bossImageDefeated]}
								resizeMode="contain"
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
													rotate: anim.interpolate({
														inputRange: [0, 1],
														outputRange: ['0deg', '360deg'],
													}),
												},
											],
										}}>
										<IconComponent type="materialIcons" name="star" size={scaledSize(36)} color={Colors.warningBright} />
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
										{ backgroundColor: withAlpha(Colors.warningBright, 0.15), borderBottomColor: withAlpha(Colors.warningBright, 0.3) },
									]}>
									<Text style={styles.rewardHeaderText}>🎁 REWARD UNLOCKED</Text>
								</View>
								<View style={styles.rewardBody}>
									<FastImage source={towerLevel.reward.image} style={styles.rewardImage} resizeMode="contain" />
									<View style={styles.rewardInfo}>
										<Text style={styles.rewardName}>{towerLevel.reward.name}</Text>
										{!!towerLevel.reward.description && <Text style={styles.rewardDescription}>{towerLevel.reward.description}</Text>}
									</View>
								</View>
							</View>
						)}

						{/* 패배 메시지 */}
						{!isVictory && (
							<View style={styles.failSection}>
								<Text style={styles.failLabel}>MISSION FAILED</Text>
								<Text style={styles.failText}>모든 문제를 맞춰야 클리어됩니다.{'\n'}포기하지 말고 다시 도전하세요!</Text>
							</View>
						)}
					</ScrollView>

					{/* 버튼 - 항상 하단 고정 */}
					<View style={styles.buttonsContainer}>
						<TouchableOpacity onPress={onHome} style={styles.btnSecondary}>
							<IconComponent type="materialIcons" name="home" size={scaledSize(20)} color={Colors.textInverse} />
							<Text style={styles.btnSecondaryText}>홈</Text>
						</TouchableOpacity>

						{isVictory ? (
							onNext && (
								<TouchableOpacity onPress={onNext} style={[styles.btnPrimary, { backgroundColor: Colors.warning }]}>
									<Text style={[styles.btnPrimaryText, { color: Colors.darkBackground }]}>NEXT LEVEL</Text>
									<IconComponent type="materialIcons" name="arrow-forward" size={scaledSize(20)} color={Colors.darkBackground} />
								</TouchableOpacity>
							)
						) : (
							<TouchableOpacity onPress={onRetry} style={[styles.btnPrimary, { backgroundColor: Colors.error }]}>
								{/* 다크에서 error 는 밝은 살몬(#F87171)이 되어 흰 글씨가 2.8:1 로 뭉개진다 — 면 밝기에 맞춰 고른다 */}
								<IconComponent type="materialIcons" name="refresh" size={scaledSize(20)} color={onSurface(Colors.error)} />
								<Text style={[styles.btnPrimaryText, { color: onSurface(Colors.error) }]}>RETRY</Text>
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
		backgroundColor: Colors.scrimStrong,
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContainer: {
		width: width * 0.9,
		maxWidth: MODAL_MAX_WIDTH,
		// 화면 높이의 80%로 고정 → 버튼이 항상 화면 안에 들어옴
		height: height * 0.8,
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
		textShadowColor: Colors.scrim,
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
		top: scaleHeight(10),
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
		backgroundColor: Colors.scrim,
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
		backgroundColor: Colors.scrim,
	},
	defeatOverlayText: {
		fontSize: Typography.hero,
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
		color: Colors.darkOnPanelSub,
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
		backgroundColor: Colors.scrim,
		borderRadius: Radius.lg,
		padding: Spacing.lg,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: Colors.darkCard,
	},
	scoreLabel: {
		fontSize: Typography.caption,
		color: Colors.darkOnPanelMuted,
		letterSpacing: 3,
		marginBottom: SpacingV.xs,
	},
	scoreRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
	},
	scoreCorrect: {
		fontSize: Typography.hero,
		fontWeight: FontWeight.heavy, // 디자인 토큰 최대 굵기(heavy)로 통일 — 900은 스케일 밖
	},
	scoreSlash: {
		fontSize: Typography.h1,
		color: Colors.darkOnPanelMuted,
		fontWeight: FontWeight.regular, // 토큰 스케일(regular) 로 통일
	},
	scoreTotal: {
		fontSize: Typography.display,
		fontWeight: FontWeight.bold,
		color: Colors.darkOnPanelSub,
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
		backgroundColor: Colors.darkDivider,
		borderRadius: Radius.xs,
		overflow: 'hidden',
	},
	percentBarFill: {
		height: '100%',
		borderRadius: Radius.xs,
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
		borderColor: withAlpha(Colors.warningBright, 0.35),
		backgroundColor: Colors.scrim,
	},
	rewardHeader: {
		paddingVertical: SpacingV.sm,
		alignItems: 'center',
		borderBottomWidth: 1,
	},
	rewardHeaderText: {
		fontSize: Typography.caption,
		fontWeight: FontWeight.heavy,
		color: Colors.warningBright,
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
		borderColor: withAlpha(Colors.warningBright, 0.4),
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
		color: Colors.darkOnPanelSub,
		lineHeight: scaledSize(18),
	},
	failSection: {
		marginTop: SpacingV.md,
		backgroundColor: Colors.scrim,
		borderRadius: Radius.lg,
		padding: Spacing.lg,
		borderWidth: 1,
		borderColor: withAlpha(Colors.errorLight, 0.25),
		alignItems: 'center',
	},
	failLabel: {
		fontSize: Typography.caption,
		fontWeight: FontWeight.heavy,
		color: Colors.errorLight,
		letterSpacing: 3,
		marginBottom: SpacingV.sm,
	},
	failText: {
		fontSize: Typography.bodySm,
		color: Colors.darkOnPanelSub,
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
		borderTopColor: Colors.darkCard,
	},
	btnSecondary: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.sm,
		paddingVertical: SpacingV.lg,
		borderRadius: Radius.md,
		backgroundColor: Colors.darkCard,
		borderWidth: 1,
		borderColor: Colors.darkDivider,
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
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
