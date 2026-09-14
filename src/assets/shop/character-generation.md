# 캐릭터 에셋 생성 기록

생성 방식: 내장 image_gen 도구. 결과물은 투명 배경으로 생성한 뒤 앱용 WebP로 최적화했다.

- 황금 판다: `../illustrations/panda-stage-6-golden.png` — Lv.6, 20,000 EXP, 황금 한자 신선
- 코뿔소 주인: `rhino-shopkeeper.png` — 뿔 사장, 상점 안내 및 행동 대사
- 뿔 사장 상품 제안: `rhino-shopkeeper-offer.webp` — 상자를 손바닥에 올려 소개
- 뿔 사장 구매 성공: `rhino-shopkeeper-success.webp` — 엄지와 코인 주머니로 축하
- 뿔 사장 코인 부족: `rhino-shopkeeper-short.webp` — 빈 주머니를 보여 주며 격려
- 뿔 사장 안내: `rhino-shopkeeper-info.webp` — 두루마리와 손가락으로 설명
- 즐겨찾기 추가: `../illustrations/panda-favorite-added.webp` — 큰 별을 안고 윙크
- 즐겨찾기 해제: `../illustrations/panda-favorite-removed.webp` — 별 장식을 들고 인사
- 학습 완료 Toast: `../illustrations/panda-study-toast.webp` — 완료 학습 패와 엄지로 저장 성공 표현
- 참조: `../illustrations/panda-stage-5.png`

## 황금 판다 최종 프롬프트

Use case: stylized-concept. Create a new final evolution game pet sprite using the reference panda as identity and illustrated ink-and-watercolor style reference. Single full-body adorable but majestic panda calligraphy supreme master, richly ornate shimmering GOLD concept, luminous gold imperial scholar crown, spectacular gold brocade robes with dark ink accents, gold calligraphy brush, floating golden scroll and sweeping golden circular ink aura with sparkling gold leaves. Clearly more luxurious than the reference, keep recognizable black-and-white panda face. Centered square sprite, entire silhouette visible with 5% padding, face near x=50% y=30%, readable at 120px. Genuine transparent background, no backdrop, no text or watermark, no purple. Deliver PNG asset.

## 코뿔소 주인 최종 프롬프트

Use case: stylized-concept. New mobile game NPC sprite. Reference image ONLY for matching hand-painted ink and watercolor illustration style. Subject is ONE charming friendly anthropomorphic RHINOCEROS shopkeeper, gray rhino skin, clear ivory horn, big kind eyes, warm welcoming smile, dressed in traditional East Asian merchant teal robe and warm brass-gold trim, small merchant cap, holds wooden abacus in one hand and gestures welcome with the other. Full body, stocky adorable proportions, centered square, readable friendly face at tiny size, generous 6% padding. Genuine transparent background, no scenery, no other characters, no lettering, no watermark, no purple. Production PNG for Korean learning game shop dialogue.

## 상태별 에셋 공통 프롬프트

Use case: style-transfer. Mobile game UI feedback sprite. Preserve the exact reference character identity, costume, palette, and hand-painted ink-watercolor style. One character, centered square, readable face and gesture at small mobile UI size, genuine transparent background, no scenery, no text, no watermark, no purple.

- 상품 제안: 뿔 사장이 닫힌 나무 상품 상자를 손바닥에 올리고 다른 손으로 가리키는 친근한 판매 자세
- 구매 성공: 뿔 사장이 엄지를 들고 금빛 코인 주머니를 보여 주며 환하게 축하하는 자세
- 코인 부족: 뿔 사장이 동전 하나만 남은 열린 주머니를 보여 주며 따뜻하게 격려하는 자세
- 안내: 뿔 사장이 두루마리 안내장을 들고 검지를 올려 차분히 설명하는 자세
- 즐겨찾기 추가: 판다가 커다란 금빛 별을 안고 윙크하는 기쁜 반응
- 즐겨찾기 해제: 판다가 작은 별 장식을 들고 손을 흔드는 차분한 인사
- 학습 완료 Toast: 판다가 붉은 완료 도장이 찍힌 단순한 학습 패를 들고 엄지를 드는 상반신 반응. 58px에서도 얼굴과 패가 읽히도록 단순화
