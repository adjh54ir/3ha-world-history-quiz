import { Linking, Platform, Share } from 'react-native';
import i18n from '@/src/translations';
import { APP_NAME, APP_DESCRIPTION } from '@/src/const/EnvCompat';

/**
 * 이 앱의 스토어 출시 링크 — CommonAppsData 의 앱 항목과 같은 형식으로 여기서 다시 선언한다(참조하지 않음).
 * android: 패키지명(app.json android.package), ios: App Store Connect 앱 ID(eas.json submit.ascAppId)
 */
const THIS_APP_STORE_LINKS = {
	android: 'https://play.google.com/store/apps/details?id=com.tha.worldhistoryquiz',
	ios: 'https://apps.apple.com/kr/app/id6822964124',
} as const;

/** 리뷰 작성 화면 — 스토어 앱으로 먼저 열고, 실패하면 웹 주소로 연다 */
const THIS_APP_REVIEW_LINKS = {
	android: ['market://details?id=com.tha.worldhistoryquiz', THIS_APP_STORE_LINKS.android],
	ios: ['itms-apps://apps.apple.com/app/id6822964124?action=write-review', 'https://apps.apple.com/app/id6822964124?action=write-review'],
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
	// 공유하는 기기의 스토어 링크 하나만 넣는다
	lines.push(Platform.OS === 'ios' ? THIS_APP_STORE_LINKS.ios : THIS_APP_STORE_LINKS.android);
	return lines.join('\n').trim();
};

/** 앱 추천 공유 시트 열기 */
export const shareApp = (): Promise<void> =>
	Share.share({ message: buildAppShareMessage() })
		.then(() => undefined)
		.catch(() => undefined);

/** 앱 평가하기 — 현재 기기 스토어의 리뷰 작성 화면 열기 */
export const openStoreReview = (): Promise<void> => {
	const [app, web] = Platform.OS === 'ios' ? THIS_APP_REVIEW_LINKS.ios : THIS_APP_REVIEW_LINKS.android;
	return Linking.openURL(app)
		.catch(() => Linking.openURL(web))
		.catch(() => undefined);
};

export default { buildAppShareMessage, shareApp, openStoreReview };
