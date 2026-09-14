/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AppModal from '@/src/four/screens/common/atomic/AppModal';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@/src/four/navigation/compat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FastImage from '@/src/four/components/FastImage';
import IconComponent from '@/src/four/screens/common/atomic/IconComponent';
import { Colors } from '@/src/four/const/ConstColors';
import { Spacing, FontWeight, SpacingV, Radius, Typography } from '@/src/four/const/ConstDesign';
import { CONTENT_MAX_WIDTH, scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils/DementionUtils';
import { LEVEL_DATA } from '@/src/four/const/ConstLevelData';
import { MainStorageKeyType } from '@/src/four/types/MainStorageKeyType';
import useAnimationCleanup from '@/src/four/hooks/useAnimationCleanup';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';

/** 안내를 이미 본 화면인지 기록하는 키 접두사 */
const SEEN_PREFIX = 'CHAR_GUIDE_SEEN_';

/**
 * 화면당 1회만 노출되는 캐릭터 안내 훅.
 *
 * @param id 화면 식별자 (예: 'favorite'). 이 값으로 노출 여부가 기록된다.
 * @param enabled false 면 판단 자체를 하지 않는다 (데이터 로딩 전 등)
 *
 * @example
 * const guide = useCharacterGuideOnce('favorite');
 * <CharacterGuide visible={guide.visible} onClose={guide.close} lines={[...]} />
 */
export const useCharacterGuideOnce = (id: string, enabled = true) => {
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		if (!enabled) return;
		let alive = true;
		AsyncStorage.getItem(SEEN_PREFIX + id).then(v => {
			if (alive && !v) setVisible(true);
		});
		return () => {
			alive = false;
		};
	}, [id, enabled]);
	const close = useCallback(() => {
		setVisible(false);
		AsyncStorage.setItem(SEEN_PREFIX + id, '1').catch(() => {});
	}, [id]);
	/** 도움말 버튼 등으로 다시 열기 */
	const open = useCallback(() => setVisible(true), []);
	return { visible, close, open };
};

/**
 * 화면 헤더에 놓는 '도움말 다시보기' 버튼.
 * useCharacterGuideOnce 의 open 을 연결해 쓴다.
 */
export const CharacterGuideButton: React.FC<{ onPress: () => void; color?: string; size?: number }> = ({
	onPress,
	color = Colors.textMuted,
	size = scaledSize(22),
}) => (
	<TouchableOpacity
		onPress={onPress}
		hitSlop={{ top: scaleHeight(10), bottom: scaleHeight(10), left: scaleWidth(10), right: scaleWidth(10) }}
		activeOpacity={0.7}
		accessibilityRole="button"
		accessibilityLabel="이 화면 사용법 다시 보기">
		<IconComponent type="materialicons" name="help-outline" size={size} color={color} />
	</TouchableOpacity>
);

/** 저장해 둔 '본 적 있음' 기록 초기화 (데이터 초기화에서 사용) */
export const resetCharacterGuideSeen = async () => {
	const keys = await AsyncStorage.getAllKeys();
	const targets = keys.filter(k => k.startsWith(SEEN_PREFIX));
	if (targets.length) await AsyncStorage.multiRemove(targets);
};

/** 누적 점수로 지금 해금된 레벨 마스코트를 찾는다 (결과 화면 등급 산정과 동일 기준) */
const getLevelMascot = (totalScore: number) =>
	(LEVEL_DATA.find(l => totalScore >= l.score && totalScore < l.next) ?? LEVEL_DATA[0]).mascot;

interface CharacterGuideProps {
	visible: boolean;
	/** 캐릭터가 순서대로 말할 문장들. 탭하면 다음 문장으로 넘어간다. */
	lines: string[];
	onClose: () => void;
	/** 말풍선 상단 라벨 */
	title?: string;
	/** 강조색 (기본: 브랜드 컬러) */
	accent?: string;
	/** 마지막 문장에서 누를 버튼 문구 */
	confirmLabel?: string;
}

