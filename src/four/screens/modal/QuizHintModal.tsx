import React, { useEffect, useRef } from 'react';
import AppModal from '@/src/four/screens/common/atomic/AppModal';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { MODAL_MAX_WIDTH, scaledSize, scaleWidth } from '@/src/four/utils/DementionUtils';
import type { MainDataType } from '@/src/four/types/MainDataType';
import { formatProverbExamples, getProverbExamples } from '@/src/four/utils/ProverbExampleUtils';
import IconComponent from '../common/atomic/IconComponent';
import ModalCloseButton from '../common/atomic/ModalCloseButton';
import { Typography, FontWeight, Spacing, SpacingV, Radius } from '@/src/four/const/ConstDesign';
import { Colors, onSurface } from '@/src/four/const/ConstColors';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';

interface QuizHintModalProps {
	visible: boolean;
	question: MainDataType.ProverbType | null;
	onClose: () => void;
}

const QuizHintModal: React.FC<QuizHintModalProps> = ({ visible, question, onClose }) => {
	const scaleAnim = useRef(new Animated.Value(0)).current;
	const fadeAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			scaleAnim.setValue(0.92);
			fadeAnim.setValue(0);

			Animated.parallel([
				Animated.spring(scaleAnim, {
					toValue: 1,
					useNativeDriver: true,
					tension: 60,
					friction: 8,
				}),
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();
		}
		// ✅ 언마운트/visible 변경 시 애니메이션 정리 (메모리 누수 방지)
		return () => {
			scaleAnim.stopAnimation();
			fadeAnim.stopAnimation();
		};
	}, [visible]);

	return (
		<AppModal visible={visible} transparent animationType='none' onRequestClose={onClose}>
			<Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
				<Animated.View style={[styles.modal, { transform: [{ scale: scaleAnim }] }]}>
					<ModalCloseButton onPress={onClose} />
					{/* 헤더 */}
					<View style={styles.header}>
						<View style={styles.iconGlow}>
							<View style={styles.iconCircle}>
								<IconComponent type='MaterialIcons' name='lightbulb' size={scaledSize(26)} color={onSurface(Colors.warning)} />
							</View>
						</View>
						<Text style={styles.title}>힌트</Text>
						<Text style={styles.subtitle}>이런 단서들을 참고해보세요!</Text>
					</View>

					{/* 컨텐츠 */}
					<ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
						{/* 연관 단어 */}
						{question?.relatedWords && question.relatedWords.length > 0 && (
							<View style={styles.section}>
								<View style={styles.sectionLabelRow}>
									<IconComponent type='materialIcons' name='tag' size={scaledSize(14)} color={Colors.warningDark} />
									<Text style={styles.sectionLabel}>연관 단어</Text>
								</View>
								<View style={styles.tagRow}>
									{question.relatedWords.map((word, index) => (
										<View key={index} style={styles.tag}>
											<Text style={styles.tagText}>{word}</Text>
										</View>
									))}
								</View>
							</View>
						)}

						{/* 예시 */}
						{getProverbExamples(question?.example).length > 0 && (
							<View style={styles.section}>
								<View style={styles.sectionLabelRow}>
									<IconComponent type='materialIcons' name='format-quote' size={scaledSize(15)} color={Colors.warningDark} />
									<Text style={styles.sectionLabel}>사용 예시</Text>
								</View>
								<View style={styles.exampleBox}>
									<Text style={styles.exampleText}>{formatProverbExamples(question?.example)}</Text>
								</View>
							</View>
						)}

						{(!question?.relatedWords || question.relatedWords.length === 0) &&
							getProverbExamples(question?.example).length === 0 && (
								<View style={styles.emptyHint}>
									<IconComponent type='materialIcons' name='search' size={scaledSize(22)} color={Colors.textMuted} />
									<Text style={styles.emptyHintText}>이 문제는 제공되는 힌트가 없습니다.</Text>
								</View>
							)}
					</ScrollView>

					{/* 버튼 */}
					<View style={styles.footer}>
						<TouchableOpacity style={styles.confirmButton} onPress={onClose} activeOpacity={0.85}>
							<IconComponent type='materialIcons' name='check' size={scaledSize(18)} color={onSurface(Colors.warning)} />
							<Text style={styles.confirmButtonText}>확인했어요</Text>
						</TouchableOpacity>
					</View>
				</Animated.View>
			</Animated.View>
		</AppModal>
	);
};

