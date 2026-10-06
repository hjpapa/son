// Character art for each companion who can join the journey.
export const companionTextures: Record<string, string> = {
  '삼장법사': 'companion-samjang',
  '저팔계': 'companion-bajie',
  '사오정': 'companion-sandy'
};

// Each friend keeps the same number key even when another friend is absent.
export const companionSkills: Record<string, { key: string; number: number; label: string; description: string; cooldown: number; color: number }> = {
  '삼장법사': { key: 'ONE', number: 1, label: '회복·보호', description: '하트 +2 · 6초 안에 공격 한 번 보호', cooldown: 18000, color: 0xffd66c },
  '저팔계': { key: 'TWO', number: 2, label: '갈퀴 돌진', description: '앞쪽 적들을 돌진 공격 · 보스 피해 1', cooldown: 9000, color: 0xffac73 },
  '사오정': { key: 'THREE', number: 3, label: '수호 물결', description: '물결 공격 · 5초간 물·늪·바람 보호', cooldown: 12000, color: 0x7cdbff }
};
