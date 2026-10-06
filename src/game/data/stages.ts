import { chapterStories } from './story';

export type EnemyType = 'walker' | 'flyer' | 'charger' | 'jumper' | 'boss';

export type StageBackgroundKey =
  | 'cornfield'
  | 'cave'
  | 'palace'
  | 'skywar'
  | 'mountain'
  | 'farm'
  | 'river'
  | 'wind'
  | 'forest'
  | 'swamp'
  | 'gold'
  | 'ending';

export type GimmickType = 'staffUpgrade' | 'windPush' | 'swampSlow' | 'surviveRun' | 'scriptedGoal';
export type StageClearMode = 'goal' | 'boss' | 'item' | 'survive' | 'npc';
export type BossAttackStyle = 'flame' | 'bubble' | 'lightning' | 'slam' | 'water' | 'wind' | 'claw' | 'mud' | 'shadow';
export type HazardType = 'spikes' | 'water' | 'mud' | 'lightning' | 'wind';
export type RewardType = 'staff' | 'sutra';

export type EnemyData = {
  type: EnemyType;
  name: string;
  x: number;
  y: number;
  hp: number;
  damage: number;
  speed: number;
  patrolRange: number;
  spriteKey: string;
};

export type BossData = EnemyData & {
  type: 'boss';
  maxHp: number;
  attackStyle: BossAttackStyle;
};

export type StageGimmick = { type: GimmickType; label: string; value?: number };
export type StageNpc = { name: string; role: string; x: number; y: number; spriteKey: string; dialogue: string[] };
export type StageReward = { type: RewardType; label: string; x: number; y: number };
export type StageHazard = { type: HazardType; x: number; y: number; width: number; label: string; value?: number };
export type StagePlatform = { x: number; y: number; width: number; height?: number };
export type StageCameo = { name: string; spriteKey: string; x: number; y: number; floating?: boolean };

export type StageData = {
  id: string;
  chapter: number;
  title: string;
  subtitle: string;
  objective: string;
  lesson: string;
  backgroundKey: StageBackgroundKey;
  musicKey: string;
  worldWidth: number;
  playerStart: { x: number; y: number };
  goalX: number;
  goalLabel: string;
  clearMode: StageClearMode;
  enemies: EnemyData[];
  boss?: BossData;
  npc?: StageNpc;
  reward?: StageReward;
  hazards: StageHazard[];
  platforms: StagePlatform[];
  cameos?: StageCameo[];
  gimmicks: StageGimmick[];
  startDialogue: string[];
  clearDialogue: string[];
  companionUnlock?: '삼장법사' | '저팔계' | '사오정';
  // Friends the story takes away for this chapter (e.g. carried off by the wind).
  absentCompanions?: string[];
  nextStageId?: string;
};

const groundY = 438;
// Chapter 1 (the tutorial) uses these gentle ledges; every other chapter has
// its own terrain. Two kinds of platform, never in between (a standing hero's
// head is at y 342): steps (y >= 340) are hopped onto, and bridges over
// spikes or water are steps so nobody walks into the hazard; ledges
// (y <= 320) can be walked under. Boss arenas and NPCs only get ledges.
// Every top is within the hero's 145 px jump.
const commonPlatforms: StagePlatform[] = [
  { x: 620, y: 350, width: 230 },
  { x: 1160, y: 320, width: 260 },
  { x: 1710, y: 360, width: 250 },
  { x: 2050, y: 315, width: 180 }
];

