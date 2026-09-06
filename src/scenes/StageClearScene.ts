import Phaser from 'phaser';
import { getStage } from '../game/data/stages';
import { StageManager } from '../game/StageManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../gameConfig';

type StageClearInit = {
  stageId: string;
};

export class StageClearScene extends Phaser.Scene {
  private stageId = StageManager.getFirstStageId();

  constructor() {
    super('StageClearScene');
  }

  init(data: StageClearInit): void {
    this.stageId = data.stageId;
  }

  create(): void {
    const stage = getStage(this.stageId);
    const backgroundKey = `background-${stage.backgroundKey}`;
    if (this.textures.exists(backgroundKey)) {
      this.add.image(0, 0, backgroundKey).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    }
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xfff3cc, 0.76).setOrigin(0);
    this.add.rectangle(0, GAME_HEIGHT - 116, GAME_WIDTH, 116, 0x477648, 0.58).setOrigin(0);

    this.add.text(GAME_WIDTH / 2, 78, `제 ${stage.chapter}장 완료!`, {
      color: '#3d2600',
      fontSize: '42px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 137, stage.title, {
      color: '#5b3900',
      fontSize: '28px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 188, `레벨 ${StageManager.getLevel()} · 서쪽으로 가는 길 ${stage.chapter} / ${StageManager.getStageCount()}`, {
      color: '#5b3900',
      fontSize: '19px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const trackWidth = 600;
    const trackX = (GAME_WIDTH - trackWidth) / 2;
    this.add.rectangle(GAME_WIDTH / 2, 229, trackWidth, 8, 0x8c753e, 0.45);
    for (let index = 0; index < StageManager.getStageCount(); index += 1) {
      const x = trackX + (trackWidth * index) / (StageManager.getStageCount() - 1);
      this.add.circle(x, 229, index < stage.chapter ? 9 : 6, index < stage.chapter ? 0x4f8f45 : 0xd8bc70)
        .setStrokeStyle(2, 0x684418);
    }

    this.add.text(GAME_WIDTH / 2, 277, `이번 장의 마음: ${stage.lesson}`, {
      color: '#3d2600',
      fontSize: '20px',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 720 }
    }).setOrigin(0.5);

    if (stage.companionUnlock) {
      this.add.text(GAME_WIDTH / 2, 319, `새 동료 합류: ${stage.companionUnlock}`, {
        color: '#8a2f24', fontSize: '21px', fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    this.createButton(GAME_WIDTH / 2, 377, `제 ${stage.chapter + 1}장으로`, () => this.startNextStage(stage.nextStageId));
    this.createButton(GAME_WIDTH / 2, 447, '처음 화면', () => this.scene.start('TitleScene'));

    this.input.keyboard?.once('keydown-ENTER', () => this.startNextStage(stage.nextStageId));
  }

  private startNextStage(nextStageId?: string): void {
    this.scene.start('StageScene', { stageId: nextStageId ?? StageManager.getFirstStageId() });
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add.rectangle(x, y, 260, 54, 0xffffff, 0.78).setStrokeStyle(3, 0x6e4300).setInteractive();
    const text = this.add.text(x, y, label, {
      color: '#3d2600',
      fontSize: '24px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    button.on('pointerover', () => button.setFillStyle(0xffedaa, 0.95));
    button.on('pointerout', () => button.setFillStyle(0xffffff, 0.78));
    button.on('pointerdown', onClick);
    text.setInteractive().on('pointerdown', onClick);
  }
}
