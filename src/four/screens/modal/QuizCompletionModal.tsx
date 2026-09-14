import FourImages from '@/src/four/assets/FourImages';
// QuizCompletionModal.tsx 수정

import { scaleWidth, scaleHeight, scaledSize, MODAL_MAX_WIDTH, MODAL_STAGE_WIDTH } from '@/src/four/utils';
import AppModal from '@/src/four/screens/common/atomic/AppModal';
import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    ScrollView,
} from 'react-native';
import FastImage from '@/src/four/components/FastImage';
import Confetti from '@/src/four/components/Confetti';
import IconComponent from '../common/atomic/IconComponent';
import CircularProgress from '@/src/four/components/CircularProgress';
import { Typography, FontWeight, Spacing, SpacingV, Radius } from '@/src/four/const/ConstDesign';
import { Colors } from '@/src/four/const/ConstColors';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';
import type { LifeType } from '@/src/types/data/LifeType';

interface QuizCompletionModalProps {
    visible: boolean;
    isPracticeMode?: boolean;
    correct: number;
    wrong: number;
    total: number;
    accuracy: number;
    /** 번개·콤보 보너스 — 일반 모드에서 판이 끝나면 다리(LifeBridge)가 돌려준다 */
    bonus?: LifeType.QuizBonus | null;
    onConfirm: () => void;
    onRetry?: () => void; // ✅ 추가
}

