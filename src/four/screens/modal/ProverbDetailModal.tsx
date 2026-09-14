/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import AppModal from '@/src/four/screens/common/atomic/AppModal';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome6';
import IconComponent from '../common/atomic/IconComponent';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MODAL_MAX_WIDTH, scaledSize, scaleWidth, scaleHeight } from '@/src/four/utils';
import type { MainDataType } from '@/src/four/types/MainDataType';
import { getFavorites, toggleFavorite } from '@/src/four/utils/favoriteUtils';
import FavoriteToast from '../common/FavoriteToast';
import ProverbDetailContent from '../common/ProverbDetailContent';
import { useHangulReading } from '@/src/four/hooks/useHangulReading';
import { Typography, FontWeight, Spacing, SpacingV, Radius, HitSlop } from '@/src/four/const/ConstDesign';
import { Colors } from '@/src/four/const/ConstColors';
import PopInView from '../common/atomic/PopInView';
import ProverbShareCard from '../common/ProverbShareCard';
import useProverbShare from '@/src/four/hooks/useProverbShare';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';
import { getHanjaTextStyle } from '@/src/four/const/ConstHanjaFont';

interface ProverbDetailModalProps {
	visible: boolean;
	proverb: MainDataType.ProverbType | null;
	onClose: () => void;
	onFavoriteChange?: () => void; // ✅ 즐겨찾기 변경 알림 콜백 추가
}

