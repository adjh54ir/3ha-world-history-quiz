import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * SoundUtils 의 사운드 경로 점검.
 * - SoundUtils 를 직접 import 하지 않는다 — expo-audio / AsyncStorage 는 노드에서 로드되지 않는다.
 * - 대신 소스에 박힌 정적 require 경로를 읽어 파일이 실제로 있는지만 본다.
 *   경로가 어긋나면 앱에서는 "소리만 안 나는" 조용한 실패라 빌드로도 잡히지 않는다.
 */
const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, 'SoundUtils.ts'), 'utf8');
const requiredPaths = [...source.matchAll(/require\('(\.\.\/\.\.\/assets\/sounds\/[^']+)'\)/g)].map((match) => match[1]);

test('SoundUtils 가 require 하는 사운드 파일이 모두 존재한다', () => {
	assert.ok(requiredPaths.length > 0, 'require 경로를 하나도 찾지 못했다 — 정규식이나 소스 구조가 바뀌었다');
	const missing = requiredPaths.filter((path) => !existsSync(resolve(here, path)));
	assert.deepEqual(missing, [], `없는 사운드 파일: ${missing.join(', ')}`);
});

test('효과음 10종과 배경음 3종이 모두 연결되어 있다', () => {
	const sfxKeys = [...source.matchAll(/^\t(\w+): require\('\.\.\/\.\.\/assets\/sounds\//gm)].map((match) => match[1]);
	// 효과음 10종 + 배경음 3종. 탭(pop)은 소음이라 통째로 뺐다.
	// count·go 는 챌린지 시작 카운트다운 전용이라 한 판에 네 번만 울린다 — tick/start 와 달리 실제로 소리가 난다
	assert.equal(sfxKeys.length, 13);
	for (const key of ['correct', 'wrong', 'timeout', 'finish', 'complete', 'attendance', 'flip', 'swipe', 'count', 'go', 'quiz', 'challenge', 'study']) {
		assert.ok(sfxKeys.includes(key), `${key} 사운드가 빠졌다`);
	}
});

test('빼기로 한 효과음은 다시 require 되지 않는다', () => {
	// 뒤집기(flip)는 호출부가 학습 카드 한 곳뿐이라 되살렸다 — 이 셋은 앱 전역에서 울려 다시 넣으면 안 된다
	// (챌린지 카운트다운은 tick/start 가 아니라 전용 키 count·go 로 낸다)
	for (const gone of ['tick', 'start', 'pop']) {
		assert.ok(!new RegExp(`^\\t${gone}: require\\(`, 'm').test(source), `${gone} 효과음이 되살아났다`);
	}
});

test('조작음은 알림음보다 작게 깔린다', () => {
	// 예전에 조작음을 통째로 껐던 이유가 볼륨이 0.8 하나로 고정돼 있어서였다 — 계층이 사라지면 그 소음이 돌아온다
	const sfxVolume = source.match(/const SFX_VOLUME[^=]*=\s*\{([^}]*)\}/)?.[1] ?? '';
	const fallback = Number(source.match(/const SFX_VOLUME_DEFAULT = ([\d.]+)/)?.[1]);
	assert.ok(fallback > 0, 'SFX_VOLUME_DEFAULT 가 사라졌다');
	for (const key of ['flip', 'swipe']) {
		const level = Number(new RegExp(`${key}:\\s*([\\d.]+)`).exec(sfxVolume)?.[1]);
		assert.ok(level > 0 && level < fallback, `${key} 조작음 볼륨이 알림음(${fallback})보다 작아야 한다`);
	}
});

test('학습 배경음은 퀴즈 배경음과 다른 트랙이다', () => {
	// 같은 트랙을 쓰면 읽고 넘기기만 하는 화면이 시험처럼 들리고, 퀴즈에서 넘어와도 장면이 바뀐 느낌이 없다
	const quiz = source.match(/^\tquiz: require\('([^']+)'\)/m)?.[1];
	const study = source.match(/^\tstudy: require\('([^']+)'\)/m)?.[1];
	assert.ok(quiz && study, '배경음 트랙 경로를 읽지 못했다');
	assert.notEqual(study, quiz);
});

test('같은 효과음이 곧바로 다시 울리지 않도록 막아 둔다', () => {
	// 학습 완료음 뒤에 뱃지·레벨업 팝업이 같은 소리를 한 번 더 낸다 — 가드가 사라지면 "딩-딩" 하고 튄다
	assert.match(source, /RETRIGGER_GUARD_MS/, '겹침 방지 간격 상수가 사라졌다');
	assert.match(source, /lastPlayedAt\.get\(key\)/, 'playSfx 의 겹침 방지 검사가 사라졌다');
	assert.match(source, /lastPlayedAt\.clear\(\)/, '효과음을 끌 때 재생 기록을 비우지 않으면 다시 켠 뒤 첫 소리가 먹힌다');
});
