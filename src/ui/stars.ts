import Phaser from 'phaser';
import { bakeTexture } from './bake';

// A five-point star, gold when earned and pale when not yet.
export function drawStar(graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, earned: boolean): void {
  const points: Phaser.Math.Vector2[] = [];
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const r = index % 2 === 0 ? radius : radius * 0.45;
    points.push(new Phaser.Math.Vector2(x + Math.cos(angle) * r, y + Math.sin(angle) * r));
  }
  graphics.fillStyle(earned ? 0xffc928 : 0xe9dcc0, 1).fillPoints(points, true);
  graphics.lineStyle(Math.max(2, radius * 0.12), earned ? 0x9a5b00 : 0xb8a888, 1).strokePoints(points, true);
}

// The same star drawn once into a texture, for use as an image.
export function starTexture(scene: Phaser.Scene, radius: number, earned: boolean): string {
  const size = Math.ceil(radius * 2 + 8);
  return bakeTexture(scene, `star-${radius}-${earned}`, size, size, (g) => drawStar(g, size / 2, size / 2, radius, earned));
}
