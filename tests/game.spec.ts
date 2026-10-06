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

async function openPartyStage(page: Page, chapter = 10) {
  await openStage(page, chapter);
  await page.evaluate(async (chapter) => {
    const { StageManager } = await import('/src/game/StageManager.ts');
    StageManager.markStageCleared('stage-07');
    (window as any).__GAME__.scene.getScene('StageScene').scene.restart({ stageId: `stage-${String(chapter).padStart(2, '0')}` });
  }, chapter);
  await page.waitForFunction(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    return s.companions.length === 3 && s.dialogue?.isOpen;
  });
  await dismiss(page);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.storyBeatsSeen = new Set(['trail', 'encounter']);
    s.player.body.reset(300, 432);
  });
}

test('companion skills: Samjang heals, blocks one hit and freezes recharge during dialogue', async ({ page }) => {
  await openPartyStage(page);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.player.currentHealth = 2;
  });
  await page.keyboard.press('1');
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').player.health)).toBe(4);
  const guarded = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    const blocked = s.player.takeDamage(1);
    const contactAgain = s.player.takeDamage(1);
    return { blocked, contactAgain, health: s.player.health, shield: s.player.hasCompanionShield, repeat: s.companionAbilities.activate('삼장법사') };
  });
  expect(guarded).toEqual({ blocked: false, contactAgain: false, health: 4, shield: false, repeat: false });
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').player.takeDamage(1))).toBe(true);
  const frozen = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.dialogue.show(['삼장법사: 잠깐 이야기를 나누자.']);
    return s.companionAbilities.state.cooldowns['삼장법사'];
  });
  await page.keyboard.press('3');
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    return { cooldown: s.companionAbilities.state.cooldowns['삼장법사'], tide: s.companionAbilities.waterGuard };
  })).toEqual({ cooldown: frozen, tide: false });
  await dismiss(page);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').companionAbilities.state.cooldowns['삼장법사'])).toBeLessThan(frozen);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => (window as any).__GAME__.scene.isActive('PauseScene'));
  const pauseCooldown = await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').companionAbilities.state.cooldowns['삼장법사']);
  await page.keyboard.press('3');
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').companionAbilities.state.cooldowns['삼장법사'])).toBe(pauseCooldown);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').companionAbilities.waterGuard)).toBe(false);
});

test('companion skills: Bajie sweeps forward once per enemy, faces left and can unlock a boss exit', async ({ page }) => {
  await openPartyStage(page);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.player.invulnerable = true;
    s.targets = s.enemies.getChildren().filter((e: any) => e !== s.boss).slice(0, 2);
    s.targets.forEach((e: any, i: number) => { e.body.reset(420 + i * 150, 432); e.hp = 10; e.updateEnemy = () => e.setVelocity(0, 0); });
    s.boss.body.reset(660, 432); s.boss.hp = 3; s.boss.updateEnemy = () => s.boss.setVelocity(0, 0);
  });
  await page.keyboard.press('2');
  await page.waitForTimeout(850);
  expect(await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    return { hp: s.targets.map((e: any) => e.hp), bossHp: s.boss.hp, casting: s.companionAbilities.isCasting('저팔계') };
  })).toEqual({ hp: [8, 8], bossHp: 2, casting: false });
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.player.body.reset(900, 432); s.player.setFlipX(true);
    s.companionAbilities.state.cooldowns['저팔계'] = 0;
    s.companionAbilities.activate('저팔계');
    s.boss.hp = 1;
  });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').boss.active)).toBe(false);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').bossExitUnlocked)).toBe(true);
});

