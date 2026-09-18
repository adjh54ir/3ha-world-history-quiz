/**
 * 효과음 · 배경음 유틸 (expo-audio 기반)
 * - 효과음(SFX)과 배경음(BGM)은 설정에서 따로 켜고 끈다. 기본은 둘 다 ON.
 * - 소스는 assets/sounds/*.mp3, *.m4a — Metro 기본 assetExts 라 별도 설정이 필요 없다.
 * - 네이티브 모듈이 없거나 재생이 실패해도 앱은 죽지 않고 무음으로 넘어간다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateUtils from '@/src/utils/DateUtils';

/** 정적 require — 번들에 포함되어야 하므로 동적 경로를 쓰지 않는다 */
const SFX_SOURCES = {
	/** 정답 */
	correct: require('../../assets/sounds/sound_chime.mp3'),
	/** 오답 */
	wrong: require('../../assets/sounds/sound_bonk.mp3'),
	/** 시간 초과 */
	timeout: require('../../assets/sounds/sound_thunk.mp3'),
	/** 퀴즈 종료 — cue_out 은 내려가는 음이라 오답처럼 들려서 올라가는 cue_in 으로 바꿨다 */
	finish: require('../../assets/sounds/sound_cue_in.mp3'),
	/** 학습 완료 표시 — Kenney confirmation_002(CC0). 예전 cue_hold 는 여운만 길고 끝맺음이 없어 완료로 안 들렸다 */
	complete: require('../../assets/sounds/sound_complete.m4a'),
	/** 출석 도장 — 3ha-korea-quiz 출석체크와 같은 소리(Kenney confirmation_004) */
	attendance: require('../../assets/sounds/sound_attendance.mp3'),
	/** 카드 뒤집기 — 종이 스치는 소리 */
	flip: require('../../assets/sounds/sound_rustle.mp3'),
	/** 카드·숏폼 다음 장으로 넘김 — sound_skip 은 출처 기록이 없어 쓰지 않는다 */
	swipe: require('../../assets/sounds/sound_whoosh.mp3'),
	/** 챌린지 시작 카운트다운 3·2·1 — 짧고 마른 소리라 세 번 울려도 시끄럽지 않다 */
	count: require('../../assets/sounds/sound_click.mp3'),
	/** 카운트다운 끝 '시작!' — 올라가는 큐 음으로 출발을 알린다 (자체 합성 음원) */
	go: require('../../assets/sounds/sound_cue_in.mp3'),
} as const;

/** 배경음은 1~2분짜리 루프라 용량이 크다 — 64kbps AAC(.m4a)로 줄여 둔다 (원본 mp3 대비 1/4) */
const BGM_SOURCES = {
	/** 일반 퀴즈 */
	quiz: require('../../assets/sounds/bgm_quiz.m4a'),
	/** 무한 챌린지 */
	challenge: require('../../assets/sounds/bgm_time.m4a'),
	/**
	 * 학습 — 밝은 우쿨렐레 곡(Rafael Krux, "Happy Whistling Ukulele", CC0)을 116초 루프로 다듬은 것.
	 * 퀴즈 트랙을 그대로 쓰면 읽고 넘기기만 하는 화면이 시험처럼 들린다.
	 * 앰비언트(절 아침·아침 마당)도 대 봤지만 학습 화면에는 음침했다.
	 */
	study: require('../../assets/sounds/bgm_study.m4a'),
} as const;

export type SfxKey = keyof typeof SFX_SOURCES;
export type BgmTrack = keyof typeof BGM_SOURCES;

/**
 * 효과음 볼륨 — 결과를 알리는 소리(정답·완료)와 조작감만 주는 소리를 같은 크기로 내면
 * 화면을 만질 때마다 조작음이 크게 튄다. 조작음은 배경음보다 조금 위에만 둔다.
 */
const SFX_VOLUME: Partial<Record<SfxKey, number>> = {
	flip: 0.25,
	swipe: 0.2,
	// 카운트다운은 한 번에 세 번 울린다 — 결과음보다 한 단계 낮춰 둔다
	count: 0.5,
};
const SFX_VOLUME_DEFAULT = 0.8;

/** 배경음 볼륨 — 트랙마다 녹음 크기가 달라서(앰비언트는 곡보다 조용하다) 한 값으로는 맞지 않는다 */
const BGM_VOLUME: Record<BgmTrack, number> = {
	quiz: 0.28,
	challenge: 0.28,
	// 학습 트랙은 멜로디가 있는 곡이라 앰비언트보다 귀에 먼저 걸린다 — 글을 읽는 화면이므로 한 단계 더 낮춘다
	study: 0.35,
};

