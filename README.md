# 옥수수손오공

Phaser 3, TypeScript, Vite 기반의 2D 횡스크롤 액션 아케이드 웹게임입니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://127.0.0.1:5173` 또는 Vite가 출력한 주소를 엽니다.

## 조작

- 이동: `←/→` 또는 `A/D`
- 점프: `↑`
- 공격: `Space Bar`
- 모바일: 화면 하단의 좌/우, 점프, 공격 버튼
- 대화 넘기기: 클릭 또는 `Enter`

## 이야기 구성

1. 탄생의 옥수수밭: 화과산으로 떠나는 조작·코인 수집 모험
2. 혼세마왕의 동굴: 친구들을 지키기 위한 첫 보스전
3. 용궁의 여의봉: 수문장을 이기고 황금 여의봉 획득
4. 천궁의 추격전: 이랑진군의 번개를 피해 20초 생존
5. 오행산과 삼장법사: 스승을 만나 천축국 여행 시작
6. 고로장과 저팔계: 저팔계를 진정시키고 동료로 영입
7. 유사하의 사오정: 사오정의 이야기를 듣고 동료로 영입
8. 황풍대왕의 바람산: 거센 돌풍을 뚫는 보스전
9. 호선봉의 어둠숲: 돌진 공격의 빈틈을 찾는 보스전
10. 진흙 요괴의 늪: 느려지는 늪을 건너는 협동의 장
11. 천축국의 마음 거울: 그림자 손오공과의 마지막 전투
12. 불경과 깨달음의 귀환: 부처님에게 불경을 받아 고향으로 귀환

각 장에는 시작·완료 대화와 길 중간의 이야기가 있습니다. 보스가 있는 장에는 만남과 해결 대사도 연결됩니다. 5~7장에서 합류한 동료들은 이후 장에서 손오공을 따라다닙니다. 12장은 전투 없는 불경 획득과 귀환의 장입니다.

원작의 탄생·수렴동·수보리 조사·동해 용궁·천궁 소동·오행산·동료 합류·불경 귀환을 어린이 눈높이로 재구성했습니다. 옥수수에서 태어나는 설정, 용궁 수문장 시험, 후반의 숲·늪·마음 거울은 게임의 창작 각색입니다. 원작의 모든 사건을 재현하는 게임은 아닙니다.

## 구조

- `src/game/data/stages.ts`: 전체 스테이지 데이터
- `src/game/data/story.ts`: 12장 서사와 여정·보스 대사
- `src/game/data/character-art.json`: 48개 캐릭터 이미지 매핑
- `src/game/StageManager.ts`: localStorage 진행도, 여의봉 강화, 동료 상태 관리
- `src/scenes/StageScene.ts`: 데이터 기반 공통 스테이지
- `src/scenes/StageClearScene.ts`: 스테이지 클리어 화면
- `src/scenes/EndingScene.ts`: 엔딩 화면
- `src/entities/Player.ts`: 플레이어 이동, 점프, 공격
- `src/entities/Enemy.ts`: 기본 적 타입
- `src/entities/BossEnemy.ts`: 보스 체력과 불꽃·물방울·번개·돌풍 등 특수 공격
- `src/entities/EnemyFactory.ts`: 적 생성 진입점
- `src/ui/DialogueBox.ts`: 시작/클리어 대화창
- `src/ui/MobileControls.ts`: 모바일 터치 조작

## 확인

```bash
npm run build
npm test
```

처음 테스트할 때는 `npx playwright install chromium`이 필요합니다. 테스트는 별도 포트 5174에서 개발 서버를 시작하고 종료합니다. 보스 공격 입력, 12장 전환과 엔딩, 대화 중 정지, 레벨업과 여의봉 분리, 한 공격의 중복 적중, 모바일 입력을 검증합니다.

개발 서버의 `?stage=stage-03` 주소로 원하는 장을 미리 볼 수 있습니다. 미리보기의 레벨·동료·여의봉 진행은 메모리에서만 유지되며 실제 저장 기록을 바꾸지 않습니다. 배포본에서는 이 개발 기능이 비활성화됩니다.

## 이미지와 배포

손오공을 기준으로 한 셀 채색 캐릭터 48개가 `public/assets/characters`에 있습니다. 원본 그림표는 `art-source`, 가공 명령은 `npm run art:prepare`입니다. 배경은 원본 PNG를 보존하며 WebP로 서비스합니다(`npm run art:backgrounds`).

Vercel은 Vite 프로젝트로 `npm run build`를 실행하고 `dist`를 배포합니다. 환경변수나 서버 데이터베이스가 필요하지 않습니다. 진행 상황은 각 브라우저의 localStorage에 저장되므로 다른 기기로 자동 동기화되지 않습니다.

검토 기록: [docs/review.md](docs/review.md). 이미지 제작 기록: [art-source/README.md](art-source/README.md).
