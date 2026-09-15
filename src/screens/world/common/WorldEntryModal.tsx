import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import AppModal from '@/src/screens/common/atomic/AppModal';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { selectEntryImage } from '@/src/const/data/world/ConstWorldImages';
import { selectTopic } from '@/src/const/data/world/ConstWorldTopics';
import type { WorldType } from '@/src/types/data/WorldType';
import { scaledSize, scaleHeight } from '@/src/utils';

/** 모달의 큰 그림 자리에 맞춰 받아 오는 폭 — 줄 썸네일보다 크게 잡는다 */
const DETAIL_WIDTH = 640;

/** 난이도 표시 — 사전에서도 학습 카드와 같은 말을 쓴다 */
const LEVEL_LABEL: Record<WorldType.Level, string> = { 1: '초급', 2: '중급', 3: '고급', 4: '특급' };

interface Props {
	/** 열려 있는 항목. null 이면 닫힌 상태 */
	entry: WorldType.Entry | null;
	/** 즐겨찾기에 담겨 있는지 */
	favorite: boolean;
	onToggleFavorite: (id: string) => void;
	onClose: () => void;
}

/**
 * 사전 항목 한 장 — 이름·그림·설명·곁가지·주제별 값.
 *
 * 목록은 두 줄 요약까지가 한계라, 눌렀을 때 들어 있는 값을 전부 펼쳐 주는 자리가 따로 필요하다.
 * 학습 카드와 같은 내용을 보여 주지만 여기는 "찾아보는" 자리라 순서·진도와 무관하게 연다.
 */
const WorldEntryModal = ({ entry, favorite, onToggleFavorite, onClose }: Props) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	if (!entry) {
		return null;
	}
	const topic = selectTopic(entry.id.split('-')[0] as WorldType.TopicKey);
	const image = selectEntryImage(topic.key, entry, DETAIL_WIDTH);
	// 주제별 값 주머니 — 어떤 열쇠를 사람이 읽는 말로 부를지는 주제의 문제 유형이 알고 있다
	const labels = new Map(topic.modes.map((mode) => [mode.answer, mode.label]));
	const facts = Object.entries(entry.fields).filter(([key]) => labels.has(key) && key !== 'image' && key !== 'code');

	return (
		<AppModal visible={!!entry} onClose={onClose} align="bottom">
			<View style={styles.sheet}>
				<View style={styles.grabber} />
				<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
					{image ? (
						<View style={[styles.art, { backgroundColor: Colors[topic.tint] }]}>
							<Image source={image} style={styles.image} contentFit="contain" transition={180} />
						</View>
					) : null}

					<View style={styles.head}>
						<View style={styles.headText}>
							<View style={styles.chips}>
								<View style={[styles.chip, { backgroundColor: Colors[topic.tint] }]}>
									<IconComponent type="materialcommunityicons" name={topic.icon} size={12} color={Colors[topic.color]} />
									<Text style={[styles.chipText, { color: Colors[topic.color] }]}>{topic.label}</Text>
								</View>
								<View style={[styles.chip, { backgroundColor: Colors.surfaceAlt }]}>
									<Text style={[styles.chipText, { color: Colors.textSecondary }]}>{LEVEL_LABEL[entry.level]}</Text>
								</View>
							</View>
							<Text style={styles.name}>{entry.name}</Text>
						</View>
						<PressableScale
							onPress={() => onToggleFavorite(entry.id)}
							scaleTo={0.9}
							accessibilityRole="button"
							accessibilityLabel={`${entry.name} 즐겨찾기`}>
							<IconComponent
								type="materialcommunityicons"
								name={favorite ? 'star' : 'star-outline'}
								size={24}
								color={favorite ? Colors.warning : Colors.textMuted}
							/>
						</PressableScale>
					</View>

					<Text style={styles.summary}>{entry.summary}</Text>

					{facts.length > 0 ? (
						<View style={styles.valueCard}>
							{facts.map(([key, value]) => (
								<View key={key} style={styles.valueRow}>
									<Text style={styles.valueLabel}>{labels.get(key)}</Text>
									<Text style={styles.valueText} numberOfLines={2}>
										{value}
									</Text>
								</View>
							))}
						</View>
					) : null}

					<View style={styles.factList}>
						{entry.facts.map((fact) => (
							<View key={fact} style={styles.factRow}>
								<View style={[styles.dot, { backgroundColor: Colors[topic.color] }]} />
								<Text style={styles.factText}>{fact}</Text>
							</View>
						))}
					</View>
				</ScrollView>

				<PressableScale style={styles.close} onPress={onClose} accessibilityRole="button">
					<Text style={styles.closeText}>닫기</Text>
				</PressableScale>
			</View>
		</AppModal>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		// 바텀시트 — 화면을 다 덮지 않는다. 뒤 목록이 보여야 "어디서 열었는지" 가 남는다
		sheet: {
			maxHeight: '86%',
			borderTopLeftRadius: Radius.xl,
			borderTopRightRadius: Radius.xl,
			backgroundColor: Colors.surface,
			paddingTop: SpacingV.sm,
			paddingBottom: SpacingV.md,
		},
		grabber: {
			alignSelf: 'center',
			width: scaledSize(38),
			height: scaledSize(4),
			borderRadius: Radius.pill,
			backgroundColor: Colors.border,
			marginBottom: SpacingV.sm,
		},
		content: { paddingHorizontal: Spacing.lg, paddingBottom: SpacingV.md, gap: SpacingV.md },

		art: { height: scaleHeight(180), borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
		image: { width: '100%', height: '100%' },

		head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md },
		headText: { flex: 1, gap: SpacingV.xs },
		chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
		chip: { flexDirection: 'row', alignItems: 'center', gap: scaledSize(4), paddingHorizontal: Spacing.sm, paddingVertical: scaleHeight(3), borderRadius: Radius.pill },
		chipText: { fontSize: Typography.caption, fontWeight: FontWeight.semibold },
		name: { fontSize: Typography.h2, fontWeight: FontWeight.bold, color: Colors.textStrong },

		summary: { fontSize: Typography.body, color: Colors.text, lineHeight: scaledSize(22) },

		valueCard: { borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt, padding: Spacing.md, gap: SpacingV.xs },
		valueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
		valueLabel: { width: scaledSize(92), fontSize: Typography.footnote, color: Colors.textSecondary },
		valueText: { flex: 1, fontSize: Typography.bodySm, fontWeight: FontWeight.medium, color: Colors.textStrong },

		factList: { gap: SpacingV.xs },
		factRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
		dot: { width: scaledSize(5), height: scaledSize(5), borderRadius: scaledSize(3), marginTop: scaledSize(8) },
		factText: { flex: 1, fontSize: Typography.bodySm, color: Colors.textSecondary, lineHeight: scaledSize(20) },

		close: {
			marginHorizontal: Spacing.lg,
			marginTop: SpacingV.sm,
			height: scaledSize(48),
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.surfaceAlt,
		},
		closeText: { fontSize: Typography.callout, fontWeight: FontWeight.semibold, color: Colors.text },
	});

export default WorldEntryModal;