export default QuizHintModal;

const makeStyles = () => StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: Colors.scrim,
		justifyContent: 'center',
		alignItems: 'center',
	},
	modal: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		width: '88%',
		maxWidth: MODAL_MAX_WIDTH,
		maxHeight: '80%',
		overflow: 'hidden',
	},
	header: {
		alignItems: 'center',
		gap: SpacingV.sm,
		paddingHorizontal: Spacing.xxl,
		paddingTop: SpacingV.xxl,
		paddingBottom: SpacingV.xl,
		backgroundColor: Colors.warningBg,
		borderBottomWidth: 1,
		borderBottomColor: Colors.warningPale,
	},
	iconGlow: {
		width: scaleWidth(64),
		height: scaleWidth(64),
		borderRadius: scaleWidth(32),
		backgroundColor: Colors.warningSoft,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: SpacingV.xs,
	},
	iconCircle: {
		width: scaleWidth(48),
		height: scaleWidth(48),
		borderRadius: Radius.xxl,
		backgroundColor: Colors.warning,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.heavy,
		color: Colors.warningInk,
	},
	subtitle: {
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.medium,
		color: Colors.warningDeep,
	},
	sectionLabelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.xs,
	},
	emptyHint: {
		alignItems: 'center',
		paddingVertical: SpacingV.xl,
		gap: SpacingV.sm,
	},
	emptyHintText: {
		fontSize: Typography.bodySm,
		color: Colors.textMuted,
	},
	scrollView: {
		flexGrow: 0,
		// flexShrink 가 없으면 maxHeight 80% 안에서 스크롤되지 않고 잘린다
		flexShrink: 1,
	},
	content: {
		padding: Spacing.xxl,
		gap: SpacingV.xxl,
	},
	section: {
		gap: SpacingV.md,
	},
	sectionLabel: {
		fontSize: Typography.caption,
		fontWeight: FontWeight.semibold,
		color: Colors.textMuted,
		letterSpacing: 0.8,
		textTransform: 'uppercase',
	},
	tagRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: Spacing.sm,
	},
	tag: {
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.sm,
		backgroundColor: Colors.warningSoft,
		borderRadius: scaleWidth(30),
		borderWidth: 1,
		borderColor: Colors.warningPale,
	},
	tagText: {
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.semibold,
		color: Colors.warningInk,
	},
	charGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: Spacing.sm,
	},
	charCard: {
		flex: 1,
		minWidth: scaleWidth(60),
		backgroundColor: Colors.background,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.sm,
		alignItems: 'center',
		borderWidth: 0.5,
		borderColor: Colors.border,
	},
	charText: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.medium,
		color: Colors.textStrong,
		marginBottom: SpacingV.xs,
	},
	charMeaning: {
		fontSize: Typography.caption,
		color: Colors.textSecondary,
	},
	exampleBox: {
		backgroundColor: Colors.background,
		borderRadius: Radius.md,
		paddingHorizontal: Spacing.lg,
		paddingVertical: SpacingV.lg,
		borderWidth: 0.5,
		borderColor: Colors.border,
	},
	exampleText: {
		fontSize: Typography.body,
		color: Colors.text,
		lineHeight: scaledSize(22),
		fontStyle: 'italic',
	},
	footer: {
		paddingHorizontal: Spacing.xxl,
		paddingVertical: SpacingV.lg,
		borderTopWidth: 0.5,
		borderTopColor: Colors.border,
	},
	confirmButton: {
		flexDirection: 'row',
		gap: Spacing.sm,
		backgroundColor: Colors.warning,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.lg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	confirmButtonText: {
		flexShrink: 1,
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
		// 앰버 면은 라이트·다크 모두 밝다 — 흰 글씨는 대비 2:1 이하로 뭉개진다
		color: onSurface(Colors.warning),
	},
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
