import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import type { PlayerInputState } from '../types/InputState';

type ControlName = 'left' | 'right' | 'jump' | 'attack';
type Button = { control: ControlName; x: number; y: number; radius: number; graphics: Phaser.GameObjects.Graphics; label?: Phaser.GameObjects.Text };

// Holding the attack button keeps swinging, so small hands don't need to mash.
const ATTACK_REPEAT_MS = 420;
// Touches slightly outside a circle still count; thumbs are imprecise.
const TOUCH_SLOP = 18;

export class MobileControls {
  private held = new Map<number, ControlName>();
  private queued = { jump: false, attack: false };
  private buttons: Button[] = [];
  private nextAttackAt = 0;
  private visible: boolean;

  constructor(private readonly scene: Phaser.Scene) {
    const y = GAME_HEIGHT - 82;
    this.addButton('left', 92, y, 56);
    this.addButton('right', 222, y, 56);
    this.addButton('jump', GAME_WIDTH - 226, y + 4, 54, '점프');
    this.addButton('attack', GAME_WIDTH - 92, y - 10, 64, '공격');

    // Show the buttons on touch devices, and on any device as soon as it is touched.
    this.visible = scene.sys.game.device.input.touch;
    this.setVisible(this.visible);

    scene.input.on('pointerdown', this.track, this);
    scene.input.on('pointermove', this.track, this);
    scene.input.on('pointerup', this.release, this);
    scene.input.on('pointerupoutside', this.release, this);
    scene.game.events.on(Phaser.Core.Events.BLUR, this.reset, this);
    scene.events.on(Phaser.Scenes.Events.RESUME, this.reset, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  getInput(): PlayerInputState {
    const state = { left: false, right: false, down: false, jump: this.queued.jump, attack: this.queued.attack };
    for (const control of this.held.values()) {
      if (control === 'left' || control === 'right') state[control] = true;
    }
    const now = this.scene.time.now;
    if ([...this.held.values()].includes('attack') && now >= this.nextAttackAt) {
      state.attack = true;
      this.nextAttackAt = now + ATTACK_REPEAT_MS;
    }
    this.queued = { jump: false, attack: false };
    return state;
  }

  reset(): void {
    this.held.clear();
    this.queued = { jump: false, attack: false };
    this.redraw();
  }

  private addButton(control: ControlName, x: number, y: number, radius: number, text?: string): void {
    const graphics = this.scene.add.graphics().setScrollFactor(0).setDepth(1000);
    const label = text
      ? this.scene.add.text(x, y + radius * 0.42, text, { color: '#3a2600', fontSize: '17px', fontStyle: 'bold' })
        .setOrigin(0.5).setScrollFactor(0).setDepth(1001)
      : undefined;
    this.buttons.push({ control, x, y, radius, graphics, label });
    this.paint(this.buttons[this.buttons.length - 1], false);
  }

  private paint(button: Button, active: boolean): void {
    const { graphics: g, x, y, radius: r, control } = button;
    const scale = active ? 0.94 : 1;
    const radius = r * scale;
    g.clear();
    g.fillStyle(0x000000, 0.18).fillCircle(x + 3, y + 5, radius);
    g.fillStyle(active ? 0xffd34d : 0xfff7dc, active ? 0.95 : 0.66).fillCircle(x, y, radius);
    g.lineStyle(4, 0x6d4a00, 0.8).strokeCircle(x, y, radius);
    g.fillStyle(0x5a3a00, 0.92);
    const s = r * 0.36;
    if (control === 'left') g.fillTriangle(x - s * 1.1, y, x + s * 0.7, y - s, x + s * 0.7, y + s);
    if (control === 'right') g.fillTriangle(x + s * 1.1, y, x - s * 0.7, y - s, x - s * 0.7, y + s);
    if (control === 'jump') g.fillTriangle(x, y - s * 1.35, x - s, y - s * 0.1, x + s, y - s * 0.1).fillRect(x - s * 0.32, y - s * 0.2, s * 0.64, s * 0.55);
    if (control === 'attack') {
      // A golden staff with a spark, like the hero's 여의봉.
      g.lineStyle(9, 0x8a5a00, 1).lineBetween(x - s * 1.1, y + s * 0.15, x + s * 1.0, y - s * 1.0);
      g.lineStyle(5, 0xffcf33, 1).lineBetween(x - s * 1.1, y + s * 0.15, x + s * 1.0, y - s * 1.0);
      g.fillStyle(0xff8a3d, 1).fillCircle(x + s * 1.05, y - s * 1.05, 6);
    }
  }

  private setVisible(visible: boolean): void {
    for (const button of this.buttons) {
      button.graphics.setVisible(visible);
      button.label?.setVisible(visible);
    }
  }

  private buttonAt(pointer: Phaser.Input.Pointer): ControlName | undefined {
    return this.buttons.find((button) => Phaser.Math.Distance.Between(pointer.x, pointer.y, button.x, button.y) <= button.radius + TOUCH_SLOP)?.control;
  }

  // Every finger is matched to the button under it, so a thumb can slide
  // from ← to → (or from 점프 to 공격) without lifting.
  private track(pointer: Phaser.Input.Pointer): void {
    if (pointer.wasTouch && !this.visible) {
      this.visible = true;
      this.setVisible(true);
    }
    if (!pointer.isDown || this.scene.physics.world.isPaused) return;

    const control = this.buttonAt(pointer);
    const previous = this.held.get(pointer.id);
    if (control === previous) return;
    if (control) {
      this.held.set(pointer.id, control);
      if (control === 'jump') this.queued.jump = true;
      if (control === 'attack') {
        this.queued.attack = true;
        this.nextAttackAt = this.scene.time.now + ATTACK_REPEAT_MS;
      }
    } else {
      this.held.delete(pointer.id);
    }
    this.redraw();
  }

  private release(pointer: Phaser.Input.Pointer): void {
    this.held.delete(pointer.id);
    this.redraw();
  }

  private redraw(): void {
    const active = new Set(this.held.values());
    this.buttons.forEach((button) => this.paint(button, active.has(button.control)));
  }

  private destroy(): void {
    this.scene.input.off('pointerdown', this.track, this);
    this.scene.input.off('pointermove', this.track, this);
    this.scene.input.off('pointerup', this.release, this);
    this.scene.input.off('pointerupoutside', this.release, this);
    this.scene.game.events.off(Phaser.Core.Events.BLUR, this.reset, this);
    this.scene.events.off(Phaser.Scenes.Events.RESUME, this.reset, this);
  }
}
