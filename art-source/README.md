# 캐릭터 제작 기록

내장 image_gen 도구로 두 개의 그림표를 제작했습니다. 기준 이미지는 기존 `public/assets/sprites/corn-wukong-clean-idle.png`입니다.

공통 프롬프트: Journey to the West children's platformer sprites matching the reference Corn Wukong: medium dark-brown outlines, clean cel shading, warm two-tone shadows, round expressive eyes, 2.5-head chibi proportions. Full body, generally facing right, no photorealistic materials, no 3D, no typography or background objects. Keep the complete silhouette and weapons within each cell. Transparent background or solid white matte.

- `travelers.png`: 6 × 6, 일반 몬스터 33종과 삼장법사·저팔계·사오정. 정확한 행 순서는 `src/game/data/character-art.json`의 travelers입니다.
- `legends.png`: 3 × 4, 보스 9종과 부처님·동해 용왕·관음보살. 순서는 같은 파일의 legends입니다. 그림자 손오공에는 기준 손오공의 옥수수 머리, 꼬리, 봉을 유지하고 보라색 의상을 요청했습니다.

생성 결과의 칸 간격은 정확하지 않으므로 고정 좌표로 자르지 않습니다. `scripts/prepare-art.mjs`는 바깥과 연결된 배경을 제거하고, 연결된 캐릭터 윤곽을 식별하여 발·무기를 포함한 전체 모양을 추출합니다. 눈과 옷의 흰색은 보존합니다. 결과는 투명한 192 × 192 PNG로 `art-source/characters`에 저장되고, `npm run art:optimize`가 게임용 WebP를 `public/assets/characters`에 만듭니다.
