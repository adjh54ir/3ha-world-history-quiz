import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import AppModal from '@/src/screens/common/atomic/AppModal';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import LifeHeader from './common/LifeHeader';
import LifeCharacterGuide, { useCharacterGuideOnce } from './common/LifeCharacterGuide';
import PetAvatar from './common/PetAvatar';
import ProgressBar from './common/ProgressBar';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useLife, usePet } from '@/src/hooks/useLife';
import { useScreenEnter } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { EXP, PET_STAGES } from '@/src/const/data/life/ConstLifeRewards';
import { expToActions, QUIZ_COUNT } from '@/src/services/life/LifeRules';
import { PET_STAGE_IMAGES } from '@/src/const/data/life/ConstPetImages';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

/**
 * 경험치를 얻는 길.
 * 학습과 활동에서 받는 경험치를 한곳에 정리한다.
 */
const EXP_SOURCES = [
	{ key: 'correct', icon: 'check-circle-outline', amount: EXP.correct },
	{ key: 'learnWord', icon: 'cards-outline', amount: EXP.learnWord },
	{ key: 'attendance', icon: 'calendar-check', amount: EXP.attendance },
	{ key: 'daily', icon: 'calendar-star', amount: EXP.daily },
	{ key: 'mission', icon: 'clipboard-check-outline', amount: EXP.mission },
] as const;

/**
 * 등급 안내 — 펫이 어느 단계까지 자랐고, 다음 단계까지 얼마가 남았는지 한 화면에서 본다.
 * 경험치는 쓰지 않고 쌓이기만 하므로 등급은 절대 내려가지 않는다.
 */
