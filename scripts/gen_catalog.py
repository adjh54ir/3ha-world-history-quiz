# -*- coding: utf-8 -*-
"""ConstMindSounds.ts 생성기 — 10그룹 × 115종
사용: python3 gen_catalog.py  → src/const/ConstMindSounds.ts 덮어쓰기"""
import os

GROUPS = ["비", "물가", "숲과 들", "밤과 계절", "쉼의 공간", "명상과 수면", "일상의 소리", "길 위에서", "리듬", "집중 소음"]

# 화면에 '추천' 태그를 표시할 사운드 key
RECOMMENDED = {
    "forest",       # 숲 바람
    "pinewind",     # 솔바람
    "mountaintop",  # 산마루 바람
    "crickets",     # 밤의 풀벌레
    "winterwind",   # 겨울 바람
    "fireplace",    # 벽난로
    "shower",       # 샤워
    "aircon",       # 에어컨 바람
    "greennoise",   # 초록소음
    "brownnoise",   # 갈색소음
    "sailboat",     # 요트 항해
}

# (key, group, title, desc, icon, color)  — color 'F:' 접두는 Colors.* 참조
E = [
    # ---------- 비 (18) ----------
    ("rain", "비", "잔잔한 비", "창밖에 고르게 내리는 빗소리", "water-drop", "#6B94B5"),
    ("heavyrain", "비", "거센 비", "지붕을 두드리는 굵은 빗줄기", "umbrella", "#54748C"),
    ("forestrain", "비", "숲속 비", "잎사귀에 떨어지는 부드러운 비", "park", "#5E8C6E"),
    ("storm2", "비", "폭우와 천둥", "가까이서 우르릉 쏟아지는 밤", "flash-on", "#5B6B7E"),
    ("thunder", "비", "비와 먼 천둥", "멀리서 낮게 우르릉거리는 밤", "thunderstorm", "#64748B"),
    ("tentrain", "비", "텐트 위 빗소리", "천막을 두드리는 먹먹한 비", "roofing", "#5E7E99"),
    ("windowrain", "비", "창가의 비", "유리창을 타고 흐르는 빗물", "window", "#6B90A8"),
    ("drizzle", "비", "이슬비", "옷깃을 살짝 적시는 가는 비", "grain", "#8CA3B5"),
    ("sunshower", "비", "여우비", "햇살 사이로 가볍게 지나는 비", "flare", "#C0A96B"),
    ("nightrain", "비", "밤비", "잠들기 전 창밖의 낮은 비", "brightness-3", "#52708C"),
    ("eaves", "비", "처마 낙수", "처마 끝에서 똑똑 듣는 빗물", "house", "#7A8C99"),
    ("carrain", "비", "차 안의 비", "빗길에 세워 둔 차 안의 아늑함", "directions-car", "#647082"),
    ("leafrain", "비", "잎사귀 비", "넓은 잎에 후두둑 듣는 비", "eco", "#5E8C5E"),
    ("distantthunder", "비", "먼 천둥", "지평선 너머 아득한 우르릉", "bolt", "#667788"),
    ("afterrain", "비", "비 갠 오후", "그친 비, 낙숫물과 새소리", "cloud-queue", "#7FA68C"),
    ("monsoon", "비", "장마 오후", "눅눅하고 나른한 장맛비", "beach-access", "#56809C"),
    ("wiperrain", "비", "빗길 와이퍼", "리듬 타는 와이퍼와 아늑한 빗길", "directions-car", "#5E7288"),
    ("rainforest", "비", "우림의 비", "열대 우림에 쏟아지는 빗소리", "filter-vintage", "#3F8C64"),
    # ---------- 물가 (15) ----------
    ("waves", "물가", "파도", "밀려왔다 밀려가는 바닷가", "waves", "F:forestSky"),
    ("stream", "물가", "시냇물", "돌 틈을 흐르는 맑은 물소리", "water", "#4FA3A5"),
    ("lake", "물가", "호숫가", "잔물결이 나직이 찰랑이는 물가", "sailing", "#5B8FA8"),
    ("brook", "물가", "산속 개울", "졸졸 흐르는 얕은 개울물", "terrain", "#4F8FA5"),
    ("waterfall", "물가", "폭포", "쏟아지는 물줄기의 하얀 장막", "tsunami", "#4A8FA8"),
    ("cave", "물가", "동굴 물방울", "깊은 울림 속에 떨어지는 물방울", "landscape", "#7A8B99"),
    ("nightsea", "물가", "밤바다", "어둠 속 낮게 밀려오는 파도", "brightness-2", "#46617A"),
    ("fountain", "물가", "분수", "광장의 시원한 물줄기", "invert-colors", "#5BA0B5"),
    ("underwater", "물가", "물속", "먹먹하게 감싸는 물속 울림", "pool", "#3F7E99"),
    ("harbor", "물가", "밤의 항구", "뱃전에 찰랑이는 정박지", "anchor", "#5E7E94"),
    ("rapids", "물가", "여울", "바위를 타고 넘는 빠른 물살", "double-arrow", "#4886A0"),
    ("springmelt", "물가", "눈 녹은 개울", "봄볕에 녹아 흐르는 맑은 물", "ac-unit", "#6FA3C9"),
    ("rowboat", "물가", "노 젓는 호수", "삐걱, 첨벙, 느린 노질", "rowing", "#5E86A0"),
    ("gullbeach", "물가", "갈매기 해변", "파도 위를 나는 갈매기의 끼룩임", "flutter-dash", "#6FA0B5"),
    ("aquarium", "물가", "수족관", "보글보글 피어오르는 물방울", "bubble-chart", "#4F94B5"),
    # ---------- 숲과 들 (17) ----------
    ("forest", "숲과 들", "숲 바람", "잎사귀를 스치는 바람 소리", "forest", "F:forest"),
    ("sparrow", "숲과 들", "아침 참새", "이른 아침의 새소리", "flutter-dash", "F:forestAmber"),
    ("reeds", "숲과 들", "갈대밭 바람", "사락사락 흔들리는 갈대숲", "grass", "#7C9A62"),
    ("bamboo", "숲과 들", "대나무 숲", "바람에 부딪는 대숲의 사각임", "park", "#6B9A62"),
    ("morningforest", "숲과 들", "아침 숲", "이슬 맺힌 숲의 첫 지저귐", "wb-sunny", "#D9A05B"),
    ("pinewind", "숲과 들", "솔바람", "솔잎 사이를 지나는 바람", "nature", "#5E8C7A"),
    ("meadow", "숲과 들", "들판의 오후", "풀벌레와 산들바람의 초원", "spa", "#8FAF6B"),
    ("mountaintop", "숲과 들", "산마루 바람", "탁 트인 능선의 시원한 바람", "terrain", "#7A8C99"),
    ("farbirds", "숲과 들", "먼 산새", "골짜기 건너 아련한 지저귐", "hearing", "#7C9A82"),
    ("junglefar", "숲과 들", "열대의 숲", "깊고 먼 정글의 웅성임", "filter-vintage", "#4F8C6E"),
    ("creekside", "숲과 들", "숲속 옹달샘", "똑똑 솟는 작은 샘물", "opacity", "#5E9AA8"),
    ("woodpecker", "숲과 들", "딱따구리 숲", "또르르 나무를 두드리는 소리", "park", "#8C6E4F"),
    ("beehive", "숲과 들", "꿀벌의 정원", "붕붕 벌이 오가는 볕 좋은 오후", "emoji-nature", "#C9A23D"),
    ("gravelwalk", "숲과 들", "자갈길 산책", "사박사박 자갈을 밟는 걸음", "directions-walk", "#8C8273"),
    ("leafwalk", "숲과 들", "낙엽 산책", "바스락 낙엽을 밟는 걸음", "eco", "#A5794F"),
    ("sheepfield", "숲과 들", "양떼 들판", "매애 양떼가 노니는 언덕", "cloud", "#9CA88C"),
    ("springbirds", "숲과 들", "봄의 지저귐", "볕 좋은 봄날의 새소리", "flutter-dash", "#7C9A62"),
    # ---------- 밤과 계절 (8) ----------
    ("crickets", "밤과 계절", "밤의 풀벌레", "귀뚜라미와 부엉이가 있는 밤", "nights-stay", "#6B8F5E"),
    ("winterwind", "밤과 계절", "겨울 바람", "창밖을 스치는 낮은 바람", "ac-unit", "#7FA6C9"),
    ("autumnnight", "밤과 계절", "가을밤", "풀벌레 잦아든 서늘한 밤", "brightness-3", "#6E7A8C"),
    ("blizzard", "밤과 계절", "눈보라", "창밖에 몰아치는 흰 바람", "storm", "#7F98B5"),
    ("springnight", "밤과 계절", "봄밤", "꽃샘 지난 부드러운 밤공기", "local-florist", "#BF8B99"),
    ("snowwalk", "밤과 계절", "눈길 산책", "뽀득뽀득 눈을 밟는 걸음", "snowing", "#9FB0C4"),
    ("paddynight", "밤과 계절", "여름 논둑", "개구리 합창이 번지는 여름밤", "graphic-eq", "#6B9A5E"),
    ("owlforest", "밤과 계절", "부엉이의 밤", "풀벌레 사이 낮은 부엉이", "forest", "#5B6E5E"),
    # ---------- 쉼의 공간 (8) ----------
    ("campfire", "쉼의 공간", "모닥불", "타닥타닥 장작이 타는 소리", "local-fire-department", "#C97B4A"),
    ("windchime", "쉼의 공간", "바람 종", "산들바람에 흔들리는 풍경 소리", "music-note", "#C9A227"),
    ("bowl", "쉼의 공간", "싱잉볼", "깊고 길게 울리는 명상 볼", "self-improvement", "#A8814F"),
    ("fireplace", "쉼의 공간", "벽난로", "장작이 낮게 타는 겨울 거실", "fireplace", "#AD6B3D"),
    ("teakettle", "쉼의 공간", "찻주전자", "쉬이 김을 뿜는 주전자", "emoji-food-beverage", "#9C7350"),
    ("vinylcrackle", "쉼의 공간", "LP 지직임", "바늘이 도는 따뜻한 지직임", "album", "#8A7A6E"),
    ("templemorn", "쉼의 공간", "산사의 아침", "고요한 산사의 새벽 공기", "temple-buddhist", "#7E8A6E"),
    ("paperrustle", "쉼의 공간", "종이의 사각임", "종이가 스치는 낮은 사각임", "description", "#8A795D"),
    # ---------- 명상과 수면 (11) ----------
    ("omdrone", "명상과 수면", "옴 드론", "깊고 낮게 울리는 명상 배음", "self-improvement", "#96876B"),
    ("heartbeat", "명상과 수면", "심장박동", "품에 안긴 듯 느린 고동", "favorite", "#C97B7B"),
    ("lullaby", "명상과 수면", "오르골 자장가", "나직하게 반복되는 멜로디", "child-care", "#C99A5B"),
    ("tibetanbowls", "명상과 수면", "티벳 볼 순례", "겹겹이 울려 퍼지는 깊은 볼", "panorama-fish-eye", "#8A7E64"),
    ("crystalbowl", "명상과 수면", "크리스탈 볼", "유리처럼 맑게 이어지는 배음", "lens", "#85AECC"),
    ("moonlightdrone", "명상과 수면", "달빛 드론", "푸르게 번지는 밤의 패드", "brightness-2", "#6E82A0"),
    ("alphadrone", "명상과 수면", "느린 맥놀이", "천천히 일렁이는 집중 드론", "graphic-eq", "#6188A0"),
    ("harpdream", "명상과 수면", "꿈결 하프", "느리게 흩어지는 하프 선율", "music-note", "#C4A46B"),
    ("dreamchime", "명상과 수면", "꿈결 차임", "아득히 반짝이는 차임", "auto-awesome", "#C9B27B"),
    ("oceanbowl", "명상과 수면", "파도와 볼", "파도 위에 볼이 울리는 명상", "tsunami", "#5E94A8"),
    ("whalesong", "명상과 수면", "고래의 노래", "심해를 울리는 느리고 깊은 노래", "waves", "#5E7A9C"),
    # ---------- 일상의 소리 (14) ----------
    ("keyboard", "일상의 소리", "키보드 타이핑", "또각또각 새벽의 작업실", "keyboard", "#7A8699"),
    ("pencil", "일상의 소리", "연필 필기", "사각사각 종이 위 연필", "edit", "#8C8273"),
    ("shower", "일상의 소리", "샤워", "쏟아지는 따뜻한 물줄기", "shower", "#5B9AA8"),
    ("catpurr", "일상의 소리", "고양이 골골송", "무릎 위 고양이의 골골", "pets", "#C69A62"),
    ("ricecooker", "일상의 소리", "밥 짓는 저녁", "치익치익 김을 내는 밥솥", "rice-bowl", "#AA6C42"),
    ("bathfill", "일상의 소리", "욕조 물 받기", "콸콸 데워지는 반신욕 준비", "bathtub", "#4E92A8"),
    ("frypan", "일상의 소리", "지글지글 팬", "기름이 노래하는 저녁 부엌", "outdoor-grill", "#C4703F"),
    ("coffeedrip", "일상의 소리", "커피 내리기", "똑똑 내려앉는 드립 커피", "coffee", "#8A6E5B"),
    ("typewriter", "일상의 소리", "타자기", "땅, 레트로 타자기의 리듬", "text-format", "#74808F"),
    ("eveningalley", "일상의 소리", "저녁 골목", "저녁밥 냄새 나는 골목 어귀", "storefront", "#A08262"),
    ("vacuumfar", "일상의 소리", "옆방 청소기", "벽 너머 웅웅대는 청소기", "cleaning-services", "#90A0A8"),
    ("nightkitchen", "일상의 소리", "한밤의 부엌", "냉장고 험만 남은 부엌", "kitchen", "#6E7E8A"),
    ("morningyard", "일상의 소리", "시골 아침 마당", "닭 울음이 여는 시골 아침", "brightness-5", "#C9963D"),
    ("laundryroom", "일상의 소리", "빨래방 오후", "세탁기가 도는 나른한 오후", "local-laundry-service", "#628BA5"),
    # ---------- 길 위에서 (8) ----------
    ("train", "길 위에서", "기차", "덜컹이는 기차의 리듬", "train", "#7E6B5B"),
    ("city", "길 위에서", "도시의 소음", "멀리서 웅웅거리는 밤의 도시", "location-city", "#6E7B8C"),
    ("airplane", "길 위에서", "비행기 기내", "구름 위 낮은 엔진 소리", "flight", "#7887A0"),
    ("subway", "길 위에서", "지하철", "리듬을 타는 지하의 레일", "subway", "#77828C"),
    ("shipdeck", "길 위에서", "배 갑판", "엔진의 진동과 바닷바람", "directions-boat", "#5E86A0"),
    ("sailboat", "길 위에서", "요트 항해", "돛이 펄럭이는 바닷길", "sailing", "#4F94B5"),
    ("metrostation", "길 위에서", "지하철역", "열차를 기다리는 플랫폼", "departure-board", "#77828C"),
    ("airportlounge", "길 위에서", "공항 라운지", "설렘이 머무는 넓은 홀", "flight-takeoff", "#7887A0"),
    # ---------- 리듬 (7) ----------
    ("washer", "리듬", "세탁기", "규칙적으로 도는 빨래 리듬", "local-laundry-service", "#628BA5"),
    ("clock", "리듬", "괘종시계", "째깍째깍 오래된 거실", "schedule", "#96825F"),
    ("fan", "리듬", "선풍기", "나른한 오후의 날갯소리", "toys", "#6FA3A5"),
    ("watermill", "리듬", "물레방아", "철벅철벅 도는 물바퀴", "sync", "#55A0A0"),
    ("dripfaucet", "리듬", "똑똑 수도꼭지", "일정하게 듣는 물방울", "opacity", "#64A0AD"),
    ("dryer", "리듬", "건조기", "포근하게 도는 건조기의 리듬", "cached", "#9C8B78"),
    ("morsecode", "리듬", "모스 부호", "또렷하게 이어지는 신호음", "linear-scale", "#808C99"),
    # ---------- 집중 소음 (9) ----------
    ("whitenoise", "집중 소음", "백색소음", "주변 소리를 덮는 고른 소음", "blur-on", "#8C99A5"),
    ("pinknoise", "집중 소음", "분홍소음", "한층 부드러운 집중 소음", "grain", "#C98B8B"),
    ("brownnoise", "집중 소음", "갈색소음", "낮고 깊은 잠자리 소음", "blur-linear", "#9C7B5B"),
    ("greennoise", "집중 소음", "초록소음", "자연을 닮은 중역대 소음", "blur-circular", "#6B9A6E"),
    ("bluenoise", "집중 소음", "파랑소음", "맑고 가벼운 고역 소음", "scatter-plot", "#6B94C4"),
    ("graynoise", "집중 소음", "회색소음", "귀에 고르게 들리는 균형 소음", "gradient", "#8C8C8C"),
    ("aircon", "집중 소음", "에어컨 바람", "한여름 실내의 서늘한 바람", "hvac", "#93A9B8"),
    ("deephum", "집중 소음", "깊은 험", "아득한 저주파의 요람", "vibration", "#75808A"),
    ("quietoffice", "집중 소음", "고요한 사무실", "나직한 키보드와 공조음", "business", "#8C99A5"),
]