test('companion skills: Sandy water wave, touch activation, terrain protection and retry recharge', async ({ page }) => {
  await openPartyStage(page);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.target = s.enemies.getChildren()[0]; s.target.body.reset(460, 432); s.target.hp = 10;
    s.target.updateEnemy = () => s.target.setVelocity(0, 0);
  });
  const point = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const rect = canvas.getBoundingClientRect();
    const game = (window as any).__GAME__;
    return { x: rect.x + 236 * rect.width / game.scale.width, y: rect.y + 134 * rect.height / game.scale.height };
  });
  await page.mouse.click(point.x, point.y);
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').companionAbilities.waterGuard)).toBe(true);
  await page.screenshot({ path: 'output/playwright/companion-skills.png' });
  await page.waitForTimeout(850);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').target.hp)).toBe(9);
  expect(await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    const hazard = s.stage.hazards.find((h: any) => h.type === 'mud');
    s.player.body.reset(hazard.x, 432);
    s.player.body.updateFromGameObject();
    s.applyGimmicks(16);
    s.player.invulnerable = false;
    const health = s.player.health;
    s.handleHazardHit({ type: 'water', x: hazard.x, width: 100, label: '테스트 물' });
    return { speed: s.player.movementMultiplier, health, after: s.player.health };
  })).toEqual({ speed: 1, health: 6, after: 6 });
  const saved = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.companionAbilities.state.tideMs = 0;
    s.player.body.reset(s.stage.hazards.find((h: any) => h.type === 'mud').x, 432);
    s.player.body.updateFromGameObject();
    s.applyGimmicks(16);
    const speed = s.player.movementMultiplier;
    const cooldown = s.companionAbilities.state.cooldowns['사오정'];
    s.scene.restart({ stageId: s.stage.id, retry: { checkpointX: 300, seenBeats: ['trail', 'encounter'], collectedCoins: [], skills: s.companionAbilities.state } });
    const zone = s.hazardZones.find((h: any) => h.data.type === 'mud').zone;
    return { speed, cooldown, debug: { player: { x: s.player.body.x, y: s.player.body.y, w: s.player.body.width, h: s.player.body.height }, zone: zone.getBounds(), tide: s.companionAbilities.state.tideMs } };
  });
  expect(saved.speed, JSON.stringify(saved.debug)).toBeLessThan(1);
  await page.waitForFunction(() => (window as any).__GAME__.scene.getScene('StageScene').retry);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').companionAbilities.state.cooldowns['사오정'])).toBeGreaterThan(saved.cooldown - 1000);
  await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').scene.restart({ stageId: 'stage-08' }));
  await page.waitForFunction(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    return s.stage.chapter === 8 && s.dialogue?.isOpen;
  });
  await dismiss(page);
  expect(await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    const zone = s.hazardZones.find((h: any) => h.data.type === 'wind').zone;
    s.player.body.reset(zone.x, zone.y);
    s.player.body.updateFromGameObject();
    s.player.setVelocityX(200);
    s.windTimer = 3000;
    s.companionAbilities.activate('사오정');
    s.applyGimmicks(16);
    const guarded = s.player.body.velocity.x;
    s.companionAbilities.state.tideMs = 0;
    s.windTimer = 3000;
    s.applyGimmicks(16);
    return { guarded, unguarded: s.player.body.velocity.x };
  })).toEqual({ guarded: 200, unguarded: 105 });
  // Replaying before they joined does not expose skills early.
  await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').scene.restart({ stageId: 'stage-05' }));
  await page.waitForFunction(() => (window as any).__GAME__.scene.getScene('StageScene').stage.chapter === 5);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').companionAbilities.activate('삼장법사'))).toBe(false);
});

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
  // The impact arc lasts ~160 ms, shorter than poll gaps: record it every frame.
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    (window as any).__glowSeen = 0;
    const watch = () => { (window as any).__glowSeen = Math.max((window as any).__glowSeen, s.player.staffGlow.commandBuffer.length); };
    s.events.on('postupdate', watch);
    s.events.once('shutdown', () => s.events.off('postupdate', watch));
  });
  await page.keyboard.down('Space');
  await page.waitForTimeout(60);
  await page.keyboard.up('Space');
  await expect.poll(() => page.evaluate(() => (window as any).__glowSeen)).toBeGreaterThan(0);
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
      s.player.body.reset(s.stage.worldWidth * 0.4 + 5, 300);
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
    if ([2, 9].includes(chapter)) {
      // The chapter exit is locked until the new branching maze is solved.
      for (const index of [0, 1, 2]) {
        await page.evaluate(index => {
          const s = (window as any).__GAME__.scene.getScene('StageScene');
          const seal = s.arcade.seals[index];
          s.player.body.reset(seal.x, seal.y + 35);
        }, index);
        await page.waitForTimeout(180);
      }
      expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').arcade.exitReady)).toBe(true);
    }
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
      const visible = controls.buttons.every((button: any) => button.image.visible);
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

