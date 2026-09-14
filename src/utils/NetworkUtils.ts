import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

let hasShownAlert = false;

export const checkDeviceNetConListener = () => {
	NetInfo.addEventListener((state) => {
		if (!state.isConnected) {
			if (!hasShownAlert) {
				Alert.alert('📡 네트워크 끊김', '인터넷 연결이 끊겼습니다.');
				hasShownAlert = true;
			}
		} else {
			hasShownAlert = false; // 다시 연결되면 초기화
		}
	});
};
