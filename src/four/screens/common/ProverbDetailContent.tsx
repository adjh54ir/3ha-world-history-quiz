/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { scaledSize, scaleWidth } from '@/src/four/utils';
import type { MainDataType } from '@/src/four/types/MainDataType';
import { formatProverbExamples } from '@/src/four/utils/ProverbExampleUtils';
import { refineCharacters } from '@/src/four/utils/HanjaDictUtils';
import IconComponent from './atomic/IconComponent';
import { CategoryBadge, LevelBadge } from './CommonProverbModule';
import { useHangulReading } from '@/src/four/hooks/useHangulReading';
import { Typography, FontWeight, Spacing, SpacingV, Radius } from '@/src/four/const/ConstDesign';
import { Colors } from '@/src/four/const/ConstColors';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';
import { getHanjaTextStyle } from '@/src/four/const/ConstHanjaFont';

/**
 * 한자어 상세 본문(공용)
 * - ProverbDetailModal 과 오늘의 퀴즈 해설에서 공통으로 사용해 표시를 100% 일치시킵니다.
 * - 헤더 밴드/즐겨찾기/닫기 등 컨테이너 요소는 호출하는 쪽에서 감쌉니다.
 */

interface ProverbDetailContentProps {
	proverb: MainDataType.ProverbType;
	/** 헤더 밴드 밖에서 쓸 때(해설 등) 한자/한글 제목을 본문 위에 표시 */
	showTitle?: boolean;
}

const ProverbDetailContent: React.FC<ProverbDetailContentProps> = ({ proverb, showTitle = false }) => {
	const { showHangul } = useHangulReading();
	/** 한자가 없는 데이터는 빈 화면 방지를 위해 독음을 항상 노출 */
	const isHangulVisible = showHangul || !proverb.hanja?.trim();

	return (
		<View>
			{showTitle && (
				<View style={styles.titleWrap}>
					<Text style={styles.titleHanja}>{proverb.hanja}</Text>
					{isHangulVisible && <Text style={styles.titleHangul}>{proverb.hangul}</Text>}
				</View>
			)}

			{/* 배지: 난이도 + 카테고리 */}
			<View style={styles.badgeRow}>
				<LevelBadge level={proverb.level} />
				<CategoryBadge category={proverb.category} />
			</View>

			{/* 한자 글자 카드 — 4자 이하는 한 줄에 꽉 채워 표시(짤림X), 5자 이상만 가로 스크롤 */}
			{(() => {
				// 새김·획수·부수는 급수 자료 기준으로 보정해서 쓴다 (한자어 데이터는 획수가 어긋난 글자가 있다)
				const characters = refineCharacters(proverb);
				const isScrollable = characters.length > 4;
				const cards = characters.map((char, idx) => {
					const { hun, eum } = char;
					return (
						<View
							key={idx}
							style={[styles.characterCard, isScrollable ? styles.characterCardScroll : styles.characterCardFit]}
						>
							<Text style={styles.charText}>{char.char}</Text>
							{/* 한 글자짜리 음이라 줄일 일이 없다 — adjustsFontSizeToFit 은 안드로이드에서 과하게 줄어들어 쓰지 않는다 */}
							{isHangulVisible && (
								<Text style={styles.hangulText} numberOfLines={1}>
									{proverb.hangul[idx]}
								</Text>
							)}
							<Text style={styles.meaningText}>
								{hun}
								{!!eum && <Text style={styles.meaningEum}> {eum}</Text>}
							</Text>
							{/* 획수·부수는 급수 자료에 있는 글자만 채워진다 — 없으면 알약을 그리지 않는다 */}
							{char.strokes > 0 && (
								<View style={styles.radicalPill}>
									<Text style={styles.radicalText}>
										{char.strokes}획{char.radical ? ` · ${char.radical}` : ''}
									</Text>
								</View>
							)}
						</View>
					);
				});
				return isScrollable ? (
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.modalCharacterScroll}
						contentContainerStyle={styles.modalCharacterGrid}
					>
						{cards}
					</ScrollView>
				) : (
					<View style={[styles.modalCharacterScroll, styles.modalCharacterRowFit]}>{cards}</View>
				);
			})()}

			{/* 의미 (강조 카드) */}
			<View style={[styles.modalSection, styles.modalSectionPrimary]}>
				<View style={styles.sectionLabelRow}>
					<View style={[styles.sectionAccent, { backgroundColor: Colors.secondarySurface }]} />
					<Text style={styles.modalLabel}>의미</Text>
				</View>
				<Text style={styles.modalTextStrong}>{proverb.meaning}</Text>
			</View>

			{/* 예시 */}
			<View style={styles.modalSection}>
				<View style={styles.sectionLabelRow}>
					<View style={[styles.sectionAccent, { backgroundColor: Colors.primary }]} />
					<Text style={styles.modalLabel}>예시</Text>
				</View>
				<Text style={styles.modalText2}>{formatProverbExamples(proverb.example)}</Text>
			</View>

			{/* 연관 키워드 */}
			{proverb.relatedWords.length > 0 && (
				<View style={styles.modalSection}>
					<View style={styles.sectionLabelRow}>
						<View style={[styles.sectionAccent, { backgroundColor: Colors.warning }]} />
						<Text style={styles.modalLabel}>연관 키워드</Text>
					</View>
					<View style={styles.tagsWrapper}>
						{proverb.relatedWords.map((word, idx) => (
							<View key={idx} style={styles.tagItem}>
								<Text style={styles.tagText}>#{word}</Text>
							</View>
						))}
					</View>
				</View>
			)}

			{/* 유래 */}
			{proverb.originWord && (
				<View style={styles.modalSection}>
					<View style={styles.sectionLabelRow}>
						<View style={[styles.sectionAccent, { backgroundColor: Colors.accentOrange }]} />
						<Text style={styles.modalLabel}>유래</Text>
					</View>
					<Text style={styles.modalText2}>{proverb.originWord}</Text>
				</View>
			)}
		</View>
	);
};

