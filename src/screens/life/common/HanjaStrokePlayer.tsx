import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import HanjaStrokeCanvas from './HanjaStrokeCanvas';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { HanjaFontStyle } from '@/src/hooks/useHanjaFont';
import { useLife } from '@/src/hooks/useLife';
import { FontWeight, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { selectStrokes } from '@/src/const/data/life/ConstHanjaStrokes';
import { playPop } from '@/src/utils/SoundUtils';
import { scaleHeight, scaleWidth } from '@/src/utils';

interface Props {
	/** 그릴 한자어 — 글자를 하나씩 순서대로 그린다 */
	word: string;
	/** 글자 한 칸의 크기 (px) */
	size?: number;
	/** 획 위에 얹을 독음 — 설정에서 한글 훈음을 끄면 넘기지 않는다 */
	reading?: string;
	/**
	 * '따라 쓰기' 를 누르면 부르는 쪽에 획 자료가 있는 글자 목록을 넘긴다.
	 * 쓰는 판은 스크롤 밖 큰 화면에서 열어야 해서(획이 스크롤에 먹힌다) 여기서 직접 그리지 않는다.
	 */
	onTrace?: (chars: string[]) => void;
}

/**
 * 한자어를 획순대로 써 보여 주는 판.
 * -------------------------------------------------
 * - 앞 글자를 다 쓰면 다음 글자로 넘어가고, 마지막 글자까지 쓰면 "다시 보기" 버튼이 뜬다.
 * - 쓰는 중에는 "멈추기" 를 눌러 바로 완성된 글자로 건너뛸 수 있다 (획순을 다 볼 생각이 없는 사람용).
 * - 독음을 넘기면 획 위에 얹는다 — 무슨 단어를 쓰고 있는지 보면서 따라갈 수 있다.
 * - 획 자료가 없는 글자는 글씨체로 그냥 보여 준다 (자료는 1151자를 담고 있다).
 * - 설정에서 획순 애니메이션을 끄면 처음부터 글씨체로만 보여 준다 (캔버스를 아예 올리지 않는다).
 * - onTrace 를 넘기면 "따라 쓰기" 버튼이 뜬다. 실제로 쓰는 판은 부르는 쪽이 큰 화면으로 연다.
 */
const HanjaStrokePlayer = ({ word, size, reading, onTrace }: Props) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const { strokeAnim } = useLife();
	const chars = useMemo(() => [...word], [word]);
	/** 지금 쓰고 있는 글자 번호 — chars.length 가 되면 다 쓴 것 */
	const [at, setAt] = useState(0);
	/** 이 값을 올려 같은 글자를 처음부터 다시 쓰게 한다 */
	const [token, setToken] = useState(0);

	/** 획 자료가 있는 글자만 따라 쓸 수 있다 — 자료가 없으면 버튼 자체를 두지 않는다 */
	const traceChars = useMemo(() => (onTrace ? chars.filter((char) => !!selectStrokes(char)) : []), [chars, onTrace]);

	const box = size ?? scaleWidth(112);
	const done = at >= chars.length;
	/** 획순을 끄면 캔버스 대신 글씨체로만 보여 주므로, 칸을 꽉 채우도록 글자를 키운다 */
	const fallbackSize = useMemo(() => ({ fontSize: Math.round(box * 0.68), lineHeight: Math.round(box * 0.88) }), [box]);

	const onCharDone = useCallback(() => setAt((prev) => prev + 1), []);

	const replay = () => {
		playPop();
		setAt(0);
		setToken((prev) => prev + 1);
	};

	/** 쓰는 중에 멈추기 — 남은 글자를 다 쓴 것으로 치고 완성된 한자를 바로 보여 준다 */
	const skip = () => {
		playPop();
		setAt(chars.length);
	};

	/** 따라 쓰기 — 보기 연출은 멈춰 두고 큰 화면을 부르는 쪽에 맡긴다 */
	const startTrace = () => {
		playPop();
		setAt(chars.length);
		onTrace?.(traceChars);
	};

	return (
		<View style={styles.wrap}>
			{/* 획 위에 단어의 음 — 무엇을 쓰는 중인지 보면서 따라간다. 뜻은 아래 '뜻' 칸에서 한 번만 읽는다 */}
			{!!reading && (
				<View style={styles.headBox}>
					<Text style={styles.headReading}>{reading}</Text>
				</View>
			)}

			<View style={styles.row}>
				{chars.map((char, index) => {
					const strokes = strokeAnim ? selectStrokes(char) : null;
					const writing = strokeAnim && index === at;
					const written = index < at;
					return (
						<View
							key={`${char}-${index}`}
							style={[styles.cell, { width: box, height: box }, !strokeAnim && styles.cellPlain, writing && styles.cellActive]}>
							{/* 자료가 있는 글자는 획순대로 그리고, 없는 글자는 글씨체로 대신 보여 준다.
							    다 쓰고 나면 획 그림을 글씨체로 바꿔 같은 칸 크기 그대로 남긴다 — 획선보다 글씨가 또렷하다 */}
							{strokes && !done ? (
								<HanjaStrokeCanvas
									// 글자를 다 쓴 뒤에도 그대로 남아 있어야 하므로 언마운트하지 않는다
									char={char}
									size={box}
									color={Colors.textStrong}
									ghostColor={Colors.borderStrong}
									brushColor={Colors.primaryDark}
									playing={writing}
									pending={!writing && !written}
									playToken={token}
									onDone={writing ? onCharDone : undefined}
								/>
							) : (
								<Text style={[styles.fallback, fallbackSize]}>{char}</Text>
							)}
						</View>
					);
				})}
			</View>

			{/* 획순 연출을 꺼 둔 사람도 따라 쓰기는 할 수 있어야 한다 */}
			{!strokeAnim && traceChars.length > 0 && (
					<PressableScale style={styles.trace} onPress={startTrace} scaleTo={0.94} accessibilityRole="button" accessibilityLabel="획순 따라 쓰기">
						<IconComponent type="materialCommunityIcons" name="draw" size={14} color={Colors.textInverse} />
						<Text style={styles.traceText}>따라 쓰기</Text>
					</PressableScale>
				)}

				{strokeAnim &&
					(done ? (
						<View style={styles.controlRow}>
							<PressableScale style={styles.replay} onPress={replay} scaleTo={0.94} accessibilityRole="button">
								<IconComponent type="materialCommunityIcons" name="replay" size={14} color={Colors.primaryDark} />
								<Text style={styles.replayText}>획순 다시 보기</Text>
							</PressableScale>
							{traceChars.length > 0 && (
								<PressableScale style={styles.trace} onPress={startTrace} scaleTo={0.94} accessibilityRole="button" accessibilityLabel="획순 따라 쓰기">
									<IconComponent type="materialCommunityIcons" name="draw" size={14} color={Colors.textInverse} />
									<Text style={styles.traceText}>따라 쓰기</Text>
								</PressableScale>
							)}
						</View>
					) : (
						<View style={styles.controlRow}>
							<View style={styles.writingChip}>
								<IconComponent type="materialCommunityIcons" name="brush" size={14} color={Colors.primaryDark} />
								<Text style={styles.replayText}>획순대로 쓰는 중</Text>
							</View>
							<PressableScale style={styles.skip} onPress={skip} scaleTo={0.94} accessibilityRole="button" accessibilityLabel="획순 멈추고 글자 보기">
								<IconComponent type="materialCommunityIcons" name="stop" size={14} color={Colors.textStrong} />
								<Text style={styles.skipText}>멈추기</Text>
							</PressableScale>
						</View>
					))}
			</View>
	);
};

