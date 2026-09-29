import { Share } from 'react-native';
import { APP_NAME, APP_DESCRIPTION, GOOGLE_PLAY_STORE_URL, APP_STORE_URL } from '@/src/const/EnvCompat';

/**
 * 앱 추천 공유 메시지 생성
 * - .env(EXPO_PUBLIC_*)의 앱 이름/설명/스토어 주소를 기반으로,
 *   지인에게 추천하는 말투로 재구성한다.
 */
export const buildAppShareMessage = (): string => {
	const lines: string[] = ['요즘 제가 재미있게 쓰고 있는 앱이 있어서 추천드려요! 😊', ''];
	// 앱 이름 · 설명 (연속 줄)
	if (APP_NAME) lines.push(APP_NAME);
	if (APP_DESCRIPTION) lines.push(APP_DESCRIPTION);
	lines.push('', '👇 아래 링크에서 받아보세요');
	if (GOOGLE_PLAY_STORE_URL) lines.push(`• Android: ${GOOGLE_PLAY_STORE_URL}`, '');
	if (APP_STORE_URL) lines.push(`• iOS: ${APP_STORE_URL}`);
	return lines.join('\n').trim();
};

/** 앱 추천 공유 시트 열기 */
export const shareApp = (): Promise<void> =>
	Share.share({ message: buildAppShareMessage() })
		.then(() => undefined)
		.catch(() => undefined);

export default { buildAppShareMessage, shareApp };
