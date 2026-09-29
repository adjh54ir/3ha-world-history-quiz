/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import withRemountOnFocus from '@/src/screens/common/withRemountOnFocus';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ScrollView, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import DomainIcon from '@/src/screens/common/atomic/DomainIcon';
import FilterOptionSheet from '@/src/screens/common/atomic/filter-option-sheet';
import Colors, { isDark } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth, isTablet, scaleArt} from '@/src/utils';
import LearnHubService from '@/src/services/LearnHubService';
import { LearnType } from '@/src/types/data/LearnType';
import { stringParam } from '@/src/navigation/expoRouterUtils';
import { categoryIcon, compareDifficultyLabels, difficultyIcon } from '@/src/const/ConstQuizMeta';
import EmptyState from '@/src/screens/common/atomic/EmptyState';
import DetailSheet from '@/src/screens/modal/DetailSheet';
import Skeleton from '@/src/screens/common/atomic/Skeleton';
import LearnProgressService from '@/src/services/LearnProgressService';
import { playPop } from '@/src/utils/SoundUtils';
import CharacterGuide, { useCharacterGuideOnce, CharacterGuideButton } from '@/src/screens/common/CharacterGuide';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import LearnItemCard from '@/src/screens/common/LearnItemCard';
import { useToast } from '@/src/context/ToastContext';
import { TAB_ILLUSTRATIONS } from '@/src/const/ConstTabIllustrationAssets';
import { Image as ExpoImage } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showConfirm } from '@/src/screens/common/modal/ConfirmModal';
import { themed } from '@/src/utils/ThemedStyles';

const ALL = 'all';
const RECENT_KEY = 'SEARCH_RECENT_QUERIES';
/** 마지막으로 쓰던 주제·카테고리·난이도 필터 */
const RECENT_CAP = 8;

/**
 * 검색 탭 (통합 검색 + 상세 필터)
 * - 검색어가 없으면 선택 주제의 전체 데이터를 노출(브라우즈 겸용), 대량 데이터는 FlatList 가상화
 * - 주제 선택 시 카테고리/난이도 드롭다운으로 상세 검색
 * - 목록 카드: 주제·카테고리·난이도 태그를 제목 위
 */
