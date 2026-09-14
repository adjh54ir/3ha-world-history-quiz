import React, { useEffect, useRef, useState } from 'react';
import AppModal from '@/src/four/screens/common/atomic/AppModal';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Switch, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useActiveEffects } from '@/src/hooks/useLife';
import { MODAL_MAX_WIDTH, scaledSize, scaleWidth } from '@/src/four/utils/DementionUtils';
import IconComponent from '../common/atomic/IconComponent';
import { Typography, FontWeight, Spacing, SpacingV, Radius } from '@/src/four/const/ConstDesign';
import { Colors } from '@/src/four/const/ConstColors';
import { isSoundEnabled, setSoundEnabled } from '@/src/four/utils/SoundUtils';
import { isBgmEnabled, setBgmEnabled, startBgm, stopBgm, BgmTrack } from '@/src/four/utils/BgmUtils';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';

export type QuizStartMode = 'meaning' | 'proverb' | 'blank' | 'example' | 'arrange' | 'wordchain';

/**
 * 이번 한 판으로 실제 소모되거나 이번 판 보상에 얹히는 것들.
 * -------------------------------------------------
 * 집중 부적·오답 방패·보물 인장은 "가지고만 있으면" 다음 퀴즈에 자동으로 쓰인다.
 * 쓰이는 순간 직전에 아무 안내가 없어서, 연습 삼아 켠 한 판에 아껴 둔 부적이 그냥 타 버렸다.
 * (연습 모드도 마찬가지다 — 점수·뱃지만 빠지고 아이템은 똑같이 소모된다)
 */
const QUIZ_EFFECT_KEYS = new Set(['focusCharm', 'wrongShield', 'chestSeal', 'answerAbacus']);

interface Props {
	visible: boolean;
	mode?: QuizStartMode;
	isPracticeMode?: boolean;
	timeLimit?: number; // 문제당 제한시간(초)
	scorePerCorrect?: number; // 정답 점수
	showHint?: boolean; // 힌트 안내 표시 여부
	/** 이 화면에서 재생 중인 BGM 트랙 — 스위치를 켰을 때 즉시 다시 틀어주기 위해 필요 */
	bgmTrack?: BgmTrack;
	onStart: () => void;
	onBack: () => void;
}

const MODE_META: Record<QuizStartMode, { title: string; desc: string; icon: string }> = {
	meaning: { title: '뜻 맞추기', desc: '한자어를 보고 올바른 뜻을 골라보세요.', icon: 'lightbulb' },
	proverb: { title: '한자어 찾기', desc: '뜻을 보고 알맞은 한자어를 골라보세요.', icon: 'search' },
	blank: { title: '빈 칸 채우기', desc: '한자어의 빠진 글자를 채워보세요.', icon: 'edit' },
	example: { title: '예문 빈칸', desc: '예문 속 빈칸에 들어갈 한자어를 골라보세요.', icon: 'subject' },
	arrange: { title: '한자 조각 배열', desc: '섞인 한자를 순서대로 배열해 한자어를 완성하세요.', icon: 'extension' },
	wordchain: { title: '한자어 끝말잇기', desc: '앞 한자어의 마지막 글자로 시작하는 한자어를 이어보세요. 두음법칙도 인정됩니다.', icon: 'link' },
};

/**
 * 퀴즈 시작 안내 공통 팝업
 * - 모든 퀴즈 모드에서 동일한 디자인으로 시작 전 안내를 표시합니다.
 */
