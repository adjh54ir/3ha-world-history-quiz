import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { selectPromptImage, selectPromptImageFallback } from '@/src/const/data/world/ConstWorldImages';
import { selectTopic } from '@/src/const/data/world/ConstWorldTopics';
import CountryFlags from './CountryFlags';
import type { WorldType } from '@/src/types/data/WorldType';
import { scaledSize, scaleHeight } from '@/src/utils';

interface Props {
	question: WorldType.Question;
	/** 그림 문항이면 어느 묶음에서 그림을 찾을지 — 글자 문항이면 넘기지 않는다 */
	askAs?: WorldType.QuizMode['askAs'];
	/** 고른 보기. null 이면 아직 안 골랐다 */
	picked: string | null;
	onPick: (option: string) => void;
	/** 주제 색 — 그림 자리 배경에 쓴다 */
	tint: string;
}

/**
 * 문항 한 장 — 발문·문제·보기 넷.
 *
 * 주제 퀴즈·타워·타임 챌린지가 같은 카드를 쓴다. 세 화면이 따로 그리면
 * 정답 표시 색이나 그림 자리 크기가 조금씩 어긋나 같은 앱으로 보이지 않는다.
 */
const WorldQuestionCard = ({ question, askAs, picked, onPick, tint }: Props) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const image = askAs ? selectPromptImage(askAs, question.prompt) : undefined;
	const fallback = askAs ? selectPromptImageFallback(askAs) : undefined;
	// 보기가 나라 이름인 모드면 국기를 함께 건다 — 국기 맞히기 모드에는 붙지 않는다 (ConstWorldTopics 의 answerAs)
	const withFlag = selectTopic(question.topic).modes.find((mode) => mode.key === question.mode)?.answerAs === 'flag';

	// 위인 초상은 앱이 아니라 위키미디어에서 받아 온다 — 끊기면 빈 네모만 남아 무엇을 묻는지 알 수 없다.
	// 못 받은 문항의 id 를 들고 있는다 (참/거짓으로 두면 다음 문항에서 직접 되돌려야 한다)
	const [brokenAt, setBrokenAt] = useState<string | null>(null);
	const broken = brokenAt === question.id;

	const optionStyle = (option: string) => {
		if (picked === null) {
			return styles.option;
		}
		if (option === question.answer) {
			return [styles.option, { borderColor: Colors.success, backgroundColor: Colors.successSoft }];
		}
		if (option === picked) {
			return [styles.option, { borderColor: Colors.error, backgroundColor: Colors.errorSoft }];
		}
		return [styles.option, styles.optionDim];
	};

	return (
		<View style={styles.stack}>
			<View style={styles.card}>
				<Text style={styles.question}>{question.question}</Text>
				{!image ? (
					<Text style={styles.prompt}>{question.prompt}</Text>
				) : (
					<View style={[styles.art, { backgroundColor: tint }]}>
						{broken && fallback ? (
							<Image source={fallback} style={styles.image} contentFit="contain" transition={160} />
						) : broken ? (
							<View style={styles.artBroken}>
								<IconComponent type="materialcommunityicons" name="image-off-outline" size={30} color={Colors.textMuted} />
								<Text style={styles.artBrokenText}>그림을 불러오지 못했어요</Text>
							</View>
						) : (
							<Image source={image} style={styles.image} contentFit="contain" transition={160} onError={() => setBrokenAt(question.id)} />
						)}
					</View>
				)}
			</View>

			<View style={styles.options}>
				{question.options.map((option) => (
					<PressableScale key={option} style={optionStyle(option)} onPress={() => onPick(option)} disabled={picked !== null} accessibilityRole="button">
						<View style={styles.optionBody}>
							{withFlag ? <CountryFlags name={option} /> : null}
							<Text style={styles.optionText}>{option}</Text>
						</View>
						{picked !== null && option === question.answer ? (
							<IconComponent type="materialcommunityicons" name="check-circle" size={19} color={Colors.success} />
						) : null}
					</PressableScale>
				))}
			</View>

			{picked !== null ? (
				<View style={styles.explain}>
					<Text style={styles.hint}>{question.entry.summary}</Text>
					{question.entry.facts.map((fact) => (
						<View key={fact} style={styles.factRow}>
							<View style={styles.dot} />
							<Text style={styles.factText}>{fact}</Text>
						</View>
					))}
				</View>
			) : null}
		</View>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		stack: { gap: SpacingV.lg },
		card: {
			borderRadius: Radius.xl,
			backgroundColor: Colors.surface,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: Colors.border,
			padding: Spacing.lg,
			gap: SpacingV.md,
			...Shadow.card,
		},
		question: { fontSize: Typography.bodySm, color: Colors.textSecondary },
		prompt: { fontSize: Typography.h2, fontWeight: FontWeight.bold, color: Colors.textStrong, textAlign: 'center', paddingVertical: SpacingV.md },
		art: { height: scaleHeight(160), borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
		image: { width: '100%', height: '100%' },
		artBroken: { alignItems: 'center', gap: SpacingV.xs },
		artBrokenText: { fontSize: Typography.caption, color: Colors.textMuted },

		options: { gap: SpacingV.sm },
		option: {
			minHeight: scaledSize(52),
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: Spacing.sm,
			paddingHorizontal: Spacing.lg,
			paddingVertical: SpacingV.sm,
			borderRadius: Radius.lg,
			borderWidth: scaledSize(1.5),
			borderColor: Colors.border,
			backgroundColor: Colors.surface,
		},
		optionDim: { opacity: 0.5 },
		// 국기와 글자를 한 덩어리로 묶는다 — 국기가 없는 보기와 있는 보기의 글자 시작점이 어긋나지 않게 왼쪽 정렬을 유지한다
		optionBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
		optionText: { flexShrink: 1, fontSize: Typography.callout, fontWeight: FontWeight.medium, color: Colors.text },
		// 해설은 카드와 같은 판 위에 올린다 — 보기 바로 아래 맨바닥에 두면 어디까지가 해설인지 경계가 없다
		explain: {
			gap: SpacingV.xs,
			padding: Spacing.lg,
			borderRadius: Radius.lg,
			backgroundColor: Colors.surfaceAlt,
		},
		hint: { fontSize: Typography.bodySm, fontWeight: FontWeight.medium, color: Colors.text, lineHeight: scaledSize(20) },
		factRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
		dot: { width: scaledSize(4), height: scaledSize(4), borderRadius: scaledSize(2), backgroundColor: Colors.textMuted, marginTop: scaledSize(8) },
		factText: { flex: 1, fontSize: Typography.footnote, color: Colors.textSecondary, lineHeight: scaledSize(18) },
	});

export default WorldQuestionCard;