const SFX_KEY = 'SOUND_SFX_ENABLED';
const BGM_KEY = 'SOUND_BGM_ENABLED';

let sfxEnabled = true;
let bgmEnabled = true;
let audioModeReady = false;

/**
 * 오디오 세션 설정 — 한 번만 적용한다.
 * - playsInSilentMode: iOS 무음 스위치에서도 효과음이 들리게 한다.
 * - interruptionMode: 'mixWithOthers' — 사용자가 틀어 둔 음악·영상을 끊지 않고 그 위에 겹쳐 낸다.
 *   지정하지 않으면 오디오 세션이 단독 점유로 잡혀서 앱에 들어오는 순간 남의 재생이 멈춘다.
 *   (expo-audio SDK 55: interruptionModeAndroid 는 deprecated — interruptionMode 하나로 양 플랫폼 처리)
 * - shouldPlayInBackground: false — 앱이 내려가면 우리 소리는 멈춘다(백그라운드 오디오 권한 불필요).
 */
const ensureAudioMode = (audio: any) => {
	if (audioModeReady) {
		return;
	}
	audioModeReady = true;
	audio
		.setAudioModeAsync?.({
			playsInSilentMode: true,
			interruptionMode: 'mixWithOthers',
			shouldPlayInBackground: false,
			allowsRecording: false,
		})
		.catch(() => {});
};

/**
 * 앱 시작 시 오디오 세션을 먼저 잡아 둔다.
 * - 첫 효과음이 날 때 잡으면 그 순간 남의 재생이 한 번 끊길 수 있다.
 * - 실패해도 재생 시점에 ensureAudioMode 가 다시 시도하지 않도록, 여기서 잡은 결과를 그대로 쓴다.
 */
export const prepareAudioSession = () => {
	try {
		ensureAudioMode(require('expo-audio'));
	} catch {
		// 네이티브 모듈이 없으면 무음으로 넘어간다
	}
};

/** 앱 시작 시 저장된 소리 설정을 읽어 둔다 (기본 ON) */
export const loadSoundSettings = async () => {
	try {
		const [sfx, bgm] = await Promise.all([AsyncStorage.getItem(SFX_KEY), AsyncStorage.getItem(BGM_KEY)]);
		sfxEnabled = sfx !== '0';
		bgmEnabled = bgm !== '0';
	} catch {
		sfxEnabled = true;
		bgmEnabled = true;
	}
};

export const isSfxEnabled = () => sfxEnabled;
export const isBgmEnabled = () => bgmEnabled;

/** 효과음 on/off — 끄면 들고 있던 플레이어도 정리한다 */
export const setSfxEnabled = (value: boolean) => {
	sfxEnabled = value;
	AsyncStorage.setItem(SFX_KEY, value ? '1' : '0').catch(() => {});
	if (!value) {
		releaseSfxPlayers();
	}
};

/**
 * 효과음 플레이어는 종류별로 하나씩 만들어 두고 계속 다시 쓴다.
 * - 누를 때마다 새로 만들면 오디오 소스를 그때 읽어 들이느라 첫 재생이 늦거나 통째로 묻힌다
 *   (정답을 골랐는데 소리가 안 나는 것처럼 보이던 증상).
 * - 짧은 소리 9개뿐이라 들고 있어도 부담이 없다.
 */
const sfxPlayers = new Map<SfxKey, any>();

/**
 * 같은 소리가 곧바로 다시 요청되면 무시하는 간격.
 * 학습 완료를 누르면 화면이 완료음을 내고, 곧이어 뱃지·레벨업 팝업이 같은 완료음을 한 번 더 낸다.
 * 되감아 다시 재생하는 구조라 앞 소리가 중간에 잘려 "딩-딩" 하고 튄다.
 */
export const RETRIGGER_GUARD_MS = 300;
const lastPlayedAt = new Map<SfxKey, number>();

/** 효과음 재생 (짧은 단발음) — 이미 울리는 중이면 처음으로 되감아 다시 낸다 */
export const playSfx = (key: SfxKey) => {
	if (!sfxEnabled) {
		return;
	}
	const now = DateUtils.nowTime();
	if (now - (lastPlayedAt.get(key) ?? 0) < RETRIGGER_GUARD_MS) {
		return;
	}
	lastPlayedAt.set(key, now);
	try {
		const audio = require('expo-audio');
		ensureAudioMode(audio);
		let player = sfxPlayers.get(key);
		if (!player) {
			player = audio.createAudioPlayer(SFX_SOURCES[key]);
			player.volume = SFX_VOLUME[key] ?? SFX_VOLUME_DEFAULT;
			sfxPlayers.set(key, player);
		}
		// seekTo 는 비동기라 완료를 기다리지 않는다 — 되감기가 실패해도 재생 자체는 막지 않는다
		Promise.resolve(player.seekTo(0)).catch(() => {});
		player.play();
	} catch (e) {
		// 원인이 묻히면 "소리가 안 난다"를 추적할 수 없다 — 개발 빌드에서만 노출
		if (__DEV__) {
			console.warn(`🔇 효과음 재생 실패: ${key}`, e);
		}
	}
};

