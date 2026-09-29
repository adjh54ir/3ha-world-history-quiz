/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import CommonHeader from '@/src/screens/common/CommonHeader';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Colors from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, CardSurface, Layout, Border } from '@/src/const/ConstDesign';
import { scaleArt, scaledSize, scaleHeight, scaleWidth, contentWidth, isTablet } from '@/src/utils';
import LearnHubService from '@/src/services/LearnHubService';
import { LearnType } from '@/src/types/data/LearnType';
import ConfettiCannon from 'react-native-confetti-cannon';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import { playFlip, playMatch, playWrong, playFinish } from '@/src/utils/SoundUtils';
import { Image as ExpoImage } from 'expo-image';
import { FEATURE_ILLUSTRATIONS } from '@/src/const/ConstFeatureIllustrationAssets';
import { themed } from '@/src/utils/ThemedStyles';
import EntryImage from '@/src/screens/common/atomic/EntryImage';
import { stringParam } from '@/src/navigation/expoRouterUtils';

const PAIRS = 5;

interface Tile {
	key: string;
	uid: string;
	kind: 'word' | 'meaning';
	text: string;
	/** 국기 짝 맞추기 — 설명 대신 국기 그림을 뒤집는다 */
	imageRef?: string;
}

type MatchMode = 'meaning' | 'flag';

const shuffle = <T,>(arr: T[]): T[] => {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
};

const buildTiles = (mode: MatchMode): Tile[] => {
	if (mode === 'flag') {
		// 국기 짝 맞추기 — 초급·중급 나라만 (토켈라우 국기를 처음 보는 사람에게 메모리 게임은 운이다)
		const flags = LearnHubService.getDomain('capital')
			.getStudyCards()
			.filter((c) => !!c.imageRef && (c.levelLabel === '초급' || c.levelLabel === '중급'))
			.slice(0, PAIRS);
		return shuffle(
			flags.flatMap((c) => [
				{ key: `${c.uid}-w`, uid: c.uid, kind: 'word' as const, text: c.title },
				{ key: `${c.uid}-m`, uid: c.uid, kind: 'meaning' as const, text: c.title, imageRef: c.imageRef },
			]),
		);
	}
	// 설명에 이름이 그대로 들어 있는 카드는 짝이 바로 보이므로 뺀다 (넉넉히 뽑아 거른다)
	const cards: LearnType.StudyCard[] = LearnHubService.getMixedStudyCards(PAIRS * 3).filter((c) => !c.meaning.includes(c.title)).slice(0, PAIRS);
	const tiles: Tile[] = [];
	cards.forEach((c) => {
		tiles.push({ key: `${c.uid}-w`, uid: c.uid, kind: 'word', text: c.title });
		tiles.push({ key: `${c.uid}-m`, uid: c.uid, kind: 'meaning', text: c.meaning });
	});
	return shuffle(tiles);
};

/**
 * 짝 맞추기 (메모리 게임)
 * - 이름과 설명을 뒤집어 짝을 맞춰요. 적은 시도·짧은 시간이 목표!
 */
