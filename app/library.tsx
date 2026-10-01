/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';
import CommonHeader from '@/src/screens/common/CommonHeader';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import DomainIcon from '@/src/screens/common/atomic/DomainIcon';
import CategoryScopeChips, { ALL_SCOPE } from '@/src/screens/common/atomic/CategoryScopeChips';
import Colors from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, CardSurface, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import LearnProgressService, { BookmarkItem, WrongItem } from '@/src/services/LearnProgressService';
import LearnHubService from '@/src/services/LearnHubService';
import { categoryIcon, difficultyIcon } from '@/src/const/ConstQuizMeta';
import { stringParam } from '@/src/navigation/expoRouterUtils';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import DetailSheet from '@/src/screens/modal/DetailSheet';
import Skeleton from '@/src/screens/common/atomic/Skeleton';
import { useToast } from '@/src/context/ToastContext';
import { playPop } from '@/src/utils/SoundUtils';
import LearnItemCard, { learnListFields } from '@/src/screens/common/LearnItemCard';
import EmptyState from '@/src/screens/common/atomic/EmptyState';
import AdaptiveGrid from '@/src/screens/common/layout/AdaptiveGrid';
import { showConfirm } from '@/src/screens/common/modal/ConfirmModal';
import { themed } from '@/src/utils/ThemedStyles';
import { useTranslation } from 'react-i18next';
import ScrollTopButton, { useScrollTop } from '@/src/screens/common/atomic/ScrollTopButton';

type Tab = 'bookmark' | 'wrong';

