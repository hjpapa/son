import Phaser from 'phaser';
import { Music } from '../audio/Music';
import { stages } from '../game/data/stages';
import { Settings } from '../game/Settings';
import { StageManager } from '../game/StageManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { enterFullscreen } from '../platform/webapp';
import { createButton } from '../ui/Button';
import { companionTextures } from '../game/data/companions';
import { addCoverBackground } from '../ui/background';

export class TitleScene extends Phaser.Scene {
  private confirmLayer?: Phaser.GameObjects.Container;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    if (import.meta.env.DEV) {
      const requestedStage = new URLSearchParams(window.location.search).get('stage');
      if (requestedStage && stages.some((stage) => stage.id === requestedStage)) {
        this.scene.start('StageScene', { stageId: requestedStage });
        return;
      }
    }

    this.confirmLayer = undefined;
    Music.play('title');
    addCoverBackground(this, 'background-cornfield');
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x173d2b, 0.16).setOrigin(0);
    this.add.rectangle(0, GAME_HEIGHT - 132, GAME_WIDTH, 132, 0x244b32, 0.68).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 70, '옥수수손오공', {
      color: '#fff3a6',
      fontSize: '60px',
      fontStyle: 'bold',
      stroke: '#4a2b00',
      strokeThickness: 8
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 132, '서유기 · 천축국으로 떠나는 열두 장의 모험', {
      color: '#ffffff',
      fontSize: '26px',
      fontStyle: 'bold',
      stroke: '#3b341f',
      strokeThickness: 5
    }).setOrigin(0.5);

    const hero = this.add.image(GAME_WIDTH / 2, 300, 'corn-wukong-clean-run').setDisplaySize(170, 170);
    this.tweens.add({ targets: hero, y: hero.y - 8, angle: 2, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Companions who already joined walk behind the hero on the title screen.
    const companions = StageManager.getCompanions();
    companions.forEach((name, index) => {
      const friend = this.add.image(GAME_WIDTH / 2 - 120 - index * 74, 330, companionTextures[name]).setOrigin(0.5, 0.5);
      friend.setScale(96 / friend.height);
      this.tweens.add({ targets: friend, y: friend.y - 5, duration: 700 + index * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    const cleared = StageManager.getClearedChapter();
    const status = cleared > 0
      ? `레벨 ${StageManager.getLevel()} · ${cleared} / ${StageManager.getStageCount()}장 완료 · 동료 ${companions.length}명`
      : '옥수수에서 태어난 작은 원숭이의 첫걸음';
    this.add.text(GAME_WIDTH / 2, 400, status, {
      color: '#fff8d6',
      fontSize: '21px',
      fontStyle: 'bold',
      backgroundColor: 'rgba(31, 53, 35, 0.72)',
      padding: { x: 14, y: 6 }
    }).setOrigin(0.5);

    if (StageManager.hasProgress()) {
      const continueLabel = cleared >= StageManager.getStageCount() ? '마지막 장 다시 ▶' : `제 ${Math.min(cleared + 1, StageManager.getStageCount())}장 이어하기 ▶`;
      createButton(this, GAME_WIDTH / 2 + 181, 472, continueLabel, () => this.continueJourney(), { width: 290, height: 68, fontSize: 26, primary: true });
      createButton(this, GAME_WIDTH / 2 - 65, 472, '장 고르기', () => {
        if (!this.confirmLayer) this.scene.start('ChapterSelectScene');
      }, { width: 170, height: 60, fontSize: 23, enabled: cleared > 0 });
      createButton(this, GAME_WIDTH / 2 - 246, 472, '새 여행', () => this.askNewJourney(), { width: 160, height: 60, fontSize: 23 });
    } else {
      createButton(this, GAME_WIDTH / 2, 472, '여행 시작 ▶', () => this.startNewJourney(), { width: 300, height: 72, fontSize: 30, primary: true });
    }

    this.createSettingToggle(84, 30, () => `효과음 ${Settings.sound ? '켜짐' : '꺼짐'}`, () => {
      Settings.sound = !Settings.sound;
    });
    this.createSettingToggle(GAME_WIDTH - 104, 30, () => `배경음악 ${Settings.music ? '켜짐' : '꺼짐'}`, () => {
      Settings.music = !Settings.music;
      Music.refresh();
    });

    // Enter continues a saved journey instead of silently erasing it.
    this.input.keyboard?.once('keydown-ENTER', () => {
      if (StageManager.hasProgress()) this.continueJourney();
      else this.startNewJourney();
    });
  }

  private createSettingToggle(x: number, y: number, label: () => string, toggle: () => void): void {
    const button = createButton(this, x, y, label(), () => {
      toggle();
      (button.getData('label') as Phaser.GameObjects.Text).setText(label());
    }, { width: 168, height: 44, fontSize: 18 });
  }

  private continueJourney(): void {
    this.beginPlay(StageManager.getContinueStageId());
  }

  private startNewJourney(): void {
    StageManager.resetProgress();
    this.beginPlay(StageManager.getFirstStageId());
  }

  private beginPlay(stageId: string): void {
    if (this.confirmLayer) return;
    enterFullscreen(this);
    this.scene.start('StageScene', { stageId });
  }

  // Children tap quickly; never erase a saved journey without asking.
  private askNewJourney(): void {
    if (this.confirmLayer) return;
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x120c06, 0.7).setOrigin(0).setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(0xfff3cf, 0.98).fillRoundedRect(GAME_WIDTH / 2 - 270, 130, 540, 270, 24);
    panel.lineStyle(5, 0x8a5a1a, 1).strokeRoundedRect(GAME_WIDTH / 2 - 270, 130, 540, 270, 24);
    const question = this.add.text(GAME_WIDTH / 2, 200, '처음부터 다시 할까요?\n지금까지의 여행 기록이 지워져요.', {
      color: '#4a2b00', fontSize: '26px', fontStyle: 'bold', align: 'center', lineSpacing: 10
    }).setOrigin(0.5);
    const close = () => {
      this.confirmLayer?.destroy(true);
      this.confirmLayer = undefined;
    };
    const yes = createButton(this, GAME_WIDTH / 2 - 120, 320, '네, 처음부터', () => {
      close();
      this.startNewJourney();
    }, { width: 210 });
    const no = createButton(this, GAME_WIDTH / 2 + 120, 320, '아니요', close, { width: 190, primary: true });
    this.confirmLayer = this.add.container(0, 0, [shade, panel, question, yes, no]).setDepth(100);
  }
}
