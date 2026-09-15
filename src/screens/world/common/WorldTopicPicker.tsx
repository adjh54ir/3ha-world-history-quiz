import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { WORLD_TOPICS } from '@/src/const/data/world/ConstWorldTopics';
import type { WorldType } from '@/src/types/data/WorldType';
import { playPop } from '@/src/utils/SoundUtils';
import { scaledSize, scaleHeight } from '@/src/utils';

interface Props {
	/** 고른 주제. undefined 면 '전체' */
	value?: WorldType.TopicKey;
	onChange: (next?: WorldType.TopicKey) => void;
	/** 칩 줄 위에 붙는 설명 */
	label?: string;
}

/**
 * 챌린지에서 쓰는 주제 고르기 줄.
 *
 * 타워·타임 챌린지는 원래 전체에서 섞어 냈다. 그러면 자신 있는 주제로 기록을 겨루고 싶은 사람이
 * 할 수 있는 것이 없다. '전체' 를 맨 앞에 두고 기본값으로 둬서 예전과 같은 판이 그대로 남게 한다.
 */
const WorldTopicPicker = ({ value, onChange, label = '주제 고르기' }: Props) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);

	const pick = (next?: WorldType.TopicKey) => {
		playPop();
		onChange(next);
	};

	return (
		<View style={styles.wrap}>
			<Text style={styles.label}>{label}</Text>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
				<PressableScale
					style={[styles.chip, !value && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}
					onPress={() => pick(undefined)}
					accessibilityRole="button"
					accessibilityState={{ selected: !value }}>
					<Text style={[styles.chipText, !value && { color: Colors.textInverse }]}>전체</Text>
				</PressableScale>
				{WORLD_TOPICS.map((topic) => {
					const on = topic.key === value;
					return (
						<PressableScale
							key={topic.key}
							style={[styles.chip, on && { backgroundColor: Colors[topic.color], borderColor: Colors[topic.color] }]}
							onPress={() => pick(topic.key)}
							accessibilityRole="button"
							accessibilityState={{ selected: on }}>
							<IconComponent
								type="materialcommunityicons"
								name={topic.icon}
								size={13}
								color={on ? Colors.textInverse : Colors[topic.color]}
							/>
							<Text style={[styles.chipText, on && { color: Colors.textInverse }]}>{topic.label}</Text>
						</PressableScale>
					);
				})}
			</ScrollView>
		</View>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		wrap: { gap: SpacingV.xs },
		label: { fontSize: Typography.footnote, color: Colors.textSecondary },
		// 칩 줄은 화면 좌우 여백을 넘어 흐른다 — 붙이는 쪽에서 negative margin 없이 쓰도록 여기서 padding 만 준다
		row: { gap: Spacing.xs, paddingVertical: scaleHeight(2) },
		chip: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaledSize(4),
			paddingHorizontal: Spacing.md,
			paddingVertical: scaleHeight(6),
			borderRadius: Radius.pill,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: Colors.border,
			backgroundColor: Colors.surface,
		},
		chipText: { fontSize: Typography.caption, fontWeight: FontWeight.semibold, color: Colors.text },
	});

export default WorldTopicPicker;