/** 효과음 플레이어 해제 — 소리를 끌 때 메모리에 남기지 않는다 */
const releaseSfxPlayers = () => {
	sfxPlayers.forEach((player) => {
		try {
			player.remove?.();
		} catch {
			// 이미 해제된 경우 — 무시
		}
	});
	sfxPlayers.clear();
	// 기록을 남겨 두면 껐다 켠 직후 첫 소리가 겹침 방지에 걸려 사라진다
	lastPlayedAt.clear();
};

export const playCorrect = () => playSfx('correct');
export const playWrong = () => playSfx('wrong');
export const playTimeout = () => playSfx('timeout');
export const playFinish = () => playSfx('finish');
export const playComplete = () => playSfx('complete');
/** 카드 뒤집기 — 호출부가 학습 카드 한 곳뿐이라 되살렸다 */
export const playFlip = () => playSfx('flip');
/** 카드·숏폼 다음 장으로 넘김 */
export const playSwipe = () => playSfx('swipe');
/**
 * 아래 셋은 소리를 내지 않는다 — 버튼 탭(pop)·카운트다운(tick)·시작(start)은
 * 화면마다 계속 울려서 시끄럽기만 했다. 특히 pop 은 호출부가 마흔 곳을 넘어 앱 어디를 눌러도 울린다.
 * 호출부는 그대로 두고 여기서 한 번에 막는다.
 */
export const playTick = () => {};
export const playStart = () => {};
export const playPop = () => {};
/**
 * 챌린지 시작 카운트다운 — 위의 tick/start 와 달리 실제로 소리가 난다.
 * 챌린지를 시작하는 순간에만 네 번(3·2·1·시작) 울리므로 화면을 만질 때마다 울리는 문제가 없다.
 */
export const playCountdown = () => playSfx('count');
export const playGo = () => playSfx('go');
export const playAttendance = () => playSfx('attendance');

// 배경음은 한 번에 하나만 재생한다
let bgmPlayer: any = null;
let bgmTrack: BgmTrack | null = null;

/** 배경음 정지 + 리소스 해제 — 화면을 벗어날 때 반드시 호출한다 */
export const stopBgm = () => {
	const player = bgmPlayer;
	bgmPlayer = null;
	bgmTrack = null;
	if (!player) {
		return;
	}
	try {
		player.pause?.();
		player.remove?.();
	} catch {
		// 이미 해제된 경우 — 무시
	}
};

/** 배경음 반복 재생. 같은 트랙이 이미 돌고 있으면 그대로 둔다 */
export const startBgm = (track: BgmTrack) => {
	if (!bgmEnabled) {
		return;
	}
	if (bgmTrack === track && bgmPlayer) {
		return;
	}
	stopBgm();
	try {
		const audio = require('expo-audio');
		ensureAudioMode(audio);
		const player = audio.createAudioPlayer(BGM_SOURCES[track]);
		player.loop = true;
		// 효과음과 음성 안내를 덮지 않도록 배경음은 낮게 깐다
		player.volume = BGM_VOLUME[track] ?? 0.28;
		player.play();
		bgmPlayer = player;
		bgmTrack = track;
	} catch (e) {
		if (__DEV__) {
			console.warn(`🔇 배경음 재생 실패: ${track}`, e);
		}
	}
};

/** 배경음 on/off — 끄면 재생 중이던 배경음도 바로 멈춘다 */
export const setBgmEnabled = (value: boolean) => {
	bgmEnabled = value;
	AsyncStorage.setItem(BGM_KEY, value ? '1' : '0').catch(() => {});
	if (!value) {
		stopBgm();
	}
};

export default {
	loadSoundSettings,
	prepareAudioSession,
	isSfxEnabled,
	isBgmEnabled,
	setSfxEnabled,
	setBgmEnabled,
	playSfx,
	playCorrect,
	playWrong,
	playTimeout,
	playFinish,
	playComplete,
	playFlip,
	playTick,
	playStart,
	playPop,
	playAttendance,
	startBgm,
	stopBgm,
};
