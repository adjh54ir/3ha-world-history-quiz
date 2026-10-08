import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import AppModal from '@/src/screens/common/atomic/AppModal';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { getHomeCharacterImage } from '@/src/const/ConstCharacters';
import { SheetIn, useReducedMotion } from '@/src/screens/common/anim/Motion';
import Colors from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import OnboardingService, { INTEREST_OPTIONS, type Interest } from '@/src/services/OnboardingService';
import { RequestNotificationPermission } from '@/src/utils/NotifactionHelper';
import { themed } from '@/src/utils/ThemedStyles';

interface Props {
	visible: boolean;
	/** 완료 시 고른 값 전달 — 홈이 즉시 반영한다 */
	onDone: (interest: Interest, dailyGoal: number) => void;
}

const GOAL_OPTIONS = [5, 10, 20] as const;
const GOAL_DESC_KEY = { 5: 'modal.onboarding.goalDesc5', 10: 'modal.onboarding.goalDesc10', 20: 'modal.onboarding.goalDesc20' } as const;

/**
 * 첫 실행 온보딩 — 환영 → 관심 주제 → 하루 목표 → 알림 4스텝.
 * 건너뛰어도 기본값(둘 다 · 10문제)으로 완료 처리해 다시 뜨지 않게 한다.
 * 알림 권한은 마지막에 묻는다. 첫 화면에서 바로 물으면 대부분 거절하고, 거절하면 복습 알림이 통째로 막힌다.
 */