const Library = () => {
	const scrollTop = useScrollTop();
	const { showToast } = useToast();
	const { t } = useTranslation();
	const params = useLocalSearchParams();
	const category = stringParam(params.category, '');
	const initialTab = stringParam(params.tab, 'bookmark');
	const hasFilter = !!category && LearnHubService.isValidCategory(category);

	const [tab, setTab] = useState<Tab>(initialTab === 'wrong' ? 'wrong' : 'bookmark');
	const [allBookmarks, setAllBookmarks] = useState<BookmarkItem[]>([]);
	const [allWrongs, setAllWrongs] = useState<WrongItem[]>([]);
	const [loading, setLoading] = useState(true);
	// 주제별 필터 (검색과 동일한 공용 칩) — 파라미터로 진입 시 해당 주제 선택
	const [scope, setScope] = useState<string>(hasFilter ? category : ALL_SCOPE);
	// 상세 팝업(검색과 동일한 공통 DetailSheet)
	const [detail, setDetail] = useState<WrongItem | null>(null);
	const [bookmarkDetail, setBookmarkDetail] = useState<BookmarkItem | null>(null);

	/** 탭 전환 — 주제 필터와 열린 상세를 초기 상태로 되돌린다 */
	const changeTab = useCallback((next: Tab) => {
		setTab(next);
		setScope(ALL_SCOPE);
		setDetail(null);
		setBookmarkDetail(null);
	}, []);

	// 주제 필터 + 최신순 정렬
	const bookmarks = useMemo(() => {
		const list = scope === ALL_SCOPE ? allBookmarks : allBookmarks.filter((b) => b.domain === scope);
		return [...list].sort((a, b) => b.savedAt - a.savedAt);
	}, [allBookmarks, scope]);
	const wrongs = useMemo(() => {
		const list = scope === ALL_SCOPE ? allWrongs : allWrongs.filter((w) => w.domain === scope);
		return [...list].sort((a, b) => b.addedAt - a.addedAt);
	}, [allWrongs, scope]);
	// 오답 카드의 즐겨찾기 별 상태 판별용
	const bookmarkedUids = useMemo(() => new Set(allBookmarks.map((b) => b.uid)), [allBookmarks]);

	// 원본 카드 조회(캐시된 O(1) 조회) → 검색 상세와 동일한 풍부한 데이터로 팝업 표시
	const findCard = (domain: string, uid: string) => LearnHubService.getStudyCardByUid(domain, uid);
	// 즐겨찾기 상세 아이템(검색과 동일 매핑)
	const bookmarkItem = useMemo(() => {
		if (!bookmarkDetail) return null;
		const c = findCard(bookmarkDetail.domain, bookmarkDetail.uid);
		if (c) {
			return {
				domain: c.domain,
				uid: c.uid,
				domainTitle: LearnHubService.getDomainTitle(c.domain),
				categoryLabel: c.categoryLabel,
				levelLabel: c.levelLabel,
				title: c.title,
				subTitle: c.subTitle,
				meaning: c.meaning,
				description: c.description,
				examples: c.examples,
				tags: c.tags,
				options: c.options,
				answer: c.options && c.options.length >= 2 ? c.title : undefined,
				infoRows: c.infoRows,
			};
		}
		return { domain: bookmarkDetail.domain, uid: bookmarkDetail.uid, domainTitle: bookmarkDetail.domainTitle, title: bookmarkDetail.title, subTitle: bookmarkDetail.subTitle, meaning: bookmarkDetail.meaning };
	}, [bookmarkDetail]);
	// 오답 상세 아이템(원본 카드 + 오답의 정답/해설 병합)
	const wrongItem = useMemo(() => {
		if (!detail) return null;
		const c = findCard(detail.domain, detail.uid);
		const base = c
			? {
					domain: c.domain,
					uid: c.uid,
					domainTitle: LearnHubService.getDomainTitle(c.domain),
					title: c.title,
					subTitle: c.subTitle,
					meaning: c.meaning,
					description: c.description,
					examples: c.examples,
					tags: c.tags,
					options: c.options,
				}
			: { domain: detail.domain, uid: detail.uid, domainTitle: detail.domainTitle, title: detail.prompt, subTitle: detail.subTitle, examples: detail.examples };
		return {
			...base,
			categoryLabel: detail.categoryLabel,
			levelLabel: detail.level,
			answer: detail.answer,
			explanation: detail.explanation,
		};
	}, [detail]);

	const reload = useCallback(() => {
		Promise.all([LearnProgressService.getBookmarks(), LearnProgressService.getWrongNotes()])
			.then(([bm, wn]) => {
				setAllBookmarks(bm);
				setAllWrongs(wn);
			})
			.finally(() => setLoading(false));
	}, []);

	useFocusEffect(useCallback(() => reload(), [reload]));

	const removeBookmark = async (b: BookmarkItem) => {
		await LearnProgressService.removeBookmark(b.uid);
		reload();
		playPop();
		showToast(t('common.bookmarkUnsaved'), 'star-border');
	};
	const removeWrong = async (uid: string) => {
		await LearnProgressService.removeWrongNote(uid);
		reload();
	};
	// 오답 항목 즐겨찾기 토글 (별 아이콘)
	const toggleWrongBookmark = async (w: WrongItem) => {
		const c = findCard(w.domain, w.uid);
		const now = await LearnProgressService.toggleBookmark({
			uid: w.uid,
			domain: w.domain,
			domainTitle: w.domainTitle,
			title: w.prompt,
			subTitle: w.subTitle,
			meaning: c?.meaning || w.explanation || w.answer || w.prompt,
		});
		reload();
		playPop();
		showToast(now ? t('common.bookmarkSaved') : t('common.bookmarkUnsaved'), now ? 'star' : 'star-border');
	};
	const clearWrong = async () => {
		const ok = await showConfirm({
			title: t('library.clearTitle'),
			message: scope === ALL_SCOPE ? t('library.clearAllMessage', { n: wrongs.length }) : t('library.clearDomainMessage', { domain: LearnHubService.getDomainTitle(scope), n: wrongs.length }),
			confirmText: t('common.delete'),
			cancelText: t('common.cancel'),
			destructive: true,
			icon: 'delete-sweep',
		});
		if (!ok) return;
		if (scope === ALL_SCOPE) {
			await LearnProgressService.clearWrongNotes();
		} else {
			// 선택 주제만 비우기 (현재 목록이 이미 주제로 필터되어 있음)
			await Promise.all(wrongs.map((w) => LearnProgressService.removeWrongNote(w.uid)));
		}
		reload();
	};

	const isBookmark = tab === 'bookmark';
	const isEmpty = !loading && (isBookmark ? bookmarks.length === 0 : wrongs.length === 0);

	return (
		<SafeAreaView style={styles.safe} edges={[]}>
			<CommonHeader
				title={t('library.title')}
				alignLeft
				border={false}
				onBack={() => (router.canGoBack() ? router.back() : router.replace('/home' as never))}
			/>

			{/* 세그먼트 */}
			<View style={styles.segment}>
				<TouchableOpacity style={[styles.segBtn, isBookmark && styles.segBtnActive]} activeOpacity={0.85} onPress={() => changeTab('bookmark')}>
					<IconComponent type="materialIcons" name="bookmark" size={scaledSize(17)} color={isBookmark ? Colors.primary : Colors.textMuted} />
					<Text style={[styles.segText, isBookmark && styles.segTextActive]}>{t('library.tabBookmark', { n: bookmarks.length })}</Text>
				</TouchableOpacity>
				<TouchableOpacity style={[styles.segBtn, !isBookmark && styles.segBtnActive]} activeOpacity={0.85} onPress={() => changeTab('wrong')}>
					<IconComponent type="materialIcons" name="error-outline" size={scaledSize(17)} color={!isBookmark ? Colors.error : Colors.textMuted} />
					<Text style={[styles.segText, !isBookmark && styles.segTextActive]}>{t('library.tabWrong', { n: wrongs.length })}</Text>
				</TouchableOpacity>
			</View>

			{/* 주제별 필터 — 검색과 동일한 공용 칩 (위 간격 확보) */}
			<View style={{ marginTop: SpacingV.xl }}>
				<CategoryScopeChips value={scope} onChange={setScope} showCount={false} style={{ backgroundColor: Colors.background }} />
			</View>

			{/* 빈 상태는 남은 화면 높이를 다 써서 정중앙에 온다 (위쪽에 붙어 보이지 않게) */}
			<ScrollView ref={scrollTop.ref} onScroll={scrollTop.onScroll} scrollEventThrottle={16} style={styles.scroll} contentContainerStyle={[styles.list, isEmpty && styles.listFill]} showsVerticalScrollIndicator={false}>
				{/* key 로 리마운트해야 탭·로딩 전환에도 진입 연출이 다시 재생된다 */}
				<FadeInUp key={`${tab}-${loading}`} style={isEmpty ? styles.listFill : undefined}>
				{loading ? (
					<View>
						{[0, 1, 2, 3, 4].map((i) => (
							<View key={i} style={styles.skeletonCard}>
								<Skeleton width={'40%'} height={scaleHeight(16)} radius={Radius.md} />
								<Skeleton width={'70%'} height={scaleHeight(20)} radius={Radius.sm} style={{ marginTop: SpacingV.sm }} />
								<Skeleton width={'100%'} height={scaleHeight(36)} radius={Radius.md} style={{ marginTop: SpacingV.sm }} />
							</View>
						))}
					</View>
				) : isBookmark ? (
					bookmarks.length === 0 ? (
						<EmptyState illustration="empty" icon="bookmark-border" text={t('library.emptyBookmark')} subText={t('library.emptyBookmarkSub')} />
					) : (
						<AdaptiveGrid>
							{bookmarks.map((b, i) => {
								const c = findCard(b.domain, b.uid);
								return (
									<FadeInUp key={b.uid} delay={Math.min(i * 45, 300)} duration={340} distance={14}>
										<LearnItemCard
											domain={b.domain}
											categoryLabel={c?.categoryLabel}
											levelLabel={c?.levelLabel}
											title={b.title}
											subTitle={b.subTitle}
											explanation={c ? c.meaning : b.meaning}
											examples={c?.examples}
											bookmarked
											onToggleBookmark={() => removeBookmark(b)}
											onPress={() => setBookmarkDetail(b)}
										/>
									</FadeInUp>
								);
							})}
						</AdaptiveGrid>
					)
				) : wrongs.length === 0 ? (
					<EmptyState illustration="allComplete" icon="check-circle" text={t('library.emptyWrong')} subText={t('library.emptyWrongSub')} />
				) : (
					<>
						<TouchableOpacity style={styles.reviewCta} activeOpacity={0.9} onPress={() => router.push({ pathname: '/quiz/wrong-review', params: scope === ALL_SCOPE ? {} : { category: scope } } as never)}>
							<IconComponent type="materialIcons" name="history-edu" size={scaledSize(20)} color={Colors.textInverse} />
							<Text style={styles.reviewCtaText}>{t('library.review', { n: wrongs.length })}</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.clearBtn} activeOpacity={0.8} onPress={clearWrong}>
							<IconComponent type="materialIcons" name="delete-sweep" size={scaledSize(16)} color={Colors.textSecondary} />
							<Text style={styles.clearText}>{scope === ALL_SCOPE ? t('library.clearAll') : t('library.clearDomain', { domain: LearnHubService.getDomainTitle(scope) })}</Text>
						</TouchableOpacity>
						<AdaptiveGrid>
							{wrongs.map((w) => {
								const c = findCard(w.domain, w.uid);
								const fields = learnListFields({
									domain: w.domain,
									prompt: w.prompt,
									subPrompt: w.subTitle,
									answer: w.answer,
									explanation: w.explanation || (c ? c.meaning : ''),
								});
								return (
									<LearnItemCard
										key={w.uid}
										domain={w.domain}
										categoryLabel={w.categoryLabel}
										levelLabel={w.level}
										{...fields}
										subTitle={w.subTitle}
										examples={w.examples}
										bookmarked={bookmarkedUids.has(w.uid)}
										onToggleBookmark={() => toggleWrongBookmark(w)}
										onPress={() => setDetail(w)}
									/>
								);
							})}
						</AdaptiveGrid>
					</>
				)}

				{!loading && scope !== ALL_SCOPE && (
					<TouchableOpacity
						style={styles.goQuizBtn}
						activeOpacity={0.85}
						onPress={() => router.push({ pathname: '/learn/category', params: { category: scope } } as never)}>
						<IconComponent type="materialIcons" name="school" size={scaledSize(18)} color={Colors.primary} />
						<Text style={styles.goQuizText}>{t('library.goStudy', { domain: LearnHubService.getDomainTitle(scope) })}</Text>
					</TouchableOpacity>
				)}
				</FadeInUp>
			</ScrollView>
			{/* 긴 목록 — 우하단 맨 위로 버튼 */}
			<ScrollTopButton visible={scrollTop.visible} toTop={scrollTop.toTop} progress={scrollTop.progress} />

			{/* 즐겨찾기 상세 — 검색과 동일한 공통 팝업(원본 카드 데이터 사용) */}
			<DetailSheet
				visible={!!bookmarkDetail}
				accent={bookmarkDetail ? LearnHubService.getDomain(bookmarkDetail.domain).meta.color : Colors.primary}
				onClose={() => { setBookmarkDetail(null); reload(); }}
				onBookmarkChange={() => reload()}
				item={bookmarkItem}
			/>
			{/* 오답 상세 — 검색과 동일한 공통 팝업(원본 카드 + 정답/해설) */}
			<DetailSheet
				visible={!!detail}
				accent={detail ? LearnHubService.getDomain(detail.domain).meta.color : Colors.error}
				onClose={() => { setDetail(null); reload(); }}
				onBookmarkChange={() => reload()}
				item={wrongItem}
				primaryAction={
					detail
						? { label: t('common.delete'), icon: 'delete', onPress: () => { const uid = detail.uid; setDetail(null); removeWrong(uid); } }
						: undefined
				}
			/>
		</SafeAreaView>
	);
};

