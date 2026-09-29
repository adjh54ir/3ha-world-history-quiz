# 역사 사자 캐릭터 에셋 제작 명세

내장 ImageGen 사용. `docs/app-icon-lion-master.png`를 모든 이미지의 정체성 기준으로 사용한다.

## 공통 프롬프트

Use case: identity-preserve. Create one production mobile game illustration using the exact same friendly lion historian from the reference app icon. Preserve the golden-orange fur, dark orange mane, large warm eyes, tan explorer hat and jacket, thick expressive black ink outlines, angular cel shading, cream highlights, rough screen-print grain and energetic world-history adventure tone. Full body and every prop entirely inside a square canvas with 8% empty margin. One character only, isolated on a genuinely transparent alpha background. No backdrop, scenery, letters, numbers, flags, national emblems, religious or political symbols, logo, border, shadow plane, checkerboard or watermark. No purple. Keep the face readable at 64px.

## 기본·상황 이미지

| 파일 | 장면 |
|---|---|
| `lion-avatar.webp` | Front-facing relaxed standing pose, feet visible, welcoming smile, arms naturally at sides; designed for accessory overlays. |
| `lion-attendance.webp` | Holding a small calendar with a large green check mark and waving hello, cheerful daily check-in. |
| `lion-favorite-added.webp` | Hugging a large gold star, delighted wink, two tiny sparkles. |
| `lion-favorite-removed.webp` | Holding a small gold star ornament and waving a gentle goodbye. |
| `lion-quiz-correct.webp` | Jumping lightly with one paw raised and a green check badge, joyful correct-answer reaction. |
| `lion-quiz-wrong.webp` | Thoughtful expression while checking an open notebook, encouraging rather than sad. |
| `lion-quiz-timeout.webp` | Holding a small hourglass that has just emptied, surprised but friendly expression. |
| `lion-result-great.webp` | Raising a gold trophy with a proud joyful smile and three small gold stars. |
| `lion-result-retry.webp` | Giving an encouraging thumbs-up while holding a closed history book, warm reassuring smile. |
| `lion-splash-charge.webp` | Running forward with an open history book tucked under one arm, excited adventure pose, mane and hat ribbon flowing. |
| `lion-study-complete.webp` | Closing a finished history book and presenting a green check badge, calm satisfied smile. |
| `lion-study-toast.webp` | Simple upper-body pose holding a small completed lesson card with a green check, readable at 58px. |
| `lion-time-challenge-complete.webp` | Holding a gold stopwatch and small trophy, energetic time-challenge victory. |
| `lion-time-challenge-hero.webp` | Sprinting toward the viewer with a gold stopwatch and navy history book, broken clock ring and blue speed streaks. |
| `lion-tower-challenge-hero.webp` | Leaping upward across three perspective stone steps toward a gold compass crown, rolled map in one paw. |
| `lion-topics-hero.webp` | Inviting the learner forward with an unfurled antique world map and a gold compass, compact horizontal silhouette. |
| `lion-stats-progress.webp` | Reviewing progress with a navy explorer journal and a small gold star medal, warm quietly proud expression. |
| `lion-wrong-review-hero.webp` | Sitting with a large open notebook and pencil, focused review pose, blank pages. |
| `lion-wrong.webp` | Holding a small open notebook and pencil, mildly puzzled but motivated expression. |

## 성장 단계

| 파일 | 단계 |
|---|---|
| `lion-stage-1.webp` | Tiny lion cub seated with a small green seedling beside a closed cream history book; no explorer hat yet. |
| `lion-stage-2.webp` | Young lion student standing with a small mint history book and a simple tan neckerchief. |
| `lion-stage-3.webp` | Young explorer lion wearing the tan hat and jacket, holding a pencil and blank lesson card. |
| `lion-stage-4.webp` | Confident historian lion with a bronze star medal and rolled parchment map. |
| `lion-stage-5.webp` | Master historian lion in a navy-and-gold scholar coat, holding an open chronicle with a subtle globe ring. |
| `lion-stage-6-golden.webp` | Majestic golden history master lion with ornate gold-trimmed explorer-scholar coat, luminous gold compass and scroll, restrained gold aura and sparkles. |

## 출력 규격

- 원본: 정사각형 PNG, 실제 투명 알파
- 앱 파일: 512×512 WebP, 알파 유지
- 파일명과 `require` 키는 위 표를 그대로 사용
