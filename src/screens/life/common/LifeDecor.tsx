import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useHanjaFont } from '@/src/hooks/useHanjaFont';
import { useDecor } from '@/src/hooks/useLife';
import { SHOP_ITEM_IMAGES } from '@/src/const/data/life/ConstShopImages';
import { FontWeight, Radius, Spacing, Typography } from '@/src/const/ConstDesign';
import { scaleWidth } from '@/src/utils';

/**
 * 화면 꾸미기 그리기
 * -------------------------------------------------
 * 캐릭터에 직접 입히는 방식과 달리, 여기 있는 것들은 화면의 고정 슬롯에 놓인다.
 * 여섯 갈래가 모두 "아무것도 안 놓았으면 그리지 않는다" 를 지킨다 —
 * 그래서 꾸미기를 하나도 안 산 사용자의 화면은 예전과 완전히 같다.
 *
 * 새 그림 파일을 쓰지 않는다. 팔레트 색·글자·기존 상점 아이템 에셋만 조합한다.
 */

/** 글방에 놓을 수 있는 에셋 — 데이터 파일이 문자열로만 가리키므로 여기서 그림으로 푼다 */
const propImage = (key: string): number | undefined => SHOP_ITEM_IMAGES[key as keyof typeof SHOP_ITEM_IMAGES];

/**
 * 글방 배경 — 홈 히어로에서 캐릭터 뒤에 깔린다.
 * 위쪽은 벽(연한 면), 아래쪽은 바닥(진한 띠), 바닥 좌우에 가구 하나씩.
 * 캐릭터보다 먼저 그려야 뒤로 들어간다.
 */
export const StudyRoomBackdrop = ({ width, height }: { width: number; height: number }) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const decor = useDecor('study');

	if (!decor) {
		return null;
	}
	const props = (decor.props ?? []).map(propImage).filter((item): item is number => !!item);
	const propSize = height * 0.34;

	return (
		<View style={[styles.room, { width, height, borderRadius: Radius.lg, borderColor: Colors[decor.color] }]} pointerEvents="none">
			{/* 벽 — 위에서 아래로 옅어져 바닥과 자연스럽게 만난다 */}
			<LinearGradient
				colors={[Colors[decor.tint], Colors.surface]}
				start={{ x: 0.5, y: 0 }}
				end={{ x: 0.5, y: 1 }}
				style={StyleSheet.absoluteFill}
			/>
			{/* 바닥 — 캐릭터가 그 위에 서 있는 것으로 읽히게 아래쪽에만 띠를 깐다 */}
			<View style={[styles.roomFloor, { height: height * 0.22, backgroundColor: Colors[decor.color] }]} />
			{props.map((image, at) => (
				<Image
					key={at}
					source={image}
					style={[
						styles.roomProp,
						{ width: propSize, height: propSize, bottom: height * 0.13 },
						at === 0 ? { left: width * 0.03 } : { right: width * 0.03 },
					]}
					contentFit="contain"
					accessible={false}
				/>
			))}
		</View>
	);
};

/**
 * 칭호 — 캐릭터 이름 옆에 붙는 작은 현판.
 * @param onBrand 진한 브랜드 면(홈 히어로) 위에 놓을 때. 연한 바탕색이 면에 묻히므로 흰 톤으로 바꾼다
 */
export const TitlePlaque = ({ onBrand = false }: { onBrand?: boolean }) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const decor = useDecor('title');

	if (!decor) {
		return null;
	}
	const ink = onBrand ? Colors.brandBlockText : Colors[decor.color];

	return (
		<View style={[styles.plaque, { backgroundColor: onBrand ? 'rgba(255,255,255,0.18)' : Colors[decor.tint] }]}>
			<IconComponent type="materialCommunityIcons" name={decor.icon} size={scaleWidth(11)} color={ink} />
			<Text style={[styles.plaqueText, { color: ink }]} numberOfLines={1}>
				{decor.text}
			</Text>
		</View>
	);
};

/**
 * 청룡 좌대 — 펫 발밑에 깔리는 타원 대좌.
 * 부모가 자리를 잡는다(펫 그림 아래에 절대배치). 펫보다 먼저 그려야 발밑으로 들어간다.
 */
