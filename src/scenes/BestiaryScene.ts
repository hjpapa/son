import Phaser from 'phaser';
import { Music } from '../audio/Music';
import { Sfx } from '../audio/Sfx';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { bestiary } from '../game/data/bestiary';
import { stages } from '../game/data/stages';
import { StageManager } from '../game/StageManager';
import { addCoverBackground } from '../ui/background';
import { createButton } from '../ui/Button';

const CARD_WIDTH = 188;
const CARD_HEIGHT = 300;
const SWIPE_DISTANCE = 60;

// 요괴 도감: one chapter per page. Monsters not met yet are shadows with "???".
export class BestiaryScene extends Phaser.Scene {
  private chapters: number[] = [];
  private page = 0;
  private pageLayer?: Phaser.GameObjects.Container;
  private dots?: Phaser.GameObjects.Graphics;

  constructor() {
    super('BestiaryScene');
  }

  create(): void {
    Music.play('title');
    this.chapters = [...new Set(bestiary.map((entry) => entry.chapter))];
    this.page = 0;
    this.pageLayer = undefined;
    addCoverBackground(this, 'background-cornfield');
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1d140b, 0.66).setOrigin(0);

    const discovered = StageManager.getDiscovered();
    const found = bestiary.filter((entry) => discovered.has(entry.key)).length;
    this.add.text(GAME_WIDTH / 2, 36, '요괴 도감', {
      color: '#fff3a6', fontSize: '34px', fontStyle: 'bold', stroke: '#3b2100', strokeThickness: 6
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH - 24, 36, `발견 ${found} / ${bestiary.length}`, {
      color: '#ffe6a0', fontSize: '20px', fontStyle: 'bold', stroke: '#3b2100', strokeThickness: 4
    }).setOrigin(1, 0.5);

    createButton(this, 96, 36, '← 돌아가기', () => this.scene.start('TitleScene'), { width: 164, height: 50, fontSize: 20 });
    createButton(this, 46, 290, '◀', () => this.turn(-1), { width: 64, height: 90, fontSize: 30 });
    createButton(this, GAME_WIDTH - 46, 290, '▶', () => this.turn(1), { width: 64, height: 90, fontSize: 30 });
    this.dots = this.add.graphics();

    // Swiping left or right also turns the page.
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const dx = pointer.upX - pointer.downX;
      if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(pointer.upY - pointer.downY)) this.turn(dx < 0 ? 1 : -1);
    });
    this.input.keyboard?.on('keydown-LEFT', () => this.turn(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.turn(1));
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('TitleScene'));
    this.showPage();
  }

  private turn(step: number): void {
    const next = Phaser.Math.Clamp(this.page + step, 0, this.chapters.length - 1);
    if (next === this.page) return;
    Sfx.tap();
    this.page = next;
    this.showPage();
  }

  private showPage(): void {
    this.pageLayer?.destroy();
    const chapter = this.chapters[this.page];
    const stage = stages.find((item) => item.chapter === chapter)!;
    const entries = bestiary.filter((entry) => entry.chapter === chapter);
    const discovered = StageManager.getDiscovered();
    const layer = this.add.container(0, 0);
    this.pageLayer = layer;

    layer.add(this.add.text(GAME_WIDTH / 2, 86, `제 ${chapter}장 · ${stage.title}`, {
      color: '#ffffff', fontSize: '24px', fontStyle: 'bold', stroke: '#3b2100', strokeThickness: 5
    }).setOrigin(0.5));

    const gap = 14;
    const left = (GAME_WIDTH - (entries.length * CARD_WIDTH + (entries.length - 1) * gap)) / 2;
    entries.forEach((entry, index) => {
      const x = left + index * (CARD_WIDTH + gap) + CARD_WIDTH / 2;
      const y = 290;
      const known = discovered.has(entry.key);
      const card = this.add.graphics();
      card.fillStyle(0x000000, 0.25).fillRoundedRect(x - CARD_WIDTH / 2 + 3, y - CARD_HEIGHT / 2 + 5, CARD_WIDTH, CARD_HEIGHT, 18);
      card.fillStyle(known ? 0xfff3cf : 0x5e5446, 0.97).fillRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 18);
      card.lineStyle(4, entry.boss ? 0xc23b22 : 0x8a5a1a, 1).strokeRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 18);
      layer.add(card);

      const picture = this.add.image(x, y - 50, entry.key);
      picture.setScale(150 / picture.height);
      if (!known) picture.setTintFill(0x2a2118).setAlpha(0.85);
      layer.add(picture);
      if (entry.boss) {
        layer.add(this.add.text(x + CARD_WIDTH / 2 - 12, y - CARD_HEIGHT / 2 + 10, '보스', {
          color: '#ffffff', fontSize: '15px', fontStyle: 'bold', backgroundColor: '#c23b22', padding: { x: 8, y: 3 }
        }).setOrigin(1, 0));
      }
      layer.add(this.add.text(x, y + 52, known ? entry.name : '???', {
        color: known ? '#3d2600' : '#e6dcc4', fontSize: '22px', fontStyle: 'bold'
      }).setOrigin(0.5));
      layer.add(this.add.text(x, y + 98, known ? entry.note : '아직 만나지 못했어요', {
        color: known ? '#6c4515' : '#cfc3a8', fontSize: '16px', fontStyle: 'bold', align: 'center', wordWrap: { width: CARD_WIDTH - 26 }
      }).setOrigin(0.5));
    });

    // Page dots.
    this.dots?.clear();
    const dotsLeft = GAME_WIDTH / 2 - ((this.chapters.length - 1) * 18) / 2;
    this.chapters.forEach((_, index) => {
      this.dots?.fillStyle(index === this.page ? 0xffd24a : 0x8a7a5a, 1).fillCircle(dotsLeft + index * 18, GAME_HEIGHT - 26, index === this.page ? 6 : 4);
    });
  }
}
