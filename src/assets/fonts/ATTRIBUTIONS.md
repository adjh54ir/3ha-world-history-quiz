# 서체 출처

## HanpickHanjaSerif.otf

한자 표시 전용 서체. 원본을 그대로 쓰지 않고 이 앱에 필요한 글자만 남겨 서브셋했다.

| 항목 | 내용 |
|------|------|
| 원본 | Source Han Serif K (Korean, Regular) — Adobe |
| 원본 배포처 | https://github.com/adobe-fonts/source-han-serif (release / OTF / Korean) |
| 라이선스 | SIL Open Font License 1.1 (`LICENSE-SourceHanSerif.txt`) |
| 상업적 사용 | 가능 (OFL) |
| 담긴 글자 | 7,382자 — 급수 데이터에 나오는 한자 6,301자 + 훈음 한글 + ASCII·기호 |
| 용량 | 약 2.5MB (원본 24.5MB) |

### 원본에서 바꾼 점

1. **서브셋** — `pyftsubset` 으로 위 글자만 남기고 OpenType layout feature·힌팅 제거.
2. **이름 변경** — 패밀리 이름을 `HanpickHanjaSerif` 로 변경. OFL 의 Reserved Font Name('Source') 조항에 따라
   수정본은 원본 이름을 쓸 수 없다.
3. **세로 메트릭 조정** — hhea `ascender 900 / descender -280 / lineGap 0` (자연 행간 1.18em).
   원본은 1.437em 이라 화면 스타일이 쓰는 `lineHeight = 글자크기 × 1.18` 보다 커서 안드로이드에서 위아래가 잘린다.
   실제 잉크 범위(-272 ~ 880 = 1.152em)보다는 크므로 글자가 깎이지 않는다.

### 왜 이 서체인가

- OS 기본 명조(iOS `AppleMyungjo`, Android `serif`)는 기기·플랫폼마다 자형이 달라 같은 한자가 다르게 보였다.
- Noto Serif KR(구글 폰트)은 특급 배정한자 524자가 빠져 그 글자만 다른 서체로 튄다.
- Nanum Myeongjo(구글 폰트 배포본)에는 한자가 아예 없다.
- Source Han Serif K 전체 판본만 앱이 다루는 한자를 100% 담고 있어 이것을 서브셋했다.

### 급수 데이터를 늘렸다면

`src/utils/FontUtils.test.ts` 가 "데이터에 있는 글자 = 서체에 담긴 글자"를 검사한다. 새 한자가 들어와 테스트가
깨지면 원본 Source Han Serif K 로 다시 서브셋해야 한다.

```bash
pyftsubset SourceHanSerifK-Regular.otf \
  --text-file=chars.txt --output-file=HanpickHanjaSerif.otf \
  --layout-features='' --no-hinting --desubroutinize --name-IDs='*' --name-legacy
# 이어서 이름 변경 + 세로 메트릭(900 / -280 / 0) 재적용
```