const SearchTab = () => {
	const { showToast } = useToast();
	const params = useLocalSearchParams();
	// scope/domain(둘러보기 진입) → category 순으로 초기 주제 필터 결정
	const initial = stringParam(params.scope ?? params.domain ?? params.category, ALL);
	const initialQuery = stringParam(params.q, '');
	const [scope, setScope] = useState<string>(LearnHubService.isValidCategory(initial) ? initial : ALL);
	const [query, setQuery] = useState(initialQuery);
	const [debounced, setDebounced] = useState('');
	const [detail, setDetail] = useState<LearnType.StudyCard | null>(null);
	const [cat, setCat] = useState<string>(ALL);
	const [lvl, setLvl] = useState<string>(ALL);
	const [picker, setPicker] = useState<'scope' | 'cat' | 'lvl' | null>(null);
	const openPicker = (next: 'scope' | 'cat' | 'lvl') => {
		Keyboard.dismiss();
		setPicker(next);
	};
	const listRef = useRef<any>(null);
	useScrollToTop(listRef);

	// 최근 검색어 (최신순, 최대 RECENT_CAP개)
	const [recent, setRecent] = useState<string[]>([]);
	useEffect(() => {
		AsyncStorage.getItem(RECENT_KEY).then((raw) => {
			if (!raw) return;
			try {
				const list = JSON.parse(raw);
				if (Array.isArray(list)) setRecent(list.filter((v) => typeof v === 'string'));
			} catch {
				/* noop */
			}
		});
	}, []);
	const pushRecent = useCallback((raw: string) => {
		const term = raw.trim();
		if (term.length < 1) return;
		setRecent((prev) => {
			const next = [term, ...prev.filter((v) => v !== term)].slice(0, RECENT_CAP);
			AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
			return next;
		});
	}, []);
	/** 최근 검색어 전체 삭제 — 되돌릴 수 없으므로 확인을 받는다 */
	const clearRecent = useCallback(async () => {
		const ok = await showConfirm({ title: '최근 검색어 삭제', message: '저장된 최근 검색어를 모두 지울까요?', confirmText: '삭제', cancelText: '취소', destructive: true, icon: 'delete-sweep' });
		if (!ok) return;
		setRecent([]);
		AsyncStorage.removeItem(RECENT_KEY).catch(() => {});
		showToast('최근 검색어를 지웠어요', 'delete-sweep');
	}, [showToast]);
	const removeRecent = useCallback((term: string) => {
		setRecent((prev) => {
			const next = prev.filter((v) => v !== term);
			AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
			return next;
		});
	}, []);

	// 첫 페인트 이후 무거운 목록 생성을 지연 → 진입 즉시 스켈레톤부터 보여 체감 로딩 개선
	const [ready, setReady] = useState(false);
	useEffect(() => {
		const id = requestAnimationFrame(() => setReady(true));
		return () => cancelAnimationFrame(id);
	}, []);

	// 즐겨찾기 별 상태 (목록 카드용)
	const [bmUids, setBmUids] = useState<Set<string>>(new Set());
	const reloadBookmarks = useCallback(() => {
		LearnProgressService.getBookmarks().then((bm) => setBmUids(new Set(bm.map((b) => b.uid))));
	}, []);
	// 탭에 들어올 때마다 '전체' 필터로 초기화한다 (다른 화면에서 주제·검색어를 지정해 들어온 경우는 제외)
	useFocusEffect(
		useCallback(() => {
			setPicker(null);
			setDetail(null);
			if (!LearnHubService.isValidCategory(initial) && !initialQuery) {
				setQuery('');
				setDebounced('');
				setScope(ALL);
				setCat(ALL);
				setLvl(ALL);
				listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
			}
			reloadBookmarks();
			// 탭을 벗어날 때 진입 파라미터를 비운다 — 남겨두면 다음 진입마다 옛 검색어·주제가 되살아난다.
			// (화면이 떠 있는 동안 지우면 이 이펙트가 즉시 재실행되며 방금 적용한 필터를 되돌린다)
			return () => {
				if (initial === ALL && !initialQuery) return;
				router.setParams({ q: undefined, scope: undefined, domain: undefined, category: undefined } as never);
			};
		}, [reloadBookmarks, initial, initialQuery]),
	);
	// 다른 화면에서 검색어·주제를 지정해 진입한 경우에만 초기화
	const entryParams = useRef(`${initial}|${initialQuery}`);
	useEffect(() => {
		const next = `${initial}|${initialQuery}`;
		if (entryParams.current === next) return;
		entryParams.current = next;
		setQuery(initialQuery);
		setDebounced('');
		setScope(LearnHubService.isValidCategory(initial) ? initial : ALL);
		setCat(ALL);
		setLvl(ALL);
		setPicker(null);
		setDetail(null);
		listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
	}, [initial, initialQuery]);
	const toggleBookmark = async (c: LearnType.StudyCard) => {
		Keyboard.dismiss();
		const now = await LearnProgressService.toggleBookmark({
			uid: c.uid,
			domain: c.domain,
			domainTitle: LearnHubService.getDomainTitle(c.domain),
			title: c.title,
			subTitle: c.subTitle,
			meaning: c.meaning || c.description || c.title,
		});
		reloadBookmarks();
		playPop();
		showToast(now ? '즐겨찾기에 저장했어요' : '즐겨찾기를 해제했어요', now ? 'star' : 'star-border');
	};

	// 입력 디바운스(200ms)
	useEffect(() => {
		const t = setTimeout(() => setDebounced(query), 200);
		return () => clearTimeout(t);
	}, [query]);

	// 주제 변경 시 상세 필터 초기화
	useEffect(() => {
		setCat(ALL);
		setLvl(ALL);
	}, [scope]);

	// 주제 모달 필터 — 메인 주제 + 서브 퀴즈 주제를 한 목록에서 고른다
	const searchDomains = useMemo(() => LearnHubService.getSearchDomainList(), []);
	const scopeOptions = useMemo(() => searchDomains.map((d) => d.title), [searchDomains]);
	const scopeKeyByTitle = useMemo(() => new Map(searchDomains.map((d) => [d.title, d.key])), [searchDomains]);
	const scopeAccent = scope === ALL ? Colors.primary : LearnHubService.getDomain(scope).meta.color;
	const scopeCards = useMemo(() => (scope === ALL ? [] : LearnHubService.getDomain(scope).getStudyCards()), [scope]);
	const categories = useMemo(() => (scope === ALL ? [] : LearnHubService.getDomain(scope).selectCategoryList()), [scope]);
	const levels = useMemo(() => [...new Set(scopeCards.map((c) => c.levelLabel).filter(Boolean) as string[])].sort(compareDifficultyLabels), [scopeCards]);

	// 검색 + 상세 필터 결과
	const data = useMemo<LearnType.StudyCard[]>(() => {
		if (!ready) return [];
		const q = debounced.trim();
		let base =
			q.length >= 1
				? LearnHubService.searchCards(q, 500, scope === ALL ? undefined : scope, true)
				: scope === ALL
					? LearnHubService.getAllStudyCards(true)
					: LearnHubService.getDomain(scope).getStudyCards();
		if (scope !== ALL) {
			if (cat !== ALL) base = base.filter((c) => c.categoryLabel === cat);
			if (lvl !== ALL) base = base.filter((c) => c.levelLabel === lvl);
		}
		return base;
	}, [debounced, scope, cat, lvl, ready]);

	// 검색 사용법 안내 — 처음 들어온 사용자에게만 1회
	const guide = useCharacterGuideOnce('search');
	const scopeLabel = scope === ALL ? '전 주제' : LearnHubService.getDomainTitle(scope);
	// 검색어·주제·상세 필터 중 하나라도 걸리면 초기화 노출
	const canReset = query.length > 0 || scope !== ALL || cat !== ALL || lvl !== ALL;
	const resetFilters = () => {
		Keyboard.dismiss();
		setQuery('');
		setScope(ALL);
		setCat(ALL);
		setLvl(ALL);
	};
	const isSearching = debounced.trim().length >= 1;
	const showDetailFilter = scope !== ALL && (categories.length > 0 || levels.length > 1);

	const renderItem = ({ item: c, index }: { item: LearnType.StudyCard; index: number }) => {
		const meta = LearnHubService.getDomain(c.domain).meta;
		// 카테고리와 subTitle 이 겹치면(부분 포함 포함) 부제를 숨긴다
		const catLabel = c.categoryLabel ?? '';
		const subDup = !!c.subTitle && (c.subTitle === catLabel || c.subTitle.includes(catLabel) || catLabel.includes(c.subTitle));
		const showSub = !!c.subTitle && !subDup && c.subTitle !== meta.title;
		return (
			// 첫 화면에 보이는 카드만 스태거(320ms 상한) — 스크롤 중 지연 체감 방지
			<FadeInUp delay={Math.min(index * 40, 320)} duration={340} distance={12} style={isTablet ? styles.gridCell : undefined}>
			<LearnItemCard
				domain={c.domain}
				categoryLabel={c.categoryLabel}
				levelLabel={c.levelLabel}
				title={c.title}
				subTitle={c.subTitle}
				subLine={showSub ? c.subTitle : undefined}
				explanation={c.meaning}
				examples={c.examples}
				bookmarked={bmUids.has(c.uid)}
				onToggleBookmark={() => toggleBookmark(c)}
				onPress={() => { Keyboard.dismiss(); setDetail(c); }}
				highlight={isSearching ? debounced.trim() : undefined}
			/>
			</FadeInUp>
		);
	};

	// 안드로이드는 액티비티가 adjustResize 라 KeyboardAvoidingView 로 다시 밀면 이중 축소된다
	return (
		<KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
			{/* 검색 입력 (타이틀/구분선 없음) */}
			<View style={styles.header}>
				<View style={styles.searchBox}>
					<IconComponent type="materialIcons" name="search" size={scaledSize(20)} color={Colors.textMuted} />
					<TextInput
						keyboardAppearance={isDark() ? 'dark' : 'light'}
						style={styles.input}
						value={query}
						onChangeText={setQuery}
						placeholder={`${scopeLabel}에서 검색`}
						placeholderTextColor={Colors.textMuted}
						returnKeyType="search"
						onSubmitEditing={() => {
							Keyboard.dismiss();
							pushRecent(query);
						}}
					/>
					{query.length > 0 && (
						<TouchableOpacity activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="검색어 지우기" onPress={() => { Keyboard.dismiss(); setQuery(''); }} hitSlop={8}>
							<IconComponent type="materialIcons" name="cancel" size={scaledSize(18)} color={Colors.textMuted} />
						</TouchableOpacity>
					)}
				</View>
				<CharacterGuideButton onPress={guide.open} />
				<ExpoImage source={TAB_ILLUSTRATIONS.search} style={styles.headerIllustration} contentFit="contain" />
			</View>

			{/* 최근 검색어 — 입력 중이 아닐 때만 (탭하면 바로 재검색) */}
			{!isSearching && recent.length > 0 && (
				<View style={styles.recentWrap}>
					<View style={styles.recentHead}>
						<Text style={styles.recentTitle}>최근 검색어</Text>
						<TouchableOpacity hitSlop={Layout.hitSlop} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="최근 검색어 전체 삭제" onPress={clearRecent}>
							<Text style={styles.recentClear}>전체 삭제</Text>
						</TouchableOpacity>
					</View>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow} keyboardShouldPersistTaps="handled">
						{recent.map((term) => (
							<View key={term} style={styles.recentChip}>
								<TouchableOpacity activeOpacity={0.8} onPress={() => { setQuery(term); pushRecent(term); Keyboard.dismiss(); }}>
									<Text style={styles.recentChipText} numberOfLines={1}>{term}</Text>
								</TouchableOpacity>
								<TouchableOpacity hitSlop={6} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${term} 검색어 삭제`} onPress={() => removeRecent(term)}>
									<IconComponent type="materialIcons" name="close" size={scaledSize(13)} color={Colors.textMuted} />
								</TouchableOpacity>
							</View>
						))}
					</ScrollView>
				</View>
			)}

			{/* 필터 (주제 · 카테고리 · 난이도) — 모두 모달로 고른다 */}
			<View style={styles.dropRow}>
					<TouchableOpacity accessibilityRole="button" accessibilityLabel={`주제 선택, 현재 ${scopeLabel}`} style={styles.dropBtn} activeOpacity={0.85} onPress={() => openPicker('scope')}>
						<Text style={styles.dropLabel}>주제</Text>
						<View style={styles.dropValueRow}>
							{scope !== ALL && (
								<DomainIcon
									mainIcon={LearnHubService.getDomain(scope).meta.mainIcon}
									icon={LearnHubService.getDomain(scope).meta.icon}
									iconType={LearnHubService.getDomain(scope).meta.iconType}
									size={scaledSize(14)}
									color={scopeAccent}
								/>
							)}
							<Text style={[styles.dropValue, scope !== ALL && { color: scopeAccent }]} numberOfLines={1} ellipsizeMode="tail">{scope === ALL ? '전체' : scopeLabel}</Text>
							<IconComponent type="materialIcons" name="expand-more" size={scaledSize(18)} color={Colors.textMuted} />
						</View>
					</TouchableOpacity>
					{showDetailFilter && categories.length > 0 && (
						<TouchableOpacity accessibilityRole="button" accessibilityLabel={`카테고리 선택, 현재 ${cat === ALL ? '전체' : cat}`} style={styles.dropBtn} activeOpacity={0.85} onPress={() => openPicker('cat')}>
							<Text style={styles.dropLabel}>카테고리</Text>
							<View style={styles.dropValueRow}>
								{cat !== ALL && <IconComponent type="materialIcons" name={categoryIcon(cat)} size={scaledSize(14)} color={scopeAccent} />}
								<Text style={[styles.dropValue, cat !== ALL && { color: scopeAccent }]} numberOfLines={1} ellipsizeMode="tail">{cat === ALL ? '전체' : cat}</Text>
								<IconComponent type="materialIcons" name="expand-more" size={scaledSize(18)} color={Colors.textMuted} />
							</View>
						</TouchableOpacity>
					)}
					{showDetailFilter && levels.length > 1 && (
						<TouchableOpacity accessibilityRole="button" accessibilityLabel={`난이도 선택, 현재 ${lvl === ALL ? '전체' : lvl}`} style={styles.dropBtn} activeOpacity={0.85} onPress={() => openPicker('lvl')}>
							<Text style={styles.dropLabel}>난이도</Text>
							<View style={styles.dropValueRow}>
								{lvl !== ALL && <IconComponent type="materialIcons" name={difficultyIcon(lvl)} size={scaledSize(14)} color={scopeAccent} />}
								<Text style={[styles.dropValue, lvl !== ALL && { color: scopeAccent }]} numberOfLines={1} ellipsizeMode="tail">{lvl === ALL ? '전체' : lvl}</Text>
								<IconComponent type="materialIcons" name="expand-more" size={scaledSize(18)} color={Colors.textMuted} />
							</View>
						</TouchableOpacity>
					)}
			</View>

			<View style={styles.countBar}>
				<Text style={styles.countScope} numberOfLines={1} ellipsizeMode="tail">{isSearching ? `'${query}' 검색 결과` : scopeLabel}</Text>
				<View style={styles.countRight}>
					{/* 검색어·주제·필터 중 하나라도 걸려 있으면 초기화 버튼 노출 */}
					{canReset && (
						<TouchableOpacity accessibilityRole="button" accessibilityLabel="검색 조건 초기화" style={styles.resetBtn} activeOpacity={0.8} onPress={resetFilters}>
							<IconComponent type="materialIcons" name="refresh" size={scaledSize(14)} color={Colors.textSecondary} />
							<Text style={styles.resetText}>초기화</Text>
						</TouchableOpacity>
					)}
					<View style={styles.countBadge}>
						<IconComponent type="materialIcons" name="format-list-bulleted" size={scaledSize(13)} color={scopeAccent} />
						<Text style={[styles.countNum, { color: scopeAccent }]}>{data.length.toLocaleString()}</Text>
						<Text style={styles.countUnit}>개</Text>
					</View>
				</View>
			</View>

			{/* 태블릿에서만 2단 — 검색 결과 카드는 블록형이라 열을 나눠도 본문이 눌리지 않는다 */}
			<FlatList
				ref={listRef}
				data={data}
				extraData={bmUids}
				keyExtractor={(c) => c.uid}
				renderItem={renderItem}
				numColumns={isTablet ? 2 : 1}
				columnWrapperStyle={isTablet ? styles.gridRow : undefined}
				contentContainerStyle={styles.list}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="on-drag"
				onScrollBeginDrag={Keyboard.dismiss}
				showsVerticalScrollIndicator={false}
				initialNumToRender={12}
				windowSize={7}
				removeClippedSubviews
				ListEmptyComponent={
						!ready ? (
							<View>
								{[0, 1, 2, 3, 4].map((i) => (
									<View key={i} style={styles.skeletonCard}>
										<Skeleton width={'35%'} height={scaleHeight(16)} radius={Radius.md} />
										<Skeleton width={'60%'} height={scaleHeight(20)} radius={Radius.sm} style={{ marginTop: SpacingV.sm }} />
										<Skeleton width={'100%'} height={scaleHeight(18)} radius={Radius.sm} style={{ marginTop: SpacingV.sm }} />
									</View>
								))}
							</View>
						) : (
							<EmptyState
								illustration="noResults"
								icon="sentiment-dissatisfied"
								text={isSearching ? `'${query}' 검색 결과가 없어요.` : '조건에 맞는 항목이 없어요.'}
							/>
						)
					}
			/>

			<DetailSheet
				visible={!!detail}
				accent={detail ? LearnHubService.getDomain(detail.domain).meta.color : Colors.primary}
				onClose={() => { setDetail(null); reloadBookmarks(); }}
				onBookmarkChange={() => reloadBookmarks()}
				item={
					detail
						? {
								domain: detail.domain,
								uid: detail.uid,
								domainTitle: LearnHubService.getDomainTitle(detail.domain),
								categoryLabel: detail.categoryLabel,
								levelLabel: detail.levelLabel,
								title: detail.title,
								subTitle: detail.subTitle,
								meaning: detail.meaning,
								description: detail.description,
								examples: detail.examples,
								tags: detail.tags,
								options: detail.options,
								// 보기가 있을 때만 정답(=표제)을 넘겨 정답 강조 동작
								answer: detail.options && detail.options.length >= 2 ? detail.title : undefined,
								infoRows: detail.infoRows,
								imageRef: detail.imageRef,
							}
						: null
				}
			/>

			<FilterOptionSheet
				visible={picker !== null}
				title={picker === 'lvl' ? '난이도 선택' : picker === 'scope' ? '주제 선택' : '카테고리 선택'}
				kind={picker === 'lvl' ? 'difficulty' : 'category'}
				options={picker === 'lvl' ? levels : picker === 'scope' ? scopeOptions : categories}
				value={picker === 'lvl' ? lvl : picker === 'scope' ? (scope === ALL ? ALL : scopeLabel) : cat}
				accent={scopeAccent}
				allValue={ALL}
				allLabel={picker === 'scope' ? '전 주제' : '전체'}
				iconForOption={
					picker === 'scope'
						? (option) => {
								const key = scopeKeyByTitle.get(option);
								if (!key) return null;
								const meta = LearnHubService.getDomain(key).meta;
								return <DomainIcon mainIcon={meta.mainIcon} icon={meta.icon} iconType={meta.iconType} size={scaledSize(17)} color={meta.color} />;
							}
						: undefined
				}
				onClose={() => setPicker(null)}
				onSelect={(option) => {
					Keyboard.dismiss();
					if (picker === 'lvl') setLvl(option);
					else if (picker === 'scope') setScope(option === ALL ? ALL : scopeKeyByTitle.get(option) ?? ALL);
					else setCat(option);
					setPicker(null);
				}}
			/>
			{/* 검색 사용법 안내 — 최초 1회 */}
			<CharacterGuide
				visible={guide.visible}
				onClose={guide.close}
				lines={[
					'궁금한 말이나 뜻을 그대로 검색해 보세요.',
					'주제 필터에서 서브 퀴즈까지 고르면 카테고리·난이도로 더 좁힐 수 있어요.',
					'마음에 드는 항목은 즐겨찾기에 저장해 두면 보관함에서 다시 볼 수 있어요.',
				]}
				title="검색, 이렇게 써요"
			/>
		</KeyboardAvoidingView>
	);
};

export default withRemountOnFocus(SearchTab);

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.background },
	header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Layout.screenH, paddingTop: SpacingV.sm, paddingBottom: SpacingV.sm, backgroundColor: Colors.surface },
	searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.md },
	headerIllustration: { width: scaleArt(68), height: scaleArt(68) },
	input: { flex: 1, fontSize: Typography.callout, color: Colors.textStrong, padding: 0 },
	dropRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Layout.screenH, paddingTop: SpacingV.sm, paddingBottom: SpacingV.md, backgroundColor: Colors.surface },
	dropBtn: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm },
	dropLabel: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textMuted, marginBottom: SpacingV.xs },
	dropValueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
	dropValue: { flex: 1, fontSize: Typography.body, fontWeight: '800', color: Colors.textStrong },
	list: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },
	gridRow: { justifyContent: 'space-between' },
	gridCell: { width: '49%' },
	countBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.screenH, paddingTop: SpacingV.sm, paddingBottom: SpacingV.xs, backgroundColor: Colors.background },
	countScope: { flex: 1, fontSize: Typography.body, fontWeight: '800', color: Colors.textStrong, marginRight: Spacing.md },
	recentWrap: { paddingHorizontal: Layout.screenH, paddingTop: SpacingV.md },
	recentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SpacingV.sm },
	recentTitle: { fontSize: Typography.body, fontWeight: '900', color: Colors.textStrong },
	recentClear: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textMuted },
	recentRow: { flexDirection: 'row', gap: Spacing.xs, paddingRight: Spacing.sm },
	recentChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, maxWidth: scaleWidth(180), minHeight: scaleHeight(36), borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, borderRadius: Radius.pill, paddingLeft: Spacing.lg, paddingRight: Spacing.md, paddingVertical: SpacingV.sm },
	recentChipText: { flexShrink: 1, fontSize: Typography.body, fontWeight: '700', color: Colors.text },
	countRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	resetBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs },
	resetText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary },
	countBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs },
	countNum: { fontSize: Typography.body, fontWeight: '900' },
	countUnit: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary },
	skeletonCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Layout.itemGap, borderWidth: 1, borderColor: Colors.border },
}));
