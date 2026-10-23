/**
 * AdMob 광고 클릭 Firebase 로깅 (공통)
 * - 배너·전면·앱 열기·보상형 광고가 같은 파라미터 세트를 쓴다.
 * - 광고 클릭이 Firebase 로 보내는 유일한 이벤트다. 로깅 실패는 광고 동작을 막지 않는다.
 */
import { Platform } from 'react-native';
import { getAnalytics, getAppInstanceId, logEvent } from '@react-native-firebase/analytics';
import DeviceInfo from 'react-native-device-info';
import DateUtils from '@/src/utils/DateUtils';

export type AdClickFormat = 'banner' | 'interstitial' | 'rewarded' | 'app_open';

export const logAdClick = async (format: AdClickFormat, adUnitId: string, extra: Record<string, string> = {}): Promise<void> => {
	try {
		const instanceId = await getAppInstanceId(getAnalytics());
		await logEvent(getAnalytics(), `ad_${format}_clicked`, {
			ad_platform: 'admob',
			ad_format: format,
			ad_unit_id: adUnitId,
			app_name: DeviceInfo.getApplicationName(),
			app_version: DeviceInfo.getVersion(),
			build_number: DeviceInfo.getBuildNumber(),
			device_platform: Platform.OS,
			device_model: DeviceInfo.getModel(),
			device_brand: DeviceInfo.getBrand(),
			system_version: DeviceInfo.getSystemVersion(),
			app_instance_id: instanceId ?? '',
			timestamp: DateUtils.toISOString(),
			...extra,
		});
	} catch {
		// 로깅 실패는 무시 — 광고 표시와 무관
	}
};
