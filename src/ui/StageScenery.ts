import Phaser from 'phaser';
import { GAME_WIDTH } from '../constants';
import type { StageBackgroundKey } from '../game/data/stages';
import { bakeTexture } from './bake';

type Palette = { near: number; ground: number; soil: number };

// Small reusable textures: the illustrated backdrop, distant silhouettes and
// foreground props move at different speeds, without redrawing each frame.
export function addStageScenery(scene: Phaser.Scene, theme: StageBackgroundKey, width: number, p: Palette): void {
  const prop = `scenery-${theme}`;
  bakeTexture(scene, prop, 160, 190, g => {
    g.lineStyle(3, p.soil, 0.95);
    if (theme === 'cave' || theme === 'palace' || theme === 'gold') {
      // Blunt gem columns, not sharp cones: on the walking lane a pointed
      // shard reads as the spikes children are taught to jump over.
      for (const [x, y, h] of [[35, 170, 74], [72, 178, 112], [113, 173, 57]]) {
        const gem = [
          new Phaser.Geom.Point(x - 14, y), new Phaser.Geom.Point(x - 16, y - h * 0.6), new Phaser.Geom.Point(x - 7, y - h),
          new Phaser.Geom.Point(x + 7, y - h), new Phaser.Geom.Point(x + 16, y - h * 0.6), new Phaser.Geom.Point(x + 14, y)
        ];
        g.fillStyle(theme === 'cave' ? 0x5edaff : theme === 'palace' ? 0x78e1ec : 0xffdf67);
        g.fillPoints(gem, true);
        g.lineStyle(3, p.soil, 0.95).strokePoints(gem, true);
        g.lineStyle(2, 0xffffff, 0.65).lineBetween(x - 2, y - h + 10, x - 6, y - 12);
      }
    } else if (theme === 'skywar' || theme === 'ending') {
      g.fillStyle(0xe6f8ff, 0.95);
      g.fillEllipse(78, 140, 140, 36).fillCircle(42, 129, 25).fillCircle(81, 116, 37).fillCircle(119, 130, 23);
      g.lineStyle(3, 0x91bfe0).strokeEllipse(78, 140, 140, 36);
      g.lineStyle(3, 0xffd675).strokeCircle(79, 133, 13);
    } else if (theme === 'forest' || theme === 'swamp') {
      g.fillStyle(0x654527).fillRoundedRect(69, 64, 22, 122, 8);
      g.fillStyle(theme === 'forest' ? 0x28724b : 0x3d6852);
      g.fillCircle(52, 79, 39).fillCircle(95, 73, 47).fillCircle(75, 40, 34);
      g.fillStyle(0x70a46a, 0.65).fillCircle(65, 40, 19).fillCircle(31, 74, 16);
      g.lineStyle(4, 0x739151).lineBetween(112, 95, 110, 155).lineBetween(40, 106, 37, 145);
    } else if (theme === 'river') {
      g.fillStyle(0x386d64);
      for (const x of [40, 65, 90, 114]) {
        g.fillRoundedRect(x, 83 + x / 4, 5, 100 - x / 4, 2);
        g.fillStyle(0xb78452).fillEllipse(x + 2, 91 + x / 4, 12, 30);
        g.fillStyle(0x386d64);
      }
      g.fillStyle(0x699db1).fillEllipse(75, 184, 134, 10);
    } else if (theme === 'wind' || theme === 'mountain') {
      g.fillStyle(p.soil).fillTriangle(13, 183, 56, 94, 105, 183).fillTriangle(67, 183, 113, 129, 151, 183);
      g.fillStyle(p.ground).fillTriangle(30, 149, 56, 94, 77, 133);
      g.lineStyle(3, 0xffedb2, 0.8).lineBetween(24, 161, 43, 122).lineBetween(87, 169, 111, 141);
    } else {
      g.fillStyle(0x477b32);
      for (const x of [35, 78, 119]) {
        g.fillRoundedRect(x, 74, 6, 108, 2);
        g.fillEllipse(x - 12, 123, 32, 13).fillEllipse(x + 17, 142, 33, 13);
        g.fillStyle(0xffd456).fillEllipse(x + 4, 87, 22, 46);
        g.lineStyle(2, 0xb98623).strokeEllipse(x + 4, 87, 22, 46);
        g.fillStyle(0x477b32);
      }
      if (theme === 'farm') {
        g.fillStyle(0xc39159).fillRect(8, 164, 142, 8);
        for (const x of [15, 55, 95, 135]) g.fillRoundedRect(x, 142, 8, 46, 3);
      }
    }
  });
  for (let x = -120, i = 0; x < width + GAME_WIDTH; x += 330, i++) {
    scene.add.image(x, 432, prop).setOrigin(0.5, 1).setScrollFactor(0.42, 1).setScale(0.65 + (i % 3) * 0.1).setAlpha(0.46).setDepth(-12);
  }
  // Near props stand behind the ground strip (base hidden, slightly dimmed),
  // so they read as scenery rather than something on the path.
  for (let x = 130, i = 0; x < width; x += 470, i++) {
    scene.add.image(x, 446, prop).setOrigin(0.5, 1).setScale(0.44 + (i % 2) * 0.12).setTint(0xd9d2c4).setAlpha(0.85).setDepth(-1);
  }
  const mote = `mote-${theme}`;
  bakeTexture(scene, mote, 12, 12, g => {
    g.fillStyle(['forest', 'swamp', 'gold', 'cave'].includes(theme) ? 0xffed91 : 0xffffff, 0.8).fillCircle(6, 6, 3);
  });
  scene.add.particles(0, 0, mote, {
    x: { min: 0, max: GAME_WIDTH }, y: { min: 130, max: 400 },
    lifespan: 5000, frequency: 420, speedX: { min: -15, max: 10 }, speedY: { min: -18, max: 6 },
    alpha: { start: 0.5, end: 0 }, scale: { start: 0.7, end: 0.1 }, maxParticles: 18
  }).setScrollFactor(0).setDepth(-9);
}

export function platformTexture(scene: Phaser.Scene, theme: StageBackgroundKey, p: Palette): string {
  const key = `terrain-${theme}`;
  bakeTexture(scene, key, 128, 32, g => {
    g.fillStyle(p.soil).fillRect(0, 0, 128, 32);
    g.fillStyle(p.near, 0.55).fillRect(0, 22, 128, 10);
    g.lineStyle(2, p.near, 0.8);
    for (const x of [8, 42, 78, 115]) g.lineBetween(x, 8, x + 5, 20).lineBetween(x + 5, 20, x - 1, 31);
    g.fillStyle(p.ground).fillRect(0, 0, 128, 7);
    g.fillStyle(0xffffff, 0.2).fillRect(0, 1, 128, 2);
    for (let x = 4; x < 128; x += 17) g.fillStyle(p.ground, 0.65).fillTriangle(x, 6, x + 5, 14, x + 10, 6);
  });
  return key;
}
