import Phaser from 'phaser';
import { Music } from '../audio/Music';
import { Sfx } from '../audio/Sfx';
import { getStage } from '../game/data/stages';
import { PlayTime } from '../game/playTime';
import { StageManager } from '../game/StageManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { createButton } from '../ui/Button';
import { companionTextures, companionSkills } from '../game/data/companions';
import { addCoverBackground } from '../ui/background';
import { bakedImage } from '../ui/bake';
import { starTexture } from '../ui/stars';

type StageClearInit = {
  stageId: string;
  coins?: number;
  totalCoins?: number;
  stars?: number;
  arcade?: string;
};

// Short pause before buttons work, so the tap that closed the last
// dialogue cannot skip this screen by accident.
const INPUT_DELAY_MS = 700;

export class StageClearScene extends Phaser.Scene {
  private stageId = StageManager.getFirstStageId();
  private result: StageClearInit = { stageId: this.stageId };
  // True while the break suggestion is open (or about to open).
  private breakPanel = false;

  constructor() {
    super('StageClearScene');
  }

  init(data: StageClearInit): void {
    this.stageId = data.stageId;
    this.result = data;
    this.breakPanel = false;
  }

  create(): void {
    const stage = getStage(this.stageId);
    Music.play('journey');
    const total = StageManager.getStageCount();
    const backgroundKey = `background-${stage.backgroundKey}`;
    if (this.textures.exists(backgroundKey)) {
      addCoverBackground(this, backgroundKey);
    }
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xfff3cc, 0.8).setOrigin(0);

    const heading = this.add.text(GAME_WIDTH / 2, 48, `제 ${stage.chapter}장 완료!`, {
      color: '#3d2600', fontSize: '46px', fontStyle: 'bold', stroke: '#fff7d6', strokeThickness: 6
    }).setOrigin(0.5);
    this.tweens.add({ targets: heading, scale: { from: 0.7, to: 1 }, duration: 520, ease: 'Back.easeOut' });
    this.add.text(GAME_WIDTH / 2, 94, stage.title, { color: '#5b3900', fontSize: '26px', fontStyle: 'bold' }).setOrigin(0.5);

    this.showStars();
    this.drawJourneyMap(stage.chapter, total);
    // Challenge chapters never add a companion, so the result gets that free
    // row instead of squeezing between the journey map and the lesson.
    if (this.result.arcade) {
      this.add.text(GAME_WIDTH / 2, stage.companionUnlock ? 248 : 384, `도전 기록 · ${this.result.arcade}`, {
        color: '#fff8d6', fontSize: '21px', fontStyle: 'bold', backgroundColor: '#7a4f1d', padding: { x: 16, y: 7 }
      }).setOrigin(0.5);
    }

