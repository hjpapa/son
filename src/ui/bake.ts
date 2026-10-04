import Phaser from 'phaser';

export type Bounds = { x: number; y: number; width: number; height: number };

// Phaser rebuilds every Graphics shape on every frame, turning each circle and
// rounded corner into a ~100-point polygon. That was over 90% of the drawing
// time in a boss fight. Shapes that rarely change are drawn once into a
// texture here and shown as a plain image instead.
export function bakeTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (graphics: Phaser.GameObjects.Graphics) => void,
  redraw = false
): string {
  const textures = scene.textures;
  if (textures.exists(key) && !redraw) return key;
  const graphics = scene.make.graphics({}, false);
  draw(graphics);
  // generateTexture paints over an existing canvas without clearing it.
  const existing = textures.exists(key) ? textures.get(key) : undefined;
  if (existing instanceof Phaser.Textures.CanvasTexture) existing.clear();
  graphics.generateTexture(key, Math.ceil(width), Math.ceil(height));
  graphics.destroy();
  return key;
}

// Bakes shapes drawn in scene coordinates inside `bounds` and places the
// resulting image exactly where the shapes would have been.
export function bakedImage(scene: Phaser.Scene, key: string, bounds: Bounds, draw: (graphics: Phaser.GameObjects.Graphics) => void, redraw = false): Phaser.GameObjects.Image {
  bakeTexture(scene, key, bounds.width, bounds.height, (graphics) => {
    graphics.translateCanvas(-bounds.x, -bounds.y);
    draw(graphics);
  }, redraw);
  return scene.add.image(bounds.x, bounds.y, key).setOrigin(0);
}
