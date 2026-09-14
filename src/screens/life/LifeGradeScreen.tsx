import React, { useCallback, useState } from 'react';
import { Animated, Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import AppModal from '@/src/screens/common/atomic/AppModal';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import LifeHeader from './common/LifeHeader';
import LifeCharacterGuide, { useCharacterGuideOnce } from './common/LifeCharacterGuide';
import PetAvatar from './common/PetAvatar';
import { StudyRoomBackdrop, TitlePlaque } from './common/LifeDecor';
import ProgressBar from './common/ProgressBar';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useLife, usePet } from '@/src/hooks/useLife';
import { useScreenEnter } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { EXP, PET_STAGES, REWARD } from '@/src/const/data/life/ConstLifeRewards';
import { expToActions, QUIZ_COUNT } from '@/src/services/life/LifeRules';
import { PET_STAGE_IMAGES } from '@/src/const/data/life/ConstPetImages';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

/**
 * 경험치를 얻는 길.
 * 퀴즈·학습은 EXP 표를 그대로 쓰고(코인과 값이 다르다), 나머지는 받은 코인만큼 경험치가 된다.
 */
const EXP_SOURCES = [
	{ icon: 'check-circle-outline', label: '퀴즈 정답 하나', amount: EXP.correct, note: '타워·타임 챌린지도 같아요' },
	{ icon: 'cards-outline', label: '단어 하나 학습 완료', amount: EXP.learnWord, note: '처음 익힌 단어만 세요' },
	{ icon: 'calendar-check', label: '출석 체크', amount: REWARD.attendance, note: '' },
	{ icon: 'calendar-star', label: '오늘의 퀴즈 완료', amount: REWARD.daily, note: '5문제를 다 풀면 추가로' },
	{ icon: 'clipboard-check-outline', label: '오늘의 미션 모두 완료', amount: REWARD.mission, note: '' },
] as const;

/**
 * 등급 안내 — 펫이 어느 단계까지 자랐고, 다음 단계까지 얼마가 남았는지 한 화면에서 본다.
 * 경험치는 쓰지 않고 쌓이기만 하므로 등급은 절대 내려가지 않는다.
 */
