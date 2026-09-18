import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { usePathname } from 'expo-router';
import { Image } from 'expo-image';
import AppModal from '@/src/screens/common/atomic/AppModal';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import Confetti from '@/src/four/components/Confetti';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useLife } from '@/src/hooks/useLife';
import { FontWeight, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { PET_STAGES } from '@/src/const/data/life/ConstLifeRewards';
import { selectPetImage } from '@/src/const/data/life/ConstPetImages';
import { clearLevelUp } from '@/src/store/slice/LifeSlice';
import { playComplete, playPop } from '@/src/utils/SoundUtils';
import { MODAL_MAX_WIDTH, scaleHeight, scaleWidth } from '@/src/utils';

/**
 * 레벨업 — 펫 단계가 오르면 탭 화면으로 돌아왔을 때 한 번 크게 축하한다 (루트 레이아웃에 한 번만 올린다).
 * 새 단계 그림이 튀어 오르고, 뒤에서 빛살이 천천히 돈다.
 */
const LevelUpModal = () => {
	const { t } = useTranslation();
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const dispatch = useDispatch();
	const { pendingLevelUp, petName } = useLife();
	const pathname = usePathname();
	const level = pendingLevelUp ?? null;
	const visible = level !== null && pathname.startsWith('/main');
	const stage = level !== null ? PET_STAGES[Math.min(PET_STAGES.length, Math.max(1, level)) - 1] : null;

	const pop = useRef(new Animated.Value(0)).current;
	const spin = useRef(new Animated.Value(0)).current;
	const jump = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!visible) {
			return;
		}
		playComplete();
		pop.setValue(0);
		jump.setValue(0);
		spin.setValue(0);
		const enter = Animated.sequence([
			Animated.spring(pop, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
			Animated.spring(jump, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
		]);
		const rays = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
		enter.start();
		rays.start();
		return () => {
			enter.stop();
			rays.stop();
		};
	}, [jump, pop, spin, visible]);

	const onClose = useCallback(() => {
		playPop();
		dispatch(clearLevelUp());
	}, [dispatch]);

	if (!visible || !stage || level === null) {
		return null;
	}

	return (
		<AppModal visible={visible} onClose={onClose}>
			<Confetti
				count={100}
				origin={{ x: Dimensions.get('window').width / 2, y: 0 }}
				fadeOut
				explosionSpeed={450}
				fallSpeed={2800}
				colors={[Colors.accentAmber, Colors.primary, Colors.secondary, Colors.success]}
			/>
			<Animated.View style={[styles.card, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
				<View style={styles.levelChip}>
					<Text style={styles.levelChipText}>{`${level === PET_STAGES.length ? 'GOLDEN' : 'LEVEL UP'} · Lv.${level}`}</Text>
				</View>
				<Text style={styles.title}>{t(level === PET_STAGES.length ? 'pet.levelUp.titleGolden' : 'pet.levelUp.title', { name: petName })}</Text>

				<View style={styles.stage}>
					{/* 빛살 — 네 갈래 막대가 천천히 돈다 */}
					<Animated.View
						pointerEvents="none"
						style={[styles.rays, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
						{[0, 45, 90, 135].map((deg) => (
							<View key={deg} style={[styles.ray, { transform: [{ rotate: `${deg}deg` }] }]} />
						))}
					</Animated.View>
					<Animated.View
						style={{
							transform: [
								{ translateY: jump.interpolate({ inputRange: [0, 0.5, 1], outputRange: [scaleHeight(20), -scaleHeight(14), 0] }) },
								{ scale: jump.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
							],
						}}>
						<Image source={selectPetImage(level)} style={styles.pet} contentFit="contain" />
					</Animated.View>
				</View>

				<Text style={styles.stageLabel}>{t(`pet.stage.${stage.key}`)}</Text>
				<Text style={styles.subtitle}>{t('pet.levelUp.body', { exp: stage.minExp })}</Text>

				<PressableScale style={styles.button} onPress={onClose} accessibilityRole="button">
					<Text style={styles.buttonText}>{t('pet.levelUp.confirm')}</Text>
				</PressableScale>
			</Animated.View>
		</AppModal>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		card: {
			width: '100%',
			maxWidth: Math.min(scaleWidth(320), MODAL_MAX_WIDTH),
			alignSelf: 'center',
			alignItems: 'center',
			gap: SpacingV.sm,
			paddingHorizontal: Spacing.xl,
			paddingVertical: SpacingV.xxl,
			borderRadius: Radius.xl,
			backgroundColor: Colors.brandBlock,
			...Shadow.floating,
		},
		levelChip: { paddingHorizontal: Spacing.md, height: scaleHeight(26), borderRadius: Radius.pill, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
		levelChipText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: Colors.brandBlockText, letterSpacing: 1, flexShrink: 1, textAlign: 'center', },
		title: { fontSize: Typography.h3, fontWeight: FontWeight.heavy, color: Colors.brandBlockText, textAlign: 'center' },
		stage: { width: scaleWidth(180), height: scaleWidth(180), marginVertical: SpacingV.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: Radius.pill },
		rays: { position: 'absolute', width: scaleWidth(180), height: scaleWidth(180), alignItems: 'center', justifyContent: 'center' },
		ray: { position: 'absolute', width: scaleWidth(26), height: scaleWidth(260), borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.08)' },
		pet: { width: scaleWidth(140), height: scaleWidth(140) },
		stageLabel: { fontSize: Typography.h2, fontWeight: FontWeight.heavy, color: Colors.brandBlockText, textAlign: 'center' },
		subtitle: { fontSize: Typography.bodySm, color: Colors.brandBlockMuted, textAlign: 'center' },
		button: {
			width: '100%',
			minHeight: scaleHeight(48),
			marginTop: SpacingV.md,
			borderRadius: Radius.lg,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.brandBlockText, paddingVertical: SpacingV.sm, },
		buttonText: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.brandBlock, flexShrink: 1, textAlign: 'center', },
	});

export default LevelUpModal;
