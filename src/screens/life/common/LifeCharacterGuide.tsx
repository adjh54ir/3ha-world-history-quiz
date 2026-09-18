/**
 * 화면 사용법을 사자가 말풍선으로 알려 주는 공통 안내
 * -------------------------------------------------
 * 이식 화면(src/four)의 CharacterGuide 를 life 화면 규격으로 옮긴 것이다.
 * - 노출 기록(1회만 보여주기)은 이식 화면과 같은 저장소 키를 쓴다 — 초기화 한 번으로 둘 다 지워지도록 훅을 그대로 가져다 쓴다.
 * - 캐릭터는 지금 앱이 쓰는 펫(성장 단계 사자)을 그대로 세운다.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import AppModal from '@/src/screens/common/atomic/AppModal';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PetAvatar from './PetAvatar';
import MascotImage from '@/src/screens/common/atomic/MascotImage';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Layout, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

// 노출 기록은 이식 화면과 한 곳에서 관리한다 (키 접두사·초기화 함수가 하나여야 한다)
export { useCharacterGuideOnce, resetCharacterGuideSeen } from '@/src/four/screens/common/CharacterGuide';

/** 한 글자씩 찍히는 속도(ms) */
const TYPING_INTERVAL = 28;

/**
 * 헤더에 놓는 '도움말 다시보기' 물음표 버튼.
 * useCharacterGuideOnce 의 open 을 연결해 쓴다.
 */
export const LifeGuideButton = ({ onPress, color, size = 20 }: { onPress: () => void; color?: string; size?: number }) => {
	const { t } = useTranslation();
	const Colors = useColors();
	return (
		<TouchableOpacity
			onPress={onPress}
			hitSlop={{ top: scaleHeight(10), bottom: scaleHeight(10), left: scaleWidth(10), right: scaleWidth(10) }}
			activeOpacity={0.7}
			accessibilityRole="button"
			accessibilityLabel={t('guide.reopen')}>
			<IconComponent type="materialIcons" name="help-outline" size={size} color={color ?? Colors.textMuted} />
		</TouchableOpacity>
	);
};

interface Props {
	visible: boolean;
	/** 사자가 순서대로 말할 문장들. 탭하면 다음 문장으로 넘어간다 */
	lines: string[];
	onClose: () => void;
	/** 말풍선 상단 라벨 */
	title?: string;
	/** 강조색 (기본: 브랜드 파랑) */
	accent?: string;
	/** 마지막 문장에서 누를 버튼 문구 */
	confirmLabel?: string;
	/** 화면 고유 안내 캐릭터. 생략하면 현재 사자를 표시한다. */
	characterImage?: number;
}

/**
 * 사자가 아래에서 올라와 화면 사용법을 한 문장씩 말한다.
 * - 탭하면 다음 문장, 마지막에서 닫힌다. 타이핑 중에 탭하면 문장을 한 번에 다 보여준다.
 * - 1회만 노출하려면 useCharacterGuideOnce 와 함께 쓴다.
 */
const LifeCharacterGuide = ({ visible, lines, onClose, title, accent, confirmLabel, characterImage }: Props) => {
	const { t } = useTranslation();
	const head = title ?? t('guide.eyebrow');
	const confirm = confirmLabel ?? t('guide.gotIt');
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const tone = accent ?? Colors.primary;
	// 스택 화면은 포커스를 잃어도 마운트된 채 남는다 — 그때 안내가 살아 있으면 다른 화면 위에서 터치를 먹는다
	const focused = useIsFocused();

	const [step, setStep] = useState(0);
	const [typed, setTyped] = useState('');
	const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);
	// 말풍선 등장 — 아래에서 살짝 떠오르며 나타난다
	const enter = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!visible) {
			setStep(0);
			return;
		}
		enter.setValue(0);
		const anim = Animated.timing(enter, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true });
		anim.start();
		return () => anim.stop();
	}, [visible, enter]);

	const line = lines[step] ?? '';
	useEffect(() => {
		if (!visible) {
			return;
		}
		if (typingRef.current) {
			clearInterval(typingRef.current);
		}
		setTyped('');
		let at = 0;
		typingRef.current = setInterval(() => {
			at += 1;
			setTyped(line.slice(0, at));
			if (at >= line.length && typingRef.current) {
				clearInterval(typingRef.current);
				typingRef.current = null;
			}
		}, TYPING_INTERVAL);
		return () => {
			if (typingRef.current) {
				clearInterval(typingRef.current);
			}
			typingRef.current = null;
		};
	}, [line, visible]);

	if (!visible || !focused) {
		return null;
	}

	const isTyping = typed.length < line.length;
	const isLast = step >= lines.length - 1;

	const next = () => {
		// 타이핑 중이면 먼저 문장을 다 보여준다 (성급하게 눌러도 내용을 놓치지 않게)
		if (isTyping) {
			if (typingRef.current) {
				clearInterval(typingRef.current);
			}
			typingRef.current = null;
			setTyped(line);
			return;
		}
		if (isLast) {
			onClose();
			return;
		}
		setStep((at) => at + 1);
	};

	const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(40), 0] });

	// 배경 탭은 '닫기'가 아니라 '다음 문장'이다 — AppModal 의 배경 닫기를 끄고 여기서 직접 받는다
	return (
		<AppModal visible onClose={onClose} align="bottom" dismissOnBackdrop={false} backdropStyle={styles.backdrop}>
			<TouchableOpacity style={styles.tapArea} activeOpacity={1} onPress={next} accessibilityRole="button" accessibilityLabel={t('guide.toNext')}>
				<Animated.View style={[styles.wrap, { opacity: enter, transform: [{ translateY }] }]}>
					{/* 말풍선 */}
					<View style={[styles.bubble, { borderColor: `${tone}55` }]}>
						<View style={styles.bubbleHead}>
							<IconComponent type="materialIcons" name="tips-and-updates" size={15} color={tone} />
							<Text style={[styles.bubbleTitle, { color: tone }]} numberOfLines={1}>
								{head}
							</Text>
							{lines.length > 1 && (
								<Text style={styles.stepText}>
									{step + 1}/{lines.length}
								</Text>
							)}
						</View>
						<Text style={styles.bubbleText}>
							{typed}
							{isTyping && <Text style={{ color: tone }}>▌</Text>}
						</Text>
						<TouchableOpacity
							style={[styles.cta, { backgroundColor: isLast ? tone : `${tone}1F` }]}
							activeOpacity={0.9}
							onPress={next}
							accessibilityRole="button"
							accessibilityLabel={isLast ? confirm : t('guide.nextTip')}>
							<Text style={[styles.ctaText, { color: isLast ? Colors.textInverse : tone }]}>{isLast ? confirm : t('guide.next')}</Text>
							<IconComponent type="materialIcons" name={isLast ? 'check' : 'arrow-forward'} size={15} color={isLast ? Colors.textInverse : tone} />
						</TouchableOpacity>
						{/* 말풍선 꼬리 — 아래 사자를 향한다 */}
						<View style={[styles.tail, { borderTopColor: Colors.surface }]} />
						<View style={[styles.tailBorder, { borderTopColor: `${tone}55` }]} />
					</View>

					{/* 캐릭터 — 지금 키우는 펫 그대로 */}
					<View style={styles.charWrap}>
						<View style={[styles.charGlow, { backgroundColor: `${tone}1F` }]} />
						{characterImage ? <MascotImage source={characterImage} size={CHAR} accessibilityLabel={title} /> : <PetAvatar size={CHAR} plate={false} />}
					</View>
				</Animated.View>
			</TouchableOpacity>
		</AppModal>
	);
};

