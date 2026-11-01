import { test, expect } from '@playwright/test';

test('release: failed storage writes and removals stay consistent for this session', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { safeStorage } = await import('/src/game/storage.ts');
    localStorage.setItem('release-save', 'old');
    const set = Storage.prototype.setItem;
    const remove = Storage.prototype.removeItem;
    try {
      Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
      safeStorage.set('release-save', 'new');
      safeStorage.set('release-new', 'first');
      const updated = safeStorage.get('release-save');
      const created = safeStorage.get('release-new');
      Storage.prototype.removeItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
      safeStorage.remove('release-save');
      const removed = safeStorage.get('release-save');
      Storage.prototype.setItem = set;
      safeStorage.set('release-save', 'persisted');
      return { updated, created, removed, recovered: safeStorage.get('release-save') };
    } finally {
      Storage.prototype.setItem = set;
      Storage.prototype.removeItem = remove;
      localStorage.clear();
    }
  });
  expect(result).toEqual({ updated: 'new', created: 'first', removed: null, recovered: 'persisted' });
});

test('release: a new preview journey keeps real saves and its monster book', async ({ page }) => {
  await page.goto('/?stage=stage-01');
  const result = await page.evaluate(async () => {
    const { StageManager } = await import('/src/game/StageManager.ts');
    localStorage.setItem('corn-wukong-last-cleared-stage', 'stage-07');
    localStorage.setItem('corn-wukong-level', '6');
    localStorage.setItem('corn-wukong-staff-upgraded', 'true');
    StageManager.recordDiscovery('enemy-crow');
    StageManager.resetProgress();
    return {
      realChapter: localStorage.getItem('corn-wukong-last-cleared-stage'),
      realLevel: localStorage.getItem('corn-wukong-level'),
      chapter: StageManager.getClearedChapter(), level: StageManager.getLevel(),
      staff: StageManager.isStaffUpgraded(), companions: StageManager.getCompanions(),
      discovered: StageManager.getDiscovered().has('enemy-crow')
    };
  });
  expect(result).toEqual({ realChapter: 'stage-07', realLevel: '6', chapter: 0, level: 1,
    staff: false, companions: [], discovered: true });
});

test('release: toggling music keeps the pause volume and battle accompaniment', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__GAME__?.scene.isActive('TitleScene'));
  await page.keyboard.press('Shift');
  const result = await page.evaluate(async () => {
    const { Music } = await import('/src/audio/Music.ts');
    const { Settings } = await import('/src/game/Settings.ts');
    Music.play('stage-cave');
    Music.setBattle(true);
    Music.duck(true);
    Settings.music = false;
    Music.refresh();
    Settings.music = true;
    Music.refresh();
    return Music.state;
  });
  expect(result).toMatchObject({ key: 'stage-cave', ducked: true, battle: true });
});

test('release: Enter still continues after cancelling the new journey prompt', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('corn-wukong-last-cleared-stage', 'stage-03'));
  await page.reload();
  await page.waitForFunction(() => (window as any).__GAME__?.scene.isActive('TitleScene'));
  await page.evaluate(() => (window as any).__GAME__.scene.getScene('TitleScene').askNewJourney());
  await page.keyboard.press('Enter');
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('TitleScene');
    s.confirmLayer.destroy(true);
    s.confirmLayer = undefined;
  });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).__GAME__.scene.getScene('StageScene')?.stage?.id === 'stage-04');
});
