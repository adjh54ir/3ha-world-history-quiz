/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import AppModal from '@/src/screens/common/atomic/AppModal';
import { useReducedMotion } from '@/src/screens/common/anim/Motion';
import LottieBox from '@/src/screens/common/atomic/LottieBox';
import Colors, { withAlpha, readableOn } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Typography, Radius, Tracking, Shadow, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleArt, screenWidth } from '@/src/utils';
import { AchievementDef, RARITY_META } from '@/src/const/ConstAchievements';
import { playComplete } from '@/src/utils/SoundUtils';
import { themed } from '@/src/utils/ThemedStyles';

const LOTTIE_STAR = require('@/src/assets/lottie/star.json');

interface Props {
	visible: boolean;
	achievements: AchievementDef[];
	onClose: () => void;
}

/**
 * 업적 달성 모달 (인터셉터)
 * - 퀴즈 종료 시 새로 해금된 업적을 화려하게 알린다 (컨페티 + 광선 회전 + 팝 애니메이션)
 */
const AchievementUnlockModal: React.FC<Props> = ({ visible, achievements, onClose }) => {
	const { t } = useTranslation();
	const reducedMotion = useReducedMotion();
	const pop = useRef(new Animated.Value(0)).current;
	const ray = useRef(new Animated.Value(0)).current;
	const main = achievements[0];

	useEffect(() => {
		if (!visible) return;
		playComplete(); // 🏅 업적 달성 보상 사운드
		pop.setValue(0);
		const popAnim = Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true });
		popAnim.start();
		ray.setValue(0);
		// '동작 줄이기'면 8초 무한 회전은 재생하지 않는다
		const rayLoop = reducedMotion ? null : Animated.loop(Animated.timing(ray, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true }));
		rayLoop?.start();
		// 모달이 닫히거나 언마운트되면 무한 회전 루프를 반드시 정지(메모리 정리)
		return () => {
			popAnim.stop();
			rayLoop?.stop();
		};
	}, [visible, reducedMotion]);

	if (!main) return null;
	const accent = main.color;
	// 희귀도 색을 축하 연출(광선·메달·컨페티)에 함께 섞어 등급이 한눈에 보이게 한다
	const rarityColor = RARITY_META[main.rarity].color;
	const rayRotate = ray.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
	const extra = achievements.length - 1;

	return (
		<AppModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={styles.overlay}>
				<ConfettiCannon
					count={120}
					origin={{ x: screenWidth / 2, y: -10 }}
					fadeOut
					autoStart
					explosionSpeed={350}
					colors={[rarityColor, accent, Colors.goldSoft, Colors.textInverse]}
				/>
				<Animated.View style={[styles.card, { transform: [{ scale: pop }] }]}>
					<View style={styles.kickerRow}>
						<IconComponent type="materialIcons" name="celebration" size={scaledSize(18)} color={Colors.primary} />
						<Text style={styles.kicker}>{t('modal.achievement.kicker')}</Text>
					</View>

					<View style={styles.medalWrap}>
						<LottieBox source={LOTTIE_STAR} autoPlay loop={false} style={styles.medalStar} />
						<Animated.View style={[styles.rays, { transform: [{ rotate: rayRotate }] }]}>
							<LinearGradient colors={[withAlpha(rarityColor, '00'), withAlpha(rarityColor, '66'), withAlpha(rarityColor, '00')]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
						</Animated.View>
						<LinearGradient colors={[rarityColor, accent, withAlpha(accent, 'CC')]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.medal}>
							<IconComponent type="materialIcons" name={main.icon} size={scaledSize(44)} color={readableOn(accent)} />
						</LinearGradient>
					</View>

					<Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{main.title}</Text>
					<View style={[styles.rarityPill, { backgroundColor: withAlpha(RARITY_META[main.rarity].color, '1A') }]}>
						<IconComponent type="materialIcons" name="auto-awesome" size={scaledSize(12)} color={RARITY_META[main.rarity].color} />
						<Text style={[styles.rarityText, { color: RARITY_META[main.rarity].color }]}>{RARITY_META[main.rarity].label}</Text>
					</View>
					<Text style={styles.desc} numberOfLines={3} ellipsizeMode="tail">{main.desc}</Text>
					<View style={styles.condRow}>
						<IconComponent type="materialIcons" name="flag" size={scaledSize(13)} color={Colors.textSecondary} />
						<Text style={styles.condText}>{main.cond}</Text>
					</View>

					{extra > 0 && <Text style={styles.extra}>{t('modal.achievement.extra', { count: extra })}</Text>}

					<TouchableOpacity style={[styles.btn, { backgroundColor: accent }]} activeOpacity={0.9} onPress={onClose}>
						<Text style={[styles.btnText, { color: readableOn(accent) }]}>{t('common.confirm')}</Text>
					</TouchableOpacity>
				</Animated.View>
			</View>
		</AppModal>
	);
};

export default AchievementUnlockModal;

const styles = themed(() => StyleSheet.create({
	overlay: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
	card: { width: '100%', maxWidth: Layout.dialogMaxWidth, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.xl, paddingTop: SpacingV.xxl, paddingBottom: SpacingV.xxl, paddingHorizontal: Spacing.xl, alignItems: 'center' },
	rarityPill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.pill, marginTop: SpacingV.sm },
	rarityText: { fontSize: Typography.footnote, fontWeight: '900' },
	condRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm, marginTop: SpacingV.md },
	condText: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary },
	kicker: { fontSize: Typography.callout, fontWeight: '900', color: Colors.primary, letterSpacing: Tracking.tight },
	kickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	medalWrap: { width: scaleArt(150), height: scaleArt(150), justifyContent: 'center', alignItems: 'center', marginTop: SpacingV.lg },
	medalStar: { position: 'absolute', width: scaleArt(150), height: scaleArt(150) },
	rays: { position: 'absolute', width: scaleArt(150), height: scaleArt(150), borderRadius: Radius.pill, overflow: 'hidden' },
	medal: { width: scaleArt(96), height: scaleArt(96), borderRadius: Radius.pill, justifyContent: 'center', alignItems: 'center', ...Shadow.floating },
	title: { fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong, marginTop: SpacingV.lg, textAlign: 'center' },
	desc: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: SpacingV.sm, textAlign: 'center', lineHeight: scaleHeight(20) },
	extra: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.primary, marginTop: SpacingV.sm },
	btn: { alignSelf: 'stretch', paddingVertical: SpacingV.lg, borderRadius: Radius.md, alignItems: 'center', marginTop: SpacingV.xl },
	btnText: { color: Colors.textInverse, fontSize: Typography.callout, fontWeight: '800' },
}));
