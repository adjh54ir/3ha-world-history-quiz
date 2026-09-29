/**
 * AdMob 광고 이벤트 Firebase 로깅 (공통)
 * - 배너·전면·앱 열기 광고가 같은 파라미터 세트를 쓴다.
 * - 로깅 실패는 광고 동작을 막지 않는다(삼켜서 경고만).
 */
import { Platform } from 'react-native';
import analytics from '@react-native-firebase/analytics';
import DeviceInfo from 'react-native-device-info';
import DateUtils from '@/src/utils/DateUtils';

/** 광고 종류별 고정 파라미터 */
export interface AdLogBase {
	/** banner | interstitial | app_open | rewarded */
	adFormat: string;
	adUnitId: string;
}

export const logAdEvent = async (
	name: string,
	base: AdLogBase,
	extra: Record<string, string | number | boolean> = {},
): Promise<void> => {
	try {
		const instanceId = await analytics().getAppInstanceId();
		await analytics().logEvent(name, {
			ad_platform: 'admob',
			ad_format: base.adFormat,
			ad_unit_id: base.adUnitId,
			app_name: DeviceInfo.getApplicationName(),
			app_version: DeviceInfo.getVersion(),
			build_number: DeviceInfo.getBuildNumber(),
			device_platform: Platform.OS,
			device_model: DeviceInfo.getModel(),
			device_brand: DeviceInfo.getBrand(),
			system_version: DeviceInfo.getSystemVersion(),
			app_instance_id: instanceId,
			timestamp: DateUtils.toISOString(),
			...extra,
		});
	} catch (e) {
		console.warn(`❌ [AdMob] ${name} 로깅 실패:`, e);
	}
};

export default logAdEvent;
