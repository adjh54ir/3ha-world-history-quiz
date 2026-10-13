// components/VersionCheckModal.tsx
import { setCurrentAppVerion } from '@/src/store/slice/UserDeviceInfoSlice';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils/DementionUtils';
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, BackHandler, AppState } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import VersionCheck from 'react-native-version-check';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import IconComponent from '../atomic/IconComponent';
import Colors, { BRAND_GRADIENT } from '@/src/const/ConstColors';
import { Radius, Shadow, Spacing, SpacingV, Typography, Tracking, Layout } from '@/src/const/ConstDesign';
import AppModal from '@/src/screens/common/atomic/AppModal';
import { themed } from '@/src/utils/ThemedStyles';
import { FadeInUp, Pulse } from '@/src/screens/common/anim/Motion';

/** '1.2.3' → [1, 2] (패치는 강제 업데이트 대상이 아니므로 버린다) */
const parseMajorMinor = (version: string): [number, number] => {
	const [major, minor] = version.split('.').map((v) => Number(v) || 0);
	return [major ?? 0, minor ?? 0];
};

/**
 * 스토어 최신 버전의 마이너(1.x.0)가 올라가면 강제 업데이트 팝업을 띄운다.
 * - 닫기 버튼·배경 탭·안드로이드 back 모두 막아 업데이트 전에는 앱을 쓸 수 없다.
 * - 패치(1.0.x)만 다른 경우는 대상이 아니다.
 */
const VersionCheckModal = () => {
	const { t } = useTranslation();
	const dispatch = useDispatch();
	const [showUpdateModal, setShowUpdateModal] = useState(false);
	const [versionInfo, setVersionInfo] = useState({ current: '', latest: '' });

	/**
	 * 버전 비교 — 스토어 최신 버전의 major/minor 가 현재보다 크면 강제 업데이트
	 * @return {Promise<void>}
	 */
	const checkVersion = useCallback(async (): Promise<void> => {
		try {
			const provider = Platform.OS === 'android' ? 'playStore' : 'appStore';
			const latestVersion = await VersionCheck.getLatestVersion({ provider });
			const currentVersion = VersionCheck.getCurrentVersion();
			if (!latestVersion || !currentVersion) return;

			dispatch(setCurrentAppVerion(currentVersion));

			const [latestMajor, latestMinor] = parseMajorMinor(latestVersion);
			const [currentMajor, currentMinor] = parseMajorMinor(currentVersion);
			// 마이너 상승(1.0.0 → 1.1.0) 또는 메이저 상승(1.x → 2.0) 이면 무조건 노출
			const mustUpdate = latestMajor > currentMajor || (latestMajor === currentMajor && latestMinor > currentMinor);

			setVersionInfo({ current: currentVersion, latest: latestVersion });
			setShowUpdateModal(mustUpdate);
		} catch (error) {
			console.warn('Version check failed:', error);
		}
	}, [dispatch]);

	useEffect(() => {
		checkVersion();
		// 스토어를 다녀와 앱으로 돌아오면 재검사 — 업데이트를 마쳤으면 팝업이 사라진다
		const sub = AppState.addEventListener('change', (state) => {
			if (state === 'active') checkVersion();
		});
		return () => sub.remove();
	}, [checkVersion]);

	// 안드로이드 하드웨어 백으로 빠져나가지 못하게 잠근다
	useEffect(() => {
		if (!showUpdateModal) return;
		const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
		return () => sub.remove();
	}, [showUpdateModal]);

	/**
	 * 스토어로 이동
	 * @return {Promise<void>}
	 */
	const handleUpdate = async (): Promise<void> => {
		const provider = Platform.OS === 'android' ? 'playStore' : 'appStore';
		try {
			const res = await VersionCheck.needUpdate({ provider });
			const storeUrl = res?.storeUrl || (await VersionCheck.getStoreUrl());
			if (storeUrl) Linking.openURL(storeUrl);
		} catch (error) {
			console.warn('Store open failed:', error);
		}
	};

	return (
		<AppModal visible={showUpdateModal} transparent animationType="fade" statusBarTranslucent presentationStyle="overFullScreen" onRequestClose={() => {}}>
			<View style={styles.backdrop}>
				{/* 카드가 아래에서 떠오르고, 아이콘은 은은하게 숨쉬듯 움직여 시선을 '업데이트'로 모은다 */}
				<FadeInUp distance={24} duration={420} style={styles.cardWrap}>
				<View style={styles.card}>
					{/* 헤더 — 브랜드 그라디언트 위 아이콘 */}
					<LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
						<Pulse minOpacity={1} minScale={0.96} maxScale={1.06} duration={1100}>
							<View style={styles.heroIcon}>
								<IconComponent type="MaterialCommunityIcons" name="rocket-launch-outline" size={scaledSize(30)} color={Colors.textInverse} />
							</View>
						</Pulse>
						<Text style={styles.heroBadge}>{t('versionCheck.badge')}</Text>
					</LinearGradient>

					<View style={styles.body}>
						<Text style={styles.title}>{t('versionCheck.title')}</Text>
						<Text style={styles.message}>{t('versionCheck.message')}</Text>

						{/* 이번 업데이트에 담긴 것 — 새 기능 / 버그 개선 */}
						<View style={styles.highlights}>
							{([
								{ icon: 'auto-awesome', key: 'versionCheck.feature' },
								{ icon: 'build-circle', key: 'versionCheck.fix' },
							] as const).map((h) => (
								<View key={h.key} style={styles.highlightRow}>
									<View style={styles.highlightIcon}>
										<IconComponent type="materialIcons" name={h.icon} size={scaledSize(16)} color={Colors.primary} />
									</View>
									<Text style={styles.highlightText}>{t(h.key)}</Text>
								</View>
							))}
						</View>

						{versionInfo.latest !== '' && (
							<View style={styles.versionRow}>
								<View style={styles.versionChip}>
									<Text style={styles.versionChipLabel}>{t('versionCheck.current')}</Text>
									<Text style={styles.versionChipText} numberOfLines={1} ellipsizeMode="tail">v{versionInfo.current}</Text>
								</View>
								<IconComponent type="MaterialCommunityIcons" name="arrow-right" size={scaledSize(16)} color={Colors.textMuted} />
								<View style={[styles.versionChip, styles.versionChipLatest]}>
									<Text style={[styles.versionChipLabel, styles.versionChipLabelLatest]}>{t('versionCheck.latest')}</Text>
									<Text style={[styles.versionChipText, styles.versionChipTextLatest]} numberOfLines={1} ellipsizeMode="tail">v{versionInfo.latest}</Text>
								</View>
							</View>
						)}

						<TouchableOpacity style={styles.updateButton} activeOpacity={0.85} onPress={handleUpdate} accessibilityRole="button" accessibilityLabel={t('versionCheck.update')}>
							<IconComponent type="materialIcons" name="system-update" size={scaledSize(18)} color={Colors.onFill} />
							<Text style={styles.buttonText}>{t('versionCheck.update')}</Text>
						</TouchableOpacity>
						<Text style={styles.notice}>{t('versionCheck.notice')}</Text>
					</View>
				</View>
				</FadeInUp>
			</View>
		</AppModal>
	);
};

