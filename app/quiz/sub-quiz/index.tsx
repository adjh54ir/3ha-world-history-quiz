import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import CommonHeader from '@/src/screens/common/CommonHeader';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import SectionHead from '@/src/screens/common/atomic/SectionHead';
import Colors from '@/src/const/ConstColors';
import { CardSurface, Radius, Spacing, SpacingV, Typography, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth, scaleArt } from '@/src/utils';
import LearnHubService from '@/src/services/LearnHubService';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import { getDomainIllustration } from '@/src/const/ConstIllustrationAssets';
import { themed } from '@/src/utils/ThemedStyles';

export default function SubQuizHub() {
	const { t } = useTranslation();
	const domains = LearnHubService.getSubQuizDomainList();

	return (
		<SafeAreaView style={styles.safe} edges={[]}>
			<CommonHeader title={t('quiz.common.tabSub')} onBack={() => router.back()} />

			<ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<ExpoImage source={require('@/src/assets/selection/quiz-sub-hero.webp')} style={styles.heroBanner} contentFit="cover" accessible={false} />
				<View style={styles.introCard}>
					<View style={styles.introIcon}>
						<IconComponent type="materialIcons" name="extension" size={scaledSize(24)} color={Colors.primary} />
					</View>
					<View style={styles.introBody}>
						<Text style={styles.introTitle}>{t('quiz.sub.introTitle')}</Text>
						<Text style={styles.introText}>{t('quiz.sub.introText')}</Text>
					</View>
				</View>

				<SectionHead title={t('quiz.sub.section')} style={styles.sectionHeadWide} />
				{domains.map((domain, i) => {
					const illustration = getDomainIllustration(domain.key);
					return (
						<FadeInUp key={domain.key} delay={Math.min(i * 45, 300)}>
							<TouchableOpacity
								style={styles.card}
								activeOpacity={0.86}
								onPress={() => router.push({ pathname: '/quiz/sub-quiz/[domain]', params: { domain: domain.key } } as never)}>
								{illustration ? (
									<View style={styles.illustrationBox}>
										<ExpoImage source={illustration} style={styles.illustration} contentFit="contain" />
									</View>
								) : (
									<View style={styles.iconBox}>
										<IconComponent type={domain.iconType} name={domain.icon} size={scaledSize(24)} color={Colors.primary} />
									</View>
								)}
								<View style={styles.cardBody}>
									<View style={styles.titleRow}>
										<Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">{domain.title}</Text>
										<View style={styles.countPill}>
											<Text style={styles.countText}>{t('common.questions', { count: domain.total })}</Text>
										</View>
									</View>
									<Text style={styles.cardSubtitle} numberOfLines={2} ellipsizeMode="tail">{domain.subtitle}</Text>
								</View>
								<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
							</TouchableOpacity>
						</FadeInUp>
					);
				})}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = themed(() => StyleSheet.create({
	heroBanner: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radius.lg },
	sectionHeadWide: { paddingTop: Layout.sectionGap - Layout.itemGap },
	safe: { flex: 1, backgroundColor: Colors.background },
	content: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom, gap: Layout.itemGap },
	introCard: { ...CardSurface, borderTopWidth: scaleHeight(3), borderTopColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
	introIcon: { width: scaleWidth(50), height: scaleWidth(50), borderRadius: Radius.lg, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
	introBody: { flex: 1, gap: SpacingV.xs },
	introTitle: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textStrong },
	introText: { fontSize: Typography.body, lineHeight: scaleHeight(19), color: Colors.textSecondary },
	card: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
	iconBox: { width: scaleWidth(50), height: scaleWidth(50), borderRadius: Radius.lg, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
	illustrationBox: { width: scaleArt(76), height: scaleArt(76), borderRadius: Radius.lg, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
	illustration: { width: scaleArt(72), height: scaleArt(72) },
	cardBody: { flex: 1, gap: SpacingV.xs },
	titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm },
	cardTitle: { flexShrink: 1, fontSize: Typography.callout, fontWeight: '800', color: Colors.textStrong },
	countPill: { paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.pill, backgroundColor: Colors.primaryBg },
	countText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.primary },
	cardSubtitle: { fontSize: Typography.body, lineHeight: scaleHeight(18), color: Colors.textSecondary },
}));