const stageLayouts: Array<Omit<StageData, 'startDialogue' | 'clearDialogue'>> = [
  {
    id: 'stage-01', chapter: 1, title: '탄생의 옥수수밭', subtitle: '옥수수에서 태어난 작은 영웅',
    objective: '옥수수 코인 5개를 모아 화과산 깃발로 가요!', lesson: '새로운 힘은 즐겁게 배우는 것에서 시작해요.',
    backgroundKey: 'cornfield', musicKey: 'stage-cornfield', worldWidth: 2900,
    playerStart: { x: 220, y: 382 }, goalX: 2580, goalLabel: '화과산', clearMode: 'goal',
    enemies: [
      { type: 'flyer', name: '장난 까마귀', x: 820, y: 270, hp: 1, damage: 1, speed: 58, patrolRange: 150, spriteKey: 'enemy-crow' },
      { type: 'walker', name: '옥수수벌레', x: 1460, y: groundY - 34, hp: 1, damage: 1, speed: 52, patrolRange: 150, spriteKey: 'enemy-worm' },
      { type: 'jumper', name: '메뚜기 요괴', x: 2050, y: groundY - 38, hp: 1, damage: 1, speed: 48, patrolRange: 120, spriteKey: 'enemy-grasshopper' }
    ],
    cameos: [{ name: '원숭이 친구', spriteKey: 'enemy-stone-monkey', x: 1000, y: groundY - 6 }, { name: '원숭이 친구', spriteKey: 'enemy-stone-monkey', x: 2380, y: groundY - 6 }],
    hazards: [], platforms: commonPlatforms, gimmicks: [],
    nextStageId: 'stage-02'
  },
  {
    id: 'stage-02', chapter: 2, title: '혼세마왕의 동굴', subtitle: '친구들을 괴롭히는 첫 번째 마왕',
    objective: '미로 인장 3개를 찾고 혼세마왕을 물리쳐요!', lesson: '강한 힘에는 친구를 지킬 책임이 따라요.',
    backgroundKey: 'cave', musicKey: 'stage-cave', worldWidth: 3100,
    playerStart: { x: 220, y: 382 }, goalX: 2820, goalLabel: '동굴 출구', clearMode: 'boss',
    enemies: [
      { type: 'flyer', name: '동굴 박쥐', x: 720, y: 250, hp: 1, damage: 1, speed: 72, patrolRange: 170, spriteKey: 'enemy-bat' },
      { type: 'walker', name: '돌멩이 요괴', x: 1350, y: groundY - 40, hp: 2, damage: 1, speed: 46, patrolRange: 150, spriteKey: 'enemy-stone' },
      { type: 'charger', name: '뿔 도깨비', x: 1900, y: groundY - 44, hp: 2, damage: 1, speed: 78, patrolRange: 160, spriteKey: 'enemy-horn' }
    ],
    boss: { type: 'boss', name: '혼세마왕', x: 2470, y: groundY - 74, hp: 5, maxHp: 5, damage: 1, speed: 62, patrolRange: 180, spriteKey: 'boss-honse', attackStyle: 'flame' },
    hazards: [], platforms: [{ x: 600, y: 350, width: 200 }, { x: 1040, y: 302, width: 240 }, { x: 1215, y: 227, width: 230 }, { x: 1640, y: 310, width: 180 }, { x: 2100, y: 318, width: 200 }, { x: 2300, y: 312, width: 160 }], gimmicks: [],
    nextStageId: 'stage-03'
  },
  {
    id: 'stage-03', chapter: 3, title: '용궁의 여의봉', subtitle: '동해 용궁에 잠든 신비한 무기',
    objective: '용궁 수문장을 이기고 여의봉을 받아요!', lesson: '좋은 도구는 바른 마음으로 사용할 때 빛나요.',
    backgroundKey: 'palace', musicKey: 'stage-palace', worldWidth: 3000,
    playerStart: { x: 220, y: 382 }, goalX: 2640, goalLabel: '여의봉 제단', clearMode: 'item',
    enemies: [
      { type: 'jumper', name: '물방울 요괴', x: 720, y: groundY - 38, hp: 1, damage: 1, speed: 55, patrolRange: 150, spriteKey: 'enemy-bubble' },
      { type: 'charger', name: '게 병사', x: 1420, y: groundY - 40, hp: 2, damage: 1, speed: 86, patrolRange: 150, spriteKey: 'enemy-crab' },
      { type: 'flyer', name: '해마 파수꾼', x: 1880, y: 260, hp: 2, damage: 1, speed: 66, patrolRange: 160, spriteKey: 'enemy-seahorse' }
    ],
    boss: { type: 'boss', name: '용궁 수문장', x: 2300, y: groundY - 74, hp: 5, maxHp: 5, damage: 1, speed: 44, patrolRange: 100, spriteKey: 'boss-gatekeeper', attackStyle: 'bubble' },
    reward: { type: 'staff', label: '황금 여의봉', x: 2640, y: 324 },
    cameos: [{ name: '동해 용왕', spriteKey: 'npc-dragon', x: 380, y: groundY - 6 }],
    hazards: [{ type: 'water', x: 980, y: 426, width: 130, label: '깊은 물' }], platforms: [{ x: 640, y: 350, width: 180 }, { x: 980, y: 342, width: 150 }, { x: 1250, y: 345, width: 200 }, { x: 1560, y: 305, width: 160 }, { x: 1760, y: 345, width: 160 }, { x: 2120, y: 318, width: 150 }], gimmicks: [{ type: 'staffUpgrade', label: '여의봉 강화', value: 1.25 }],
    nextStageId: 'stage-04'
  },
  {
    id: 'stage-04', chapter: 4, title: '천궁의 추격전', subtitle: '이랑진군과 구름 병사들의 추격',
    objective: '번개를 피해 20초 버티고 구름문으로 탈출해요!', lesson: '때로는 싸우는 것보다 현명하게 피하는 용기가 필요해요.',
    backgroundKey: 'skywar', musicKey: 'stage-skywar', worldWidth: 3300,
    playerStart: { x: 220, y: 382 }, goalX: 3050, goalLabel: '구름문', clearMode: 'survive',
    enemies: [
      { type: 'walker', name: '구름 병사', x: 820, y: groundY - 38, hp: 2, damage: 1, speed: 72, patrolRange: 190, spriteKey: 'enemy-cloud' },
      { type: 'flyer', name: '번개 새', x: 1480, y: 230, hp: 2, damage: 1, speed: 92, patrolRange: 220, spriteKey: 'enemy-thunderbird' },
      { type: 'charger', name: '천궁 창병', x: 2150, y: groundY - 42, hp: 3, damage: 1, speed: 88, patrolRange: 180, spriteKey: 'enemy-heaven-spear' }
    ],
    boss: { type: 'boss', name: '이랑진군', x: 700, y: groundY - 74, hp: 8, maxHp: 8, damage: 1, speed: 78, patrolRange: 520, spriteKey: 'boss-erlang', attackStyle: 'lightning' },
    hazards: [{ type: 'lightning', x: 1180, y: 418, width: 130, label: '번개 구름' }, { type: 'lightning', x: 2360, y: 418, width: 150, label: '번개 구름' }],
    platforms: [{ x: 700, y: 312, width: 180 }, { x: 1180, y: 342, width: 170 }, { x: 1500, y: 345, width: 160 }, { x: 1800, y: 305, width: 170 }, { x: 2100, y: 345, width: 180 }, { x: 2360, y: 342, width: 190 }, { x: 2700, y: 318, width: 200 }], gimmicks: [{ type: 'surviveRun', label: '천궁 추격전', value: 20 }],
    nextStageId: 'stage-05'
  },
  {
    id: 'stage-05', chapter: 5, title: '오행산과 삼장법사', subtitle: '오백 년 기다림 끝에 시작되는 진짜 여행',
    objective: '오행산 끝에서 삼장법사를 만나요!', lesson: '진짜 여행은 믿을 수 있는 친구와 함께 시작돼요.',
    backgroundKey: 'mountain', musicKey: 'stage-mountain', worldWidth: 3000,
    playerStart: { x: 220, y: 382 }, goalX: 2700, goalLabel: '삼장법사', clearMode: 'npc',
    enemies: [
      { type: 'walker', name: '바위 요괴', x: 850, y: groundY - 42, hp: 2, damage: 1, speed: 45, patrolRange: 150, spriteKey: 'enemy-rock' },
      { type: 'flyer', name: '산바람 요괴', x: 1520, y: 250, hp: 2, damage: 1, speed: 70, patrolRange: 190, spriteKey: 'enemy-mountain-wind' },
      { type: 'jumper', name: '돌원숭이', x: 2120, y: groundY - 42, hp: 2, damage: 1, speed: 58, patrolRange: 150, spriteKey: 'enemy-stone-monkey' }
    ],
    npc: { name: '삼장법사', role: '천축국으로 향하는 스승', x: 2700, y: groundY, spriteKey: 'npc-samjang', dialogue: ['삼장법사: 손오공아, 네 힘으로 약한 이를 지켜 주겠니?', '손오공: 혼자 잘난 척하지 않고 스승님과 친구들을 지키겠습니다.', '삼장법사: 그 약속을 믿으마. 이제 함께 천축국으로 가자.'] },
    cameos: [{ name: '관음보살', spriteKey: 'npc-guanyin', x: 560, y: 300, floating: true }],
    hazards: [{ type: 'spikes', x: 1230, y: 423, width: 120, label: '낙석 지대' }], platforms: [{ x: 760, y: 350, width: 170 }, { x: 980, y: 310, width: 150 }, { x: 1230, y: 342, width: 160 }, { x: 1560, y: 350, width: 180 }, { x: 1800, y: 305, width: 160 }, { x: 2030, y: 345, width: 180 }, { x: 2350, y: 315, width: 200 }], gimmicks: [{ type: 'scriptedGoal', label: '삼장법사와 대화' }],
    companionUnlock: '삼장법사', nextStageId: 'stage-06'
  },
  {
    id: 'stage-06', chapter: 6, title: '고로장과 저팔계', subtitle: '배고프지만 정 많은 두 번째 동료',
    objective: '저팔계를 진정시키고 서쪽 길로 가요!', lesson: '첫인상만으로 친구를 판단하지 않아요.',
    backgroundKey: 'farm', musicKey: 'stage-farm', worldWidth: 3100,
    playerStart: { x: 220, y: 382 }, goalX: 2840, goalLabel: '서쪽 길', clearMode: 'boss',
    enemies: [
      { type: 'walker', name: '돼지 졸개', x: 780, y: groundY - 40, hp: 2, damage: 1, speed: 58, patrolRange: 170, spriteKey: 'enemy-pig' },
      { type: 'jumper', name: '호박 요괴', x: 1450, y: groundY - 40, hp: 2, damage: 1, speed: 55, patrolRange: 150, spriteKey: 'enemy-pumpkin' },
      { type: 'charger', name: '성난 황소', x: 1960, y: groundY - 46, hp: 3, damage: 1, speed: 82, patrolRange: 160, spriteKey: 'enemy-bull' }
    ],
    boss: { type: 'boss', name: '저팔계', x: 2480, y: groundY - 76, hp: 6, maxHp: 6, damage: 1, speed: 58, patrolRange: 170, spriteKey: 'boss-bajie', attackStyle: 'slam' },
    hazards: [], platforms: [{ x: 560, y: 355, width: 170 }, { x: 900, y: 315, width: 190 }, { x: 1250, y: 350, width: 170 }, { x: 1620, y: 315, width: 190 }, { x: 1950, y: 350, width: 160 }, { x: 2380, y: 318, width: 170 }, { x: 2620, y: 318, width: 170 }], gimmicks: [],
    companionUnlock: '저팔계', nextStageId: 'stage-07'
  },
  {
    id: 'stage-07', chapter: 7, title: '유사하의 사오정', subtitle: '거센 강물 아래 기다리던 세 번째 동료',
    objective: '물살을 건너 사오정의 마음을 열어요!', lesson: '서로의 이야기를 들으면 적도 친구가 될 수 있어요.',
    backgroundKey: 'river', musicKey: 'stage-river', worldWidth: 3150,
    playerStart: { x: 220, y: 382 }, goalX: 2860, goalLabel: '강 건너편', clearMode: 'boss',
    enemies: [
      { type: 'flyer', name: '물고기 요괴', x: 760, y: 260, hp: 2, damage: 1, speed: 72, patrolRange: 190, spriteKey: 'enemy-fish' },
      { type: 'charger', name: '소용돌이 정령', x: 1430, y: groundY - 36, hp: 2, damage: 1, speed: 84, patrolRange: 160, spriteKey: 'enemy-whirlpool' },
      { type: 'jumper', name: '개구리 병사', x: 2020, y: groundY - 40, hp: 2, damage: 1, speed: 58, patrolRange: 150, spriteKey: 'enemy-frog' }
    ],
    boss: { type: 'boss', name: '사오정', x: 2500, y: groundY - 76, hp: 6, maxHp: 6, damage: 1, speed: 58, patrolRange: 180, spriteKey: 'boss-sandy', attackStyle: 'water' },
    hazards: [{ type: 'water', x: 1040, y: 426, width: 150, label: '거센 물살' }, { type: 'water', x: 1820, y: 426, width: 150, label: '거센 물살' }],
    platforms: [{ x: 700, y: 350, width: 170 }, { x: 1040, y: 342, width: 170 }, { x: 1300, y: 345, width: 170 }, { x: 1580, y: 310, width: 160 }, { x: 1820, y: 342, width: 170 }, { x: 2150, y: 318, width: 180 }, { x: 2420, y: 315, width: 160 }], gimmicks: [],
    companionUnlock: '사오정', nextStageId: 'stage-08'
  },
  {
    id: 'stage-08', chapter: 8, title: '황풍대왕의 바람산', subtitle: '눈을 뜨기 힘든 거센 황풍',
    objective: '근두운 레이싱을 마치고 황풍대왕을 물리쳐요!', lesson: '중심을 잡고 한 걸음씩 나아가면 어려움도 지나가요.',
    backgroundKey: 'wind', musicKey: 'stage-wind', worldWidth: 3200,
    playerStart: { x: 220, y: 382 }, goalX: 2920, goalLabel: '바람 고개', clearMode: 'boss',
    enemies: [
      { type: 'walker', name: '모래바람 요괴', x: 820, y: groundY - 40, hp: 2, damage: 1, speed: 66, patrolRange: 170, spriteKey: 'enemy-sand' },
      { type: 'flyer', name: '회오리 정령', x: 1480, y: 245, hp: 2, damage: 1, speed: 84, patrolRange: 210, spriteKey: 'enemy-tornado' },
      { type: 'charger', name: '황사 늑대', x: 2060, y: groundY - 42, hp: 3, damage: 1, speed: 88, patrolRange: 180, spriteKey: 'enemy-dust-wolf' }
    ],
    boss: { type: 'boss', name: '황풍대왕', x: 2550, y: groundY - 76, hp: 7, maxHp: 7, damage: 1, speed: 62, patrolRange: 190, spriteKey: 'boss-yellowwind', attackStyle: 'wind' },
    hazards: [{ type: 'wind', x: 1120, y: 405, width: 520, label: '황풍 지대', value: 100 }], platforms: [{ x: 950, y: 350, width: 160 }, { x: 1250, y: 345, width: 170 }, { x: 1600, y: 315, width: 180 }, { x: 1900, y: 350, width: 170 }, { x: 2250, y: 318, width: 170 }, { x: 2650, y: 318, width: 160 }],
    gimmicks: [{ type: 'windPush', label: '거센 황풍', value: 95 }],
    absentCompanions: ['삼장법사'], nextStageId: 'stage-09'
  },
  {
    id: 'stage-09', chapter: 9, title: '호선봉의 어둠숲', subtitle: '빠른 발톱과 가짜 그림자',
    objective: '숲의 미로 인장 3개를 찾고 호선봉을 물리쳐요!', lesson: '무서워도 침착하게 관찰하면 방법을 찾을 수 있어요.',
    backgroundKey: 'forest', musicKey: 'stage-forest', worldWidth: 3200,
    playerStart: { x: 220, y: 382 }, goalX: 2920, goalLabel: '숲의 출구', clearMode: 'boss',
    enemies: [
      { type: 'charger', name: '호랑이 부하', x: 980, y: groundY - 40, hp: 2, damage: 1, speed: 105, patrolRange: 190, spriteKey: 'enemy-tiger' },
      { type: 'walker', name: '나무 요괴', x: 1500, y: groundY - 46, hp: 3, damage: 1, speed: 40, patrolRange: 150, spriteKey: 'enemy-tree' },
      { type: 'flyer', name: '그림자 나방', x: 2080, y: 250, hp: 2, damage: 1, speed: 90, patrolRange: 190, spriteKey: 'enemy-moth' }
    ],
    boss: { type: 'boss', name: '호선봉', x: 2550, y: groundY - 76, hp: 7, maxHp: 7, damage: 1, speed: 82, patrolRange: 220, spriteKey: 'boss-tiger', attackStyle: 'claw' },
    hazards: [], platforms: [{ x: 650, y: 345, width: 180 }, { x: 1040, y: 302, width: 240 }, { x: 1215, y: 227, width: 230 }, { x: 1640, y: 310, width: 180 }, { x: 2050, y: 318, width: 170 }, { x: 2400, y: 318, width: 160 }, { x: 2700, y: 318, width: 160 }], gimmicks: [],
    nextStageId: 'stage-10'
  },
  {
    id: 'stage-10', chapter: 10, title: '진흙 요괴의 늪', subtitle: '발을 붙잡는 늪과 포기하고 싶은 마음',
    objective: '늪을 천천히 건너 진흙 요괴를 물리쳐요!', lesson: '천천히 가도 멈추지 않으면 목적지에 닿아요.',
    backgroundKey: 'swamp', musicKey: 'stage-swamp', worldWidth: 3200,
    playerStart: { x: 220, y: 382 }, goalX: 2920, goalLabel: '마른 땅', clearMode: 'boss',
    enemies: [
      { type: 'walker', name: '진흙 요괴', x: 800, y: groundY - 40, hp: 2, damage: 1, speed: 46, patrolRange: 160, spriteKey: 'enemy-mud' },
      { type: 'jumper', name: '늪 괴물', x: 1460, y: groundY - 44, hp: 3, damage: 1, speed: 52, patrolRange: 160, spriteKey: 'enemy-swamp' },
      { type: 'flyer', name: '독안개 벌레', x: 2040, y: 255, hp: 2, damage: 1, speed: 72, patrolRange: 180, spriteKey: 'enemy-mist-bug' }
    ],
    boss: { type: 'boss', name: '거대 진흙 요괴', x: 2550, y: groundY - 86, hp: 8, maxHp: 8, damage: 1, speed: 46, patrolRange: 190, spriteKey: 'boss-mud', attackStyle: 'mud' },
    hazards: [{ type: 'mud', x: 1020, y: 421, width: 360, label: '끈적한 늪', value: 0.62 }, { type: 'mud', x: 1900, y: 421, width: 330, label: '끈적한 늪', value: 0.62 }],
    platforms: [{ x: 900, y: 342, width: 150 }, { x: 1140, y: 318, width: 150 }, { x: 1450, y: 350, width: 180 }, { x: 1800, y: 342, width: 150 }, { x: 2020, y: 318, width: 140 }, { x: 2380, y: 318, width: 170 }, { x: 2700, y: 318, width: 160 }], gimmicks: [{ type: 'swampSlow', label: '늪 지형', value: 0.65 }],
    nextStageId: 'stage-11'
  },
  {
    id: 'stage-11', chapter: 11, title: '천축국의 마음 거울', subtitle: '마지막 적은 손오공 자신의 그림자',
    objective: '그림자 손오공을 이기고 마음의 문을 열어요!', lesson: '자신의 잘못을 인정하는 마음이 가장 큰 용기예요.',
    backgroundKey: 'gold', musicKey: 'stage-gold', worldWidth: 3200,
    playerStart: { x: 220, y: 382 }, goalX: 2920, goalLabel: '천축국 문', clearMode: 'boss',
    enemies: [
      { type: 'walker', name: '고집의 조각', x: 820, y: groundY - 42, hp: 3, damage: 1, speed: 68, patrolRange: 170, spriteKey: 'enemy-pride' },
      { type: 'flyer', name: '두려움의 조각', x: 1480, y: 245, hp: 3, damage: 1, speed: 86, patrolRange: 200, spriteKey: 'enemy-fear' },
      { type: 'charger', name: '성급함의 조각', x: 2050, y: groundY - 42, hp: 3, damage: 1, speed: 96, patrolRange: 170, spriteKey: 'enemy-haste' }
    ],
    boss: { type: 'boss', name: '그림자 손오공', x: 2550, y: groundY - 78, hp: 8, maxHp: 8, damage: 1, speed: 68, patrolRange: 210, spriteKey: 'boss-shadow', attackStyle: 'shadow' },
    hazards: [{ type: 'lightning', x: 1180, y: 418, width: 130, label: '마음의 균열' }, { type: 'lightning', x: 2180, y: 418, width: 130, label: '마음의 균열' }],
    platforms: [{ x: 650, y: 345, width: 170 }, { x: 950, y: 305, width: 150 }, { x: 1180, y: 342, width: 160 }, { x: 1500, y: 345, width: 170 }, { x: 1850, y: 310, width: 160 }, { x: 2180, y: 318, width: 160 }, { x: 2450, y: 318, width: 160 }, { x: 2700, y: 318, width: 150 }], gimmicks: [],
    nextStageId: 'stage-12'
  },
  {
    id: 'stage-12', chapter: 12, title: '불경과 깨달음의 귀환', subtitle: '천축국에서 받은 지혜를 고향으로',
    objective: '부처님을 만나 빛나는 불경을 받아요!', lesson: '모험에서 얻은 지혜는 다른 사람과 나눌 때 완성돼요.',
    backgroundKey: 'ending', musicKey: 'stage-ending', worldWidth: 2700,
    playerStart: { x: 220, y: 382 }, goalX: 2380, goalLabel: '불경 제단', clearMode: 'item',
    enemies: [],
    npc: { name: '부처님', role: '지혜를 전하는 스승', x: 2200, y: groundY, spriteKey: 'npc-buddha', dialogue: ['부처님: 먼 길을 걸어오며 무엇을 배웠느냐?', '손오공: 힘보다 책임을, 혼자 이기는 것보다 함께 걷는 마음을 배웠습니다.', '부처님: 그 깨달음이 바로 너희가 찾아온 가장 귀한 불경이란다.'] },
    reward: { type: 'sutra', label: '천축국의 불경', x: 2440, y: 330 },
    cameos: [{ name: '관음보살', spriteKey: 'npc-guanyin', x: 1180, y: 300, floating: true }],
    hazards: [], platforms: [{ x: 600, y: 355, width: 180 }, { x: 900, y: 318, width: 170 }, { x: 1500, y: 345, width: 180 }, { x: 1800, y: 318, width: 170 }], gimmicks: [{ type: 'scriptedGoal', label: '불경 받기' }]
  }
];