const MatchGame = () => {
	const params = useLocalSearchParams();
	const mode: MatchMode = stringParam(params.mode, 'meaning') === 'flag' ? 'flag' : 'meaning';
	const [tiles, setTiles] = useState<Tile[]>(() => buildTiles(mode));
	const [revealed, setRevealed] = useState<number[]>([]);
	const [matched, setMatched] = useState<Set<string>>(new Set());
	const [moves, setMoves] = useState(0);
	const [seconds, setSeconds] = useState(0);
	const lockRef = useRef(false);
	// 오답 뒤집기 복구 타이머 — 언마운트 시 정리(해제 후 setState 방지)
	const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => () => { if (flipTimerRef.current) clearTimeout(flipTimerRef.current); }, []);

	// 카드가 PAIRS 개보다 적게 나올 수도 있으므로 실제 타일 수로 판정한다(고정값이면 영영 완료 안 됨)
	const totalPairs = tiles.length / 2;
	const done = totalPairs > 0 && matched.size === totalPairs;

	useEffect(() => {
		if (done) return;
		const t = setInterval(() => setSeconds((s) => s + 1), 1000);
		return () => clearInterval(t);
	}, [done]);

	const restart = () => {
		if (flipTimerRef.current) {
			clearTimeout(flipTimerRef.current);
			flipTimerRef.current = null;
		}
		setTiles(buildTiles(mode));
		setRevealed([]);
		setMatched(new Set());
		setMoves(0);
		setSeconds(0);
		lockRef.current = false;
	};

	const onTile = (i: number) => {
		if (lockRef.current) return;
		const tile = tiles[i];
		if (matched.has(tile.uid) || revealed.includes(i)) return;

		playFlip();
		const next = [...revealed, i];
		setRevealed(next);
		if (next.length === 2) {
			setMoves((m) => m + 1);
			const [a, b] = next;
			if (tiles[a].uid === tiles[b].uid) {
				// 사운드는 업데이터 밖에서 — 업데이터는 React 가 다시 호출할 수 있어 중복 재생된다
				const nextMatched = new Set(matched).add(tiles[a].uid);
				// 마지막 짝까지 맞추면 완료 사운드, 그 외엔 짝 성공 사운드
				if (nextMatched.size === totalPairs) playFinish();
				else playMatch();
				setMatched(nextMatched);
				setRevealed([]);
			} else {
				playWrong();
				lockRef.current = true;
				if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
				flipTimerRef.current = setTimeout(() => {
					setRevealed([]);
					lockRef.current = false;
				}, 800);
			}
		}
	};

	const mm = `${Math.floor(seconds / 60)}`.padStart(2, '0');
	const ss = `${seconds % 60}`.padStart(2, '0');

	return (
		<SafeAreaView style={styles.safe} edges={[]}>
			{done && <ConfettiCannon count={110} origin={{ x: contentWidth / 2, y: -10 }} fadeOut autoStart explosionSpeed={350} />}

			<View style={styles.header}>
				<CommonHeader
					title={mode === 'flag' ? '국기 짝 맞추기' : '짝 맞추기'}
					backIcon="close"
					border={false}
					style={styles.headerRow}
					onBack={() => router.back()}
					right={
						<TouchableOpacity style={styles.headerAction} activeOpacity={0.7} hitSlop={8} accessibilityRole="button" accessibilityLabel="다시 섞기" onPress={restart}>
							<IconComponent type="materialIcons" name="refresh" size={scaledSize(20)} color={Colors.text} />
						</TouchableOpacity>
					}
				/>
				<View style={styles.statRow}>
					<Text style={styles.statText}>⏱ {mm}:{ss}</Text>
					<Text style={styles.statText}>시도 {moves}</Text>
					<Text style={styles.statText}>맞춤 {matched.size}/{totalPairs}</Text>
				</View>
			</View>

			<ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
				<FadeInUp>
				{done ? (
					<View style={styles.resultCard}>
						<ExpoImage source={FEATURE_ILLUSTRATIONS.matchGame} style={styles.resultIllustration} contentFit="contain" accessible={false} />
						<Text style={styles.resultTitle}>완성!</Text>
						<Text style={styles.resultSub}>{moves}번 시도 · {mm}:{ss}</Text>
						<View style={styles.resultBtns}>
							<TouchableOpacity style={styles.outlineBtn} activeOpacity={0.85} onPress={restart}>
								<IconComponent type="materialIcons" name="replay" size={scaledSize(20)} color={Colors.text} />
								<Text style={styles.outlineBtnText}>다시</Text>
							</TouchableOpacity>
							<TouchableOpacity style={[styles.filledBtn, { backgroundColor: Colors.primary }]} activeOpacity={0.85} onPress={() => router.replace('/home' as never)}>
								<IconComponent type="materialIcons" name="home" size={scaledSize(20)} color={Colors.textInverse} />
								<Text style={styles.filledBtnText}>홈으로</Text>
							</TouchableOpacity>
						</View>
					</View>
				) : (
					<Text style={styles.guide}>{mode === 'flag' ? '국기와 나라 이름을 짝지어 보세요' : '이름과 설명을 짝지어 보세요'}</Text>
				)}

				<View style={styles.grid}>
					{tiles.map((tile, i) => {
						const isMatched = matched.has(tile.uid);
						const isOpen = isMatched || revealed.includes(i);
						return (
							<TouchableOpacity
								key={tile.key}
								style={[styles.tile, isOpen && (tile.kind === 'word' ? styles.tileWord : styles.tileMeaning), isMatched && styles.tileMatched]}
								activeOpacity={0.9}
								onPress={() => onTile(i)}>
								{isOpen && tile.imageRef ? (
									<EntryImage imageRef={tile.imageRef} width={FLAG_W} style={styles.tileFlag} />
								) : isOpen ? (
									<Text style={[styles.tileText, tile.kind === 'word' && styles.tileWordText]} numberOfLines={4}>
										{tile.text}
									</Text>
								) : (
									<IconComponent type="materialIcons" name="help-outline" size={scaledSize(26)} color={Colors.textMuted} />
								)}
							</TouchableOpacity>
						);
					})}
				</View>
				</FadeInUp>
			</ScrollView>
		</SafeAreaView>
	);
};

