import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';

async function openStage(page: Page, chapter = 1) {
  await page.goto(`/?stage=stage-${String(chapter).padStart(2, '0')}`);
  await page.waitForFunction(() => (window as any).__GAME__?.scene.getScene('StageScene')?.dialogue?.isOpen);
}

// Each page needs one press to finish typing and one to move on.
async function dismiss(page: Page) {
  for (let count = 0; count < 80; count++) {
    const open = await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').dialogue?.isOpen);
    if (!open) return;
    await page.waitForTimeout(140);
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

test('chapter opens with a title card, and dialogue pauses enemies and fits long pages', async ({ page }) => {
  await page.goto('/?stage=stage-02');
  await page.waitForFunction(() => (window as any).__GAME__?.scene.getScene('StageScene')?.dialogue);
  // The storybook title card shows first, with the world paused.
  expect(await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    return { dialogue: s.dialogue.isOpen, paused: s.physics.world.isPaused, locked: s.inputLocked };
  })).toEqual({ dialogue: false, paused: true, locked: true });
  await page.waitForFunction(() => (window as any).__GAME__.scene.getScene('StageScene').dialogue.isOpen);

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
    s.dialogue.completeTyping();
    return { moved, pages: s.dialogue.lines.length, textBottom: s.dialogue.text.y + s.dialogue.text.height, panelBottom: s.dialogue.panelBottom };
  });
  expect(info.moved).not.toEqual(before);
  expect(info.pages).toBeGreaterThan(1);
  expect(info.textBottom).toBeLessThan(info.panelBottom - 20);
});

test('dialogue types each page, and quick taps cannot skip a page unread', async ({ page }) => {
  await openStage(page, 1);
  const state = () => page.evaluate(() => {
    const d = (window as any).__GAME__.scene.getScene('StageScene').dialogue;
    return { index: d.index, typing: Boolean(d.typing), shown: d.text.text.length, full: d.fullText.length };
  });
  // Right after opening, taps are ignored briefly (children mash buttons).
  const first = await state();
  expect(first.index).toBe(0);
  expect(first.shown).toBeLessThan(first.full);

  await page.waitForTimeout(500);
  // Two taps in the same instant: the first finishes typing, the second is
  // ignored, so a child mashing a button still sees the whole page.
  const mashed = await page.evaluate(() => {
    const d = (window as any).__GAME__.scene.getScene('StageScene').dialogue;
    d.advance();
    const afterFirst = { index: d.index, typing: Boolean(d.typing), shown: d.text.text.length, full: d.fullText.length };
    d.advance();
    return { afterFirst, afterSecond: d.index };
  });
  expect(mashed.afterFirst.index).toBe(0);
  expect(mashed.afterFirst.typing).toBe(false);
  expect(mashed.afterFirst.shown).toBe(mashed.afterFirst.full);
  expect(mashed.afterSecond).toBe(0);

  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  expect((await state()).index).toBe(1);
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

test('a jump pressed just before landing still happens (jump buffer)', async ({ page }) => {
  await openStage(page, 1);
  await dismiss(page);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.player.body.reset(300, 300); // in the air, falling onto the ground
  });
  await page.waitForFunction(() => {
    const body = (window as any).__GAME__.scene.getScene('StageScene').player.body;
    return body.bottom > 405 && body.velocity.y > 0;
  });
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(60);
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').player.y)).toBeLessThan(400);
});

test('after the last talisman, the chapter restarts at the checkpoint without repeating the story', async ({ page }) => {
  await openStage(page, 2);
  await dismiss(page);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.player.setPosition(s.stage.worldWidth * 0.4 + 10, 432);
  });
  await page.waitForFunction(() => (window as any).__GAME__.scene.getScene('StageScene').dialogue.isOpen);
  await dismiss(page);
  const checkpoint = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.revivesRemaining = 0;
    s.player.currentHealth = 1;
    s.player.invulnerable = false;
    s.player.takeDamage(1);
    s.handlePlayerDamaged();
    return s.checkpointX;
  });
  expect(checkpoint).toBeGreaterThan(1000);
  await page.waitForFunction(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    return s.retry && s.player?.active && !s.inputLocked;
  }, undefined, { timeout: 8000 });
  const restarted = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    return { x: Math.round(s.player.x), dialogue: s.dialogue.isOpen, seen: [...s.storyBeatsSeen], talismans: s.revivesRemaining };
  });
  expect(restarted.x).toBe(Math.round(checkpoint));
  expect(restarted.dialogue).toBe(false);
  expect(restarted.seen).toContain('trail');
  expect(restarted.talismans).toBe(2);
});

test('Escape opens the pause menu and freezes the chapter; Enter resumes', async ({ page }) => {
  await openStage(page, 3);
  await dismiss(page);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => (window as any).__GAME__.scene.isActive('PauseScene'));
  expect(await page.evaluate(() => (window as any).__GAME__.scene.isPaused('StageScene'))).toBe(true);
  const frozen = await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').enemies.getChildren().map((e: any) => e.x));
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').enemies.getChildren().map((e: any) => e.x))).toEqual(frozen);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).__GAME__.scene.isActive('StageScene') && !(window as any).__GAME__.scene.isActive('PauseScene'));
});

