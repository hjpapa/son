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
  private chargeCooldown = 0;
  private specialCooldown = 0;
  private defeatedCallback?: () => void;
  private playerDamagedCallback?: () => void;

  constructor(scene: Phaser.Scene, config: BossData) {
    super(scene, config);
    this.attackStyle = config.attackStyle;
    this.setDisplaySize(148, 148);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.56, this.height * 0.76);
    body.setOffset(this.width * 0.22, this.height * 0.20);
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

    this.chargeCooldown += delta;
    this.specialCooldown += delta;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const enraged = this.hpRatio <= 0.5;
    const specialDelay = enraged ? 3100 : 4300;

    if (this.specialCooldown >= specialDelay) {
      this.launchSpecialAttack(player);
      this.specialCooldown = 0;
    }

    const distance = Math.abs(player.x - this.x);
    if (this.attackStyle === 'claw' && distance < 520 && this.chargeCooldown > 2000) {
      this.direction = player.x < this.x ? -1 : 1;
      body.setVelocityX(260 * this.direction);
      this.chargeCooldown = 0;
      this.setTint(0xffaa6f);
      this.scene.time.delayedCall(360, () => this.active && this.clearTint());
      return;
    }

    if (this.chargeCooldown > (enraged ? 2400 : 3100)) {
      this.direction = player.x < this.x ? -1 : 1;
      body.setVelocityX((enraged ? 195 : 165) * this.direction);
      this.chargeCooldown = 0;
    } else {
      this.updateWalker();
    }
  }

  override takeHit(amount = 1): boolean {
    const defeated = super.takeHit(amount);
    if (defeated) this.defeatedCallback?.();
    return defeated;
  }

  private launchSpecialAttack(player: Player): void {
    this.direction = player.x < this.x ? -1 : 1;
    this.setFlipX(this.direction < 0);
    this.showAttackCall(styleCalls[this.attackStyle]);

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

    this.scene.physics.add.overlap(orb, player, () => {
      if (!orb.active) return;
      orb.destroy();
      this.damagePlayer(player);
    });

    this.scene.time.delayedCall(3200, () => orb.active && orb.destroy());
  }

  private launchShockwaves(player: Player, speed: number): void {
    [-1, 1].forEach((direction) => {
      const wave = this.scene.physics.add.sprite(this.x + direction * 72, this.y - 18, 'boss-wave');
      wave.setDepth(7).setTint(styleColors[this.attackStyle]).setScale(this.attackStyle === 'mud' ? 1.45 : 1.15);
      (wave.body as Phaser.Physics.Arcade.Body).allowGravity = false;
      wave.setVelocityX(speed * direction).setFlipX(direction < 0);
      this.scene.physics.add.overlap(wave, player, () => {
        if (!wave.active) return;
        wave.destroy();
        this.damagePlayer(player);
      });
      this.scene.time.delayedCall(1700, () => wave.active && wave.destroy());
    });
  }

  private launchLightning(player: Player): void {
    const targetX = player.x;
    const marker = this.scene.add.rectangle(targetX, 424, 76, 10, 0xffef6b, 0.8).setDepth(60);
    this.scene.tweens.add({ targets: marker, alpha: 0.15, duration: 120, yoyo: true, repeat: 3 });

    this.scene.time.delayedCall(820, () => {
      marker.destroy();
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
