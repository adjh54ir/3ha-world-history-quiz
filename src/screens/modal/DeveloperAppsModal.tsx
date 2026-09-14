import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Keyboard, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { scaleHeight, scaleWidth } from '@/src/utils';
import AppModal from '../common/atomic/AppModal';
import IconComponent from '../common/atomic/IconComponent';
import { COMMON_APPS_DATA } from '@/src/const/common/CommonAppsData';
import { CommonType } from '@/src/types/CommonType';
import { Palette } from '@/src/const/ConstColors';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { useColors, useTheme, useThemedStyles } from '@/src/hooks/useTheme';

type CategoryFilter = 'all' | CommonType.AppCategory;

const CATEGORY_TABS: { key: CategoryFilter; label: string }[] = [
	{ key: 'all', label: '전체' },
	{ key: 'quiz', label: '퀴즈' },
	{ key: 'calculator', label: '계산기' },
	{ key: 'utility', label: '유틸리티' },
];

const CATEGORY_LABEL: Record<CommonType.AppCategory, string> = {
	quiz: '퀴즈',
	calculator: '계산기',
	utility: '유틸리티',
};

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

	const filteredApps = useMemo(() => {
		return COMMON_APPS_DATA.Apps.filter((app) => {
			const categoryMatch = selectedCategory === 'all' || app.category === selectedCategory;
			const q = searchQuery.trim().toLowerCase();
			const textMatch = !q || app.title.toLowerCase().includes(q) || app.desc.toLowerCase().includes(q);
			return categoryMatch && textMatch;
		});
	}, [selectedCategory, searchQuery]);

	const getDownloadUrl = (app: CommonType.AppItem) => {
		const primary = Platform.OS === 'android' ? app.android : app.ios;
		const fallback = Platform.OS === 'android' ? app.ios : app.android;
		return primary || fallback || null;
	};

	const newAppIds = useMemo(
		() =>
			new Set(
				[...COMMON_APPS_DATA.Apps]
					.sort((a, b) => b.id - a.id)
					.slice(0, 2)
					.map((app) => app.id),
			),
		[],
	);
	const onDownloadApp = async (app: CommonType.AppItem) => {
		const url = getDownloadUrl(app);
		if (!url) {
			Alert.alert('Coming Soon!', '아직 스토어 링크가 준비되지 않았습니다.');
			return;
		}
		try {
			const supported = await Linking.canOpenURL(url);
			if (!supported) {
				Alert.alert('오류', '링크를 열 수 없습니다.');
				return;
			}
			Linking.openURL(url);
		} catch {
			Alert.alert('오류', '링크를 여는 중 문제가 발생했습니다.');
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
								📱 제작자의 다른 앱
							</Text>
							<TouchableOpacity style={styles.closeButton} onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="닫기">
								<IconComponent type="materialIcons" name="close" size={18} color={Colors.textSecondary} />
							</TouchableOpacity>
						</View>

						{/* 검색 */}
						<View style={styles.searchBox}>
							<IconComponent type="Feather" name="search" size={14} color={Colors.textMuted} style={styles.searchIcon} />
							<TextInput
								keyboardAppearance={isDark ? 'dark' : 'light'}
								style={styles.searchInput}
								placeholder="앱 검색..."
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
							{CATEGORY_TABS.map((tab) => (
								<TouchableOpacity
									key={tab.key}
									style={[styles.tabButton, selectedCategory === tab.key && styles.tabButtonActive]}
									activeOpacity={0.8}
									onPress={() => {
										Keyboard.dismiss();
										setSelectedCategory(tab.key);
									}}>
									<Text
										style={[styles.tabButtonText, selectedCategory === tab.key && styles.tabButtonTextActive]}
										numberOfLines={1}>
										{tab.label}
									</Text>
								</TouchableOpacity>
							))}
						</ScrollView>
					</View>

					<View style={styles.divider} />

					{/* 카운트 */}
					<Text style={styles.countLabel}>{filteredApps.length}개 앱</Text>

					{/* 리스트 */}
					<ScrollView
						contentContainerStyle={styles.scroll}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
						keyboardDismissMode="on-drag"
						onScrollBeginDrag={Keyboard.dismiss}>
						{filteredApps.length === 0 ? (
							<View style={styles.emptyState}>
								<Text style={styles.emptyText}>검색 결과가 없습니다</Text>
							</View>
						) : (
							filteredApps.map((app) => {
								const catColor = catColors[app.category];
								return (
									<View key={app.id} style={styles.appCard}>
										<View style={styles.imageWrapper}>
											<Image source={app.icon} style={styles.image} contentFit="cover" />

											{newAppIds.has(app.id) && (
												<View style={styles.newBadge}>
													<Text style={styles.newBadgeText}>NEW</Text>
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
														{CATEGORY_LABEL[app.category]}
													</Text>
												</View>
												<TouchableOpacity style={styles.downloadButton} activeOpacity={0.8} onPress={() => onDownloadApp(app)}>
													<IconComponent type="Feather" name="download" size={12} color={Colors.primaryDeep} />
													<Text style={styles.downloadText}>다운로드</Text>
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
			justifyContent: 'center',
		},
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
			fontWeight: FontWeight.semibold,
		},
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
			letterSpacing: 0.5,
		},
	});
