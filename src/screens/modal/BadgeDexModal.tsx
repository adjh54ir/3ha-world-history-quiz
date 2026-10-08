import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Keyboard } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import BottomSheet from '@/src/screens/common/atomic/BottomSheet';
import Tag from '@/src/screens/common/atomic/Tag';
import Colors, { BRAND_GRADIENT, withAlpha, isDark, readableOn } from '@/src/const/ConstColors';
import { BODY_FONTS, Spacing, SpacingV, Radius, Typography, Border, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import { AchievementStatus } from '@/src/services/AchievementService';
import { AchievementRarity, RARITY_META, RARITY_ORDER } from '@/src/const/ConstAchievements';
import DateUtils from '@/src/utils/DateUtils';
import { themed } from '@/src/utils/ThemedStyles';

/** 희귀도 필터 (전체 → 일반 → 희귀 → 영웅 → 전설) — '전체' 라벨은 렌더 시점에 번역한다 */
const DEX_FILTERS: ('all' | AchievementRarity)[] = ['all', ...RARITY_ORDER];

interface Props {
	visible: boolean;
	/** 미획득 포함 전체 뱃지 */
	badges: AchievementStatus[];
	/** 획득한 뱃지 수 */
	unlockedCount: number;
	onClose: () => void;
	/** 행을 누르면 상세 팝업으로 */
	onSelect: (badge: AchievementStatus) => void;
}

/**
 * 뱃지 도감 — 미획득 포함 전체 뱃지를 희귀도 그룹 + 필터로 보여준다.
 */
const BadgeDexModal: React.FC<Props> = ({ visible, badges, unlockedCount, onClose, onSelect }) => {
	const { t } = useTranslation();
	const [filter, setFilter] = useState<'all' | AchievementRarity>('all');
	// 40개가 넘어 스크롤이 길다 — 이름·설명 검색과 '미획득만' 보기를 함께 제공
	const [query, setQuery] = useState('');
	const [onlyLocked, setOnlyLocked] = useState(false);
	const pct = badges.length ? Math.round((unlockedCount / badges.length) * 100) : 0;

	// 검색어·미획득 조건을 먼저 적용한 목록 (희귀도 필터 개수도 이 목록 기준)
	const searched = useMemo(() => {
		const q = query.trim().toLowerCase();
		return badges.filter((b) => {
			if (onlyLocked && b.unlocked) return false;
			if (!q) return true;
			return `${b.def.title} ${b.def.desc} ${b.def.cond}`.toLowerCase().includes(q);
		});
	}, [badges, query, onlyLocked]);

	// 등급별 획득 진행도 — 검색·필터와 무관하게 '전체' 기준이어야 수집률로 읽힌다
	const rarityProgress = useMemo(() => {
		const acc: Record<string, { done: number; total: number }> = {};
		badges.forEach((b) => {
			const r = (acc[b.def.rarity] ??= { done: 0, total: 0 });
			r.total += 1;
			if (b.unlocked) r.done += 1;
		});
		return acc;
	}, [badges]);

	// 희귀도(일반→전설) 그룹 — 위 필터 탭과 같은 순서. 필터가 걸리면 해당 그룹만.
	const groups = useMemo(
		() =>
			RARITY_ORDER
				.filter((r) => filter === 'all' || filter === r)
				.map((rarity) => ({ rarity, items: searched.filter((b) => b.def.rarity === rarity) }))
				.filter((g) => g.items.length > 0),
		[searched, filter],
	);

	return (
		<BottomSheet visible={visible} onClose={onClose}>
			<View style={styles.titleRow}>
				<Text style={styles.title}>{t('modal.badgeDex.title')}</Text>
				<TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={Layout.hitSlop} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('modal.badgeDex.closeA11y')}>
					<IconComponent type="materialIcons" name="close" size={scaledSize(24)} color={Colors.textMuted} />
				</TouchableOpacity>
			</View>

			{/* 수집 현황 히어로 — 수집률을 크게 보여줘 모으는 재미를 준다 */}
			<View style={styles.hero}>
				<LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
				<View pointerEvents="none" style={styles.heroWatermark}>
					<IconComponent type="materialIcons" name="military-tech" size={scaledSize(104)} color={Colors.onBrandWatermark} />
				</View>
				<View style={styles.heroTop}>
					<View style={styles.heroPctWrap}>
						<Text style={styles.heroPct}>{pct}</Text>
						<Text style={styles.heroPctUnit}>%</Text>
					</View>
					<View style={styles.heroCopy}>
						<Text style={styles.heroLabel}>{t('modal.badgeDex.rateLabel')}</Text>
						<Text style={styles.heroCount}>
							{unlockedCount}
							<Text style={styles.heroCountTotal}>{t('modal.badgeDex.countTotal', { total: badges.length })}</Text>
						</Text>
					</View>
				</View>
				<View style={styles.heroTrack}>
					<View style={[styles.heroFill, { width: `${pct}%` }]} />
				</View>
				<View style={styles.heroFootRow}>
					<IconComponent type="materialIcons" name={pct >= 100 ? 'celebration' : 'auto-awesome'} size={scaledSize(13)} color={Colors.goldSoft} />
					<Text style={styles.heroFoot}>
						{pct >= 100 ? t('modal.badgeDex.complete') : t('modal.badgeDex.remaining', { count: badges.length - unlockedCount })}
					</Text>
				</View>
			</View>

			{/* 검색 + 미획득만 보기 */}
			<View style={styles.searchRow}>
				<View style={styles.searchBox}>
					<IconComponent type="materialIcons" name="search" size={scaledSize(18)} color={Colors.textMuted} />
					<TextInput
						keyboardAppearance={isDark() ? 'dark' : 'light'}
						style={styles.searchInput}
						value={query}
						onChangeText={setQuery}
						placeholder={t('modal.badgeDex.searchPlaceholder')}
						placeholderTextColor={Colors.textMuted}
						returnKeyType="search"
						onSubmitEditing={() => Keyboard.dismiss()}
					/>
					{query.length > 0 && (
						<TouchableOpacity onPress={() => { Keyboard.dismiss(); setQuery(''); }} hitSlop={Layout.hitSlop} accessibilityRole="button" accessibilityLabel={t('modal.badgeDex.clearSearch')}>
							<IconComponent type="materialIcons" name="cancel" size={scaledSize(16)} color={Colors.textMuted} />
						</TouchableOpacity>
					)}
				</View>
				<TouchableOpacity
					style={[styles.lockedChip, onlyLocked && styles.lockedChipOn]}
					hitSlop={Layout.hitSlop}
					activeOpacity={0.85}
					accessibilityRole="button"
					accessibilityState={{ selected: onlyLocked }}
					onPress={() => setOnlyLocked((v) => !v)}>
					<IconComponent type="materialIcons" name={onlyLocked ? 'lock' : 'lock-open'} size={scaledSize(15)} color={onlyLocked ? Colors.onFill : Colors.textSecondary} />
					<Text style={[styles.lockedChipText, onlyLocked && styles.lockedChipTextOn]}>{t('modal.badgeDex.onlyLocked')}</Text>
				</TouchableOpacity>
			</View>

			{/* 희귀도 필터 — 뱃지가 많아 스크롤만 길어지지 않도록 */}
			<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterRow}>
				{DEX_FILTERS.map((key) => {
					const on = filter === key;
					const count = key === 'all' ? searched.length : searched.filter((b) => b.def.rarity === key).length;
					const tint = key === 'all' ? Colors.primary : RARITY_META[key].color;
					const label = key === 'all' ? t('common.all') : RARITY_META[key].label;
					return (
						<TouchableOpacity
							key={key}
							style={[styles.filterChip, on && { backgroundColor: tint, borderColor: tint }]}
							hitSlop={Layout.hitSlop}
							activeOpacity={0.85}
							accessibilityRole="button"
							accessibilityState={{ selected: on }}
							onPress={() => setFilter(key)}>
							<Text style={[styles.filterText, on ? { color: readableOn(tint) } : { color: tint }]}>{label} {count}</Text>
						</TouchableOpacity>
					);
				})}
			</ScrollView>

			<ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
				{groups.length === 0 && (
					<Text style={styles.emptyText}>{t(onlyLocked ? 'modal.badgeDex.emptyLocked' : 'modal.badgeDex.emptySearch')}</Text>
				)}
				{groups.map((g) => (
					<View key={g.rarity} style={styles.group}>
						{(() => {
							const prog = rarityProgress[g.rarity] ?? { done: 0, total: 0 };
							const rate = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;
							const rc = RARITY_META[g.rarity].color;
							return (
								<>
									<View style={styles.groupHead}>
										<View style={[styles.groupDot, { backgroundColor: rc }]} />
										<Text style={[styles.groupTitle, { color: rc }]} numberOfLines={1} ellipsizeMode="tail">{RARITY_META[g.rarity].label}</Text>
										<Text style={styles.groupCount}>{prog.done}/{prog.total} · {rate}%</Text>
									</View>
									{/* 등급별 획득 진행도 */}
									<View style={styles.groupTrack}>
										<View style={[styles.groupFill, { width: `${rate}%`, backgroundColor: rc }]} />
									</View>
								</>
							);
						})()}
						<View style={styles.list}>
							{g.items.map((b) => (
								<TouchableOpacity
									key={b.def.id}
									style={[
										styles.row,
										b.unlocked
											? { backgroundColor: withAlpha(RARITY_META[b.def.rarity].color, '12'), borderColor: withAlpha(RARITY_META[b.def.rarity].color, '4D') }
											: styles.rowLocked,
									]}
									activeOpacity={0.85}
									accessibilityRole="button"
									accessibilityLabel={t('modal.badgeDex.rowA11y', { title: b.def.title })}
									onPress={() => onSelect(b)}>
									<View
										style={[
											styles.rowIcon,
											b.unlocked
												? { backgroundColor: withAlpha(b.def.color, '26'), borderColor: RARITY_META[b.def.rarity].color, borderWidth: Border.thick }
												: { backgroundColor: Colors.surface, borderColor: Colors.border },
										]}>
										<IconComponent type="materialIcons" name={b.unlocked ? b.def.icon : 'lock'} size={scaledSize(24)} color={b.unlocked ? b.def.color : Colors.textMuted} />
										{b.unlocked && (
											<View style={[styles.rowIconSpark, { backgroundColor: RARITY_META[b.def.rarity].color }]}>
												<IconComponent type="materialIcons" name="check" size={scaledSize(10)} color={readableOn(RARITY_META[b.def.rarity].color)} />
											</View>
										)}
									</View>
									<View style={styles.rowBody}>
										<View style={styles.rowTitleRow}>
											<Text style={[styles.rowTitle, !b.unlocked && { color: Colors.textSecondary }]} numberOfLines={1}>{b.def.title}</Text>
											<Tag
												label={RARITY_META[b.def.rarity].label}
												color={RARITY_META[b.def.rarity].color}
												variant={b.unlocked ? 'solid' : 'plain'}
											/>
										</View>
										<Text style={styles.rowDesc} numberOfLines={2}>{b.def.desc}</Text>
										{b.unlocked ? (
											!!b.unlockedAt && (
												<View style={styles.rowDateRow}>
													<IconComponent type="materialIcons" name="event-available" size={scaledSize(12)} color={Colors.textMuted} />
													<Text style={styles.rowDate}>{t('modal.badgeDetail.unlockedAt', { date: DateUtils.formatTimestamp(b.unlockedAt, 'type3') })}</Text>
												</View>
											)
										) : (
											<View style={styles.progressRow}>
												<View style={styles.progressTrack}>
													<View style={[styles.progressFill, { width: `${Math.round(b.ratio * 100)}%` }]} />
												</View>
												<Text style={styles.progressText}>{b.current}/{b.def.target}</Text>
											</View>
										)}
									</View>
									<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(20)} color={Colors.textMuted} />
								</TouchableOpacity>
							))}
						</View>
					</View>
				))}
			</ScrollView>
		</BottomSheet>
	);
};

