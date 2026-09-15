# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

세계의 나라·도시·인물·자연을 상식 수준에서 넓히려는 사용자. 상식 퀴즈를 즐기는 학생과 직장인을 주로 본다.

## Product Purpose

세계의 수도·랜드마크·위인·신화·천체·스포츠 지식을 주제별로 익히고 퀴즈·오답 복습·오늘의 문제로 반복 학습하게 한다. 출석, 펫 성장과 보상은 학습을 계속할 동기를 제공한다.

## Positioning

사전식 암기보다 주제별 세계 상식 학습을 게임형 진행·수집·성장 루프와 연결한다.

## Operating Context

사용자는 모바일 앱에서 짧게 세계 상식을 학습하고, 퀴즈와 오늘의 문제를 풀며, 출석 보상과 경험치로 펫·수호신을 성장시킨다.

## Capabilities and Constraints

- React Native·TypeScript와 Expo SDK 55 기반이며 iOS·Android를 지원한다.
- 학습 진행과 보상 상태는 Redux Persist로 기기에 저장한다.
- 애드몹 관련 변경은 별도 허락 없이 진행하지 않는다.

## Brand Commitments

- 제품명은 세계 상식 퀴즈다.
- 한국어 중심의 친근하고 명확한 문장을 쓴다.
- 깔끔하고 모던한 기본 인상을 유지하며 학습 흐름과 성장 상태를 명확하게 보여 준다.
- 보라색과 굵은 왼쪽 강조선은 사용하지 않는다.

## Evidence on Hand

- 실제 학습 데이터: `src/const/data/world/` (주제 8개 · 항목 683개, 주제마다 JSON 한 벌)
- 데이터 검증: `node --test src/const/data/world/ConstWorldData.test.ts` (id 중복·빈 카드·문항이 안 나오는 모드·답이 드러난 설명을 잡는다)
- 사자·수호신 에셋: `src/assets/illustrations/`, 국기·신화·행성 그림: `src/assets/flags`, `myth`, `planets`
- 학습 진행과 보상 규칙: `src/store/slice/LifeSlice.ts`, `src/services/life/LifeRules.ts`
- 상태 층과 학습 도메인을 잇는 자리: `src/const/data/world/ConstWorldDomain.ts`

## Product Principles

- 모든 보상은 실제 학습 행동과 성장 진행에 의미 있게 연결한다.
- 현재 진행도와 보상 효과를 즉시 이해할 수 있어야 한다.
- 수집과 성장의 재미가 학습보다 앞서거나 학습 흐름을 방해하지 않는다.
- 기존 저장 데이터와의 호환성을 유지한다.
- 항목의 사실관계는 사람이 확인한다. 기계 검증은 구조만 본다 (`ConstWorldData.test.ts`).
- 처음 켠 사용자에게는 쉬운 항목부터 낸다. 배운 개수가 늘수록 위 등급이 열린다.