/**
 * 지금 등급으로 해금된 마스코트가 등장해 화면 사용법을 말풍선으로 설명하는 공통 안내 컴포넌트.
 * - 캐릭터 이미지는 누적 점수(UserQuizHistory.totalScore)로 정해지는 레벨 마스코트를 따라간다.
 * - lines 를 한 문장씩 타이핑하듯 보여주고, 탭하면 다음 문장 → 마지막에 닫기.
 * - 1회만 노출하고 싶으면 useCharacterGuideOnce 훅과 함께 쓴다.
 */
const CharacterGuide: React.FC<CharacterGuideProps> = ({
	visible,
	lines,
	onClose,
	title = '이렇게 써보세요',
	accent = Colors.primary,
	confirmLabel = '알겠습니다',
}) => {
	// 스택 화면은 포커스를 잃어도 마운트된 채 남는다.
	// 그때 안내 모달이 살아 있으면 다른 화면 위에서 터치를 통째로 먹는다 — 포커스 없으면 렌더하지 않는다.
	const focused = useIsFocused();
	// 안드로이드 3버튼 내비게이션 바와 캐릭터가 겹치던 문제 — 하단 인셋만큼 더 띄운다
	const insets = useSafeAreaInsets();
	const [charImg, setCharImg] = useState<ReturnType<typeof require> | null>(null);
	const [step, setStep] = useState(0);
	const [typed, setTyped] = useState('');
	const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);
	// 캐릭터 등장(아래에서 올라오며 살짝 튐) + 말풍선 페이드
	const enter = useRef(new Animated.Value(0)).current;
	// 말하는 느낌의 상하 흔들림
	const bob = useRef(new Animated.Value(0)).current;

	useAnimationCleanup(enter, bob);

	// 지금 등급으로 해금된 마스코트 로드
	useEffect(() => {
		if (!visible) return;
		let alive = true;
		AsyncStorage.getItem(MainStorageKeyType.USER_QUIZ_HISTORY)
			.then(raw => {
				if (!alive) return;
				const totalScore = raw ? JSON.parse(raw).totalScore || 0 : 0;
				setCharImg(getLevelMascot(totalScore));
			})
			.catch(() => {
				if (alive) setCharImg(LEVEL_DATA[0].mascot);
			});
		return () => {
			alive = false;
		};
	}, [visible]);

	// 등장 애니메이션 + 말하는 동안 상하 흔들림 반복
	useEffect(() => {
		if (!visible) {
			setStep(0);
			return;
		}
		enter.setValue(0);
		Animated.spring(enter, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }).start();
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
				Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
			]),
		);
		loop.start();
		return () => {
			loop.stop();
			// 등장 스프링도 함께 멈춘다 — 가이드가 닫혀도 값이 계속 굴러가면 다음 등장이 튄다
			enter.stopAnimation();
		};
	}, [visible, enter, bob]);

	// 문장 타이핑 — 한 글자씩 노출
	const line = lines[step] ?? '';
	useEffect(() => {
		if (!visible) return;
		if (typingRef.current) clearInterval(typingRef.current);
		setTyped('');
		let i = 0;
		typingRef.current = setInterval(() => {
			i += 1;
			setTyped(line.slice(0, i));
			if (i >= line.length && typingRef.current) {
				clearInterval(typingRef.current);
				typingRef.current = null;
			}
		}, 28);
		return () => {
			if (typingRef.current) clearInterval(typingRef.current);
			typingRef.current = null;
		};
	}, [line, visible]);

	if (!visible || !focused) return null;

	const isTyping = typed.length < line.length;
	const isLast = step >= lines.length - 1;

	const next = () => {
		// 타이핑 중이면 먼저 전체 문장을 보여준다(성급한 탭에서도 내용을 놓치지 않게)
		if (isTyping) {
			if (typingRef.current) clearInterval(typingRef.current);
			typingRef.current = null;
			setTyped(line);
			return;
		}
		if (isLast) {
			onClose();
			return;
		}
		setStep(s => s + 1);
	};

	const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(40), 0] });
	const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -scaleHeight(6)] });

	return (
		<AppModal visible transparent animationType="fade" onRequestClose={onClose}>
			<TouchableOpacity
				style={[styles.backdrop, { paddingBottom: SpacingV.xxxxxl + insets.bottom }]}
				activeOpacity={1}
				onPress={next}
				accessibilityRole="button"
				accessibilityLabel="안내 다음으로">
				<Animated.View style={[styles.wrap, { opacity: enter, transform: [{ translateY }] }]}>
					{/* 말풍선 */}
					<View style={[styles.bubble, { borderColor: `${accent}55` }]}>
						<View style={styles.bubbleHead}>
							<IconComponent type="materialicons" name="tips-and-updates" size={scaledSize(15)} color={accent} />
							<Text style={[styles.bubbleTitle, { color: accent }]} numberOfLines={1}>
								{title}
							</Text>
							{lines.length > 1 && (
								<Text style={styles.stepText}>
									{step + 1}/{lines.length}
								</Text>
							)}
						</View>
						<Text style={styles.bubbleText}>
							{typed}
							{isTyping && <Text style={{ color: accent }}>▌</Text>}
						</Text>
						<TouchableOpacity
							style={[styles.cta, { backgroundColor: isLast ? accent : `${accent}1F` }]}
							activeOpacity={0.9}
							onPress={next}
							accessibilityRole="button"
							accessibilityLabel={isLast ? confirmLabel : '다음 안내 보기'}>
							<Text style={[styles.ctaText, { color: isLast ? Colors.textInverse : accent }]}>
								{isLast ? confirmLabel : '다음'}
							</Text>
							<IconComponent
								type="materialicons"
								name={isLast ? 'check' : 'arrow-forward'}
								size={scaledSize(15)}
								color={isLast ? Colors.textInverse : accent}
							/>
						</TouchableOpacity>
						{/* 말풍선 꼬리 — 캐릭터 쪽을 향한다 */}
						<View style={[styles.tail, { borderTopColor: Colors.surface }]} />
						<View style={[styles.tailBorder, { borderTopColor: `${accent}55` }]} />
					</View>

					{/* 캐릭터 */}
					{!!charImg && (
						<Animated.View style={[styles.charWrap, { transform: [{ translateY: bobY }] }]}>
							<View style={[styles.charGlow, { backgroundColor: `${accent}1F` }]} />
							<FastImage source={charImg} style={styles.charImg} resizeMode={FastImage.resizeMode.contain} />
						</Animated.View>
					)}
				</Animated.View>
			</TouchableOpacity>
		</AppModal>
	);
};

export default CharacterGuide;

const CHAR = scaleWidth(112);

const makeStyles = () => StyleSheet.create({
	backdrop: { flex: 1, backgroundColor: Colors.scrim, justifyContent: 'flex-end' },
	wrap: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: Spacing.xl, alignItems: 'flex-start' },
	bubble: {
		alignSelf: 'stretch',
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		// 그림자/elevation 대신 테두리로 구분한다(앱 전역 규칙)
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.lg,
	},
	bubbleHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: SpacingV.sm },
	bubbleTitle: { flex: 1, fontSize: Typography.footnote, fontWeight: FontWeight.bold },
	stepText: { fontSize: Typography.micro, fontWeight: FontWeight.semibold, color: Colors.textMuted },
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
	ctaText: { fontSize: Typography.bodySm, fontWeight: FontWeight.bold },
	// 삼각 꼬리 — 배경색 삼각형 위에 테두리색 삼각형을 1px 겹쳐 테두리 선을 잇는다
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
	charGlow: { position: 'absolute', width: CHAR, height: CHAR, borderRadius: CHAR / 2 },
	charImg: { width: CHAR, height: CHAR, borderRadius: Radius.xl, overflow: 'hidden' },
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