export default ProverbDetailContent;

const makeStyles = () => StyleSheet.create({
	titleWrap: {
		alignItems: 'center',
		marginBottom: SpacingV.lg,
	},
	titleHanja: { ...getHanjaTextStyle(),
		fontSize: Typography.h3,
		fontWeight: FontWeight.bold,
		color: Colors.textStrong,
		textAlign: 'center',
		letterSpacing: 1,
	},
	titleHangul: {
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.semibold,
		color: Colors.textSecondary,
		textAlign: 'center',
		marginTop: SpacingV.xs,
	},
	badgeRow: {
		flexDirection: 'row',
		gap: Spacing.sm,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: SpacingV.lg,
	},
	modalCharacterScroll: {
		alignSelf: 'stretch',
		marginBottom: SpacingV.xl,
	},
	modalCharacterGrid: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'stretch',
		flexGrow: 1,
		paddingHorizontal: Spacing.xs,
		gap: Spacing.sm,
	},
	modalCharacterRowFit: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'stretch',
		paddingHorizontal: Spacing.xs,
		gap: Spacing.sm,
	},
	characterCardScroll: {
		width: scaleWidth(74),
	},
	characterCardFit: {
		flex: 1,
		minWidth: 0,
	},
	characterCard: {
		alignItems: 'center',
		justifyContent: 'flex-start',
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.xxs,
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	charText: {
		fontSize: Typography.h1,
		fontWeight: FontWeight.bold,
		color: Colors.textStrong,
		marginBottom: SpacingV.xs,
	},
	hangulText: {
		fontSize: Typography.callout,
		color: Colors.secondaryDark,
		fontWeight: FontWeight.bold,
		textAlign: 'center',
		marginBottom: SpacingV.xs,
	},
	meaningText: {
		fontSize: Typography.bodySm,
		color: Colors.textDeep,
		textAlign: 'center',
		marginBottom: SpacingV.sm,
		lineHeight: scaledSize(17),
	},
	meaningEum: {
		color: Colors.textStrong,
		fontWeight: FontWeight.heavy,
	},
	radicalPill: {
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.sm,
		paddingVertical: SpacingV.xxs,
		paddingHorizontal: Spacing.sm,
	},
	radicalText: {
		fontSize: Typography.caption,
		color: Colors.textSecondary,
		textAlign: 'center',
	},
	modalSection: {
		marginBottom: SpacingV.md,
		backgroundColor: Colors.background,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.lg,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.surfaceMuted,
	},
	modalSectionPrimary: {
		backgroundColor: Colors.secondaryBg,
		borderColor: Colors.secondarySoft,
	},
	sectionLabelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: SpacingV.sm,
	},
	sectionAccent: {
		width: scaleWidth(4),
		height: scaledSize(16),
		borderRadius: Radius.xs,
		marginRight: Spacing.sm,
	},
	modalLabel: {
		fontSize: Typography.callout,
		fontWeight: FontWeight.heavy,
		color: Colors.textStrong,
	},
	modalTextStrong: {
		fontSize: Typography.subtitle,
		color: Colors.textStrong,
		fontWeight: FontWeight.bold,
		lineHeight: scaledSize(25),
	},
	modalText2: {
		fontSize: Typography.body,
		color: Colors.textDeep,
		lineHeight: scaledSize(23),
	},
	tagsWrapper: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: Spacing.sm,
		marginTop: SpacingV.xxs,
	},
	tagItem: {
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.xs,
		borderRadius: Radius.lg,
		backgroundColor: Colors.warningSoft,
	},
	tagText: {
		color: Colors.warningDeep,
		fontSize: Typography.footnote,
		fontWeight: FontWeight.bold,
	},
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
