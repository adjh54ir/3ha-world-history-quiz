import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useDispatch } from 'react-redux';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import ProgressBar from './ProgressBar';
import { Palette, onSurface } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useLife } from '@/src/hooks/useLife';
import { useAnimationRunner, useScreenEnter } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { EXP, MISSIONS } from '@/src/const/data/life/ConstLifeRewards';
import { isMissionDone, toDateKey } from '@/src/services/life/LifeRules';
import { claimMissions } from '@/src/store/slice/LifeSlice';
import { playPop } from '@/src/utils/SoundUtils';
import type { LifeType } from '@/src/types/data/LifeType';
import { scaleHeight, scaleWidth } from '@/src/utils';

interface Props {
	/** 미션 줄을 누르면 그 일을 할 수 있는 화면으로 보낸다 */
	onPressMission: (key: LifeType.MissionKey) => void;
}

/** 미션 한 줄 — 끝나면 체크가 튀어 오르고 글자에 줄이 그어진다 */
const MissionRow = ({ mission, value, done, onPress }: { mission: LifeType.Mission; value: number; done: boolean; onPress: () => void }) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const run = useAnimationRunner();
	const check = useRef(new Animated.Value(done ? 1 : 0)).current;
	const wasDone = useRef(done);

	useEffect(() => {
		if (done && !wasDone.current) {
			check.setValue(0);
			run(Animated.spring(check, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }));
		} else if (!done) {
			check.setValue(0);
		}
		wasDone.current = done;
	}, [check, done, run]);

	return (
		<PressableScale style={styles.row} onPress={onPress} disabled={done} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={mission.label}>
			<View style={[styles.rowIcon, done && styles.rowIconDone]}>
				{done ? (
					<Animated.View style={{ transform: [{ scale: check }] }}>
						<IconComponent type="materialCommunityIcons" name="check-bold" size={18} color={onSurface(Colors.success)} />
					</Animated.View>
				) : (
					<IconComponent type="materialCommunityIcons" name={mission.icon} size={18} color={Colors.primaryDark} />
				)}
			</View>
			<View style={styles.rowText}>
				<Text style={[styles.rowLabel, done && styles.rowLabelDone]} numberOfLines={1}>
					{mission.label}
				</Text>
				<ProgressBar ratio={Math.min(1, value / mission.goal)} color={done ? Colors.success : Colors.primary} height={scaleHeight(5)} />
			</View>
			<Text style={[styles.rowCount, done && styles.rowCountDone]}>{`${Math.min(value, mission.goal)}/${mission.goal}`}</Text>
		</PressableScale>
	);
};

/**
 * 다 채운 날의 경험치 보상 — 빛무리가 커졌다 작아지고 메달이 흔들린다.
 * 눌러야 보상이 나오므로 "여기를 누르라"는 신호가 계속 있어야 한다.
 */
const MissionReward = ({ ready, claimed, onClaim }: { ready: boolean; claimed: boolean; onClaim: () => void }) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const glow = useRef(new Animated.Value(0)).current;
	const shake = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!ready) {
			return;
		}
		glow.setValue(0);
		shake.setValue(0);
		const breathe = Animated.loop(
			Animated.sequence([
				Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
				Animated.timing(glow, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
			]),
		);
		const wiggle = Animated.loop(
			Animated.sequence([
				Animated.timing(shake, { toValue: 1, duration: 90, easing: Easing.linear, useNativeDriver: true }),
				Animated.timing(shake, { toValue: -1, duration: 90, easing: Easing.linear, useNativeDriver: true }),
				Animated.timing(shake, { toValue: 1, duration: 90, easing: Easing.linear, useNativeDriver: true }),
				Animated.timing(shake, { toValue: 0, duration: 90, easing: Easing.linear, useNativeDriver: true }),
				Animated.delay(1100),
			]),
		);
		breathe.start();
		wiggle.start();
		return () => {
			breathe.stop();
			wiggle.stop();
		};
	}, [glow, ready, shake]);

	return (
		<PressableScale
			style={styles.rewardVisual}
			onPress={onClaim}
			disabled={!ready}
			scaleTo={0.92}
			accessibilityRole="button"
			accessibilityLabel={ready ? '오늘의 미션 경험치 받기' : '오늘의 미션 보상'}>
			{ready && (
				<Animated.View
					pointerEvents="none"
					style={[
						styles.rewardGlow,
						{
							opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.75] }),
							transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }],
						},
					]}
				/>
			)}
			<Animated.View
				style={
					ready
						? { transform: [{ rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ['-9deg', '9deg'] }) }] }
						: undefined
				}>
				<View style={[styles.rewardMedal, !ready && !claimed && styles.rewardMedalDim]}>
					<IconComponent
						type="materialCommunityIcons"
						name={claimed ? 'check-decagram' : 'star-four-points'}
						size={34}
						color={claimed ? Colors.success : Colors.accentAmber}
					/>
				</View>
			</Animated.View>
			<View style={[styles.rewardChip, claimed && styles.rewardChipDone, ready && styles.rewardChipReady]}>
				<IconComponent
					type="materialCommunityIcons"
					name={claimed ? 'check-bold' : 'star-outline'}
					size={13}
					color={claimed ? onSurface(Colors.success) : ready ? Colors.textInverse : Colors.accentAmber}
				/>
				<Text style={[styles.rewardText, claimed && styles.rewardTextDone, ready && styles.rewardTextReady]}>
					{claimed ? '완료' : ready ? '받기' : `+${EXP.mission}EXP`}
				</Text>
			</View>
		</PressableScale>
	);
};