const styles = themed(() => StyleSheet.create({
	backdrop: {
		flex: 1,
		width: '100%',
		height: '100%',
		backgroundColor: Colors.backdrop,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: Spacing.xl,
	},
	cardWrap: {
		width: '100%',
		maxWidth: Layout.dialogMaxWidth,
	},
	card: {
		width: '100%',
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.xl,
		overflow: 'hidden',
		...Shadow.floating,
	},
	hero: {
		alignItems: 'center',
		paddingTop: SpacingV.xl,
		paddingBottom: SpacingV.lg,
		gap: SpacingV.sm,
	},
	heroIcon: {
		width: scaleWidth(64),
		height: scaleWidth(64),
		borderRadius: Radius.xxl,
		backgroundColor: Colors.onBrandSurface,
		justifyContent: 'center',
		alignItems: 'center',
	},
	heroBadge: {
		fontSize: Typography.footnote,
		fontWeight: '800',
		color: Colors.textInverse,
		letterSpacing: Tracking.tight,
	},
	body: {
		alignItems: 'center',
		paddingHorizontal: Spacing.xl,
		paddingTop: SpacingV.xl,
		paddingBottom: SpacingV.xxl,
	},
	title: {
		fontSize: Typography.title,
		fontWeight: '900',
		color: Colors.textStrong,
		textAlign: 'center',
	},
	message: {
		fontSize: Typography.body,
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: scaleHeight(21),
		includeFontPadding: false,
		marginTop: SpacingV.sm,
	},
	highlights: {
		alignSelf: 'stretch',
		gap: SpacingV.sm,
		marginTop: SpacingV.lg,
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.lg,
	},
	highlightRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
	},
	highlightIcon: {
		width: scaleWidth(28),
		height: scaleWidth(28),
		borderRadius: Radius.pill,
		backgroundColor: Colors.primarySoft,
		justifyContent: 'center',
		alignItems: 'center',
	},
	highlightText: {
		flex: 1,
		fontSize: Typography.callout,
		fontWeight: '700',
		color: Colors.text,
	},
	versionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		marginTop: SpacingV.lg,
	},
	versionChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.xs,
		backgroundColor: Colors.surfaceAlt,
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.pill,
		paddingVertical: SpacingV.xs,
		paddingHorizontal: Spacing.md,
	},
	versionChipLatest: {
		backgroundColor: Colors.primarySoft,
		borderColor: Colors.primarySoft,
	},
	versionChipLabel: {
		fontSize: Typography.footnote,
		color: Colors.textMuted,
		fontWeight: '700',
	},
	versionChipLabelLatest: {
		color: Colors.primary,
	},
	versionChipText: {
		fontSize: Typography.footnote,
		color: Colors.text,
		fontWeight: '800',
	},
	versionChipTextLatest: {
		color: Colors.primary,
	},
	updateButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.sm,
		backgroundColor: Colors.primary,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.lg,
		width: '100%',
		marginTop: SpacingV.xl,
	},
	buttonText: {
		color: Colors.onFill,
		fontSize: Typography.callout,
		fontWeight: '800',
	},
	notice: {
		fontSize: Typography.footnote,
		color: Colors.textMuted,
		fontWeight: '600',
		textAlign: 'center',
		marginTop: SpacingV.md,
	},
}));

export default VersionCheckModal;