const LifeGradeScreen = () => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const guide = useCharacterGuideOnce('life-grade');
	const pet = usePet();
	const { exp } = useLife();
	const enterStyle = useScreenEnter();

	/** 미리보기로 띄운 단계 번호(0부터). 아직 못 딴 단계도 눌러서 볼 수 있다 */
	const [previewAt, setPreviewAt] = useState<number | null>(null);
	const closePreview = useCallback(() => setPreviewAt(null), []);

	const topStage = PET_STAGES[PET_STAGES.length - 1];
	/** 다음 단계까지 남은 EXP 를 "퀴즈 몇 판 / 단어 몇 개" 로 바꿔 둔다 (보너스는 안 세므로 최소치다) */
	const remain = expToActions(pet.next ? pet.next.minExp - exp : 0);

	return (
		<SafeAreaView style={styles.safe} edges={['left', 'right']}>
			<LifeHeader title="등급" subtitle="경험치를 모아 한자 판다를 키워요" showBack onPressGuide={guide.open} />
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>
				<Animated.View style={[styles.stack, enterStyle]}>
					{/* 지금 등급 */}
					<View style={styles.hero}>
						{/* 글방 — 사 둔 사람에게만 캐릭터 뒤에 깔린다 (홈·통계 히어로와 같은 꾸미기) */}
						<View style={styles.heroPetStage}>
							<StudyRoomBackdrop width={scaleWidth(232)} height={scaleWidth(104)} />
							<PetAvatar size={scaleWidth(104)} plate={false} />
						</View>
						<Text style={styles.heroStage}>{pet.stage.label}</Text>
						{/* 칭호 — 사 둔 사람에게만 단계 이름 아래에 현판이 붙는다 */}
						<TitlePlaque onBrand />
						<View style={styles.heroChip}>
							<Text style={styles.heroChipText}>{`Lv.${pet.level} · 전체 ${PET_STAGES.length}단계`}</Text>
						</View>
						<View style={styles.heroGauge}>
							<ProgressBar ratio={pet.ratio} color={Colors.brandBlockMuted} trackColor="rgba(255,255,255,0.18)" height={scaleHeight(8)} />
							<Text style={styles.heroExp}>
								{pet.next ? `${pet.next.label}까지 ${(pet.next.minExp - exp).toLocaleString()}EXP 남았어요` : `마지막 단계 ${topStage.label}에 도달했어요`}
							</Text>
							{/* EXP 숫자만 보면 얼마나 더 해야 하는지 감이 없다 — 실제로 하는 행동으로 환산해 준다 */}
							{!!pet.next && (
								<>
									<View style={styles.heroConvertRow}>
										<View style={styles.heroConvert}>
											<IconComponent type="materialCommunityIcons" name="head-question" size={13} color={Colors.brandBlockText} />
											<Text style={styles.heroConvertText}>{`퀴즈 ${remain.quizzes}판`}</Text>
										</View>
										<Text style={styles.heroConvertOr}>또는</Text>
										<View style={styles.heroConvert}>
											<IconComponent type="materialCommunityIcons" name="cards" size={13} color={Colors.brandBlockText} />
											<Text style={styles.heroConvertText}>{`학습 카드 ${remain.words}개`}</Text>
										</View>
									</View>
									{/*
									 * 환산 기준 — 판수만 두면 "한 판이 몇 문제인지" 가 빠져 계산이 틀린 것처럼 보인다.
									 * 정답 하나 10EXP · 한 판 10문제 · 카드 하나 5EXP 를 그대로 적어 숫자를 검산할 수 있게 한다.
									 */}
									<Text style={styles.heroConvertNote} numberOfLines={2}>
										{`퀴즈 한 판 ${QUIZ_COUNT}문제를 모두 맞힌 기준이에요 (정답 ${remain.corrects}개 · 정답 하나 ${EXP.correct}EXP · 카드 하나 ${EXP.learnWord}EXP)`}
									</Text>
								</>
							)}
						</View>
						<Text style={styles.heroTotal}>{`지금까지 모은 경험치 ${exp.toLocaleString()}EXP`}</Text>
					</View>

					{/* 단계 목록 */}
					<Text style={styles.sectionTitle}>{`한자 등급 ${PET_STAGES.length}단계`}</Text>
					<View style={styles.stageCard}>
						{PET_STAGES.map((stage, at) => {
							const level = at + 1;
							const reached = exp >= stage.minExp;
							const current = level === pet.level;
							/**
							 * 이미 딴 단계는 미리 볼 것이 없다 — 지금 모습으로 위에 크게 서 있다.
							 * 그래서 누를 수 있는 줄은 아직 못 딴 단계뿐이고, 딴 줄은 완료 표시만 남긴다.
							 */
							const body = (
								<>
									<Image
										source={PET_STAGE_IMAGES[at]}
										style={[styles.stageImage, !reached && styles.stageImageLocked]}
										contentFit="contain"
										accessible={false}
									/>
									<View style={styles.stageText}>
										<View style={styles.stageTitleRow}>
											<Text style={[styles.stageLabel, !reached && styles.stageLabelLocked]}>{stage.label}</Text>
											{current && (
												<View style={styles.nowChip}>
													<Text style={styles.nowText}>지금</Text>
												</View>
											)}
										</View>
										<Text style={styles.stageNeed}>{stage.minExp === 0 ? '처음 시작하는 단계' : `${stage.minExp.toLocaleString()}EXP 부터`}</Text>
									</View>
									<View style={styles.stageEndBox}>
										<IconComponent
											type="materialCommunityIcons"
											name={reached ? 'check-circle' : 'lock-outline'}
											size={20}
											color={reached ? Colors.success : Colors.textMuted}
										/>
										{/* 잠긴 단계만 눌러서 볼 수 있다는 걸 알려 준다 */}
										<Text style={styles.stagePeek}>{reached ? '획득' : '미리보기'}</Text>
									</View>
								</>
							);
							if (reached) {
								return (
									<View key={stage.label} style={[styles.stageRow, at > 0 && styles.stageRowDivided]}>
										{body}
									</View>
								);
							}
							return (
								<PressableScale
									key={stage.label}
									style={[styles.stageRow, at > 0 && styles.stageRowDivided]}
									onPress={() => setPreviewAt(at)}
									scaleTo={0.98}
									accessibilityRole="button"
									accessibilityLabel={`${stage.label} 미리보기`}>
									{body}
								</PressableScale>
							);
						})}
					</View>

					{/* 경험치 얻는 법 */}
					<Text style={styles.sectionTitle}>경험치 얻는 법</Text>
					<View style={styles.howCard}>
						{EXP_SOURCES.map((item, at) => (
							<View key={item.label} style={[styles.howRow, at > 0 && styles.stageRowDivided]}>
								<View style={styles.howIcon}>
									<IconComponent type="materialCommunityIcons" name={item.icon} size={18} color={Colors.primaryDark} />
								</View>
								<View style={styles.howText}>
									<Text style={styles.howLabel}>{item.label}</Text>
									{!!item.note && <Text style={styles.howNote}>{item.note}</Text>}
								</View>
								<Text style={styles.howAmount}>{`+${item.amount}EXP`}</Text>
							</View>
						))}
						<Text style={styles.howFootnote}>코인은 쓰면 줄지만 경험치는 쌓이기만 해요. 등급은 절대 내려가지 않아요.</Text>
					</View>
				</Animated.View>
			</ScrollView>
			{/* 단계 미리보기 — 아직 못 딴 단계도 어떤 모습인지 먼저 보여 준다 */}
			<StagePreview at={previewAt} exp={exp} onClose={closePreview} />

			{/* 화면 사용법 — 처음 들어오면 한 번, 이후에는 헤더의 물음표로 다시 본다 */}
			<LifeCharacterGuide visible={guide.visible} onClose={guide.close} lines={[
				'경험치를 모으면 한자 판다가 다음 단계로 자라요.',
				'학습·퀴즈·출석·챌린지 모두 경험치가 돼요.',
				'경험치는 줄지 않으니 등급이 내려갈 일은 없어요.',
			]} />
		</SafeAreaView>
	);
};

