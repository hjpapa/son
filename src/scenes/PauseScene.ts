import Phaser from 'phaser';
import { Music } from '../audio/Music';
import { Settings } from '../game/Settings';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { createButton } from '../ui/Button';

type PauseInit = { stageId: string };

export class PauseScene extends Phaser.Scene {
  private resumed = false;

  constructor() {
    super('PauseScene');
  }

  create(_data: PauseInit): void {
    this.resumed = false;
    Music.duck(true);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x120c06, 0.7).setOrigin(0).setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(0xfff3cf, 0.98).fillRoundedRect(GAME_WIDTH / 2 - 250, 60, 500, 420, 26);
    panel.lineStyle(5, 0x8a5a1a, 1).strokeRoundedRect(GAME_WIDTH / 2 - 250, 60, 500, 420, 26);
    this.add.text(GAME_WIDTH / 2, 112, '잠깐 쉬어요', { color: '#4a2b00', fontSize: '38px', fontStyle: 'bold' }).setOrigin(0.5);

    createButton(this, GAME_WIDTH / 2, 196, '계속하기 ▶', () => this.resumeGame(), { width: 320, height: 70, fontSize: 30, primary: true });
    const sound = createButton(this, GAME_WIDTH / 2 - 112, 286, '', () => {
      Settings.sound = !Settings.sound;
      this.refreshLabels(sound, music);
    }, { width: 210, fontSize: 22 });
    const music = createButton(this, GAME_WIDTH / 2 + 112, 286, '', () => {
      Settings.music = !Settings.music;
      Music.refresh();
      this.refreshLabels(sound, music);
    }, { width: 210, fontSize: 22 });
    this.refreshLabels(sound, music);
    createButton(this, GAME_WIDTH / 2, 380, '처음 화면으로', () => {
      this.scene.stop('StageScene');
      this.scene.start('TitleScene');
    }, { width: 280 });
    this.add.text(GAME_WIDTH / 2, 444, '진행한 장까지는 저장되어 있어요.', { color: '#7a5a2a', fontSize: '17px', fontStyle: 'bold' }).setOrigin(0.5);

    for (const key of ['ESC', 'P', 'ENTER']) {
      this.input.keyboard?.on(`keydown-${key}`, (event: KeyboardEvent) => {
        if (!event.repeat) this.resumeGame();
      });
    }
  }

  private refreshLabels(sound: Phaser.GameObjects.Container, music: Phaser.GameObjects.Container): void {
    (sound.getData('label') as Phaser.GameObjects.Text).setText(`효과음: ${Settings.sound ? '켜짐' : '꺼짐'}`);
    (music.getData('label') as Phaser.GameObjects.Text).setText(`배경음악: ${Settings.music ? '켜짐' : '꺼짐'}`);
  }

  private resumeGame(): void {
    if (this.resumed) return;
    this.resumed = true;
    Music.duck(false);
    this.scene.resume('StageScene');
    this.scene.stop();
  }
}