test('background music: every chapter has a song, bars line up, and levels stay gentle', async ({ page }) => {
  await page.goto('/?stage=stage-01');
  await page.waitForFunction(() => (window as any).__GAME__?.scene.getScene('StageScene')?.dialogue);
  const report = await page.evaluate(async () => {
    const { songs } = await import('/src/audio/songs.ts');
    const { prepareSong, playStep } = await import('/src/audio/Music.ts');
    const { MUSIC_VOLUME } = await import('/src/audio/engine.ts');
    const { stages } = await import('/src/game/data/stages.ts');
    const missing = stages.filter((stage: any) => !songs[stage.musicKey]).map((stage: any) => stage.id);
    const results: Record<string, { peak: number; rms: number; bars: boolean }> = {};
    for (const key of Object.keys(songs)) {
      const song = prepareSong(songs[key]);
      const rate = 22050;
      const ctx = new OfflineAudioContext(1, rate * 10, rate);
      const bus = ctx.createGain();
      bus.gain.value = MUSIC_VOLUME;
      bus.connect(ctx.destination);
      for (let step = 0, time = 0.05; time < 9; step += 1, time += song.stepSeconds) playStep(ctx, bus, song, step, time, true);
      const data = (await ctx.startRendering()).getChannelData(0);
      let peak = 0;
      let sum = 0;
      for (const sample of data) {
        peak = Math.max(peak, Math.abs(sample));
        sum += sample * sample;
      }
      const bars = [...song.layers, ...song.battle].every((layer: any) => layer.events.length % 8 === 0);
      results[key] = { peak: Math.round(peak * 1000) / 1000, rms: Math.round(Math.sqrt(sum / data.length) * 1000) / 1000, bars };
    }
    return { missing, results };
  });
  expect(report.missing).toEqual([]);
  for (const [key, result] of Object.entries(report.results)) {
    expect(result.bars, `${key} bar length`).toBe(true);
    // Leaves headroom for sound effects on top, but is still clearly audible.
    expect(result.peak, `${key} peak`).toBeLessThan(0.45);
    expect(result.rms, `${key} loudness`).toBeGreaterThan(0.01);
  }
});

test('music follows the story: chapter song, boss drums, quieter pause, clear screen, on/off', async ({ page }) => {
  const music = () => page.evaluate(async () => (await import('/src/audio/Music.ts')).Music.state);
  await openStage(page, 2);
  await dismiss(page); // the key presses also count as the tap browsers need before playing audio
  expect((await music()).key).toBe('stage-cave');
  expect(await page.evaluate(async () => (await import('/src/audio/engine.ts')).getAudio()?.ctx.state)).toBe('running');
  const before = (await music()).scheduledNotes;
  await page.waitForTimeout(800);
  expect((await music()).scheduledNotes).toBeGreaterThan(before);
  expect((await music()).battle).toBe(false);

  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.storyBeatsSeen = new Set(['trail', 'encounter']);
    s.player.invulnerable = true;
    s.player.body.reset(s.boss.x - 300, 432);
  });
  await expect.poll(async () => (await music()).battle).toBe(true);

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => (window as any).__GAME__.scene.isActive('PauseScene'));
  expect((await music()).ducked).toBe(true);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await music()).ducked).toBe(false);

  await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').completeStage());
  await dismiss(page);
  await page.waitForFunction(() => (window as any).__GAME__.scene.isActive('StageClearScene'));
  expect(await music()).toMatchObject({ key: 'journey', battle: false });

  const toggled = await page.evaluate(async () => {
    const { Music } = await import('/src/audio/Music.ts');
    const { Settings } = await import('/src/game/Settings.ts');
    Settings.music = false;
    Music.refresh();
    const off = Music.state.key;
    Settings.music = true;
    Music.refresh();
    return { off, on: Music.state.key };
  });
  expect(toggled).toEqual({ off: undefined, on: 'journey' });
});

test('terrain: every chapter has its own reachable steps and ledges, and boss arenas stay open', async ({ page }) => {
  await page.goto('/?stage=stage-01');
  await page.waitForFunction(() => (window as any).__GAME__?.scene.getScene('StageScene')?.dialogue);
  const problems = await page.evaluate(async () => {
    const { stages, coinSpots } = await import('/src/game/data/stages.ts');
    const issues: string[] = [];
    const layouts = new Set<string>();
    for (const stage of stages as any[]) {
      layouts.add(JSON.stringify(stage.platforms));
      for (const p of stage.platforms) {
        const top = p.y - (p.height ?? 26) / 2;
        const bottom = p.y + (p.height ?? 26) / 2;
        // Chapter 1 has one jump; later chapters can use the learned cloud
        // jump to gain another ~120px. The @slow test checks actual routes.
        const maxRise = stage.chapter >= 2 ? 260 : 140;
        if (432 - top > maxRise) issues.push(`${stage.id}: ledge at ${p.x} exceeds this chapter's jump abilities`);
        if (bottom > 335 && p.y < 340) issues.push(`${stage.id}: platform at ${p.x} is neither a step nor a ledge`);
        const step = p.y >= 340;
        // In the chase chapter the boss follows everywhere; it never teleports into steps.
        const arenaStart = stage.boss && stage.clearMode !== 'survive' ? stage.boss.x - 450 : Infinity;
        if (step && p.x + p.width / 2 > arenaStart && p.x - p.width / 2 < stage.goalX + 100) issues.push(`${stage.id}: step at ${p.x} blocks the boss arena`);
        const spot = stage.npc?.x ?? stage.reward?.x;
        if (step && spot !== undefined && Math.abs(p.x - spot) < p.width / 2 + 160) issues.push(`${stage.id}: step at ${p.x} crowds the goal`);
      }
      if (coinSpots(stage).length < 8) issues.push(`${stage.id}: too few coins`);
    }
    if (layouts.size !== stages.length) issues.push('some chapters share the same terrain');
    return issues;
  });
  expect(problems).toEqual([]);
});

