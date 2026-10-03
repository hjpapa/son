import Phaser from 'phaser';
import { Music } from '../audio/Music';
import { Sfx } from '../audio/Sfx';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { stages } from '../game/data/stages';
import { StageManager } from '../game/StageManager';
import { addCoverBackground } from '../ui/background';
import { createButton } from '../ui/Button';
import { drawStar } from '../ui/stars';

const CARD_WIDTH = 204;
const CARD_HEIGHT = 112;
const GAP = 16;

// Replay any chapter reached so far, and see the stars earned in each.
export class ChapterSelectScene extends Phaser.Scene {
  private cards = new Map<string, Phaser.GameObjects.Container>();

  constructor() {
    super('ChapterSelectScene');
  }

  create(): void {
    this.cards.clear();
    Music.play('title');
    addCoverBackground(this, 'background-cornfield');
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1d140b, 0.62).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 44, '어느 장을 다시 할까요?', {
      color: '#fff3a6', fontSize: '34px', fontStyle: 'bold', stroke: '#3b2100', strokeThickness: 6
    }).setOrigin(0.5);

    const totalStars = stages.reduce((sum, stage) => sum + StageManager.getStars(stage.id), 0);
    this.add.text(GAME_WIDTH / 2, 84, `모은 별 ${totalStars} / ${stages.length * 3}`, {
      color: '#ffe6a0', fontSize: '20px', fontStyle: 'bold', stroke: '#3b2100', strokeThickness: 4
    }).setOrigin(0.5);

    const unlockedUpTo = Math.min(stages.length, StageManager.getClearedChapter() + 1);
    const left = (GAME_WIDTH - (CARD_WIDTH * 4 + GAP * 3)) / 2;
    stages.forEach((stage, index) => {
      const x = left + (index % 4) * (CARD_WIDTH + GAP) + CARD_WIDTH / 2;
      const y = 172 + Math.floor(index / 4) * (CARD_HEIGHT + GAP);
      this.createCard(x, y, stage.id, stage.chapter, stage.title, stage.chapter <= unlockedUpTo);
    });

    createButton(this, 96, 40, '← 돌아가기', () => this.scene.start('TitleScene'), { width: 164, height: 50, fontSize: 20 });
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('TitleScene'));
  }

  private createCard(x: number, y: number, stageId: string, chapter: number, title: string, unlocked: boolean): void {
    const card = this.add.container(x, y).setSize(CARD_WIDTH, CARD_HEIGHT);
    this.cards.set(stageId, card);
    const background = this.add.graphics();
    const paint = (pressed: boolean) => {
      background.clear();
      background.fillStyle(0x000000, 0.25).fillRoundedRect(-CARD_WIDTH / 2 + 3, -CARD_HEIGHT / 2 + 5, CARD_WIDTH, CARD_HEIGHT, 16);
      background.fillStyle(unlocked ? (pressed ? 0xffe17a : 0xfff3cf) : 0x6e6352, unlocked ? 0.97 : 0.85);
      background.fillRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 16);
      background.lineStyle(3, unlocked ? 0x8a5a1a : 0x4a4236, 1).strokeRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 16);
    };
    paint(false);
    card.add(background);
    card.add(this.add.text(-CARD_WIDTH / 2 + 14, -CARD_HEIGHT / 2 + 10, `제 ${chapter}장`, {
      color: unlocked ? '#a13a22' : '#cfc3a8', fontSize: '17px', fontStyle: 'bold'
    }));
    card.add(this.add.text(0, -4, unlocked ? title : '아직 잠겨 있어요', {
      color: unlocked ? '#3d2600' : '#e6dcc4', fontSize: '18px', fontStyle: 'bold', align: 'center', wordWrap: { width: CARD_WIDTH - 20 }
    }).setOrigin(0.5));

    if (!unlocked) return;
    const stars = this.add.graphics();
    const earned = StageManager.getStars(stageId);
    for (let index = 0; index < 3; index += 1) drawStar(stars, (index - 1) * 30, CARD_HEIGHT / 2 - 20, 11, index < earned);
    card.add(stars);

    card.setInteractive({ useHandCursor: true });
    card.on('pointerdown', () => paint(true));
    card.on('pointerout', () => paint(false));
    card.on('pointerup', () => {
      Sfx.tap();
      this.scene.start('StageScene', { stageId });
    });
  }
}
