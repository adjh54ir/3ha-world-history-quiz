import { Platform } from 'react-native';
import { getAnalytics, getAppInstanceId, logEvent } from '@react-native-firebase/analytics';
import DeviceInfo from 'react-native-device-info';
import DateUtils from '@/src/utils/DateUtils';

/**
 * 광고 이벤트 로깅 (배너 / 전면 / 앱 오프닝 공통)
 * -------------------------------------------------
 * - 세 광고 컴포넌트가 같은 파라미터 묶음을 각자 만들어 쓰던 것을 여기 한 곳으로 모았다.
 * - v22 부터 네임스페이스 API(`analytics().logEvent`)는 deprecated 경고를 띄운다 → 모듈러 API 사용.
 */

type AdFormatLabel = 'banner' | 'interstitial' | 'app_open' | 'rewarded';

/**
 * @param name 이벤트 이름 (예: 'ad_app_open_clicked')
 * @param format 광고 형식 (ad_format 파라미터)
 * @param adUnitId 실제 요청에 쓴 광고 유닛 ID
 * @param additionalParams 이벤트별 추가 값 (예: error_message)
 */
export const logAdEvent = async (
	name: string,
	format: AdFormatLabel,
	adUnitId: string,
	additionalParams: Record<string, unknown> = {},
): Promise<void> => {
	try {
		const analytics = getAnalytics();
		const instanceId = await getAppInstanceId(analytics);
		await logEvent(analytics, name, {
			ad_platform: 'admob', // 📌 광고 플랫폼 이름
			ad_format: format, // 📌 광고 형식 (배너/전면/앱 오프닝)
			ad_unit_id: adUnitId, // 📌 실제 사용 중인 광고 유닛 ID (식별/필터링용)
			app_name: DeviceInfo.getApplicationName(), // 📱 앱 이름
			app_version: DeviceInfo.getVersion(), // 🏷️ 앱 버전
			build_number: DeviceInfo.getBuildNumber(), // 🏗️ 빌드 번호
			device_platform: Platform.OS, // 💻 디바이스 플랫폼
			device_model: DeviceInfo.getModel(), // 📱 기기 모델명
			device_brand: DeviceInfo.getBrand(), // 🏷️ 제조사
			system_version: DeviceInfo.getSystemVersion(), // 🧪 OS 버전
			app_instance_id: instanceId, // 🆔 Firebase 고유 사용자 식별자 (익명 추적 ID)
			timestamp: DateUtils.now().toISOString(), // 🕒 이벤트 발생 시각 (ISO)
			...additionalParams, // 🧩 기타 추가 파라미터
		});
	} catch (error) {
		console.error(`❌ Failed to log ${name}:`, error);
	}
};

export default logAdEvent;