test('근두운: from chapter 2 a second jump works in mid-air, but not in chapter 1', async ({ page }) => {
  const airJump = async (chapter: number) => {
    await openStage(page, chapter);
    await dismiss(page);
    await page.evaluate(() => {
      const s = (window as any).__GAME__.scene.getScene('StageScene');
      s.player.invulnerable = true;
      s.player.body.reset(300, 250); // in the air, well above the ground
    });
    await page.waitForTimeout(60);
    // Track the highest point reached after pressing jump in mid-air.
    await page.evaluate(() => {
      const s = (window as any).__GAME__.scene.getScene('StageScene');
      s.testStartY = s.player.y;
      s.testTopY = s.player.y;
      s.events.on('postupdate', () => { s.testTopY = Math.min(s.testTopY, s.player.y); });
    });
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(60);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(300);
    return page.evaluate(() => {
      const s = (window as any).__GAME__.scene.getScene('StageScene');
      return { rising: s.testTopY < s.testStartY - 30, used: s.player.cloudJumpUsed };
    });
  };
  expect(await airJump(2)).toEqual({ rising: true, used: true });
  expect(await airJump(1)).toEqual({ rising: false, used: false });
});

test('chapter 1 teaches the controls with tips as the hero walks', async ({ page }) => {
  await openStage(page, 1);
  await dismiss(page);
  expect(await page.evaluate(() => [...(window as any).__GAME__.scene.getScene('StageScene').tipsShown])).toEqual(['move']);
  await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').player.body.reset(420, 432));
  await expect.poll(() => page.evaluate(() => [...(window as any).__GAME__.scene.getScene('StageScene').tipsShown])).toEqual(['move', 'jump']);
});

test('stars: all corn coins earn three stars, and replaying an earlier chapter keeps progress', async ({ page }) => {
  await openStage(page, 2);
  await dismiss(page);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.coinCount = s.totalCoins;
    s.completeStage();
  });
  await dismiss(page);
  await page.waitForFunction(() => (window as any).__GAME__.scene.isActive('StageClearScene'));
  const result = await page.evaluate(async () => {
    const { StageManager } = await import('/src/game/StageManager.ts');
    const clear = (window as any).__GAME__.scene.getScene('StageClearScene');
    const best = StageManager.getStars('stage-02');
    StageManager.markStageCleared('stage-01'); // replaying chapter 1 after chapter 2
    return { shown: clear.result.stars, best, cleared: StageManager.getClearedChapter() };
  });
  expect(result).toEqual({ shown: 3, best: 3, cleared: 2 });
});

test('chapter select unlocks chapters reached so far and starts the chosen one', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('corn-wukong-last-cleared-stage', 'stage-03');
    localStorage.setItem('corn-wukong-stars', JSON.stringify({ 'stage-01': 3, 'stage-02': 1 }));
  });
  await page.reload();
  await page.waitForFunction(() => (window as any).__GAME__?.scene.isActive('TitleScene'));
  await page.evaluate(() => (window as any).__GAME__.scene.getScene('TitleScene').scene.start('ChapterSelectScene'));
  await page.waitForFunction(() => (window as any).__GAME__.scene.isActive('ChapterSelectScene'));
  const unlocked = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('ChapterSelectScene');
    return [...scene.cards.entries()].filter(([, card]: any) => card.input?.enabled).map(([id]: any) => id);
  });
  expect(unlocked).toEqual(['stage-01', 'stage-02', 'stage-03', 'stage-04']);
  await page.evaluate(() => (window as any).__GAME__.scene.getScene('ChapterSelectScene').cards.get('stage-02').emit('pointerup'));
  await page.waitForFunction(() => (window as any).__GAME__.scene.getScene('StageScene')?.stage?.id === 'stage-02');
  await page.evaluate(() => localStorage.clear());
});