/**
 * 단계 미리보기 팝업
 * -------------------------------------------------
 * 아직 못 딴 단계만 눌러서 볼 수 있다 — "얼마나 더 하면 이렇게 된다"가 보여야 모으고 싶어진다.
 * 이미 딴 단계는 화면 위에 지금 모습으로 서 있으므로 미리 볼 것이 없다.
 */
const StagePreview = ({ at, exp, onClose }: { at: number | null; exp: number; onClose: () => void }) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const stage = at === null ? null : PET_STAGES[at];
	if (at === null || !stage) {
		return null;
	}
	const remain = Math.max(0, stage.minExp - exp);
	const need = expToActions(remain);

	return (
		<AppModal visible onClose={onClose}>
			<View style={styles.previewCard}>
				<View style={styles.previewStage}>
					<Image source={PET_STAGE_IMAGES[at]} style={styles.previewImage} contentFit="contain" accessible={false} />
				</View>
				<View style={styles.previewLevelChip}>
					<Text style={styles.previewLevelText}>{`Lv.${at + 1}`}</Text>
				</View>
				<Text style={styles.previewLabel}>{stage.label}</Text>
				<View style={[styles.previewStatus, styles.previewStatusLocked]}>
					<IconComponent type="materialCommunityIcons" name="lock-outline" size={15} color={Colors.textSecondary} />
					<Text style={[styles.previewStatusText, styles.previewStatusTextLocked]}>{`${remain.toLocaleString()}EXP 더 모으면 만나요`}</Text>
				</View>
				<Text style={styles.previewHint}>{`퀴즈 ${need.quizzes}판(정답 ${need.corrects}개) 또는 학습 카드 ${need.words}개면 도착해요`}</Text>
				<PressableScale style={styles.previewClose} onPress={onClose} scaleTo={0.96} accessibilityRole="button">
					<Text style={styles.previewCloseText}>닫기</Text>
				</PressableScale>
			</View>
		</AppModal>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: Colors.background },
		content: { ...Layout.column, paddingHorizontal: Spacing.lg, paddingBottom: SpacingV.xxxl },
		stack: { gap: SpacingV.md },

		hero: { alignItems: 'center', gap: SpacingV.sm, padding: Spacing.xl, borderRadius: Radius.xl, backgroundColor: Colors.brandBlock, ...Shadow.floating },
		// 캐릭터가 서는 자리 — 글방을 뒤에 깔기 위해 한 겹 감싼다
		heroPetStage: { alignItems: 'center', justifyContent: 'flex-end' },
		heroStage: { fontSize: Typography.h2, fontWeight: FontWeight.bold, color: Colors.brandBlockText },
		heroChip: { paddingHorizontal: Spacing.md, height: scaleHeight(24), justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.16)' },
		heroChipText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.brandBlockText },
		heroGauge: { width: '100%', gap: scaleHeight(6), marginTop: SpacingV.xs },
		heroExp: { fontSize: Typography.bodySm, color: Colors.brandBlockMuted, textAlign: 'center' },
		heroTotal: { fontSize: Typography.caption, color: Colors.brandBlockMuted },
		// 환산 칩 — 게이지 바로 아래, 좌우 가운데. 두 칩 사이 '또는' 이 선택지임을 알려 준다
		heroConvertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: scaleHeight(2) },
		heroConvert: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(4),
			paddingHorizontal: Spacing.sm,
			paddingVertical: scaleHeight(3),
			borderRadius: Radius.pill,
			backgroundColor: 'rgba(255,255,255,0.16)',
		},
		heroConvertText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.brandBlockText },
		heroConvertOr: { fontSize: Typography.caption, color: Colors.brandBlockMuted },
		// 환산 기준 한 줄 — 칩보다 한 단 낮은 톤으로 두어 숫자가 먼저 읽히게 한다
		heroConvertNote: { marginTop: scaleHeight(4), fontSize: Typography.caption, lineHeight: scaledSize(16), color: Colors.brandBlockMuted, textAlign: 'center' },

		sectionTitle: { marginTop: SpacingV.sm, fontSize: Typography.title, fontWeight: FontWeight.bold, color: Colors.textStrong },

		stageCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, paddingHorizontal: Spacing.lg, ...Shadow.card },
		stageRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: SpacingV.md },
		// 첫 줄 위에는 선을 두지 않는다 — 카드 안쪽 여백과 겹쳐 답답해 보인다
		stageRowDivided: { borderTopWidth: 1, borderTopColor: Colors.border },
		stageImage: { width: scaleWidth(46), height: scaleWidth(46) },
		stageImageLocked: { opacity: 0.35 },
		stageText: { flex: 1, gap: scaleHeight(2) },
		stageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
		stageLabel: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textStrong },
		stageLabelLocked: { color: Colors.textMuted },
		nowChip: { paddingHorizontal: Spacing.sm, height: scaleHeight(20), justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: Colors.primarySoft },
		nowText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.primaryDark },
		stageNeed: { fontSize: Typography.bodySm, color: Colors.textSecondary },
		stageEndBox: { alignItems: 'center', gap: scaleHeight(2) },
		stagePeek: { fontSize: Typography.caption, color: Colors.textMuted },

		// 단계 미리보기 팝업
		previewCard: { width: '100%', alignItems: 'center', gap: SpacingV.sm, padding: Spacing.xl, borderRadius: Radius.xl, backgroundColor: Colors.surface, ...Shadow.floating },
		previewStage: {
			width: scaleWidth(168),
			height: scaleWidth(168),
			borderRadius: scaleWidth(84),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.primarySoft,
		},
		previewImage: { width: scaleWidth(132), height: scaleWidth(132) },
		previewLevelChip: { paddingHorizontal: Spacing.md, height: scaleHeight(24), justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: Colors.primarySoft },
		previewLevelText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.primaryDark },
		previewLabel: { fontSize: Typography.h3, fontWeight: FontWeight.heavy, color: Colors.textStrong, textAlign: 'center' },
		previewStatus: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm, borderRadius: Radius.pill },
		previewStatusDone: { backgroundColor: Colors.successSoft },
		previewStatusLocked: { backgroundColor: Colors.surfaceAlt },
		previewStatusText: { fontSize: Typography.bodySm, fontWeight: FontWeight.bold },
		previewStatusTextDone: { color: Colors.textStrong },
		previewStatusTextLocked: { color: Colors.textSecondary },
		previewHint: { fontSize: Typography.caption, color: Colors.textMuted, textAlign: 'center' },
		previewClose: {
			marginTop: SpacingV.xs,
			width: '100%',
			height: scaleHeight(46),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.pill,
			backgroundColor: Colors.primary,
		},
		previewCloseText: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textInverse },

		howCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, paddingHorizontal: Spacing.lg, paddingBottom: SpacingV.md, ...Shadow.card },
		howRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: SpacingV.md },
		howIcon: { width: scaleWidth(34), height: scaleWidth(34), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySoft },
		howText: { flex: 1, gap: scaleHeight(2) },
		howLabel: { fontSize: Typography.body, color: Colors.text },
		// 어디서 받는 경험치인지 한 줄 덧붙인다 — 목록만 보면 타워·챌린지가 빠진 줄 안다
		howNote: { fontSize: Typography.caption, color: Colors.textMuted },
		howAmount: { fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: Colors.primaryDeep },
		howFootnote: { marginTop: SpacingV.xs, fontSize: Typography.caption, color: Colors.textMuted, lineHeight: scaledSize(17) },
	});

export default LifeGradeScreen;
