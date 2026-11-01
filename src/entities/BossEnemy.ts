import Phaser from 'phaser';
import type { BossAttackStyle, BossData } from '../game/data/stages';
import { Enemy } from './Enemy';
import { Player } from './Player';

const styleColors: Record<BossAttackStyle, number> = {
  flame: 0xff5b35,
  bubble: 0x67d8ff,
  lightning: 0xffe45c,
  slam: 0xf09a54,
  water: 0x4fb7ff,
  wind: 0xf4d984,
  claw: 0xff8b56,
  mud: 0x7f6b3a,
  shadow: 0x9a79ff
};

const styleCalls: Record<BossAttackStyle, string> = {
  flame: '마왕 불꽃!',
  bubble: '용궁 물방울!',
  lightning: '천둥 벼락!',
  slam: '아홉 갈퀴 내려찍기!',
  water: '유사하 물결!',
  wind: '황풍 돌풍!',
  claw: '호랑이 연속 돌진!',
  mud: '진흙 파도!',
  shadow: '마음의 그림자!'
};

export class BossEnemy extends Enemy {
  private readonly attackStyle: BossAttackStyle;
  private readonly roamRange: number;
  private readonly roamSpeed: number;
  private readonly pursuit: boolean;
  private roamDirection: -1 | 1;
  private roamPauseMs = 0;
  private chargeCooldown = 0;
  private specialCooldown = 0;
  private chargeState: 'patrol' | 'windup' | 'dash' | 'recover' = 'patrol';
  private chargeStateMs = 0;
  private specialWindupMs = 0;
  private specialPending = false;
  private defeatedCallback?: () => void;
  private playerDamagedCallback?: () => void;

  constructor(scene: Phaser.Scene, config: BossData) {
    super(scene, config);
    this.attackStyle = config.attackStyle;
    this.roamRange = config.patrolRange;
    this.roamSpeed = config.speed;
    this.pursuit = config.pursuit ?? false;
    this.roamDirection = this.direction;
    this.setDisplaySize(148, 148);

    const body = this.body as Phaser.Physics.Arcade.Body;
    // Keep the large artwork, but let the boss walk under low arena ledges.
    body.setSize(this.width * 0.56, this.height * 0.58);
    body.setOffset(this.width * 0.22, this.height * 0.42);
    body.setCollideWorldBounds(true);
  }

  get hpRatio(): number {
    return Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
  }

  onDefeated(callback: () => void): void {
    this.defeatedCallback = callback;
  }

  onPlayerDamaged(callback: () => void): void {
    this.playerDamagedCallback = callback;
  }

  override updateEnemy(player: Player, delta: number): void {
    if (!this.active) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const enraged = this.hpRatio <= 0.5;
    const distance = Math.abs(player.x - this.x);
    const engaged = distance < 620 && Math.abs(player.y - this.y) < 230;
    // Only start the attack clock once Wukong can see and respond to the boss.
    const specialDelay = enraged ? 3500 : 4700;
    if (engaged) {
      if (this.specialPending) {
        this.specialWindupMs += delta;
        if (this.specialWindupMs >= 500) {
          this.specialPending = false;
          this.specialWindupMs = 0;
          this.launchSpecialAttack(player);
          this.chargeCooldown = 0;
          body.setVelocityX(0);
          return;
        }
      } else if (this.chargeState === 'patrol') {
        this.specialCooldown += delta;
        if (this.specialCooldown >= specialDelay) {
          this.specialCooldown = 0;
          this.specialPending = true;
          this.specialWindupMs = 0;
          this.showAttackCall(styleCalls[this.attackStyle]);
        }
      }
    } else {
      this.specialCooldown = 0;
      this.specialPending = false;
      this.specialWindupMs = 0;
    }

    if (this.specialPending) {
      body.setVelocityX(0);
      return;
    }

    this.chargeStateMs += delta;
    if (this.chargeState === 'windup') {
      body.setVelocityX(0);
      if (this.chargeStateMs >= 430) {
        this.chargeState = 'dash';
        this.chargeStateMs = 0;
        this.clearTint();
      }
    } else if (this.chargeState === 'dash') {
      const atRoamEdge = !this.pursuit && (
        (this.x <= this.spawnX - this.roamRange && this.direction < 0)
        || (this.x >= this.spawnX + this.roamRange && this.direction > 0)
      );
      if (this.chargeStateMs >= 460 || body.blocked.left || body.blocked.right || atRoamEdge) {
        this.chargeState = 'recover';
        this.chargeStateMs = 0;
        body.setVelocityX(0);
      } else {
        body.setVelocityX((this.attackStyle === 'claw' ? 260 : enraged ? 195 : 165) * this.direction);
      }
    } else if (this.chargeState === 'recover') {
      body.setVelocityX(0);
      if (this.chargeStateMs >= 420) {
        this.chargeState = 'patrol';
        this.chargeStateMs = 0;
      }
    } else {
      this.chargeCooldown += delta;
      const delay = this.attackStyle === 'claw' ? 2000 : enraged ? 2400 : 3100;
      const playerInRoamRange = player.x >= this.spawnX - this.roamRange
        && player.x <= this.spawnX + this.roamRange;
      if (engaged && distance < 520 && (this.pursuit || playerInRoamRange) && this.chargeCooldown >= delay) {
        this.direction = player.x < this.x ? -1 : 1;
        this.setFlipX(this.direction < 0);
        this.chargeState = 'windup';
        this.chargeStateMs = 0;
        this.chargeCooldown = 0;
        body.setVelocityX(0);
        this.setTint(0xffaa6f);
      } else {
        if (this.pursuit) this.updateWalker(undefined, delta);
        else this.updateRoam(delta);
      }
    }
  }