test.describe('long phone', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('the game widens to fill a long phone screen instead of showing side bars', async ({ page }) => {
    await openStage(page, 2);
    const size = await page.evaluate(() => {
      const game = (window as any).__GAME__;
      return { width: game.scale.gameSize.width, canvas: game.canvas.getBoundingClientRect().width };
    });
    expect(size.width).toBeGreaterThan(1100);
    expect(size.canvas).toBeGreaterThan(830);
  });
});

// Real physics and input only: hold right, jump when blocked or an enemy is
// close, keep swinging. Checks the terrain never traps a player.
test('terrain: a walk-and-jump bot solves every chapter route without teleporting @slow', async ({ page }) => {
  test.setTimeout(480000);
  for (let chapter = 1; chapter <= 12; chapter++) {
    await openStage(page, chapter);
    await dismiss(page);
    const target = await page.evaluate(() => {
      const s = (window as any).__GAME__.scene.getScene('StageScene');
      s.player.takeDamage = () => false;
      // Isolate the branching maze's terrain; live combat is exercised in the
      // all-chapters test, which uses real attacks against every boss.
      if (s.arcade.isMaze) s.enemies.getChildren().forEach((e: any) => e.disableBody(true, true));
      let frame = 0;
      let mazeStep = 0;
      const mazePath = [{ x: 820, y: 334 }, { x: 1040, y: 291 }, { x: 1240, y: 230 }];
      s.readInput = () => {
        frame += 1;
        const body = s.player.body;
        const enemyAhead = s.enemies.getChildren().some((e: any) => e.active && e.x > s.player.x && e.x - s.player.x < 170 && Math.abs(e.y - s.player.y) < 140);
        if (s.arcade.isMaze && !s.arcade.exitReady) {
          const index = [0, 1, 2].find(i => !s.arcade.state.seals.includes(i))!;
          let target = s.arcade.seals[index];
          if (index === 1) {
            // If a jump misses the upper lane, walk back to its first step.
            if (mazeStep > 0 && s.player.y > 390) mazeStep = 0;
            target = mazePath[mazeStep];
            if (mazeStep < 2 && Math.abs(s.player.x - target.x) < 20 && s.player.y <= target.y + 4 && (body.blocked.down || body.touching.down)) target = mazePath[++mazeStep];
          }
          const right = s.player.x < target.x - 8;
          const left = s.player.x > target.x + 8;
          const wantsJump = index === 1 && (s.player.y > target.y + 3 || body.blocked.right || body.blocked.left);
          return { left, right, down: false, jump: wantsJump && frame % 18 < 4, attack: false };
        }
        const wantsJump = body.blocked.right || body.touching.right || enemyAhead;
        return { left: false, right: true, down: false, jump: wantsJump && frame % 16 < 8, attack: frame % 14 < 2 };
      };
      const stage = s.stage;
      return stage.boss && stage.clearMode !== 'survive' ? stage.boss.x - 250 : (stage.npc?.x ?? stage.goalX) - 100;
    });
    const deadline = Date.now() + 50000;
    for (;;) {
      const state = await page.evaluate(() => {
        const s = (window as any).__GAME__.scene.getScene('StageScene');
        return { x: s.player.x, open: s.dialogue.isOpen, active: s.scene.isActive() };
      });
      if (!state.active || state.x >= target) break;
      if (state.open) await page.keyboard.press('Enter');
      if (Date.now() > deadline) throw new Error(`chapter ${chapter}: stuck at x=${Math.round(state.x)}, target ${Math.round(target)}`);
      await page.waitForTimeout(150);
    }
  }
});

test('defeating a monster adds it to the monster book, which pages by chapter', async ({ page }) => {
  await openStage(page, 1);
  await dismiss(page);
  const result = await page.evaluate(async () => {
    const { StageManager } = await import('/src/game/StageManager.ts');
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    const crow = s.enemies.getChildren().find((enemy: any) => enemy.texture.key === 'enemy-crow');
    crow.hp = 1;
    s.hitEnemy(crow);
    return { discovered: StageManager.getDiscovered().has('enemy-crow'), toast: Boolean(s.discoveryToast?.active) };
  });
  expect(result).toEqual({ discovered: true, toast: true });

  await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').scene.start('BestiaryScene'));
  await page.waitForFunction(() => (window as any).__GAME__.scene.isActive('BestiaryScene'));
  const texts = () => page.evaluate(() => (window as any).__GAME__.scene.getScene('BestiaryScene').pageLayer.list
    .filter((item: any) => item.type === 'Text').map((item: any) => item.text));
  const first = await texts();
  expect(first).toContain('장난 까마귀');
  expect(first.filter((text: string) => text === '???')).toHaveLength(2);
  await page.keyboard.press('ArrowRight');
  expect((await texts())[0]).toBe('제 2장 · 혼세마왕의 동굴');
});

