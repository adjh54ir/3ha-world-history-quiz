/* eslint-disable react/no-unstable-nested-components */
import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { scaledSize, scaleWidth } from '@/src/utils';
import Colors from '@/src/const/ConstColors';
import { BODY_FONTS, SpacingV, Typography } from '@/src/const/ConstDesign';
import { useTranslation } from 'react-i18next';

/**
 * 하단 탭 — 홈 / 챌린지 / 통계 / MY
 * - 검색: 홈 헤더의 검색 아이콘으로 진입 (/search)
 * - 보관함: MY 탭에서 진입 (/library)
 */
export default function TabsLayout() {
	const insets = useSafeAreaInsets();
	const { t } = useTranslation();
	const tabIcon =
		(name: string) =>
		({ color }: { color: string }) =>
			<IconComponent type="materialIcons" name={name} color={color} size={scaledSize(22)} />;

	return (
		<Tabs
			initialRouteName="home"
			// 탭 화면 초기화는 각 화면의 withRemountOnFocus 가 담당한다
			//  (여기서 또 리마운트하면 탭 전환 1회에 마운트 이펙트가 두 번 돈다)
			screenOptions={{
				headerShown: false,
				// 탭 전환은 페이드 — 스택 전환(slide)과 위계를 구분한다
				animation: 'fade',
				tabBarHideOnKeyboard: true,
				tabBarLabelPosition: 'below-icon',
				tabBarActiveTintColor: Colors.primary,
				tabBarInactiveTintColor: Colors.textMuted,
				tabBarStyle: {
					// 아이콘(22) + 라벨(11)이 눌리지 않도록 최소 56 — iOS 49/Android 56 관례 중 큰 쪽에 맞춘다
					height: scaleWidth(56) + insets.bottom,
					paddingTop: SpacingV.xs,
					backgroundColor: Colors.surface,
					borderTopWidth: 1,
					borderTopColor: Colors.border,
				},
				tabBarLabelStyle: { fontSize: Typography.footnote, fontFamily: BODY_FONTS.bold },
			}}>
			<Tabs.Screen name="search" options={{ title: t('navigation.search'), tabBarIcon: tabIcon('search') }} />
			<Tabs.Screen name="challenge" options={{ title: t('navigation.challenge'), tabBarIcon: tabIcon('sports-esports') }} />
			<Tabs.Screen name="home" options={{ title: t('navigation.home'), tabBarIcon: tabIcon('home') }} />
			<Tabs.Screen name="stats" options={{ title: t('navigation.stats'), tabBarIcon: tabIcon('insights') }} />
			<Tabs.Screen name="my" options={{ title: t('navigation.my'), tabBarIcon: tabIcon('settings') }} />
		</Tabs>
	);
}
