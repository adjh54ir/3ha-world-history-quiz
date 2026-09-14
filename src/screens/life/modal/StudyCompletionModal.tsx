/**
 * 학습 완료 팝업
 * -------------------------------------------------
 * 이식 화면의 퀴즈 완료 팝업(QuizCompletionModal)과 같은 형태다 —
 * 폭죽 · 배경 원 두 개 · 통통 튀는 마스코트 · 원형 진행 링 · 점수 카드 세 장 · 버튼 두 개.
 * 그림만 이 앱이 쓰는 사자로 두고, 색·간격은 life 팔레트/토큰을 따른다.
 *
 * 지금 보고 있는 범위(분야·난이도)의 카드를 전부 학습했을 때 학습 카드 화면에서 띄운다.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppModal from '@/src/screens/common/atomic/AppModal';
import MascotImage from '@/src/screens/common/atomic/MascotImage';
import Confetti from '@/src/four/components/Confetti';
import CircularProgress from '@/src/four/components/CircularProgress';
import { MODAL_STAGE_WIDTH } from '@/src/four/utils/DementionUtils';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { MODAL_MAX_WIDTH, scaledSize, scaleWidth } from '@/src/utils';

const MASCOT = require('@/src/assets/illustrations/panda-study-complete.webp');

interface Props {
	visible: boolean;
	/** 방금 끝낸 범위 이름 (예: '일상생활', '전체') */
	scopeLabel: string;
	/** 방금 끝낸 범위의 카드 수 */
	scopeTotal: number;
	/** 앱 전체에서 학습을 끝낸 단어 수 */
	learnedAll: number;
	/** 앱 전체 단어 수 */
	totalAll: number;
	onClose: () => void;
	/** 이어서 퀴즈 풀러 가기 */
	onQuiz?: () => void;
}

/** 전체 진도에 맞춘 축하 문구 — 결과와 무관하게 한 문장만 뜨지 않도록 나눠 둔다 */
const message = (percent: number) => {
	if (percent >= 100) return '전부 정복했습니다!';
	if (percent >= 80) return '정말 잘하고 있어요!';
	if (percent >= 50) return '절반을 넘었습니다!';
	if (percent >= 20) return '훌륭합니다!';
	return '좋은 출발이에요!';
};

const emoji = (percent: number) => {
	if (percent >= 100) return '🏆';
	if (percent >= 80) return '🎉';
	if (percent >= 50) return '👏';
	if (percent >= 20) return '😊';
	return '💪';
};

