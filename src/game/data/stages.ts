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
export type StageNpc = { name: string; role: string; x: number; y: number; spriteKey: string; color: number; dialogue: string[] };
export type StageReward = { type: RewardType; label: string; x: number; y: number };
export type StageHazard = { type: HazardType; x: number; y: number; width: number; label: string; value?: number };
export type StagePlatform = { x: number; y: number; width: number; height?: number };

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
  gimmicks: StageGimmick[];
  startDialogue: string[];
  clearDialogue: string[];
  companionUnlock?: '삼장법사' | '저팔계' | '사오정';
  nextStageId?: string;
};

const groundY = 438;
const commonPlatforms: StagePlatform[] = [
  { x: 620, y: 350, width: 230 },
  { x: 1160, y: 320, width: 260 },
  { x: 1710, y: 360, width: 250 },
  { x: 2050, y: 315, width: 180 }
];

const stageLayouts: StageData[] = [
  {
    id: 'stage-01', chapter: 1, title: '탄생의 옥수수밭', subtitle: '옥수수에서 태어난 작은 영웅',
    objective: '달리고 뛰며 옥수수 코인 5개를 모아 화과산 깃발에 도착하세요.', lesson: '새로운 힘은 즐겁게 배우는 것에서 시작해요.',
    backgroundKey: 'cornfield', musicKey: 'stage-cornfield', worldWidth: 2900,
    playerStart: { x: 120, y: 382 }, goalX: 2580, goalLabel: '화과산', clearMode: 'goal',
    enemies: [
      { type: 'flyer', name: '장난 까마귀', x: 820, y: 270, hp: 1, damage: 1, speed: 58, patrolRange: 150, spriteKey: 'enemy-crow' },
      { type: 'walker', name: '옥수수벌레', x: 1460, y: groundY - 34, hp: 1, damage: 1, speed: 52, patrolRange: 150, spriteKey: 'enemy-worm' },
      { type: 'jumper', name: '메뚜기 요괴', x: 2050, y: groundY - 38, hp: 1, damage: 1, speed: 48, patrolRange: 120, spriteKey: 'enemy-grasshopper' }
    ],
    hazards: [], platforms: commonPlatforms, gimmicks: [],
    startDialogue: ['아주 먼 동쪽, 햇살 가득한 화과산에 황금빛 옥수수 하나가 반짝였어요.', '옥수수가 쩍 갈라지자 꼬리 달린 작은 원숭이, 옥수수손오공이 깨어났어요!', '손오공: 이 넓은 세상을 달리고 뛰며 친구들을 만나 볼 거야!'],
    clearDialogue: ['손오공은 산을 누비며 원숭이 친구들을 위험에서 도왔어요.', '친구들: 우리를 지켜 준 네가 화과산의 왕이야!', '하지만 산 너머에서는 혼세마왕이 친구들의 보물을 노리고 있었어요.'],
    nextStageId: 'stage-02'
  },
  {
    id: 'stage-02', chapter: 2, title: '혼세마왕의 동굴', subtitle: '친구들을 괴롭히는 첫 번째 마왕',
    objective: '동굴 끝의 혼세마왕을 물리치고 열린 길로 나가세요.', lesson: '강한 힘에는 친구를 지킬 책임이 따라요.',
    backgroundKey: 'cave', musicKey: 'stage-cave', worldWidth: 3100,
    playerStart: { x: 120, y: 382 }, goalX: 2820, goalLabel: '동굴 출구', clearMode: 'boss',
    enemies: [
      { type: 'flyer', name: '동굴 박쥐', x: 720, y: 250, hp: 1, damage: 1, speed: 72, patrolRange: 170, spriteKey: 'enemy-bat' },
      { type: 'walker', name: '돌멩이 요괴', x: 1350, y: groundY - 40, hp: 2, damage: 1, speed: 46, patrolRange: 150, spriteKey: 'enemy-stone' },
      { type: 'charger', name: '뿔 도깨비', x: 1900, y: groundY - 44, hp: 2, damage: 1, speed: 78, patrolRange: 160, spriteKey: 'enemy-horn' }
    ],
    boss: { type: 'boss', name: '혼세마왕', x: 2470, y: groundY - 74, hp: 5, maxHp: 5, damage: 1, speed: 62, patrolRange: 180, spriteKey: 'boss-honse', attackStyle: 'flame' },
    hazards: [{ type: 'spikes', x: 1040, y: 423, width: 120, label: '뾰족 바위' }], platforms: commonPlatforms, gimmicks: [],
    startDialogue: ['밤이 되자 혼세마왕이 화과산에 들이닥쳐 곡식과 물건을 빼앗아 갔어요.', '겁에 질린 친구들을 본 손오공의 마음에 처음으로 책임감이 생겼어요.', '손오공: 내 힘은 자랑하려고 있는 게 아니야. 친구들을 구하러 가자!'],
    clearDialogue: ['혼세마왕이 무기를 내려놓자 동굴 밖에 다시 웃음소리가 번졌어요.', '손오공은 힘을 함부로 쓰지 않고 약한 친구를 지키겠다고 약속했어요.', '더 큰 위험에 맞서려면 동해 용궁의 신비한 여의봉이 필요했어요.'],
    nextStageId: 'stage-03'
  },
  {
    id: 'stage-03', chapter: 3, title: '용궁의 여의봉', subtitle: '동해 용궁에 잠든 신비한 무기',
    objective: '용궁 수문장을 이기고 봉인된 여의봉을 획득하세요.', lesson: '좋은 도구는 바른 마음으로 사용할 때 빛나요.',
    backgroundKey: 'palace', musicKey: 'stage-palace', worldWidth: 3000,
    playerStart: { x: 120, y: 382 }, goalX: 2640, goalLabel: '여의봉 제단', clearMode: 'item',
    enemies: [
      { type: 'jumper', name: '물방울 요괴', x: 720, y: groundY - 38, hp: 1, damage: 1, speed: 55, patrolRange: 150, spriteKey: 'enemy-bubble' },
      { type: 'charger', name: '게 병사', x: 1420, y: groundY - 40, hp: 2, damage: 1, speed: 86, patrolRange: 150, spriteKey: 'enemy-crab' },
      { type: 'flyer', name: '해마 파수꾼', x: 1880, y: 260, hp: 2, damage: 1, speed: 66, patrolRange: 160, spriteKey: 'enemy-seahorse' }
    ],
    boss: { type: 'boss', name: '용궁 수문장', x: 2300, y: groundY - 74, hp: 5, maxHp: 5, damage: 1, speed: 44, patrolRange: 100, spriteKey: 'boss-gatekeeper', attackStyle: 'bubble' },
    reward: { type: 'staff', label: '황금 여의봉', x: 2640, y: 324 },
    hazards: [{ type: 'water', x: 980, y: 426, width: 130, label: '깊은 물' }], platforms: commonPlatforms, gimmicks: [{ type: 'staffUpgrade', label: '여의봉 강화', value: 1.25 }],
    startDialogue: ['손오공은 폭포 아래 깊은 길을 따라 동해 용궁에 도착했어요.', '보물창고에서 누구도 들 수 없던 여의봉이 손오공을 보고 환하게 빛났어요.', '용궁 수문장: 바른 마음과 용기를 보여야 여의봉의 주인이 될 수 있다!'],
    clearDialogue: ['황금 여의봉이 손오공의 손에 맞게 쏙 줄어들었어요!', '손오공: 꼭 필요한 순간에 친구를 지키는 데만 사용할게요.', '강해진 손오공의 소문은 구름 위 하늘나라 천궁까지 전해졌어요.'],
    nextStageId: 'stage-04'
  },
  {
    id: 'stage-04', chapter: 4, title: '천궁의 추격전', subtitle: '이랑진군과 구름 병사들의 추격',
    objective: '번개와 구름 병사를 피해 20초 동안 달리세요.', lesson: '때로는 싸우는 것보다 현명하게 피하는 용기가 필요해요.',
    backgroundKey: 'skywar', musicKey: 'stage-skywar', worldWidth: 3300,
    playerStart: { x: 120, y: 382 }, goalX: 3050, goalLabel: '구름문', clearMode: 'survive',
    enemies: [
      { type: 'walker', name: '구름 병사', x: 820, y: groundY - 38, hp: 2, damage: 1, speed: 72, patrolRange: 190, spriteKey: 'enemy-cloud' },
      { type: 'flyer', name: '번개 새', x: 1480, y: 230, hp: 2, damage: 1, speed: 92, patrolRange: 220, spriteKey: 'enemy-thunderbird' },
      { type: 'charger', name: '천궁 창병', x: 2150, y: groundY - 42, hp: 3, damage: 1, speed: 88, patrolRange: 180, spriteKey: 'enemy-heaven-spear' }
    ],
    boss: { type: 'boss', name: '이랑진군', x: 700, y: groundY - 74, hp: 8, maxHp: 8, damage: 1, speed: 78, patrolRange: 520, spriteKey: 'boss-erlang', attackStyle: 'lightning' },
    hazards: [{ type: 'lightning', x: 1180, y: 418, width: 130, label: '번개 구름' }, { type: 'lightning', x: 2360, y: 418, width: 150, label: '번개 구름' }],
    platforms: commonPlatforms, gimmicks: [{ type: 'surviveRun', label: '천궁 추격전', value: 20 }],
    startDialogue: ['천궁의 관리들은 제멋대로 힘을 쓰는 손오공을 붙잡으려 했어요.', '이랑진군과 구름 병사들이 번개를 몰고 화과산 하늘을 가득 메웠어요.', '손오공: 맞서기만 하지 말고 친구들이 다치지 않게 안전한 길을 열자!'],
    clearDialogue: ['손오공은 끝까지 달렸지만 부처님의 커다란 손바닥 앞에서 멈추었어요.', '부처님: 힘이 클수록 기다리고 생각하는 마음도 함께 자라야 한단다.', '손오공은 오행산 아래에서 오백 년 동안 그 말의 뜻을 생각했어요.'],
    nextStageId: 'stage-05'
  },
  {
    id: 'stage-05', chapter: 5, title: '오행산과 삼장법사', subtitle: '오백 년 기다림 끝에 시작되는 진짜 여행',
    objective: '바위 요괴를 지나 오행산 끝의 삼장법사를 만나세요.', lesson: '진짜 여행은 믿을 수 있는 친구와 함께 시작돼요.',
    backgroundKey: 'mountain', musicKey: 'stage-mountain', worldWidth: 3000,
    playerStart: { x: 120, y: 382 }, goalX: 2700, goalLabel: '삼장법사', clearMode: 'npc',
    enemies: [
      { type: 'walker', name: '바위 요괴', x: 850, y: groundY - 42, hp: 2, damage: 1, speed: 45, patrolRange: 150, spriteKey: 'enemy-rock' },
      { type: 'flyer', name: '산바람 요괴', x: 1520, y: 250, hp: 2, damage: 1, speed: 70, patrolRange: 190, spriteKey: 'enemy-mountain-wind' },
      { type: 'jumper', name: '돌원숭이', x: 2120, y: groundY - 42, hp: 2, damage: 1, speed: 58, patrolRange: 150, spriteKey: 'enemy-stone-monkey' }
    ],
    npc: { name: '삼장법사', role: '천축국으로 향하는 스승', x: 2700, y: groundY, spriteKey: 'npc-samjang', color: 0xe9b44c, dialogue: ['삼장법사: 손오공아, 네 힘으로 약한 이를 지켜 주겠니?', '손오공: 혼자 잘난 척하지 않고 스승님과 친구들을 지키겠습니다.', '삼장법사: 그 약속을 믿으마. 이제 함께 천축국으로 가자.'] },
    hazards: [{ type: 'spikes', x: 1230, y: 423, width: 120, label: '낙석 지대' }], platforms: commonPlatforms, gimmicks: [{ type: 'scriptedGoal', label: '삼장법사와 대화' }],
    startDialogue: ['계절이 수없이 바뀐 뒤, 천축국으로 가던 삼장법사가 오행산을 지나갔어요.', '삼장법사는 갇힌 손오공에게 벌 대신 새로운 약속을 건넸어요.', '삼장법사: 함께 불경을 구하며 네 힘을 세상을 돕는 데 써 보겠니?'],
    clearDialogue: ['삼장법사가 봉인을 풀자 손오공은 오백 년 만에 다시 하늘을 보았어요.', '손오공은 자유보다 삼장법사와 나눈 약속을 먼저 마음에 새겼어요.', '두 사람은 지혜의 불경을 구하러 서쪽 천축국으로 출발했습니다.'],
    companionUnlock: '삼장법사', nextStageId: 'stage-06'
  },
  {
    id: 'stage-06', chapter: 6, title: '고로장과 저팔계', subtitle: '배고프지만 정 많은 두 번째 동료',
    objective: '농장을 어지럽히는 저팔계를 진정시키고 열린 길로 가세요.', lesson: '첫인상만으로 친구를 판단하지 않아요.',
    backgroundKey: 'farm', musicKey: 'stage-farm', worldWidth: 3100,
    playerStart: { x: 120, y: 382 }, goalX: 2840, goalLabel: '서쪽 길', clearMode: 'boss',
    enemies: [
      { type: 'walker', name: '돼지 졸개', x: 780, y: groundY - 40, hp: 2, damage: 1, speed: 58, patrolRange: 170, spriteKey: 'enemy-pig' },
      { type: 'jumper', name: '호박 요괴', x: 1450, y: groundY - 40, hp: 2, damage: 1, speed: 55, patrolRange: 150, spriteKey: 'enemy-pumpkin' },
      { type: 'charger', name: '성난 황소', x: 1960, y: groundY - 46, hp: 3, damage: 1, speed: 82, patrolRange: 160, spriteKey: 'enemy-bull' }
    ],
    boss: { type: 'boss', name: '저팔계', x: 2480, y: groundY - 76, hp: 6, maxHp: 6, damage: 1, speed: 58, patrolRange: 170, spriteKey: 'boss-bajie', attackStyle: 'slam' },
    hazards: [], platforms: commonPlatforms, gimmicks: [],
    startDialogue: ['여행길의 고로장에서는 음식이 사라지고 밭에 커다란 발자국이 남았어요.', '범인은 힘이 세지만 늘 혼자 밥을 먹던 돼지요괴 저팔계였어요.', '손오공: 먼저 이유를 들어 보고, 잘못을 멈추게 하자!'],
    clearDialogue: ['저팔계: 미안해. 배고프고 외로워서 욕심을 부렸어.', '삼장법사: 잘못을 고치겠다면 우리와 함께 좋은 일을 하자꾸나.', '씩씩한 저팔계가 두 번째 여행 동료가 되어 서쪽 길에 올랐어요.'],
    companionUnlock: '저팔계', nextStageId: 'stage-07'
  },
  {
    id: 'stage-07', chapter: 7, title: '유사하의 사오정', subtitle: '거센 강물 아래 기다리던 세 번째 동료',
    objective: '물살을 건너 사오정과 겨룬 뒤 진심을 들으세요.', lesson: '서로의 이야기를 들으면 적도 친구가 될 수 있어요.',
    backgroundKey: 'river', musicKey: 'stage-river', worldWidth: 3150,
    playerStart: { x: 120, y: 382 }, goalX: 2860, goalLabel: '강 건너편', clearMode: 'boss',
    enemies: [
      { type: 'flyer', name: '물고기 요괴', x: 760, y: 260, hp: 2, damage: 1, speed: 72, patrolRange: 190, spriteKey: 'enemy-fish' },
      { type: 'charger', name: '소용돌이 정령', x: 1430, y: groundY - 36, hp: 2, damage: 1, speed: 84, patrolRange: 160, spriteKey: 'enemy-whirlpool' },
      { type: 'jumper', name: '개구리 병사', x: 2020, y: groundY - 40, hp: 2, damage: 1, speed: 58, patrolRange: 150, spriteKey: 'enemy-frog' }
    ],
    boss: { type: 'boss', name: '사오정', x: 2500, y: groundY - 76, hp: 6, maxHp: 6, damage: 1, speed: 58, patrolRange: 180, spriteKey: 'boss-sandy', attackStyle: 'water' },
    hazards: [{ type: 'water', x: 1040, y: 426, width: 150, label: '거센 물살' }, { type: 'water', x: 1820, y: 426, width: 150, label: '거센 물살' }],
    platforms: commonPlatforms, gimmicks: [],
    startDialogue: ['유사하의 거센 물살 앞에서 삼장법사의 말이 더 나아가지 못했어요.', '강 아래 홀로 지내던 사오정은 지나가는 사람을 모두 적으로 오해했어요.', '삼장법사: 싸우기 전에 사오정의 외로운 이야기를 들어 보자.'],
    clearDialogue: ['사오정: 저도 지난 잘못을 고치고 다시 좋은 일을 하고 싶습니다.', '손오공: 우리와 함께라면 혼자서 강을 지킬 필요가 없어!', '든든한 사오정까지 합류하며 네 친구의 천축국 여행이 시작됐어요.'],
    companionUnlock: '사오정', nextStageId: 'stage-08'
  },
  {
    id: 'stage-08', chapter: 8, title: '황풍대왕의 바람산', subtitle: '눈을 뜨기 힘든 거센 황풍',
    objective: '돌풍에 밀리지 않고 황풍대왕을 물리치세요.', lesson: '중심을 잡고 한 걸음씩 나아가면 어려움도 지나가요.',
    backgroundKey: 'wind', musicKey: 'stage-wind', worldWidth: 3200,
    playerStart: { x: 120, y: 382 }, goalX: 2920, goalLabel: '바람 고개', clearMode: 'boss',
    enemies: [
      { type: 'walker', name: '모래바람 요괴', x: 820, y: groundY - 40, hp: 2, damage: 1, speed: 66, patrolRange: 170, spriteKey: 'enemy-sand' },
      { type: 'flyer', name: '회오리 정령', x: 1480, y: 245, hp: 2, damage: 1, speed: 84, patrolRange: 210, spriteKey: 'enemy-tornado' },
      { type: 'charger', name: '황사 늑대', x: 2060, y: groundY - 42, hp: 3, damage: 1, speed: 88, patrolRange: 180, spriteKey: 'enemy-dust-wolf' }
    ],
    boss: { type: 'boss', name: '황풍대왕', x: 2550, y: groundY - 76, hp: 7, maxHp: 7, damage: 1, speed: 62, patrolRange: 190, spriteKey: 'boss-yellowwind', attackStyle: 'wind' },
    hazards: [{ type: 'wind', x: 1120, y: 405, width: 520, label: '황풍 지대', value: 100 }], platforms: commonPlatforms,
    gimmicks: [{ type: 'windPush', label: '거센 황풍', value: 95 }],
    startDialogue: ['황풍산에 들어서자 거센 모래바람이 삼장법사를 멀리 데려가 버렸어요.', '손오공은 눈을 뜨기 힘들었지만 저팔계와 사오정이 양옆을 지켜 주었어요.', '손오공: 바람이 잠잠해지는 순간에 힘을 모아 스승님을 구하자!'],
    clearDialogue: ['네 친구가 힘을 모으자 황풍대왕의 거센 바람이 마침내 멈췄어요.', '삼장법사: 혼자였다면 어려웠지만 서로 믿었기에 이겨 냈구나.', '달아난 호선봉이 어둠숲에 그림자 함정을 남기고 길을 막았어요.'],
    nextStageId: 'stage-09'
  },
  {
    id: 'stage-09', chapter: 9, title: '호선봉의 어둠숲', subtitle: '빠른 발톱과 가짜 그림자',
    objective: '돌진을 피한 뒤 멈춘 호선봉의 약점을 공격하세요.', lesson: '무서워도 침착하게 관찰하면 방법을 찾을 수 있어요.',
    backgroundKey: 'forest', musicKey: 'stage-forest', worldWidth: 3200,
    playerStart: { x: 120, y: 382 }, goalX: 2920, goalLabel: '숲의 출구', clearMode: 'boss',
    enemies: [
      { type: 'charger', name: '호랑이 부하', x: 850, y: groundY - 40, hp: 2, damage: 1, speed: 105, patrolRange: 190, spriteKey: 'enemy-tiger' },
      { type: 'walker', name: '나무 요괴', x: 1500, y: groundY - 46, hp: 3, damage: 1, speed: 40, patrolRange: 150, spriteKey: 'enemy-tree' },
      { type: 'flyer', name: '그림자 나방', x: 2080, y: 250, hp: 2, damage: 1, speed: 90, patrolRange: 190, spriteKey: 'enemy-moth' }
    ],
    boss: { type: 'boss', name: '호선봉', x: 2550, y: groundY - 76, hp: 7, maxHp: 7, damage: 1, speed: 82, patrolRange: 220, spriteKey: 'boss-tiger', attackStyle: 'claw' },
    hazards: [{ type: 'spikes', x: 1770, y: 423, width: 130, label: '가시덩굴' }], platforms: commonPlatforms, gimmicks: [],
    startDialogue: ['황풍대왕의 부하 호선봉이 어둠숲 곳곳에 가짜 그림자를 만들었어요.', '성급히 달려들면 나무 그림자도 무서운 호랑이처럼 보였어요.', '사오정: 진짜 호선봉이 돌진한 뒤 멈추는 순간을 잘 살펴보세요!'],
    clearDialogue: ['손오공은 빠른 발톱보다 침착하게 보는 눈이 더 강하다는 걸 배웠어요.', '저팔계가 웃음으로 두려움을 걷어 내고 사오정이 안전한 길을 밝혔어요.', '네 친구는 서로의 손을 놓지 않은 채 어둠숲을 빠져나왔습니다.'],
    nextStageId: 'stage-10'
  },
  {
    id: 'stage-10', chapter: 10, title: '진흙 요괴의 늪', subtitle: '발을 붙잡는 늪과 포기하고 싶은 마음',
    objective: '느려지는 늪을 건너 거대 진흙 요괴를 물리치세요.', lesson: '천천히 가도 멈추지 않으면 목적지에 닿아요.',
    backgroundKey: 'swamp', musicKey: 'stage-swamp', worldWidth: 3200,
    playerStart: { x: 120, y: 382 }, goalX: 2920, goalLabel: '마른 땅', clearMode: 'boss',
    enemies: [
      { type: 'walker', name: '진흙 요괴', x: 800, y: groundY - 40, hp: 2, damage: 1, speed: 46, patrolRange: 160, spriteKey: 'enemy-mud' },
      { type: 'jumper', name: '늪 괴물', x: 1460, y: groundY - 44, hp: 3, damage: 1, speed: 52, patrolRange: 160, spriteKey: 'enemy-swamp' },
      { type: 'flyer', name: '독안개 벌레', x: 2040, y: 255, hp: 2, damage: 1, speed: 72, patrolRange: 180, spriteKey: 'enemy-mist-bug' }
    ],
    boss: { type: 'boss', name: '거대 진흙 요괴', x: 2550, y: groundY - 86, hp: 8, maxHp: 8, damage: 1, speed: 46, patrolRange: 190, spriteKey: 'boss-mud', attackStyle: 'mud' },
    hazards: [{ type: 'mud', x: 1020, y: 421, width: 360, label: '끈적한 늪', value: 0.62 }, { type: 'mud', x: 1900, y: 421, width: 330, label: '끈적한 늪', value: 0.62 }],
    platforms: commonPlatforms, gimmicks: [{ type: 'swampSlow', label: '늪 지형', value: 0.65 }],
    startDialogue: ['천축국이 가까워졌지만 끈적한 늪이 모두의 발을 붙잡았어요.', '저팔계가 포기하려 하자 삼장법사는 잠시 쉬어 가도 괜찮다고 말했어요.', '손오공: 빠르지 않아도 돼. 발판을 따라 한 걸음씩 함께 가자!'],
    clearDialogue: ['손오공이 앞에서 길을 찾고 사오정과 저팔계가 뒤의 친구를 끌어 주었어요.', '느려도 함께 계속 걸으면 반드시 목적지에 닿는다는 걸 모두 알게 됐어요.', '늪 너머로 마침내 황금빛 천축국의 문이 보이기 시작했어요.'],
    nextStageId: 'stage-11'
  },
  {
    id: 'stage-11', chapter: 11, title: '천축국의 마음 거울', subtitle: '마지막 적은 손오공 자신의 그림자',
    objective: '마음의 조각을 지나 그림자 손오공을 이겨 내세요.', lesson: '자신의 잘못을 인정하는 마음이 가장 큰 용기예요.',
    backgroundKey: 'gold', musicKey: 'stage-gold', worldWidth: 3200,
    playerStart: { x: 120, y: 382 }, goalX: 2920, goalLabel: '천축국 문', clearMode: 'boss',
    enemies: [
      { type: 'walker', name: '고집의 조각', x: 820, y: groundY - 42, hp: 3, damage: 1, speed: 68, patrolRange: 170, spriteKey: 'enemy-pride' },
      { type: 'flyer', name: '두려움의 조각', x: 1480, y: 245, hp: 3, damage: 1, speed: 86, patrolRange: 200, spriteKey: 'enemy-fear' },
      { type: 'charger', name: '성급함의 조각', x: 2050, y: groundY - 42, hp: 3, damage: 1, speed: 96, patrolRange: 170, spriteKey: 'enemy-haste' }
    ],
    boss: { type: 'boss', name: '그림자 손오공', x: 2550, y: groundY - 78, hp: 8, maxHp: 8, damage: 1, speed: 68, patrolRange: 210, spriteKey: 'boss-shadow', attackStyle: 'shadow' },
    hazards: [{ type: 'lightning', x: 1180, y: 418, width: 130, label: '마음의 균열' }, { type: 'lightning', x: 2180, y: 418, width: 130, label: '마음의 균열' }],
    platforms: commonPlatforms, gimmicks: [],
    startDialogue: ['천축국 문 앞의 마음 거울에서 손오공과 똑같은 그림자가 걸어 나왔어요.', '그림자는 손오공이 숨기고 싶었던 고집과 성급함을 그대로 보여 주었어요.', '그림자 손오공: 네 잘못을 인정하지 못하면 이 문을 지나갈 수 없어!'],
    clearDialogue: ['손오공: 나는 실수도 하지만, 잘못을 인정하고 더 좋은 사람이 될 수 있어.', '그 말을 들은 그림자는 따뜻한 빛으로 변해 손오공의 마음으로 돌아갔어요.', '자신의 부족함까지 받아들인 손오공 앞에 천축국의 문이 활짝 열렸어요.'],
    nextStageId: 'stage-12'
  },
  {
    id: 'stage-12', chapter: 12, title: '불경과 깨달음의 귀환', subtitle: '천축국에서 받은 지혜를 고향으로',
    objective: '부처님의 말씀을 듣고 빛나는 불경을 받으세요.', lesson: '모험에서 얻은 지혜는 다른 사람과 나눌 때 완성돼요.',
    backgroundKey: 'ending', musicKey: 'stage-ending', worldWidth: 2700,
    playerStart: { x: 120, y: 382 }, goalX: 2380, goalLabel: '불경 제단', clearMode: 'item',
    enemies: [],
    npc: { name: '부처님', role: '지혜를 전하는 스승', x: 2200, y: groundY, spriteKey: 'npc-buddha', color: 0xffd85c, dialogue: ['부처님: 먼 길을 걸어오며 무엇을 배웠느냐?', '손오공: 힘보다 책임을, 혼자 이기는 것보다 함께 걷는 마음을 배웠습니다.', '부처님: 그 깨달음이 바로 너희가 찾아온 가장 귀한 불경이란다.'] },
    reward: { type: 'sutra', label: '천축국의 불경', x: 2440, y: 330 },
    hazards: [], platforms: commonPlatforms, gimmicks: [{ type: 'scriptedGoal', label: '불경 받기' }],
    startDialogue: ['오랜 여행 끝에 네 친구는 마침내 빛나는 천축국에 도착했어요.', '이곳에는 싸울 적이 없었고, 지금까지의 선택을 돌아보는 조용한 길만 있었어요.', '삼장법사: 함께 걸어온 모든 순간을 마음에 담고 부처님께 나아가자.'],
    clearDialogue: ['네 친구는 지혜의 불경을 품에 안고 처음 여행을 시작한 동쪽으로 돌아갔어요.', '손오공은 힘을 책임 있게 쓰는 법을, 친구들은 서로 믿고 기다리는 법을 전했어요.', '그 뒤로 화과산에는 용기와 우정이 가득한 새로운 이야기가 오래도록 이어졌답니다.']
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

export function getNextStageAfterCleared(lastClearedStageId: string | null): string {
  if (!lastClearedStageId) return firstStageId;
  return getStage(lastClearedStageId).nextStageId ?? firstStageId;
}
