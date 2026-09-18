import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Pressable } from 'react-native';
import { usePet } from '@/src/hooks/useLife';
import { selectPetImage } from '@/src/const/data/life/ConstPetImages';
import { useColors } from '@/src/hooks/useTheme';
import { scaleWidth } from '@/src/utils';
import MascotImage from '@/src/screens/common/atomic/MascotImage';

interface Props {
	/** 지름(px) */
	size?: number;
	/** 둥근 배경을 깔지 */
	plate?: boolean;
	/** 가만히 있지 않고 숨 쉬듯 움직인다 */
	animated?: boolean;
	/** 누르면 한 번 뛰어오른다 — 넘기지 않으면 누를 수 없는 그림이 된다 */
	onPress?: () => void;
}

/** 마지막(황금) 단계 — 이 단계만 받침 색을 금빛으로 바꾼다 */
const LAST_STAGE = 6;

/**
 * 펫 — 성장 단계별 역사 사자 이미지.
 * 뜨고 가라앉는 대기 동작·바닥 그림자는 MascotImage 가 맡고, 여기서는 "누르면 뛴다"만 얹는다.
 * 경험치 단계는 usePet 이 정하므로 화면은 크기만 넘긴다.
 */
const PetAvatar = ({ size = scaleWidth(120), plate = true, animated = true, onPress }: Props) => {
	const { t } = useTranslation();
	const Colors = useColors();
	const { stage, level } = usePet();
	/** 도약(0~1) — MascotImage 가 대기 동작 위에 더해 준다. 스프링이 0 아래를 지나는 구간이 착지 스쿼시가 된다 */
	const hop = useRef(new Animated.Value(0)).current;

	const onPressPet = useCallback(() => {
		hop.stopAnimation();
		hop.setValue(0);
		Animated.sequence([
			Animated.timing(hop, {
				toValue: 1,
				duration: 200,
				easing: Easing.out(Easing.quad),
				useNativeDriver: true,
			}),
			Animated.spring(hop, {
				toValue: 0,
				friction: 4,
				tension: 160,
				useNativeDriver: true,
			}),
		]).start();
		onPress?.();
	}, [hop, onPress]);

	// 화면을 벗어나면 남은 도약을 멈춘다
	useEffect(() => () => hop.stopAnimation(), [hop]);

	const mascot = (
		<MascotImage
			source={selectPetImage(level)}
			size={size}
			motion={animated ? 'float' : 'none'}
			lift={hop}
			plateColor={plate ? (level === LAST_STAGE ? Colors.accentAmberSoft : Colors.primarySoft) : undefined}
			accessibilityLabel={onPress ? undefined : t('pet.avatarLabel', { stage: t(`pet.stage.${stage.key}`) })}
		/>
	);

	if (!onPress) {
		return mascot;
	}

	return (
		<Pressable onPress={onPressPet} accessibilityRole="button" accessibilityLabel={t('pet.avatarLabel', { stage: t(`pet.stage.${stage.key}`) })}>
			{mascot}
		</Pressable>
	);
};

export default PetAvatar;
