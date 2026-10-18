import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import CommonHeader from '@/src/screens/common/CommonHeader';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Colors from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, CardSurface, Layout } from '@/src/const/ConstDesign';
import { gridColumns, scaledSize } from '@/src/utils';
import { OPEN_SOURCE_LIBS, OpenSourceLib } from '@/src/const/ConstOpenSource';
import { LANDMARK_CREDITS } from '@/src/const/data/world/ConstLandmarkCredits';
import { WORLD_ENTRIES } from '@/src/const/data/world/ConstWorldEntries';
import { useToast } from '@/src/context/ToastContext';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import { themed } from '@/src/utils/ThemedStyles';
import { useTranslation } from 'react-i18next';
import ScrollTopButton, { useScrollTop } from '@/src/screens/common/atomic/ScrollTopButton';
import AdaptiveGrid from '@/src/screens/common/layout/AdaptiveGrid';

/** 태블릿 열 수 — 이름·라이선스 한 줄짜리 행이라 320 이면 충분하다 (폰 1열) */
const COLS = gridColumns(320);

/**
 * 설정 > 오픈소스 라이브러리
 * - 목록은 package.json + node_modules 에서 생성된 ConstOpenSource.ts 를 그대로 쓴다(`yarn oss`).
 * - 아래에 랜드마크 사진 출처를 함께 세운다. CC BY·CC BY-SA 사진은 저작자 표시가 라이선스 조건이라
 *   이 목록이 곧 그 조건을 지키는 자리다 — 빼면 안 된다 (ConstLandmarkCredits 참고).
 */
const OpenSource = () => {
	const scrollTop = useScrollTop();
	const { showToast } = useToast();
	const { t } = useTranslation();

	/** 라이선스별 개수 — 상단 요약 칩 */
	const licenseCounts = useMemo(() => {
		const map = new Map<string, number>();
		OPEN_SOURCE_LIBS.forEach((l) => map.set(l.license, (map.get(l.license) ?? 0) + 1));
		return [...map.entries()].sort((a, b) => b[1] - a[1]);
	}, []);

	const openUrl = (lib: OpenSourceLib) => {
		if (!lib.url) {
			showToast(t('opensource.noRepo'), 'info');
			return;
		}
		Linking.openURL(lib.url).catch(() => showToast(t('opensource.linkError'), 'error-outline'));
	};

	const renderItem = ({ item, index }: { item: OpenSourceLib; index: number }) => (
		// 첫 화면 분량만 순차 등장 — 스크롤 이후 항목은 지연 없이 바로 보인다
		<View style={COLS > 1 ? styles.cell : undefined}>
		<TouchableOpacity style={styles.card} activeOpacity={item.url ? 0.7 : 1} onPress={() => openUrl(item)}>
			<View style={styles.cardBody}>
				<Text style={styles.libName} numberOfLines={1} ellipsizeMode="middle">{item.name}</Text>
				<View style={styles.metaRow}>
					<View style={styles.licenseChip}>
						<Text style={styles.licenseText}>{item.license}</Text>
					</View>
					<Text style={styles.version}>v{item.version}</Text>
				</View>
			</View>
			{!!item.url && <IconComponent type="feather" name="external-link" size={scaledSize(16)} color={Colors.textMuted} />}
		</TouchableOpacity>
		</View>
	);

	return (
		<SafeAreaView style={styles.safe} edges={[]}>
			<CommonHeader title={t('opensource.title')} onBack={() => router.back()} />
			<FlatList key={`cols-${COLS}`} ref={scrollTop.ref} onScroll={scrollTop.onScroll} scrollEventThrottle={16}
				data={OPEN_SOURCE_LIBS}
				keyExtractor={(item) => item.name}
				renderItem={renderItem}
				numColumns={COLS}
				columnWrapperStyle={COLS > 1 ? styles.colWrap : undefined}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				initialNumToRender={12}
				windowSize={7}
				removeClippedSubviews
				ListHeaderComponent={
					<FadeInUp duration={280} distance={12} style={styles.summary}>
						<Text style={styles.summaryTitle}>{t('opensource.summary', { n: OPEN_SOURCE_LIBS.length })}</Text>
						<View style={styles.chipRow}>
							{licenseCounts.map(([license, count]) => (
								<View key={license} style={styles.summaryChip}>
									<Text style={styles.summaryChipText}>{`${license} ${count}`}</Text>
								</View>
							))}
						</View>
					</FadeInUp>
				}
				ListFooterComponent={
					<View>
						<View style={styles.creditHead}>
							<Text style={styles.summaryTitle}>{t('opensource.creditTitle')}</Text>
							<Text style={styles.creditSub}>{t('opensource.creditSub')}</Text>
						</View>
						<AdaptiveGrid columns={COLS}>
						{LANDMARK_CREDITS.map((c) => (
							<TouchableOpacity
								key={c.file}
								style={styles.card}
								activeOpacity={0.7}
								onPress={() => Linking.openURL(`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(c.file)}`).catch(() => showToast(t('opensource.linkError'), 'error-outline'))}>
								<View style={styles.cardBody}>
									<Text style={styles.libName} numberOfLines={1} ellipsizeMode="tail">{WORLD_ENTRIES.landmark.find((e) => e.fields.image === c.file)?.name ?? c.name}</Text>
									<View style={styles.metaRow}>
										<View style={styles.licenseChip}>
											<Text style={styles.licenseText}>{c.license}</Text>
										</View>
										<Text style={[styles.version, styles.creditArtist]} numberOfLines={1} ellipsizeMode="tail">{c.artist}</Text>
									</View>
								</View>
								<IconComponent type="feather" name="external-link" size={scaledSize(16)} color={Colors.textMuted} />
							</TouchableOpacity>
						))}
						</AdaptiveGrid>
						<View style={styles.footerRow}>
							<IconComponent type="materialIcons" name="volunteer-activism" size={scaledSize(18)} color={Colors.primary} />
							<Text style={styles.footer}>{t('opensource.thanks')}</Text>
						</View>
					</View>
				}
			/>
			{/* 긴 목록 — 우하단 맨 위로 버튼 */}
			<ScrollTopButton visible={scrollTop.visible} toTop={scrollTop.toTop} progress={scrollTop.progress} />
		</SafeAreaView>
	);
};

