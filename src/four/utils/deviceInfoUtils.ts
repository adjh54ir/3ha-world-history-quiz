import { Alert, BackHandler, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';

const deviceInfoUtils = {
	/**
	 * 하드웨어 뒤로가기 막기
	 */
	hardwareBackRemove: (navigation: any, action?: () => boolean) => {
		const backAction = () => {
			if (action) {
				return action(); // 사용자가 true/false 반환
			} else {
				navigation.goBack();
				return true;
			}
		};

		const subscription = BackHandler.addEventListener('hardwareBackPress', backAction);
		return () => {
			subscription.remove();
		};
	},

	/**
	 * 플랫폼 종류 반환
	 */
	getPlatformType: (): string => {
		if (Platform.OS === 'macos' || Platform.OS === 'web' || Platform.OS === 'windows') {
			Alert.alert('지원하지 않는 플랫폼입니다.');
		}
		return Platform.OS;
	},

	/**
	 * 디바이스 타입
	 */
	getDeviceType: (): string => DeviceInfo.getDeviceType(),

	/**
	 * 시스템 이름 (예: iOS, Android)
	 */
	getSystemName: (): string => DeviceInfo.getSystemName(),

	/**
	 * 시스템 버전 (예: 16.2)
	 */
	getSystemVersion: (): string => DeviceInfo.getSystemVersion(),

	/**
	 * 고유 ID 반환
	 */
	getUniqueId: async (): Promise<string> => {
		return await DeviceInfo.getUniqueId();
	},

	/**
	 * IP 주소 반환
	 */
	getIpAddress: async (): Promise<string> => {
		try {
			return await DeviceInfo.getIpAddress();
		} catch (error) {
			console.error('IP 주소를 가져오는데 실패했습니다:', error);
			return '';
		}
	},

	/**
	 * 태블릿 여부 확인
	 */
	/**
	 * 네이티브 태블릿 판정 — 기기 정보 용도로만 쓴다.
	 * 레이아웃(기둥 폭·열 수·배율)은 화면 크기 기준인 DementionUtils 의 isTablet 을 써야 한다.
	 * 두 판정은 경계 기기에서 답이 갈릴 수 있어 섞어 쓰면 같은 화면에서 값이 어긋난다.
	 */
	isTablet: (): boolean => DeviceInfo.isTablet(),

	/**
	 * iPad 여부 확인
	 */
	isIPad: (): boolean => DeviceInfo.getModel().substring(0, 4) === 'iPad',
};

export default deviceInfoUtils;