const StudyCompletionModal = ({ visible, scopeLabel, scopeTotal, learnedAll, totalAll, onClose, onQuiz }: Props) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);

	if (!visible) {
		return null;
	}

	const percent = totalAll > 0 ? Math.round((learnedAll / totalAll) * 100) : 0;
	const remain = Math.max(0, totalAll - learnedAll);
	// 진도가 높을수록 초록 — 링 색과 퍼센트 글자 색을 같이 쓴다
	const tone = percent >= 80 ? Colors.success : percent >= 40 ? Colors.secondaryDark : Colors.primary;

	return (
		<AppModal visible onClose={onClose} backdropStyle={styles.backdrop}>
			<Confetti count={150} origin={{ x: MODAL_STAGE_WIDTH / 2, y: 0 }} fadeOut explosionSpeed={400} />

			<View style={styles.card}>
				{/* 배경 원 두 개 — 카드 모서리 밖으로 흘려 축하 분위기만 남긴다 */}
				<View style={styles.bgCircle1} />
				<View style={styles.bgCircle2} />

				{/* 링·점수 카드까지 붙어 세로가 길다 — 작은 기기에서 잘리지 않게 스크롤 */}
				<ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
					<View style={styles.header}>
						<View style={styles.mascotBox}>
							<MascotImage source={MASCOT} size={scaleWidth(108)} motion="cheer" popIn shadow={false} />
						</View>
						<Text style={styles.title}>
							{message(percent)} {emoji(percent)}
						</Text>
						<Text style={styles.subtitle}>{`${scopeLabel} 카드를 모두 익혔어요`}</Text>
					</View>

					<View style={styles.ringBox}>
						<CircularProgress
							size={scaleWidth(120)}
							width={scaleWidth(9)}
							fill={percent}
							tintColor={tone}
							backgroundColor={Colors.surfaceAlt}
							duration={1500}
							rotation={0}>
							{() => (
								<View style={styles.ringInner}>
									<Text style={[styles.ringPercent, { color: tone }]} numberOfLines={1}>
										{percent}%
									</Text>
									<Text style={styles.ringLabel} numberOfLines={1}>
										전체 진도
									</Text>
								</View>
							)}
						</CircularProgress>
					</View>

					<View style={styles.scoreRow}>
						<View style={[styles.scoreCard, styles.scoreCardScope]}>
							<Text style={styles.scoreLabel} numberOfLines={1}>
								이번 범위
							</Text>
							<Text style={styles.scoreValue}>{scopeTotal}</Text>
						</View>
						<View style={[styles.scoreCard, styles.scoreCardDone]}>
							<Text style={styles.scoreLabel} numberOfLines={1}>
								학습 완료
							</Text>
							<Text style={[styles.scoreValue, { color: Colors.success }]}>{learnedAll}</Text>
						</View>
						<View style={[styles.scoreCard, styles.scoreCardRemain]}>
							<Text style={styles.scoreLabel} numberOfLines={1}>
								남은 단어
							</Text>
							<Text style={[styles.scoreValue, { color: Colors.accentOrange }]}>{remain}</Text>
						</View>
					</View>
				</ScrollView>

				<View style={styles.buttonRow}>
					{!!onQuiz && (
						<TouchableOpacity style={styles.subButton} onPress={onQuiz} activeOpacity={0.8} accessibilityRole="button">
							<Text style={styles.subButtonText} numberOfLines={1}>
								퀴즈 풀기
							</Text>
						</TouchableOpacity>
					)}
					<TouchableOpacity style={styles.mainButton} onPress={onClose} activeOpacity={0.8} accessibilityRole="button">
						<Text style={styles.mainButtonText} numberOfLines={1}>
							확인
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</AppModal>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		// 폭죽이 카드 밖까지 퍼지도록 배경 좌우 여백을 카드가 직접 갖게 한다
		backdrop: { paddingHorizontal: Spacing.xl },
		card: {
			width: '100%',
			maxWidth: Math.min(scaleWidth(380), MODAL_MAX_WIDTH),
			maxHeight: '90%',
			backgroundColor: Colors.surface,
			borderRadius: Radius.xl,
			paddingVertical: SpacingV.xxxl,
			paddingHorizontal: Spacing.xxl,
			alignItems: 'center',
			overflow: 'hidden',
		},
		// flexShrink 가 없으면 maxHeight 안에서 스크롤되지 않고 그냥 잘린다
		body: { width: '100%', flexShrink: 1 },
		bodyContent: { alignItems: 'center' },
		bgCircle1: {
			position: 'absolute',
			top: -scaleWidth(60),
			right: -scaleWidth(60),
			width: scaleWidth(200),
			height: scaleWidth(200),
			borderRadius: Radius.pill,
			backgroundColor: Colors.accentAmberSoft,
			opacity: 0.6,
		},
		bgCircle2: {
			position: 'absolute',
			bottom: -scaleWidth(80),
			left: -scaleWidth(80),
			width: scaleWidth(240),
			height: scaleWidth(240),
			borderRadius: Radius.pill,
			backgroundColor: Colors.secondaryBg,
			opacity: 0.5,
		},

		header: { alignItems: 'center', marginBottom: SpacingV.xl, zIndex: 1 },
		mascotBox: {
			width: scaleWidth(120),
			height: scaleWidth(120),
			borderRadius: Radius.pill,
			backgroundColor: Colors.warningSoft,
			alignItems: 'center',
			justifyContent: 'center',
			marginBottom: SpacingV.lg,
		},
		title: {
			fontSize: Typography.h2,
			lineHeight: scaledSize(32),
			fontWeight: FontWeight.heavy,
			color: Colors.textStrong,
			marginBottom: SpacingV.sm,
			textAlign: 'center',
			letterSpacing: -0.5,
		},
		subtitle: { fontSize: Typography.body, fontWeight: FontWeight.medium, color: Colors.textSecondary, textAlign: 'center' },

		ringBox: { marginVertical: SpacingV.lg, zIndex: 1 },
		// 링 두께를 뺀 폭 안에서만 그려야 글자가 링에 닿지 않는다
		ringInner: { width: scaleWidth(96), alignItems: 'center', justifyContent: 'center' },
		ringPercent: {
			fontSize: Typography.h2,
			lineHeight: scaledSize(30),
			fontWeight: FontWeight.heavy,
			textAlign: 'center',
			includeFontPadding: false,
		},
		ringLabel: {
			marginTop: SpacingV.xs,
			fontSize: Typography.caption,
			lineHeight: scaledSize(14),
			fontWeight: FontWeight.semibold,
			color: Colors.textSecondary,
			textAlign: 'center',
			includeFontPadding: false,
		},

		scoreRow: { flexDirection: 'row', gap: Spacing.sm, width: '100%', marginBottom: SpacingV.xl, zIndex: 1 },
		scoreCard: {
			flex: 1,
			alignItems: 'center',
			paddingVertical: SpacingV.lg,
			paddingHorizontal: Spacing.sm,
			borderRadius: Radius.lg,
			borderWidth: 1.5,
			borderColor: Colors.border,
			backgroundColor: Colors.background,
		},
		// 세 칸이 같은 색이면 구분이 안 된다 — 범위는 중립, 완료는 success, 남은 것은 오렌지
		scoreCardScope: { borderColor: Colors.secondarySoft, backgroundColor: Colors.secondaryBg },
		scoreCardDone: { borderColor: Colors.success, backgroundColor: Colors.successSoft },
		scoreCardRemain: { borderColor: Colors.accentOrange, backgroundColor: Colors.accentAmberSoft },
		scoreLabel: { fontSize: Typography.footnote, fontWeight: FontWeight.semibold, color: Colors.textSecondary, marginBottom: SpacingV.xs },
		scoreValue: { fontSize: Typography.h2, fontWeight: FontWeight.heavy, color: Colors.text },

		buttonRow: { flexDirection: 'row', gap: Spacing.md, width: '100%', zIndex: 1 },
		subButton: {
			flex: 1,
			alignItems: 'center',
			paddingVertical: SpacingV.lg,
			borderRadius: Radius.pill,
			borderWidth: 1.5,
			borderColor: Colors.border,
			backgroundColor: Colors.secondaryBg,
		},
		subButtonText: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.text },
		mainButton: {
			flex: 1,
			alignItems: 'center',
			paddingVertical: SpacingV.lg,
			borderRadius: Radius.pill,
			backgroundColor: Colors.primarySurface,
		},
		mainButtonText: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.textInverse, letterSpacing: 0.3 },
	});

export default StudyCompletionModal;
