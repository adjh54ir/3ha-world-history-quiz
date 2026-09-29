# Selection banners

세계 상식 퀴즈용 배너. 한국어 퀴즈의 호랑이 배너 자리를 같은 크기(16:9)로 갈아 끼웠다.
배경은 `src/assets/world/*-hero.webp` 를 흐리게 깔고, 오른쪽에 역사 사자(`src/assets/illustrations/lion/*.webp`)를 얹어 PIL 로 합성했다.

| 파일 | 배경 | 사자 |
|---|---|---|
| quiz-main-hero.webp | event-hero | lion-topics-hero |
| quiz-sub-hero.webp | olympic-hero | lion-result-great |
| study-selection-hero.webp | landmark-fallback | lion-study |
| study-sub-hero.webp | worldcup-hero | lion-splash-charge |
| today-quiz-hero.webp | nature-hero | lion-attendance |
| ../time/time-challenge-hero.webp | event-hero | lion-time-challenge-hero |
| ../tower/tower-challenge-hero.webp | landmark-fallback | lion-tower-challenge-hero |
| ../tower/tower-challenge-complete.webp | olympic-hero | lion-result-great |

그림을 새로 그리면 같은 파일 이름으로 덮어쓰면 된다 (require 는 파일 이름만 본다).