/**
 * 오늘의 미션 — 홈 히어로 바로 아래. 셋 다 채우면 경험치 보상이 빛난다.
 * 날짜가 바뀌면 슬라이스의 ensureDaily 가 미션도 같이 새로 만들어 준다.
 */
const MissionCard = ({ onPressMission }: Props) => {
	const styles = useThemedStyles(createStyles);
	const dispatch = useDispatch();
	const { missions } = useLife();
	// 미션이 없던 버전의 저장본이거나 아직 오늘로 안 바뀌었으면 전부 0으로 보여 준다
	const today = missions?.date === toDateKey() ? missions : null;
	const doneCount = MISSIONS.filter((item) => today && isMissionDone(today, item.key)).length;
	const claimed = !!today?.claimed;
	/** 셋 다 채웠는데 아직 안 받았다 — 보상이 빛나는 상태 */
	const ready = doneCount === MISSIONS.length && !claimed;
	// 홈의 다른 카드처럼 아래에서 떠오르며 등장한다 (히어로 다음 순서)
	const enterStyle = useScreenEnter(16, 300);

	const onClaim = useCallback(() => {
		playPop();
		dispatch(claimMissions());
	}, [dispatch]);

	return (
		<Animated.View style={[styles.card, ready && styles.cardReady, claimed && styles.cardDone, enterStyle]}>
			<View style={styles.head}>
				<View style={styles.headText}>
					<Text style={styles.title}>오늘의 미션</Text>
					<Text style={[styles.subtitle, ready && styles.subtitleReady]} numberOfLines={2}>
						{claimed
							? '오늘 보상까지 다 받았어요. 내일 또 만나요!'
							: ready
								? `미션 완료! 보상 버튼을 눌러 +${EXP.mission}EXP를 받으세요`
								: `${doneCount} / ${MISSIONS.length} 완료 · 다 채우면 ${EXP.mission}EXP`}
					</Text>
				</View>
				<MissionReward ready={ready} claimed={claimed} onClaim={onClaim} />
			</View>
			{/* 진행 점 세 개 — 몇 개 남았는지 글자 없이도 보인다 */}
			<View style={styles.dots}>
				{MISSIONS.map((item) => (
					<View key={item.key} style={[styles.dot, today && isMissionDone(today, item.key) && styles.dotOn]} />
				))}
			</View>
			<View style={styles.rows}>
				{MISSIONS.map((mission) => (
					<MissionRow
						key={mission.key}
						mission={mission}
						value={today?.progress[mission.key] ?? 0}
						done={!!today && isMissionDone(today, mission.key)}
						onPress={() => onPressMission(mission.key)}
					/>
				))}
			</View>
		</Animated.View>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, gap: SpacingV.md, borderWidth: 1, borderColor: Colors.surface, ...Shadow.card },
		// 받을 게 남은 날은 금빛 테두리로 "여기 눌러라"를 카드 전체가 말한다
		cardReady: { borderColor: Colors.accentAmber, backgroundColor: Colors.accentAmberSoft },
		// 다 받은 날은 카드 테두리가 옅은 초록으로 바뀌어 "오늘 할 일 끝"이 멀리서도 보인다
		cardDone: { borderColor: Colors.success, backgroundColor: Colors.successSoft },
		dots: { flexDirection: 'row', gap: Spacing.xs, marginTop: -SpacingV.xs },
		dot: { flex: 1, height: scaleHeight(4), borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt },
		dotOn: { backgroundColor: Colors.success },
		head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
		headText: { flex: 1, gap: scaleHeight(2) },
		title: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.textStrong },
		subtitle: { fontSize: Typography.caption, color: Colors.textSecondary },
		subtitleReady: { color: Colors.textStrong, fontWeight: FontWeight.bold },

		rewardVisual: { width: scaleWidth(76), alignItems: 'center', justifyContent: 'center' },
		rewardGlow: {
			position: 'absolute',
			top: -scaleHeight(4),
			width: scaleWidth(74),
			height: scaleWidth(74),
			borderRadius: scaleWidth(37),
			backgroundColor: Colors.accentAmber,
		},
		rewardMedal: { width: scaleWidth(68), height: scaleWidth(58), marginTop: -SpacingV.sm, alignItems: 'center', justifyContent: 'center' },
		rewardMedalDim: { opacity: 0.55 },
		rewardChip: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(4),
			paddingHorizontal: Spacing.md,
			height: scaleHeight(26),
			marginTop: -SpacingV.sm,
			borderRadius: Radius.pill,
			backgroundColor: Colors.accentAmberSoft,
		},
		rewardChipReady: { backgroundColor: Colors.accentOrange },
		rewardChipDone: { backgroundColor: Colors.success },
		rewardText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textStrong },
		rewardTextReady: { color: Colors.textInverse },
		rewardTextDone: { color: onSurface(Colors.success) },

		rows: { gap: SpacingV.sm },
		row: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			paddingVertical: SpacingV.sm,
			paddingHorizontal: Spacing.md,
			borderRadius: Radius.lg,
			backgroundColor: Colors.surfaceAlt,
		},
		rowIcon: { width: scaleWidth(36), height: scaleWidth(36), borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySoft },
		rowIconDone: { backgroundColor: Colors.success },
		rowText: { flex: 1, gap: scaleHeight(6) },
		rowLabel: { fontSize: Typography.bodySm, fontWeight: FontWeight.semibold, color: Colors.textStrong },
		rowLabelDone: { color: Colors.textSecondary, textDecorationLine: 'line-through' },
		rowCount: { minWidth: scaleWidth(30), textAlign: 'right', fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textSecondary },
		rowCountDone: { color: Colors.success },
	});

export default MissionCard;