export default BadgeDexModal;

const styles = themed(() => StyleSheet.create({
	titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
	title: { flex: 1, fontSize: Typography.h3, fontWeight: '900', color: Colors.textStrong },
	closeBtn: { width: Layout.touch, height: Layout.touch, alignItems: 'center', justifyContent: 'center' },
	// 수집 현황 히어로
	hero: { marginTop: SpacingV.md, borderRadius: Radius.xl, overflow: 'hidden', paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.lg },
	heroWatermark: { position: 'absolute', right: -scaleWidth(16), bottom: -scaleHeight(20), opacity: 0.9 },
	heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
	heroPctWrap: { flexDirection: 'row', alignItems: 'flex-end' },
	heroPct: { fontSize: Typography.displayLg, fontWeight: '900', color: Colors.textInverse, lineHeight: scaleHeight(48) },
	heroPctUnit: { fontSize: Typography.title, fontWeight: '900', color: Colors.onBrandText, marginBottom: scaleHeight(6), marginLeft: Spacing.xxs },
	heroCopy: { flex: 1 },
	heroLabel: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.onBrandTextSoft },
	heroCount: { fontSize: Typography.h3, fontWeight: '900', color: Colors.textInverse, marginTop: SpacingV.xxs },
	heroCountTotal: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.onBrandText },
	heroTrack: { height: scaleHeight(8), borderRadius: scaleHeight(4), backgroundColor: Colors.onBrandBorderSoft, overflow: 'hidden', marginTop: SpacingV.md },
	heroFill: { height: '100%', borderRadius: scaleHeight(4), backgroundColor: Colors.goldSoft },
	heroFootRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: SpacingV.sm },
	heroFoot: { flex: 1, fontSize: Typography.footnote, fontWeight: '700', color: Colors.onBrandText },
	// 목록과 겹치지 않도록 아래 여백 확보(칩 높이 + 간격)
	filterBar: { flexGrow: 0, flexShrink: 0, marginHorizontal: -Layout.screenH, marginTop: SpacingV.md, marginBottom: SpacingV.md },
	filterRow: { alignItems: 'center', paddingHorizontal: Layout.screenH, paddingVertical: SpacingV.xs, gap: Spacing.sm },
	filterChip: { minHeight: scaleHeight(36), justifyContent: 'center', paddingHorizontal: Spacing.md, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
	filterText: { fontSize: Typography.footnote, fontWeight: '800' },
	// 히어로→검색→필터→목록 간격을 같은 리듬(≈16)으로 — 필터 줄 marginTop(md) + 내부 paddingVertical(xs)
	searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: SpacingV.lg },
	searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm },
	searchInput: { flex: 1, fontSize: Typography.body, fontFamily: BODY_FONTS.bold, color: Colors.textStrong, paddingVertical: 0 },
	lockedChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm },
	lockedChipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
	lockedChipText: { fontSize: Typography.micro, fontWeight: '800', color: Colors.textSecondary },
	lockedChipTextOn: { color: Colors.onFill },
	emptyText: { fontSize: Typography.body, fontWeight: '700', color: Colors.textMuted, textAlign: 'center', paddingVertical: SpacingV.xxl },
	scroll: { flexGrow: 0, flexShrink: 1 },
	group: { marginBottom: SpacingV.lg },
	groupHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: SpacingV.sm },
	groupDot: { width: scaleWidth(8), height: scaleWidth(8), borderRadius: Radius.pill },
	groupTitle: { flex: 1, fontSize: Typography.footnote, fontWeight: '900' },
	groupCount: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textMuted },
	groupTrack: { height: scaleHeight(5), borderRadius: scaleWidth(3), backgroundColor: Colors.surfaceAlt, overflow: 'hidden', marginBottom: SpacingV.sm },
	groupFill: { height: '100%', borderRadius: scaleWidth(3) },
	list: { gap: SpacingV.sm, paddingBottom: SpacingV.sm },
	row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, borderWidth: 1, borderColor: 'transparent', paddingLeft: Spacing.lg, paddingRight: Spacing.md, paddingVertical: SpacingV.md, overflow: 'hidden' },
	rowLocked: { backgroundColor: Colors.surface, borderColor: Colors.border },
	// 왼쪽 희귀도 띠 — 획득한 뱃지만
	rowIcon: { width: scaleWidth(46), height: scaleWidth(46), borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
	rowIconSpark: { position: 'absolute', right: -scaleWidth(3), bottom: -scaleHeight(3), width: scaleWidth(16), height: scaleWidth(16), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surface },
	rowBody: { flex: 1 },
	rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	rowTitle: { flexShrink: 1, fontSize: Typography.callout, fontWeight: '900', color: Colors.textStrong },
	rowDesc: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xxs, lineHeight: scaleHeight(18) },
	rowDateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: SpacingV.xs },
	rowDate: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textMuted },
	progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: SpacingV.sm },
	progressTrack: { flex: 1, height: scaleHeight(5), borderRadius: scaleHeight(3), backgroundColor: Colors.surfaceAlt, overflow: 'hidden' },
	progressFill: { height: '100%', borderRadius: scaleHeight(3), backgroundColor: Colors.primary },
	progressText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textMuted },
}));
