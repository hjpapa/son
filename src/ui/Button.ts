import Phaser from 'phaser';
import { Sfx } from '../audio/Sfx';
import { bakeTexture } from './bake';

type ButtonOptions = {
  width?: number;
  height?: number;
  fontSize?: number;
  primary?: boolean;
  enabled?: boolean;
};

// A large rounded button sized for small fingers, with press feedback.
export function createButton(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, options: ButtonOptions = {}): Phaser.GameObjects.Container {
  const { width = 240, height = 62, fontSize = 26, primary = false, enabled = true } = options;
  const fill = !enabled ? 0xd9d1b6 : primary ? 0xffd24a : 0xfff7dc;
  // Each look (size, colour) is drawn once and shared by every button using it.
  const look = (color: number) => bakeTexture(scene, `button-${width}x${height}-${color.toString(16)}-${enabled}`, width + 8, height + 10, (g) => {
    g.fillStyle(0x000000, 0.2).fillRoundedRect(5, 7, width, height, 18);
    g.fillStyle(color, enabled ? 0.96 : 0.6).fillRoundedRect(2, 2, width, height, 18);
    g.lineStyle(4, enabled ? 0x6e4300 : 0x81745f, 1).strokeRoundedRect(2, 2, width, height, 18);
  });
  const background = scene.add.image(0, 0, look(fill)).setOrigin(0.5).setPosition(2, 3);
  const draw = (color: number) => background.setTexture(look(color));
  const text = scene.add.text(0, 0, label, { color: enabled ? '#3d2600' : '#766a56', fontSize: `${fontSize}px`, fontStyle: 'bold' }).setOrigin(0.5);
  const container = scene.add.container(x, y, [background, text]).setSize(width, height);
  container.setData('label', text);
  if (!enabled) return container;

  container.setInteractive({ useHandCursor: true });
  container.on('pointerover', () => draw(primary ? 0xffe17a : 0xffedaa));
  container.on('pointerout', () => {
    draw(fill);
    container.setScale(1);
  });
  container.on('pointerdown', () => container.setScale(0.95));
  container.on('pointerup', () => {
    container.setScale(1);
    Sfx.tap();
    onClick();
  });
  return container;
}