HEADER = """import Colors from '@/src/const/ConstColors';

/**
 * 마음 사운드 카탈로그 (115종 · 10그룹)
 * -------------------------------------------------
 * 근거: 자연 소리 청취는 교감신경 각성에서의 회복을 빠르게 하고(Alvarsson et al., 2010),
 * 인공 소음 대비 부교감(이완) 반응을 촉진함(Gould van Praag et al., 2017, Scientific Reports).
 * 이론적 배경: 주의회복이론(ART, Kaplan & Kaplan) · 스트레스감소이론(SRT, Ulrich).
 *
 * 음원: 오픈소스 실제 녹음(CC0/PD/CC BY) + 프로시저럴 합성
 *       (scripts/make_sounds.py · master_batch2.py · make_batch3.py · make_batch4.py).
 * ⚠️ 이 파일은 scripts/gen_catalog.py 로 생성됩니다. 수정은 생성기에서.
 * 출처·라이선스: assets/sounds/ATTRIBUTIONS.md (CC BY 음원은 앱 내 출처 표기 필요).
 */

export interface MindSound {
	key: string;
	title: string;
	desc: string;
	icon: string;
	color: string;
	/** 사운드 탭 섹션 구분 */
	group: string;
	/** 화면에 '추천' 태그 표시 */
	recommended?: boolean;
	source: number; // require() asset
}

/** 상단 탭 표시 순서 */
export const MIND_SOUND_GROUPS = [__GROUPS__] as const;

export const MIND_SOUNDS: MindSound[] = [
"""

