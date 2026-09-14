/**
 * 이식 화면용 배경음 — 앱 공통 SoundUtils 의 BGM 으로 넘긴다.
 * 원본 트랙 이름('time', 'quiz', 'tower' …)을 이 앱이 가진 트랙에 맞춰 준다.
 */
import { startBgm as startAppBgm, stopBgm, type BgmTrack as AppBgmTrack } from '@/src/utils/SoundUtils';

/** 원본이 쓰던 트랙 이름 */
export type BgmTrack = 'quiz' | 'time' | 'tower' | 'challenge' | 'study';

/** 챌린지 계열은 전부 challenge 로 보낸다. 학습은 퀴즈와 결이 달라 트랙을 따로 둔다 */
const TRACK_MAP: Record<BgmTrack, AppBgmTrack> = {
	quiz: 'quiz',
	time: 'challenge',
	tower: 'challenge',
	challenge: 'challenge',
	study: 'study',
};

export const startBgm = (track: BgmTrack) => startAppBgm(TRACK_MAP[track] ?? 'quiz');

export { stopBgm };
export { isBgmEnabled, setBgmEnabled } from '@/src/utils/SoundUtils';

export default { startBgm, stopBgm };