  private updateRoam(delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const left = this.spawnX - this.roamRange;
    const right = this.spawnX + this.roamRange;
    if (this.roamDirection < 0 && (this.x <= left || body.blocked.left)) {
      this.roamDirection = 1;
      this.roamPauseMs = 300;
    } else if (this.roamDirection > 0 && (this.x >= right || body.blocked.right)) {
      this.roamDirection = -1;
      this.roamPauseMs = 300;
    }

    this.direction = this.roamDirection;
    this.setFlipX(this.direction < 0);
    this.roamPauseMs = Math.max(0, this.roamPauseMs - delta);
    body.setVelocityX(this.roamPauseMs > 0 ? 0 : this.roamSpeed * this.roamDirection);
  }

  override takeHit(amount = 1, fromX?: number): boolean {
    const defeated = super.takeHit(amount, fromX);
    this.scene.cameras.main.shake(90, 0.004);
    if (defeated) this.defeatedCallback?.();
    return defeated;
  }

  private launchSpecialAttack(player: Player): void {
    this.direction = player.x < this.x ? -1 : 1;
    this.setFlipX(this.direction < 0);

    switch (this.attackStyle) {
      case 'lightning':
        this.launchLightning(player);
        break;
      case 'slam':
      case 'mud':
        this.launchShockwaves(player, this.attackStyle === 'mud' ? 175 : 205);
        break;
      case 'bubble':
      case 'water':
      case 'shadow':
        this.launchSpread(player);
        break;
      default:
        this.launchProjectile(player, 0, this.attackStyle === 'wind' ? 220 : 195);
        break;
    }
  }

  private showAttackCall(label: string): void {
    const warning = this.scene.add.text(this.x, this.y - 122, label, {
      color: '#fff3a4', fontSize: '18px', fontStyle: 'bold', stroke: '#32120a', strokeThickness: 4
    }).setOrigin(0.5).setDepth(80);

    this.scene.tweens.add({
      targets: warning, y: warning.y - 15, alpha: 0, duration: 700,
      onComplete: () => warning.destroy()
    });
  }

  private launchSpread(player: Player): void {
    [-0.24, 0, 0.24].forEach((angleOffset, index) => {
      this.scene.time.delayedCall(index * 100, () => {
        if (this.active && !this.scene.physics.world.isPaused) this.launchProjectile(player, angleOffset, this.attackStyle === 'shadow' ? 210 : 180);
      });
    });
  }

  private launchProjectile(player: Player, angleOffset: number, speed: number): void {
    const orb = this.scene.physics.add.sprite(this.x + this.direction * 62, this.y - 62, 'boss-orb');
    orb.setDepth(7).setTint(styleColors[this.attackStyle]).setScale(this.attackStyle === 'wind' ? 1.4 : 1.05);
    orb.setCircle(14, 2, 2);
    (orb.body as Phaser.Physics.Arcade.Body).allowGravity = false;

    const angle = Phaser.Math.Angle.Between(orb.x, orb.y, player.x, player.y - 68) + angleOffset;
    orb.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    orb.setAngularVelocity(280 * this.direction);

    const collider = this.scene.physics.add.overlap(orb, player, () => {
      if (!orb.active) return;
      orb.destroy();
      this.damagePlayer(player);
    });
    orb.once(Phaser.GameObjects.Events.DESTROY, () => collider.destroy());

    this.scene.time.delayedCall(3200, () => orb.active && orb.destroy());
  }

  private launchShockwaves(player: Player, speed: number): void {
    [-1, 1].forEach((direction) => {
      const wave = this.scene.physics.add.sprite(this.x + direction * 72, this.y - 18, 'boss-wave');
      wave.setDepth(7).setTint(styleColors[this.attackStyle]).setScale(this.attackStyle === 'mud' ? 1.45 : 1.15);
      (wave.body as Phaser.Physics.Arcade.Body).allowGravity = false;
      wave.setVelocityX(speed * direction).setFlipX(direction < 0);
      const collider = this.scene.physics.add.overlap(wave, player, () => {
        if (!wave.active) return;
        wave.destroy();
        this.damagePlayer(player);
      });
      wave.once(Phaser.GameObjects.Events.DESTROY, () => collider.destroy());
      this.scene.time.delayedCall(1700, () => wave.active && wave.destroy());
    });
  }

  private launchLightning(player: Player): void {
    const targetX = player.x;
    const marker = this.scene.add.rectangle(targetX, 424, 76, 10, 0xffef6b, 0.8).setDepth(60);
    this.scene.tweens.add({ targets: marker, alpha: 0.15, duration: 120, yoyo: true, repeat: 3 });
    const warning = this.scene.add
      .text(targetX, 392, '!', { color: '#fff266', fontSize: '30px', fontStyle: 'bold', stroke: '#45206f', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(61);

    this.scene.time.delayedCall(950, () => {
      marker.destroy();
      warning.destroy();
      if (!this.active || this.scene.physics.world.isPaused) return;
      const bolt = this.scene.add.rectangle(targetX, 220, 30, 410, 0xfff18b, 0.82).setDepth(65);
      this.scene.tweens.add({ targets: bolt, alpha: 0, duration: 260, onComplete: () => bolt.destroy() });
      if (Math.abs(player.x - targetX) < 55) this.damagePlayer(player);
    });
  }

  private damagePlayer(player: Player): void {
    if (!this.active || this.scene.physics.world.isPaused) return;
    if (player.takeDamage(this.damage)) this.playerDamagedCallback?.();
  }
}
