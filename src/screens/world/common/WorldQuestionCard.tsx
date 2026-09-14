import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { selectPromptImage } from '@/src/const/data/world/ConstWorldImages';
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
				{image ? (
					<View style={[styles.art, { backgroundColor: tint }]}>
						<Image source={image} style={styles.image} contentFit="contain" transition={160} />
					</View>
				) : (
					<Text style={styles.prompt}>{question.prompt}</Text>
				)}
			</View>

			<View style={styles.options}>
				{question.options.map((option) => (
					<PressableScale key={option} style={optionStyle(option)} onPress={() => onPick(option)} disabled={picked !== null} accessibilityRole="button">
						<Text style={styles.optionText}>{option}</Text>
						{picked !== null && option === question.answer ? (
							<IconComponent type="materialcommunityicons" name="check-circle" size={19} color={Colors.success} />
						) : null}
					</PressableScale>
				))}
			</View>

			{picked !== null ? <Text style={styles.hint}>{question.entry.summary}</Text> : null}
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
		optionText: { flex: 1, fontSize: Typography.callout, fontWeight: FontWeight.medium, color: Colors.text },
		hint: { fontSize: Typography.bodySm, color: Colors.textSecondary, lineHeight: scaledSize(20), textAlign: 'center' },
	});

export default WorldQuestionCard;