test('a hit knocks a monster back briefly; the progress bar follows the hero to the goal', async ({ page }) => {
  await openStage(page, 2);
  await dismiss(page);
  const hit = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    const target = s.enemies.getChildren().find((enemy: any) => enemy.enemyType !== 'boss');
    target.hp = 5;
    target.x = s.player.x + 60;
    target.takeHit(1, s.player.x);
    return { pushedAway: target.body.velocity.x > 0, stunned: target.stunnedUntil > s.time.now };
  });
  expect(hit).toEqual({ pushedAway: true, stunned: true });

  const start = await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').progressHero.x);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.storyBeatsSeen = new Set(['trail', 'encounter']);
    s.player.takeDamage = () => false;
    s.player.body.reset(s.stage.goalX - 300, 432);
  });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').progressHero.x)).toBeGreaterThan(start + 200);
});

test('pause menu restarts the chapter; replayed chapters offer a skip button for dialogue', async ({ page }) => {
  await openStage(page, 2);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').dialogue.skipButton.visible)).toBe(false);
  await dismiss(page);
  await page.evaluate(async () => {
    const { StageManager } = await import('/src/game/StageManager.ts');
    StageManager.recordStars('stage-02', 1); // as if cleared before
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.coinCount = 4;
  });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => (window as any).__GAME__.scene.isActive('PauseScene'));
  await page.evaluate(() => {
    const pause = (window as any).__GAME__.scene.getScene('PauseScene');
    const restart = pause.children.list.find((item: any) => item.getData?.('label')?.text === '이 장 다시 하기');
    restart.emit('pointerup');
  });
  await page.waitForFunction(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    return s.scene.isActive() && s.dialogue?.isOpen && !(window as any).__GAME__.scene.isActive('PauseScene');
  });
  const restarted = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    const skip = s.dialogue.skipButton;
    const visible = skip.visible;
    skip.emit('pointerdown', s.input.activePointer, 0, 0, { stopPropagation() {} });
    return { coins: s.coinCount, visible, closed: !s.dialogue.isOpen };
  });
  expect(restarted).toEqual({ coins: 0, visible: true, closed: true });
});

test('companions warn about hazards and, once per chapter, heal the hero when hearts run low', async ({ page }) => {
  await openStage(page, 8);
  await page.evaluate(async () => {
    const { StageManager } = await import('/src/game/StageManager.ts');
    StageManager.markStageCleared('stage-07'); // all three friends have joined
    (window as any).__GAME__.scene.getScene('StageScene').scene.restart({ stageId: 'stage-08' });
  });
  await page.waitForFunction(() => (window as any).__GAME__.scene.getScene('StageScene').dialogue?.isOpen);
  await dismiss(page);
  // 삼장법사 was carried off by the wind in this chapter's story.
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').companions)).toEqual(['저팔계', '사오정']);

  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.storyBeatsSeen = new Set(['trail', 'encounter']);
    // The wind sits inside the cloud race lane; walk there instead of
    // racing, so ring rewards and storm clouds cannot change the hearts.
    s.arcade.state.raceDone = true;
    s.player.body.reset(s.stage.hazards[0].x - 250, 432);
  });
  await expect.poll(() => page.evaluate(() => Boolean((window as any).__GAME__.scene.getScene('StageScene').speech))).toBe(true);

  const hearts = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.player.currentHealth = 3;
    s.player.invulnerable = false;
    s.player.takeDamage(1);
    s.handlePlayerDamaged();
    return s.player.health;
  });
  expect(hearts).toBe(2);
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').player.health)).toBe(4);
  // Only once per chapter.
  const again = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.player.currentHealth = 2;
    s.handlePlayerDamaged();
    return s.companionHelpUsed;
  });
  expect(again).toBe(true);
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').player.health)).toBe(2);
});

