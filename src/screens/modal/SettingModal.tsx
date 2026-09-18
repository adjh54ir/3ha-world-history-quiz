// 추가 모달 컴포넌트 두 개 생성
import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {Keyboard, Animated, Easing, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { scaleHeight, scaleWidth } from '@/src/utils/DementionUtils';
import AppModal from '../common/atomic/AppModal';
import { LANDMARK_CREDITS } from '@/src/const/data/world/ConstLandmarkCredits';
import IconComponent from '../common/atomic/IconComponent';
import { Palette } from '@/src/const/ConstColors';
import { FontWeight, Layout, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';

interface ModalProps {
	visible: boolean;
	onClose: () => void;
}

/**
 * 시트가 아래에서 떠오르는 진입 연출.
 * 언마운트 시 애니메이션을 정지해 값/콜백이 남지 않게 한다.
 */
const useSheetEnter = () => {
	const enter = useRef(new Animated.Value(0)).current;
	useEffect(() => {
		const anim = Animated.timing(enter, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true });
		anim.start();
		return () => anim.stop();
	}, [enter]);
	return {
		opacity: enter,
		transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(20), 0] }) }],
	};
};




/** 라이선스 고지 항목 — 이름/라이선스/버전(있으면)/원문 링크 */
type OssItem = {
	name: string;
	license: string;
	/** 라이브러리만 버전을 붙인다. 자료·사운드는 버전 개념이 없다 */
	version?: string;
	url: string;
	/** 저작자 표시가 라이선스 조건인 항목의 원작자 */
	credit?: string;
};

type OssSection = { key: string; items: OssItem[] };

/**
 * 오픈소스 고지 목록.
 * -------------------------------------------------
 * - 랜드마크 사진과 사운드는 저작자 표시가 **라이선스 조건**이라 반드시 앱 안에 남아야 한다.
 *   근거: `src/const/data/world/ConstLandmarkCredits.ts`, `assets/sounds/ATTRIBUTIONS.md`
 *   랜드마크 96장은 표에서 그대로 만들어 세운다 — 손으로 옮겨 적으면 사진을 바꿀 때 어긋난다.
 * - 한자 서체·필순 자료 고지는 걷어냈다. 학습 도메인이 세계 상식으로 바뀌면서 둘 다 앱에서 빠졌고,
 *   쓰지 않는 자료를 고지에 남겨 두면 고지 자체가 사실과 어긋난다.
 * - 라이브러리 버전은 실제 설치본(node_modules) 기준. 의존성을 올리면 여기도 같이 고친다.
 */
