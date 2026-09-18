import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Animated, Easing, Keyboard, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { scaleHeight, scaleWidth } from '@/src/utils';
import AppModal from '../common/atomic/AppModal';
import IconComponent from '../common/atomic/IconComponent';
import { COMMON_APPS_DATA, isNewApp } from '@/src/const/common/CommonAppsData';
import { localizedApp } from '@/src/const/common/CommonAppsI18n';
import { CommonType } from '@/src/types/CommonType';
import { Palette } from '@/src/const/ConstColors';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { useColors, useTheme, useThemedStyles } from '@/src/hooks/useTheme';

type CategoryFilter = 'all' | CommonType.AppCategory;

/** 탭 순서만 여기서 정하고, 보이는 글자는 화면에서 t('apps.category.…') 로 붙인다 */
const CATEGORY_TABS: CategoryFilter[] = ['all', 'quiz', 'calculator', 'utility'];

/** 카테고리 배지 색 — 팔레트 토큰만 사용해 라이트/다크 모두에서 대비가 유지된다 */
const categoryColors = (Colors: Palette): Record<CommonType.AppCategory, { bg: string; text: string }> => ({
	quiz: { bg: Colors.primarySoft, text: Colors.primaryDeep },
	calculator: { bg: Colors.secondarySoft, text: Colors.secondaryDark },
	utility: { bg: Colors.warningSoft, text: Colors.accentAmber },
});

interface Props {
	visible: boolean;
	onClose: () => void;
}

