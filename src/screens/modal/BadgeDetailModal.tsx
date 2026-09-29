import React, { useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppModal from '@/src/screens/common/atomic/AppModal';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import LottieBox from '@/src/screens/common/atomic/LottieBox';
import Colors, { withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth, scaleArt } from '@/src/utils';
import { RARITY_META } from '@/src/const/ConstAchievements';
import { AchievementStatus } from '@/src/services/AchievementService';
import DateUtils from '@/src/utils/DateUtils';
import { shareBadge } from '@/src/utils/BadgeShare';
import { themed } from '@/src/utils/ThemedStyles';

const LOTTIE_STAR = require('@/src/assets/lottie/star.json');
/** 영웅·전설은 아이콘 테두리를 두껍게 + 그라디언트로 차등 */
const HIGH_RARITY = new Set(['epic', 'legend']);

interface Props {
	badge: AchievementStatus | null;
	onClose: () => void;
	/** 공유 문구에 넣을 전체 수집 현황 (없으면 뱃지 이름만 공유) */
	unlockedCount?: number;
	totalCount?: number;
}

/**
 * 뱃지 상세 팝업 (홈 뱃지 목록·도감 / 내 활동 뱃지 목록 공용)
 * - 희귀도 색상, 진행률, 획득일을 한 장으로 보여준다.
 */
const BadgeDetailModal: React.FC<Props> = ({ badge, onClose, unlockedCount, totalCount }) => {
	// 공유 시 캡처할 카드 영역
	const cardRef = useRef<View>(null);
	return (
	<AppModal visible={!!badge} transparent animationType="fade" onRequestClose={onClose}>
		<View style={styles.backdrop}>
			<TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
			{!!badge && (
				<View style={styles.modal} ref={cardRef} collapsable={false}>
					<View
						style={[
							styles.iconWrap,
							{ backgroundColor: badge.unlocked ? withAlpha(badge.def.color, '18') : Colors.surfaceAlt },
							badge.unlocked && { borderWidth: HIGH_RARITY.has(badge.def.rarity) ? 3 : 2, borderColor: RARITY_META[badge.def.rarity].color },
						]}>
						{badge.unlocked && HIGH_RARITY.has(badge.def.rarity) && (
							<LinearGradient
								colors={[withAlpha(RARITY_META[badge.def.rarity].color, '00'), withAlpha(RARITY_META[badge.def.rarity].color, '66')]}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 1 }}
								style={StyleSheet.absoluteFill}
							/>
						)}
						{badge.unlocked && <LottieBox source={LOTTIE_STAR} autoPlay loop={false} style={styles.lottie} />}
						<IconComponent type="materialIcons" name={badge.unlocked ? badge.def.icon : 'lock'} size={scaledSize(34)} color={badge.unlocked ? badge.def.color : Colors.textMuted} />
					</View>
					<Text style={styles.state}>{badge.unlocked ? '달성한 뱃지' : '진행 중인 뱃지'}</Text>
					<Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{badge.def.title}</Text>
					<View style={[styles.rarity, { backgroundColor: withAlpha(RARITY_META[badge.def.rarity].color, '18') }]}>
						<IconComponent type="materialIcons" name="auto-awesome" size={scaledSize(12)} color={RARITY_META[badge.def.rarity].color} />
						<Text style={[styles.rarityText, { color: RARITY_META[badge.def.rarity].color }]}>{RARITY_META[badge.def.rarity].label}</Text>
					</View>
					<Text style={styles.desc} numberOfLines={3} ellipsizeMode="tail">{badge.def.desc}</Text>
					<View style={styles.cond}>
						<IconComponent type="materialIcons" name="flag" size={scaledSize(14)} color={Colors.textSecondary} />
						<Text style={styles.condText}>{badge.def.cond}</Text>
					</View>
					<View style={styles.progressBox}>
						<View style={styles.progressTop}>
							<Text style={styles.progressLabel}>진행률</Text>
							<Text style={[styles.progressValue, { color: badge.def.color }]}>
								{badge.current}/{badge.def.target}{badge.def.unit ?? ''}
							</Text>
						</View>
						<View style={styles.track}>
							<View style={[styles.fill, { width: `${Math.round(badge.ratio * 100)}%`, backgroundColor: badge.def.color }]} />
						</View>
						{!!badge.unlockedAt && (
							<View style={styles.dateRow}>
								<IconComponent type="materialIcons" name="event-available" size={scaledSize(12)} color={Colors.textMuted} />
								<Text style={styles.dateText}>{DateUtils.formatTimestamp(badge.unlockedAt, 'type3')} 획득</Text>
							</View>
						)}
					</View>
					<View style={styles.btnRow}>
						{badge.unlocked && (
							<TouchableOpacity
								style={styles.shareBtn}
								activeOpacity={0.85}
								accessibilityRole="button"
								accessibilityLabel={`${badge.def.title} 뱃지 자랑하기`}
								onPress={() => shareBadge(cardRef, badge.def.title, unlockedCount, totalCount)}>
								<IconComponent type="materialIcons" name="ios-share" size={scaledSize(17)} color={Colors.primary} />
								<Text style={styles.shareText}>자랑하기</Text>
							</TouchableOpacity>
						)}
						<TouchableOpacity style={styles.close} activeOpacity={0.85} onPress={onClose}>
							<Text style={styles.closeText}>확인</Text>
						</TouchableOpacity>
					</View>
				</View>
			)}
		</View>
	</AppModal>
	);
};