const buildOpenSourceSections = (t: (key: string) => string): OssSection[] => [
	{
		key: 'landmark',
		items: LANDMARK_CREDITS.map((credit) => ({
			name: `${credit.name} — ${credit.artist}`,
			license: credit.license,
			credit: credit.artist,
			url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(credit.file)}`,
		})),
	},
	{
		key: 'figure',
		items: [
			{
				name: t('oss.item.figure'),
				license: 'Public domain',
				url: 'https://commons.wikimedia.org/wiki/Main_Page',
			},
		],
	},
	{
		key: 'sound',
		items: [
			{ name: t('oss.item.sfx'), license: 'CC0', credit: 'Kenney (Interface Sounds)', url: 'https://kenney.nl/assets/interface-sounds' },
			{ name: t('oss.item.bgm'), license: t('oss.license.inHouse'), credit: '3ha', url: 'https://3ha.co.kr' },
		],
	},
	{
		key: 'library',
		items: [
			{ name: 'React Native', license: 'MIT', version: '0.83.6', url: 'https://github.com/facebook/react-native' },
			{ name: 'React', license: 'MIT', version: '19.2.0', url: 'https://github.com/facebook/react' },
			{ name: 'Expo SDK', license: 'MIT', version: '55.0.26', url: 'https://github.com/expo/expo' },
			{ name: 'expo-router', license: 'MIT', version: '55.0.16', url: 'https://github.com/expo/expo/tree/main/packages/expo-router' },
			{ name: 'expo-audio', license: 'MIT', version: '55.0.15', url: 'https://github.com/expo/expo/tree/main/packages/expo-audio' },
			{ name: 'expo-image', license: 'MIT', version: '55.0.11', url: 'https://github.com/expo/expo/tree/main/packages/expo-image' },
			{ name: 'expo-linear-gradient', license: 'MIT', version: '55.0.14', url: 'https://github.com/expo/expo/tree/main/packages/expo-linear-gradient' },
			{ name: 'expo-font', license: 'MIT', version: '55.0.8', url: 'https://github.com/expo/expo/tree/main/packages/expo-font' },
			{ name: 'expo-asset', license: 'MIT', version: '55.0.17', url: 'https://github.com/expo/expo/tree/main/packages/expo-asset' },
			{ name: 'expo-splash-screen', license: 'MIT', version: '55.0.21', url: 'https://github.com/expo/expo/tree/main/packages/expo-splash-screen' },
			{ name: 'expo-status-bar', license: 'MIT', version: '55.0.6', url: 'https://github.com/expo/expo/tree/main/packages/expo-status-bar' },
			{ name: 'expo-updates', license: 'MIT', version: '55.0.25', url: 'https://github.com/expo/expo/tree/main/packages/expo-updates' },
			{ name: '@react-navigation/native', license: 'MIT', version: '7.3.4', url: 'https://github.com/react-navigation/react-navigation' },
			{ name: '@react-navigation/bottom-tabs', license: 'MIT', version: '7.18.3', url: 'https://github.com/react-navigation/react-navigation' },
			{ name: 'react-native-safe-area-context', license: 'MIT', version: '5.6.2', url: 'https://github.com/th3rdwave/react-native-safe-area-context' },
			{ name: 'react-native-screens', license: 'MIT', version: '4.23.0', url: 'https://github.com/software-mansion/react-native-screens' },
			{ name: 'react-native-gesture-handler', license: 'MIT', version: '2.32.0', url: 'https://github.com/software-mansion/react-native-gesture-handler' },
			{ name: 'react-native-reanimated', license: 'MIT', version: '4.2.1', url: 'https://github.com/software-mansion/react-native-reanimated' },
			{ name: 'react-native-worklets', license: 'MIT', version: '0.7.4', url: 'https://github.com/software-mansion/react-native-worklets' },
			{ name: 'react-native-svg', license: 'MIT', version: '15.15.5', url: 'https://github.com/software-mansion/react-native-svg' },
			{ name: 'react-native-vector-icons', license: 'MIT', version: '10.3.0', url: 'https://github.com/oblador/react-native-vector-icons' },
			{ name: '@expo/vector-icons', license: 'MIT', version: '15.1.1', url: 'https://github.com/expo/vector-icons' },
			{ name: 'react-native-confetti-cannon', license: 'MIT', version: '1.5.2', url: 'https://github.com/VincentCATILLON/react-native-confetti-cannon' },
			{ name: 'react-native-calendars', license: 'MIT', version: '1.1314.0', url: 'https://github.com/wix/react-native-calendars' },
			{ name: '@react-native-async-storage/async-storage', license: 'MIT', version: '2.2.0', url: 'https://github.com/react-native-async-storage/async-storage' },
			{ name: '@reduxjs/toolkit', license: 'MIT', version: '2.12.0', url: 'https://github.com/reduxjs/redux-toolkit' },
			{ name: 'react-redux', license: 'MIT', version: '9.3.0', url: 'https://github.com/reduxjs/react-redux' },
			{ name: 'redux-persist', license: 'MIT', version: '6.0.0', url: 'https://github.com/rt2zz/redux-persist' },
			{ name: '@notifee/react-native', license: 'Apache-2.0', version: '9.1.8', url: 'https://github.com/invertase/notifee' },
			{ name: '@react-native-firebase (app · analytics · crashlytics)', license: 'Apache-2.0', version: '24.1.1', url: 'https://github.com/invertase/react-native-firebase' },
			{ name: 'react-native-google-mobile-ads', license: 'Apache-2.0', version: '16.4.0', url: 'https://github.com/invertase/react-native-google-mobile-ads' },
			{ name: 'react-native-device-info', license: 'MIT', version: '14.1.1', url: 'https://github.com/react-native-device-info/react-native-device-info' },
			{ name: 'react-native-permissions', license: 'MIT', version: '5.6.0', url: 'https://github.com/zoontek/react-native-permissions' },
			{ name: 'react-native-version-check', license: 'MIT', version: '3.5.0', url: 'https://github.com/kimxogus/react-native-version-check' },
			{ name: 'i18next', license: 'MIT', version: '24.2.3', url: 'https://github.com/i18next/i18next' },
			{ name: 'react-i18next', license: 'MIT', version: '15.7.4', url: 'https://github.com/i18next/react-i18next' },
			{ name: 'intl-pluralrules', license: 'ISC', version: '2.0.1', url: 'https://github.com/eemeli/intl-pluralrules' },
			{ name: '@react-native-community/netinfo', license: 'MIT', version: '11.5.2', url: 'https://github.com/react-native-netinfo/react-native-netinfo' },
			{ name: '@react-native-community/datetimepicker', license: 'MIT', version: '8.6.0', url: 'https://github.com/react-native-datetimepicker/datetimepicker' },
		],
	},
];

export const OpenSourceModal = ({ visible, onClose }: ModalProps) => {
	const { t } = useTranslation();
	const Colors = useColors();
	const modalStyles = useThemedStyles(createModalStyles);
	const styles = useThemedStyles(createStyles);
	const enterStyle = useSheetEnter();

	// 닫히는 순간 바로 언마운트 — 다음 모달과 사라지는 애니메이션이 겹쳐 이전 모달이 깜빡이는 것을 막는다
	if (!visible) {
		return null;
	}

	return (
		<AppModal visible={visible} onClose={onClose} backdropStyle={modalStyles.overlay}>
			<Animated.View style={[modalStyles.container, enterStyle]}>
					<View style={modalStyles.header}>
						<View style={modalStyles.spacer} />
						<Text style={modalStyles.modalTitle} numberOfLines={1} ellipsizeMode="tail">
							{t('oss.title')}
						</Text>
						<TouchableOpacity style={modalStyles.closeIcon} onPress={onClose} activeOpacity={0.7} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.close')}>
							<IconComponent type="materialIcons" name="close" size={20} color={Colors.textSecondary} />
						</TouchableOpacity>
					</View>

					<ScrollView contentContainerStyle={modalStyles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>
						{buildOpenSourceSections(t).map((section) => (
							<View key={section.key} style={styles.section}>
								<Text style={styles.sectionTitle}>{t(`oss.section.${section.key}`)}</Text>
								<Text style={styles.sectionCaption}>{t(`oss.caption.${section.key}`)}</Text>
								{section.items.map((lib) => {
									const isGithub = lib.url.includes('github.com');
									return (
										<View key={lib.name} style={styles.card}>
											<View style={styles.cardHeader}>
												<View style={styles.cardIconBadge}>
													<IconComponent type="Feather" name="package" size={15} color={Colors.primaryDeep} />
												</View>
												<View style={styles.cardTitleArea}>
													<Text style={styles.libName} numberOfLines={2} ellipsizeMode="tail">
														{lib.name}
													</Text>
													<View style={styles.metaRow}>
														<View style={styles.metaChip}>
															<Text style={styles.metaChipText} numberOfLines={1}>
																{lib.license}
															</Text>
														</View>
														{/* 버전은 라이브러리에만 있고, 원작자 표기는 CC BY 계열에만 있다 */}
														<Text style={styles.metaVersion} numberOfLines={1}>
															{lib.version ? `v${lib.version}` : (lib.credit ?? '')}
														</Text>
													</View>
												</View>
												<TouchableOpacity onPress={() => Linking.openURL(lib.url)} style={styles.linkWrapper} activeOpacity={0.7}>
													<IconComponent type="Feather" name={isGithub ? 'github' : 'external-link'} size={14} color={Colors.primaryDeep} />
													<Text style={styles.linkText}>{isGithub ? 'GitHub' : t('oss.source')}</Text>
												</TouchableOpacity>
											</View>
										</View>
									);
								})}
							</View>
						))}
						<Text style={styles.footer}>{t('oss.thanks')}</Text>
					</ScrollView>
			</Animated.View>
		</AppModal>
	);
};
const createModalStyles = (Colors: Palette) =>
	StyleSheet.create({
		/** 다른 언어에서만 뜨는 "아래는 한국어 원문" 안내 */
		legalNotice: {
			marginBottom: SpacingV.md,
			paddingVertical: SpacingV.sm,
			paddingHorizontal: Spacing.md,
			borderRadius: Radius.md,
			backgroundColor: Colors.surfaceAlt,
			fontSize: Typography.caption,
			color: Colors.textSecondary,
		},
		overlay: {
			paddingHorizontal: Spacing.xl,
		},
		container: {
			...Layout.modalCard,
			maxHeight: scaleHeight(680),
			backgroundColor: Colors.surface,
			borderRadius: Radius.xl,
			overflow: 'hidden',
		},
		scrollContainer: {
			flexGrow: 1,
			paddingHorizontal: Spacing.xl,
			paddingTop: SpacingV.lg,
			paddingBottom: SpacingV.xxl,
		},
		header: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: Spacing.sm,
			paddingVertical: SpacingV.lg,
			paddingHorizontal: Spacing.xl,
			borderBottomWidth: StyleSheet.hairlineWidth,
			borderBottomColor: Colors.border,
		},
		modalTitle: {
			flex: 1,
			fontSize: Typography.subtitle,
			fontWeight: FontWeight.bold,
			textAlign: 'center',
			color: Colors.textStrong,
		},
		spacer: {
			width: scaleWidth(30), // 닫기 아이콘 크기만큼 확보하여 타이틀 중앙 정렬 유지
		},
		closeIcon: {
			width: scaleWidth(30),
			height: scaleWidth(30),
			borderRadius: Radius.lg,
			backgroundColor: Colors.surfaceAlt,
			alignItems: 'center',
			justifyContent: 'center',
		},
	});

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		section: {
			marginBottom: SpacingV.xl,
		},
		sectionTitle: {
			fontSize: Typography.body,
			fontWeight: FontWeight.bold,
			color: Colors.textStrong,
			marginBottom: SpacingV.xs,
		},
		sectionCaption: {
			fontSize: Typography.footnote,
			color: Colors.textMuted,
			marginBottom: SpacingV.md,
		},
		card: {
			backgroundColor: Colors.surface,
			borderRadius: Radius.lg,
			padding: Spacing.lg,
			marginBottom: SpacingV.sm,
			borderWidth: 1,
			borderColor: Colors.border,
		},
		cardHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
		},
		cardIconBadge: {
			width: scaleWidth(36),
			height: scaleWidth(36),
			borderRadius: Radius.md,
			backgroundColor: Colors.primarySoft,
			alignItems: 'center',
			justifyContent: 'center',
			flexShrink: 0,
		},
		cardTitleArea: {
			flex: 1,
			minWidth: 0,
		},
		libName: {
			fontSize: Typography.body,
			fontWeight: FontWeight.semibold,
			color: Colors.textStrong,
			marginBottom: SpacingV.xs,
		},
		metaRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.sm,
		},
		metaChip: {
			backgroundColor: Colors.surfaceAlt,
			borderRadius: Radius.sm,
			paddingHorizontal: Spacing.sm,
			paddingVertical: SpacingV.xs,
			flexShrink: 1,
		},
		metaChipText: {
			flexShrink: 1,
			fontSize: Typography.caption,
			color: Colors.textSecondary,
			fontWeight: FontWeight.semibold,
		},
		metaVersion: {
			fontSize: Typography.caption,
			color: Colors.textMuted,
			flexShrink: 1,
		},
		linkWrapper: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.xs,
			backgroundColor: Colors.primarySoft,
			borderRadius: Radius.sm,
			paddingHorizontal: Spacing.md,
			paddingVertical: SpacingV.sm,
			flexShrink: 0,
		},
		linkText: {
			fontSize: Typography.footnote,
			color: Colors.primaryDeep,
			fontWeight: FontWeight.semibold,
		},
		footer: {
			marginTop: SpacingV.lg,
			fontSize: Typography.footnote,
			color: Colors.textMuted,
			textAlign: 'center',
		},
	});