const LifeGradeScreen = () => {
	const { t } = useTranslation();
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
	/** 다음 단계까지 남은 EXP 를 "퀴즈 몇 판 / 항목 몇 개" 로 바꿔 둔다 (보너스는 안 세므로 최소치다) */
	const remain = expToActions(pet.next ? pet.next.minExp - exp : 0);

	return (
		<SafeAreaView style={styles.safe} edges={['left', 'right']}>
			<LifeHeader title={t('grade.title')} subtitle={t('grade.subtitle')} showBack onPressGuide={guide.open} />
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>
				<Animated.View style={[styles.stack, enterStyle]}>
					{/* 지금 등급 */}
					<View style={styles.hero}>
						<View style={styles.heroPetStage}>
							<PetAvatar size={scaleWidth(104)} />
						</View>
						<Text style={styles.heroStage}>{t(`pet.stage.${pet.stage.key}`)}</Text>
						<View style={styles.heroChip}>
							<Text style={styles.heroChipText}>{t('grade.levelChip', { level: pet.level, total: PET_STAGES.length })}</Text>
						</View>
						<View style={styles.heroGauge}>
							<ProgressBar ratio={pet.ratio} color={Colors.brandBlockMuted} trackColor="rgba(255,255,255,0.18)" height={scaleHeight(8)} />
							<Text style={styles.heroExp}>
								{pet.next
									? t('grade.toNext', { stage: t(`pet.stage.${pet.next.key}`), exp: (pet.next.minExp - exp).toLocaleString() })
									: t('grade.atTop', { stage: t(`pet.stage.${topStage.key}`) })}
							</Text>
							{/* EXP 숫자만 보면 얼마나 더 해야 하는지 감이 없다 — 실제로 하는 행동으로 환산해 준다 */}
							{!!pet.next && (
								<>
									<View style={styles.heroConvertRow}>
										<View style={styles.heroConvert}>
											<IconComponent type="materialCommunityIcons" name="head-question" size={13} color={Colors.brandBlockText} />
											<Text style={styles.heroConvertText}>{t('grade.convertQuiz', { n: remain.quizzes })}</Text>
										</View>
										<Text style={styles.heroConvertOr}>{t('grade.convertOr')}</Text>
										<View style={styles.heroConvert}>
											<IconComponent type="materialCommunityIcons" name="cards" size={13} color={Colors.brandBlockText} />
											<Text style={styles.heroConvertText}>{t('grade.convertCards', { n: remain.words })}</Text>
										</View>
									</View>
									{/*
									 * 환산 기준 — 판수만 두면 "한 판이 몇 문제인지" 가 빠져 계산이 틀린 것처럼 보인다.
									 * 정답 하나 10EXP · 한 판 10문제 · 카드 하나 5EXP 를 그대로 적어 숫자를 검산할 수 있게 한다.
									 */}
									<Text style={styles.heroConvertNote} numberOfLines={2}>
										{t('grade.convertNote', { perQuiz: QUIZ_COUNT, corrects: remain.corrects, correctExp: EXP.correct, cardExp: EXP.learnWord })}
									</Text>
								</>
							)}
						</View>
						<Text style={styles.heroTotal}>{t('grade.total', { exp: exp.toLocaleString() })}</Text>
					</View>

					{/* 단계 목록 */}
					<Text style={styles.sectionTitle}>{t('grade.stageSection', { total: PET_STAGES.length })}</Text>
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
											<Text style={[styles.stageLabel, !reached && styles.stageLabelLocked]}>{t(`pet.stage.${stage.key}`)}</Text>
											{current && (
												<View style={styles.nowChip}>
													<Text style={styles.nowText}>{t('grade.now')}</Text>
												</View>
											)}
										</View>
										<Text style={styles.stageNeed}>{stage.minExp === 0 ? t('grade.stageStart') : t('grade.stageFrom', { exp: stage.minExp.toLocaleString() })}</Text>
									</View>
									<View style={styles.stageEndBox}>
										<IconComponent
											type="materialCommunityIcons"
											name={reached ? 'check-circle' : 'lock-outline'}
											size={20}
											color={reached ? Colors.success : Colors.textMuted}
										/>
										{/* 잠긴 단계만 눌러서 볼 수 있다는 걸 알려 준다 */}
										<Text style={styles.stagePeek}>{t(reached ? 'grade.got' : 'grade.peek')}</Text>
									</View>
								</>
							);
							if (reached) {
								return (
									<View key={stage.key} style={[styles.stageRow, at > 0 && styles.stageRowDivided]}>
										{body}
									</View>
								);
							}
							return (
								<PressableScale
									key={stage.key}
									style={[styles.stageRow, at > 0 && styles.stageRowDivided]}
									onPress={() => setPreviewAt(at)}
									scaleTo={0.98}
									accessibilityRole="button"
									accessibilityLabel={t('grade.peekLabel', { stage: t(`pet.stage.${stage.key}`) })}>
									{body}
								</PressableScale>
							);
						})}
					</View>

					{/* 경험치 얻는 법 */}
					<Text style={styles.sectionTitle}>{t('grade.howSection')}</Text>
					<View style={styles.howCard}>
						{EXP_SOURCES.map((item, at) => {
							const note = t(`grade.exp.${item.key}.note`);
							return (
							<View key={item.key} style={[styles.howRow, at > 0 && styles.stageRowDivided]}>
								<View style={styles.howIcon}>
									<IconComponent type="materialCommunityIcons" name={item.icon} size={18} color={Colors.primaryDark} />
								</View>
								<View style={styles.howText}>
									<Text style={styles.howLabel}>{t(`grade.exp.${item.key}.label`)}</Text>
									{!!note && <Text style={styles.howNote}>{note}</Text>}
								</View>
								<Text style={styles.howAmount}>{`+${item.amount}EXP`}</Text>
							</View>
							);
						})}
						<Text style={styles.howFootnote}>{t('grade.howFootnote')}</Text>
					</View>
				</Animated.View>
			</ScrollView>
			{/* 단계 미리보기 — 아직 못 딴 단계도 어떤 모습인지 먼저 보여 준다 */}
			<StagePreview at={previewAt} exp={exp} onClose={closePreview} />

			{/* 화면 사용법 — 처음 들어오면 한 번, 이후에는 헤더의 물음표로 다시 본다 */}
			<LifeCharacterGuide
				visible={guide.visible}
				onClose={guide.close}
				lines={[t('grade.guide.line1'), t('grade.guide.line2'), t('grade.guide.line3')]}
			/>
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
	const { t } = useTranslation();
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
				<Text style={styles.previewLabel}>{t(`pet.stage.${stage.key}`)}</Text>
				<View style={[styles.previewStatus, styles.previewStatusLocked]}>
					<IconComponent type="materialCommunityIcons" name="lock-outline" size={15} color={Colors.textSecondary} />
					<Text style={[styles.previewStatusText, styles.previewStatusTextLocked]}>{t('grade.preview.remain', { exp: remain.toLocaleString() })}</Text>
				</View>
				<Text style={styles.previewHint}>{t('grade.preview.hint', { quizzes: need.quizzes, corrects: need.corrects, cards: need.words })}</Text>
				<PressableScale style={styles.previewClose} onPress={onClose} scaleTo={0.96} accessibilityRole="button">
					<Text style={styles.previewCloseText}>{t('common.close')}</Text>
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
		heroChipText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.brandBlockText, flexShrink: 1, textAlign: 'center', },
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
			minHeight: scaleHeight(46),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.pill,
			backgroundColor: Colors.primary, paddingVertical: SpacingV.sm, },
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
