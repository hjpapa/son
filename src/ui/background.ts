import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';

// Fills the screen with a 16:9 painting without stretching it on wider
// screens: it is scaled to cover and the overflow is trimmed top and bottom.
export function addCoverBackground(scene: Phaser.Scene, key: string): Phaser.GameObjects.Image {
  const image = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, key);
  image.setScale(Math.max(GAME_WIDTH / image.width, GAME_HEIGHT / image.height));
  return image;
}
