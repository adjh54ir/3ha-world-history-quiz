import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useTranslation } from 'react-i18next';
import {
  RewardedInterstitialAd,
  TestIds,
  RewardedAdEventType,
  AdEventType,
} from "react-native-google-mobile-ads";

import {
  GOOGLE_ADMOV_IOS_REWARD_FRONT,
  GOOGLE_ADMOV_ANDROID_REWARD_FRONT,
} from "@env";
import { resolveAdUnitId } from './adUnitId';
import Colors from '@/src/const/ConstColors';
import { Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { themed } from '@/src/utils/ThemedStyles';

type AdUnitIdType = string;

const AD_UNIT_ID: AdUnitIdType = resolveAdUnitId(
	Platform.select({ ios: GOOGLE_ADMOV_IOS_REWARD_FRONT, android: GOOGLE_ADMOV_ANDROID_REWARD_FRONT }),
	TestIds.REWARDED_INTERSTITIAL,
	'reward-front',
);

const rewardedInterstitial = RewardedInterstitialAd.createForAdRequest(
  AD_UNIT_ID,
  {
    keywords: ["fashion", "clothing"],
  }
);

/**
 * [공통] 보상형 전면 광고
 * @returns
 */
const AdmobRewardFrontAd: React.FC = () => {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsubscribeLoaded = rewardedInterstitial.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        setLoaded(true);
      }
    );
    const unsubscribeEarned = rewardedInterstitial.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {}
    );

    const unsubscribeError = rewardedInterstitial.addAdEventListener(
      AdEventType.ERROR,
      (error) => console.warn('❌ [AdMob] 보상형 전면 로드 실패:', AD_UNIT_ID, error),
    );

    // Start loading the rewarded interstitial ad straight away
    rewardedInterstitial.load();

    // Unsubscribe from events on unmount
    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeError();
    };
  }, []);

  // No advert ready to show yet
  if (!loaded) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => rewardedInterstitial.show()}
    >
      <Text style={styles.buttonText}>{t('ads.rewardFrontButton')}</Text>
    </TouchableOpacity>
  );
};

export default AdmobRewardFrontAd;

const styles = themed(() => StyleSheet.create({
  button: {
    backgroundColor: Colors.successDeep,
    paddingHorizontal: Spacing.md,
    paddingVertical: SpacingV.md,
    borderRadius: Radius.sm,
    alignItems: "center",
  },
  buttonText: {
    color: Colors.textInverse,
    fontSize: Typography.callout,
    fontWeight: "bold",
  },
}));