export const PetPerch = ({ size }: { size: number }) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const decor = useDecor('perch');

	if (!decor) {
		return null;
	}

	return (
		<View style={[styles.perch, { width: size, height: size * 0.24 }]} pointerEvents="none">
			<LinearGradient
				colors={[Colors[decor.tint], Colors[decor.color]]}
				start={{ x: 0.5, y: 0 }}
				end={{ x: 0.5, y: 1 }}
				style={[StyleSheet.absoluteFillObject, { borderRadius: size }]}
			/>
		</View>
	);
};

/**
 * 액자 — 나의 활동 펫 카드에 두르는 테.
 * 카드 스타일 뒤에 펼쳐 쓴다: `style={[styles.petCard, frame]}`. 없으면 null 이라 카드가 그대로 남는다.
 */
export const useDecorFrame = (): ViewStyle | null => {
	const Colors = useColors();
	const decor = useDecor('frame');
	return useMemo(
		() => (decor ? { borderWidth: scaleWidth(3), borderColor: Colors[decor.color], backgroundColor: Colors[decor.tint] } : null),
		[Colors, decor],
	);
};

/**
 * 카드 테 — 학습 카드 테두리.
 * 바탕색은 건드리지 않는다. 카드 안 글씨 색이 바탕에 맞춰져 있어, 면을 바꾸면 대비가 무너진다.
 */
export const useDecorSkin = (): ViewStyle | null => {
	const Colors = useColors();
	const decor = useDecor('skin');
	return useMemo(() => (decor ? { borderWidth: 2, borderColor: Colors[decor.color] } : null), [Colors, decor]);
};

/** 낙관 — 출석 도장에 찍히는 글자와 색. 아무것도 안 놓았으면 기본 붉은 出席 인장 */
export const useDecorSeal = (): { text: string; color: string; tint: string } => {
	const Colors = useColors();
	const decor = useDecor('seal');
	return useMemo(
		() => ({
			text: decor?.text ?? '出席',
			color: decor ? Colors[decor.color] : Colors.error,
			tint: decor ? Colors[decor.tint] : Colors.errorSoft,
		}),
		[Colors, decor],
	);
};

/**
 * 꾸미기 미리보기 한 칸 — 상점 목록과 적용 중 표시에서 같은 모양을 쓴다.
 * 글자가 있는 갈래(칭호·낙관)는 글자를, 나머지는 아이콘을 보여 준다.
 */
export const DecorSwatch = ({ decor, size }: { decor: { icon: string; color: string; tint: string; text?: string; kind: string }; size: number }) => {
	const styles = useThemedStyles(createStyles);
	const { style: hanjaFont } = useHanjaFont();
	// 낙관은 한자 한 글자라 명조로, 칭호는 한글이라 본문 서체로 둔다
	const isSeal = decor.kind === 'seal';

	return (
		<View style={[styles.swatch, { width: size, height: size, borderRadius: Radius.md, backgroundColor: decor.tint, borderColor: decor.color }]}>
			{decor.text ? (
				<Text
					allowFontScaling={false}
					style={[isSeal ? hanjaFont : null, styles.swatchText, { color: decor.color, fontSize: isSeal ? size * 0.46 : size * 0.24 }]}
					numberOfLines={1}>
					{decor.text}
				</Text>
			) : (
				<IconComponent type="materialCommunityIcons" name={decor.icon} size={Math.round(size * 0.46)} color={decor.color} />
			)}
		</View>
	);
};

// 색은 꾸미기 항목이 각자 들고 있어(팔레트 토큰) 스타일 표에서는 팔레트를 쓰지 않는다
const createStyles = (_Colors: Palette) =>
	StyleSheet.create({
		room: { position: 'absolute', overflow: 'hidden', borderWidth: 1 },
		roomFloor: { position: 'absolute', left: 0, right: 0, bottom: 0, opacity: 0.35 },
		roomProp: { position: 'absolute' },

		plaque: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(3),
			paddingHorizontal: Spacing.sm,
			paddingVertical: scaleWidth(3),
			borderRadius: Radius.pill,
		},
		plaqueText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy },

		perch: { position: 'absolute', overflow: 'hidden' },

		swatch: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden' },
		swatchText: { fontWeight: FontWeight.heavy, textAlign: 'center', includeFontPadding: false },
	});

export default StudyRoomBackdrop;
