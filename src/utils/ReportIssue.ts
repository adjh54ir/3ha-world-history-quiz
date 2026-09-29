/**
 * 문항 오류 제보
 * -------------------------------------------------
 * 역사·인물·표기처럼 논쟁 소지가 있는 데이터는 사용자가 바로 알릴 수 있어야
 * 스토어 리뷰로 번지지 않는다. 메일 본문에 문항 식별 정보를 미리 채워 보낸다.
 */
import { Linking } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { showAlert } from '@/src/screens/common/modal/ConfirmModal';
import i18n from '@/src/translations';

const CONTACT_MAIL = 'adjh54ir@gmail.com';

export interface QuizIssueTarget {
	/** 문항 고유 키 (도메인+id) */
	uid?: string;
	/** 주제 키 */
	domain?: string;
	/** 문제 문장 */
	prompt: string;
	/** 정답 */
	answer?: string;
	/** 해설 */
	explanation?: string;
}

/** 메일 본문 — 사용자는 '무엇이 잘못됐는지'만 쓰면 되게 나머지를 채워 둔다 */
export const buildIssueBody = (t: QuizIssueTarget): string =>
	[
		i18n.t('svc.report.intro'),
		'',
		i18n.t('svc.report.ask'),
		'',
		'',
		'────────────────',
		i18n.t('svc.report.keepInfo'),
		i18n.t('svc.report.prompt', { value: t.prompt }),
		t.answer ? i18n.t('svc.report.answer', { value: t.answer }) : '',
		t.explanation ? i18n.t('svc.report.explanation', { value: t.explanation }) : '',
		t.uid ? i18n.t('svc.report.uid', { value: t.uid }) : '',
		t.domain ? i18n.t('svc.report.domain', { value: t.domain }) : '',
		i18n.t('svc.report.version', { version: DeviceInfo.getVersion(), build: DeviceInfo.getBuildNumber() }),
	]
		.filter(Boolean)
		.join('\n');

/**
 * 메일 앱 열기 — 시뮬레이터·메일 앱 미설치 기기는 openURL 이 -10814 로 실패한다.
 * 먼저 canOpenURL 로 확인하고, 못 열면 주소를 안내해 사용자가 길을 잃지 않게 한다.
 */
const openMail = async (subject: string, body?: string): Promise<void> => {
	const query = [`subject=${encodeURIComponent(subject)}`, body ? `body=${encodeURIComponent(body)}` : '']
		.filter(Boolean)
		.join('&');
	const url = `mailto:${CONTACT_MAIL}?${query}`;
	try {
		if (!(await Linking.canOpenURL(url))) throw new Error('no mail app');
		await Linking.openURL(url);
	} catch {
		await showAlert(i18n.t('svc.report.noMailTitle'), i18n.t('svc.report.noMailMessage', { mail: CONTACT_MAIL }), 'mail-outline');
	}
};

/** 메일 앱으로 오류 제보 열기 (메일 앱이 없으면 안내) */
export const reportQuizIssue = async (t: QuizIssueTarget): Promise<void> =>
	openMail(i18n.t('svc.report.issueSubject'), buildIssueBody(t));

/** 설정 화면의 일반 문의 */
export const openContactMail = async (): Promise<void> => openMail(i18n.t('svc.report.contactSubject'));

export default { reportQuizIssue, buildIssueBody, openContactMail };
