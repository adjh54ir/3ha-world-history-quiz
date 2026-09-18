import { Platform } from 'react-native';
import DateUtils from '@/src/utils/DateUtils';

import { CommonType } from '@/src/types/CommonType';

export const COMMON_APPS_DATA: {
	Apps: CommonType.AppItem[];
} = {
	Apps: [
		{
			id: 27,
			icon: require('@/src/assets/appicons/main_noisemeter.webp'),
			title: '소음 측정기',
			desc: '소음 측정기는 층간소음·생활 소음을 데시벨로 재고 녹음해, 최고소음도와 1·5분 등가소음도를 주간·야간 기준과 견주어 제출용 측정 결과 보고서 한 장으로 만들어 주는 소음 기록 앱입니다.',
			category: 'utility',
			releasedAt: '2026-09-15',
			android: "",
			// 안드로이드 미출시 — Play 스토어 페이지가 아직 없어 링크를 비워 둔다
			ios: 'https://apps.apple.com/us/app/id6810932339',
		},
		{
			id: 26,
			icon: require('@/src/assets/appicons/main_qrmaker.webp'),
			title: 'QRMaker',
			desc: 'QRMaker는 QR코드와 바코드를 간편하게 만들고 스캔해, 이미지·PDF로 저장하고 이력·메모로 관리할 수 있는 QR·바코드 생성기 앱입니다.',
			category: 'utility',
			// 아이콘을 넣은 날 기준 추정값 — 실제 스토어 출시일로 고쳐 주세요
			releasedAt: '2026-09-04',
			android: 'https://play.google.com/store/apps/details?id=com.tha.qrbar',
			ios: 'https://apps.apple.com/app/ko/id6807281540',
		},
		{
			id: 25,
			icon: require('@/src/assets/appicons/main_spitogenie.webp'),
			title: '스피또 지니',
			desc: '스피또 지니는 동행복권 발행내역을 바탕으로 남은 당첨금과 잔여 매수로 회차별 기대값·환급률을 계산해, 지금 사기 좋은 스피또 회차를 알려 주는 즉석복권 분석 앱입니다.',
			releasedAt: '2026-09-04',
			android: 'https://play.google.com/store/apps/details?id=com.tha.spitogenie',
			ios: 'https://apps.apple.com/us/app/id6807646866',
			category: 'utility',
		},
		{
			id: 24,
			icon: require('@/src/assets/appicons/main_koreaquiz.webp'),
			title: '한국어 상식 퀴즈',
			desc:
				'한국어 상식 퀴즈는 사자성어·속담·순우리말·위인 등 한국인이라면 알아야 할 한국어 상식을 퀴즈로 풀며 익히고, 틀린 문제는 오답 복습으로 반복 학습할 수 있는 한국어 학습 앱입니다.',
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.koreaquiz',
			ios: 'https://apps.apple.com/kr/app/id6785823631',
		},
		{
			id: 23,
			icon: require('@/src/assets/appicons/main_hanpick.webp'),
			title: '한자 급수 퀴즈',
			desc: '한자 급수 퀴즈는 한국어문회·한자교육진흥회 급수별 배정한자 6,182자를 훈음·부수·총획 퀴즈로 익히는 한자 급수 학습 앱입니다.',
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.hanpick',
			ios: 'https://apps.apple.com/us/app/id6801430351',
		},
		{
			id: 22,
			icon: require('@/src/assets/appicons/main_vaulty.webp'),
			title: 'PhotoLock',
			desc: '숨기고 싶은 사진과 영상을 갤러리에서 숨기고 PIN·지문으로 잠그는 프라이빗 보관함 앱입니다.',
			category: 'utility',
			android: 'https://play.google.com/store/apps/details?id=com.tha.picturevault',
			ios: 'https://apps.apple.com/kr/app/id6789028942',
		},
		{
			id: 21,
			// icon: require('@/src/assets/appicons/main_mindCare.webp'),
			icon: require('@/src/assets/appicons/main_mindCare.webp'),
			title: '마음:숲',
			desc:
				'감정 기록, 마음 나무 키우기, 스트레스 해소 도구, 힐링 사운드와 호흡 명상으로 지친 하루의 마음을 돌보는 앱입니다',
			category: 'utility',
			android: 'https://play.google.com/store/apps/details?id=com.tha.metalcare',
			ios: 'https://apps.apple.com/us/app/id6787877075',
		},
		{
			id: 20,
			icon: require('@/src/assets/appicons/main_financeCalc.webp'),
			title: '나만의 생활 금융 계산기',
			desc: '예금·적금·대출·연봉 등 생활 속 금융 계산을 한곳에서 빠르고 간편하게 해결할 수 있는 생활금융 계산기 앱.',
			category: 'calculator',
			android: 'https://play.google.com/store/apps/details?id=com.tha.lifefinancecalc',
			ios: 'https://apps.apple.com/us/app/id6759258758',
		},
		{
			id: 19,
			icon: require('@/src/assets/appicons/main_infinityOper.webp'),
			title: '무한 수학 퀴즈',
			desc: '매일 반복하며 수학 감각을 키우고, 점수와 뱃지로 성취감까지 쌓이는 수학 퀴즈 앱.',
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.infinityoperations',
			ios: 'https://apps.apple.com/us/app/id6775210879',
		},
		{
			id: 18,
			icon: require('@/src/assets/appicons/main_bloodType.webp'),
			title: '혈액형 연구소',
			desc: '혈액형에 관한 모든 것 — 유전 계산부터 궁합, 속설, 퀴즈, 헌혈까지 알고 싶은 정보를 담고 있는 앱입니다!',
			category: 'utility',
			android: 'https://play.google.com/store/apps/details?id=com.tha.bloodtype',
			ios: 'https://apps.apple.com/us/app/id6769299321',
		},
		{
			id: 17,
			icon: require('@/src/assets/appicons/main_linkManager.webp'),
			title: '퀵 링크: 스마트 링크 매니저',
			desc: '쉽게 저장하고 빠르게 찾아보세요. 나만의 폴더로 링크를 깔끔하게 관리해보세요!',
			category: 'utility',
			android: 'https://play.google.com/store/apps/details?id=com.tha.linkmanager',
			ios: 'https://apps.apple.com/kr/app/id6761520189',
		},
		{
			id: 16,
			icon: require('@/src/assets/appicons/main_emotionalEmoticon.webp'),
			title: '갬티콘: 감성 이모티콘',
			desc: '2,000개 이상의 텍스트 이모티콘이 기다리고 있어요. 탭 한 번으로 바로 복사, 어디서든 바로 붙여넣기를 해보세요!',
			category: 'utility',
			android: 'https://play.google.com/store/apps/details?id=com.tha.emotionalemoticon',
			ios: 'https://apps.apple.com/us/app/id6760441156',
		},
		{
			id: 15,
			icon: require('@/src/assets/appicons/main_purekoreanquiz.webp'),
			title: '순픽: 순우리말 퀴즈',
			desc:
				'순픽: 순우리말 퀴즈는 우리 고유의 아름다운 순우리말을 쉽고 재미있게 학습하고, 다양한 퀴즈를 통해 어휘력을 점검하며, 틀린 단어는 반복 학습으로 완전히 익힐 수 있도록 돕는 순우리말 학습 앱입니다.',
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.purekoreanquiz',
			ios: 'https://apps.apple.com/kr/app/id6759251931',
		},
		{
			id: 14,
			icon: require('@/src/assets/appicons/main_unitCalc.webp'),
			title: '나만의 단위 계산기',
			desc:
				'나만의 단위 계산기는 단위 계산과 생활 계산 기능을 하나로 모아, 자주 쓰는 계산기를 내 사용 방식에 맞게 구성하고 관리할 수 있는 올인원 계산기 앱으로, 일상은 물론 실무와 학습까지 폭넓게 활용할 수 있는 앱입니다.',
			category: 'calculator',
			android: 'https://play.google.com/store/apps/details?id=com.tha.unitcalc',
			ios: 'https://apps.apple.com/kr/app/id6757512881',
		},
		{
			id: 13,
			icon: require('@/src/assets/appicons/main_choncalc.webp'),
			title: '촌수 계산기 Plus+',
			desc:
				"촌수 계산기 Plus+: '단순한 촌수 계산기'를 넘어서, 당신의 가족 관계를 가장 정확하고 직관적으로 이해하도록 돕는 앱입니다. 부계·모계·인척 관계까지 촌수를 자동으로 계산해 주고, 방대한 친족 호칭을 검색해 즉시 확인할 수 있습니다. 게다가 재미있고 유익한 '가족 관계 퀴즈' 기능을 통해 자연스럽게 촌수 지식도 익힐 수 있어, 학습과 재미를 모두 잡은 종합 친족 도우미입니다.",
			category: 'calculator',
			android: 'https://play.google.com/store/apps/details?id=com.tha.choncalcquiz',
			ios: 'https://apps.apple.com/kr/app/id6755925570',
		},
		{
			id: 12,
			icon: require('@/src/assets/appicons/main_emotionbutton.webp'),
			title: '기분 팡: 나의 기분을 팡!',
			desc:
				'기분 팡: 나의 기분을 팡!은 지금 느끼는 기분을 버튼 하나로 표현하고,다양한 이펙트로 가볍게 스트레스를 풀 수 있는 앱입니다. 내가 좋아하는 이미지로 나만의 버튼을 만들고 자유롭게 배치해 나만의 감정 공간을 꾸며보세요.',
			category: 'utility',
			android: 'https://play.google.com/store/apps/details?id=com.tha.emotionbutton',
			ios: 'https://apps.apple.com/kr/app/id6755211160',
		},
		{
			id: 11,
			icon: require('@/src/assets/appicons/main_agecalc.webp'),
			title: '나이 계산기: 오늘의 나이',
			desc:
				"나이 계산기: 오늘의 나이는 단순한 '나이 계산기'를 넘어, 당신의 생일에 담긴 의미와 인생의 흐름을 알려주는 앱입니다. 음력·양력 변환은 기본, 당신의 띠·별자리·탄생석·탄생화·탄생목·탄생색·수호성까지 모두 한 눈에 볼 수 있습니다.",
			category: 'calculator',
			android: 'https://play.google.com/store/apps/details?id=com.tha.agecalc',
			ios: 'https://apps.apple.com/us/app/id6754360556',
		},
		{
			id: 10,
			icon: require('@/src/assets/appicons/main_spellingquiz.webp'),
			title: '맞픽: 맞춤법 퀴즈',
			desc:
				"다양한 대한민국 맞춤법을 쉽고 재미있게 학습 할 수 있도록 도와주는 학습형 퀴즈앱입니다. 퀴즈를 통해 익힌 지식을 점검하고, 틀린 문제는 '오답 복습'' 기능으로 반복 학습할 수 있어 완벽한 관용구 마스터에 한 걸음 더 다가갈 수 있습니다.",
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.spellingquiz',
			ios: 'https://apps.apple.com/us/app/id6753701785',
		},
		{
			id: 9,
			icon: require('@/src/assets/appicons/main_idiomquiz.webp'),
			title: '관픽: 관용구 퀴즈',
			desc:
				"다양한 대한민국 관용구를 쉽고 재미있게 학습 할 수 있도록 도와주는 학습형 퀴즈앱입니다. 퀴즈를 통해 익힌 지식을 점검하고, 틀린 문제는 '오답 복습' 기능으로 반복 학습할 수 있어 완벽한 관용구 마스터에 한 걸음 더 다가갈 수 있습니다.",
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.idiomquiz',
			ios: 'https://apps.apple.com/kr/app/id6752314974',
		},
		{
			id: 8,
			icon: require('@/src/assets/appicons/main_catquiz.webp'),
			title: '냥픽: 고양이 퀴즈',
			desc:
				'냥픽: 고양이 퀴즈는 다양한 묘종을 재미있게 배우고, 퀴즈와 반복 학습, 타임 챌린지를 통해 지식을 쌓아가며 캐릭터와 뱃지를 모으는 게임형 학습 앱입니다.',
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.catquiz',
			ios: 'https://apps.apple.com/kr/app/id6751539764',
		},
		{
			id: 7,
			icon: require('@/src/assets/appicons/main_todaycigarette.webp'),
			title: '오흡: 오늘 흡연 기록',
			desc: '"작은 기록이 만든 큰 변화, 오늘부터 시작하세요!" 흡연 습관을 정확하게 파악하고, 금연의 첫 걸음을 함께하세요.',
			category: 'utility',
			android: 'https://play.google.com/store/apps/details?id=com.tha.todaycigarette',
			ios: 'https://apps.apple.com/kr/app/id6749576206',
		},
		{
			id: 6,
			icon: require('@/src/assets/appicons/main_dogquiz.webp'),
			title: '멍픽: 강아지 퀴즈',
			desc: '강아지 견종을 학습하고 퀴즈로 기억을하는 도감형 학습 앱입니다.',
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.dogquiz',
			ios: 'https://apps.apple.com/kr/app/id6749044123',
		},
		{
			id: 5,
			icon: require('@/src/assets/appicons/main_fouridioms.webp'),
			title: '사픽: 사자성어 퀴즈',
			desc: '사자성어를 카드로 학습하고 퀴즈로 실력을 점검할 수 있는 교육용 앱입니다.',
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.fouridioms',
			ios: 'https://apps.apple.com/kr/app//id6747324308',
		},
		{
			id: 4,
			icon: require('@/src/assets/appicons/main_proverb.webp'),
			title: '속픽: 속담 퀴즈',
			desc: '속담을 학습하고 다양한 퀴즈로 점검하며 반복 복습할 수 있는 교육용 앱입니다.',
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.proverbquiz',
			ios: 'https://apps.apple.com/app/id6746687973',
		},
		{
			id: 3,
			icon: require('@/src/assets/appicons/main_country.webp'),
			title: '수픽: 수도 퀴즈',
			desc: '전 세계 수도를 학습하고 퀴즈로 확인할 수 있는 교육용 앱입니다.',
			category: 'quiz',
			android: 'https://play.google.com/store/apps/details?id=com.tha.capitalquiz',
			ios: 'https://apps.apple.com/app/id6746687390',
		},
		{
			id: 2,
			icon: require('@/src/assets/appicons/main_lotto.webp'),
			title: '로또 지니: 로또 생성기',
			desc: '로또 당첨 확인, 통계 분석, 번호 생성 등 로또 기능을 한 곳에 모은 앱입니다.',
			category: 'utility',
			android: 'https://play.google.com/store/apps/details?id=com.tha.lottogenerator',
			ios: 'https://apps.apple.com/app/id6746621734',
		},
		{
			id: 1,
			icon: require('@/src/assets/appicons/squaremetercalc2.webp'),
			title: '평수 계산기',
			desc: '㎡(제곱미터)와 평(坪)을 쉽게 변환하고 평당 금액을 계산할 수 있는 계산기 앱입니다.',
			category: 'calculator',
			android: 'https://play.google.com/store/apps/details?id=com.tha.squaremetercalc',
			ios: 'https://apps.apple.com/app/id6746688301',
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
export const isNewApp = (app: CommonType.AppItem, now = DateUtils.nowTime()): boolean => {
	if (!app.releasedAt) return false;
	const released = Date.parse(`${app.releasedAt}T00:00:00Z`);
	if (Number.isNaN(released)) return false;
	// 날짜 단위로 센다 — 시각까지 보면 딱 60일째 되는 날 오전에 배지가 사라져 하루가 잘린다
	const days = Math.floor((now - released) / 86400000);
	return days >= 0 && days <= NEW_APP_DAYS;
};