const OnboardingModal: React.FC<Props> = ({ visible, onDone }) => {
	const { t } = useTranslation();
	/** 인사 문구 — 한 글자씩 타이핑해 캐릭터가 말하는 느낌을 준다 (3줄 이내) */
	const greetLine = t('modal.onboarding.greetLine');
	const [step, setStep] = useState(0);
	// 인사 스텝 연출 — 타이핑 + 캐릭터 상하 흔들림 (공통 CharacterGuide 와 같은 톤)
	const reducedMotion = useReducedMotion();
	const [typed, setTyped] = useState('');
	const bob = useRef(new Animated.Value(0)).current;
	const greeting = visible && step === 0;
	useEffect(() => {
		if (!greeting) return;
		// '동작 줄이기'면 타자 효과 없이 전체 문장을 바로 보여준다
		if (reducedMotion) {
			setTyped(greetLine);
			return;
		}
		setTyped('');
		let i = 0;
		const timer = setInterval(() => {
			i += 1;
			setTyped(greetLine.slice(0, i));
			if (i >= greetLine.length) clearInterval(timer);
		}, 28);
		return () => clearInterval(timer);
	}, [greeting, reducedMotion, greetLine]);
	useEffect(() => {
		if (!greeting || reducedMotion) return;
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
				Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
			]),
		);
		loop.start();
		return () => loop.stop();
	}, [greeting, reducedMotion, bob]);
	const [interest, setInterest] = useState<Interest>('both');
	const [goal, setGoal] = useState<number>(10);

	const [busy, setBusy] = useState(false);

	const finish = async (pickedInterest: Interest, pickedGoal: number) => {
		await OnboardingService.complete(pickedInterest, pickedGoal);
		onDone(pickedInterest, pickedGoal);
	};

	/** 알림 권한 요청 — 허용/거절 어느 쪽이든 온보딩은 끝낸다 */
	const allowNotification = async () => {
		if (busy) return;
		setBusy(true);
		try {
			await RequestNotificationPermission();
		} catch {
			/* 권한 거절·미지원은 그대로 진행 */
		}
		setBusy(false);
		finish(interest, goal);
	};

	// 안드로이드 백버튼이 아무 동작도 안 하면 갇힌 느낌이라 지금까지 고른 값으로 마치게 한다
	return (
		<AppModal visible={visible} transparent animationType="fade" onRequestClose={() => finish(interest, goal)}>
			<View style={styles.overlay}>
				<SheetIn visible={visible} distance={scaleHeight(24)} style={styles.card}>
					<View style={styles.dots}>
						{[0, 1, 2, 3].map((i) => (
							<View key={i} style={[styles.dot, i === step && styles.dotOn]} />
						))}
					</View>

					{step === 0 && (
						<>
							{/* 아이콘 한 개짜리 인사 대신, 앱 도우미 캐릭터가 말풍선으로 맞이한다 (공통 CharacterGuide 와 같은 연출) */}
							<View style={styles.greetBubble}>
								<View style={styles.greetBubbleHead}>
									<IconComponent type="materialIcons" name="tips-and-updates" size={scaledSize(15)} color={Colors.primary} />
									<Text style={styles.greetBubbleTitle}>{t('modal.onboarding.greetTitle')}</Text>
								</View>
								<Text style={styles.greetBubbleText}>
									{typed}
									{typed.length < greetLine.length && <Text style={styles.greetCaret}>▌</Text>}
								</Text>
								<View style={styles.greetTail} />
								<View style={styles.greetTailBorder} />
							</View>
							<Animated.View style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -scaleHeight(6)] }) }] }}>
								<ExpoImage source={getHomeCharacterImage(null)} style={styles.greetChar} contentFit="contain" />
							</Animated.View>
							<TouchableOpacity style={styles.primaryBtn} activeOpacity={0.9} onPress={() => setStep(1)}>
								<Text style={styles.primaryText}>{t('common.start')}</Text>
							</TouchableOpacity>
						</>
					)}

					{step === 1 && (
						<>
							<Text style={styles.title}>{t('modal.onboarding.interestTitle')}</Text>
							<Text style={styles.desc}>{t('modal.onboarding.interestDesc')}</Text>
							<View style={styles.optionList}>
								{INTEREST_OPTIONS.map((o) => {
									const on = interest === o.key;
									return (
										<TouchableOpacity key={o.key} style={[styles.option, on && styles.optionOn]} activeOpacity={0.85} onPress={() => setInterest(o.key)}>
											<View style={[styles.optionIcon, on && styles.optionIconOn]}>
												<IconComponent type="materialIcons" name={o.icon} size={scaledSize(20)} color={on ? Colors.primary : Colors.textMuted} />
											</View>
											<View style={styles.optionBody}>
												<Text style={[styles.optionLabel, on && styles.optionLabelOn]} numberOfLines={1}>{o.label}</Text>
												<Text style={styles.optionDesc} numberOfLines={2}>{o.desc}</Text>
											</View>
											{on && <IconComponent type="materialIcons" name="check-circle" size={scaledSize(20)} color={Colors.primary} />}
										</TouchableOpacity>
									);
								})}
							</View>
							<TouchableOpacity style={styles.primaryBtn} activeOpacity={0.9} onPress={() => setStep(2)}>
								<Text style={styles.primaryText}>{t('common.next')}</Text>
							</TouchableOpacity>
						</>
					)}

					{step === 2 && (
						<>
							<Text style={styles.title}>{t('modal.onboarding.goalTitle')}</Text>
							<Text style={styles.desc}>{t('modal.onboarding.goalDesc')}</Text>
							<View style={styles.optionList}>
								{GOAL_OPTIONS.map((n) => {
									const on = goal === n;
									return (
										<TouchableOpacity key={n} style={[styles.option, on && styles.optionOn]} activeOpacity={0.85} onPress={() => setGoal(n)}>
											<View style={[styles.optionIcon, on && styles.optionIconOn]}>
												<Text style={[styles.goalNum, on && styles.goalNumOn]}>{n}</Text>
											</View>
											<View style={styles.optionBody}>
												<Text style={[styles.optionLabel, on && styles.optionLabelOn]} numberOfLines={1}>{t('modal.onboarding.goalLabel', { count: n })}</Text>
												<Text style={styles.optionDesc} numberOfLines={1}>{t(GOAL_DESC_KEY[n])}</Text>
											</View>
											{on && <IconComponent type="materialIcons" name="check-circle" size={scaledSize(20)} color={Colors.primary} />}
										</TouchableOpacity>
									);
								})}
							</View>
							<TouchableOpacity style={styles.primaryBtn} activeOpacity={0.9} onPress={() => setStep(3)}>
								<Text style={styles.primaryText}>{t('common.next')}</Text>
							</TouchableOpacity>
						</>
					)}

					{step === 3 && (
						<>
							<View style={styles.iconWrap}>
								<IconComponent type="materialIcons" name="notifications-active" size={scaledSize(28)} color={Colors.primary} />
							</View>
							<Text style={styles.title}>{t('modal.onboarding.notiTitle')}</Text>
							<Text style={styles.desc}>{t('modal.onboarding.notiDesc')}</Text>
							<TouchableOpacity style={[styles.primaryBtn, busy && styles.btnDisabled]} activeOpacity={0.9} disabled={busy} onPress={allowNotification}>
								<Text style={styles.primaryText}>{t('modal.onboarding.notiAllow')}</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.skipBtn} activeOpacity={0.8} disabled={busy} onPress={() => finish(interest, goal)}>
								<Text style={styles.skipText}>{t('modal.onboarding.later')}</Text>
							</TouchableOpacity>
						</>
					)}

					{step < 3 && (
						<TouchableOpacity style={styles.skipBtn} activeOpacity={0.8} onPress={() => finish('both', 10)}>
							<Text style={styles.skipText}>{t('modal.onboarding.skip')}</Text>
						</TouchableOpacity>
					)}
				</SheetIn>
			</View>
		</AppModal>
	);
};

