import Phaser from 'phaser';
import characterArt from '../game/data/character-art.json';

const heroPoses = ['idle', 'run', 'attack', 'crouch'] as const;

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 24, '옥수수손오공 준비 중...', {
        color: '#3b2500',
        fontSize: '30px',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const bar = this.add.rectangle(width / 2, height / 2 + 28, 360, 20, 0xf7e0a0).setOrigin(0.5).setStrokeStyle(3, 0x4f3300);
    const fill = this.add.rectangle(bar.x - 180, bar.y, 0, 20, 0xf2b705).setOrigin(0, 0.5);
    this.load.on('progress', (value: number) => {
      fill.width = 360 * value;
    });
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`Could not load ${file.key}`);
    });

    for (const pose of heroPoses) {
      this.load.image(`corn-wukong-clean-${pose}`, `assets/sprites/corn-wukong-clean-${pose}.png`);
    }
    this.load.image('background-cornfield', 'assets/backgrounds/cornfield.webp');
    for (const key of [...characterArt.travelers, ...characterArt.legends]) {
      this.load.image(key, `assets/characters/${key}.png`);
    }
    this.load.image('npc-samjang', 'assets/characters/companion-samjang.png');
  }

  create(): void {
    for (const key of [...heroPoses.map((pose) => `corn-wukong-clean-${pose}`), 'background-cornfield']) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    this.createItemTextures();
    this.scene.start('TitleScene');
  }

  private createItemTextures(): void {
    const draw = (key: string, width: number, height: number, paint: (graphics: Phaser.GameObjects.Graphics) => void) => {
      if (this.textures.exists(key)) return;
      const graphics = this.add.graphics();
      paint(graphics);
      graphics.generateTexture(key, width, height);
      graphics.destroy();
    };

    draw('corn-coin', 32, 32, (g) => {
      g.fillStyle(0xffd437, 1).fillEllipse(16, 16, 24, 28);
      g.lineStyle(3, 0x9b6800, 1).strokeEllipse(16, 16, 24, 28);
      g.lineBetween(16, 4, 16, 28).lineBetween(8, 14, 24, 14).lineBetween(9, 21, 23, 21);
    });

    draw('staff-item', 96, 48, (g) => {
      g.lineStyle(8, 0xffd23f, 1).lineBetween(8, 32, 88, 18);
      g.lineStyle(3, 0x8a5a00, 1).lineBetween(8, 36, 88, 22);
      g.fillStyle(0xffffff, 1).fillCircle(88, 18, 5);
    });

    draw('sutra-item', 94, 64, (g) => {
      g.fillStyle(0xfff0a8, 1).fillRoundedRect(12, 8, 70, 48, 7);
      g.lineStyle(4, 0xa44b24, 1).strokeRoundedRect(12, 8, 70, 48, 7);
      g.fillStyle(0xc73f2d, 1).fillRect(39, 8, 16, 48);
      g.fillStyle(0xffd75a, 1).fillCircle(47, 32, 7);
      g.lineStyle(3, 0x7d321f, 1).lineBetween(18, 20, 35, 20).lineBetween(59, 20, 76, 20);
    });

    draw('health-corn', 34, 34, (g) => {
      g.fillStyle(0x2f9c3f, 1).fillCircle(16, 17, 13);
      g.fillStyle(0xe94742, 1).fillCircle(13, 15, 8).fillCircle(21, 15, 8).fillTriangle(7, 19, 27, 19, 17, 30);
      g.lineStyle(3, 0xffffff, 1).strokeCircle(16, 17, 13);
    });

    draw('boss-orb', 36, 36, (g) => {
      g.fillStyle(0xffffff, 1).fillCircle(18, 18, 16);
      g.fillStyle(0xfff4b0, 1).fillCircle(22, 14, 8);
      g.lineStyle(3, 0x492b1a, 1).strokeCircle(18, 18, 15);
    });

    draw('boss-wave', 68, 52, (g) => {
      g.fillStyle(0xffffff, 0.95).fillTriangle(2, 26, 64, 4, 64, 48);
      g.lineStyle(3, 0x6b3500, 1).strokeTriangle(2, 26, 64, 4, 64, 48);
    });

    // Narration portrait: an open storybook scroll instead of the hero's face.
    draw('story-scroll', 96, 96, (g) => {
      g.fillStyle(0xf6e2a8, 1).fillRoundedRect(14, 22, 68, 54, 6);
      g.lineStyle(3, 0x7a4a1c, 1).strokeRoundedRect(14, 22, 68, 54, 6);
      g.fillStyle(0xb5462f, 1).fillRoundedRect(6, 16, 12, 66, 5).fillRoundedRect(78, 16, 12, 66, 5);
      g.lineStyle(3, 0x5d2b17, 1).strokeRoundedRect(6, 16, 12, 66, 5).strokeRoundedRect(78, 16, 12, 66, 5);
      g.lineStyle(3, 0x9a7a45, 1);
      for (let y = 34; y <= 64; y += 10) g.lineBetween(26, y, 70, y);
    });
  }
}