def color_expr(c):
    return f"Colors.{c[2:]}" if c.startswith("F:") else f"'{c}'"

rows = []
cur = None
for key, group, title, desc, icon, color in E:
    assert group in GROUPS, key
    if group != cur:
        rows.append(f"\n\t// ══════════ {group} ══════════")
        cur = group
    rec_line = "\t\trecommended: true,\n" if key in RECOMMENDED else ""
    rows.append(
        "\t{\n"
        + f"\t\tkey: '{key}',\n"
        + f"\t\tgroup: '{group}',\n"
        + f"\t\ttitle: '{title}',\n"
        + f"\t\tdesc: '{desc}',\n"
        + f"\t\ticon: '{icon}',\n"
        + f"\t\tcolor: {color_expr(color)},\n"
        + rec_line
        + f"\t\tsource: require('../../assets/sounds/sound_{key}.mp3'),\n"
        + "\t},"
    )

body = HEADER.replace("__GROUPS__", ", ".join(f"'{g}'" for g in GROUPS)) + "\n".join(rows) + "\n];\n\nexport default MIND_SOUNDS;\n"

dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "const", "ConstMindSounds.ts")
with open(dest, "w", encoding="utf-8") as f:
    f.write(body)
print(f"entries={len(E)}, groups={len(GROUPS)} → {os.path.normpath(dest)}")