export const stages: StageData[] = stageLayouts.map((stage) => ({
  ...stage,
  startDialogue: chapterStories[stage.id].startDialogue,
  clearDialogue: chapterStories[stage.id].clearDialogue
}));

export const firstStageId = 'stage-01';

export function getStage(stageId: string): StageData {
  const stage = stages.find((item) => item.id === stageId);
  if (!stage) throw new Error(`Unknown stage id: ${stageId}`);
  return stage;
}

// Corn coins sit on every ledge (collected by walking across it) plus a short
// trail on the ground at the start that teaches young players to collect them.
export function coinSpots(stage: Pick<StageData, 'platforms'>): Array<{ x: number; y: number }> {
  const spots = [360, 420, 480].map((x) => ({ x, y: 400 }));
  for (const platform of stage.platforms) {
    const top = platform.y - (platform.height ?? 26) / 2;
    const count = Math.min(3, Math.max(1, Math.floor(platform.width / 70)));
    for (let index = 0; index < count; index += 1) {
      spots.push({ x: platform.x + (index - (count - 1) / 2) * 52, y: top - 30 });
    }
  }
  return spots;
}

export function getNextStageAfterCleared(lastClearedStageId: string | null): string {
  if (!lastClearedStageId) return firstStageId;
  return getStage(lastClearedStageId).nextStageId ?? firstStageId;
}