    bakedImage(this, `lesson-panel-${GAME_WIDTH}`, { x: GAME_WIDTH / 2 - 332, y: 260, width: 664, height: 82 }, (g) => {
      g.fillStyle(0xf6e2a8, 0.95).fillRoundedRect(GAME_WIDTH / 2 - 330, 262, 660, 78, 16);
      g.lineStyle(3, 0x9a6a2a, 1).strokeRoundedRect(GAME_WIDTH / 2 - 330, 262, 660, 78, 16);
    });
    this.add.text(GAME_WIDTH / 2, 274, '이번 장의 마음', { color: '#a13a22', fontSize: '17px', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.add.text(GAME_WIDTH / 2, 300, stage.lesson, {
      color: '#3d2600', fontSize: '22px', fontStyle: 'bold', align: 'center', wordWrap: { width: 620 }
    }).setOrigin(0.5, 0);

    if (stage.companionUnlock) {
      const friend = this.add.image(GAME_WIDTH / 2 - 150, 380, companionTextures[stage.companionUnlock]);
      friend.setScale(64 / friend.height);
      this.tweens.add({ targets: friend, y: friend.y - 6, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.add.text(GAME_WIDTH / 2 - 108, 380, `새 동료 합류: ${stage.companionUnlock}!`, {
        color: '#8a2f24', fontSize: '24px', fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      this.add.text(GAME_WIDTH / 2, 415, companionSkills[stage.companionUnlock].description, {
        color: '#5b3900', fontSize: '17px', fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    let ready = false;
    this.time.delayedCall(INPUT_DELAY_MS, () => {
      ready = true;
    });
    const next = () => {
      if (!ready || this.breakPanel) return;
      this.scene.start('StageScene', { stageId: stage.nextStageId ?? StageManager.getFirstStageId() });
    };
    createButton(this, GAME_WIDTH / 2 + 110, 462, `제 ${stage.chapter + 1}장으로 ▶`, next, { width: 280, height: 70, fontSize: 28, primary: true });
    createButton(this, GAME_WIDTH / 2 - 170, 462, '처음 화면', () => {
      if (!ready || this.breakPanel) return;
      this.scene.start('TitleScene');
    }, { width: 180 });

    this.input.keyboard?.on('keydown-ENTER', next);

    if (PlayTime.breakDue) {
      this.breakPanel = true;
      this.time.delayedCall(900, () => this.suggestBreak());
    }
  }

  // After 30 minutes of play, a gentle suggestion to rest eyes and body.
  private suggestBreak(): void {
    PlayTime.reset();
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x120c06, 0.72).setOrigin(0).setInteractive();
    const panel = bakedImage(this, `break-panel-${GAME_WIDTH}`, { x: GAME_WIDTH / 2 - 293, y: 87, width: 586, height: 366 }, (g) => {
      g.fillStyle(0xfff3cf, 0.98).fillRoundedRect(GAME_WIDTH / 2 - 290, 90, 580, 360, 26);
      g.lineStyle(5, 0x8a5a1a, 1).strokeRoundedRect(GAME_WIDTH / 2 - 290, 90, 580, 360, 26);
    });
    const hero = this.add.image(GAME_WIDTH / 2, 176, 'corn-wukong-clean-idle');
    hero.setScale(100 / hero.height);
    const message = this.add.text(GAME_WIDTH / 2, 286, ['30분 동안 신나게 모험했어요!', '잠깐 눈을 쉬고, 물 한 잔 마시고,', '기지개를 쭉 켜 볼까요?'], {
      color: '#4a2b00', fontSize: '24px', fontStyle: 'bold', align: 'center', lineSpacing: 8
    }).setOrigin(0.5);
    const close = () => {
      for (const item of [shade, panel, hero, message, rest, more]) item.destroy();
      this.breakPanel = false;
    };
    const rest = createButton(this, GAME_WIDTH / 2 - 130, 396, '쉬었다 올게요', () => this.scene.start('TitleScene'), { width: 220, primary: true });
    const more = createButton(this, GAME_WIDTH / 2 + 130, 396, '조금만 더 할래요', close, { width: 220, fontSize: 22 });
  }

  // Stars pop in one by one, with the corn coin count beside them.
  private showStars(): void {
    const { stars = 1, coins = 0, totalCoins = 0 } = this.result;
    const y = 140;
    for (let index = 0; index < 3; index += 1) {
      const star = this.add.image(GAME_WIDTH / 2 - 150 + index * 50, y, starTexture(this, 21, index < stars));
      star.setScale(0);
      this.tweens.add({
        targets: star,
        scale: 1,
        delay: 300 + index * 260,
        duration: 320,
        ease: 'Back.easeOut',
        onStart: () => {
          if (index < stars) Sfx.coin();
        }
      });
    }
    this.add.image(GAME_WIDTH / 2 + 10, y, 'corn-coin').setScale(0.9);
    const count = this.add.text(GAME_WIDTH / 2 + 30, y, `${coins} / ${totalCoins}`, { color: '#5b3900', fontSize: '24px', fontStyle: 'bold' }).setOrigin(0, 0.5);
    const hint = stars >= 3 ? '코인을 모두 모았어요!' : stars === 2 ? '코인을 모두 모으면 별 셋!' : '코인을 절반 모으면 별 둘!';
    this.add.text(count.x + count.width + 16, y, hint, { color: '#8a5a1a', fontSize: '17px', fontStyle: 'bold' }).setOrigin(0, 0.5);
  }

  // The road west: 화과산 on the left, 천축국 on the right, hero on today's stop.
  private drawJourneyMap(chapter: number, total: number): void {
    const left = 170;
    const right = GAME_WIDTH - 170;
    const y = 228;
    const reached = Math.max(chapter, StageManager.getClearedChapter());
    const road = this.add.graphics();
    road.lineStyle(12, 0xc9a05a, 0.7).lineBetween(left, y, right, y);
    road.lineStyle(4, 0xfff3c0, 0.9).lineBetween(left, y, right, y);
    this.add.text(left - 18, y, '화과산', { color: '#5b3900', fontSize: '17px', fontStyle: 'bold' }).setOrigin(1, 0.5);
    this.add.text(right + 18, y, '천축국', { color: '#5b3900', fontSize: '17px', fontStyle: 'bold' }).setOrigin(0, 0.5);

    for (let index = 0; index < total; index += 1) {
      const x = left + ((right - left) * index) / (total - 1);
      const done = index < reached;
      this.add.circle(x, y, done ? 11 : 8, done ? 0x4f8f45 : 0xe8d6a0).setStrokeStyle(3, 0x684418);
    }

    const heroX = left + ((right - left) * (chapter - 1)) / (total - 1);
    const hero = this.add.image(heroX, y - 14, 'corn-wukong-clean-idle').setOrigin(0.5, 1);
    hero.setScale(54 / hero.height);
    this.tweens.add({ targets: hero, y: hero.y - 8, duration: 360, yoyo: true, repeat: -1, ease: 'Sine.easeOut' });
  }
}
