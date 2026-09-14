import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import HanjaTracePad from '@/src/screens/life/common/HanjaTracePad';
import ProgressBar from '@/src/screens/life/common/ProgressBar';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { playComplete, playPop } from '@/src/utils/SoundUtils';
import { scaleHeight, scaleWidth } from '@/src/utils';

interface Props {
	/** 따라 쓸 글자들 — null 이면 닫힌 상태 */
	chars: string[] | null;
	onClose: () => void;
}

/**
 * 따라 쓰기 전용 큰 화면.
 * -------------------------------------------------
 * 예전에는 단어 상세 시트의 스크롤 안에서 바로 썼다. 판 위에서 그은 손가락을 스크롤이 먼저 가져가
 * 획이 자주 씹혔다. 여기서는 스크롤 밖 — 화면을 통째로 덮는 판 하나만 두고 크게 쓴다.
 *
 * RN 의 Modal 을 또 얹지 않고 절대 위치 뷰로 덮는다 — iOS 에서 모달 위 모달은 터치가 먹통이 된다.
 * (이미 단어 상세가 Modal 안에 있으므로 이 뷰가 그 Modal 을 가득 채운다)
 */
const HanjaTraceOverlay = ({ chars, onClose }: Props) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const insets = useSafeAreaInsets();
	const { width, height } = useWindowDimensions();
	/** 지금 쓰는 글자 번호 */
	const [at, setAt] = useState(0);
	/** 다 쓴 글자 수 — 마지막 글자를 끝내면 축하 줄로 바뀐다 */
	const [cleared, setCleared] = useState(false);

	const total = chars?.length ?? 0;
	const char = chars?.[at];

	const onCharDone = useCallback(() => {
		const next = at + 1;
		if (next >= total) {
			playComplete();
			setCleared(true);
			return;
		}
		setAt(next);
	}, [at, total]);

	const restart = useCallback(() => {
		playPop();
		setAt(0);
		setCleared(false);
	}, []);

	const close = useCallback(() => {
		playPop();
		setAt(0);
		setCleared(false);
		onClose();
	}, [onClose]);

	if (!chars || total === 0) {
		return null;
	}

	// 판은 화면 폭과 높이 중 좁은 쪽에 맞춘다 — 가로가 넓은 태블릿에서도 한 화면에 들어온다
	const pad = Math.min(width - Spacing.xxl * 2, height * 0.46);

	return (
		<View style={[styles.overlay, { paddingTop: insets.top + SpacingV.md, paddingBottom: insets.bottom + SpacingV.lg }]}>
			<View style={styles.topBar}>
				<View style={styles.titleBox}>
					<Text style={styles.title}>따라 쓰기</Text>
					<Text style={styles.subtitle}>{`${at + (cleared ? 0 : 1)} / ${total}번째 글자`}</Text>
				</View>
				<PressableScale style={styles.close} onPress={close} scaleTo={0.92} accessibilityRole="button" accessibilityLabel="따라 쓰기 닫기">
					<IconComponent type="materialCommunityIcons" name="close" size={20} color={Colors.textStrong} />
				</PressableScale>
			</View>

			<View style={styles.gaugeBox}>
				<ProgressBar ratio={cleared ? 1 : at / total} height={scaleHeight(6)} />
			</View>

			<View style={styles.stageBox}>
				{cleared ? (
					<View style={styles.doneBox}>
						<IconComponent type="materialCommunityIcons" name="check-decagram" size={scaleWidth(64)} color={Colors.success} />
						<Text style={styles.doneTitle}>{`${chars.join('')} 다 썼어요!`}</Text>
						<Text style={styles.doneHint}>손이 기억할 때까지 한 번 더 써 볼까요?</Text>
					</View>
				) : (
					!!char && <HanjaTracePad key={`${char}-${at}`} char={char} size={pad} onComplete={onCharDone} />
				)}
			</View>

			{!cleared && (
				<View style={styles.hintRow}>
					<IconComponent type="materialCommunityIcons" name="gesture-tap" size={15} color={Colors.primaryDark} />
					<Text style={styles.hintText}>{`${char} · 파란 점에서 출발해 획을 그어요`}</Text>
				</View>
			)}

			<View style={styles.buttonRow}>
				<PressableScale style={styles.ghost} onPress={restart} scaleTo={0.96} accessibilityRole="button">
					<IconComponent type="materialCommunityIcons" name="replay" size={17} color={Colors.primaryDark} />
					<Text style={styles.ghostText}>처음부터</Text>
				</PressableScale>
				<PressableScale style={styles.primary} onPress={close} scaleTo={0.96} accessibilityRole="button">
					<Text style={styles.primaryText}>{cleared ? '완료' : '그만하기'}</Text>
				</PressableScale>
			</View>
		</View>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		// 단어 상세 모달 위를 통째로 덮는다 — 스크롤이 없으니 손가락이 판에만 닿는다
		overlay: {
			...StyleSheet.absoluteFillObject,
			paddingHorizontal: Spacing.xl,
			gap: SpacingV.md,
			backgroundColor: Colors.background,
		},
		topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
		titleBox: { gap: scaleHeight(2) },
		title: { fontSize: Typography.h3, fontWeight: FontWeight.heavy, color: Colors.textStrong },
		subtitle: { fontSize: Typography.bodySm, color: Colors.textSecondary },
		close: {
			width: scaleWidth(38),
			height: scaleWidth(38),
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.surfaceAlt,
		},
		gaugeBox: { width: '100%' },
		stageBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
		doneBox: { alignItems: 'center', gap: SpacingV.sm },
		doneTitle: { marginTop: SpacingV.sm, fontSize: Typography.h3, fontWeight: FontWeight.heavy, color: Colors.textStrong, textAlign: 'center' },
		doneHint: { fontSize: Typography.bodySm, color: Colors.textSecondary, textAlign: 'center' },

		hintRow: {
			alignSelf: 'center',
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.xs,
			paddingHorizontal: Spacing.lg,
			height: scaleHeight(32),
			borderRadius: Radius.pill,
			backgroundColor: Colors.primarySoft,
		},
		hintText: { fontSize: Typography.bodySm, fontWeight: FontWeight.bold, color: Colors.primaryDark },

		buttonRow: { flexDirection: 'row', gap: Spacing.sm },
		ghost: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: Spacing.xs,
			height: scaleHeight(50),
			borderRadius: Radius.pill,
			backgroundColor: Colors.primarySoft,
		},
		ghostText: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.primaryDark },
		primary: {
			flex: 1.2,
			alignItems: 'center',
			justifyContent: 'center',
			height: scaleHeight(50),
			borderRadius: Radius.pill,
			backgroundColor: Colors.primarySurface,
		},
		primaryText: { fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: Colors.textInverse },
	});

export default HanjaTraceOverlay;
