// components/VersionCheckModal.tsx
import { RootState } from '@/src/store/RootReducer';
import { setCurrentAppVerion } from '@/src/store/slice/UserDeviceInfoSlice';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useAnimationRunner } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { MODAL_MAX_WIDTH, scaleHeight, scaleWidth } from '@/src/utils/DementionUtils';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, BackHandler, Easing, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import VersionCheck from 'react-native-version-check';
import { useDispatch, useSelector } from 'react-redux';
import AppModal from '../atomic/AppModal';
import PressableScale from '../atomic/PressableScale';
import IconComponent from '../atomic/IconComponent';

/** "1.2.3" → [1, 2] (마이너까지만 본다. 패치 버전은 강제 업데이트 대상이 아니다) */
const toMajorMinor = (version: string): [number, number] => {
	const [major, minor] = version.split('.').map((part) => Number(part) || 0);
	return [major, minor];
};

/**
 * 스토어 최신 버전이 설치 버전보다 마이너 이상 앞서 있는지.
 * - 1.0.x → 1.1.0 : 강제 업데이트 대상
 * - 1.0.0 → 1.0.3 : 패치라 대상 아님
 */
export const needsForceUpdate = (current: string, latest: string): boolean => {
	if (!current || !latest) {
		return false;
	}
	const [currentMajor, currentMinor] = toMajorMinor(current);
	const [latestMajor, latestMinor] = toMajorMinor(latest);
	return latestMajor > currentMajor || (latestMajor === currentMajor && latestMinor > currentMinor);
};

/**
 * 마이너 버전이 올라가면 반드시 업데이트하도록 막는 팝업.
 * - 닫기 버튼도, 바깥 탭도, 안드로이드 뒤로가기도 없다. 업데이트를 눌러야만 다음으로 넘어간다.
 */
const VersionCheckModal = () => {
	const { t } = useTranslation();
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	// 언마운트 시 진행 중인 연출을 모두 정지한다 (메모리·프레임 콜백 정리)
	const run = useAnimationRunner();
	const dispatch = useDispatch();
	const [showUpdateModal, setShowUpdateModal] = useState(false);
	const [versionInfo, setVersionInfo] = useState({ current: '', latest: '' });
	const userDeviceInfoRedux = useSelector((state: RootState) => state.userDeviceInfo);

	const appear = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		checkVersion();
	}, []);

	// 카드가 살짝 떠오르며 나타난다
	useEffect(() => {
		if (!showUpdateModal) {
			appear.setValue(0);
			return;
		}
		run(Animated.timing(appear, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }));
	}, [showUpdateModal, appear, run]);

	// 강제 업데이트 — 안드로이드 하드웨어 뒤로가기로도 빠져나갈 수 없게 막는다
	useEffect(() => {
		if (!showUpdateModal) {
			return;
		}
		const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
		return () => subscription.remove();
	}, [showUpdateModal]);

	/**
	 * 버전 비교 함수
	 * @return {Promise<void>}
	 */
	const checkVersion = async (): Promise<void> => {
		try {
			const platformProvider = Platform.OS === 'android' ? 'playStore' : 'appStore';
			const latestVersion = await VersionCheck.getLatestVersion({
				provider: platformProvider,
			});
			const currentVersion = VersionCheck.getCurrentVersion();

			// 아직 앱을 출시하지 않은 경우
			if (!latestVersion) {
				console.log('[-] 아직 앱이 출시되지 않았습니다.');
				return;
			}

			// Redux에 앱 버전이 없으면 현재 버전을 앱버전으로 지정 (표시는 항상 실제 설치 버전 기준)
			if (!userDeviceInfoRedux.appVer) {
				dispatch(setCurrentAppVerion(currentVersion));
			}

			// 마이너 버전이 올라갔으면 저장된 값과 무관하게 무조건 띄운다
			if (needsForceUpdate(currentVersion, latestVersion)) {
				setVersionInfo({ current: currentVersion, latest: latestVersion });
				setShowUpdateModal(true);
			}
		} catch (error) {
			console.log('Version check failed:', error);
		}
	};

	/**
	 * 버전 업데이트 수행 — 스토어로 보낸다
	 * @return {Promise<void>}
	 */
	const handleUpdate = async (): Promise<void> => {
		try {
			const provider = Platform.OS === 'android' ? 'playStore' : 'appStore';
			const res = await VersionCheck.needUpdate({ provider });
			const storeUrl = res?.storeUrl || (await VersionCheck.getStoreUrl());
			if (storeUrl) {
				Linking.openURL(storeUrl);
			}
		} catch (error) {
			console.log('스토어 이동 실패:', error);
		}
	};

	if (!showUpdateModal) {
		return null;
	}

	return (
		<AppModal visible dismissOnBackdrop={false} dismissOnHardwareBack={false} backdropStyle={styles.backdrop}>
			<Animated.View
					style={[
						styles.card,
						{
							opacity: appear,
							transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(24), 0] }) }],
						},
					]}>
					<View style={styles.iconBadge}>
						<IconComponent type="MaterialCommunityIcons" name="rocket-launch-outline" size={28} color={Colors.primaryDeep} />
					</View>

					<Text style={styles.title}>{t('version.title')}</Text>
					<Text style={styles.message}>{t('version.message')}</Text>

					<View style={styles.versionRow}>
						<View style={styles.versionChip}>
							<Text style={styles.versionChipLabel}>{t('version.current')}</Text>
							<Text style={styles.versionChipText}>v{versionInfo.current}</Text>
						</View>
						<IconComponent type="MaterialCommunityIcons" name="arrow-right" size={16} color={Colors.textMuted} />
						<View style={[styles.versionChip, styles.versionChipLatest]}>
							<Text style={[styles.versionChipLabel, styles.versionChipLabelLatest]}>{t('version.latest')}</Text>
							<Text style={[styles.versionChipText, styles.versionChipTextLatest]}>v{versionInfo.latest}</Text>
						</View>
					</View>

					<PressableScale style={styles.updateButton} accessibilityRole="button" onPress={handleUpdate}>
						<IconComponent type="materialIcons" name="system-update" size={18} color={Colors.textInverse} />
						<Text numberOfLines={2} style={styles.buttonText}>{t('version.update')}</Text>
					</PressableScale>

					<Text style={styles.notice}>{t('version.notice')}</Text>
			</Animated.View>
		</AppModal>
	);
};

