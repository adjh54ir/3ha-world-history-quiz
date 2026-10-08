#!/bin/sh
# 정글 테마 배경음 3종 마스터링 — 무료(CC0 / Pixabay) 음원만 사용. 출처는 assets/sounds/ATTRIBUTIONS.md
#   bgm_jungle_quiz.m4a  : Komiku "Le Grand Village" (CC0) + 정글 앰비언스
#   bgm_jungle_time.m4a  : Komiku "Escaping like Indiana Jones" (CC0) + 정글 앰비언스
#   bgm_jungle_study.m4a : Komiku "Chill Out Theme" (CC0) + 정글 앰비언스
# John Bartmann 곡은 SoundSafari 저장소엔 있지만 파일 태그가 CC BY-NC-ND 라 쓰지 않는다.
# 정글 앰비언스: Moodist nature/jungle.mp3 (Pixabay Content License)
# 사용: sh scripts/master_jungle_bgm.sh <작업 폴더>
set -e
W=${1:?work dir}
OUT=$(cd "$(dirname "$0")/.." && pwd)/assets/sounds
CC0=https://raw.githubusercontent.com/SoundSafari/CC0-1.0-Music/main/chosic.com
cd "$W"
[ -f village.mp3 ] || curl -sfL -o village.mp3 "$CC0/Komiku_-_02_-_Le_Grand_Village(chosic.com).mp3"
[ -f chill.mp3 ] || curl -sfL -o chill.mp3 "$CC0/Komiku_-_02_-_Chill_Out_Theme(chosic.com).mp3"
[ -f indiana.mp3 ] || curl -sfL -o indiana.mp3 "$CC0/Komiku_-_54_-_Escaping_like_Indiana_Jones(chosic.com).mp3"
[ -f jungle.mp3 ] || curl -sfL -o jungle.mp3 "https://raw.githubusercontent.com/remvze/moodist/main/public/sounds/nature/jungle.mp3"

# $1 음악 $2 시작초 $3 끝초 $4 앰비언스 시작초 $5 앰비언스 음량 $6 출력
# 음악 구간 + 같은 길이 앰비언스를 섞고, 끝 X초를 처음 X초에 크로스페이드해서 이음매 없는 루프로 만든다.
master() {
	L=$(echo "$3 - $2" | bc); X=2.5; JE=$(echo "$4 + $L" | bc); LX=$(echo "$L - $X" | bc)
	ffmpeg -y -hide_banner -loglevel error -i "$1" -i jungle.mp3 -filter_complex "
		[0:a]atrim=$2:$3,asetpts=N/SR/TB,aresample=44100,aformat=channel_layouts=stereo[m];
		[1:a]atrim=$4:$JE,asetpts=N/SR/TB,aresample=44100,aformat=channel_layouts=stereo,highpass=f=150,volume=$5[j];
		[m][j]amix=inputs=2:normalize=0,asplit=3[a][b][c];
		[a]atrim=0:$X,asetpts=N/SR/TB,afade=t=in:d=$X[head];
		[b]atrim=$LX:$L,asetpts=N/SR/TB,afade=t=out:d=$X[tail];
		[c]atrim=$X:$LX,asetpts=N/SR/TB[mid];
		[head][tail]amix=inputs=2:normalize=0[seam];
		[mid][seam]concat=n=2:v=0:a=1,loudnorm=I=-18:TP=-3:LRA=11,aresample=44100" \
		-vn -map_metadata -1 -c:a aac -b:a 64k "$OUT/$6"
}

# 퀴즈: 앞 1.3초 무음, 93초 뒤 페이드아웃을 잘라냄.
master village.mp3 1.3 93 20 0.55 bgm_jungle_quiz.m4a
# 타임챌린지: 앞 2초 조용한 도입부를 빼고 긴박한 구간부터.
master indiana.mp3 2 96 120 0.45 bgm_jungle_time.m4a
# 카드·숏폼 학습: 잔잔한 곡이라 앰비언스를 조금 더 앞에. 176초 뒤 페이드아웃 잘라냄.
master chill.mp3 1.5 176 60 0.6 bgm_jungle_study.m4a
