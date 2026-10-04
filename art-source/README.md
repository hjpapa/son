# 캐릭터 제작 기록

내장 image_gen 도구로 두 개의 그림표를 제작했습니다. 기준 이미지는 기존 `public/assets/sprites/corn-wukong-clean-idle.png`입니다.

공통 프롬프트: Journey to the West children's platformer sprites matching the reference Corn Wukong: medium dark-brown outlines, clean cel shading, warm two-tone shadows, round expressive eyes, 2.5-head chibi proportions. Full body, generally facing right, no photorealistic materials, no 3D, no typography or background objects. Keep the complete silhouette and weapons within each cell. Transparent background or solid white matte.

- `travelers.png`: 6 × 6, 일반 몬스터 33종과 삼장법사·저팔계·사오정. 정확한 행 순서는 `src/game/data/character-art.json`의 travelers입니다.
- `legends.png`: 3 × 4, 보스 9종과 부처님·동해 용왕·관음보살. 순서는 같은 파일의 legends입니다. 그림자 손오공에는 기준 손오공의 옥수수 머리, 꼬리, 봉을 유지하고 보라색 의상을 요청했습니다.

생성 결과의 칸 간격은 정확하지 않으므로 고정 좌표로 자르지 않습니다. `scripts/prepare-art.mjs`는 바깥과 연결된 배경을 제거하고, 연결된 캐릭터 윤곽을 식별하여 발·무기를 포함한 전체 모양을 추출합니다. 눈과 옷의 흰색은 보존합니다. 결과는 투명한 192 × 192 PNG로 `art-source/characters`에 저장되고, `npm run art:optimize`가 게임용 WebP를 `public/assets/characters`에 만듭니다.

## 황금 여의봉 자세 (2026-10-04)

내장 image_gen의 편집 기능으로 기존 대기·달리기·공격·웅크림을 각각 참고하여 `sprites/corn-wukong-golden-{idle,run,attack,crouch}.png`를 제작했습니다. 얼굴·옥수수 머리·초록 옷·꼬리·구름 신발과 손 위치를 유지하고 봉만 붉은 몸통과 황금 옥수수 장식으로 바꿨습니다. 투명 배경이며 원본을 덮어쓰지 않았습니다.

사용한 공통 프롬프트: "Produce the same single full body Corn Wukong in exactly the reference pose, with the same facial expression, proportions, outfit, tail, corn head, cloud shoes and hand positions. Change ONLY the handheld green corn staff into the upgraded Ruyi staff: rich red lacquer shaft, bright golden ornate end collars and caps, a small golden corn-shaped finial. Hold it naturally inside the existing hands with correct occlusion, along the original direction and about the original length. Never create a second staff. No aura, floor, shadow or text. Warm dark brown outlines, cel shading, truly transparent background."

`npm run art:optimize`가 투명 여백을 정리하고 높이 320 px의 강화 WebP 4종을 `public/assets/sprites`에 저장합니다. `npm run art:verify`가 기존 그림까지 포함해 배포 애셋을 검사합니다. 배경 원본 12장은 유지하며, 장별 전경·원경·지형·구름·인장·주변 입자는 Phaser에서 한 번 만든 재사용 텍스처로 제공합니다.