const QuizStartModal = ({
	visible,
	mode = 'meaning',
	isPracticeMode = false,
	timeLimit = 30,
	scorePerCorrect = 10,
	showHint = true,
	bgmTrack = 'quiz',
	onStart,
	onBack,
}: Props) => {
	const scaleAnim = useRef(new Animated.Value(0.9)).current;
	const opacityAnim = useRef(new Animated.Value(0)).current;
	const meta = MODE_META[mode] ?? MODE_META.meaning;
	// 시작 전에 소리 설정을 바로 바꿀 수 있게 — 설정 화면까지 나갔다 오지 않아도 된다
	const [sfxOn, setSfxOn] = useState(isSoundEnabled());
	const [bgmOn, setBgmOn] = useState(isBgmEnabled());
	/** 이번 판에 쓰이는 아이템 — 목록은 홈·상점과 같은 한 벌(useActiveEffects)에서 온다 */
	const quizEffects = useActiveEffects().filter((item) => QUIZ_EFFECT_KEYS.has(item.key));

	// 팝업이 열릴 때마다 저장된 현재 값을 다시 읽어 스위치와 실제 설정을 맞춘다
	useEffect(() => {
		if (!visible) {
			return;
		}
		setSfxOn(isSoundEnabled());
		setBgmOn(isBgmEnabled());
	}, [visible]);

	const toggleSfx = (v: boolean) => {
		setSfxOn(v);
		setSoundEnabled(v);
	};

	const toggleBgm = (v: boolean) => {
		setBgmOn(v);
		setBgmEnabled(v); // false면 내부에서 stopBgm() 처리
		if (v) {
			startBgm(bgmTrack);
		} else {
			stopBgm();
		}
	};

	useEffect(() => {
		if (!visible) {
			return;
		}
		scaleAnim.setValue(0.9);
		opacityAnim.setValue(0);
		const anim = Animated.parallel([
			Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
			Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
		]);
		anim.start();
		return () => anim.stop(); // 모달이 닫히거나 언마운트되면 진행 중 애니메이션 정리
	}, [visible, scaleAnim, opacityAnim]);

	if (!visible) {
		return null;
	}

	const infoRows: { icon: string; text: string }[] = [
		{ icon: 'check-box', text: '보기 4개 중 하나를 고르는 방식입니다.' },
		{ icon: 'timer', text: `각 문제는 ${timeLimit}초 안에 풀어야 합니다.` },
		{ icon: 'star', text: `정답을 맞히면 ${scorePerCorrect}점을 얻습니다.` },
		{ icon: 'sentiment-satisfied-alt', text: '틀려도 점수가 깎이지 않습니다.' },
	];
	if (mode === 'arrange') {
		infoRows[0] = { icon: 'touch-app', text: '한자 조각을 순서대로 탭해서 완성합니다.' };
	}
	// 끝말잇기는 보기를 고르는 방식이 아니라 직접 입력이다. '보기 4개' 안내가 그대로 나가던 문제 수정
	if (mode === 'wordchain') {
		infoRows[0] = { icon: 'keyboard', text: '한자어를 한글로 직접 입력합니다.' };
	}
	if (showHint) {
		infoRows.push({ icon: 'lightbulb', text: '힌트 버튼으로 단서를 확인할 수 있습니다.' });
	}

	return (
		<AppModal visible={visible} transparent animationType="fade" onRequestClose={onBack}>
			<View style={styles.overlay}>
				<Animated.View style={[styles.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
					<View style={[styles.iconCircle, isPracticeMode && { backgroundColor: Colors.accentOrangeSoft }]}>
						<IconComponent type="materialIcons" name={meta.icon} size={scaledSize(30)} color={isPracticeMode ? Colors.accentOrange : Colors.secondaryDark} />
					</View>

					<Text style={styles.title}>{meta.title}</Text>
					<Text style={styles.desc}>{meta.desc}</Text>

					{/* 안내 줄이 많은 모드(+연습 배너)에서는 작은 기기에서 내용이 잘린다. 가운데만 스크롤시킨다 */}
					<ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
					{isPracticeMode && (
						<View style={styles.practiceBanner}>
							<IconComponent type="materialIcons" name="info" size={scaledSize(14)} color={Colors.accentOrange} />
							<Text style={styles.practiceText}>연습 모드 · 점수와 뱃지가 기록되지 않습니다.</Text>
						</View>
					)}

					{/* 이번 판에 쓰이는 아이템 — 아무것도 없으면 상자 자체를 두지 않는다 */}
					{quizEffects.length > 0 && (
						<View style={styles.effectBox}>
							<View style={styles.effectHead}>
								<IconComponent type="materialIcons" name="bolt" size={scaledSize(15)} color={Colors.accentAmber} />
								<Text style={styles.effectHeadText}>이번 판에 쓰여요</Text>
							</View>
							{quizEffects.map((item) => (
								<View key={item.key} style={styles.effectRow}>
									<Image source={item.image} style={styles.effectAsset} contentFit="contain" accessible={false} />
									<View style={styles.effectBody}>
										<Text style={styles.effectLabel} numberOfLines={1}>
											{item.label}
										</Text>
										<Text style={styles.effectText} numberOfLines={2}>
											{item.effect}
										</Text>
									</View>
									<View style={[styles.effectBadge, item.forever && styles.effectBadgeForever]}>
										<Text style={[styles.effectBadgeText, item.forever && styles.effectBadgeTextForever]}>{item.badge}</Text>
									</View>
								</View>
							))}
							{/* 연습이라고 아이템이 남지 않는다 — 위 '기록되지 않습니다' 와 헷갈리지 않게 못을 박는다 */}
							{isPracticeMode && <Text style={styles.effectNote}>연습 모드에서도 아이템은 똑같이 소모돼요.</Text>}
						</View>
					)}

					<View style={styles.infoBox}>
						{infoRows.map((row, i) => (
							<View key={i} style={[styles.infoRow, i === infoRows.length - 1 && { marginBottom: 0 }]}>
								<View style={styles.infoIconChip}>
									<IconComponent type="materialIcons" name={row.icon} size={scaledSize(15)} color={Colors.secondaryDark} />
								</View>
								<Text style={styles.infoText}>{row.text}</Text>
							</View>
						))}
					</View>

					<View style={styles.soundBox}>
						<View style={styles.soundRow}>
							<View style={styles.soundLabelWrap}>
								<View style={styles.infoIconChip}>
									<IconComponent type="materialIcons" name="volume-up" size={scaledSize(15)} color={Colors.secondaryDark} />
								</View>
								<Text style={styles.soundLabel}>효과음</Text>
							</View>
							<Switch
								value={sfxOn}
								onValueChange={toggleSfx}
								trackColor={{ false: Colors.borderStrong, true: Colors.primaryLight }}
								thumbColor={sfxOn ? Colors.primary : Colors.surface}
							/>
						</View>
						<View style={[styles.soundRow, { marginBottom: 0 }]}>
							<View style={styles.soundLabelWrap}>
								<View style={styles.infoIconChip}>
									<IconComponent type="materialIcons" name="music-note" size={scaledSize(15)} color={Colors.secondaryDark} />
								</View>
								<Text style={styles.soundLabel}>배경음</Text>
							</View>
							<Switch
								value={bgmOn}
								onValueChange={toggleBgm}
								trackColor={{ false: Colors.borderStrong, true: Colors.primaryLight }}
								thumbColor={bgmOn ? Colors.primary : Colors.surface}
							/>
						</View>
					</View>
					</ScrollView>

					<View style={styles.buttonRow}>
						<TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.85}>
							<Text style={styles.backButtonText}>돌아가기</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.startButton} onPress={onStart} activeOpacity={0.85}>
							<IconComponent type="materialIcons" name="play-arrow" size={scaledSize(18)} color={Colors.textInverse} />
							<Text style={styles.startButtonText}>시작하기</Text>
						</TouchableOpacity>
					</View>
				</Animated.View>
			</View>
		</AppModal>
	);
};