const DeveloperAppsModal = ({ visible, onClose }: Props) => {
	const { t, i18n } = useTranslation();
	const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
	const [searchQuery, setSearchQuery] = useState('');
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	// iOS 키보드도 앱 테마를 따라가게 한다
	const { isDark } = useTheme();
	const catColors = useMemo(() => categoryColors(Colors), [Colors]);

	// 진입 연출(페이드 + 살짝 떠오름). 언마운트 시 정지해 애니메이션이 남지 않게 한다
	const enter = useRef(new Animated.Value(0)).current;
	useEffect(() => {
		const anim = Animated.timing(enter, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true });
		anim.start();
		return () => anim.stop();
	}, [enter]);

	/** 지금 언어로 이름·설명을 갈아 끼운 목록 — 검색도 화면에 보이는 글자로 건다 */
	const localizedApps = useMemo(
		() => COMMON_APPS_DATA.Apps.map((app) => ({ ...app, ...localizedApp(app, i18n.language) })),
		[i18n.language],
	);

	const filteredApps = useMemo(() => {
		return localizedApps.filter((app) => {
			const categoryMatch = selectedCategory === 'all' || app.category === selectedCategory;
			const q = searchQuery.trim().toLowerCase();
			const textMatch = !q || app.title.toLowerCase().includes(q) || app.desc.toLowerCase().includes(q);
			return categoryMatch && textMatch;
		});
	}, [localizedApps, selectedCategory, searchQuery]);

	const getDownloadUrl = (app: CommonType.AppItem) => {
		const primary = Platform.OS === 'android' ? app.android : app.ios;
		const fallback = Platform.OS === 'android' ? app.ios : app.android;
		return primary || fallback || null;
	};

	const onDownloadApp = async (app: CommonType.AppItem) => {
		const url = getDownloadUrl(app);
		if (!url) {
			Alert.alert(t('apps.comingSoon'), t('apps.linkUnavailable'));
			return;
		}
		try {
			const supported = await Linking.canOpenURL(url);
			if (!supported) {
				Alert.alert(t('common.error'), t('apps.linkOpenFailed'));
				return;
			}
			Linking.openURL(url);
		} catch {
			Alert.alert(t('common.error'), t('apps.linkError'));
		}
	};

	const handleClose = () => {
		setSelectedCategory('all');
		setSearchQuery('');
		onClose();
	};

	// 닫히는 순간 바로 언마운트 — 다음 모달과 사라지는 애니메이션이 겹쳐 이전 모달이 깜빡이는 것을 막는다
	if (!visible) {
		return null;
	}

	return (
		<AppModal visible={visible} onClose={handleClose} avoidKeyboard backdropStyle={styles.overlay}>
			<Animated.View
					style={[
						styles.container,
						{
							opacity: enter,
							transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(16), 0] }) }],
						},
					]}>
					{/* 헤더 */}
					<View style={styles.header}>
						<View style={styles.headerTop}>
							<Text style={styles.titleText} numberOfLines={1} ellipsizeMode="tail">
								{t('apps.title')}
							</Text>
							<TouchableOpacity style={styles.closeButton} onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.close')}>
								<IconComponent type="materialIcons" name="close" size={18} color={Colors.textSecondary} />
							</TouchableOpacity>
						</View>

						{/* 검색 */}
						<View style={styles.searchBox}>
							<IconComponent type="Feather" name="search" size={14} color={Colors.textMuted} style={styles.searchIcon} />
							<TextInput
								keyboardAppearance={isDark ? 'dark' : 'light'}
								style={styles.searchInput}
								placeholder={t('apps.searchPlaceholder')}
								placeholderTextColor={Colors.textMuted}
								value={searchQuery}
								onChangeText={setSearchQuery}
							/>
						</View>

						{/* 카테고리 필터 */}
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.tabsContainer}
							keyboardShouldPersistTaps="handled"
							keyboardDismissMode="on-drag">
							{CATEGORY_TABS.map((key) => (
								<TouchableOpacity
									key={key}
									style={[styles.tabButton, selectedCategory === key && styles.tabButtonActive]}
									activeOpacity={0.8}
									onPress={() => {
										Keyboard.dismiss();
										setSelectedCategory(key);
									}}>
									<Text
										style={[styles.tabButtonText, selectedCategory === key && styles.tabButtonTextActive]}
										numberOfLines={1}>
										{t(`apps.category.${key}`)}
									</Text>
								</TouchableOpacity>
							))}
						</ScrollView>
					</View>

					<View style={styles.divider} />

					{/* 카운트 */}
					<Text style={styles.countLabel}>{t('apps.count', { n: filteredApps.length })}</Text>

					{/* 리스트 */}
					<ScrollView
						contentContainerStyle={styles.scroll}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
						keyboardDismissMode="on-drag"
						onScrollBeginDrag={Keyboard.dismiss}>
						{filteredApps.length === 0 ? (
							<View style={styles.emptyState}>
								<Text style={styles.emptyText}>{t('apps.empty')}</Text>
							</View>
						) : (
							filteredApps.map((app) => {
								const catColor = catColors[app.category];
								return (
									<View key={app.id} style={styles.appCard}>
										<View style={styles.imageWrapper}>
											<Image source={app.icon} style={styles.image} contentFit="cover" />

											{isNewApp(app) && (
												<View style={styles.newBadge}>
													<Text style={styles.newBadgeText}>{t('common.new')}</Text>
												</View>
											)}
										</View>
										<View style={styles.appInfo}>
											<Text style={styles.appTitle} numberOfLines={1} ellipsizeMode="tail">
												{app.title}
											</Text>
											<Text style={styles.appDesc} numberOfLines={2} ellipsizeMode="tail">
												{app.desc}
											</Text>
											<View style={styles.appFooter}>
												<View style={[styles.categoryBadge, { backgroundColor: catColor.bg }]}>
													<Text style={[styles.categoryBadgeText, { color: catColor.text }]} numberOfLines={1}>
														{t(`apps.category.${app.category}`)}
													</Text>
												</View>
												<TouchableOpacity style={styles.downloadButton} activeOpacity={0.8} onPress={() => onDownloadApp(app)}>
													<IconComponent type="Feather" name="download" size={12} color={Colors.primaryDeep} />
													<Text style={styles.downloadText}>{t('apps.download')}</Text>
												</TouchableOpacity>
											</View>
										</View>
									</View>
								);
							})
						)}
					</ScrollView>
			</Animated.View>
		</AppModal>
	);
};

