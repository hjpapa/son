import Phaser from 'phaser';
import { Sfx } from '../audio/Sfx';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { companionSkills, companionTextures } from './data/companions';

export type CompanionSkillState = { cooldowns: Record<string, number>; shieldMs: number; tideMs: number };
type Cast = { name: string; x: number; y: number; direction: number; ms: number; hit: Set<Enemy>; sprite: Phaser.GameObjects.GameObject };
type Hooks = { allowed: () => boolean; changed: () => void; defeated: (enemy: Enemy) => void; say: (lines: Partial<Record<string, string>>) => void };

// Effects and recharge use gameplay time: story pages cannot spend a skill.
export class CompanionSkills {
  readonly state: CompanionSkillState;
  private casts: Cast[] = [];
  private cards: Array<{ name: string; panel: Phaser.GameObjects.Rectangle; status: Phaser.GameObjects.Text; key: Phaser.Input.Keyboard.Key }> = [];
  private aura: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene, private player: Player, private names: string[],
    private followers: Phaser.GameObjects.Sprite[], private enemies: Phaser.GameObjects.Group, private hooks: Hooks, saved?: CompanionSkillState) {
    this.state = { cooldowns: { ...saved?.cooldowns }, shieldMs: saved?.shieldMs ?? 0, tideMs: saved?.tideMs ?? 0 };
    this.player.setCompanionShield(this.state.shieldMs > 0);
    this.aura = scene.add.graphics().setDepth(5.5);
    names.forEach((name, index) => {
      const skill = companionSkills[name];
      // Sized for a thumb on a phone, where the game is drawn at about 0.7x.
      const x = 52 + index * 92;
      const panel = scene.add.rectangle(x, 134, 84, 66, 0x2a1a08, 0.87).setStrokeStyle(3, skill.color)
        .setScrollFactor(0).setDepth(903).setInteractive({ useHandCursor: true });
      const face = scene.add.image(x - 14, 119, companionTextures[name]).setScrollFactor(0).setDepth(904);
      face.setScale(38 / face.height);
      scene.add.text(x + 21, 119, String(index + 1), { fontSize: '19px', color: '#fff5cd', fontStyle: 'bold' })
        .setOrigin(0.5).setScrollFactor(0).setDepth(904);
      const status = scene.add.text(x, 152, '', { fontSize: '15px', color: '#fff5cd', fontStyle: 'bold' })
        .setOrigin(0.5).setScrollFactor(0).setDepth(904);
      panel.on('pointerdown', () => this.activate(name));
      this.cards.push({ name, panel, status, key: scene.input.keyboard!.addKey(skill.key) });
    });
    const resetKeys = () => this.cards.forEach(({ key }) => key.reset());
    resetKeys();
    scene.events.on(Phaser.Scenes.Events.PAUSE, resetKeys);
    scene.events.on(Phaser.Scenes.Events.RESUME, resetKeys);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      resetKeys();
      scene.events.off(Phaser.Scenes.Events.PAUSE, resetKeys);
      scene.events.off(Phaser.Scenes.Events.RESUME, resetKeys);
    });
    this.refresh();
  }

  get waterGuard(): boolean { return this.state.tideMs > 0; }
  isCasting(name: string): boolean { return this.casts.some(cast => cast.name === name); }

  activate(name: string): boolean {
    if (!this.names.includes(name) || !this.hooks.allowed() || (this.state.cooldowns[name] ?? 0) > 0) return false;
    const skill = companionSkills[name];
    this.state.cooldowns[name] = skill.cooldown;
    if (name === '삼장법사') {
      this.player.heal(2);
      this.state.shieldMs = 6000;
      this.player.setCompanionShield(true);
      Sfx.heal();
      this.hooks.say({ [name]: '힘내라! 내가 한 번 지켜 주마.' });
    } else {
      const direction = this.player.flipX ? -1 : 1;
      const y = this.player.y - 42;
      const sprite = name === '저팔계' ? this.followers[this.names.indexOf(name)]
        : this.scene.add.ellipse(this.player.x, y, 84, 70, 0x56c9ff, 0.45).setStrokeStyle(4, 0xb6f3ff).setDepth(6);
      this.casts.push({ name, x: this.player.x, y, direction, ms: 0, hit: new Set(), sprite });
      if (name === '사오정') this.state.tideMs = 5000;
      this.hooks.say({ [name]: name === '저팔계' ? '형님, 앞은 내가 맡을게!' : '물결아, 친구들을 지켜 줘!' });
      Sfx.swing();
    }
    this.hooks.changed();
    this.refresh();
    return true;
  }

  update(delta: number, paused: boolean): void {
    // Consume key edges during dialogue too, so a held key cannot cast on close.
    this.cards.forEach(card => { if (Phaser.Input.Keyboard.JustDown(card.key) && !paused) this.activate(card.name); });
    if (!paused) {
      const dt = Math.min(delta, 100);
      Object.keys(this.state.cooldowns).forEach(name => this.state.cooldowns[name] = Math.max(0, this.state.cooldowns[name] - dt));
      this.state.shieldMs = this.player.hasCompanionShield ? Math.max(0, this.state.shieldMs - dt) : 0;
      this.state.tideMs = Math.max(0, this.state.tideMs - dt);
      this.player.setCompanionShield(this.state.shieldMs > 0);
      for (const cast of this.casts) {
        cast.ms += dt;
        const previousX = cast.x;
        cast.x = Phaser.Math.Clamp(cast.x + cast.direction * dt * 0.65, 0, this.scene.physics.world.bounds.width);
        if (cast.sprite instanceof Phaser.GameObjects.Sprite) cast.sprite.setPosition(cast.x, cast.y + 42 - Math.sin(cast.ms / 650 * Math.PI) * 12)
          .setFlipX(cast.direction < 0).setTint(0xffd29a).setAngle(-cast.direction * 12);
        else (cast.sprite as Phaser.GameObjects.Ellipse).setPosition(cast.x, cast.y);
        // Swept area prevents a fast charge skipping a small enemy between frames.
        const area = new Phaser.Geom.Rectangle(Math.min(previousX, cast.x) - 40, cast.y - 42, Math.abs(cast.x - previousX) + 80, 84);
        for (const enemy of this.enemies.getChildren() as Enemy[]) {
          if (!this.hooks.allowed()) break;
          if (!enemy.active || cast.hit.has(enemy) || !Phaser.Geom.Intersects.RectangleToRectangle(area, enemy.getBounds())) continue;
          cast.hit.add(enemy);
          Sfx.hit();
          if (enemy.takeHit(cast.name === '저팔계' && enemy.enemyType !== 'boss' ? 2 : 1, this.player.x)) this.hooks.defeated(enemy);
        }
      }
      this.casts = this.casts.filter(cast => {
        if (cast.ms < 650) return true;
        if (cast.sprite instanceof Phaser.GameObjects.Sprite) cast.sprite.clearTint().setAngle(0);
        else cast.sprite.destroy();
        return false;
      });
    }
    this.aura.clear();
    if (this.state.shieldMs > 0) this.aura.lineStyle(4, 0xffdc73, 0.8).strokeEllipse(this.player.x, this.player.y - 62, 122, 152);
    if (this.waterGuard) this.aura.lineStyle(4, 0x8ce7ff, 0.9).strokeEllipse(this.player.x, this.player.y - 10, 132, 28);
    this.refresh();
  }

  private refresh(): void {
    this.cards.forEach(({ name, panel, status }) => {
      const cooldown = this.state.cooldowns[name] ?? 0;
      panel.setFillStyle(cooldown > 0 ? 0x403a31 : 0x2a1a08, this.hooks.allowed() ? 0.9 : 0.5);
      status.setText(cooldown > 0 ? `${Math.ceil(cooldown / 1000)}초` : companionSkills[name].label);
    });
  }
}
