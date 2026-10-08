/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Animated, Easing, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import CommonHeader from '@/src/screens/common/CommonHeader';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import DomainIcon from '@/src/screens/common/atomic/DomainIcon';
import Colors, { readableOn, withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, Layout } from '@/src/const/ConstDesign';
import { AnimatedProgress, FadeInUp } from '@/src/screens/common/anim/Motion';
import { scaledSize, scaleHeight, scaleWidth, contentWidth, scaleArt } from '@/src/utils';
import LearnHubService from '@/src/services/LearnHubService';
import LearnProgressService from '@/src/services/LearnProgressService';
import { LearnType } from '@/src/types/data/LearnType';
import { stringParam } from '@/src/navigation/expoRouterUtils';
import { useToast } from '@/src/context/ToastContext';
import ExitConfirmModal from '@/src/screens/modal/ExitConfirmModal';
import { hapticLight } from '@/src/utils/HapticUtils';
import { playComplete, playFlip, playPop } from '@/src/utils/SoundUtils';
import { startBgm, stopBgm } from '@/src/utils/BgmUtils';
import CharacterGuide, { useCharacterGuideOnce, CharacterGuideButton } from '@/src/screens/common/CharacterGuide';
import { categoryIcon, difficultyIcon } from '@/src/const/ConstQuizMeta';
import EntryImage from '@/src/screens/common/atomic/EntryImage';
import { reportQuizIssue } from '@/src/utils/ReportIssue';
import { themed } from '@/src/utils/ThemedStyles';

const ITEM_W = contentWidth;
/** 카드 조작법 안내 — 캐릭터가 최초 1회만 설명 (문구는 렌더 시점에 번역) */
const COACH_KEYS = ['learn.study.guide.swipe', 'learn.study.guide.flip', 'learn.study.guide.complete'] as const;
/** 진행 도트 최대 개수 (카드가 많아도 한 줄 유지) */
const DOT_MAX = 7;

type StudyTab = 'all' | 'learning' | 'done';

/**
 * 통합 학습 화면 (카드 학습)
 * - 상단 탭: 전체 / 학습중 / 학습 완료 (완료 탭에서는 '복습하기'로 다시 학습중 전환)
 * - 좌우로 넘기는 캐러셀. 카드를 탭하면 앞면(이름·그림) ↔ 뒷면(설명/정보/더 알아보기)이 뒤집힘. 뒷면은 스크롤 가능.
 */
