import Phaser from 'phaser';
import { stages } from '../game/data/stages';
import { StageManager } from '../game/StageManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../gameConfig';

export class TitleScene extends Phaser.Scene {
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

    this.add.image(0, 0, 'background-cornfield').setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x173d2b, 0.16).setOrigin(0);
    this.add.rectangle(0, GAME_HEIGHT - 120, GAME_WIDTH, 120, 0x244b32, 0.68).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 74, '옥수수손오공', {
      color: '#fff3a6',
      fontSize: '54px',
      fontStyle: 'bold',
      stroke: '#4a2b00',
      strokeThickness: 7
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 133, '서유기 · 천축국으로 떠나는 열두 장의 모험', {
      color: '#ffffff',
      fontSize: '26px',
      fontStyle: 'bold',
      stroke: '#3b341f',
      strokeThickness: 5
    }).setOrigin(0.5);

    const hero = this.add.image(GAME_WIDTH / 2, 318, 'corn-wukong-clean-run').setDisplaySize(172, 172);
    this.tweens.add({
      targets: hero,
      y: hero.y - 8,
      angle: 2,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const cleared = StageManager.getClearedChapter();
    const companions = StageManager.getCompanions();
    this.add.text(GAME_WIDTH / 2, 397, cleared > 0 ? `레벨 ${StageManager.getLevel()} · 여행 ${cleared} / ${StageManager.getStageCount()}장 · 동료 ${companions.length}명` : '레벨 1 · 옥수수밭에서 시작되는 작은 영웅의 첫걸음', {
      color: '#fff8d6',
      fontSize: '19px',
      fontStyle: 'bold',
      backgroundColor: 'rgba(31, 53, 35, 0.68)',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5);

    this.createButton(GAME_WIDTH / 2 - 150, 456, '새 여행', () => {
      StageManager.resetProgress();
      this.scene.start('StageScene', { stageId: StageManager.getFirstStageId() });
    });

    const continueLabel = cleared >= StageManager.getStageCount() ? '마지막 장' : '이어하기';
    this.createButton(GAME_WIDTH / 2 + 150, 456, continueLabel, () => {
      this.scene.start('StageScene', { stageId: StageManager.getContinueStageId() });
    }, StageManager.hasProgress());

    this.input.keyboard?.once('keydown-ENTER', () => {
      StageManager.resetProgress();
      this.scene.start('StageScene', { stageId: StageManager.getFirstStageId() });
    });
    this.input.keyboard?.once('keydown-C', () => {
      this.scene.start('StageScene', { stageId: StageManager.getContinueStageId() });
    });
  }

  private createButton(x: number, y: number, label: string, onClick: () => void, enabled = true): void {
    const button = this.add
      .rectangle(x, y, 220, 54, enabled ? 0xffffff : 0xd9d1b6, enabled ? 0.78 : 0.48)
      .setStrokeStyle(3, enabled ? 0x6e4300 : 0x81745f);
    const text = this.add
      .text(x, y, label, {
        color: enabled ? '#3d2600' : '#766a56',
        fontSize: '24px',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    if (!enabled) {
      return;
    }

    button.setInteractive();
    text.setInteractive();
    button.on('pointerover', () => button.setFillStyle(0xffedaa, 0.95));
    button.on('pointerout', () => button.setFillStyle(0xffffff, 0.78));
    button.on('pointerdown', onClick);
    text.on('pointerdown', onClick);
  }
}
