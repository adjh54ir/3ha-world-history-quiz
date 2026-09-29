/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Animated, Easing } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import LottieBox from '@/src/screens/common/atomic/LottieBox';
import AppModal from '@/src/screens/common/atomic/AppModal';
import Skeleton from '@/src/screens/common/atomic/Skeleton';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import { RankPodium, RankRowItem } from '@/src/screens/common/RankBoardView';
import Colors, { BRAND_GRADIENT, HEAT_GRADIENT, readableOn } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, Layout, Border, Tracking } from '@/src/const/ConstDesign';
import { scaleArt, scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import RankingService, { RankBoard, RankRow } from '@/src/services/RankingService';
import { useToast } from '@/src/context/ToastContext';
import { playPop } from '@/src/utils/SoundUtils';
import { randomNickname } from '@/src/utils/NicknameUtils';
import { stringParam } from '@/src/navigation/expoRouterUtils';
import { useTopBarAccent } from '@/src/utils/TopBarColor';
import { Image as ExpoImage } from 'expo-image';
import { FEATURE_ILLUSTRATIONS } from '@/src/const/ConstFeatureIllustrationAssets';
import { themed } from '@/src/utils/ThemedStyles';

const LOTTIE_CONFETTI = require('@/src/assets/lottie/confetti.json');
const LOTTIE_EMPTY = require('@/src/assets/lottie/empty.json');

const TABS: { key: RankBoard; label: string; icon: string; unit: string; desc: string; colors: [string, string, string] }[] = themed(() => ([
	{ key: 'total', label: '전체', icon: 'emoji-events', unit: '점', desc: '나의 퀴즈 점수로 겨루는 명예의 전당', colors: [...BRAND_GRADIENT] as [string, string, string] },
	{ key: 'time', label: '타임챌린지', icon: 'bolt', unit: '점', desc: '180초 순간 집중력 대결', colors: [...HEAT_GRADIENT] as [string, string, string] },
	// 주간 랭킹은 '내 활동' 탭(연속 학습 아래)으로 이동했습니다.
]));

const Ranking = () => {
	const { showToast } = useToast();
	const insets = useSafeAreaInsets();
	// board 파라미터로 진입하면 해당 보드만 보여준다 (타임챌린지 전체보기 → 탭 없이 타임챌린지만)
	const params = useLocalSearchParams();
	const lockedBoard = stringParam(params.board, '') as RankBoard | '';
	const [tab, setTab] = useState<RankBoard>(lockedBoard || 'total');
	const [rows, setRows] = useState<RankRow[]>([]);
	const [mine, setMine] = useState<{ rank: number; score: number } | null>(null);
	const [nickname, setNickname] = useState<string | null>(null);
	const [nickInput, setNickInput] = useState(() => randomNickname());
	const [editNick, setEditNick] = useState(false);
	const [saving, setSaving] = useState(false);
	const diceSpin = useRef(new Animated.Value(0)).current;
	// 언마운트 시 진행 중인 애니메이션 정리
	useEffect(() => () => diceSpin.stopAnimation(), [diceSpin]);
	const [loading, setLoading] = useState(true);
	const [celebrate, setCelebrate] = useState(false);
	const configured = RankingService.isConfigured;

	// 축하 연출 타이머 — 언마운트 시 정리
	const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => () => { if (celebrateTimer.current) clearTimeout(celebrateTimer.current); }, []);

	const meta = useMemo(() => TABS.find((t) => t.key === tab) ?? TABS[0], [tab]);
	// 히어로 그라디언트가 상단 인셋까지 이어지도록 상태바 색을 맞춘다
	useTopBarAccent(meta.colors[0]);

	// 응답이 늦게 도착한 옛 요청이 최신 목록을 덮어쓰지 않도록 요청 순번을 센다
	const loadSeq = useRef(0);
	const load = useCallback(async (t: RankBoard) => {
		const seq = ++loadSeq.current;
		setLoading(true);
		const [b, m] = await Promise.all([RankingService.board(t), RankingService.myRank(t)]);
		if (seq !== loadSeq.current) return;
		setRows(b);
		setMine(m);
		setLoading(false);
	}, []);

	// 탭 전환은 changeTab 에서만 로드한다 — deps 에 tab 을 두면 같은 전환에 요청이 두 번 나간다
	const tabRef = useRef(tab);
	tabRef.current = tab;
	useFocusEffect(
		useCallback(() => {
			if (!configured) {
				setLoading(false);
				return;
			}
			(async () => {
				const nick = await RankingService.getNickname();
				setNickname(nick);
				if (nick) await RankingService.submit();
				await load(tabRef.current);
			})();
		}, [configured, load]),
	);

	/** 주사위 굴리기 — 닉네임 재생성 + 회전 애니메이션 */
	const rollNickname = () => {
		playPop();
		setNickInput(randomNickname());
		diceSpin.setValue(0);
		Animated.timing(diceSpin, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
	};

	/** 닉네임 변경 모달 열기 (새 후보 하나 뽑아둠) */
	const openEditNick = () => {
		playPop();
		setNickInput(randomNickname());
		setEditNick(true);
	};

	/** 닉네임 변경 저장 */
	const applyNickChange = async () => {
		setSaving(true);
		const ok = await RankingService.setNickname(nickInput.trim());
		setSaving(false);
		if (ok) {
			setNickname(nickInput.trim());
			setEditNick(false);
			playPop();
			showToast('닉네임을 변경했어요', 'casino');
			load(tab);
		} else {
			showToast('닉네임 변경에 실패했어요', 'error-outline');
		}
	};

	const saveNickname = async () => {
		const v = nickInput.trim();
		if (v.length < 1) return;
		const ok = await RankingService.setNickname(v);
		if (ok) {
			setNickname(v);
			playPop();
			setCelebrate(true);
			if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
			celebrateTimer.current = setTimeout(() => setCelebrate(false), 2600);
			showToast('랭킹에 참여했어요!', 'emoji-events');
			load(tab);
		} else {
			showToast('닉네임 저장에 실패했어요', 'error-outline');
		}
	};

	const changeTab = (t: RankBoard) => {
		if (t === tab) return;
		playPop();
		setTab(t);
		load(t);
	};

	const unit = meta.unit;

	return (
		<SafeAreaView style={styles.safe} edges={[]}>
			{/* 히어로 */}
			<View style={styles.hero}>
				<LinearGradient colors={meta.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
				<View style={styles.heroTop}>
					<TouchableOpacity style={styles.backBtn} activeOpacity={0.7} onPress={() => router.back()} hitSlop={8}>
						<IconComponent type="materialIcons" name="arrow-back-ios-new" size={scaledSize(18)} color={Colors.textInverse} />
					</TouchableOpacity>
					{/* 특정 보드로 진입하면 탭이 숨으므로 제목으로 맥락을 유지한다 */}
					<Text style={styles.heroTitle} numberOfLines={1}>{lockedBoard ? `${meta.label} 랭킹` : '랭킹'}</Text>
					{nickname ? (
						<TouchableOpacity style={styles.backBtn} activeOpacity={0.7} onPress={openEditNick} hitSlop={8}>
							<IconComponent type="materialIcons" name="edit" size={scaledSize(19)} color={Colors.textInverse} />
						</TouchableOpacity>
					) : (
						<View style={styles.backBtn} />
					)}
				</View>
				{!!nickname && (
					<TouchableOpacity style={styles.heroNick} activeOpacity={0.8} onPress={openEditNick}>
						<Text style={styles.heroNickText} numberOfLines={1}>{nickname}</Text>
						<IconComponent type="materialIcons" name="casino" size={scaledSize(13)} color={Colors.onBrandText} />
					</TouchableOpacity>
				)}
				<ExpoImage source={FEATURE_ILLUSTRATIONS.ranking} style={styles.heroIllustration} contentFit="contain" accessible={false} />
				<View style={styles.heroBadge}>
					<IconComponent type="materialIcons" name={meta.icon} size={scaledSize(14)} color={Colors.textInverse} />
					<Text style={styles.heroBadgeText} numberOfLines={1} ellipsizeMode="tail">{meta.desc}</Text>
				</View>
				<View style={styles.heroStats}>
					<View style={styles.heroStat}>
						{/* 보드는 상위 100명까지만 내려온다 — 전체 참가자 수가 아니므로 라벨을 맞춘다 */}
						<Text style={styles.heroStatNum}>{rows.length.toLocaleString()}</Text>
						<Text style={styles.heroStatLabel}>표시 인원</Text>
					</View>
					<View style={styles.heroStatDivider} />
					<View style={styles.heroStat}>
						<Text style={styles.heroStatNum}>{mine ? `${mine.rank}위` : '-'}</Text>
						<Text style={styles.heroStatLabel}>내 순위</Text>
					</View>
					<View style={styles.heroStatDivider} />
					<View style={styles.heroStat}>
						<Text style={styles.heroStatNum}>{mine ? mine.score.toLocaleString() : '-'}</Text>
						<Text style={styles.heroStatLabel}>내 점수</Text>
					</View>
				</View>
			</View>

			{/* 탭 — 특정 보드로 진입했을 땐 숨김 */}
			{!lockedBoard && (
			<View style={styles.tabBar}>
				{TABS.map((t) => {
					const on = tab === t.key;
					return (
						<TouchableOpacity key={t.key} style={[styles.tabBtn, on && { backgroundColor: t.colors[0], borderColor: t.colors[0] }]} activeOpacity={0.85} onPress={() => changeTab(t.key)}>
							<IconComponent type="materialIcons" name={t.icon} size={scaledSize(15)} color={on ? readableOn(t.colors[0]) : Colors.textMuted} />
							<Text style={[styles.tabText, on && { color: readableOn(t.colors[0]) }]} numberOfLines={1} ellipsizeMode="tail">{t.label}</Text>
						</TouchableOpacity>
					);
				})}
			</View>
			)}

			{!configured ? (
				<View style={styles.center}>
					<LottieBox source={LOTTIE_EMPTY} autoPlay loop style={styles.emptyLottie} />
					<Text style={styles.emptyText}>랭킹이 아직 준비 중이에요.</Text>
				</View>
			) : !nickname ? (
				<View style={[styles.center, { paddingBottom: insets.bottom + SpacingV.xl }]}>
					<LottieBox source={LOTTIE_CONFETTI} autoPlay loop={false} style={styles.joinLottie} />
					<Text style={styles.nickTitle}>랭킹 참여하기</Text>
					<Text style={styles.nickSub}>주사위를 굴려 마음에 드는 닉네임을 뽑아보세요.</Text>

					{/* 랜덤 닉네임 카드 + 주사위 */}
					<View style={styles.nickCard}>
						<Text style={styles.nickValue} numberOfLines={1}>{nickInput}</Text>
						<TouchableOpacity style={styles.diceBtn} activeOpacity={0.8} onPress={rollNickname}>
							<Animated.View style={{ transform: [{ rotate: diceSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
								<IconComponent type="materialIcons" name="casino" size={scaledSize(24)} color={Colors.primary} />
							</Animated.View>
						</TouchableOpacity>
					</View>
					<Text style={styles.nickHint}>비속어 방지를 위해 닉네임은 랜덤으로만 만들어져요.</Text>

					<TouchableOpacity style={styles.nickBtn} activeOpacity={0.9} onPress={saveNickname}>
						<IconComponent type="materialIcons" name="emoji-events" size={scaledSize(18)} color={Colors.textInverse} />
						<Text style={styles.nickBtnText}>이 닉네임으로 참여</Text>
					</TouchableOpacity>
				</View>
			) : loading ? (
				<View style={styles.list}>
					{[0, 1, 2, 3, 4, 5].map((i) => (
						<Skeleton key={i} width={'100%'} height={scaleHeight(60)} radius={Radius.lg} style={{ marginBottom: SpacingV.sm }} />
					))}
				</View>
			) : rows.length === 0 ? (
				<View style={styles.center}>
					<LottieBox source={LOTTIE_EMPTY} autoPlay loop style={styles.emptyLottie} />
					<Text style={styles.emptyText}>아직 기록이 없어요.{'\n'}첫 주자가 되어보세요!</Text>
				</View>
			) : (
				<FlatList
					data={rows}
					keyExtractor={(r, i) => `${r.rank}-${r.nickname}-${i}`}
					contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + scaleHeight(96) }]}
					showsVerticalScrollIndicator={false}
					ListHeaderComponent={
						<FadeInUp>
							{/* TOP 3 시상대 — 2 · 1 · 3 순서로 고정 배치 (챌린지 탭과 공용 컴포넌트) */}
							<RankPodium rows={rows} unit={unit} />
							<Text style={styles.listHead}>전체 순위</Text>
						</FadeInUp>
					}
					renderItem={({ item, index }) => (
						<FadeInUp delay={Math.min(index * 40, 320)} duration={340} distance={12}>
							<RankRowItem item={item} index={index} unit={unit} />
						</FadeInUp>
					)}
				/>
			)}

			{/* 내 순위 바 — 하단 SafeArea 확보 */}
			{!!nickname && !!mine && (
				<View style={[styles.myBar, { paddingBottom: insets.bottom + SpacingV.md }]}>
					<LinearGradient colors={meta.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
					<View style={styles.myAvatar}>
						<IconComponent type="materialIcons" name="person" size={scaledSize(16)} color={Colors.textInverse} />
					</View>
					<View style={styles.myBody}>
						<Text style={styles.myLabel}>내 순위</Text>
						<Text style={styles.myRank}>{mine.rank}위</Text>
					</View>
					<Text style={styles.myScore}>{mine.score.toLocaleString()}{unit}</Text>
				</View>
			)}

			{/* 닉네임 변경 모달 */}
			<AppModal visible={editNick} transparent animationType="fade" onRequestClose={() => setEditNick(false)}>
				<View style={styles.modalOverlay}>
					<TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setEditNick(false)} />
					<View style={styles.modalSheet}>
						<View style={styles.modalTitleRow}>
							<Text style={styles.modalTitle}>닉네임 변경</Text>
							<TouchableOpacity onPress={() => setEditNick(false)} hitSlop={10} activeOpacity={0.7}>
								<IconComponent type="materialIcons" name="close" size={scaledSize(22)} color={Colors.textSecondary} />
							</TouchableOpacity>
						</View>
						<Text style={styles.modalSub}>주사위를 굴려 새 닉네임을 뽑아보세요.</Text>
						<View style={styles.nickCard}>
							<Text style={styles.nickValue} numberOfLines={1}>{nickInput}</Text>
							<TouchableOpacity style={styles.diceBtn} activeOpacity={0.8} onPress={rollNickname}>
								<Animated.View style={{ transform: [{ rotate: diceSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
								<IconComponent type="materialIcons" name="casino" size={scaledSize(24)} color={Colors.primary} />
							</Animated.View>
							</TouchableOpacity>
						</View>
						<Text style={styles.nickHint} numberOfLines={1} ellipsizeMode="tail">현재 닉네임: {nickname}</Text>
						<TouchableOpacity style={[styles.nickBtn, saving && { opacity: 0.6 }]} activeOpacity={0.9} disabled={saving} onPress={applyNickChange}>
							<IconComponent type="materialIcons" name="check" size={scaledSize(18)} color={Colors.textInverse} />
							<Text style={styles.nickBtnText} numberOfLines={1} ellipsizeMode="tail">{saving ? '변경 중…' : '이 닉네임으로 변경'}</Text>
						</TouchableOpacity>
					</View>
				</View>
			</AppModal>

			{/* 참여 축하 컨페티 */}
			{celebrate && (
				<View style={styles.celebrate} pointerEvents="none">
					<LottieBox source={LOTTIE_CONFETTI} autoPlay loop={false} style={StyleSheet.absoluteFill as never} />
				</View>
			)}
		</SafeAreaView>
	);
};

export default Ranking;

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.background },
	// 히어로
	hero: { paddingBottom: SpacingV.lg, overflow: 'hidden', borderBottomLeftRadius: scaleWidth(28), borderBottomRightRadius: scaleWidth(28) },
	heroIllustration: { width: scaleArt(124), height: scaleArt(104), alignSelf: 'center', marginTop: SpacingV.xs },
	heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.sm, paddingTop: SpacingV.sm },
	backBtn: { width: Layout.touch, height: Layout.touch, justifyContent: 'center', alignItems: 'center' },
	heroTitle: { flex: 1, textAlign: 'center', fontSize: Typography.title, fontWeight: '900', color: Colors.textInverse },
	heroBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: Spacing.xs, backgroundColor: Colors.onBrandDivider, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs, marginTop: SpacingV.xs },
	heroBadgeText: { color: Colors.textInverse, fontSize: Typography.footnote, fontWeight: '800' },
	heroNick: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: Spacing.xs, marginTop: SpacingV.sm, backgroundColor: Colors.onBrandSurface, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs },
	heroNickText: { color: Colors.textInverse, fontSize: Typography.body, fontWeight: '900', maxWidth: scaleWidth(200) },
	modalOverlay: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
	modalSheet: { width: '100%', maxWidth: Layout.dialogMaxWidth, backgroundColor: Colors.surface, borderRadius: Radius.xl, paddingHorizontal: Spacing.xl, paddingVertical: SpacingV.xxl },
	modalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	modalTitle: { fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong },
	modalSub: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: SpacingV.xs, marginBottom: SpacingV.md },
	heroStats: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginHorizontal: Layout.screenH, marginTop: SpacingV.lg, backgroundColor: Colors.onBrandSurface, borderRadius: Radius.lg, paddingVertical: SpacingV.md },
	heroStat: { flex: 1, alignItems: 'center' },
	heroStatNum: { color: Colors.textInverse, fontSize: Typography.title, fontWeight: '900' },
	heroStatLabel: { color: Colors.onBrandTextSoft, fontSize: Typography.footnote, fontWeight: '700', marginTop: SpacingV.xxs },
	heroStatDivider: { width: 1, height: scaleHeight(26), backgroundColor: Colors.onBrandSurfaceStrong },
	// 탭
	tabBar: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Layout.screenH, paddingVertical: SpacingV.md },
	tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: SpacingV.md, borderRadius: Radius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
	tabText: { flexShrink: 1, fontSize: Typography.footnote, fontWeight: '800', color: Colors.textMuted, textAlign: 'center' },
	list: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },
	listHead: { fontSize: Typography.footnote, fontWeight: '900', color: Colors.textSecondary, letterSpacing: Tracking.normal, marginBottom: SpacingV.sm },
	// 내 순위 바
	myBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Layout.screenH, paddingTop: SpacingV.lg, overflow: 'hidden' },
	myAvatar: { width: scaleWidth(34), height: scaleWidth(34), borderRadius: Radius.pill, backgroundColor: Colors.onBrandSurfaceStrong, alignItems: 'center', justifyContent: 'center' },
	myBody: { flex: 1 },
	myLabel: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.onBrandText },
	myRank: { fontSize: Typography.callout, fontWeight: '900', color: Colors.textInverse },
	myScore: { fontSize: Typography.title, fontWeight: '900', color: Colors.textInverse },
	// 공통
	center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxxl, gap: SpacingV.sm },
	emptyLottie: { width: scaleArt(130), height: scaleArt(130) },
	emptyText: { fontSize: Typography.body, color: Colors.textSecondary, fontWeight: '700', textAlign: 'center' },
	joinLottie: { width: scaleArt(150), height: scaleArt(150) },
	nickTitle: { fontSize: Typography.h3, fontWeight: '900', color: Colors.textStrong },
	nickSub: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: SpacingV.md },
	nickCard: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderWidth: Border.thin, borderColor: Colors.primarySoft, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.md },
	nickValue: { flex: 1, fontSize: Typography.callout, fontWeight: '900', color: Colors.textStrong },
	diceBtn: { width: scaleWidth(44), height: scaleWidth(44), borderRadius: Radius.lg, backgroundColor: Colors.primaryBg, borderWidth: 1, borderColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
	nickHint: { fontSize: Typography.footnote, color: Colors.textMuted, fontWeight: '600', textAlign: 'center', marginTop: SpacingV.xs },
	nickBtn: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: SpacingV.lg, marginTop: SpacingV.sm },
	nickBtnText: { color: Colors.textInverse, fontSize: Typography.callout, fontWeight: '800' },
	celebrate: { position: 'absolute', top: 0, left: 0, right: 0, height: scaleHeight(340) },
}));
