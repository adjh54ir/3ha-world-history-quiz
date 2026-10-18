import { Platform } from 'react-native';

import i18n from '@/src/translations';
import { CommonType } from '@/src/types/CommonType';
import DateUtils from '@/src/utils/DateUtils';

export const COMMON_APPS_DATA: {
	Apps: CommonType.AppItem[];
} = {
	Apps: [
		{
			id: 32,
			icon: require('@/src/assets/appicons/main_dinosaurquiz.webp'),
			title: i18n.t('apps.dinosaurquiz.title'),
			desc: i18n.t('apps.dinosaurquiz.desc'),
			category: 'quiz',
			releasedAt: '2026-10-18',
			android: 'https://play.google.com/store/apps/details?id=com.tha.dinosaurquiz',
			ios: 'https://apps.apple.com/kr/app/id6822555212',
		},
		{
			id: 31,
			icon: require('@/src/assets/appicons/main_familyevent.webp'),
			title: i18n.t('apps.familyevent.title'),
			desc: i18n.t('apps.familyevent.desc'),
			category: 'utility',
			// 출시일 미정 — 실제 스토어 출시일로 고쳐 주세요
			releasedAt: '2026-10-01',
			android: 'https://play.google.com/store/apps/details?id=com.tha.familyevent',
			ios: 'https://apps.apple.com/kr/app/id6814714209',
		},
		{
			id: 30,
			icon: require('@/src/assets/appicons/main_lifehanja.webp'),
			title: i18n.t('apps.lifehanja.title'),
			desc: i18n.t('apps.lifehanja.desc'),
			category: 'quiz',
			// 출시 전 — 실제 스토어 출시일로 고쳐 주세요
			releasedAt: '2026-10-01',
			android: 'https://play.google.com/store/apps/details?id=com.tha.lifehanja',
			ios: 'https://apps.apple.com/kr/app/id6815041813',
		},
		{
			id: 29,
			icon: require('@/src/assets/appicons/main_birthdaylog.webp'),
			title: i18n.t('apps.birthdaylog.title'),
			desc: i18n.t('apps.birthdaylog.desc'),
			category: 'utility',
			// 출시일 미정 — 오늘 날짜로 넣어 둠, 실제 스토어 출시일로 고쳐 주세요
			releasedAt: '2026-09-30',
			android: 'https://play.google.com/store/apps/details?id=com.tha.birthdaylog',
			ios: 'https://apps.apple.com/kr/app/id6815043532',
		},
		{
			id: 28,
			icon: require('@/src/assets/appicons/main_jptravel.webp'),
			title: i18n.t('apps.jptravel.title'),
			desc: i18n.t('apps.jptravel.desc'),
			category: 'utility',
			releasedAt: '2026-09-29',
			android: 'https://play.google.com/store/apps/details?id=com.tha.jptravel',
			ios: 'https://apps.apple.com/kr/app/id6815037133',
		},
		{
			id: 27,
			icon: require('@/src/assets/appicons/main_noisemeter.webp'),
			title: i18n.t('apps.noisemeter.title'),
			desc: i18n.t('apps.noisemeter.desc'),
			category: 'utility',
			releasedAt: '2026-09-15',
			android: 'https://play.google.com/store/apps/details?id=com.tha.apartmentnoise',
			ios: 'https://apps.apple.com/kr/app/id6810932339',
		},
		{
			id: 26,
			icon: require('@/src/assets/appicons/main_qrmaker.webp'),
			title: i18n.t('apps.qrmaker.title'),
			desc: i18n.t('apps.qrmaker.desc'),
			category: 'utility',
			// 아이콘을 넣은 날 기준 추정값 — 실제 스토어 출시일로 고쳐 주세요
			releasedAt: '2026-09-04',
			android: 'https://play.google.com/store/apps/details?id=com.tha.qrbar',
			ios: 'https://apps.apple.com/kr/app/id6807281540',
		},
		{
			id: 25,
			icon: require('@/src/assets/appicons/main_spitogenie.webp'),
			title: i18n.t('apps.spitogenie.title'),
			desc: i18n.t('apps.spitogenie.desc'),
			releasedAt: '2026-09-04',
			android: 'https://play.google.com/store/apps/details?id=com.tha.spitogenie',
			ios: 'https://apps.apple.com/kr/app/id6807646866',
			category: 'utility',
		},
		{
			id: 24,
			icon: require('@/src/assets/appicons/main_koreaquiz.webp'),
			title: i18n.t('apps.koreaquiz.title'),
			desc: i18n.t('apps.koreaquiz.desc'),
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.koreaquiz',
			ios: 'https://apps.apple.com/kr/app/id6785823631',
		},
		{
			id: 23,
			icon: require('@/src/assets/appicons/main_hanpick.webp'),
			title: i18n.t('apps.hanpick.title'),
			desc: i18n.t('apps.hanpick.desc'),
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.hanpick',
			ios: 'https://apps.apple.com/kr/app/id6801430351',
		},
		{
			id: 22,
			icon: require('@/src/assets/appicons/main_vaulty.webp'),
			title: i18n.t('apps.vaulty.title'),
			desc: i18n.t('apps.vaulty.desc'),
			category: 'utility',
			android: 'https://play.google.com/store/apps/details?id=com.tha.picturevault',
			ios: 'https://apps.apple.com/kr/app/id6789028942',
		},
		{
			id: 21,
			// icon: require('@/src/assets/appicons/main_mindCare.webp'),
			icon: require('@/src/assets/appicons/main_mindCare.webp'),
			title: i18n.t('apps.mindCare.title'),
			desc: i18n.t('apps.mindCare.desc'),
			category: 'utility',
			android: 'https://play.google.com/store/apps/details?id=com.tha.metalcare',
			ios: 'https://apps.apple.com/kr/app/id6787877075',
		},
		{
			id: 20,
			icon: require('@/src/assets/appicons/main_financeCalc.webp'),
			title: i18n.t('apps.financeCalc.title'),
			desc: i18n.t('apps.financeCalc.desc'),
			category: 'calculator',
			android: 'https://play.google.com/store/apps/details?id=com.tha.lifefinancecalc',
			ios: 'https://apps.apple.com/kr/app/id6759258758',
		},
		{
			id: 19,
			icon: require('@/src/assets/appicons/main_infinityOper.webp'),
			title: i18n.t('apps.infinityOper.title'),
			desc: i18n.t('apps.infinityOper.desc'),
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.infinityoperations',
			ios: 'https://apps.apple.com/kr/app/id6775210879',
		},
		{
			id: 18,
			icon: require('@/src/assets/appicons/main_bloodType.webp'),
			title: i18n.t('apps.bloodType.title'),
			desc: i18n.t('apps.bloodType.desc'),
			category: 'utility',
			android: 'https://play.google.com/store/apps/details?id=com.tha.bloodtype',
			ios: 'https://apps.apple.com/kr/app/id6769299321',
		},
		{
			id: 17,
			icon: require('@/src/assets/appicons/main_linkManager.webp'),
			title: i18n.t('apps.linkManager.title'),
			desc: i18n.t('apps.linkManager.desc'),
			category: 'utility',
			android: 'https://play.google.com/store/apps/details?id=com.tha.linkmanager',
			ios: 'https://apps.apple.com/kr/app/id6761520189',
		},
		{
			id: 16,
			icon: require('@/src/assets/appicons/main_emotionalEmoticon.webp'),
			title: i18n.t('apps.emotionalEmoticon.title'),
			desc: i18n.t('apps.emotionalEmoticon.desc'),
			category: 'utility',
			android: 'https://play.google.com/store/apps/details?id=com.tha.emotionalemoticon',
			ios: 'https://apps.apple.com/kr/app/id6760441156',
		},
		{
			id: 15,
			icon: require('@/src/assets/appicons/main_purekoreanquiz.webp'),
			title: i18n.t('apps.purekoreanquiz.title'),
			desc: i18n.t('apps.purekoreanquiz.desc'),
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.purekoreanquiz',
			ios: 'https://apps.apple.com/kr/app/id6759251931',
		},
		{
			id: 14,
			icon: require('@/src/assets/appicons/main_unitCalc.webp'),
			title: i18n.t('apps.unitCalc.title'),
			desc: i18n.t('apps.unitCalc.desc'),
			category: 'calculator',
			android: 'https://play.google.com/store/apps/details?id=com.tha.unitcalc',
			ios: 'https://apps.apple.com/kr/app/id6757512881',
		},
		{
			id: 13,
			icon: require('@/src/assets/appicons/main_choncalc.webp'),
			title: i18n.t('apps.choncalc.title'),
			desc: i18n.t('apps.choncalc.desc'),
			category: 'calculator',
			android: 'https://play.google.com/store/apps/details?id=com.tha.choncalcquiz',
			ios: 'https://apps.apple.com/kr/app/id6755925570',
		},
		{
			id: 12,
			icon: require('@/src/assets/appicons/main_emotionbutton.webp'),
			title: i18n.t('apps.emotionbutton.title'),
			desc: i18n.t('apps.emotionbutton.desc'),
			category: 'utility',
			android: 'https://play.google.com/store/apps/details?id=com.tha.emotionbutton',
			ios: 'https://apps.apple.com/kr/app/id6755211160',
		},
		{
			id: 11,
			icon: require('@/src/assets/appicons/main_agecalc.webp'),
			title: i18n.t('apps.agecalc.title'),
			desc: i18n.t('apps.agecalc.desc'),
			category: 'calculator',
			android: 'https://play.google.com/store/apps/details?id=com.tha.agecalc',
			ios: 'https://apps.apple.com/kr/app/id6754360556',
		},
		{
			id: 10,
			icon: require('@/src/assets/appicons/main_spellingquiz.webp'),
			title: i18n.t('apps.spellingquiz.title'),
			desc: i18n.t('apps.spellingquiz.desc'),
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.spellingquiz',
			ios: 'https://apps.apple.com/kr/app/id6753701785',
		},
		{
			id: 9,
			icon: require('@/src/assets/appicons/main_idiomquiz.webp'),
			title: i18n.t('apps.idiomquiz.title'),
			desc: i18n.t('apps.idiomquiz.desc'),
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.idiomquiz',
			ios: 'https://apps.apple.com/kr/app/id6752314974',
		},
		{
			id: 8,
			icon: require('@/src/assets/appicons/main_catquiz.webp'),
			title: i18n.t('apps.catquiz.title'),
			desc: i18n.t('apps.catquiz.desc'),
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.catquiz',
			ios: 'https://apps.apple.com/kr/app/id6751539764',
		},
		{
			id: 7,
			icon: require('@/src/assets/appicons/main_todaycigarette.webp'),
			title: i18n.t('apps.todaycigarette.title'),
			desc: i18n.t('apps.todaycigarette.desc'),
			category: 'utility',
			android: 'https://play.google.com/store/apps/details?id=com.tha.todaycigarette',
			ios: 'https://apps.apple.com/kr/app/id6749576206',
		},
		{
			id: 6,
			icon: require('@/src/assets/appicons/main_dogquiz.webp'),
			title: i18n.t('apps.dogquiz.title'),
			desc: i18n.t('apps.dogquiz.desc'),
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.dogquiz',
			ios: 'https://apps.apple.com/kr/app/id6749044123',
		},
		{
			id: 5,
			icon: require('@/src/assets/appicons/main_fouridioms.webp'),
			title: i18n.t('apps.fouridioms.title'),
			desc: i18n.t('apps.fouridioms.desc'),
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.fouridioms',
			ios: 'https://apps.apple.com/kr/app/id6747324308',
		},
		{
			id: 4,
			icon: require('@/src/assets/appicons/main_proverb.webp'),
			title: i18n.t('apps.proverb.title'),
			desc: i18n.t('apps.proverb.desc'),
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.proverbquiz',
			ios: 'https://apps.apple.com/kr/app/id6746687973',
		},
		{
			id: 3,
			icon: require('@/src/assets/appicons/main_country.webp'),
			title: i18n.t('apps.country.title'),
			desc: i18n.t('apps.country.desc'),
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.capitalquiz',
			ios: 'https://apps.apple.com/kr/app/id6746687390',
		},
		{
			id: 2,
			icon: require('@/src/assets/appicons/main_lotto.webp'),
			title: i18n.t('apps.lotto.title'),
			desc: i18n.t('apps.lotto.desc'),
			category: 'utility',
			android: 'https://play.google.com/store/apps/details?id=com.tha.lottogenerator',
			ios: 'https://apps.apple.com/kr/app/id6746621734',
		},
		{
			id: 1,
			icon: require('@/src/assets/appicons/squaremetercalc2.webp'),
			title: i18n.t('apps.squaremetercalc.title'),
			desc: i18n.t('apps.squaremetercalc.desc'),
			category: 'calculator',
			android: 'https://play.google.com/store/apps/details?id=com.tha.squaremetercalc',
			ios: 'https://apps.apple.com/kr/app/id6746688301',
		},
	],
};