export default BadgeDetailModal;

const styles = themed(() => StyleSheet.create({
	backdrop: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
	modal: { width: '100%', maxWidth: Layout.dialogMaxWidth, backgroundColor: Colors.surface, borderRadius: Radius.xl, paddingHorizontal: Spacing.xl, paddingVertical: SpacingV.xxl, alignItems: 'center' },
	iconWrap: { width: scaleArt(96), height: scaleArt(96), borderRadius: Radius.xxl, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
	lottie: { position: 'absolute', width: scaleArt(112), height: scaleArt(112) },
	state: { marginTop: SpacingV.lg, fontSize: Typography.footnote, fontWeight: '900', color: Colors.primary },
	title: { marginTop: SpacingV.xs, fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong, textAlign: 'center' },
	rarity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs, marginTop: SpacingV.sm },
	rarityText: { fontSize: Typography.footnote, fontWeight: '900' },
	desc: { marginTop: SpacingV.sm, fontSize: Typography.body, color: Colors.textSecondary, lineHeight: scaleHeight(20), textAlign: 'center' },
	cond: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'stretch', justifyContent: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.md, marginTop: SpacingV.md },
	condText: { flexShrink: 1, fontSize: Typography.body, fontWeight: '800', color: Colors.textSecondary },
	progressBox: { alignSelf: 'stretch', marginTop: SpacingV.xl, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt },
	progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SpacingV.sm },
	progressLabel: { fontSize: Typography.body, fontWeight: '800', color: Colors.textSecondary },
	progressValue: { fontSize: Typography.body, fontWeight: '900' },
	track: { height: scaleHeight(8), borderRadius: scaleWidth(4), backgroundColor: Colors.border, overflow: 'hidden' },
	fill: { height: '100%', borderRadius: scaleWidth(4) },
	dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, marginTop: SpacingV.sm },
	dateText: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textMuted },
	btnRow: { alignSelf: 'stretch', flexDirection: 'row', gap: Spacing.sm, marginTop: SpacingV.xl },
	shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: Colors.primarySoft, borderRadius: Radius.md, paddingVertical: SpacingV.lg },
	shareText: { color: Colors.primary, fontSize: Typography.callout, fontWeight: '800' },
	close: { flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: SpacingV.lg, alignItems: 'center', justifyContent: 'center' },
	closeText: { color: Colors.textInverse, fontSize: Typography.callout, fontWeight: '800' },
}));