export default DeveloperAppsModal;

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		overlay: {
			paddingHorizontal: Spacing.xl,
		},
		container: {
			...Layout.modalCard,
			maxHeight: scaleHeight(660),
			backgroundColor: Colors.surface,
			borderRadius: Radius.xl,
			overflow: 'hidden',
			...Shadow.floating,
		},
		header: {
			paddingTop: SpacingV.xl,
			paddingHorizontal: Spacing.xl,
		},
		headerTop: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: Spacing.md,
			marginBottom: SpacingV.md,
		},
		titleText: {
			flex: 1,
			fontSize: Typography.subtitle,
			fontWeight: FontWeight.bold,
			color: Colors.textStrong,
		},
		closeButton: {
			width: scaleWidth(30),
			height: scaleWidth(30),
			borderRadius: Radius.lg,
			backgroundColor: Colors.surfaceAlt,
			alignItems: 'center',
			justifyContent: 'center', },
		searchBox: {
			flexDirection: 'row',
			alignItems: 'center',
			backgroundColor: Colors.surfaceAlt,
			borderRadius: Radius.md,
			paddingHorizontal: Spacing.md,
			marginBottom: SpacingV.md,
			height: scaleHeight(40),
		},
		searchIcon: {
			marginRight: Spacing.sm,
		},
		searchInput: {
			flex: 1,
			fontSize: Typography.bodySm,
			color: Colors.text,
			paddingVertical: 0,
		},
		tabsContainer: {
			flexDirection: 'row',
			gap: Spacing.sm,
			paddingBottom: SpacingV.md,
		},
		tabButton: {
			paddingHorizontal: Spacing.lg,
			paddingVertical: SpacingV.sm,
			borderRadius: Radius.pill,
			borderWidth: 1,
			borderColor: Colors.border,
			backgroundColor: 'transparent',
		},
		tabButtonActive: {
			backgroundColor: Colors.primarySoft,
			borderColor: 'transparent',
		},
		tabButtonText: {
			flexShrink: 1,
			fontSize: Typography.footnote,
			color: Colors.textSecondary,
			fontWeight: FontWeight.medium,
		},
		tabButtonTextActive: {
			color: Colors.primaryDeep,
			fontWeight: FontWeight.bold,
		},
		divider: {
			height: StyleSheet.hairlineWidth,
			backgroundColor: Colors.border,
		},
		countLabel: {
			fontSize: Typography.footnote,
			color: Colors.textMuted,
			paddingHorizontal: Spacing.xl,
			paddingTop: SpacingV.md,
			paddingBottom: SpacingV.xs,
		},
		scroll: {
			paddingHorizontal: Spacing.xl,
			paddingBottom: SpacingV.xl,
			gap: SpacingV.sm,
		},
		appCard: {
			flexDirection: 'row',
			alignItems: 'flex-start',
			gap: Spacing.md,
			padding: Spacing.md,
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.border,
			backgroundColor: Colors.surface,
		},
		// 래퍼가 overflow:visible(NEW 배지가 밖으로 나감)이라 라운드는 이미지 자체에 준다
		image: {
			width: '100%',
			height: '100%',
			borderRadius: Radius.md,
		},
		appInfo: {
			flex: 1,
			minWidth: 0,
		},
		appTitle: {
			fontSize: Typography.body,
			fontWeight: FontWeight.semibold,
			color: Colors.textStrong,
			marginBottom: SpacingV.xs,
		},
		appDesc: {
			fontSize: Typography.footnote,
			color: Colors.textSecondary,
			lineHeight: Math.round(Typography.footnote * 1.5),
			marginBottom: SpacingV.sm,
		},
		appFooter: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: Spacing.sm,
		},
		categoryBadge: {
			paddingHorizontal: Spacing.sm,
			paddingVertical: SpacingV.xs,
			borderRadius: Radius.pill,
			flexShrink: 1,
		},
		categoryBadgeText: {
			fontSize: Typography.caption,
			fontWeight: FontWeight.semibold, flexShrink: 1, textAlign: 'center', },
		downloadButton: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.xs,
			paddingHorizontal: Spacing.md,
			paddingVertical: SpacingV.xs,
			borderRadius: Radius.sm,
			borderWidth: 1,
			borderColor: Colors.primary,
			flexShrink: 0,
		},
		downloadText: {
			fontSize: Typography.footnote,
			color: Colors.primaryDeep,
			fontWeight: FontWeight.semibold,
		},
		emptyState: {
			paddingVertical: SpacingV.xxxl,
			alignItems: 'center',
		},
		emptyText: {
			fontSize: Typography.bodySm,
			color: Colors.textMuted,
		},
		imageWrapper: {
			position: 'relative',
			width: scaleWidth(52),
			height: scaleWidth(52),
			flexShrink: 0,
			overflow: 'visible',
			borderRadius: Radius.md,
			backgroundColor: Colors.surfaceAlt,
		},
		newBadge: {
			position: 'absolute',
			top: -scaleWidth(4),
			left: -scaleWidth(4),
			// 다크에서 error 는 밝은 살몬(#F87171)이 되어 흰 글씨가 뭉개진다 — 배지 면은 진한 빨강으로 고정
			backgroundColor: '#DC2626',
			borderRadius: Radius.sm,
			paddingHorizontal: Spacing.xs,
			paddingVertical: SpacingV.xs,
			zIndex: 1,
		},
		newBadgeText: {
			// 빨간 배지 위 글자 — 다크에서도 흰색이어야 대비가 유지되므로 토큰이 아닌 고정색
			color: '#FFFFFF',
			fontSize: Typography.caption,
			fontWeight: FontWeight.heavy,
			letterSpacing: 0.5, flexShrink: 1, textAlign: 'center', },
	});
