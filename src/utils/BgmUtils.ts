/**
 * 배경음악(BGM) 유틸 — 퀴즈/타임챌린지 동안 반복 재생
 * - expo-audio 기반, 없으면 expo-av 폴백, 둘 다 없으면 무음(앱이 죽지 않음)
 * - 트랙: assets/sounds/bgm-quiz.mp3 (일반 퀴즈), bgm-time.mp3 (타임챌린지)
 * - 한 번에 하나만 재생. 화면 전환/종료 시 stopBgm()으로 반드시 정리(메모리 누수 방지)
 * - SFX(효과음)와 별개 토글. 기본 ON.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { preloadSounds } from './SoundUtils';

const SOURCES = {
	quiz: require('../../assets/sounds/bgm-quiz.mp3'),
	time: require('../../assets/sounds/bgm-time.mp3'),
} as const;

export type BgmTrack = keyof typeof SOURCES;

const BGM_KEY = 'BGM_ENABLED';
let bgmEnabled = true;

// 현재 재생 중인 플레이어/트랙 (expo-audio 또는 expo-av)
let currentPlayer: any = null;
let currentTrack: BgmTrack | null = null;
let isAv = false;

/** BGM on/off (설정 연동용) */
export const setBgmEnabled = (v: boolean) => {
	bgmEnabled = v;
	AsyncStorage.setItem(BGM_KEY, v ? '1' : '0').catch(() => {});
	if (!v) stopBgm();
};

/** 현재 BGM on/off 상태 */
export const isBgmEnabled = () => bgmEnabled;

/** 앱 시작 시 저장된 BGM 설정 로드 (기본 on) */
export const loadBgmSetting = async () => {
	try {
		const v = await AsyncStorage.getItem(BGM_KEY);
		bgmEnabled = v !== '0';
		// 최초 실행(값 없음)이면 '켜짐'을 기본값으로 기록해 둔다
		if (v == null) AsyncStorage.setItem(BGM_KEY, '1').catch(() => {});
	} catch {
		bgmEnabled = true;
	}
};

/** 현재 재생 중인 BGM 정지 + 리소스 해제 */
export const stopBgm = () => {
	const player = currentPlayer;
	currentPlayer = null;
	currentTrack = null;
	if (!player) return;
	try {
		if (isAv) {
			player.stopAsync?.().catch(() => {});
			player.unloadAsync?.().catch(() => {});
		} else {
			player.pause?.();
			player.remove?.();
		}
	} catch {
		// 무시
	}
};

/**
 * BGM 재생 시작 (반복). 이미 같은 트랙이 재생 중이면 무시.
 * @param track 'quiz' | 'time'
 */
export const startBgm = async (track: BgmTrack) => {
	if (!bgmEnabled) return;
	if (currentTrack === track && currentPlayer) return; // 이미 재생 중
	stopBgm(); // 다른 트랙 정리

	try {
		// 오디오 세션 설정(무음 스위치 대응)은 SoundUtils.preloadSounds에서 1회 수행한다
		await preloadSounds();
		const audio = require('expo-audio');
		const player = audio.createAudioPlayer(SOURCES[track]);
		player.loop = true;
		player.volume = 0.28;
		player.play();
		currentPlayer = player;
		currentTrack = track;
		isAv = false;
	} catch (e) {
		if (__DEV__) console.warn('🔇 BGM 재생 실패', e);
	}
};

export default { startBgm, stopBgm, setBgmEnabled, isBgmEnabled, loadBgmSetting };
