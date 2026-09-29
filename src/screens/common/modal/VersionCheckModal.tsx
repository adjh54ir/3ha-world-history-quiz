// components/VersionCheckModal.tsx
import { setCurrentAppVerion } from '@/src/store/slice/UserDeviceInfoSlice';
import { moderateScale, scaledSize, scaleHeight, scaleWidth } from '@/src/utils/DementionUtils';
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, BackHandler, AppState } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import VersionCheck from 'react-native-version-check';
import { useDispatch } from 'react-redux';
import IconComponent from '../atomic/IconComponent';
import Colors, { BRAND_GRADIENT } from '@/src/const/ConstColors';
import { Radius, Shadow, Spacing, SpacingV, Typography, Tracking, Layout } from '@/src/const/ConstDesign';
import AppModal from '@/src/screens/common/atomic/AppModal';
import { themed } from '@/src/utils/ThemedStyles';

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
				<View style={styles.card}>
					{/* 헤더 — 브랜드 그라디언트 위 아이콘 */}
					<LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
						<View style={styles.heroIcon}>
							<IconComponent type="MaterialCommunityIcons" name="rocket-launch-outline" size={scaledSize(30)} color={Colors.textInverse} />
						</View>
						<Text style={styles.heroBadge}>필수 업데이트</Text>
					</LinearGradient>

					<View style={styles.body}>
						<Text style={styles.title}>새로운 버전이 나왔어요</Text>
						<Text style={styles.message}>계속 이용하려면 최신 버전으로{'\n'}업데이트해 주세요.</Text>

						{versionInfo.latest !== '' && (
							<View style={styles.versionRow}>
								<View style={styles.versionChip}>
									<Text style={styles.versionChipLabel}>현재</Text>
									<Text style={styles.versionChipText} numberOfLines={1} ellipsizeMode="tail">v{versionInfo.current}</Text>
								</View>
								<IconComponent type="MaterialCommunityIcons" name="arrow-right" size={scaledSize(16)} color={Colors.textMuted} />
								<View style={[styles.versionChip, styles.versionChipLatest]}>
									<Text style={[styles.versionChipLabel, styles.versionChipLabelLatest]}>최신</Text>
									<Text style={[styles.versionChipText, styles.versionChipTextLatest]} numberOfLines={1} ellipsizeMode="tail">v{versionInfo.latest}</Text>
								</View>
							</View>
						)}

						<TouchableOpacity style={styles.updateButton} activeOpacity={0.85} onPress={handleUpdate} accessibilityRole="button" accessibilityLabel="지금 업데이트">
							<IconComponent type="materialIcons" name="system-update" size={scaledSize(18)} color={Colors.textInverse} />
							<Text style={styles.buttonText}>지금 업데이트</Text>
						</TouchableOpacity>
						<Text style={styles.notice}>업데이트 후 앱을 계속 이용할 수 있어요</Text>
					</View>
				</View>
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
	card: {
		width: '100%',
		maxWidth: Layout.dialogMaxWidth,
		backgroundColor: Colors.surface,
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
		color: Colors.textInverse,
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