const createStyles = (Colors: Palette) => StyleSheet.create({
	backdrop: {
		paddingHorizontal: Spacing.xxl,
	},
	card: {
		width: '100%',
		maxWidth: Math.min(scaleWidth(340), MODAL_MAX_WIDTH),
		alignSelf: 'center',
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		paddingTop: SpacingV.xxl,
		paddingBottom: SpacingV.xl,
		paddingHorizontal: Spacing.xxl,
		alignItems: 'center',
		...Shadow.floating,
	},
	iconBadge: {
		width: scaleWidth(60),
		height: scaleWidth(60),
		borderRadius: Radius.xl,
		backgroundColor: Colors.primarySoft,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: SpacingV.lg,
	},
	title: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.textStrong,
		textAlign: 'center',
	},
	message: {
		marginTop: SpacingV.sm,
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: Math.round(Typography.bodySm * 1.6),
		includeFontPadding: false,
	},
	versionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		marginTop: SpacingV.lg,
		marginBottom: SpacingV.xl,
	},
	versionChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.xs,
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.pill,
		paddingVertical: scaleHeight(5),
		paddingHorizontal: Spacing.md,
	},
	versionChipLatest: { backgroundColor: Colors.primarySoft },
	// textMuted 는 비활성·placeholder 용이라 라이트에서 2.3:1 로 읽히지 않는다 — 보이는 라벨은 textSecondary
	versionChipLabel: { fontSize: Typography.caption, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
	versionChipLabelLatest: { color: Colors.primaryDark },
	versionChipText: { fontSize: Typography.footnote, color: Colors.textSecondary, fontWeight: FontWeight.bold, flexShrink: 1, textAlign: 'center', },
	versionChipTextLatest: { color: Colors.primaryDeep },
	updateButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.sm,
		backgroundColor: Colors.primarySurface,
		borderRadius: Radius.lg,
		minHeight: scaleHeight(52),
		width: '100%', paddingVertical: SpacingV.sm, },
	buttonText: {
		color: Colors.textInverse,
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold, flexShrink: 1, textAlign: 'center', },
	notice: {
		marginTop: SpacingV.md,
		fontSize: Typography.caption,
		color: Colors.textMuted,
		textAlign: 'center',
	},
});

export default VersionCheckModal;