test('after 30 minutes of play the clear screen suggests a break, and it holds the next chapter', async ({ page }) => {
  await openStage(page, 2);
  await dismiss(page);
  await page.evaluate(async () => {
    const { PlayTime } = await import('/src/game/playTime.ts');
    PlayTime.set(31 * 60 * 1000);
    (window as any).__GAME__.scene.getScene('StageScene').completeStage();
  });
  await dismiss(page);
  await page.waitForFunction(() => (window as any).__GAME__.scene.isActive('StageClearScene'));
  await page.waitForTimeout(1300);
  await page.keyboard.press('Enter'); // must not skip past the suggestion
  await page.waitForTimeout(300);
  const state = await page.evaluate(async () => {
    const { PlayTime } = await import('/src/game/playTime.ts');
    const clear = (window as any).__GAME__.scene.getScene('StageClearScene');
    return { stillHere: clear.scene.isActive(), panel: clear.breakPanel, due: PlayTime.breakDue };
  });
  expect(state).toEqual({ stillHere: true, panel: true, due: false });
  await page.evaluate(() => {
    const clear = (window as any).__GAME__.scene.getScene('StageClearScene');
    clear.children.list.find((item: any) => item.getData?.('label')?.text === '조금만 더 할래요').emit('pointerup');
  });
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageClearScene').breakPanel)).toBe(false);
});


test('maze seals unlock the gate, cannot be bypassed at the exit, and survive a retry', async ({ page }) => {
  await openStage(page, 2);
  await dismiss(page);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.storyBeatsSeen = new Set(['trail', 'encounter']);
    s.player.invulnerable = true;
    s.bossExitUnlocked = true;
    s.handleExitReached();
  });
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').stageCleared)).toBe(false);
  for (const index of [2, 0, 1]) {
    await page.evaluate(index => {
      const s = (window as any).__GAME__.scene.getScene('StageScene');
      const seal = s.arcade.seals[index];
      s.player.body.reset(seal.x, seal.y + 35);
    }, index);
    await page.waitForTimeout(180);
  }
  expect(await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    return { ready: s.arcade.exitReady, solid: s.arcade.gate.body.enable, seals: [...s.arcade.state.seals].sort() };
  })).toEqual({ready:true,solid:false,seals:[0,1,2]});
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.restartStage();
  });
  await page.waitForTimeout(2400);
  expect(await page.evaluate(() => {
    const a = (window as any).__GAME__.scene.getScene('StageScene').arcade;
    return {ready:a.exitReady,visible:a.seals.filter((s:any)=>s.visible).length,solid:a.gate.body.enable};
  })).toEqual({ready:true,visible:0,solid:false});
});

test('storm locks its warning position, pauses fairly, rewards dodges and damages a direct hit', async ({ page }) => {
  await openStage(page, 4);
  await dismiss(page);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.storyBeatsSeen = new Set(['trail','encounter']);
    s.enemies.getChildren().forEach((e:any)=>e.disableBody(true,true));
    s.player.body.reset(300,432);
    s.arcade.stormClock=1490;
  });
  await page.waitForFunction(()=>(window as any).__GAME__.scene.getScene('StageScene').arcade.stormPhase==='warning');
  const x=await page.evaluate(()=>(window as any).__GAME__.scene.getScene('StageScene').arcade.stormX);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
  const clock=await page.evaluate(()=>(window as any).__GAME__.scene.getScene('StageScene').arcade.stormClock);
  await page.waitForTimeout(400);
  expect(await page.evaluate(()=>(window as any).__GAME__.scene.getScene('StageScene').arcade.stormClock)).toBe(clock);
  await page.keyboard.press('Enter');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(650);
  await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(()=>(window as any).__GAME__.scene.getScene('StageScene').arcade.stormX)).toBe(x);
  await expect.poll(()=>page.evaluate(()=>(window as any).__GAME__.scene.getScene('StageScene').arcade.state.dodges)).toBe(1);
  const before=await page.evaluate(()=>(window as any).__GAME__.scene.getScene('StageScene').player.health);
  await page.waitForFunction(()=>(window as any).__GAME__.scene.getScene('StageScene').arcade.stormPhase==='warning');
  await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('StageScene');
    s.player.body.reset(s.arcade.stormX,432);
    s.player.invulnerable=false;
  });
  await expect.poll(()=>page.evaluate(()=>(window as any).__GAME__.scene.getScene('StageScene').player.health)).toBe(before-1);
});