const QuizCompletionModal: React.FC<QuizCompletionModalProps> = ({
    visible,
    isPracticeMode = false,
    correct,
    wrong,
    total,
    accuracy,
    bonus,
    onConfirm,
    onRetry, // ✅ 추가
}) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const mascotBounce = useRef(new Animated.Value(0)).current;
    const confettiKey = useRef(Math.random()).current;
    // 반복 애니메이션은 핸들을 잡아두고 cleanup에서 stop() 해야 확실히 멈춘다
    const bounceLoopRef = useRef<Animated.CompositeAnimation | null>(null);
    const enterAnimRef = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
        if (visible) {
            scaleAnim.setValue(0);
            fadeAnim.setValue(0);
            enterAnimRef.current = Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    bounciness: 8,
                    speed: 12,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]);
            enterAnimRef.current.start(({ finished }) => {
                if (!finished) {
                    return;
                }
                bounceLoopRef.current = Animated.loop(
                    Animated.sequence([
                        Animated.timing(mascotBounce, {
                            toValue: -10,
                            duration: 600,
                            useNativeDriver: true,
                        }),
                        Animated.timing(mascotBounce, {
                            toValue: 0,
                            duration: 600,
                            useNativeDriver: true,
                        }),
                    ])
                );
                bounceLoopRef.current.start();
            });
        }
        // ✅ 언마운트/visible 변경 시 애니메이션 정리 (메모리 누수 방지)
        return () => {
            enterAnimRef.current?.stop();
            enterAnimRef.current = null;
            bounceLoopRef.current?.stop();
            bounceLoopRef.current = null;
            scaleAnim.stopAnimation();
            fadeAnim.stopAnimation();
            mascotBounce.stopAnimation();
        };
    }, [visible]);

    const getPerformanceMessage = () => {
        if (accuracy >= 90) return '완벽합니다!';
        if (accuracy >= 80) return '정말 잘했습니다!';
        if (accuracy >= 70) return '훌륭합니다!';
        if (accuracy >= 60) return '좋습니다!';
        return '수고했습니다!';
    };

    const getPerformanceEmoji = () => {
        if (accuracy >= 90) return '🏆';
        if (accuracy >= 80) return '🎉';
        if (accuracy >= 70) return '👏';
        if (accuracy >= 60) return '😊';
        return '💪';
    };

    // ✅ 정확도에 따른 색상 결정 (정답 계열은 success 시맨틱 토큰으로 통일)
    const getAccuracyColor = () => {
        if (accuracy >= 80) return Colors.success;
        if (accuracy >= 70) return Colors.warning;
        return Colors.error;
    };

    if (!isPracticeMode) {
        return (
			<AppModal visible={visible} transparent animationType="fade" onRequestClose={onConfirm}>
                <View style={styles.modalOverlay}>
                    <Confetti
                        key={confettiKey}
                        count={150}
                        origin={{ x: MODAL_STAGE_WIDTH / 2, y: 0 }}
                        fadeOut
                        autoStart
                        explosionSpeed={400}
                    />

                    <Animated.View
                        style={[
                            styles.completionModal,
                            {
                                transform: [{ scale: scaleAnim }],
                                opacity: fadeAnim,
                            },
                        ]}>

                        <View style={styles.bgCircle1} />
                        <View style={styles.bgCircle2} />

                        {/* 정답률/스코어가 붙어 세로가 길어졌다 — 작은 기기에서 잘리지 않게 스크롤 */}
                        <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.completionHeader}>
                            <Animated.View
                                style={{
                                    transform: [{ translateY: mascotBounce }],
                                }}>
                                <View style={styles.mascotContainer}>
									<FastImage
										source={FourImages.screen_fox_quiz_complete}
                                        style={styles.completionMascot}
                                        resizeMode={FastImage.resizeMode.contain}
                                    />
                                </View>
                            </Animated.View>

                            {/* 결과와 무관하게 '완벽합니다!'가 고정으로 뜨던 문제 수정 — 정답률에 맞춰 표시 */}
                            <Text style={styles.completionTitle}>
                                {getPerformanceMessage()} {getPerformanceEmoji()}
                            </Text>
                            <Text style={styles.completionSubtitle}>
                                모든 퀴즈를 정복했습니다
                            </Text>
                        </View>

                        {/* 계산해서 넘겨받은 정답률/정답·오답을 실제로 보여준다 */}
                        <View style={styles.accuracyCircleContainer}>
                            <CircularProgress
                                size={scaleWidth(120)}
                                width={scaleWidth(9)}
                                fill={accuracy}
                                tintColor={getAccuracyColor()}
                                backgroundColor={Colors.surfaceAlt}
                                duration={1500}
                                rotation={0}>
                                {() => (
                                    <View style={styles.accuracyInner}>
                                        <Text style={[styles.accuracyPercentage, { color: getAccuracyColor() }]} numberOfLines={1}>
                                            {accuracy}%
                                        </Text>
                                        <Text style={styles.accuracyLabel} numberOfLines={1}>정답률</Text>
                                    </View>
                                )}
                            </CircularProgress>
                        </View>

                        <View style={styles.scoreCardsContainer}>
                            <View style={[styles.scoreCard, styles.scoreCardTotal]}>
                                <Text style={styles.scoreCardLabel}>총 문제</Text>
                                <Text style={styles.scoreCardValue}>{total}</Text>
                            </View>
                            <View style={[styles.scoreCard, styles.scoreCardCorrect]}>
                                <Text style={styles.scoreCardLabel}>정답</Text>
                                <Text style={[styles.scoreCardValue, { color: Colors.success }]}>{correct}</Text>
                            </View>
                            <View style={[styles.scoreCard, styles.scoreCardWrong]}>
                                <Text style={styles.scoreCardLabel}>오답</Text>
                                <Text style={[styles.scoreCardValue, { color: Colors.error }]}>{wrong}</Text>
                            </View>
                        </View>

                        {/* 번개·콤보 보너스 — 하나라도 있을 때만 줄을 둔다 */}
                        {!!bonus && (bonus.fast > 0 || bonus.maxCombo > 1) && (
                            <View style={styles.bonusRow}>
                                <View style={styles.bonusChip}>
                                    <IconComponent type="materialCommunityIcons" name="lightning-bolt" size={14} color={Colors.accentAmber} />
                                    <Text style={styles.bonusChipText}>번개 {bonus.fast}</Text>
                                </View>
                                <View style={styles.bonusChip}>
                                    <IconComponent type="materialCommunityIcons" name="fire" size={14} color={Colors.accentOrange} />
                                    <Text style={styles.bonusChipText}>최대 콤보 {bonus.maxCombo}</Text>
                                </View>
                                {bonus.coins > 0 && (
                                    <View style={[styles.bonusChip, styles.bonusChipCoin]}>
                                        <IconComponent type="materialCommunityIcons" name="circle-multiple" size={14} color={Colors.accentAmber} />
                                        <Text style={styles.bonusChipText}>보너스 +{bonus.coins}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                        </ScrollView>

                        <View style={styles.practiceButtonRow}>
                            {onRetry && (
                                <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
                                    <Text style={styles.retryButtonText}>다시 풀기</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.confirmButton, { flex: 1, paddingHorizontal: Spacing.lg, alignItems: 'center' }]}
                                onPress={onConfirm}
                                activeOpacity={0.8}>
                                <Text style={styles.confirmButtonText}>홈으로 가기</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </AppModal>
        );
    }

    // ✅ 연습 모드 - AnimatedCircularProgress 적용
    return (
		<AppModal visible={visible} transparent animationType="fade" onRequestClose={onConfirm}>
            <View style={styles.modalOverlay}>
                {accuracy >= 80 && (
                    <Confetti
                        key={confettiKey}
                        count={100}
                        origin={{ x: MODAL_STAGE_WIDTH / 2, y: 0 }}
                        fadeOut
                        autoStart
                        explosionSpeed={350}
                    />
                )}

                <Animated.View
                    style={[
                        styles.practiceModal,
                        {
                            transform: [{ scale: scaleAnim }],
                            opacity: fadeAnim,
                        },
                    ]}>

                    <View style={styles.practiceBgGradient} />

                    <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.practiceHeader}>
                        <Animated.View
                            style={{
                                transform: [{ translateY: mascotBounce }],
                            }}>
                            <View style={styles.practiceMascotContainer}>
                                <Text style={styles.practiceEmoji}>
                                    {getPerformanceEmoji()}
                                </Text>
                            </View>
                        </Animated.View>

                        <Text style={styles.practiceTitle}>
                            {getPerformanceMessage()}
                        </Text>
                        <Text style={styles.practiceSubtitle}>
                            연습 완료!
                        </Text>
                    </View>

                    {/* ✅ AnimatedCircularProgress로 교체 */}
                    <View style={styles.accuracyCircleContainer}>
                        <CircularProgress
                            size={scaleWidth(140)}
                            width={scaleWidth(10)}
                            fill={accuracy}
                            tintColor={getAccuracyColor()}
                            backgroundColor={Colors.surfaceAlt}
                            duration={1500}
                            rotation={0}
                        >
                            {() => (
                                <View style={styles.accuracyInner}>
                                    <Text style={[styles.accuracyPercentage, { color: getAccuracyColor() }]} numberOfLines={1}>
                                        {accuracy}%
                                    </Text>
                                    <Text style={styles.accuracyLabel} numberOfLines={1}>정답률</Text>
                                </View>
                            )}
                        </CircularProgress>
                    </View>

                    <View style={styles.scoreCardsContainer}>
                        <View style={[styles.scoreCard, styles.scoreCardTotal]}>
                            <View style={styles.scoreCardIcon}>
                                <IconComponent
                                    type="FontAwesome6"
                                    name="book-open"
                                    size={scaledSize(20)}
                                    color={Colors.primary}
                                />
                            </View>
                            <Text style={styles.scoreCardLabel}>총 문제</Text>
                            <Text style={styles.scoreCardValue}>{total}</Text>
                        </View>

                        <View style={[styles.scoreCard, styles.scoreCardCorrect]}>
                            <View style={styles.scoreCardIcon}>
                                <IconComponent
                                    type="MaterialIcons"
                                    name="check-circle"
                                    size={scaledSize(20)}
                                    color={Colors.success}
                                />
                            </View>
                            <Text style={styles.scoreCardLabel}>정답</Text>
                            <Text style={[styles.scoreCardValue, { color: Colors.success }]}>
                                {correct}
                            </Text>
                        </View>

                        <View style={[styles.scoreCard, styles.scoreCardWrong]}>
                            <View style={styles.scoreCardIcon}>
                                <IconComponent
                                    type="MaterialIcons"
                                    name="cancel"
                                    size={scaledSize(20)}
                                    color={Colors.error}
                                />
                            </View>
                            <Text style={styles.scoreCardLabel}>오답</Text>
                            <Text style={[styles.scoreCardValue, { color: Colors.error }]}>
                                {wrong}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.practiceInfoBox}>
                        <IconComponent
                            type="MaterialIcons"
                            name="info-outline"
                            size={scaledSize(16)}
                            color={Colors.textSecondary}
                            style={{ marginRight: Spacing.sm }}
                        />
                        <Text style={styles.practiceInfoText}>
                            연습 모드는 점수와 뱃지가 기록되지 않습니다
                        </Text>
                    </View>
                    </ScrollView>
                    <View style={styles.practiceButtonRow}>
                        {onRetry && (
                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={onRetry}
                                activeOpacity={0.8}>
                                <Text style={styles.retryButtonText}>다시 풀기</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.practiceConfirmButton}
                            onPress={onConfirm}
                            activeOpacity={0.8}>
                            <Text style={styles.practiceConfirmText}>확인</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </AppModal>
    );
};

export default QuizCompletionModal;

const makeStyles = () => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: Colors.scrim,
        justifyContent: 'center',
        alignItems: 'center',
    },

    completionModal: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        width: '88%',
        maxWidth: Math.min(scaleWidth(380), MODAL_MAX_WIDTH),
        maxHeight: '90%',
        paddingVertical: SpacingV.xxxl,
        paddingHorizontal: Spacing.xxxl,
        alignItems: 'center',
        overflow: 'hidden',
    },
    // flexShrink 가 없으면 maxHeight 부모 안에서 스크롤되지 않고 그냥 잘린다
    modalBody: { width: '100%', flexShrink: 1 },
    modalBodyContent: { alignItems: 'center' },
    bgCircle1: {
        position: 'absolute',
        top: -scaleWidth(60),
        right: -scaleWidth(60),
        width: scaleWidth(200),
        height: scaleWidth(200),
        borderRadius: Radius.pill,
        backgroundColor: Colors.accentOrangeBg,
        opacity: 0.6,
    },
    bgCircle2: {
        position: 'absolute',
        bottom: -scaleWidth(80),
        left: -scaleWidth(80),
        width: scaleWidth(240),
        height: scaleWidth(240),
        borderRadius: Radius.pill,
        backgroundColor: Colors.secondaryBg,
        opacity: 0.5,
    },
    completionHeader: {
        alignItems: 'center',
        marginBottom: SpacingV.xxxxl,
        zIndex: 1,
    },
    mascotContainer: {
        width: scaleWidth(120),
        height: scaleWidth(120),
        borderRadius: scaleWidth(60),
        backgroundColor: Colors.warningSoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SpacingV.xxl,
    },
    completionMascot: {
		width: scaleWidth(108),
		height: scaleWidth(108),
    },
    completionTitle: {
        // display(34pt)는 모달 폭에서 두 줄로 깨졌다 — 한 줄에 들어오는 크기로 낮춘다
        fontSize: Typography.h2,
        lineHeight: scaledSize(32),
        fontWeight: FontWeight.heavy,
        color: Colors.textStrong,
        marginBottom: SpacingV.sm,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    completionSubtitle: {
        fontSize: Typography.body,
        color: Colors.textSecondary,
        textAlign: 'center',
        fontWeight: FontWeight.medium,
        marginBottom: SpacingV.md,
    },
    achievementBadge: {
        // 앰버 원색 위 오렌지 글씨는 두 테마 모두 대비가 안 나온다 — 틴트 배경 + 진한 앰버 글씨로
        backgroundColor: Colors.warningSoft,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: SpacingV.md,
        borderRadius: Radius.xl,
        marginTop: SpacingV.sm,
    },
    achievementText: {
        fontSize: Typography.subtitle,
        fontWeight: FontWeight.bold,
        color: Colors.warningDeep,
    },
    // 완료 확인은 파괴적 동작이 아니다 — 연습 모드 확인 버튼과 같은 기본 액션 색/규격을 쓴다
    confirmButton: {
        backgroundColor: Colors.secondarySurface,
        borderRadius: Radius.xxl,
        paddingVertical: SpacingV.lg,
        zIndex: 1,
    },
    confirmButtonText: {
    	flexShrink: 1,
        fontSize: Typography.subtitle,
        fontWeight: FontWeight.bold,
        color: Colors.textInverse,
        letterSpacing: 0.3,
    },

    practiceModal: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        width: '88%',
        maxWidth: Math.min(scaleWidth(400), MODAL_MAX_WIDTH),
        maxHeight: '90%',
        paddingVertical: SpacingV.xxxl,
        paddingHorizontal: Spacing.xxl,
        alignItems: 'center',
        overflow: 'hidden',
    },
    practiceBgGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: scaleHeight(180),
        backgroundColor: Colors.background,
        opacity: 0.5,
    },
    practiceHeader: {
        alignItems: 'center',
        marginBottom: SpacingV.xxl,
        zIndex: 1,
    },
    practiceMascotContainer: {
        width: scaleWidth(90),
        height: scaleWidth(90),
        borderRadius: scaleWidth(45),
        // surface 는 모달 배경과 같은 색이라 원이 보이지 않았다 — 일반 완료 모달과 같은 틴트로
        backgroundColor: Colors.warningSoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SpacingV.lg,
    },
    practiceEmoji: {
        fontSize: Typography.hero,
        color: Colors.text,
    },
    // 일반 완료 모달의 제목/부제와 같은 역할이므로 같은 토큰을 쓴다
    practiceTitle: {
        fontSize: Typography.h2,
        lineHeight: scaledSize(32),
        fontWeight: FontWeight.heavy,
        color: Colors.textStrong,
        marginBottom: SpacingV.xs,
        textAlign: 'center',
    },
    practiceSubtitle: {
        fontSize: Typography.body,
        color: Colors.textSecondary,
        textAlign: 'center',
        fontWeight: FontWeight.medium,
    },
    accuracyCircleContainer: {
        marginVertical: SpacingV.lg,
        zIndex: 1,
    },
    // 원 안쪽 — 링 두께를 뺀 폭 안에서만 그려야 글자가 링을 넘지 않는다
    accuracyInner: {
        width: scaleWidth(96),
        justifyContent: 'center',
        alignItems: 'center',
    },
    // h1(28pt) + adjustsFontSizeToFit 조합이 lineHeight와 어긋나 글자가 링에 닿고 줄이 어긋났다.
    // 링 안에 여유 있게 들어가는 크기로 낮추고, 안드로이드 폰트 여백도 없앤다.
    accuracyPercentage: {
        fontSize: Typography.h2,
        lineHeight: scaledSize(30),
        fontWeight: FontWeight.heavy,
        textAlign: 'center',
        includeFontPadding: false,
    },
    accuracyLabel: {
        fontSize: Typography.caption,
        lineHeight: scaledSize(14),
        color: Colors.textSecondary,
        fontWeight: FontWeight.semibold,
        textAlign: 'center',
        includeFontPadding: false,
        marginTop: SpacingV.xxs,
    },
    scoreCardsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: SpacingV.xl,
        zIndex: 1,
    },
    scoreCard: {
        flex: 1,
        marginHorizontal: Spacing.xs,
        backgroundColor: Colors.background,
        borderRadius: Radius.lg,
        paddingVertical: SpacingV.lg,
        paddingHorizontal: Spacing.sm,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    // 총 문제는 중립, 정답은 success, 오답은 error — 셋이 모두 같은 파란 틴트라 구분이 되지 않던 문제 수정
    scoreCardTotal: {
        borderColor: Colors.secondarySoft,
        backgroundColor: Colors.secondaryBg,
    },
    scoreCardCorrect: {
        borderColor: Colors.success,
        backgroundColor: Colors.successSoft,
    },
    scoreCardWrong: {
        borderColor: Colors.error,
        backgroundColor: Colors.errorSoft,
    },
    scoreCardIcon: {
        marginBottom: SpacingV.sm,
    },
    bonusRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: Spacing.sm,
        width: '100%',
        marginTop: -SpacingV.sm,
        marginBottom: SpacingV.xl,
        zIndex: 1,
    },
    bonusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        height: scaleHeight(30),
        borderRadius: Radius.pill,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    bonusChipCoin: {
        backgroundColor: Colors.accentAmberSoft,
        borderColor: Colors.accentAmberSoft,
    },
    bonusChipText: {
        fontSize: Typography.bodySm,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    scoreCardLabel: {
        fontSize: Typography.footnote,
        color: Colors.textSecondary,
        fontWeight: FontWeight.semibold,
        marginBottom: SpacingV.xs,
    },
    scoreCardValue: {
        fontSize: Typography.h2,
        fontWeight: FontWeight.heavy,
        color: Colors.text,
    },
    practiceInfoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        paddingVertical: SpacingV.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.md,
        marginBottom: SpacingV.xl,
        width: '100%',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    practiceInfoText: {
        fontSize: Typography.bodySm,
        color: Colors.textSecondary,
        fontWeight: FontWeight.medium,
        flex: 1,
    },
    practiceConfirmText: {
        fontSize: Typography.subtitle,
        fontWeight: FontWeight.bold,
        color: Colors.textInverse,
    },
    practiceButtonRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        width: '100%',
    },
    retryButton: {
        flex: 1,
        backgroundColor: Colors.secondaryBg,
        borderRadius: Radius.xxl,
        paddingVertical: SpacingV.lg,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    retryButtonText: {
    	flexShrink: 1,
        fontSize: Typography.subtitle,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    // practiceConfirmButton도 flex: 1 추가
    practiceConfirmButton: {
        flex: 1,                          // ✅ 추가
        backgroundColor: Colors.secondarySurface,
        borderRadius: Radius.xxl,
        paddingVertical: SpacingV.lg,
        alignItems: 'center',             // ✅ center로 변경
    },
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