test('all 12 chapters: art, story beats, real boss attacks, rewards and ending', async ({ page }) => {
  test.setTimeout(300000);
  const errors: string[] = [];
  page.on('pageerror', (error) => { errors.push(error.message); console.error('Game error:', error.message); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await openStage(page);
  for (let chapter = 1; chapter <= 12; chapter++) {
    await page.waitForFunction((id) => {
      const s = (window as any).__GAME__.scene.getScene('StageScene');
      return s.scene.isActive() && s.stage.id === id && s.dialogue?.isOpen;
    }, `stage-${String(chapter).padStart(2, '0')}`, { timeout: 15000 });
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
      await page.waitForFunction(() => (window as any).__GAME__.scene.isActive('StageClearScene'), undefined, { timeout: 15000 });
      // The clear screen ignores input briefly so a leftover tap cannot skip it.
      await page.waitForTimeout(800);
      await page.keyboard.press('Enter');
    }
  }
  await page.waitForFunction(() => (window as any).__GAME__.scene.isActive('EndingScene'));
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.screenshot({ path: 'test-results/ending.png' });
});

test('Enter on the title continues a saved journey instead of erasing it; 새 여행 asks first', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('corn-wukong-last-cleared-stage', 'stage-03');
    localStorage.setItem('corn-wukong-level', '4');
  });
  await page.reload();
  await page.waitForFunction(() => (window as any).__GAME__?.scene.isActive('TitleScene'));
  await page.waitForTimeout(300);
  const title = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('TitleScene');
    scene.askNewJourney();
    return Boolean(scene.confirmLayer);
  });
  expect(title).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('corn-wukong-last-cleared-stage'))).toBe('stage-03');
  await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('TitleScene');
    scene.confirmLayer.destroy(true);
    scene.confirmLayer = undefined;
  });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).__GAME__.scene.getScene('StageScene')?.stage?.id === 'stage-04');
  expect(await page.evaluate(() => localStorage.getItem('corn-wukong-level'))).toBe('4');
  await page.evaluate(() => localStorage.clear());
});

test('web app: manifest, icons and offline worker are served', async ({ page, request }) => {
  await page.goto('/');
  const manifestHref = await page.getAttribute('link[rel="manifest"]', 'href');
  const manifest = await (await request.get(manifestHref!)).json();
  expect(manifest.display).toBe('fullscreen');
  expect(manifest.orientation).toBe('landscape');
  for (const icon of manifest.icons) {
    expect((await request.get(icon.src)).status()).toBe(200);
  }
  expect((await request.get('/sw.js')).status()).toBe(200);
  expect(await page.getAttribute('meta[name="viewport"]', 'content')).toContain('viewport-fit=cover');
});

test.describe('phone', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('canvas is nonblank, touch buttons show, and a thumb can slide between buttons', async ({ page }) => {
    await openStage(page, 3);
    await dismiss(page);
    const result = await page.evaluate(() => {
      const s = (window as any).__GAME__.scene.getScene('StageScene');
      const controls = s.mobileControls;
      const visible = controls.buttons.every((button: any) => button.graphics.visible);
      // Two fingers; lifting one keeps the other held.
      controls.held.set(1, 'right'); controls.held.set(2, 'jump');
      controls.release({ id: 2 });
      const twoFingers = controls.getInput();
      controls.reset();
      // One thumb slides from ← to →.
      const left = controls.buttons.find((b: any) => b.control === 'left');
      const right = controls.buttons.find((b: any) => b.control === 'right');
      controls.track({ id: 3, x: left.x, y: left.y, isDown: true, wasTouch: true });
      const onLeft = controls.getInput();
      controls.track({ id: 3, x: right.x, y: right.y, isDown: true, wasTouch: true });
      const onRight = controls.getInput();
      controls.reset();
      return { visible, twoFingers, onLeft, onRight };
    });
    expect(result.visible).toBe(true);
    expect(result.twoFingers.right).toBe(true);
    expect(result.twoFingers.jump).toBe(false);
    expect(result.onLeft.left).toBe(true);
    expect(result.onRight).toMatchObject({ left: false, right: true });

    const screenshot = await page.screenshot({ path: 'test-results/mobile.png' });
    const stats = await sharp(screenshot).stats();
    expect(stats.channels.slice(0, 3).some((channel) => channel.stdev > 30)).toBe(true);
  });

  test('holding the attack button keeps swinging', async ({ page }) => {
    await openStage(page, 2);
    await dismiss(page);
    const swings = await page.evaluate(async () => {
      const s = (window as any).__GAME__.scene.getScene('StageScene');
      const attack = s.mobileControls.buttons.find((b: any) => b.control === 'attack');
      const start = s.player.attackId;
      s.mobileControls.track({ id: 5, x: attack.x, y: attack.y, isDown: true, wasTouch: true });
      await new Promise((resolve) => setTimeout(resolve, 1400));
      s.mobileControls.release({ id: 5 });
      return s.player.attackId - start;
    });
    expect(swings).toBeGreaterThanOrEqual(3);
  });

  test('holding the phone upright shows the rotate hint and pauses the game', async ({ page }) => {
    await openStage(page, 2);
    await dismiss(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('#rotate-hint')).toBeVisible();
    expect(await page.evaluate(() => (window as any).__GAME__.isPaused)).toBe(true);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('#rotate-hint')).toBeHidden();
    await page.waitForFunction(() => (window as any).__GAME__.scene.isActive('PauseScene'));
    expect(await page.evaluate(() => (window as any).__GAME__.isPaused)).toBe(false);
  });
});
