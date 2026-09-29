import React, { useEffect, useState } from "react";
import { Image, Platform, Text } from "react-native";
import {
  NativeAd,
  TestIds,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
} from "react-native-google-mobile-ads";
import {
  GOOGLE_ADMOV_ANDROID_NATIVE_ADVANCED,
  GOOGLE_ADMOV_IOS_NATIVE_ADVANCED,
} from "@env";
import { isAdsRemoved } from "@/src/services/PurchaseService";
import { resolveAdUnitId } from './adUnitId';

type AdUnitIdType = string;

const AD_UNIT_ID: AdUnitIdType = resolveAdUnitId(
	Platform.select({ ios: GOOGLE_ADMOV_IOS_NATIVE_ADVANCED, android: GOOGLE_ADMOV_ANDROID_NATIVE_ADVANCED }),
	TestIds.NATIVE,
	'native',
);

/**
 * [공통] 네이티브 고급 광고
 * @returns
 */
const AdmobNativeAd: React.FC = () => {
  const [nativeAd, setNativeAd] = useState<NativeAd>();

  useEffect(() => {
    // 🚫 광고 제거 구매자는 로드하지 않음
    if (isAdsRemoved()) return;
    NativeAd.createForAdRequest(AD_UNIT_ID)
      .then(setNativeAd)
      .catch((e) => console.warn('❌ [AdMob] 네이티브 광고 로드 실패:', AD_UNIT_ID, e));
  }, []);

  if (!nativeAd) {
    return null;
  }

  // 🚫 광고 제거 구매자에게는 노출하지 않음 (개발 모드에서는 테스트 광고 노출)
  if (isAdsRemoved()) {
    return null;
  }

  return (
    // Wrap all the ad assets in the NativeAdView component, and register the view with the nativeAd prop
    <NativeAdView nativeAd={nativeAd}>
      // Display the icon asset with Image component, and use NativeAsset to
      register the view
      {nativeAd.icon && (
        <NativeAsset assetType={NativeAssetType.ICON}>
          <Image source={{ uri: nativeAd.icon.url }} width={24} height={24} />
        </NativeAsset>
      )}
      // Display the headline asset with Text component, and use NativeAsset to
      register the view
      <NativeAsset assetType={NativeAssetType.HEADLINE}>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>
          {nativeAd.headline}
        </Text>
      </NativeAsset>
      // Always display an ad attribution to denote that the view is an
      advertisement
      <Text>Sponsored</Text>
      // Display the media asset
      <NativeMediaView />
      // Repeat the process for the other assets in the NativeAd.
    </NativeAdView>
  );
};

export default AdmobNativeAd;
