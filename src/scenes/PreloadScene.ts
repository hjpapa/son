import Phaser from 'phaser';
import characterArt from '../game/data/character-art.json';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 20, '옥수수손오공 준비 중...', {
        color: '#3b2500',
        fontSize: '28px',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const bar = this.add.rectangle(width / 2, height / 2 + 28, 360, 18, 0xf7e0a0).setOrigin(0.5);
    const fill = this.add.rectangle(width / 2 - 180, height / 2 + 28, 0, 18, 0xf2b705).setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => {
      fill.width = 360 * value;
    });

    this.load.image('corn-wukong-clean-idle', 'assets/sprites/corn-wukong-clean-idle.png');
    this.load.image('corn-wukong-clean-run', 'assets/sprites/corn-wukong-clean-run.png');
    this.load.image('corn-wukong-clean-attack', 'assets/sprites/corn-wukong-clean-attack.png');
    this.load.image('corn-wukong-crouch-source', 'assets/sprites/corn-wukong-crouch-source.png');
    this.load.image('background-cornfield', 'assets/backgrounds/cornfield.webp');
    for (const key of [...characterArt.travelers, ...characterArt.legends]) {
      this.load.image(key, `assets/characters/${key}.png`);
    }
    this.load.image('npc-samjang', 'assets/characters/companion-samjang.png');

    bar.setStrokeStyle(3, 0x4f3300);
  }

  create(): void {
    this.createCrouchTexture();

    for (const key of [
      'corn-wukong-clean-idle',
      'corn-wukong-clean-run',
      'corn-wukong-clean-attack',
      'corn-wukong-clean-crouch',
      'background-cornfield'
    ]) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }

    this.scene.start('TitleScene');
  }

  private createCrouchTexture(): void {
    const source = this.textures.get('corn-wukong-crouch-source').getSourceImage() as HTMLImageElement;
    const texture = this.textures.createCanvas('corn-wukong-clean-crouch', source.width, source.height);
    if (!texture) {
      throw new Error('Could not create the crouching player texture.');
    }
    const context = texture.getContext();
    context.drawImage(source, 0, 0);

    const imageData = context.getImageData(0, 0, source.width, source.height);
    const pixels = imageData.data;
    const pixelCount = source.width * source.height;
    const visited = new Uint8Array(pixelCount);
    const queue = new Int32Array(pixelCount);
    let queueStart = 0;
    let queueEnd = 0;

    const enqueueBackground = (index: number) => {
      if (visited[index]) return;
      visited[index] = 1;
      const offset = index * 4;
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      const darkest = Math.min(red, green, blue);
      const lightest = Math.max(red, green, blue);
      if (darkest < 210 || lightest - darkest > 20) return;
      pixels[offset + 3] = 0;
      queue[queueEnd] = index;
      queueEnd += 1;
    };

    for (let x = 0; x < source.width; x += 1) {
      enqueueBackground(x);
      enqueueBackground((source.height - 1) * source.width + x);
    }
    for (let y = 1; y < source.height - 1; y += 1) {
      enqueueBackground(y * source.width);
      enqueueBackground(y * source.width + source.width - 1);
    }

    while (queueStart < queueEnd) {
      const index = queue[queueStart];
      queueStart += 1;
      const x = index % source.width;
      if (x > 0) enqueueBackground(index - 1);
      if (x < source.width - 1) enqueueBackground(index + 1);
      if (index >= source.width) enqueueBackground(index - source.width);
      if (index < pixelCount - source.width) enqueueBackground(index + source.width);
    }

    context.putImageData(imageData, 0, 0);
    texture.refresh();
  }
}
