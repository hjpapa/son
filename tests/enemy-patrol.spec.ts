import { test, expect } from '@playwright/test';

for (const chapter of [4, 6]) {
  for (const direction of [-1, 1]) {
    test(`chapter ${chapter}: charger patrols an open lane from direction ${direction} and resumes after charging`, async ({ page }) => {
      await page.goto(`/?stage=stage-${String(chapter).padStart(2, '0')}`);
      await page.waitForFunction(() => (window as any).__GAME__?.scene.getScene('StageScene')?.dialogue?.isOpen);
      await page.evaluate(direction => {
        const s = (window as any).__GAME__.scene.getScene('StageScene');
        s.dialogue.close();
        s.player.invulnerable = true;
        s.enemies.getChildren().find((e: any) => e.enemyType === 'charger').direction = direction;
      }, direction);

      const samples: { x: number; direction: number; spawn: number; range: number }[] = [];
      for (let i = 0; i <= 100; i++) {
        samples.push(await page.evaluate(() => {
          const s = (window as any).__GAME__.scene.getScene('StageScene');
          const e = s.enemies.getChildren().find((e: any) => e.enemyType === 'charger');
          return { x: e.x, direction: e.direction, spawn: e.spawnX, range: e.config.patrolRange };
        }));
        if (i < 100) await page.waitForTimeout(200);
      }
      const positions = samples.map(s => s.x);
      const turns = samples.slice(1).filter((s, i) => s.direction !== samples[i].direction).length;
      expect(Math.max(...positions) - Math.min(...positions)).toBeGreaterThan(220);
      expect(turns).toBeGreaterThanOrEqual(2);
      expect(turns).toBeLessThanOrEqual(8);
      expect(samples.every(s => Math.abs(s.x - s.spawn) <= s.range + 5)).toBe(true);

      await page.evaluate(() => {
        const s = (window as any).__GAME__.scene.getScene('StageScene');
        const e = s.enemies.getChildren().find((e: any) => e.enemyType === 'charger');
        s.storyBeatsSeen.add('trail');
        s.storyBeatsSeen.add('encounter');
        s.player.body.reset(e.spawnX - 70, 432);
      });
      const states = new Set<string>();
      for (let i = 0; i < 70; i++) {
        states.add(await page.evaluate(() => {
          const s = (window as any).__GAME__.scene.getScene('StageScene');
          return s.enemies.getChildren().find((e: any) => e.enemyType === 'charger').dashState;
        }));
        await page.waitForTimeout(100);
      }
      expect([...states]).toEqual(expect.arrayContaining(['windup', 'dash', 'recover', 'patrol']));
    });
  }
}