export default OnboardingModal;

const styles = themed(() => StyleSheet.create({
	overlay: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
	card: { width: '100%', maxWidth: Layout.dialogMaxWidth, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.xl, paddingHorizontal: Spacing.xl, paddingVertical: SpacingV.xxl, alignItems: 'center' },
	dots: { flexDirection: 'row', gap: Spacing.xxs, marginBottom: SpacingV.lg },
	dot: { width: scaleWidth(6), height: scaleWidth(6), borderRadius: Radius.pill, backgroundColor: Colors.borderStrong },
	dotOn: { width: scaleWidth(18), backgroundColor: Colors.primary },
	iconWrap: { width: scaleWidth(56), height: scaleWidth(56), borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: SpacingV.md, backgroundColor: Colors.primarySoft },
	title: { fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong, textAlign: 'center' },
	// 도우미 캐릭터 인사 — 말풍선 + 아래를 향한 꼬리 + 캐릭터
	greetBubble: { alignSelf: 'stretch', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.primarySoft, padding: Spacing.lg },
	greetBubbleHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: SpacingV.sm },
	greetBubbleTitle: { flex: 1, fontSize: Typography.footnote, fontWeight: '800', color: Colors.primary },
	// 타이핑 중 글자 수가 늘어나며 말풍선 높이가 튀지 않게 최소 높이를 잡아둔다
	greetBubbleText: { fontSize: Typography.body, lineHeight: scaleHeight(22), color: Colors.textStrong, fontWeight: '600', minHeight: scaleHeight(66) },
	greetCaret: { color: Colors.primary },
	greetTail: { position: 'absolute', left: scaleWidth(36), bottom: -scaleHeight(11), width: 0, height: 0, borderLeftWidth: scaleWidth(10), borderRightWidth: scaleWidth(10), borderTopWidth: scaleHeight(12), borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: Colors.surfaceAlt, zIndex: 2 },
	greetTailBorder: { position: 'absolute', left: scaleWidth(35), bottom: -scaleHeight(13), width: 0, height: 0, borderLeftWidth: scaleWidth(11), borderRightWidth: scaleWidth(11), borderTopWidth: scaleHeight(13), borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: Colors.primarySoft, zIndex: 1 },
	greetChar: { alignSelf: 'flex-start', width: scaleWidth(104), height: scaleWidth(104), marginTop: SpacingV.md, marginLeft: Spacing.sm, borderRadius: Radius.xl },
	desc: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: SpacingV.xs, lineHeight: scaleHeight(20) },
	optionList: { alignSelf: 'stretch', gap: SpacingV.xs, marginTop: SpacingV.lg },
	option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
	optionOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
	optionIcon: { width: scaleWidth(36), height: scaleWidth(36), borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceAlt },
	optionIconOn: { backgroundColor: Colors.primarySoft },
	optionBody: { flex: 1 },
	optionLabel: { fontSize: Typography.callout, fontWeight: '800', color: Colors.text },
	optionLabelOn: { color: Colors.primary },
	optionDesc: { fontSize: Typography.footnote, color: Colors.textMuted, marginTop: SpacingV.xxs },
	goalNum: { fontSize: Typography.callout, fontWeight: '900', color: Colors.textMuted },
	goalNumOn: { color: Colors.primary },
	primaryBtn: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingVertical: SpacingV.lg, borderRadius: Radius.md, marginTop: SpacingV.xl, backgroundColor: Colors.primary },
	primaryText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.onFill },
	btnDisabled: { opacity: 0.5 },
	skipBtn: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: SpacingV.md, marginTop: SpacingV.xs },
	skipText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textMuted },
}));
