import { stages } from './stages';

// 요괴 도감: every monster and boss met on the journey, in story order.
export type BestiaryEntry = { key: string; name: string; chapter: number; boss: boolean; note: string };

const notes: Record<string, string> = {
  'enemy-crow': '반짝이는 옥수수를 몰래 물어 가요.',
  'enemy-worm': '옥수숫대를 갉아 먹는 꿈틀이예요.',
  'enemy-grasshopper': '폴짝폴짝 높이 뛰어올라요.',
  'enemy-bat': '어두운 동굴을 휙휙 날아다녀요.',
  'enemy-stone': '단단해서 여러 번 때려야 해요.',
  'enemy-horn': '뿔을 앞세우고 돌진해요.',
  'boss-honse': '화과산의 보물을 빼앗은 첫 마왕이에요.',
  'enemy-bubble': '통통 튀는 바다 물방울이에요.',
  'enemy-crab': '집게를 들고 빠르게 달려와요.',
  'enemy-seahorse': '용궁 앞을 둥실둥실 지켜요.',
  'boss-gatekeeper': '여의봉을 지키는 용궁의 문지기예요.',
  'enemy-cloud': '구름을 타고 다니는 천궁 병사예요.',
  'enemy-thunderbird': '날개에서 찌릿찌릿 번개가 나요.',
  'enemy-heaven-spear': '긴 창을 들고 달려오는 하늘 병사예요.',
  'boss-erlang': '눈이 셋 달린 하늘나라의 장수예요.',
  'enemy-rock': '오행산을 지키는 무거운 바위예요.',
  'enemy-mountain-wind': '산꼭대기에서 부는 장난꾸러기 바람이에요.',
  'enemy-stone-monkey': '손오공처럼 돌에서 태어난 원숭이예요.',
  'enemy-pig': '맛있는 냄새를 따라다녀요.',
  'enemy-pumpkin': '밭에서 데굴데굴 굴러와요.',
  'enemy-bull': '화가 나면 앞만 보고 달려요.',
  'boss-bajie': '배고프고 외로웠던, 마음 착한 돼지예요.',
  'enemy-fish': '강물 위로 펄쩍 뛰어올라요.',
  'enemy-whirlpool': '빙글빙글 물살을 만들어요.',
  'enemy-frog': '개굴개굴, 폴짝 뛰어요.',
  'boss-sandy': '유사하를 홀로 지키던 강의 장수예요.',
  'enemy-sand': '눈에 모래를 뿌리는 장난꾸러기예요.',
  'enemy-tornado': '휘이잉 돌면서 날아다녀요.',
  'enemy-dust-wolf': '누런 바람을 타고 달려요.',
  'boss-yellowwind': '누런 바람으로 스승님을 데려갔어요.',
  'enemy-tiger': '숲속에서 갑자기 튀어나와요.',
  'enemy-tree': '걸어 다니는 아주 튼튼한 나무예요.',
  'enemy-moth': '어둠 속을 팔랑팔랑 날아요.',
  'boss-tiger': '발톱이 빠른 호랑이 장수예요.',
  'enemy-mud': '질척질척 발을 붙잡아요.',
  'enemy-swamp': '늪에서 쑥 솟아올라요.',
  'enemy-mist-bug': '뿌연 안개를 뿜으며 날아요.',
  'boss-mud': '늪을 다스리는 커다란 진흙이에요.',
  'enemy-pride': '"내 말이 맞아!"만 외쳐요.',
  'enemy-fear': '마음을 콩닥콩닥 떨게 해요.',
  'enemy-haste': '기다리지 못하고 서둘러요.',
  'boss-shadow': '마음 거울에서 나온 또 하나의 나예요.'
};

export const bestiary: BestiaryEntry[] = stages.flatMap((stage) => [
  ...stage.enemies.map((enemy) => ({ key: enemy.spriteKey, name: enemy.name, chapter: stage.chapter, boss: false, note: notes[enemy.spriteKey] ?? '' })),
  ...(stage.boss ? [{ key: stage.boss.spriteKey, name: stage.boss.name, chapter: stage.chapter, boss: true, note: notes[stage.boss.spriteKey] ?? '' }] : [])
]);

export function bestiaryEntry(key: string): BestiaryEntry | undefined {
  return bestiary.find((entry) => entry.key === key);
}