const createStyles = (Colors: Palette, HanjaFont: HanjaFontStyle) =>
	StyleSheet.create({
		wrap: { alignItems: 'center', gap: SpacingV.sm },
		row: { flexDirection: 'row', gap: Spacing.sm },
		// 글자마다 같은 크기의 네모 칸을 준다 — 획수가 달라도 줄이 맞는다
		cell: {
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.border,
			backgroundColor: Colors.surfaceAlt,
		},
		// 획순을 끄면 쓰는 칸이 아니라 그냥 글씨다 — 테두리·바탕을 걷어 글자만 남긴다
		cellPlain: { borderWidth: 0, backgroundColor: 'transparent' },
		// 지금 쓰고 있는 글자만 테두리를 진하게 — 어디를 보면 되는지 알려 준다
		cellActive: { borderColor: Colors.primaryDark, backgroundColor: Colors.primaryBg },
		fallback: { ...HanjaFont, color: Colors.textStrong, textAlign: 'center' },

		// 획 위 머리말 — 지금 쓰는 단어의 독음. 좌우로 넘치지 않게 폭을 잡아 둔다
		headBox: { alignItems: 'center', gap: scaleHeight(2), paddingHorizontal: Spacing.md },
		headReading: { fontSize: Typography.title, fontWeight: FontWeight.bold, color: Colors.primaryDeep },

		controlRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
		trace: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(4),
			paddingHorizontal: Spacing.md,
			height: scaleHeight(28),
			borderRadius: Radius.pill,
			backgroundColor: Colors.primarySurface,
		},
		traceText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textInverse },
		replay: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(4),
			paddingHorizontal: Spacing.md,
			height: scaleHeight(28),
			borderRadius: Radius.pill,
			backgroundColor: Colors.primarySoft,
		},
		writingChip: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(4),
			paddingHorizontal: Spacing.md,
			height: scaleHeight(28),
			borderRadius: Radius.pill,
			backgroundColor: Colors.primarySoft,
		},
		skip: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(4),
			paddingHorizontal: Spacing.md,
			height: scaleHeight(28),
			borderRadius: Radius.pill,
			backgroundColor: Colors.surfaceAlt,
			borderWidth: 1,
			borderColor: Colors.border,
		},
		skipText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textStrong },
		replayText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.primaryDark },
	});

export default HanjaStrokePlayer;
