/**
 * 퀴즈 효과음 유틸 (expo-audio 기반)
 * - 효과음: assets/sounds/*.wav (Mixkit Free SFX — LICENSE.txt 참고)
 * - 플레이어를 미리 만들어 재사용한다. 매 재생마다 createAudioPlayer 하면
 *   에셋 로드가 끝나기 전에 play()가 호출되어 소리가 나지 않는다.
 * - expo-audio 로드 실패 시 무음(앱이 죽지 않음)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// 정적 require (metro 번들 대상)
const SOURCES = {
	correct: require('../../assets/sounds/correct.wav'),
	wrong: require('../../assets/sounds/wrong.mp3'),
	finish: require('../../assets/sounds/finish.wav'),
	timeout: require('../../assets/sounds/timeout.wav'),
	complete: require('../../assets/sounds/complete.wav'),
	// 게임/타임챌린지 전용 효과음
	combo: require('../../assets/sounds/combo.wav'), // 콤보 달성(타임챌린지)
	tick: require('../../assets/sounds/tick.wav'), // 남은 시간 5초 카운트다운
	flip: require('../../assets/sounds/flip.wav'), // 카드 뒤집기(짝 맞추기)
	match: require('../../assets/sounds/match.wav'), // 짝 맞춤 성공
	pop: require('../../assets/sounds/pop.wav'), // 즐겨찾기 저장/해제
	whoosh: require('../../assets/sounds/whoosh.wav'), // 퀴즈 시작
} as const;

type SoundKey = keyof typeof SOURCES;

const SOUND_KEY = 'SOUND_ENABLED';
let soundEnabled = true;

/** 효과음 on/off (설정 연동용) */
export const setSoundEnabled = (v: boolean) => {
	soundEnabled = v;
	AsyncStorage.setItem(SOUND_KEY, v ? '1' : '0').catch(() => {});
};

/** 현재 효과음 on/off 상태 */
export const isSoundEnabled = () => soundEnabled;

// 프리로드된 플레이어 (키당 1개 재사용)
const players: Partial<Record<SoundKey, any>> = {};
let audio: any = null;
let ready = false;

const getAudio = () => {
	if (audio) return audio;
	try {
		audio = require('expo-audio');
	} catch (e) {
		if (__DEV__) console.warn('🔇 expo-audio 로드 실패', e);
	}
	return audio;
};

/**
 * 오디오 세션 모드 지정 — 다른 앱(음악·영상)을 끊지 않고 효과음만 얹는다.
 * - interruptionMode: 'mixWithOthers' → iOS 는 .playback + .mixWithOthers,
 *   안드로이드는 오디오 포커스를 아예 요청하지 않는다(다른 앱 재생 유지).
 * - 세션 활성화(setIsAudioActiveAsync)는 하지 않는다. expo-audio 가 play() 시점에
 *   활성화하므로, 앱 진입만으로 남의 영상이 멈추는 일이 없어야 한다.
 * - AdMob 전면광고 등이 세션 카테고리를 바꿔 놓을 수 있어 앱이 active 될 때마다 다시 적용한다.
 */
export const ensureAudioMode = async () => {
	const a = getAudio();
	if (!a) return;
	try {
		await a.setAudioModeAsync({
			playsInSilentMode: true, // iOS 무음 스위치에서도 효과음 재생
			interruptionMode: 'mixWithOthers',
			shouldPlayInBackground: false,
			allowsRecording: false,
			shouldRouteThroughEarpiece: false,
		});
	} catch (e) {
		if (__DEV__) console.warn('🔇 오디오 세션 설정 실패', e);
	}
};

/**
 * 오디오 세션 설정 + 전체 효과음 플레이어 생성.
 * 앱 시작 시 1회 호출한다(loadSoundSetting 안에서 호출됨).
 */
export const preloadSounds = async () => {
	if (ready) return;
	ready = true;
	const a = getAudio();
	if (!a) return;
	await ensureAudioMode();
	(Object.keys(SOURCES) as SoundKey[]).forEach((key) => {
		try {
			const player = a.createAudioPlayer(SOURCES[key]);
			player.volume = 0.8;
			players[key] = player;
		} catch (e) {
			if (__DEV__) console.warn(`🔇 효과음 프리로드 실패: ${key}`, e);
		}
	});
};

/** 앱 시작 시 저장된 효과음 설정 로드 (기본 on) + 플레이어 프리로드 */
export const loadSoundSetting = async () => {
	try {
		const v = await AsyncStorage.getItem(SOUND_KEY);
		soundEnabled = v !== '0';
		// 최초 실행(값 없음)이면 '켜짐'을 기본값으로 기록해 둔다
		if (v == null) AsyncStorage.setItem(SOUND_KEY, '1').catch(() => {});
	} catch {
		soundEnabled = true;
	}
	await preloadSounds();
};

const play = (key: SoundKey) => {
	if (!soundEnabled) return;
	const player = players[key];
	if (!player) {
		// 프리로드 전에 호출된 경우 — 준비되면 다음 호출부터 재생된다
		preloadSounds().catch(() => {});
		return;
	}
	try {
		// 이전 재생이 끝까지 갔으면 커서가 끝에 있어 그대로 play()하면 무음이다.
		// seekTo 는 Promise — play() 를 곧바로 부르면 커서가 아직 끝이라 소리가 안 난다.
		if (player.currentTime > 0 || player.playing) {
			player.seekTo(0).then(
				() => player.play(),
				() => player.play(),
			);
		} else {
			player.play();
		}
	} catch (e) {
		if (__DEV__) console.warn(`🔇 효과음 재생 실패: ${key}`, e);
	}
};

export const playCorrect = () => play('correct');
export const playWrong = () => play('wrong');
export const playFinish = () => play('finish');
/** 문제 시간 초과 */
export const playTimeout = () => play('timeout');
/** 학습 완료 버튼 */
export const playComplete = () => play('complete');
/** 콤보 달성(타임챌린지) */
export const playCombo = () => play('combo');
/** 남은 시간 카운트다운(마지막 5초) */
export const playTick = () => play('tick');
/** 카드 뒤집기(짝 맞추기) */
export const playFlip = () => play('flip');
/** 짝 맞춤 성공 */
export const playMatch = () => play('match');
/** 즐겨찾기 저장/해제 */
export const playPop = () => play('pop');
/** 퀴즈 시작 */
export const playWhoosh = () => play('whoosh');

export default {
	playCorrect,
	playWrong,
	playFinish,
	playTimeout,
	playComplete,
	playCombo,
	playTick,
	playFlip,
	playMatch,
	playPop,
	playWhoosh,
	setSoundEnabled,
	isSoundEnabled,
	loadSoundSetting,
	preloadSounds,
};