const ProverbDetailModal: React.FC<ProverbDetailModalProps> = ({ visible, proverb, onClose, onFavoriteChange }) => {
	const [isFavorite, setIsFavorite] = useState(false);
	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState('');
	const { showHangul } = useHangulReading();
	const { cardRef, sharing, shareProverb } = useProverbShare();
	// AppModal 이 화면 전체를 덮으므로 85% 높이 카드가 상태바·내비게이션바에 물릴 수 있다
	const insets = useSafeAreaInsets();

	// ✅ useEffect를 early return 위로 올림
	useEffect(() => {
		if (visible && proverb) {
			loadFavoriteStatus();
		}
	}, [visible, proverb]);

	const handleToggleFavorite = async () => {
		if (!proverb) {
			return;
		}
		const isNowFavorite = await toggleFavorite(proverb.id);

		// 즐겨찾기 상태 즉시 업데이트
		setIsFavorite(isNowFavorite);

		// ✅ 부모에게 즐겨찾기 변경 알림
		onFavoriteChange?.();

		// 해제할 때도 피드백이 있어야 눌린 게 맞는지 알 수 있다.
		setToastMessage(isNowFavorite ? '즐겨찾기 추가!' : '즐겨찾기 제거');
		setShowToast(true);
	};

	// ✅ 즐겨찾기 상태 로드
	const loadFavoriteStatus = async () => {
		if (!proverb) {
			return;
		}
		const favorites = await getFavorites();
		setIsFavorite(favorites.includes(proverb.id));
	};

	if (!proverb) {
		return null;
	}

	return (
		<>
			<AppModal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
				<View style={[styles.modalOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
					<PopInView style={styles.modalContainer}>
						{/* ✅ 블루 헤더 밴드 */}
						<View style={styles.modalHeader}>
							<TouchableOpacity hitSlop={HitSlop} style={styles.headerFavoriteButton} onPress={handleToggleFavorite} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}>
								<Icon name="star" solid={isFavorite} size={scaledSize(18)} color={isFavorite ? Colors.warningBright : Colors.darkOnPanelSub} />
							</TouchableOpacity>
							<View style={styles.headerTitleWrap}>
								<Text style={styles.headerHanja}>{proverb.hanja}</Text>
								{(showHangul || !proverb.hanja?.trim()) && <Text style={styles.headerHangul}>{proverb.hangul}</Text>}
							</View>
							<View style={styles.headerActions}>
								<TouchableOpacity
									hitSlop={HitSlop}
									style={styles.headerActionButton}
									onPress={() => shareProverb(proverb)}
									disabled={sharing}
									activeOpacity={0.7}
									accessibilityRole="button"
									accessibilityLabel="한자어 카드 이미지로 공유">
									<IconComponent
										type="materialCommunityIcons"
										name="share-variant"
										size={17}
										color={sharing ? Colors.darkOnPanelMuted : Colors.textInverse}
									/>
								</TouchableOpacity>
								<TouchableOpacity hitSlop={HitSlop} style={styles.headerActionButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="닫기">
									{/* 닫기는 앱의 다른 모든 모달과 같은 MaterialIcons 로 맞춘다 (FontAwesome6 은 기기에 따라 물음표로 찍혔다) */}
									<IconComponent type="materialIcons" name="close" size={20} color={Colors.textInverse} />
								</TouchableOpacity>
							</View>
						</View>

						<ScrollView
							// flexShrink 가 없으면 maxHeight 85% 안에서 스크롤되지 않고 아래가 잘린다
							style={styles.modalScroll}
							contentContainerStyle={styles.modalBody}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							keyboardDismissMode="on-drag">
							<ProverbDetailContent proverb={proverb} />
						</ScrollView>

						<TouchableOpacity style={styles.modalCloseButton} onPress={onClose} activeOpacity={0.85}>
							<Text style={styles.modalCloseButtonText}>닫기</Text>
						</TouchableOpacity>
					</PopInView>
					<FavoriteToast visible={showToast} message={toastMessage} onHide={() => setShowToast(false)} bottom={insets.bottom + scaleHeight(60)} />

					{/* 공유 이미지 캡처용 — 화면 밖에 둬야 캡처 시점에 이미 그려져 있다 */}
					<View style={styles.captureHost} pointerEvents="none">
						<ProverbShareCard ref={cardRef} proverb={proverb} />
					</View>
				</View>
			</AppModal>
		</>
	);
};

export default ProverbDetailModal;

const makeStyles = () => StyleSheet.create({
	modalOverlay: {
		flex: 1,
		backgroundColor: Colors.scrim,
		justifyContent: 'center',
		alignItems: 'center',
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
	},
	headerActionButton: {
		alignItems: 'center',
		justifyContent: 'center',
		width: scaleWidth(28),
		height: scaleWidth(28),
	},
	// 캡처 전용 호스트 — 화면 밖으로 밀어 두되 언마운트하지 않는다
	captureHost: {
		position: 'absolute',
		left: -scaleWidth(1000),
		top: 0,
		opacity: 0,
	},
	modalContainer: {
		width: '88%',
		maxWidth: MODAL_MAX_WIDTH,
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		overflow: 'hidden',
		maxHeight: '85%',
	},
	// ✅ 블루 헤더 밴드
	modalHeader: {
		backgroundColor: Colors.secondarySurface,
		paddingTop: SpacingV.xl,
		paddingBottom: SpacingV.lg,
		paddingHorizontal: Spacing.lg,
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerFavoriteButton: {
		width: scaleWidth(34),
		height: scaleWidth(34),
		borderRadius: Radius.lg,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.darkCardBorder,
	},
	headerTitleWrap: {
		flex: 1,
		alignItems: 'center',
		paddingHorizontal: Spacing.sm,
	},
	headerHanja: { ...getHanjaTextStyle(),
		fontSize: Typography.h3,
		fontWeight: FontWeight.bold,
		color: Colors.textInverse,
		textAlign: 'center',
		letterSpacing: 1,
	},
	headerHangul: {
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.semibold,
		color: Colors.textInverse,
		textAlign: 'center',
		marginTop: SpacingV.xs,
	},
	modalScroll: {
		flexShrink: 1,
	},
	modalBody: {
		paddingHorizontal: Spacing.xl,
		paddingTop: SpacingV.lg,
		paddingBottom: SpacingV.xl,
	},
	badgeRow: {
		flexDirection: 'row',
		gap: Spacing.sm,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: SpacingV.lg,
	},
	levelBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: Radius.lg,
		paddingVertical: SpacingV.xs,
		paddingHorizontal: Spacing.md,
	},
	levelBadgeText: {
		fontSize: Typography.bodySm,
		color: Colors.textInverse,
		fontWeight: FontWeight.bold,
		marginLeft: Spacing.sm,
	},
	badge2: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.xs,
		borderRadius: Radius.lg,
	},
	badgeText: {
		color: Colors.textInverse,
		fontSize: Typography.footnote,
		fontWeight: FontWeight.bold,
	},
	// ✅ 한자 글자 카드 그리드
	modalCharacterGrid: {
		flexDirection: 'row',
		justifyContent: 'center',
		flexWrap: 'nowrap', // ✅ 가로 한 줄 고정 (줄바꿈 방지)
		alignItems: 'stretch',
		marginBottom: SpacingV.xl,
		gap: Spacing.sm,
	},
	characterCard: {
		flex: 1, // ✅ 글자 수와 무관하게 한 줄에 균등 분할
		minWidth: 0, // ✅ flex 항목이 콘텐츠보다 작게 줄어들 수 있도록
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
	// ✅ 섹션 카드
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
	modalCloseButton: {
		backgroundColor: Colors.secondarySurface,
		paddingVertical: SpacingV.lg,
		alignItems: 'center',
	},
	modalCloseButtonText: {
		flexShrink: 1,
		color: Colors.textInverse,
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
	},
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
