import { firstStageId, getNextStageAfterCleared, getStage, stages } from './data/stages';
import { safeStorage } from './storage';

const storageKey = 'corn-wukong-last-cleared-stage';
const staffUpgradeKey = 'corn-wukong-staff-upgraded';
const companionsKey = 'corn-wukong-companions';
const levelKey = 'corn-wukong-level';
const experienceKey = 'corn-wukong-experience';
const maxLevel = 10;

export type LevelProgress = {
  level: number;
  experience: number;
  required: number;
  leveledUp: boolean;
};

export class StageManager {
  private static previewProgress = new Map<string, string>();

  private static read(key: string): string | null {
    return this.isPreviewMode() && this.previewProgress.has(key)
      ? this.previewProgress.get(key)!
      : safeStorage.get(key);
  }

  private static write(key: string, value: string): void {
    if (this.isPreviewMode()) this.previewProgress.set(key, value);
    else safeStorage.set(key, value);
  }

  private static isPreviewMode(): boolean {
    return import.meta.env.DEV && new URLSearchParams(window.location.search).has('stage');
  }

  static getFirstStageId(): string {
    return firstStageId;
  }

  static getContinueStageId(): string {
    const lastCleared = this.getLastClearedStageId();
    if (!lastCleared) {
      return getNextStageAfterCleared(null);
    }
    return getStage(lastCleared).nextStageId ?? lastCleared;
  }

  static getLastClearedStageId(): string | null {
    const stageId = this.read(storageKey);
    return stageId && stages.some((stage) => stage.id === stageId) ? stageId : null;
  }

  static markStageCleared(stageId: string): void {
    const stage = getStage(stageId);
    this.write(storageKey, stageId);
    if (stage.companionUnlock) {
      const companions = new Set(this.getCompanions());
      companions.add(stage.companionUnlock);
      this.write(companionsKey, JSON.stringify([...companions]));
    }
  }

  static resetProgress(): void {
    this.previewProgress.clear();
    for (const key of [storageKey, staffUpgradeKey, companionsKey, levelKey, experienceKey]) {
      safeStorage.remove(key);
    }
  }

  static hasProgress(): boolean {
    return this.getLastClearedStageId() !== null || this.getLevel() > 1 || this.getExperience() > 0;
  }

  static isLastStage(stageId: string): boolean {
    return !getStage(stageId).nextStageId;
  }

  static setStaffUpgraded(upgraded: boolean): void {
    this.write(staffUpgradeKey, upgraded ? 'true' : 'false');
  }

  static isStaffUpgraded(): boolean {
    return this.read(staffUpgradeKey) === 'true';
  }

  static getLevel(): number {
    const level = Number.parseInt(this.read(levelKey) ?? '1', 10);
    return Math.min(maxLevel, Math.max(1, Number.isFinite(level) ? level : 1));
  }

  static getExperience(): number {
    const experience = Number.parseInt(this.read(experienceKey) ?? '0', 10);
    return Math.max(0, Number.isFinite(experience) ? experience : 0);
  }

  static getLevelProgress(): LevelProgress {
    const level = this.getLevel();
    return {
      level,
      experience: level >= maxLevel ? 0 : this.getExperience(),
      required: level >= maxLevel ? 1 : this.getRequiredExperience(level),
      leveledUp: false
    };
  }

  static addExperience(amount: number): LevelProgress {
    let level = this.getLevel();
    let experience = this.getExperience() + Math.max(0, amount);
    const previousLevel = level;

    while (level < maxLevel && experience >= this.getRequiredExperience(level)) {
      experience -= this.getRequiredExperience(level);
      level += 1;
    }

    if (level >= maxLevel) {
      experience = 0;
    }

    this.write(levelKey, String(level));
    this.write(experienceKey, String(experience));

    return {
      level,
      experience,
      required: level >= maxLevel ? 1 : this.getRequiredExperience(level),
      leveledUp: level > previousLevel
    };
  }

  static getMaxHealth(): number {
    return Math.min(10, 6 + Math.floor((this.getLevel() - 1) / 2));
  }

  static getAttackDamage(): number {
    return 1 + Math.floor((this.getLevel() - 1) / 3) + (this.isStaffUpgraded() ? 1 : 0);
  }

  static getAttackRangeMultiplier(): number {
    const levelBonus = 1 + Math.min(0.18, (this.getLevel() - 1) * 0.02);
    return (this.isStaffUpgraded() ? 1.25 : 1) * levelBonus;
  }

  static getMovementMultiplier(): number {
    return 1 + Math.min(0.12, (this.getLevel() - 1) * 0.015);
  }

  private static getRequiredExperience(level: number): number {
    return 8 + level * 2;
  }

  static getStageCount(): number {
    return stages.length;
  }

  static getCompanions(): string[] {
    const companions = new Set<string>();
    try {
      const stored = JSON.parse(this.read(companionsKey) ?? '[]');
      if (Array.isArray(stored)) {
        stored.filter((item): item is string => typeof item === 'string').forEach((item) => companions.add(item));
      }
    } catch {
      // Older saves may not have a companion list yet.
    }

    const clearedChapter = this.getClearedChapter();
    if (clearedChapter >= 5) companions.add('삼장법사');
    if (clearedChapter >= 6) companions.add('저팔계');
    if (clearedChapter >= 7) companions.add('사오정');
    return ['삼장법사', '저팔계', '사오정'].filter((name) => companions.has(name));
  }

  static getClearedChapter(): number {
    const lastCleared = this.getLastClearedStageId();
    // A save from an older build may name a stage that no longer exists.
    return lastCleared && stages.some((stage) => stage.id === lastCleared) ? getStage(lastCleared).chapter : 0;
  }
}