const LearnStudy = () => {
	const { t } = useTranslation();
	const params = useLocalSearchParams();
	const category = stringParam(params.category, 'capital');
	const cats = stringParam(params.cats, '');
	const catList = cats ? cats.split(',').filter((c) => LearnHubService.isValidCategory(c)) : [];
	const isBundle = catList.length > 0;
	const domain = LearnHubService.getDomain(isBundle ? catList[0] : category);
	const accent = isBundle ? Colors.primary : domain.meta.color;
	const onAccent = readableOn(accent);
	const title = t('learn.titleOf', {
		title: isBundle
			? catList.length > 2
				? t('quiz.common.topicCount', { count: catList.length })
				: catList.map((k) => LearnHubService.getDomainTitle(k)).join(', ')
			: domain.meta.title,
	});
	const activeDomains = useMemo(() => (isBundle ? catList : [category]), [category, cats]);
	const { showToast } = useToast();

	// 전체 카드 (개수 제한 없음). 묶음이면 선택 주제들을 섞어서.
	const cards = useMemo(() => {
		if (isBundle) {
			const merged = catList.flatMap((k) => LearnHubService.getDomain(k).getStudyCards());
			for (let i = merged.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[merged[i], merged[j]] = [merged[j], merged[i]];
			}
			return merged;
		}
		return domain.getStudyCards();
	}, [category, cats]);

	const [studiedSet, setStudiedSet] = useState<Set<string>>(new Set());
	const [tab, setTab] = useState<StudyTab>('learning');
	const [index, setIndex] = useState(0);
	const [showExit, setShowExit] = useState(false);
	// 조작법 안내 — 처음 들어온 사용자에게만 1회, 홈에서 고른 캐릭터가 설명한다
	const coach = useCharacterGuideOnce('learn-study');
	const listRef = useRef<FlatList<LearnType.StudyCard>>(null);
	// 카드 넘김 진행도 — 카드 스케일/투명도 연출용 (네이티브 드라이버)
	const scrollX = useRef(new Animated.Value(0)).current;
	// 다음 카드 스크롤 타이머 — 언마운트 시 정리
	const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => () => { if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current); }, []);

	// 학습 완료 집합 로드 (도메인별 합집합)
	const loadStudied = useCallback(() => {
		Promise.all(activeDomains.map((d) => LearnProgressService.getStudiedSet(d))).then((sets) => {
			const merged = new Set<string>();
			sets.forEach((s) => s.forEach((u) => merged.add(u)));
			setStudiedSet(merged);
		});
	}, [activeDomains]);

	useFocusEffect(useCallback(() => loadStudied(), [loadStudied]));
	// 배경음악 — 화면에 있는 동안 잔잔한 학습 트랙, 다른 화면으로 가면 정지
	useFocusEffect(useCallback(() => {
		startBgm('study');
		return () => stopBgm();
	}, []));

	const doneCount = useMemo(() => cards.filter((c) => studiedSet.has(c.uid)).length, [cards, studiedSet]);
	const learningCount = cards.length - doneCount;
	const donePct = cards.length > 0 ? Math.round((doneCount / cards.length) * 100) : 0;

	const filtered = useMemo(() => {
		if (tab === 'done') return cards.filter((c) => studiedSet.has(c.uid));
		if (tab === 'learning') return cards.filter((c) => !studiedSet.has(c.uid));
		return cards;
	}, [cards, studiedSet, tab]);

	const total = filtered.length;
	// 도트는 최대 DOT_MAX개만 — 현재 위치를 중심으로 슬라이딩
	const dotWindow = useMemo(() => {
		const count = Math.min(DOT_MAX, total);
		const start = Math.max(0, Math.min(index - Math.floor(count / 2), total - count));
		return Array.from({ length: count }, (_, i) => start + i);
	}, [index, total]);

	const changeTab = (next: StudyTab) => {
		setTab(next);
		setIndex(0);
		listRef.current?.scrollToOffset({ offset: 0, animated: false });
	};

	const goQuiz = useCallback(() => {
		if (isBundle) {
			// 방금 학습한 주제를 그대로 이어서 풀 수 있게 넘긴다
			router.replace({ pathname: '/quiz/bundle', params: { cats: catList.join(',') } } as never);
			return;
		}
		router.replace({ pathname: '/learn/quiz', params: { category } } as never);
	}, [category, isBundle, cats]);

	// 학습 완료 처리
	const onComplete = useCallback(
		(i: number) => {
			const c = filtered[i];
			if (!c) return;
			LearnProgressService.addStudied(c.domain, c.uid).catch(() => {});
			// 방금 완료한 카드까지 반영한 최신 완료 집합
			const nextStudied = new Set(studiedSet).add(c.uid);
			// 방금 완료한 카드 '다음'의 미학습 카드를 우선 선택하고, 없으면 '이전'의 미학습 카드로.
			const nextCard =
				filtered.slice(i + 1).find((card) => !nextStudied.has(card.uid)) ??
				[...filtered.slice(0, i)].reverse().find((card) => !nextStudied.has(card.uid));
			setStudiedSet(nextStudied);
			// 아직 학습중인(완료되지 않은) 카드들
			const remaining = cards.filter((card) => !nextStudied.has(card.uid));
			if (remaining.length === 0 || !nextCard) {
				goQuiz();
				return;
			}
			// 완료한 카드를 건너뛰고, 학습중 목록에서 '다음 카드'의 실제 위치로 이동(탭이 달라도 정확).
			setTab('learning');
			const nextIndex = Math.max(0, remaining.findIndex((card) => card.uid === nextCard.uid));
			setIndex(nextIndex);
			// 다음 카드로 부드럽게 이동(넘어가는 모션)
			if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
			scrollTimerRef.current = setTimeout(() => listRef.current?.scrollToOffset({ offset: nextIndex * ITEM_W, animated: true }), 220);
			showToast(t('learn.study.toastDone'));
		},
		[filtered, cards, studiedSet, goQuiz, showToast, t],
	);

	// 복습하기 — 다시 학습중으로
	const onReview = useCallback(
		(c: LearnType.StudyCard) => {
			playComplete();
			LearnProgressService.removeStudied(c.domain, c.uid).catch(() => {});
			setStudiedSet((prev) => {
				const next = new Set(prev);
				next.delete(c.uid);
				return next;
			});
			showToast(t('learn.study.toastReview'), 'refresh');
		},
		[showToast, t],
	);

	const onMomentumEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
		const i = Math.round(e.nativeEvent.contentOffset.x / ITEM_W);
		if (i !== index) setIndex(i);
	};

	const TABS: { key: StudyTab; label: string; count: number }[] = [
		{ key: 'all', label: t('common.all'), count: cards.length },
		{ key: 'learning', label: t('learn.study.learning'), count: learningCount },
		{ key: 'done', label: t('learn.study.done'), count: doneCount },
	];

	return (
		<SafeAreaView style={styles.safe} edges={['bottom']}>
			{/* 헤더 */}
			<FadeInUp>
			<View style={styles.header}>
				<CommonHeader
					title={title}
					subtitle={total > 0 ? `${Math.min(index + 1, total)} / ${total}` : '0 / 0'}
					border={false}
					style={styles.headerRow}
					onBack={() => router.back()}
					right={
						<View style={styles.headerActions}>
							<CharacterGuideButton onPress={coach.open} color={Colors.textSecondary} size={scaledSize(21)} />
							<TouchableOpacity style={styles.headerAction} activeOpacity={0.7} hitSlop={Layout.hitSlop} accessibilityRole="button" accessibilityLabel={t('learn.study.exit')} onPress={() => setShowExit(true)}>
								<IconComponent type="materialIcons" name="close" size={scaledSize(24)} color={Colors.textSecondary} />
							</TouchableOpacity>
						</View>
					}
				/>

				{/* 나의 학습 스코어 — 완료율을 먼저 보여주고 그 아래에서 탭으로 목록을 고른다 */}
				<View style={styles.learnStatus}>
					<View style={styles.learnStatusLeft}>
						<View style={[styles.learnStatusIcon, { backgroundColor: withAlpha(accent, '14') }]}>
							<IconComponent type="materialIcons" name="local-fire-department" size={scaledSize(15)} color={accent} />
						</View>
						<Text style={styles.learnStatusText}>
							{t('learn.study.done')} <Text style={[styles.learnStatusStrong, { color: accent }]}>{doneCount}</Text>
							<Text style={styles.learnStatusMuted}> / {cards.length}</Text>
						</Text>
					</View>
					<View style={[styles.learnStatusPctChip, { backgroundColor: withAlpha(accent, '14') }]}>
						<Text style={[styles.learnStatusPct, { color: accent }]}>{t('learn.study.pctDone', { value: donePct })}</Text>
					</View>
				</View>

				{/* 진행바 */}
				<View style={styles.progressWrap}>
					<AnimatedProgress ratio={donePct / 100} color={accent} trackColor={Colors.border} height={scaleHeight(8)} radius={scaleWidth(4)} />
				</View>

				{/* 상단 탭 */}
				<View style={styles.tabRow}>
					{TABS.map((item) => {
						const on = tab === item.key;
						return (
							<TouchableOpacity key={item.key} style={[styles.tabBtn, on && { backgroundColor: accent }]} activeOpacity={0.85} onPress={() => changeTab(item.key)} hitSlop={Layout.hitSlop}>
								<Text numberOfLines={1} style={[styles.tabText, on && { color: onAccent }]}>{item.label}</Text>
								<View style={[styles.tabCount, on ? { backgroundColor: Colors.onBrandSurfaceStrong } : { backgroundColor: Colors.surface }]}>
									<Text style={[styles.tabCountText, on && { color: onAccent }]}>{item.count}</Text>
								</View>
							</TouchableOpacity>
						);
					})}
				</View>
			</View>
			</FadeInUp>

			{total === 0 ? (
				<View style={styles.emptyWrap}>
					<IconComponent type="materialIcons" name={tab === 'done' ? 'inventory-2' : 'menu-book'} size={scaledSize(46)} color={Colors.textMuted} />
					<Text style={styles.emptyText}>
						{t(tab === 'done' ? 'learn.study.emptyDone' : tab === 'learning' ? 'learn.study.emptyLearning' : 'learn.study.emptyAll')}
					</Text>
				</View>
			) : (
				<>
					{/* 좌우 캐러셀 */}
					{/* key 로 강제 리마운트하지 않는다 — 네이티브 스크롤 리스너가 붙은 리스트를 통째로 갈면 크래시한다.
						 탭 전환 시에는 changeTab 에서 스크롤만 처음으로 돌린다. */}
					<Animated.FlatList
						ref={listRef}
						data={filtered}
						keyExtractor={(item) => item.uid}
						horizontal
						pagingEnabled
						showsHorizontalScrollIndicator={false}
						getItemLayout={(_, i) => ({ length: ITEM_W, offset: ITEM_W * i, index: i })}
						onMomentumScrollEnd={onMomentumEnd}
						decelerationRate="fast"
						onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
						scrollEventThrottle={16}
						renderItem={({ item, index: i }) => (
							<CardItem
								card={item}
								index={i}
								scrollX={scrollX}
								accent={accent}
								domainTitle={LearnHubService.getDomainTitle(item.domain)}
								isDone={studiedSet.has(item.uid)}
								isLast={learningCount <= 1}
								onComplete={() => onComplete(i)}
								onReview={() => onReview(item)}
								onToast={showToast}
							/>
						)}
					/>
					{/* 진행 인디케이터 — 카드가 많아도 폭이 늘지 않게 현재 위치 주변 창(window)만 도트로 */}
					<View style={styles.dotsRow}>
						{dotWindow.map((i) => (
							<View key={i} style={[styles.dot, i === index && [styles.dotOn, { backgroundColor: accent }]]} />
						))}
					</View>
					<Text style={styles.swipeHint}>{t('learn.study.swipeHint')}</Text>
				</>
			)}

			{/* 조작법 안내 — 최초 1회 */}
			<CharacterGuide
				visible={coach.visible && total > 0}
				onClose={coach.close}
				lines={COACH_KEYS.map((k) => t(k))}
				title={t('learn.study.guideTitle')}
				accent={accent}
			/>

			<ExitConfirmModal
				visible={showExit}
				onCancel={() => setShowExit(false)}
				onConfirm={() => {
					setShowExit(false);
					router.replace('/(tabs)/home' as never);
				}}
			/>
		</SafeAreaView>
	);
};

