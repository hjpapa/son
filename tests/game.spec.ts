import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';

async function openStage(page: Page, chapter = 1) {
  await page.goto(`/?stage=stage-${String(chapter).padStart(2, '0')}`);
  await page.waitForFunction(() => (window as any).__GAME__?.scene.getScene('StageScene')?.dialogue?.isOpen);
}

async function dismiss(page: Page) {
  for (let count = 0; count < 18; count++) {
    const open = await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').dialogue?.isOpen);
    if (!open) return;
    await page.waitForTimeout(190);
    await page.keyboard.press('Enter');
  }
  throw new Error('Dialogue did not finish');
}

test('level growth, preview persistence and staff appearance stay independent', async ({ page }) => {
  await openStage(page);
  await dismiss(page);
  const result = await page.evaluate(async () => {
    const { StageManager } = await import('/src/game/StageManager.ts');
    const scene = (window as any).__GAME__.scene.getScene('StageScene');
    scene.gainExperience(10);
    const level = StageManager.getLevel();
    const staffBefore = scene.player.staffUpgraded;
    const idleGlow = scene.player.staffGlow.commandBuffer.length;
    StageManager.setStaffUpgraded(true);
    scene.player.setStaffUpgraded(true);
    scene.player.setAttackRangeMultiplier(StageManager.getAttackRangeMultiplier());
    return { level, staffBefore, idleGlow, saved: localStorage.getItem('corn-wukong-level'), upgraded: StageManager.isStaffUpgraded() };
  });
  expect(result).toEqual({ level: 2, staffBefore: false, idleGlow: 0, saved: null, upgraded: true });
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').player.staffGlow.commandBuffer.length)).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').player.staffGlow.commandBuffer.length)).toBe(0);
});

test('dialogue pauses enemies, fits long Korean pages, and resumes movement', async ({ page }) => {
  await openStage(page, 2);
  const before = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    return s.enemies.getChildren().map((e: any) => [e.x, e.y]);
  });
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    return s.enemies.getChildren().map((e: any) => [e.x, e.y]);
  })).toEqual(before);
  await dismiss(page);
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    const moved = s.enemies.getChildren().map((e: any) => [e.x, e.y]);
    s.dialogue.show(['손오공: ' + '친구들과 함께 서쪽으로 걸어가요. '.repeat(30)]);
    return { moved, pages: s.dialogue.lines.length, textBottom: s.dialogue.text.y + s.dialogue.text.height, panelBottom: s.dialogue.panel.getBottomCenter().y };
  });
  expect(info.moved).not.toEqual(before);
  expect(info.pages).toBeGreaterThan(1);
  expect(info.textBottom).toBeLessThan(info.panelBottom - 20);
});

test('a held attack deals one hit per target; a new swing deals another', async ({ page }) => {
  await openStage(page, 2);
  await dismiss(page);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.storyBeatsSeen = new Set(['trail', 'encounter']);
    s.player.setPosition(400, 432);
    s.player.invulnerable = true;
    const target = s.enemies.getChildren()[1];
    target.setPosition(450, 432); target.hp = 10;
    target.updateEnemy = () => target.setVelocity(0, 0);
    s.testTarget = target;
  });
  await page.keyboard.down('Space');
  await page.waitForTimeout(550);
  await page.keyboard.up('Space');
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').testTarget.hp)).toBe(9);
  await page.waitForTimeout(50);
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').testTarget.hp)).toBe(8);
});