const CHAR = scaleWidth(112);

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		// AppModal 의 기본 좌우 여백을 지우고 화면 전체를 탭 영역으로 쓴다
		backdrop: { paddingHorizontal: 0 },
		// 화면 어디를 눌러도 다음 문장으로 넘어가도록 배경 전체를 덮는다
		tapArea: { flex: 1, width: '100%', justifyContent: 'flex-end' },
		wrap: {
			...Layout.column,
			paddingHorizontal: Spacing.xl,
			paddingBottom: SpacingV.xxxl,
			alignItems: 'flex-start',
		},
		bubble: {
			alignSelf: 'stretch',
			backgroundColor: Colors.surface,
			borderRadius: Radius.xl,
			// 그림자 대신 테두리로 구분한다 (앱 전역 규칙)
			borderWidth: 1,
			padding: Spacing.lg,
		},
		bubbleHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: SpacingV.sm },
		bubbleTitle: { flex: 1, fontSize: Typography.footnote, fontWeight: FontWeight.bold },
		stepText: { fontSize: Typography.caption, fontWeight: FontWeight.semibold, color: Colors.textMuted },
		bubbleText: {
			fontSize: Typography.callout,
			lineHeight: scaledSize(24),
			color: Colors.textStrong,
			fontWeight: FontWeight.semibold,
			minHeight: scaleHeight(52),
		},
		cta: {
			alignSelf: 'flex-end',
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.xs,
			marginTop: SpacingV.md,
			paddingVertical: SpacingV.sm,
			paddingHorizontal: Spacing.lg,
			borderRadius: Radius.pill,
		},
		ctaText: { fontSize: Typography.bodySm, fontWeight: FontWeight.bold, flexShrink: 1, textAlign: 'center', },
		// 삼각 꼬리 — 배경색 삼각형 위에 테두리색 삼각형을 겹쳐 테두리 선을 잇는다
		tail: {
			position: 'absolute',
			left: scaleWidth(36),
			bottom: -scaleHeight(11),
			width: 0,
			height: 0,
			borderLeftWidth: scaleWidth(10),
			borderRightWidth: scaleWidth(10),
			borderTopWidth: scaleHeight(12),
			borderLeftColor: 'transparent',
			borderRightColor: 'transparent',
			zIndex: 2,
		},
		tailBorder: {
			position: 'absolute',
			left: scaleWidth(35),
			bottom: -scaleHeight(13),
			width: 0,
			height: 0,
			borderLeftWidth: scaleWidth(11),
			borderRightWidth: scaleWidth(11),
			borderTopWidth: scaleHeight(13),
			borderLeftColor: 'transparent',
			borderRightColor: 'transparent',
			zIndex: 1,
		},
		charWrap: {
			marginTop: SpacingV.md,
			marginLeft: Spacing.sm,
			width: CHAR,
			height: CHAR,
			alignItems: 'center',
			justifyContent: 'center',
		},
		charGlow: { position: 'absolute', width: CHAR, height: CHAR, borderRadius: Radius.pill },
	});

export default LifeCharacterGuide;