export default OpenSource;

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.background },
	content: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },
	summary: { marginBottom: Layout.sectionGap, gap: SpacingV.sm },
	summaryTitle: { fontSize: Typography.callout, fontWeight: '800', color: Colors.text },
	chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
	summaryChip: {
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.xs,
		borderRadius: Radius.pill,
		backgroundColor: Colors.primarySoft,
	},
	summaryChipText: { fontSize: Typography.caption, fontWeight: '700', color: Colors.primaryDeep },
	card: {
		...CardSurface,
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.md,
		borderRadius: Radius.md,
		paddingHorizontal: Spacing.lg,
		paddingVertical: SpacingV.md,
		marginBottom: Layout.itemGap,
	},
	cardBody: { flex: 1, gap: SpacingV.xs },
	// 태블릿 다열 — AdaptiveGrid 와 같은 방식(셀 좌우 패딩 = 세로 간격)이라 아래 사진 출처 그리드와 열이 맞는다
	colWrap: { marginHorizontal: -Layout.itemGap / 2 },
	cell: { width: `${100 / COLS}%`, paddingHorizontal: Layout.itemGap / 2 },
	libName: { fontSize: Typography.body, fontWeight: '700', color: Colors.text },
	metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	licenseChip: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: SpacingV.xxs,
		borderRadius: Radius.sm,
		backgroundColor: Colors.surfaceAlt,
	},
	licenseText: { fontSize: Typography.caption, fontWeight: '700', color: Colors.textSecondary },
	version: { fontSize: Typography.caption, color: Colors.textMuted },
	creditHead: { marginTop: Layout.sectionGap, marginBottom: Layout.itemGap, gap: SpacingV.xs },
	creditSub: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: Typography.caption * 1.5 },
	creditArtist: { flexShrink: 1 },
	footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Layout.sectionGap },
	footer: { flexShrink: 1, fontSize: Typography.body, color: Colors.textMuted, textAlign: 'center' },
}));