/**
 * 지금 기기에서 열 수 있는 스토어 주소. 없으면 null.
 * 반대 플랫폼 링크로 대체하지 않는다 — 한쪽에만 출시된 앱에서 안드로이드 사용자를
 * 앱스토어 페이지로 보내면 설치가 아예 불가능한 화면만 보게 된다.
 */
export const appStoreUrl = (app: CommonType.AppItem): string | null =>
	(Platform.OS === 'android' ? app.android : app.ios) || null;

/** NEW 배지가 붙는 기간 */
const NEW_APP_DAYS = 60;

/**
 * 갓 나온 앱인지.
 * -------------------------------------------------
 * 예전에는 "id 가 가장 큰 두 개" 를 NEW 로 봤다. 그러면 새 앱을 한참 안 올린 동안에도
 * 같은 앱에 NEW 가 영영 붙어 있어, 배지가 아무 뜻도 없는 장식이 된다.
 * 출시일이 적힌 앱만, 그것도 최근 것만 배지를 단다(안 적힌 앱은 붙지 않는다).
 */
export const isNewApp = (app: CommonType.AppItem, now = DateUtils.now()): boolean => {
	if (!app.releasedAt || !/^\d{4}-\d{2}-\d{2}$/.test(app.releasedAt)) return false;
	// 기기 타임존의 날짜 단위로 센다 — UTC 자정으로 세면 한국에서는 배지가 오전 9시에 바뀌었다
	const days = DateUtils.differenceInLocalDays(app.releasedAt, DateUtils.getLocalDateString(now));
	return days >= 0 && days <= NEW_APP_DAYS;
};
