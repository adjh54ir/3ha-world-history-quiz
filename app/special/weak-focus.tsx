/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import CommonHeader from '@/src/screens/common/CommonHeader';
import ListSkeleton from '@/src/screens/common/atomic/ListSkeleton';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Colors, { withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Typography, Radius } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import LearnHubService from '@/src/services/LearnHubService';
import LearnProgressService from '@/src/services/LearnProgressService';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import BottomButton from '@/src/screens/common/atomic/BottomButton';
import { themed } from '@/src/utils/ThemedStyles';

const MIN_SOLVED = 5;
/** 한 회차 문항 수 — 안내 문구와 출제 수를 같은 값으로 묶는다 */
const QUIZ_COUNT = 10;

/**
 * 약점 집중 코스
 * - 통계에서 정답률이 낮은 주제를 골라 집중 출제
 */
const WeakFocus = () => {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(true);
	const [started, setStarted] = useState(false);
	const [weakKeys, setWeakKeys] = useState<string[]>([]);

	useEffect(() => {
		let alive = true;
		LearnProgressService.getStats().then((s) => {
			if (!alive) return;
			const ranked = Object.entries(s.byDomain)
				.filter(([, d]) => d.solved >= MIN_SOLVED)
				.map(([key, d]) => ({ key, acc: d.correct / d.solved }))
				.sort((a, b) => a.acc - b.acc)
				.slice(0, 2)
				.map((x) => x.key);
			setWeakKeys(ranked);
			setLoading(false);
		});
		return () => {
			alive = false;
		};
	}, []);

	const accent = weakKeys[0] ? LearnHubService.getDomain(weakKeys[0]).meta.color : Colors.error;

	if (loading) {
		return (
			<SafeAreaView style={styles.safe} edges={[]}>
				<CommonHeader title={t('special.weakFocus.title')} onBack={() => router.back()} />
				<ListSkeleton />
			</SafeAreaView>
		);
	}

	if (started) {
		return (
			<LearnQuizPlayer
				title={t('special.weakFocus.playerTitle')}
				accent={accent}
				modeLabel={t('special.weakFocus.resultLabel')}
				mode="weak"
				generate={() => LearnHubService.generateFocusedQuiz(weakKeys, QUIZ_COUNT)}
			/>
		);
	}

	const hasWeak = weakKeys.length > 0;

	return (
		<SafeAreaView style={styles.safe} edges={[]}>
			<CommonHeader title={t('special.weakFocus.title')} onBack={() => router.back()} />

			<View style={styles.introWrap}>
				<FadeInUp>
				<View style={[styles.introIcon, { backgroundColor: withAlpha(accent, '14'), alignSelf: 'center' }]}>
					<IconComponent type="materialIcons" name="track-changes" size={scaledSize(42)} color={accent} />
				</View>
				<Text style={styles.introTitle} numberOfLines={1} ellipsizeMode="tail">{hasWeak ? t('special.weakFocus.weakTitle') : t('special.weakFocus.emptyTitle')}</Text>
				<Text style={styles.introDesc}>
					{hasWeak
						? t('special.weakFocus.weakDesc', { count: QUIZ_COUNT })
						: t('special.weakFocus.emptyDesc')}
				</Text>

				{hasWeak && (
					<View style={styles.chipRow}>
						{weakKeys.map((k) => (
							<View key={k} style={[styles.chip, { backgroundColor: withAlpha(LearnHubService.getDomain(k).meta.color, '14') }]}>
								<Text style={[styles.chipText, { color: LearnHubService.getDomain(k).meta.color }]} numberOfLines={1} ellipsizeMode="tail">{LearnHubService.getDomainTitle(k)}</Text>
							</View>
						))}
					</View>
				)}

				</FadeInUp>
			</View>

			{/* 주 액션은 엄지 도달 범위인 하단 고정 바로 통일 */}
			<BottomButton label={t('special.weakFocus.start')} icon="arrow-forward" color={accent} onPress={() => setStarted(true)} />
		</SafeAreaView>
	);
};

export default WeakFocus;

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.background },
	introWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxxl },
	introIcon: { width: scaleWidth(92), height: scaleWidth(92), borderRadius: Radius.xxl, justifyContent: 'center', alignItems: 'center', marginBottom: SpacingV.xxl },
	introTitle: { fontSize: Typography.h2, fontWeight: '900', color: Colors.textStrong, textAlign: 'center' },
	introDesc: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: SpacingV.md, lineHeight: scaleHeight(21) },
	chipRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: SpacingV.lg, flexWrap: 'wrap', justifyContent: 'center' },
	chip: { paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm, borderRadius: Radius.md },
	chipText: { fontSize: Typography.body, fontWeight: '800' },
}));