interface CardItemProps {
	card: LearnType.StudyCard;
	index: number;
	scrollX: Animated.Value;
	accent: string;
	domainTitle: string;
	isDone: boolean;
	isLast: boolean;
	onComplete: () => void;
	onReview: () => void;
	onToast: (msg: string, icon?: string) => void;
}

/** 개별 학습 카드 (뒤집기: 앞면 이름·그림 / 뒷면 설명·정보·더 알아보기, 뒷면 스크롤 가능) */
const CardItem: React.FC<CardItemProps> = ({ card, index, scrollX, accent, domainTitle, isDone, isLast, onComplete, onReview, onToast }) => {
	const { t } = useTranslation();
	const domainMeta = LearnHubService.getDomain(card.domain).meta;
	const [revealed, setRevealed] = useState(false);
	const [bookmarked, setBookmarked] = useState(false);
	const flip = useRef(new Animated.Value(0)).current;
	// 학습 완료 시 카드가 왼쪽으로 넘어가는 모션
	const exitAnim = useRef(new Animated.Value(0)).current;
	// 언마운트 시 진행 중인 애니메이션 정리 (콜백이 사라진 화면의 state 를 건드리지 않게)
	useEffect(() => () => { flip.stopAnimation(); exitAnim.stopAnimation(); }, [flip, exitAnim]);
	// 넘기는 동안 옆 카드는 살짝 작아지고 흐려짐 — 요즘 카드 캐러셀 모션
	const inputRange = [(index - 1) * ITEM_W, index * ITEM_W, (index + 1) * ITEM_W];
	const swipeScale = scrollX.interpolate({ inputRange, outputRange: [0.9, 1, 0.9], extrapolate: 'clamp' });
	const swipeOpacity = scrollX.interpolate({ inputRange, outputRange: [0.55, 1, 0.55], extrapolate: 'clamp' });
	/**
	 * 세로 스와이프 — 아래로 밀면 앞면으로.
	 * 좌우는 카드 넘기기(FlatList)가 쓰고 있어 세로만 잡고, 가로로 움직이면 즉시 실패시켜 넘기기를 방해하지 않는다.
	 */
	const handleComplete = () => {
		// stopAnimation(언마운트 정리)도 콜백을 부르므로 정상 종료일 때만 완료 처리한다
		Animated.timing(exitAnim, { toValue: 1, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
			if (!finished) return;
			onComplete();
			exitAnim.setValue(0);
		});
	};

	// 제스처 객체는 렌더마다 새로 만들면 안 된다 — 진행 중이던 핸들러가 detach 되며 크래시한다.
	// 최신 상태는 ref 로만 갈아끼우고 제스처 자체는 한 번만 만든다.
	const swipeHandlers = useRef({ revealed, setRevealed });
	swipeHandlers.current = { revealed, setRevealed };

	// RN 기본 PanResponder 사용 — RNGH/Reanimated 제스처는 캐러셀이 remount 되는 타이밍에
	// 핸들러가 detach 되며 크래시했다. PanResponder 는 스레드 간 호출이 없어 그 문제가 없다.
	const pan = useRef(
		PanResponder.create({
			// 세로로 확실히 움직였을 때만 잡는다 — 좌우 카드 넘기기(FlatList)를 방해하지 않게
			onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 18 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
			onPanResponderRelease: (_e, g) => {
				const h = swipeHandlers.current;
				if (g.dy > 70 && h.revealed) {
					h.setRevealed(false);
				}
			},
		}),
	).current;

	useEffect(() => {
		// 오버슈트(스프링)로 회전값이 0~1을 벗어나면 앞/뒷면이 겹쳐 깨지므로 구간 고정 timing 사용
		Animated.timing(flip, { toValue: revealed ? 1 : 0, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
	}, [revealed, flip]);

	// rotateY(3D)는 뒷면 ScrollView가 안드로이드에서 뭉개지므로 가로 접힘(scaleX)으로 대체한다
	const flipScaleX = flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.02, 1], extrapolate: 'clamp' });
	// 접히는 순간(0.5)에 앞/뒷면 교체
	const frontOpacity = flip.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0], extrapolate: 'clamp' });
	const backOpacity = flip.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });

	useEffect(() => {
		let alive = true;
		LearnProgressService.isBookmarked(card.uid).then((v) => alive && setBookmarked(v));
		return () => {
			alive = false;
		};
	}, [card.uid]);

	const toggleBookmark = async () => {
		const now = await LearnProgressService.toggleBookmark({
			uid: card.uid,
			domain: card.domain,
			domainTitle,
			title: card.title,
			subTitle: card.subTitle,
			meaning: card.meaning,
		});
		setBookmarked(now);
		playPop();
		onToast(now ? t('common.bookmarkSaved') : t('common.bookmarkUnsaved'), 'bookmark');
	};

	return (
		<Animated.View
			{...pan.panHandlers}
			style={[
				styles.cardArea,
				{
					opacity: Animated.multiply(swipeOpacity, exitAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })),
					transform: [
						{ translateX: exitAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -ITEM_W] }) },
						{ scale: Animated.multiply(swipeScale, exitAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] })) },
					],
				},
			]}>
			<View style={styles.card}>
				{/* 고정 헤더: 카테고리·난이도(좌) + 저장(우) */}
					<View style={styles.cardHeader}>
						<View style={styles.labelRow}>
							<View style={[styles.chip, { backgroundColor: withAlpha(domainMeta.color, '14') }]}>
								<DomainIcon mainIcon={domainMeta.mainIcon} icon={domainMeta.icon} iconType={domainMeta.iconType} size={scaledSize(13)} color={domainMeta.color} />
								<Text style={[styles.chipText, { color: domainMeta.color }]} numberOfLines={1} ellipsizeMode="tail">{domainTitle}</Text>
							</View>
							{!!card.categoryLabel && card.categoryLabel !== domainTitle && (
							<View style={[styles.chip, { backgroundColor: withAlpha(accent, '1A') }]}>
								<IconComponent type="materialIcons" name={categoryIcon(card.categoryLabel)} size={scaledSize(12)} color={accent} />
									<Text style={[styles.chipText, { color: accent }]} numberOfLines={1} ellipsizeMode="tail">{card.categoryLabel}</Text>
							</View>
						)}
						{!!card.levelLabel && (
							<View style={[styles.chip, { backgroundColor: Colors.surfaceAlt }]}>
								<IconComponent type="materialIcons" name={difficultyIcon(card.levelLabel)} size={scaledSize(12)} color={Colors.textSecondary} />
									<Text style={[styles.chipText, { color: Colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{card.levelLabel}</Text>
							</View>
						)}
					</View>
					<TouchableOpacity style={styles.cardSaveBtn} activeOpacity={0.8} onPress={toggleBookmark} hitSlop={Layout.hitSlop}>
						<IconComponent type="materialIcons" name={bookmarked ? 'star' : 'star-border'} size={scaledSize(24)} color={bookmarked ? Colors.bookmark : Colors.textMuted} />
					</TouchableOpacity>
				</View>

				{/* 뒤집기 영역 — 앞면(이름) 탭 → 뒷면(설명). 뒷면은 스크롤 가능 */}
				<Animated.View style={[styles.flipArea, { transform: [{ scaleX: flipScaleX }] }]}>
					{/* 앞면 — 이름 (국기·초상·사진이 있는 주제는 그림도 함께) */}
					<Animated.View pointerEvents={revealed ? 'none' : 'auto'} style={[styles.flipFace, styles.flipFront, { opacity: frontOpacity }]}>
						<TouchableOpacity activeOpacity={0.9} style={styles.flipFrontInner} onPress={() => { hapticLight(); playFlip(); setRevealed(true); }}>
							{!!card.imageRef && <EntryImage imageRef={card.imageRef} width={scaleArt(150)} fetchWidth={360} style={styles.cardImage} />}
							<Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">{card.title}</Text>
							{!!card.subTitle && <Text style={styles.cardSubTitle} numberOfLines={2} ellipsizeMode="tail">{card.subTitle}</Text>}
							<View style={[styles.tapHint, { backgroundColor: withAlpha(accent, '0F') }]}>
								<IconComponent type="materialIcons" name="flip" size={scaledSize(20)} color={accent} />
								<Text style={[styles.tapHintText, { color: accent }]}>{t('learn.study.tapToFlip')}</Text>
							</View>
						</TouchableOpacity>
					</Animated.View>

					{/* 뒷면 — 설명 / 정보 / 더 알아보기 (스크롤) */}
					<Animated.View pointerEvents={revealed ? 'auto' : 'none'} style={[styles.flipFace, { opacity: backOpacity }]}>
						<ScrollView showsVerticalScrollIndicator contentContainerStyle={styles.backScroll} nestedScrollEnabled scrollEventThrottle={16}>
						<TouchableOpacity activeOpacity={1} style={styles.flipBackTap} onPress={() => { hapticLight(); playFlip(); setRevealed(false); }}>
							<View style={styles.meaningPlainBox}>
								<IconComponent type="materialIcons" name="format-quote" size={scaledSize(30)} color={accent} style={styles.meaningQuote} />
								<Text style={styles.meaningText}>{card.description || card.meaning}</Text>
							</View>

							{/* 신화 이야기 1~3편 — 뒤집을 때마다 한 편씩 차례로 떠오르도록 revealed 로 다시 마운트한다 */}
							{!!card.stories && card.stories.length > 0 && (
								<View style={[styles.sectionBox, styles.storyBox, { backgroundColor: withAlpha(accent, '0D'), borderColor: withAlpha(accent, '33') }]}>
									<View style={styles.storyHead}>
										<IconComponent type="materialIcons" name="auto-stories" size={scaledSize(15)} color={accent} />
										<Text style={[styles.meaningLabel, styles.storyLabel, { color: accent }]}>{t('learn.study.story')}</Text>
									</View>
									{card.stories.map((story, i) => (
										<FadeInUp key={`${revealed ? 'shown' : 'hidden'}-${i}`} delay={160 + i * 120} duration={420} style={[styles.storyItem, i > 0 && [styles.storyItemDivider, { borderTopColor: withAlpha(accent, '26') }]]}>
											{card.stories!.length > 1 && (
												<View style={[styles.storyNum, { backgroundColor: withAlpha(accent, '1A') }]}>
													<Text style={[styles.storyNumText, { color: accent }]}>{i + 1}</Text>
												</View>
											)}
											<Text lineBreakStrategyIOS="hangul-word" style={styles.storyText}>{story}</Text>
										</FadeInUp>
									))}
								</View>
							)}

							{/* 정보 — infoRows 가 있으면 항목별 표로, 없으면 기존 요약 */}
							{!!card.infoRows && card.infoRows.length > 0 ? (
								<View style={[styles.sectionBox, styles.meaningHighlightBox]}>
									<Text style={[styles.meaningLabel, { color: Colors.success }]}>{t('learn.study.info')}</Text>
									{card.infoRows.map((r, i) => (
										<View key={i} style={styles.infoRow}>
											<Text style={styles.infoLabel} numberOfLines={1}>{r.label}</Text>
											<Text style={styles.infoValue} numberOfLines={2} ellipsizeMode="tail">{r.value}</Text>
										</View>
									))}
								</View>
							) : (
								!!card.description && card.description !== card.meaning && (
									<View style={[styles.sectionBox, styles.meaningHighlightBox]}>
										<Text style={[styles.meaningLabel, { color: Colors.success }]}>{t('learn.study.summary')}</Text>
										<Text style={styles.descText}>{card.meaning}</Text>
									</View>
								)
							)}

							{!!card.examples && card.examples.length > 0 && (
								<View style={styles.sectionBox}>
									<Text style={[styles.meaningLabel, { color: accent }]}>{t('learn.study.more')}</Text>
									{card.examples.map((ex, i) => (
										<View key={i} style={styles.exampleBox}>
											<Text style={styles.exampleText}>{ex}</Text>
										</View>
									))}
								</View>
							)}

							<TouchableOpacity style={styles.tapHintMini} activeOpacity={0.7} onPress={() => { hapticLight(); playFlip(); setRevealed(false); }}>
								<IconComponent type="materialIcons" name="flip" size={scaledSize(14)} color={Colors.textMuted} />
								<Text style={styles.tapHintMiniText}>{t('learn.study.tapToFront')}</Text>
							</TouchableOpacity>
							{/* 내용 오류 제보 — 메일 본문에 항목 정보를 채워 연다 */}
							<TouchableOpacity
								style={styles.reportBtn}
								activeOpacity={0.7}
								hitSlop={Layout.hitSlop}
								onPress={() => reportQuizIssue({ uid: card.uid, domain: card.domain, prompt: card.title, answer: card.meaning, explanation: card.examples?.join(' / ') })}>
								<IconComponent type="materialIcons" name="outlined-flag" size={scaledSize(14)} color={Colors.textMuted} />
								<Text style={styles.reportBtnText}>{t('learn.study.reportIssue')}</Text>
							</TouchableOpacity>
						</TouchableOpacity>
					</ScrollView>
					</Animated.View>
				</Animated.View>
			</View>

			{/* 카드 하단 액션 — 완료 탭이면 복습하기, 아니면 학습완료 */}
			<View style={styles.cardActions}>
				{isDone ? (
					<TouchableOpacity style={[styles.completeBtn, { backgroundColor: Colors.surface, borderWidth: 1, borderColor: accent }]} activeOpacity={0.9} onPress={onReview}>
						<IconComponent type="materialIcons" name="refresh" size={scaledSize(18)} color={accent} />
						<Text style={[styles.completeBtnText, { color: accent }]}>{t('learn.study.review')}</Text>
					</TouchableOpacity>
				) : (
					<TouchableOpacity
						style={[styles.completeBtn, { backgroundColor: accent }]}
						activeOpacity={0.9}
						onPress={() => { playComplete(); (isLast ? onComplete : handleComplete)(); }}>
						<IconComponent type="materialIcons" name={isLast ? 'quiz' : 'check-circle'} size={scaledSize(18)} color={readableOn(accent)} />
						<Text style={[styles.completeBtnText, { color: readableOn(accent) }]}>{isLast ? t('learn.study.completeLast') : t('learn.study.done')}</Text>
					</TouchableOpacity>
				)}
			</View>
		</Animated.View>
	);
};

export default LearnStudy;

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.background },
	header: {
		marginHorizontal: Layout.screenH,
		marginTop: Layout.screenTop,
		paddingHorizontal: Spacing.lg,
		paddingTop: 0,
		paddingBottom: SpacingV.lg,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.xl,
	},
	headerRow: { paddingHorizontal: 0, backgroundColor: 'transparent' },
	headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
	headerAction: { width: Layout.touch, height: Layout.touch, justifyContent: 'center', alignItems: 'center' },
	tabRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: SpacingV.md },
	tabBtn: { flex: 1, minWidth: 0, minHeight: scaleHeight(38), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: SpacingV.xs, paddingHorizontal: Spacing.xs, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
	tabText: { flexShrink: 1, fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary, textAlign: 'center' },
	tabCount: { flexShrink: 0, minWidth: scaleWidth(18), paddingHorizontal: Spacing.xs, paddingVertical: SpacingV.xs, borderRadius: Radius.pill, alignItems: 'center' },
	tabCountText: { fontSize: Typography.micro, fontWeight: '900', color: Colors.textSecondary },
	learnStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 0 },
	learnStatusLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	learnStatusIcon: { width: scaleWidth(26), height: scaleWidth(26), borderRadius: scaleWidth(9), justifyContent: 'center', alignItems: 'center' },
	learnStatusText: { fontSize: Typography.body, fontWeight: '700', color: Colors.textSecondary },
	learnStatusStrong: { fontSize: Typography.body, fontWeight: '900' },
	learnStatusMuted: { fontSize: Typography.body, color: Colors.textMuted, fontWeight: '700' },
	learnStatusPctChip: { paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs, borderRadius: Radius.md },
	learnStatusPct: { fontSize: Typography.footnote, fontWeight: '900' },
	progressWrap: { marginTop: SpacingV.sm },
	emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxxl },
	emptyText: { textAlign: 'center', marginTop: SpacingV.lg, color: Colors.textSecondary, fontSize: Typography.body, fontWeight: '600', lineHeight: scaleHeight(21) },
	cardArea: { width: ITEM_W, flex: 1, paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: SpacingV.sm },
	card: {
		flex: 1,
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.xxl,
	},
	labelRow: { flex: 1, flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
	chip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs, borderRadius: Radius.md },
	chipText: { fontSize: Typography.footnote, fontWeight: '800' },
	// 뒤집기
	flipArea: { flex: 1, marginTop: SpacingV.sm },
	flipFace: { ...StyleSheet.absoluteFillObject },
	flipFront: { alignItems: 'center', justifyContent: 'center' },
	flipFrontInner: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
	backScroll: { paddingBottom: SpacingV.sm, flexGrow: 1 },
	cardImage: { marginBottom: SpacingV.lg, borderRadius: Radius.md },
	cardTitle: { fontSize: Typography.h1, fontWeight: '900', color: Colors.textStrong, textAlign: 'center', lineHeight: scaleHeight(40) },
	cardSubTitle: { fontSize: Typography.callout, color: Colors.textSecondary, textAlign: 'center', marginTop: SpacingV.sm },
	tapHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: SpacingV.xxxl, paddingVertical: SpacingV.lg, paddingHorizontal: Spacing.xl, borderRadius: Radius.lg },
	tapHintText: { fontSize: Typography.body, fontWeight: '700' },
	tapHintMini: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: SpacingV.sm, marginBottom: SpacingV.xs, paddingVertical: SpacingV.sm },
	tapHintMiniText: { fontSize: Typography.footnote, fontWeight: '600', color: Colors.textMuted },
	reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs, marginBottom: SpacingV.sm, borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt },
	reportBtnText: { fontSize: Typography.caption, fontWeight: '600', color: Colors.textMuted },
	sectionBox: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.md, marginBottom: SpacingV.md },
	meaningHighlightBox: { backgroundColor: Colors.successSoft, borderColor: withAlpha(Colors.success, '40') },
	meaningLabel: { fontSize: Typography.footnote, fontWeight: '900', marginTop: 0, marginBottom: SpacingV.sm },
	meaningPlainBox: { alignItems: 'center', paddingVertical: SpacingV.xl, paddingHorizontal: Spacing.lg, marginBottom: SpacingV.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt },
	meaningQuote: { marginBottom: SpacingV.sm },
	flipBackTap: { flex: 1 },
	meaningText: { fontSize: Typography.title, color: Colors.textStrong, fontWeight: '700', lineHeight: scaleHeight(27), textAlign: 'center' },
	descText: { fontSize: Typography.body, color: Colors.text, lineHeight: scaleHeight(22) },
	storyBox: { paddingVertical: SpacingV.lg },
	storyHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: SpacingV.sm },
	storyLabel: { marginBottom: 0 },
	storyItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
	storyItemDivider: { marginTop: SpacingV.md, paddingTop: SpacingV.md, borderTopWidth: 1 },
	storyNum: { width: scaleWidth(20), height: scaleWidth(20), borderRadius: scaleWidth(10), alignItems: 'center', justifyContent: 'center', marginTop: SpacingV.xxs },
	storyNumText: { fontSize: Typography.micro, fontWeight: '900' },
	storyText: { flex: 1, fontSize: Typography.body, color: Colors.text, lineHeight: scaleHeight(24) },
	infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingVertical: SpacingV.xs },
	infoLabel: { width: scaleWidth(72), fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary },
	infoValue: { flex: 1, fontSize: Typography.footnote, color: Colors.text, lineHeight: scaleHeight(20) },
	exampleBox: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm, marginTop: SpacingV.sm },
	exampleText: { fontSize: Typography.body, color: Colors.textSecondary, lineHeight: scaleHeight(22) },
	cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SpacingV.lg },
	cardSaveBtn: { padding: Spacing.xs },
	cardActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: SpacingV.md },
	completeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: SpacingV.lg, borderRadius: Radius.lg, backgroundColor: Colors.primary },
	completeBtnText: { flexShrink: 1, textAlign: 'center', color: Colors.textInverse, fontSize: Typography.callout, fontWeight: '800' },
	dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, marginTop: SpacingV.sm },
	dot: { width: scaleWidth(6), height: scaleWidth(6), borderRadius: Radius.pill, backgroundColor: Colors.borderStrong },
	dotOn: { width: scaleWidth(18) },
	swipeHint: { textAlign: 'center', color: Colors.textMuted, fontSize: Typography.footnote, fontWeight: '600', paddingVertical: SpacingV.sm },
}));
