/**
 * 뱃지 획득 공유
 * -------------------------------------------------
 * 화면에 이미 그려진 뱃지 카드를 그대로 캡처해 이미지로 공유한다.
 * 네이티브 모듈이 없거나(리빌드 전) 캡처가 실패하면 텍스트 공유로 자연히 내려간다.
 */
import { Share } from 'react-native';
import type { RefObject } from 'react';
import i18n from '@/src/translations';
import { buildAppShareMessage } from './AppShare';

/** 공유 문구 — 뱃지 이름 + 수집 현황 + 앱 추천 링크 */
export const buildBadgeShareMessage = (title: string, unlocked?: number, total?: number): string => {
	const head = i18n.t('svc.share.badgeHead', { title });
	const progress = unlocked && total ? `\n${i18n.t('svc.share.badgeProgress', { unlocked, total })}` : '';
	return `${head}${progress}\n\n${buildAppShareMessage()}`;
};

/**
 * 뱃지 카드를 이미지로 공유. 실패하면 텍스트만 공유한다.
 * @param cardRef 캡처할 View의 ref (뱃지 카드 전체)
 */
export const shareBadge = async (
	cardRef: RefObject<any>,
	title: string,
	unlocked?: number,
	total?: number,
): Promise<void> => {
	await shareCapture(cardRef, buildBadgeShareMessage(title, unlocked, total));
};

/** 챌린지 기록 공유 문구 — 기록 한 줄 + 앱 추천 링크 */
export const buildRecordShareMessage = (head: string): string => `${head}\n\n${buildAppShareMessage()}`;

/**
 * 화면에 그려진 카드를 캡처해 문구와 함께 공유. 실패하면 문구만 텍스트로 공유한다.
 * @param cardRef 캡처할 View의 ref (안드로이드는 collapsable={false} 가 있어야 잡힌다)
 */
export const shareCapture = async (cardRef: RefObject<any>, message: string): Promise<void> => {
	try {
		const { captureRef } = require('react-native-view-shot');
		const Sharing = require('expo-sharing');
		if (!cardRef.current) throw new Error('no ref');
		const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
		if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');
		// expo-sharing 은 파일만 보낸다 — 문구는 대화창에 함께 뜨도록 dialogTitle 로 넘긴다
		await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: message, UTI: 'public.png' });
		return;
	} catch {
		// 캡처/공유 모듈이 없거나 실패 — 텍스트 공유로 대체
	}
	await Share.share({ message }).catch(() => undefined);
};

export default { shareBadge, shareCapture, buildBadgeShareMessage, buildRecordShareMessage };