export default QuizStartModal;

const makeStyles = () => StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: Colors.scrim,
		justifyContent: 'center',
		alignItems: 'center',
		padding: Spacing.xxl,
	},
	card: {
		width: '100%',
		maxWidth: Math.min(scaleWidth(360), MODAL_MAX_WIDTH),
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		paddingVertical: SpacingV.xxl,
		paddingHorizontal: Spacing.xxl,
		alignItems: 'center',
		maxHeight: '90%',
	},
	// flexShrink 가 없으면 maxHeight 부모 안에서 스크롤되지 않고 그냥 잘린다
	body: { width: '100%', flexShrink: 1 },
	bodyContent: { alignItems: 'center' },
	iconCircle: {
		width: scaleWidth(60),
		height: scaleWidth(60),
		borderRadius: scaleWidth(30),
		backgroundColor: Colors.secondaryBg,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: SpacingV.lg,
	},
	title: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.heavy,
		color: Colors.textStrong,
		marginBottom: SpacingV.sm,
		textAlign: 'center',
	},
	desc: {
		fontSize: Typography.body,
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: scaledSize(20),
		marginBottom: SpacingV.lg,
	},
	practiceBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		backgroundColor: Colors.accentOrangeBg,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.md,
		marginBottom: SpacingV.lg,
	},
	practiceText: { fontSize: Typography.footnote, color: Colors.accentOrange, fontWeight: FontWeight.bold, flexShrink: 1 },

	/**
	 * 이번 판에 쓰이는 아이템 상자.
	 * 안내 줄(infoBox)과 같은 너비·같은 모서리를 쓰되 금빛 테로 "지금 켜져 있다" 를 구분한다.
	 */
	effectBox: {
		width: '100%',
		gap: SpacingV.sm,
		backgroundColor: Colors.accentAmberSoft,
		borderWidth: 1,
		borderColor: Colors.accentAmber,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.md,
		marginBottom: SpacingV.lg,
	},
	effectHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
	effectHeadText: { fontSize: Typography.footnote, fontWeight: FontWeight.heavy, color: Colors.accentOrangeInk },
	effectRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	effectAsset: { width: scaleWidth(28), height: scaleWidth(28) },
	effectBody: { flex: 1, gap: scaledSize(1) },
	effectLabel: { fontSize: Typography.footnote, fontWeight: FontWeight.heavy, color: Colors.textStrong },
	effectText: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: scaledSize(15) },
	effectBadge: { paddingHorizontal: Spacing.sm, paddingVertical: scaledSize(2), borderRadius: Radius.pill, backgroundColor: Colors.surface },
	effectBadgeForever: { backgroundColor: Colors.secondarySoft },
	effectBadgeText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: Colors.accentOrangeDark },
	effectBadgeTextForever: { color: Colors.secondaryDark },
	effectNote: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.accentOrangeDark },
	infoBox: {
		width: '100%',
		backgroundColor: Colors.background,
		borderRadius: Radius.lg,
		padding: Spacing.lg,
		marginBottom: SpacingV.xl,
	},
	infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: SpacingV.md },
	infoIconChip: {
		width: scaleWidth(28),
		height: scaleWidth(28),
		borderRadius: Radius.sm,
		backgroundColor: Colors.secondaryBg,
		justifyContent: 'center',
		alignItems: 'center',
	},
	infoText: { flex: 1, fontSize: Typography.bodySm, color: Colors.text, lineHeight: scaledSize(18) },
	soundBox: {
		width: '100%',
		backgroundColor: Colors.background,
		borderRadius: Radius.lg,
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.lg,
		marginBottom: SpacingV.lg,
	},
	soundRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: SpacingV.xs,
	},
	soundLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
	soundLabel: { fontSize: Typography.bodySm, fontWeight: FontWeight.bold, color: Colors.text },
	buttonRow: { flexDirection: 'row', gap: Spacing.md, width: '100%' },
	backButton: {
		flex: 1,
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.lg,
		paddingVertical: SpacingV.lg,
		alignItems: 'center',
	},
	backButtonText: { flexShrink: 1, fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: Colors.textSecondary },
	startButton: {
		flex: 1.5,
		flexDirection: 'row',
		gap: Spacing.xs,
		backgroundColor: Colors.secondarySurface,
		borderRadius: Radius.lg,
		paddingVertical: SpacingV.lg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	startButtonText: { flexShrink: 1, fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: Colors.textInverse },
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
