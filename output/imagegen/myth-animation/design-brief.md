# 그리스·로마 신화 이미지 제작 기준

- 내장 image_gen 도구로 인물별 1장씩 생성, 총 90종.
- 또렷한 외곽선, 절제된 셀 채색, 단순한 배경으로 통일.
- 기존 작품을 참조하지 않고 얼굴·머리·의상·장신구를 독자적으로 설계.
- 신과 영웅은 인물 중심, 신화 속 생물은 본래 특징 유지.
- 집단 항목은 구성원 수를 반영하고 태초의 신은 상징적인 인물로 표현.
- 앱 에셋은 기존 키를 유지한 512×512 WebP.

## 공통 생성 프롬프트

Use case: illustration-story. Create ONE square standalone illustration for an original Greek and Roman mythology educational quiz. A coherent original 2D animation series with clean ink contours, simplified expressive HUMAN facial anatomy, modest normal-sized eyes, restrained two-tone cel shading, softly painted minimal background, warm colors. Nostalgic hand-drawn television animation medium only: do not imitate or refer to any existing show, comic, character, franchise, actor or artist. Invent distinctive face, hair silhouette, garment structure and ornament for this individual. Avoid standard anime heroine faces and franchise costumes. No photograph, oil painting, 3D, chibi, cute mascot, glossy skin, text, watermark, logos, collage, gore or sexualization. Square composition with full head and relevant attributes inside frame and generous margin. Face and personality prominent in bust/waist framing for humans; medium full creature framing for beasts so diagnostic anatomy is readable. Small-screen clarity. Background quiet and thematic, not a busy scene. Humans wear modest ancient Mediterranean draped clothes or appropriate bronze armor. Vary age, facial structure and hairstyle appropriately. Preserve the mythological identity and use just one or two readable traditional symbols. Creatures must retain their traditional creature anatomy, not be turned into humans. Collective figures must show their correct group (Moirai three women, Muses nine women) in one image. Primordial abstract gods should be dignified human personifications with symbolic setting, not blank abstract textures. 

인물별 이름·분류·영역·상징은 manifest.json에 기록하며, 실제 프롬프트는 prompts.json에 저장한다.
