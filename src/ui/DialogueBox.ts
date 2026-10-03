import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';

const PANEL_HEIGHT = 178;
const PANEL_TOP = GAME_HEIGHT - PANEL_HEIGHT - 12;
const TEXT_LEFT = 178;
const LINES_PER_PAGE = 3;
const TYPE_DELAY_MS = 30;
// Children often keep tapping the attack button when a dialogue pops up.
// Ignore taps briefly so the first page is not skipped before it is read.
const OPEN_GUARD_MS = 450;
const PAGE_GUARD_MS = 220;

const portraits: Record<string, string> = {
  '손오공': 'corn-wukong-clean-idle',
  '그림자 손오공': 'boss-shadow',
  '삼장법사': 'companion-samjang',
  '저팔계': 'companion-bajie',
  '사오정': 'companion-sandy',
  '혼세마왕': 'boss-honse',
  '용궁 수문장': 'boss-gatekeeper',
  '동해 용왕': 'npc-dragon',
  '이랑진군': 'boss-erlang',
  '부처님': 'npc-buddha',
  '관음보살': 'npc-guanyin',
  '영길보살': 'npc-guanyin',
  '황풍대왕': 'boss-yellowwind',
  '호선봉': 'boss-tiger',
  '진흙 요괴': 'boss-mud',
  '원숭이 친구': 'enemy-stone-monkey'
};

type Page = { speaker?: string; text: string };

export class DialogueBox {
  private panel: Phaser.GameObjects.Graphics;
  private nameTag: Phaser.GameObjects.Text;
  private text: Phaser.GameObjects.Text;
  private progress: Phaser.GameObjects.Text;
  private prompt: Phaser.GameObjects.Text;
  private portrait: Phaser.GameObjects.Image;
  private lines: Page[] = [];
  private index = 0;
  private onComplete?: () => void;
  private visible = false;
  private canAdvanceAt = 0;
  private resumePhysics = false;
  private typing?: Phaser.Time.TimerEvent;
  private fullText = '';