export default Library;

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.background },
	// 세그먼트 컨트롤 — 트랙(border+radius)로 감싸고 활성 탭만 채움
	segment: {
		flexDirection: 'row',
		gap: Spacing.xs,
		marginHorizontal: Layout.screenH,
		marginTop: SpacingV.sm,
		padding: Spacing.xs,
		borderRadius: Radius.lg,
		backgroundColor: Colors.surfaceAlt,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	segBtn: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.xs,
		paddingVertical: SpacingV.sm,
		borderRadius: Radius.md,
		backgroundColor: 'transparent',
		// 선택 시 테두리가 생기며 높이가 튀지 않도록 비활성에도 같은 두께를 잡아둔다
		borderWidth: 1,
		borderColor: 'transparent',
	},
	segBtnActive: {
		backgroundColor: Colors.surface,
		borderColor: Colors.border,
	},
	segText: { fontSize: Typography.body, fontWeight: '700', color: Colors.textMuted },
	segTextActive: { color: Colors.textStrong },
	scroll: { flex: 1 },
	list: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },
	listFill: { flexGrow: 1 },
	skeletonCard: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: SpacingV.md },
	reviewCta: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.sm,
		backgroundColor: Colors.primary,
		borderRadius: Radius.lg,
		paddingVertical: SpacingV.lg,
		marginBottom: SpacingV.sm,
	},
	reviewCtaText: { color: Colors.textInverse, fontSize: Typography.callout, fontWeight: '800' },
	clearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.xs, marginBottom: SpacingV.sm },
	clearText: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary },
	goQuizBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.sm,
		marginTop: SpacingV.sm,
		paddingVertical: SpacingV.lg,
		borderRadius: Radius.lg,
		backgroundColor: Colors.primaryBg,
		borderWidth: 1,
		borderColor: Colors.primarySoft,
	},
	goQuizText: { fontSize: Typography.body, fontWeight: '800', color: Colors.primaryDeep },
}));