test('all 12 chapters: art, story beats, real boss attacks, rewards and ending', async ({ page }) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', (error) => { errors.push(error.message); console.error('Game error:', error.message); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await openStage(page);
  for (let chapter = 1; chapter <= 12; chapter++) {
    await page.waitForFunction((id) => {
      const s = (window as any).__GAME__.scene.getScene('StageScene');
      return s.scene.isActive() && s.stage.id === id && s.dialogue?.isOpen;
    }, `stage-${String(chapter).padStart(2, '0')}`, { timeout: 15000 });
    console.log('Chapter', chapter, 'loaded');
    expect(await page.evaluate(() => {
      const s = (window as any).__GAME__.scene.getScene('StageScene');
      return s.enemies.getChildren().every((enemy: any) => enemy.texture.getSourceImage().width === 192);
    })).toBe(true);
    await dismiss(page);
    await page.evaluate(() => {
      const s = (window as any).__GAME__.scene.getScene('StageScene');
      s.player.invulnerable = true;
      s.player.setPosition(s.stage.worldWidth * 0.4 + 5, 432);
    });
    await page.waitForTimeout(100);
    await dismiss(page);
    await page.evaluate(() => {
      const s = (window as any).__GAME__.scene.getScene('StageScene');
      s.storyBeatsSeen.add('trail');
      if (s.boss) s.player.setPosition(s.stage.boss.x - 300, 432);
    });
    await page.waitForTimeout(100);
    await dismiss(page);
    if ([2, 3, 6, 7, 8, 9, 10, 11].includes(chapter)) {
      // Position the player in range, then use the real attack input and collision path.
      for (let swing = 0; swing < 12; swing++) {
        if (!await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').boss.active)) break;
        await page.evaluate(() => {
          const s = (window as any).__GAME__.scene.getScene('StageScene');
          s.player.invulnerable = true;
          s.player.facing = 1;
          s.player.setPosition(s.boss.x - 65, 432);
          s.player.body.reset(s.boss.x - 65, 432);
        });
        await page.keyboard.press('Space');
        await page.waitForTimeout(400);
      }
      expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').boss.active)).toBe(false);
      await dismiss(page);
    }
    await page.screenshot({ path: `test-results/chapter-${chapter}.png` });
    await page.evaluate((chapter) => {
      const s = (window as any).__GAME__.scene.getScene('StageScene');
      s.player.invulnerable = true;
      if (chapter === 1) s.coinCount = 5;
      if (chapter === 4) s.surviveRemainingMs = 1;
      const x = s.stage.npc?.x ?? s.stage.reward?.x ?? s.stage.goalX;
      s.player.body.reset(x, 432);
    }, chapter);
    await page.waitForTimeout(150);
    await dismiss(page);
    if (chapter === 3 || chapter === 12) {
      await page.evaluate(() => {
        const s = (window as any).__GAME__.scene.getScene('StageScene');
        s.player.body.reset(s.staffItem.x, s.staffItem.y + 40);
      });
      await page.waitForTimeout(2400);
      await dismiss(page);
    }
    if (chapter < 12) {
      console.log('Exit state', await page.evaluate(() => {
        const s = (window as any).__GAME__.scene.getScene('StageScene');
        return { chapter: s.stage.chapter, cleared: s.stageCleared, dialogue: s.dialogue.isOpen, scenes: (window as any).__GAME__.scene.getScenes(true).map((s: any) => s.scene.key) };
      }));
      await page.waitForFunction(() => (window as any).__GAME__.scene.isActive('StageClearScene'), undefined, { timeout: 15000 });
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
    }
  }
  await page.waitForFunction(() => (window as any).__GAME__.scene.isActive('EndingScene'));
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.screenshot({ path: 'test-results/ending.png' });
});

test('mobile canvas is nonblank and touch release preserves another held finger', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openStage(page, 3);
  await dismiss(page);
  const result = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    const controls = s.mobileControls;
    controls.held.set(1, 'right'); controls.held.set(2, 'jump');
    controls.release({ id: 2 });
    return controls.getInput();
  });
  expect(result.right).toBe(true);
  expect(result.jump).toBe(false);
  await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').mobileControls.reset());
  const screenshot = await page.screenshot({ path: 'test-results/mobile.png' });
  const stats = await sharp(screenshot).stats();
  expect(stats.channels.slice(0, 3).some((channel) => channel.stdev > 30)).toBe(true);
});
