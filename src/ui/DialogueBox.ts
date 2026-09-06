import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../gameConfig';

export class DialogueBox {
  private panel: Phaser.GameObjects.Rectangle;
  private speaker: Phaser.GameObjects.Text;
  private text: Phaser.GameObjects.Text;
  private progress: Phaser.GameObjects.Text;
  private prompt: Phaser.GameObjects.Text;
  private portrait: Phaser.GameObjects.Image;
  private lines: string[] = [];
  private index = 0;
  private onComplete?: () => void;
  private visible = false;
  private canAdvanceAt = 0;
  private resumePhysics = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.panel = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 92, GAME_WIDTH - 64, 160, 0x101010, 0.9)
      .setScrollFactor(0)
      .setDepth(2000)
      .setVisible(false)
      .setStrokeStyle(3, 0xffd24a, 0.9);

    this.speaker = scene.add
      .text(52, GAME_HEIGHT - 157, '', {
        color: '#ffdf73',
        fontSize: '18px',
        fontStyle: 'bold'
      })
      .setScrollFactor(0)
      .setDepth(2001)
      .setVisible(false);

    this.text = scene.add
      .text(152, GAME_HEIGHT - 126, '', {
        color: '#ffffff',
        fontSize: '20px',
        fontStyle: 'bold',
        lineSpacing: 6,
        wordWrap: { width: GAME_WIDTH - 212, useAdvancedWrap: true }
      })
      .setScrollFactor(0)
      .setDepth(2001)
      .setVisible(false);

    this.portrait = scene.add.image(95, GAME_HEIGHT - 82, 'corn-wukong-clean-idle')
      .setDisplaySize(76, 92).setScrollFactor(0).setDepth(2001).setVisible(false);

    this.progress = scene.add
      .text(GAME_WIDTH - 52, GAME_HEIGHT - 154, '', {
        color: '#d7cfb8',
        fontSize: '14px',
        fontStyle: 'bold'
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(2001)
      .setVisible(false);

    this.prompt = scene.add
      .text(GAME_WIDTH - 52, GAME_HEIGHT - 32, '▶', {
        color: '#ffdf73',
        fontSize: '18px',
        fontStyle: 'bold'
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(2001)
      .setVisible(false);

    scene.input.on('pointerdown', this.advance, this);
    scene.input.keyboard?.on('keydown-ENTER', this.advance, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  get isOpen(): boolean {
    return this.visible;
  }

  show(lines: string[], onComplete?: () => void): void {
    if (!this.visible) this.resumePhysics = !this.scene.physics.world.isPaused;
    this.scene.physics.world.pause();
    this.lines = (lines.length > 0 ? lines : ['...']).flatMap((line) => this.paginate(line));
    this.index = 0;
    this.onComplete = onComplete;
    this.visible = true;
    this.panel.setVisible(true);
    this.speaker.setVisible(true);
    this.text.setVisible(true);
    this.progress.setVisible(true);
    this.prompt.setVisible(true);
    this.portrait.setVisible(true);
    this.renderLine();
  }

  private paginate(line: string): string[] {
    const match = line.match(/^([^:：]{1,12})[:：]\s*(.+)$/);
    const prefix = match ? `${match[1]}: ` : '';
    const wrapped = this.text.getWrappedText(match?.[2] ?? line);
    const pages: string[] = [];
    for (let index = 0; index < wrapped.length; index += 3) {
      pages.push(prefix + wrapped.slice(index, index + 3).join('\n'));
    }
    return pages.length ? pages : [line];
  }

  private advance(event?: { y?: number }): void {
    if (!this.visible) {
      return;
    }
    if (this.scene.time.now < this.canAdvanceAt) {
      return;
    }

    this.index += 1;
    if (this.index >= this.lines.length) {
      this.close();
      return;
    }

    this.renderLine();
  }

  private renderLine(): void {
    const rawLine = this.lines[this.index];
    const speakerMatch = rawLine.match(/^([^:：]{1,12})[:：]\s*([\s\S]+)$/);
    this.speaker.setText(speakerMatch?.[1] ?? '이야기');
    const portraits: Record<string, string> = {
      '손오공': 'corn-wukong-clean-idle', '그림자 손오공': 'boss-shadow',
      '삼장법사': 'companion-samjang', '저팔계': 'companion-bajie', '사오정': 'companion-sandy',
      '혼세마왕': 'boss-honse', '용궁 수문장': 'boss-gatekeeper', '동해 용왕': 'npc-dragon',
      '이랑진군': 'boss-erlang', '부처님': 'npc-buddha', '관음보살': 'npc-guanyin',
      '황풍대왕': 'boss-yellowwind', '호선봉': 'boss-tiger', '진흙 요괴': 'boss-mud'
    };
    const portrait = portraits[speakerMatch?.[1] ?? ''] ?? 'corn-wukong-clean-idle';
    this.portrait.setTexture(portrait).setDisplaySize(portrait === 'corn-wukong-clean-idle' ? 76 : 92, 92);
    this.text.setText(speakerMatch?.[2] ?? rawLine);
    this.progress.setText(`${this.index + 1} / ${this.lines.length}`);
    this.canAdvanceAt = this.scene.time.now + 160;
  }

  private close(): void {
    this.visible = false;
    if (this.resumePhysics) this.scene.physics.world.resume();
    this.resumePhysics = false;
    this.panel.setVisible(false);
    this.speaker.setVisible(false);
    this.text.setVisible(false);
    this.progress.setVisible(false);
    this.prompt.setVisible(false);
    this.portrait.setVisible(false);
    const complete = this.onComplete;
    this.onComplete = undefined;
    complete?.();
  }

  private destroy(): void {
    if (this.resumePhysics) this.scene.physics.world?.resume();
    this.resumePhysics = false;
    this.scene.input.off('pointerdown', this.advance, this);
    this.scene.input.keyboard?.off('keydown-ENTER', this.advance, this);
  }
}