export default MatchGame;


// 2열 타일 — 가로·세로 간격을 같은 gap 으로 맞추려고 폭을 컬럼 폭에서 직접 계산한다.
// 태블릿은 폰 비율(약 1.68:1)을 유지하도록 높이를 폭에서 역산한다.
const TILE_W = (contentWidth - Layout.screenH * 2 - Spacing.sm) / 2;
const TILE_H = isTablet ? Math.round(TILE_W / 1.68) : scaleHeight(96);
/** 국기 타일 — 국기 틀(가로:세로 = 1 : 0.62)이 타일 안쪽 높이에 들어가게 폭을 줄인다 */
const FLAG_W = Math.min(TILE_W - Spacing.md * 2, Math.round((TILE_H - Spacing.md * 2) / 0.62));

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.background },
	header: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: SpacingV.lg, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
	headerRow: { paddingHorizontal: Spacing.sm },
	headerAction: { width: Layout.touch, height: Layout.touch, justifyContent: 'center', alignItems: 'center' },
	statRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: SpacingV.md },
	statText: { color: Colors.textSecondary, fontSize: Typography.body, fontWeight: '700' },
	body: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },
	guide: { fontSize: Typography.body, color: Colors.textSecondary, fontWeight: '600', textAlign: 'center', marginBottom: SpacingV.lg },
	// space-between 대신 gap — 마지막 줄이 1개일 때 좌우로 벌어지지 않는다
	grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
	tile: {
		width: TILE_W,
		height: TILE_H,
		borderRadius: Radius.lg,
		backgroundColor: Colors.surface,
		borderWidth: Border.thin,
		borderColor: Colors.border,
		justifyContent: 'center',
		alignItems: 'center',
		padding: Spacing.md,
	},
	tileFlag: { padding: Spacing.xs },
	tileWord: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
	tileMeaning: { backgroundColor: Colors.surface, borderColor: Colors.primary },
	tileMatched: { backgroundColor: Colors.successSoft, borderColor: Colors.success },
	tileText: { fontSize: Typography.body, color: Colors.text, textAlign: 'center', lineHeight: scaleHeight(18) },
	tileWordText: { fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong },
	resultCard: { ...CardSurface, alignItems: 'center', borderRadius: Radius.lg, paddingVertical: SpacingV.xxl, paddingHorizontal: Spacing.xl, marginBottom: Layout.sectionGap },
	resultIllustration: { width: scaleArt(136), height: scaleArt(120) },
	resultTitle: { fontSize: Typography.h2, fontWeight: '900', color: Colors.textStrong, marginTop: SpacingV.sm },
	resultSub: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: SpacingV.sm },
	resultBtns: { flexDirection: 'row', gap: Spacing.md, marginTop: SpacingV.lg, alignSelf: 'stretch' },
	outlineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: SpacingV.lg, borderRadius: Radius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong },
	outlineBtnText: { fontSize: Typography.callout, fontWeight: '700', color: Colors.text },
	filledBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: SpacingV.lg, borderRadius: Radius.lg },
	filledBtnText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textInverse },
}));