  constructor(private readonly scene: Phaser.Scene) {
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(2000).setVisible(false);
    this.panel.fillStyle(0x1d140b, 0.92).fillRoundedRect(20, PANEL_TOP, GAME_WIDTH - 40, PANEL_HEIGHT, 18);
    this.panel.lineStyle(4, 0xffd24a, 0.95).strokeRoundedRect(20, PANEL_TOP, GAME_WIDTH - 40, PANEL_HEIGHT, 18);
    this.panel.fillStyle(0xfff3c9, 0.14).fillRoundedRect(38, PANEL_TOP + 22, 124, 134, 14);

    this.portrait = scene.add.image(100, PANEL_TOP + 90, 'story-scroll').setScrollFactor(0).setDepth(2001).setVisible(false);

    this.nameTag = scene.add
      .text(TEXT_LEFT, PANEL_TOP - 16, '', {
        color: '#3b2100',
        fontSize: '21px',
        fontStyle: 'bold',
        backgroundColor: '#ffd75e',
        padding: { x: 12, y: 5 }
      })
      .setScrollFactor(0)
      .setDepth(2002)
      .setVisible(false);

    this.text = scene.add
      .text(TEXT_LEFT, PANEL_TOP + 30, '', {
        color: '#ffffff',
        fontSize: '25px',
        fontStyle: 'bold',
        lineSpacing: 10,
        wordWrap: { width: GAME_WIDTH - TEXT_LEFT - 70, useAdvancedWrap: true }
      })
      .setScrollFactor(0)
      .setDepth(2001)
      .setVisible(false);

    this.progress = scene.add
      .text(GAME_WIDTH - 44, PANEL_TOP + 12, '', { color: '#d7cfb8', fontSize: '16px', fontStyle: 'bold' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(2001)
      .setVisible(false);

    this.prompt = scene.add
      .text(GAME_WIDTH - 44, PANEL_TOP + PANEL_HEIGHT - 16, '다음 ▶', { color: '#ffdf73', fontSize: '20px', fontStyle: 'bold' })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(2001)
      .setVisible(false);
    scene.tweens.add({ targets: this.prompt, x: '+=6', duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    scene.input.on('pointerdown', this.advance, this);
    scene.input.keyboard?.on('keydown-ENTER', this.onKey, this);
    scene.input.keyboard?.on('keydown-SPACE', this.onKey, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  get isOpen(): boolean {
    return this.visible;
  }

  get panelBottom(): number {
    return PANEL_TOP + PANEL_HEIGHT;
  }

  show(lines: string[], onComplete?: () => void): void {
    if (!this.visible) this.resumePhysics = !this.scene.physics.world.isPaused;
    this.scene.physics.world.pause();
    this.lines = (lines.length > 0 ? lines : ['...']).flatMap((line) => this.paginate(line));
    this.index = 0;
    this.onComplete = onComplete;
    this.visible = true;
    for (const item of [this.panel, this.nameTag, this.text, this.progress, this.portrait]) item.setVisible(true);
    this.renderLine();
    this.canAdvanceAt = this.scene.time.now + OPEN_GUARD_MS;
  }

  // Shows the whole current page at once (also used by tests).
  completeTyping(): void {
    this.typing?.remove(false);
    this.typing = undefined;
    this.text.setText(this.fullText);
    this.prompt.setVisible(true);
  }

  private paginate(line: string): Page[] {
    const match = line.match(/^([^:：]{1,12})[:：]\s*(.+)$/);
    const speaker = match?.[1];
    const wrapped = this.text.getWrappedText(match?.[2] ?? line);
    const pages: Page[] = [];
    for (let index = 0; index < wrapped.length; index += LINES_PER_PAGE) {
      pages.push({ speaker, text: wrapped.slice(index, index + LINES_PER_PAGE).join('\n') });
    }
    return pages.length ? pages : [{ speaker, text: line }];
  }

  private onKey(event: KeyboardEvent): void {
    if (!event.repeat) this.advance();
  }

  private advance(): void {
    if (!this.visible) return;
    if (this.typing) {
      this.completeTyping();
      this.canAdvanceAt = Math.max(this.canAdvanceAt, this.scene.time.now + PAGE_GUARD_MS);
      return;
    }
    if (this.scene.time.now < this.canAdvanceAt) return;

    this.index += 1;
    if (this.index >= this.lines.length) {
      this.close();
      return;
    }
    this.renderLine();
  }

  private renderLine(): void {
    const page = this.lines[this.index];
    this.nameTag.setText(page.speaker ?? '이야기');
    const portrait = portraits[page.speaker ?? ''] ?? (page.speaker ? 'corn-wukong-clean-idle' : 'story-scroll');
    const source = this.scene.textures.get(portrait).getSourceImage();
    const scale = Math.min(112 / source.width, 120 / source.height);
    this.portrait.setTexture(portrait).setScale(scale);
    this.progress.setText(`${this.index + 1} / ${this.lines.length}`);

    // Reveal the page letter by letter; the text is pre-wrapped so words
    // never jump between lines while typing.
    this.fullText = page.text;
    this.typing?.remove(false);
    this.prompt.setVisible(false);
    this.text.setText('');
    const characters = Array.from(page.text);
    let shown = 0;
    this.typing = this.scene.time.addEvent({
      delay: TYPE_DELAY_MS,
      repeat: characters.length - 1,
      callback: () => {
        shown += 1;
        this.text.setText(characters.slice(0, shown).join(''));
        if (shown >= characters.length) {
          this.typing = undefined;
          this.prompt.setVisible(true);
        }
      }
    });
    this.canAdvanceAt = this.scene.time.now + PAGE_GUARD_MS;
  }

  private close(): void {
    this.visible = false;
    this.typing?.remove(false);
    this.typing = undefined;
    if (this.resumePhysics) this.scene.physics.world.resume();
    this.resumePhysics = false;
    for (const item of [this.panel, this.nameTag, this.text, this.progress, this.prompt, this.portrait]) item.setVisible(false);
    const complete = this.onComplete;
    this.onComplete = undefined;
    complete?.();
  }

  private destroy(): void {
    if (this.resumePhysics) this.scene.physics.world?.resume();
    this.resumePhysics = false;
    this.scene.input.off('pointerdown', this.advance, this);
    this.scene.input.keyboard?.off('keydown-ENTER', this.onKey, this);
    this.scene.input.keyboard?.off('keydown-SPACE', this.onKey, this);
  }
}
