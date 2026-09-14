# 한자 필순(획) 데이터

단어 상세에서 한자를 획순대로 그려 주는 애니메이션에 쓰는 자료다.

- 출처 : [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) → [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) `2.0.1`
- 라이선스 : ARPHIC PUBLIC LICENSE ([LICENSE.txt](./LICENSE.txt)) — 원본 글꼴 자료의 저작권은 Arphic Technology Co., Ltd. 에 있다.
  앱에서 그대로 배포하므로 라이선스 전문을 이 폴더에 함께 둔다.

## 파일 구성

- `0.json` ~ `23.json` : 글자 → 획 경로(SVG `path` 의 `d`) 목록.
  글자 코드포인트를 24 로 나눈 나머지가 파일 이름이다. 필요한 묶음만 읽어 오려고 나눠 두었다.
  (한 묶음 약 100KB, 전체 약 2.6MB · 1151자)
- 좌표계는 원자료 그대로 1024×1024, y 축이 위로 향한다.
  읽는 쪽은 `ConstHanjaStrokes.ts` 의 `STROKE_VIEWBOX` · `STROKE_TRANSFORM` 을 쓰면 된다.

## 다시 만드는 법

`ConstLifeWords.ts` 에 글자를 추가한 뒤, 그 글자의 파일을
`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/<글자>.json` 에서 받아
`strokes` 배열만 해당 묶음 파일에 넣는다.

한국에서 쓰는 이체자는 원자료에 없다. 眞·絶·飮 처럼 KanjiVG 에 제 자형이 있는 30자는
`../hanja-strokes-lines.json` 으로 옮겼다(그쪽 README 참고) — 이 폴더의 값은 쓰이지 않는다.
두 자료 어디에도 없는 7자만 아직 비슷한 글자로 채워 둔다 — 淸→清 · 鄕→鄉 · 敎→教 ·
硏→研 · 卽→即 · 郞→郎 · 槪→概. 일곱 쌍 모두 획수가 같고 한 부분의 모양만 다르다.

새 글자에서 404 가 나면 먼저 KanjiVG 에 있는지 보고, 있으면 중심선 자료에 넣는다.
