import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { Paths } from '@/src/navigation/conf/Paths';
import { scaledSize, scaleWidth } from '@/src/utils';
import { useColors } from '@/src/hooks/useTheme';
import { FontWeight, Layout } from '@/src/const/ConstDesign';

/**
 * 하단 탭 — 단어 / 오늘의 퀴즈 / 홈 / 나의 활동 / 통계 / 설정 (초기 탭은 홈)
 * 학습·퀴즈 시작·챌린지처럼 한 번 들어갔다 나오는 화면은 탭이 아니라 홈의 액션 카드에서 연다.
 *
 * 태블릿은 손가락이 닿는 거리가 멀어 탭 띠를 한 단계 높이고 아이콘·라벨도 같이 키운다.
 * (예전에는 아이콘에 marginTop 을 줘서 내렸는데, 띠 높이는 그대로여서 아이콘이 띠 밖으로 밀려났다)
 */
export default function MainTabLayout() {
	const { t } = useTranslation();
	const insets = useSafeAreaInsets();
	const Colors = useColors();
	const isTablet = Layout.isTablet;

	const barHeight = scaleWidth(isTablet ? 64 : 50);
	// IconComponent 가 내부에서 scaledSize 를 먹이므로 원본 크기를 넘긴다 (폰은 기존 기본값 24 그대로)
	const iconSize = isTablet ? 28 : 24;

	const tabBarIcon =
		(iconName: string, activeName: string) =>
		({ color, focused }: { color: string; focused: boolean }) => (
			<IconComponent type="materialCommunityIcons" name={focused ? activeName : iconName} size={iconSize} color={color} />
		);

	return (
		<Tabs
			initialRouteName={Paths.HOME}
			screenOptions={{
				headerShown: false,
				tabBarLabelPosition: 'below-icon',
				tabBarActiveTintColor: Colors.primaryDeep,
				tabBarInactiveTintColor: Colors.textMuted,
				tabBarStyle: {
					height: barHeight + insets.bottom,
					paddingTop: scaleWidth(isTablet ? 6 : 0),
					backgroundColor: Colors.surface,
					borderTopColor: Colors.border,
				},
				tabBarLabelStyle: {
					// 여섯 칸이라 라벨이 한 줄에 들어가도록 한 단계 줄인다
					fontSize: scaledSize(isTablet ? 12 : 10),
					fontWeight: FontWeight.semibold,
				},
			}}>
			<Tabs.Screen name={Paths.WORDS} options={{ title: t('tab.words'), tabBarIcon: tabBarIcon('book-search-outline', 'book-search') }} />
			<Tabs.Screen name={Paths.TODAY} options={{ title: t('tab.today'), tabBarIcon: tabBarIcon('calendar-star', 'calendar-star') }} />
			<Tabs.Screen name={Paths.HOME} options={{ title: t('tab.home'), tabBarIcon: tabBarIcon('home-outline', 'home') }} />
			<Tabs.Screen name={Paths.PROFILE} options={{ title: t('tab.profile'), tabBarIcon: tabBarIcon('chart-box-outline', 'chart-box') }} />
			<Tabs.Screen name={Paths.STATS} options={{ title: t('tab.stats'), tabBarIcon: tabBarIcon('chart-line-variant', 'chart-line') }} />
			<Tabs.Screen name={Paths.SETTING} options={{ title: t('tab.setting'), tabBarIcon: tabBarIcon('cog-outline', 'cog') }} />
		</Tabs>
	);
}