test('cloud race uses held controls, collects rings once, pauses its clock and returns to ground physics', async ({page}) => {
  await openStage(page,8);
  await dismiss(page);
  await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('StageScene');
    s.storyBeatsSeen=new Set(['trail','encounter']);
    s.player.invulnerable=true;
    s.enemies.getChildren().forEach((e:any)=>e.disableBody(true,true));
  });
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(()=>(window as any).__GAME__.scene.getScene('StageScene').arcade.inFlight);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
  const clock=await page.evaluate(()=>(window as any).__GAME__.scene.getScene('StageScene').arcade.state.raceMs);
  await page.waitForTimeout(400);
  expect(await page.evaluate(()=>(window as any).__GAME__.scene.getScene('StageScene').arcade.state.raceMs)).toBe(clock);
  await page.keyboard.press('Enter');
  await page.keyboard.down('ArrowRight');
  for(let i=0;i<180;i++) {
    const state=await page.evaluate(()=>{
      const s=(window as any).__GAME__.scene.getScene('StageScene');
      const ring=s.arcade.rings.find((r:any)=>!r.getData('collected') && r.x>=s.player.x-30);
      return {done:s.arcade.state.raceDone,y:s.player.y,target:ring ? ring.y+45 : 350};
    });
    if(state.done) break;
    if(state.y>state.target) await page.keyboard.down('ArrowUp');
    else await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(55);
  }
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('ArrowUp');
  const result=await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('StageScene');
    return {done:s.arcade.state.raceDone,rings:s.arcade.state.raceRings,unique:new Set(s.arcade.state.raceCollected).size,
      gravity:s.player.body.allowGravity,platforms:s.playerPlatforms.active,ms:s.arcade.state.raceMs};
  });
  expect(result.done).toBe(true);
  expect(result.rings).toBeGreaterThanOrEqual(4);
  expect(result.unique).toBe(result.rings);
  expect(result.gravity).toBe(true);
  expect(result.platforms).toBe(true);
  expect(result.ms).toBeLessThan(18000);
});

test('riding the cloud passes over monsters, still swings the staff and saves story pages for landing', async ({ page }) => {
  await openStage(page, 8);
  await dismiss(page);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => (window as any).__GAME__.scene.getScene('StageScene').arcade.inFlight);
  await page.keyboard.up('ArrowRight');
  // Flying low over a walker: no bump, and the walker is not dragged along.
  const before = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    const sand = s.enemies.getChildren().find((e: any) => e.texture.key === 'enemy-sand');
    sand.body.reset(s.player.x + 40, 436);
    return { health: s.player.health, x: sand.x };
  });
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    const sand = s.enemies.getChildren().find((e: any) => e.texture.key === 'enemy-sand');
    return { health: s.player.health, x: sand.x, flying: s.arcade.inFlight, y: s.player.y };
  });
  expect(after.flying).toBe(true);
  expect(after.y).toBeGreaterThan(400);
  expect(after.health).toBe(before.health);
  expect(Math.abs(after.x - before.x)).toBeLessThan(60);
  // The staff still swings from the cloud.
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.enemies.getChildren().find((e: any) => e.texture.key === 'enemy-dust-wolf').body.reset(s.player.x + 90, 436);
  });
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => {
    const wolf = (window as any).__GAME__.scene.getScene('StageScene').enemies.getChildren().find((e: any) => e.texture.key === 'enemy-dust-wolf');
    return !wolf.active || wolf.hp < 3;
  })).toBe(true);
  // The story page waits until the cloud lands.
  await page.evaluate(() => { (window as any).__GAME__.scene.getScene('StageScene').player.invulnerable = true; });
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => (window as any).__GAME__.scene.getScene('StageScene').player.x > 1420);
  expect(await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    return { open: s.dialogue.isOpen, flying: s.arcade.inFlight };
  })).toEqual({ open: false, flying: true });
  await page.waitForFunction(() => !(window as any).__GAME__.scene.getScene('StageScene').arcade.inFlight);
  await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => (window as any).__GAME__.scene.getScene('StageScene').dialogue.isOpen);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('StageScene').storyBeatsSeen.has('trail'))).toBe(true);
});

test('a wind gust pushes against the hero during real play', async ({ page }) => {
  await openStage(page, 8);
  await dismiss(page);
  const result = await page.evaluate(async () => {
    const s = (window as any).__GAME__.scene.getScene('StageScene');
    s.arcade.state.raceDone = true;
    s.storyBeatsSeen = new Set(['trail', 'encounter']);
    s.enemies.getChildren().forEach((e: any) => e.disableBody(true, true));
    s.player.body.reset(1080, 432);
    s.readInput = () => ({ left: false, right: true, down: false, jump: false, attack: false });
    const frame = () => new Promise((resolve) => s.events.once('postupdate', resolve));
    await frame();
    await frame();
    s.windTimer = 2700;
    await frame();
    const gust = s.player.body.velocity.x;
    s.windTimer = 0;
    await frame();
    return { gust, calm: s.player.body.velocity.x };
  });
  expect(result.calm).toBeGreaterThan(200);
  expect(result.gust).toBeLessThan(result.calm - 60);
});
