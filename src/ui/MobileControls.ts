import Phaser from 'phaser';
import type { PlayerInputState } from '../types/InputState';

type ControlName = keyof PlayerInputState;

export class MobileControls {
  private held = new Map<number, ControlName>();
  private queued = { jump: false, attack: false };
  private painters = new Map<ControlName, (active: boolean) => void>();

  constructor(private readonly scene: Phaser.Scene) {
    const y = scene.scale.height - 74;
    this.createButton(58, y, '←', 'left');
    this.createButton(132, y, '↓', 'down');
    this.createButton(206, y, '→', 'right');
    this.createButton(scene.scale.width - 164, y, '↑', 'jump');
    this.createButton(scene.scale.width - 76, y, '⚔', 'attack');
    scene.input.on('pointerup', this.release, this);
    scene.input.on('pointerupoutside', this.release, this);
    scene.game.events.on(Phaser.Core.Events.BLUR, this.reset, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  getInput(): PlayerInputState {
    const state = { left: false, right: false, down: false, jump: this.queued.jump, attack: this.queued.attack };
    for (const control of this.held.values()) state[control] = true;
    this.queued = { jump: false, attack: false };
    return state;
  }

  reset(): void {
    this.held.clear();
    this.queued = { jump: false, attack: false };
    this.redraw();
  }

  private createButton(x: number, y: number, label: string, control: ControlName): void {
    const graphics = this.scene.add.graphics().setScrollFactor(0).setDepth(1000);
    this.scene.add.text(x, y, label, { color: '#3a2600', fontSize: '28px', fontStyle: 'bold' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.painters.set(control, (active) => {
      graphics.clear().fillStyle(active ? 0xffd34d : 0xffffff, active ? 0.9 : 0.62)
        .lineStyle(3, 0x6d4a00, 0.72).fillCircle(x, y, 34).strokeCircle(x, y, 34);
    });
    const zone = this.scene.add.zone(x, y, 72, 80).setScrollFactor(0).setDepth(1002).setInteractive();
    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.scene.physics.world.isPaused) return;
      this.held.set(pointer.id, control);
      if (control === 'jump' || control === 'attack') this.queued[control] = true;
      this.redraw();
    });
    zone.on('pointerout', this.release, this);
    this.redraw();
  }

  private release(pointer: Phaser.Input.Pointer): void {
    this.held.delete(pointer.id);
    this.redraw();
  }

  private redraw(): void {
    const active = new Set(this.held.values());
    this.painters.forEach((draw, control) => draw(active.has(control)));
  }

  private destroy(): void {
    this.scene.input.off('pointerup', this.release, this);
    this.scene.input.off('pointerupoutside', this.release, this);
    this.scene.game.events.off(Phaser.Core.Events.BLUR, this.reset, this);
  }
}
