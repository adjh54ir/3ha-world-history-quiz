import { Share } from 'react-native';
import i18n from '@/src/translations';
import { APP_NAME, APP_DESCRIPTION } from '@/src/const/EnvCompat';

/**
 * 이 앱의 스토어 출시 링크 — CommonAppsData 의 앱 항목과 같은 형식으로 여기서 다시 선언한다(참조하지 않음).
 * android: 패키지명(app.json android.package), ios: App Store Connect 앱 ID(eas.json submit.ascAppId)
 */
const THIS_APP_STORE_LINKS = {
	android: 'https://play.google.com/store/apps/details?id=com.tha.worldhistoryquiz',
	ios: 'https://apps.apple.com/kr/app/id6785401301',
} as const;

/**
 * 앱 추천 공유 메시지 생성
 * - .env(EXPO_PUBLIC_*)의 앱 이름/설명 + 이 앱의 스토어 출시 링크(THIS_APP_STORE_LINKS)를 기반으로,
 *   지인에게 추천하는 말투로 재구성한다.
 */
export const buildAppShareMessage = (): string => {
	const lines: string[] = [i18n.t('svc.share.appIntro'), ''];
	// 앱 이름 · 설명 (연속 줄)
	if (APP_NAME) lines.push(APP_NAME);
	if (APP_DESCRIPTION) lines.push(APP_DESCRIPTION);
	lines.push('', i18n.t('svc.share.appLink'));
	// 받는 사람의 기기를 알 수 없으므로 두 스토어 링크를 모두 넣는다
	lines.push(`• Android: ${THIS_APP_STORE_LINKS.android}`, '');
	lines.push(`• iOS: ${THIS_APP_STORE_LINKS.ios}`);
	return lines.join('\n').trim();
};

/** 앱 추천 공유 시트 열기 */
export const shareApp = (): Promise<void> =>
	Share.share({ message: buildAppShareMessage() })
		.then(() => undefined)
		.catch(() => undefined);

export default { buildAppShareMessage, shareApp };
