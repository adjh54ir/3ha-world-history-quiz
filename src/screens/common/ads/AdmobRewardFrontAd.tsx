import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity } from "react-native";
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
import { isAdsRemoved } from "@/src/services/PurchaseService";
import { resolveAdUnitId } from './adUnitId';
import Colors from '@/src/const/ConstColors';
import { Spacing } from '@/src/const/ConstDesign';
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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // ✅ 광고 제거 구매자는 로드하지 않음
    if (isAdsRemoved()) return;
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

  // No advert ready to show yet / 광고 제거 구매자
  if (!loaded || isAdsRemoved()) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => rewardedInterstitial.show()}
    >
      <Text style={styles.buttonText}>보상형 전면 광고 보기</Text>
    </TouchableOpacity>
  );
};

export default AdmobRewardFrontAd;

const styles = themed(() => StyleSheet.create({
  button: {
    backgroundColor: Colors.successDeep,
    padding: Spacing.md,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: "bold",
  },
}));
