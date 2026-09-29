import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Colors from '@/src/const/ConstColors';
import { Radius, Spacing } from '@/src/const/ConstDesign';
import { selectFlagsByName } from '@/src/const/data/world/ConstFlagImages';
import { scaledSize } from '@/src/utils';
import { themed } from '@/src/utils/ThemedStyles';

interface Props {
	/** 나라 이름. '미국·캐나다·멕시코' 처럼 여럿이 걸린 값도 그대로 넘긴다 */
	name: string;
	/** 국기 높이(dp, 스케일 전) — 글자 크기에 맞춰 부른 쪽이 정한다 */
	height?: number;
}

/**
 * 나라 이름 옆에 붙는 작은 국기 (옛 세계 앱의 CountryFlags 를 이 테마 체계로 옮겼다).
 *
 * 국기를 못 찾으면 **아무것도 그리지 않는다** (빈 네모도, 자리도 남기지 않는다).
 * 소련·잉글랜드처럼 깃발 파일이 없는 이름이 섞여 있어, 빈 자리를 남기면 줄마다 들쭉날쭉해진다.
 * 흰 바탕이 넓은 깃발(일본·이스라엘)은 카드 배경에 묻히므로 가는 테두리를 두른다.
 */
const CountryFlags: React.FC<Props> = ({ name, height = 15 }) => {
	const flags = selectFlagsByName(name);
	if (flags.length === 0) return null;
	const size = { height: scaledSize(height), width: scaledSize(height * 1.45) };
	return (
		<View style={styles.row}>
			{flags.map((flag) => (
				<Image key={flag.code} source={flag.source} style={[styles.flag, size]} contentFit="cover" transition={140} accessible={false} />
			))}
		</View>
	);
};

/** 이 값에 국기가 붙는지 — 보기 전체에 국기를 달지 정할 때 쓴다 */
export const hasCountryFlag = (name: string): boolean => selectFlagsByName(name).length > 0;

const styles = themed(() =>
	StyleSheet.create({
		row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
		flag: { borderRadius: Radius.sm / 2, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.borderStrong },
	}),
);

export default CountryFlags;
