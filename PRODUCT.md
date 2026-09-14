# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

일상에서 자주 쓰는 한자어를 한국어로 학습하려는 사용자. 구체적인 연령대는 아직 정해지지 않았다.

## Product Purpose

생활 한자어를 분야별로 익히고 퀴즈·오답 복습·오늘의 문제로 반복 학습하게 한다. 출석, 펫 성장, 보상과 상점은 학습을 계속할 동기를 제공한다.

## Positioning

사전식 암기보다 생활 속 한자어 학습을 게임형 진행·수집·성장 루프와 연결한다.

## Operating Context

사용자는 모바일 앱에서 짧게 단어를 학습하고, 퀴즈와 오늘의 문제를 풀며, 출석 보상과 코인을 모아 펫·수호신·코스튬·강화 상품을 구매한다.

## Capabilities and Constraints

- React Native·TypeScript와 Expo SDK 55 기반이며 iOS·Android를 지원한다.
- 학습 진행과 상점 구매 상태는 Redux Persist로 기기에 저장한다.
- 상점 상품은 실제 학습·출석·퀴즈·펫 성장 효과와 연결돼야 한다.
- 애드몹 관련 변경은 별도 허락 없이 진행하지 않는다.

## Brand Commitments

- 제품명은 생활한자다.
- 한국어 중심의 친근하고 명확한 문장을 쓴다.
- 깔끔하고 모던한 기본 인상을 유지하되 상점은 실제 게임처럼 풍부한 에셋과 구매 감각을 제공한다.
- 보라색과 굵은 왼쪽 강조선은 사용하지 않는다.

## Evidence on Hand

- 실제 한자어·예문·퀴즈 데이터: `src/const/data/life/`
- 단어 데이터 검증: `yarn verify:words` (표준국어대사전 대조 — 없는 말·어긋난 독음을 잡는다)
- 기존 팬더·수호신·상점 에셋: `src/assets/`
- 상점 기능과 구매 효과: `src/screens/life/LifeShopScreen.tsx`, `src/store/slice/LifeSlice.ts`

## Product Principles

- 모든 보상과 상품은 실제 학습 행동에 의미 있는 효과를 준다.
- 현재 보유량, 가격, 효과와 구매 불가 이유를 즉시 이해할 수 있어야 한다.
- 수집과 성장의 재미가 학습보다 앞서거나 학습 흐름을 방해하지 않는다.
- 기존 저장 데이터와의 호환성을 유지한다.
- 단어의 한자 표기·독음·뜻풀이는 표준국어대사전을 근거로 삼는다. 단어를 더하거나 고치면 `yarn verify:words` 로 확인한다.
- 처음 켠 사용자에게는 쉬운 단어부터 낸다. 배운 개수가 늘수록 위 등급이 열린다.
