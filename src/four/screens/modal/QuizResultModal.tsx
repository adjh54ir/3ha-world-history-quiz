import FourImages from '@/src/four/assets/FourImages';
/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
import AppModal from '@/src/four/screens/common/atomic/AppModal';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FastImage from '@/src/four/components/FastImage';
import useAnimationCleanup from '@/src/four/hooks/useAnimationCleanup';
import { MODAL_MAX_WIDTH, scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils/DementionUtils';
import type { MainDataType } from '@/src/four/types/MainDataType';
import { formatProverbExamples, getProverbExamples } from '@/src/four/utils/ProverbExampleUtils';
import IconComponent from '../common/atomic/IconComponent';
import FavoriteToast from '../common/FavoriteToast';
import { Typography, FontWeight, Spacing, SpacingV, Radius, HitSlop } from '@/src/four/const/ConstDesign';
import { Colors } from '@/src/four/const/ConstColors';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';
import { getHanjaTextStyle } from '@/src/four/const/ConstHanjaFont';

type ResultType = 'correct' | 'wrong' | 'timeout';

type Props = {
	visible: boolean;
	resultType: ResultType;
	resultTitle: string;
	resultMessage: string;
	question: MainDataType.ProverbType | null;
	mode: 'meaning' | 'proverb' | 'blank' | 'example';
	favoriteIds: number[];
	onToggleFavorite: () => Promise<void>;
	blankWord: string;
	onNext: () => void;
};

const QuizResultModal = ({
	visible,
	resultType,
	resultTitle,
	resultMessage,
	question,
	mode,
	blankWord,
	favoriteIds,
	onToggleFavorite,
	onNext,
}: Props) => {
	// ✅ Toast 상태
	const [toastVisible, setToastVisible] = useState(false);
	const [toastMessage, setToastMessage] = useState('');
	const toastTimer = useRef<NodeJS.Timeout | null>(null);

	// ✅ 정답 카드 / 해설 카드 등장 애니메이션
	const answerAnim = useRef(new Animated.Value(0)).current;
	const explainAnim = useRef(new Animated.Value(0)).current;
	useAnimationCleanup(answerAnim, explainAnim);

	// AppModal 이 상태바·내비게이션바 아래까지 덮으므로, 세로로 꽉 찬 카드가 시스템 바에 가리지 않게 여백을 준다
	const insets = useSafeAreaInsets();

	// 정답은 초록, 오답은 빨강, 시간 초과는 노랑 — 보기 카드(optionCorrectCard)와 같은 시맨틱 색을 쓴다.
	// 예전에는 정답에 브랜드 블루를 써서, 초록으로 표시된 정답 보기와 팝업 색이 서로 달랐다.
	const themeColor = resultType === 'correct' ? Colors.success : resultType === 'wrong' ? Colors.error : Colors.warning;
	const cardBg = resultType === 'correct' ? Colors.successBg : resultType === 'wrong' ? Colors.errorBg : Colors.warningBg;
	const cardBorder = resultType === 'correct' ? Colors.successBorder : resultType === 'wrong' ? Colors.errorBorder : Colors.warningPale;
	const subTextColor = resultType === 'correct' ? Colors.successDeep : resultType === 'wrong' ? Colors.errorDark : Colors.warningDark;

	const mascotSource =
		resultType === 'correct'
			? FourImages.screen_fox_quiz_correct
			: resultType === 'timeout'
				? FourImages.screen_fox_quiz_timeout
				: FourImages.screen_fox_quiz_wrong;

	useEffect(() => {
		if (!visible) {
			setToastVisible(false);
			if (toastTimer.current) {
				clearTimeout(toastTimer.current);
			}
			return;
		}
		// ✅ 정답 카드 먼저, 해설은 약간의 딜레이 후 슬라이드 업 + 페이드 인
		answerAnim.setValue(0);
		explainAnim.setValue(0);
		const anim = Animated.sequence([
			Animated.timing(answerAnim, {
				toValue: 1,
				duration: 350,
				easing: Easing.out(Easing.back(1.2)),
				useNativeDriver: true,
			}),
			Animated.timing(explainAnim, {
				toValue: 1,
				duration: 400,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			}),
		]);
		anim.start();
		return () => {
			anim.stop(); // 다음 문제로 넘어가면 진행 중 애니메이션 정리
			// 토스트 타이머가 남아 있으면 모달이 사라진 뒤에도 setState 가 돌아 경고가 뜬다
			if (toastTimer.current) {
				clearTimeout(toastTimer.current);
			}
		};
	}, [visible]);

	// ✅ 즐겨찾기 토글 + Toast (타이머로 자동 숨김)
	const handleToggleFavoriteWithToast = async () => {
		const wasFavorited = question?.id !== undefined && favoriteIds.includes(question.id);
		await onToggleFavorite();

		const msg = wasFavorited ? '즐겨찾기 제거' : '즐겨찾기 추가';
		setToastMessage(msg);
		setToastVisible(true);

		if (toastTimer.current) {
			clearTimeout(toastTimer.current);
		}
		toastTimer.current = setTimeout(() => {
			setToastVisible(false);
		}, 2000);
	};

	const isFavorited = question?.id !== undefined && favoriteIds.includes(question.id);

	return (
		<AppModal visible={visible} transparent animationType='fade' onRequestClose={onNext}>
			<View style={[styles.overlay, { paddingTop: insets.top + SpacingV.lg, paddingBottom: insets.bottom + SpacingV.lg }]}>
				<View style={styles.modal}>
					{/* 상단 결과 영역 */}
					<View style={[styles.resultHeader, { backgroundColor: cardBg }]}>
						<FastImage source={mascotSource} style={styles.mascot} resizeMode={FastImage.resizeMode.contain} />
						<View style={styles.resultHeaderTextBox}>
							<Text style={[styles.title, { color: themeColor }]}>{resultTitle}</Text>
							<Text style={styles.messageBig}>{resultMessage}</Text>
						</View>

						{/* ✅ 즐겨찾기 버튼 */}
						{question && (
							<TouchableOpacity hitSlop={HitSlop}
								style={[styles.favoriteButton, isFavorited && styles.favoriteButtonActive]}
								onPress={handleToggleFavoriteWithToast}
								accessibilityRole="button"
								accessibilityLabel={isFavorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
							>
								<IconComponent
									type='MaterialIcons'
									name={isFavorited ? 'star' : 'star-border'}
									size={scaledSize(22)}
									color={isFavorited ? Colors.warning : Colors.textSecondary}
								/>
							</TouchableOpacity>
						)}
					</View>

					<ScrollView
						style={styles.scroll}
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator={false}
					>
						{/* ✅ 정답 카드: 해설 위에 정답이 깔끔하게 표시 */}
						<Animated.View
							style={[
								styles.answerCard,
								{
									backgroundColor: cardBg,
									borderColor: cardBorder,
									opacity: answerAnim,
									transform: [
										{
											translateY: answerAnim.interpolate({
												inputRange: [0, 1],
												outputRange: [scaleHeight(14), 0],
											}),
										},
										{
											scale: answerAnim.interpolate({
												inputRange: [0, 1],
												outputRange: [0.96, 1],
											}),
										},
									],
								},
							]}
						>
							<View style={[styles.answerBadge, { backgroundColor: themeColor }]}>
								<IconComponent type='MaterialIcons' name='check-circle' size={scaledSize(14)} color={Colors.textInverse} />
								<Text style={styles.answerBadgeText}>정답</Text>
							</View>

							{mode === 'meaning' ? (
								<>
									<Text style={styles.answerMain}>{question?.meaning}</Text>
									<Text style={[styles.answerSub, { color: subTextColor }]}>
										{question?.hangul}({question?.hanja})
									</Text>
								</>
							) : (
								<>
									<Text style={styles.answerMain}>{question?.hangul}</Text>
									<Text style={[styles.answerHanja, { color: subTextColor }]}>{question?.hanja}</Text>
									{mode === 'blank' && !!blankWord && (
										<Text style={styles.answerBlankText}>
											빈칸 정답: <Text style={[styles.answerBlankHighlight, { color: subTextColor }]}>{blankWord}</Text>
										</Text>
									)}
								</>
							)}
						</Animated.View>

						{/* ✅ 해설 카드: 정답 아래에 애니메이션으로 등장 */}
						<Animated.View
							style={[
								styles.explainCard,
								{
									opacity: explainAnim,
									transform: [
										{
											translateY: explainAnim.interpolate({
												inputRange: [0, 1],
												outputRange: [scaleHeight(18), 0],
											}),
										},
									],
								},
							]}
						>
							<View style={styles.explainHeader}>
								<View style={[styles.explainHeaderIcon, { backgroundColor: themeColor }]}>
									<IconComponent type='MaterialIcons' name='menu-book' size={scaledSize(14)} color={Colors.textInverse} />
								</View>
								<Text style={styles.explainTitle}>한자어 해설</Text>
							</View>

							{question?.characters && question.characters.length > 0 && (
								<View style={styles.charChipRow}>
									{question.characters.map((c, i) => {
										// "일백 백" → 훈("일백") + 음("백"). 음(마지막 토큰)을 진하게 강조
										const parts = (c.meaning ?? '').trim().split(/\s+/);
										const eum = parts.length > 1 ? parts[parts.length - 1] : '';
										const hun = parts.length > 1 ? parts.slice(0, -1).join(' ') : c.meaning;
										return (
											<View key={i} style={styles.charChip}>
												<Text style={styles.charChipChar}>{c.char}</Text>
												<Text style={styles.charChipMeaning}>
													{hun}
													{!!eum && <Text style={styles.charChipEum}> {eum}</Text>}
												</Text>
											</View>
										);
									})}
								</View>
							)}

							<View style={styles.meaningBlock}>
								<Text style={styles.explainLabel}>한자어</Text>
								<Text style={styles.explainProverbText}>
									{question?.hangul}
									{question?.hanja ? `(${question.hanja})` : ''}
								</Text>
								<Text style={styles.explainLabel}>의미</Text>
								<Text style={styles.explainText}>{question?.meaning}</Text>
							</View>

							{getProverbExamples(question?.example).length > 0 && (
								<View style={styles.exampleBlock}>
									<Text style={[styles.explainLabel, { color: Colors.secondaryInk }]}>예제</Text>
									<Text style={styles.explainExampleText}>{formatProverbExamples(question?.example)}</Text>
								</View>
							)}
						</Animated.View>
					</ScrollView>

					<TouchableOpacity
						style={[styles.nextButton, { backgroundColor: themeColor }]}
						onPress={onNext}
					>
						<Text style={styles.nextButtonText}>다음 퀴즈</Text>
					</TouchableOpacity>
					<FavoriteToast visible={toastVisible} message={toastMessage} onHide={() => setToastVisible(false)} />
				</View>
			</View>
		</AppModal>
	);
};

export default QuizResultModal;

const makeStyles = () => StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: Colors.scrim,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: Spacing.xl,
	},
	modal: {
		width: '100%',
		maxWidth: Math.min(scaleWidth(380), MODAL_MAX_WIDTH),
		borderRadius: Radius.xl,
		backgroundColor: Colors.surface,
		padding: Spacing.lg,
		alignItems: 'center',
	},
	resultHeader: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: Radius.lg,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.md,
		marginBottom: SpacingV.md,
	},
	resultHeaderTextBox: {
		flex: 1,
		marginLeft: Spacing.md,
	},
	title: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		marginBottom: SpacingV.xxs,
	},
	mascot: {
		width: scaleWidth(64),
		height: scaleWidth(64),
	},
	scroll: {
		width: '100%',
		maxHeight: scaleHeight(460),
	},
	scrollContent: {
		paddingBottom: SpacingV.xs,
	},
	messageBig: {
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.semibold,
		color: Colors.textDeep,
		lineHeight: scaledSize(19),
	},
	// ✅ 정답 카드
	answerCard: {
		width: '100%',
		borderRadius: Radius.lg,
		// 형제 카드(explainCard)와 같은 헤어라인 두께로 맞춘다
		borderWidth: 1,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.lg,
		alignItems: 'center',
	},
	answerBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.xs,
		borderRadius: Radius.xl,
		paddingVertical: SpacingV.xs,
		paddingHorizontal: Spacing.md,
		marginBottom: SpacingV.md,
	},
	answerBadgeText: {
		color: Colors.textInverse,
		fontSize: Typography.footnote,
		fontWeight: FontWeight.bold,
	},
	answerMain: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.bold,
		color: Colors.textStrong,
		textAlign: 'center',
		lineHeight: scaledSize(28),
	},
	answerHanja: { ...getHanjaTextStyle(),
		fontSize: Typography.callout,
		fontWeight: FontWeight.semibold,
		textAlign: 'center',
		marginTop: SpacingV.xs,
	},
	answerSub: {
		fontSize: Typography.body,
		fontWeight: FontWeight.semibold,
		textAlign: 'center',
		marginTop: SpacingV.sm,
	},
	answerBlankText: {
		fontSize: Typography.bodySm,
		color: Colors.textDeep,
		fontWeight: FontWeight.semibold,
		marginTop: SpacingV.sm,
	},
	answerBlankHighlight: {
		fontWeight: FontWeight.bold,
		fontSize: Typography.body,
	},
	// ✅ 해설 카드
	explainCard: {
		width: '100%',
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.lg,
		paddingVertical: SpacingV.xl,
		marginTop: SpacingV.md,
		minHeight: scaleHeight(190),
	},
	explainHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		marginBottom: SpacingV.md,
	},
	explainHeaderIcon: {
		width: scaleWidth(24),
		height: scaleWidth(24),
		borderRadius: Radius.sm,
		alignItems: 'center',
		justifyContent: 'center',
	},
	explainTitle: {
		fontSize: Typography.body,
		fontWeight: FontWeight.heavy,
		color: Colors.textStrong,
	},
	charChipRow: {
		flexDirection: 'row',
		gap: Spacing.sm,
		marginBottom: SpacingV.md,
	},
	charChip: {
		flex: 1,
		alignItems: 'center',
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.sm,
	},
	charChipChar: {
		fontSize: Typography.title,
		fontWeight: FontWeight.heavy,
		color: Colors.textStrong,
		marginBottom: SpacingV.xs,
	},
	charChipMeaning: {
		fontSize: Typography.caption,
		color: Colors.textSecondary,
		fontWeight: FontWeight.semibold,
		textAlign: 'center',
	},
	charChipEum: {
		color: Colors.textStrong,
		fontWeight: FontWeight.heavy,
	},
	meaningBlock: {
		backgroundColor: Colors.primaryBg,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.md,
	},
	explainLabel: {
		fontSize: Typography.footnote,
		fontWeight: FontWeight.heavy,
		color: Colors.primaryDeep,
		marginBottom: SpacingV.xs,
	},
	explainText: {
		fontSize: Typography.body,
		color: Colors.text,
		fontWeight: FontWeight.semibold,
		lineHeight: scaledSize(21),
	},
	explainProverbText: {
		fontSize: Typography.callout,
		color: Colors.textStrong,
		fontWeight: FontWeight.heavy,
		lineHeight: scaledSize(22),
		marginBottom: SpacingV.md,
	},
	exampleBlock: {
		backgroundColor: Colors.secondaryBg,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.md,
		marginTop: SpacingV.md,
	},
	explainExampleText: {
		fontSize: Typography.body,
		color: Colors.text,
		fontWeight: FontWeight.medium,
		lineHeight: scaledSize(21),
		fontStyle: 'italic',
	},
	nextButton: {
		marginTop: SpacingV.lg,
		width: '100%',
		paddingVertical: SpacingV.md,
		borderRadius: Radius.lg,
		alignItems: 'center',
	},
	nextButtonText: {
		flexShrink: 1,
		color: Colors.textInverse,
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
	},
	favoriteButton: {
		alignItems: 'center',
		justifyContent: 'center',
		width: scaleWidth(38),
		height: scaleWidth(38),
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		backgroundColor: Colors.surface,
	},
	favoriteButtonActive: {
		borderColor: Colors.warning,
		backgroundColor: Colors.warningBg,
	},
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
