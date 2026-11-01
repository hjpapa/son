import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const characterArt = JSON.parse(readFileSync('src/game/data/character-art.json', 'utf8')) as { travelers: string[]; legends: string[] };

for (const saveData of [false, true]) {
  test(`first visit can reopen offline (data saving: ${saveData})`, async ({ page, context }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript((saveData) => {
      Object.defineProperty(navigator, 'connection', { value: { saveData }, configurable: true });
    }, saveData);
    await page.goto('/');
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    // First installation must cache the entry document too, even though
    // the initial navigation happened before the worker took control.
    await expect.poll(() => page.evaluate(async () => {
      return Boolean(await caches.match('/'));
    }), { timeout: 12000 }).toBe(true);
    await expect.poll(() => page.evaluate(async () => {
      const names = await caches.keys();
      const cache = await caches.open(names.find(name => name.startsWith('corn-wukong-'))!);
      const urls = (await cache.keys()).map(request => request.url);
      return urls.filter(url => /assets\/.*\.js$/.test(url)).length;
    }), { timeout: 12000 }).toBe(2);
    await expect.poll(() => page.evaluate(async () => {
      const names = await caches.keys();
      const cache = await caches.open(names.find(name => name.startsWith('corn-wukong-'))!);
      return (await cache.keys()).filter(request => /\/assets\/(sprites|characters)\//.test(request.url)).length;
    }), { timeout: 12000 }).toBe(new Set([...characterArt.travelers, ...characterArt.legends]).size + 8);
    if (!saveData) {
      await expect.poll(() => page.evaluate(async () => {
        const names = await caches.keys();
        const cache = await caches.open(names.find(name => name.startsWith('corn-wukong-'))!);
        return (await cache.keys()).filter(request => request.url.includes('/assets/backgrounds/')).length;
      }), { timeout: 12000 }).toBe(12);
    }
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('canvas')).toBeVisible();
    await expect.poll(async () => {
      const { channels } = await sharp(await page.screenshot()).stats();
      return Math.max(...channels.slice(0, 3).map(channel => channel.stdev));
    }).toBeGreaterThan(40);
    expect(errors).toEqual([]);
  });
}
