import Phaser from 'phaser';
import { Sfx } from '../audio/Sfx';

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
  const background = scene.add.graphics();
  const draw = (color: number) => {
    background.clear();
    background.fillStyle(0x000000, 0.2).fillRoundedRect(-width / 2 + 3, -height / 2 + 5, width, height, 18);
    background.fillStyle(color, enabled ? 0.96 : 0.6).fillRoundedRect(-width / 2, -height / 2, width, height, 18);
    background.lineStyle(4, enabled ? 0x6e4300 : 0x81745f, 1).strokeRoundedRect(-width / 2, -height / 2, width, height, 18);
  };
  draw(fill);
  const text = scene.add.text(0, 0, label, { color: enabled ? '#3d2600' : '#766a56', fontSize: `${fontSize}px`, fontStyle: 'bold' }).setOrigin(0.5);
  const container = scene.add.container(x, y, [background, text]).setSize(width, height);
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
  container.setData('label', text);
  return container;
}
