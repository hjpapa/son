import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Sfx } from '../audio/Sfx';
import { GAME_WIDTH } from '../constants';

export type ArcadeState = { seals: number[]; raceDone: boolean; raceRings: number; raceCollected: number[]; raceMs: number; dodges: number };
type Hooks = { message: (text: string) => void; reward: (xp: number) => void; damage: () => void; flight: (on: boolean) => void };
const textStyle = { color: '#fff4c4', fontSize: '18px', fontStyle: 'bold', stroke: '#211328', strokeThickness: 4 };

// Branching exploration, telegraphed danger and flight share the chapter
// lifecycle, so their progress survives retries and pauses with the story.
export class ArcadeChallenges {
  readonly state: ArcadeState;
  private hud?: Phaser.GameObjects.Text;
  private seals: Phaser.GameObjects.Image[] = [];
  private gate?: Phaser.GameObjects.Rectangle;
  private map?: Phaser.GameObjects.Graphics;
  private raceActive = false;
  private rings: Phaser.GameObjects.Ellipse[] = [];
  private raceCloud?: Phaser.GameObjects.Image;
  private hazards: Phaser.GameObjects.Image[] = [];
  private raceHitAt = 0;
  private stormClock = 0;
  private stormPhase: 'rest' | 'warning' | 'strike' = 'rest';
  private stormX = 0;
  private stormHit = false;
  private stormMarker?: Phaser.GameObjects.Container;
  private bolt?: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene, private chapter: number, private player: Player,
    private platforms: Phaser.Physics.Arcade.StaticGroup, private hooks: Hooks, saved?: ArcadeState) {
    this.state = { seals: [...(saved?.seals ?? [])], raceDone: saved?.raceDone ?? false,
      raceRings: saved?.raceRings ?? 0, raceCollected: [...(saved?.raceCollected ?? [])], raceMs: saved?.raceMs ?? 0, dodges: saved?.dodges ?? 0 };
    if (this.isMaze) this.createMaze();
    if (chapter === 8) this.createRace();
    if (chapter === 4) this.createStorm();
    if (this.isMaze || chapter === 4 || chapter === 8) {
      this.hud = scene.add.text(GAME_WIDTH / 2, 118, '', { ...textStyle, backgroundColor: '#241e39dd', padding: { x: 12, y: 6 } })
        .setOrigin(0.5).setScrollFactor(0).setDepth(1100);
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.hooks.flight(false));
    this.refreshHud();
  }

  get isMaze(): boolean { return this.chapter === 2 || this.chapter === 9; }
  get exitReady(): boolean { return !this.isMaze || this.state.seals.length === 3; }
  get inFlight(): boolean { return this.raceActive; }
  get result(): string | undefined {
    if (this.isMaze) return `미로 인장 ${this.state.seals.length}/3`;
    if (this.chapter === 4) return `번개 회피 ${this.state.dodges}회`;
    if (this.chapter === 8 && this.state.raceDone) return `근두운 ${(this.state.raceMs / 1000).toFixed(1)}초 · 링 ${this.state.raceRings}/6`;
    return undefined;
  }

  setHudVisible(visible: boolean): void {
    this.hud?.setVisible(visible);
    this.map?.setVisible(visible);
  }

  update(delta: number, paused: boolean): void {
    // No countdown, collecting or damage while a story page or pause is open.
    if (paused) { if (this.raceActive) this.player.setVelocity(0, 0); return; }
    if (this.isMaze) this.updateMaze();
    if (this.chapter === 4) this.updateStorm(Math.min(delta, 100));
    if (this.chapter === 8) this.updateRace(Math.min(delta, 100));
    this.refreshHud();
  }

  private ledge(x: number, y: number, w: number, h = 22): void {
    this.scene.add.tileSprite(x, y, w, h, `terrain-${this.chapter === 2 ? 'cave' : 'forest'}`).setDepth(1);
    const slab = this.scene.add.rectangle(x, y, w, h).setVisible(false);
    this.scene.physics.add.existing(slab, true);
    this.platforms.add(slab);
  }

  private createMaze(): void {
    // Lower passage and an upper loop: leap onto the short wall, explore the
    // raised dead end for seal 2, then drop into the lower passage for seal 3.
    this.ledge(820, 383, 54, 98);
    this.ledge(1420, 186, 54, 104);
    this.gate = this.scene.add.rectangle(1850, 312, 32, 240, 0x775498, 0.85).setStrokeStyle(4, 0xffd970).setDepth(3);
    this.scene.physics.add.existing(this.gate, true);
    this.platforms.add(this.gate);
    this.scene.add.text(1850, 175, '인장 3개 →', textStyle).setOrigin(0.5).setDepth(3);
    const spots = [[460, 385], [1240, 195], [1570, 385]];
    for (let index = 0; index < spots.length; index++) {
      const [x, y] = spots[index];
      const seal = this.scene.add.image(x, y, 'maze-seal').setDepth(7).setData('index', index);
      if (this.state.seals.includes(index)) seal.setVisible(false);
      this.seals.push(seal);
      this.scene.add.text(x, y - 31, String(index + 1), textStyle).setOrigin(0.5).setDepth(7);
      this.scene.tweens.add({ targets: seal, angle: 12, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.scene.add.text(500, 245, '갈림길 미로\n빛나는 인장 3개를 찾아요\n위쪽 길도 살펴보세요 ↑', textStyle).setDepth(3);
    this.scene.add.text(1410, 287, '아래로 돌아가요 ↓', textStyle).setOrigin(0.5).setDepth(3);
    this.map = this.scene.add.graphics().setScrollFactor(0).setDepth(1099);
    if (this.exitReady) this.openMazeGate(false);
  }

  private updateMaze(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    for (const seal of this.seals) {
      if (!seal.visible || !Phaser.Geom.Intersects.RectangleToRectangle(new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height), seal.getBounds())) continue;
      const index = seal.getData('index') as number;
      this.state.seals.push(index);
      seal.setVisible(false);
      Sfx.reward();
      this.hooks.reward(2);
      this.hooks.message(`미로 인장 ${this.state.seals.length}/3!`);
      if (this.exitReady) this.openMazeGate(true);
    }
    const g = this.map!;
    g.clear().fillStyle(0x1e2030, 0.8).fillRoundedRect(GAME_WIDTH - 220, 163, 204, 62, 8);
    g.lineStyle(3, 0xa8b4a1).lineBetween(GAME_WIDTH - 205, 207, GAME_WIDTH - 36, 207)
      .lineBetween(GAME_WIDTH - 170, 207, GAME_WIDTH - 152, 181).lineBetween(GAME_WIDTH - 152, 181, GAME_WIDTH - 95, 181);
    const mx = (x: number) => GAME_WIDTH - 205 + Phaser.Math.Clamp((x - 480) / 1400, 0, 1) * 169;
    this.seals.forEach((seal, i) => g.fillStyle(this.state.seals.includes(i) ? 0x88e393 : 0xffd65a).fillCircle(mx(seal.x), seal.y < 260 ? 181 : 207, 4));
    g.fillStyle(0xffffff).fillCircle(mx(this.player.x), this.player.y < 310 ? 185 : 211, 4);
  }

  private openMazeGate(reward: boolean): void {
    if (this.gate?.body) (this.gate.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    this.gate?.setFillStyle(0x83e2a0, 0.15).setStrokeStyle(2, 0x83e2a0);
    if (reward) this.scene.tweens.add({ targets: this.gate, y: 65, alpha: 0.2, duration: 700, ease: 'Cubic.easeOut' });
    if (reward) { this.hooks.message('미로 해결! 문이 열렸어요'); this.hooks.reward(6); }
  }

  private createStorm(): void {
    this.stormMarker = this.scene.add.container(0, 0).setDepth(9).setVisible(false);
    this.stormMarker.add([
      this.scene.add.rectangle(0, 266, 98, 332, 0xffbb45, 0.14),
      this.scene.add.ellipse(0, 424, 98, 14, 0xffdc71, 0.85),
      this.scene.add.image(0, 145, 'storm-cloud'),
      this.scene.add.text(0, 198, '! 옆으로 피하기', textStyle).setOrigin(0.5)
    ]);
    this.bolt = this.scene.add.graphics().setDepth(9);
  }

  private updateStorm(delta: number): void {
    this.stormClock += delta;
    if (this.stormPhase === 'rest' && this.stormClock >= 1500) {
      this.stormClock = 0; this.stormPhase = 'warning'; this.stormHit = false;
      this.stormX = Phaser.Math.Clamp(this.player.x, 100, 3180);
      this.stormMarker!.setX(this.stormX).setVisible(true);
    } else if (this.stormPhase === 'warning' && this.stormClock >= 1000) {
      this.stormClock = 0; this.stormPhase = 'strike';
      this.bolt!.lineStyle(12, 0x9479ff, 0.6).beginPath().moveTo(this.stormX, 158)
        .lineTo(this.stormX - 22, 240).lineTo(this.stormX + 16, 238).lineTo(this.stormX - 10, 330).lineTo(this.stormX, 432).strokePath();
      this.bolt!.lineStyle(4, 0xfff4bf, 1).lineBetween(this.stormX, 158, this.stormX, 432);
      Sfx.swing();
    }
    if (this.stormPhase === 'strike') {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      if (!this.stormHit && body.right > this.stormX - 38 && body.left < this.stormX + 38) {
        this.stormHit = true; this.hooks.damage();
      }
      if (this.stormClock >= 230) {
        if (!this.stormHit) { this.state.dodges++; this.hooks.reward(1); }
        this.stormPhase = 'rest'; this.stormClock = 0;
        this.stormMarker!.setVisible(false); this.bolt!.clear();
      }
    }
  }

  private createRace(): void {
    this.scene.add.text(520, 226, '근두운 레이싱 →\n↑ / 점프: 올라가기 · 떼면 내려가기\n→ 가속 · ← 천천히 · 황금 링 모으기', textStyle).setDepth(3);
    this.scene.add.image(600, 399, 'nimbus-cloud').setDepth(3);
    for (let i = 0; i < 6; i++) {
      const ring = this.scene.add.ellipse(820 + i * 215, i % 2 === 0 ? 228 : 321, 52, 80, 0xffd65a, 0.08)
        .setStrokeStyle(5, 0xffd65a).setDepth(6).setData('collected', this.state.raceCollected.includes(i));
      ring.setVisible(!this.state.raceCollected.includes(i));
      this.rings.push(ring);
    }
    for (let i = 0; i < 4; i++) {
      this.hazards.push(this.scene.add.image(1070 + i * 245, i % 2 === 0 ? 360 : 192, 'storm-cloud').setScale(0.65).setDepth(6));
    }
    this.scene.add.text(2200, 185, '레이싱 결승!\n18초 · 링 4개에 도전', textStyle).setOrigin(0.5).setDepth(3);
  }

  private updateRace(delta: number): void {
    if (!this.state.raceDone && !this.raceActive && this.player.x >= 590 && this.player.x < 2150) {
      this.raceActive = true; this.hooks.flight(true);
      this.player.setCloudRide(true);
      this.player.setY(350);
      this.raceCloud = this.scene.add.image(this.player.x, this.player.y + 4, 'nimbus-cloud').setDepth(4.9);
      this.hooks.message('근두운 출발! 점프를 누르면 올라가요');
    }
    if (!this.raceActive) return;
    this.state.raceMs += delta;
    this.raceCloud!.setPosition(this.player.x, this.player.y + 4);
    for (const [index, ring] of this.rings.entries()) {
      if (ring.getData('collected') || Math.abs(this.player.x - ring.x) > 38 || Math.abs(this.player.y - 45 - ring.y) > 53) continue;
      ring.setData('collected', true).setVisible(false);
      this.state.raceCollected.push(index);
      this.state.raceRings++; Sfx.reward(); this.hooks.reward(2);
    }
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (this.scene.time.now > this.raceHitAt && this.hazards.some(h => Phaser.Geom.Intersects.RectangleToRectangle(new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height), h.getBounds()))) {
      this.raceHitAt = this.scene.time.now + 1800;
      this.hooks.damage(); this.hooks.message('먹구름을 피해 위아래로 날아요!');
    }
    if (this.player.x >= 2150) {
      this.raceActive = false; this.state.raceDone = true;
      this.player.setCloudRide(false); this.hooks.flight(false); this.raceCloud?.destroy();
      const medal = this.state.raceMs <= 18000 && this.state.raceRings >= 4;
      this.hooks.reward(medal ? 10 : 4);
      this.hooks.message(medal ? '황금 근두운! 링과 기록 모두 성공!' : '근두운 완주! 다음에는 링 4개에 도전해요');
    }
  }

  private refreshHud(): void {
    if (this.isMaze) this.hud?.setText(this.exitReady ? '미로 해결! 열린 문으로 가요 →' : `갈림길 미로 · 인장 ${this.state.seals.length}/3 · 위쪽 길 ↑`);
    if (this.chapter === 4) this.hud?.setText(`번개 회피 ${this.state.dodges}회 · ! 표시 뒤 옆으로 이동`);
    if (this.chapter === 8) this.hud?.setText(this.state.raceDone ? this.result! : `근두운 · ${(this.state.raceMs / 1000).toFixed(1)}초 / 목표 18초 · 링 ${this.state.raceRings}/6`);
  }
}
