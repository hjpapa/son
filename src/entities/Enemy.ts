import Phaser from 'phaser';
import type { EnemyData, EnemyType } from '../game/data/stages';
import { Player } from './Player';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly enemyType: EnemyType;
  readonly enemyName: string;
  readonly damage: number;
  protected hp: number;
  protected readonly maxHp: number;
  protected readonly spawnX: number;
  protected readonly spawnY: number;
  protected direction: -1 | 1 = -1;
  protected jumpTimer = 0;
  private pauseTimer = 0;
  private dashTimer = 0;
  private healthBar?: Phaser.GameObjects.Graphics;
  private groundShadow?: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, private readonly config: EnemyData) {
    super(scene, config.x, config.y, config.spriteKey);

    this.enemyType = config.type;
    this.enemyName = config.name;
    this.damage = config.damage;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.spawnX = config.x;
    this.spawnY = config.y;
    this.direction = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
    this.pauseTimer = Phaser.Math.Between(0, 1800);
    this.dashTimer = Phaser.Math.Between(0, 700);
    this.jumpTimer = Phaser.Math.Between(0, 900);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setDepth(config.type === 'flyer' ? 6 : 4);

    if (config.type !== 'boss') {
      const displaySize: Record<Exclude<EnemyType, 'boss'>, { width: number; height: number }> = {
        walker: { width: 94, height: 94 },
        flyer: { width: 98, height: 98 },
        charger: { width: 108, height: 108 },
        jumper: { width: 96, height: 96 }
      };
      const size = displaySize[config.type];
      this.setDisplaySize(size.width, size.height);
      if (config.type !== 'flyer') {
        this.groundShadow = scene.add.ellipse(config.x, config.y - 2, size.width * 0.62, 12, 0x1d160f, 0.2).setDepth(3);
      }
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (config.type === 'boss') {
      body.setSize(56, 44);
      body.setOffset(20, 20);
    } else {
      body.setSize(this.width * 0.56, this.height * 0.74);
      body.setOffset(this.width * 0.22, this.height * 0.22);
    }
    body.setCollideWorldBounds(false);
    if (config.type === 'flyer') {
      body.setAllowGravity(false);
    }

    if (config.type !== 'boss' && config.hp > 1) {
      this.healthBar = scene.add.graphics().setDepth(40);
      this.updateHealthBar();
    }
  }

  updateEnemy(player: Player, delta: number): void {
    if (!this.active) {
      return;
    }

    this.recoverIfFallen();
    this.updateHealthBar();
    this.groundShadow?.setPosition(this.x, this.y - 2);

    switch (this.enemyType) {
      case 'flyer':
        this.updateFlyer(delta);
        break;
      case 'charger':
        this.updateCharger(player);
        break;
      case 'jumper':
        this.updateJumper(player, delta);
        break;
      default:
        this.updateWalker(player);
        break;
    }
  }

  takeHit(amount = 1): boolean {
    this.hp -= amount;
    this.updateHealthBar();
    this.setTint(0xfff0a3);
    this.scene.time.delayedCall(80, () => {
      if (this.active) {
        this.clearTint();
      }
    });

    if (this.hp <= 0) {
      this.defeat();
      return true;
    }

    return false;
  }

  defeat(): void {
    if (!this.active) {
      return;
    }

    this.disableBody(true, true);
    this.healthBar?.destroy();
    this.groundShadow?.destroy();
    const hitText = this.scene.add
      .text(this.x, this.y - 48, '퍽!', {
        color: '#fff1a3',
        fontSize: '20px',
        fontStyle: 'bold',
        stroke: '#4b2700',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.scene.tweens.add({
      targets: hitText,
      y: hitText.y - 28,
      alpha: 0,
      duration: 2000,
      ease: 'Cubic.easeOut',
      onComplete: () => hitText.destroy()
    });
  }

  protected updateWalker(player?: Player): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.pauseTimer += this.scene.game.loop.delta;

    if (player && Math.abs(player.x - this.x) < 330) {
      this.direction = player.x < this.x ? -1 : 1;
    }

    if (this.pauseTimer > 2800) {
      body.setVelocityX(0);
      if (this.pauseTimer > 3400) {
        this.direction *= -1;
        this.pauseTimer = 0;
      }
      this.setFlipX(this.direction < 0);
      return;
    }

    body.setVelocityX(this.config.speed * 0.72 * this.direction);
    this.turnAtPatrolEdge(body);
  }

  protected updateFlyer(_delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const weave = Math.sin(this.scene.time.now / 360 + this.spawnX * 0.01);
    body.setVelocityX((this.config.speed * 0.72 + weave * 18) * this.direction);
    body.setVelocityY(Math.cos(this.scene.time.now / 300 + this.spawnX * 0.01) * 58);
    if (Math.abs(this.y - this.spawnY) > 92) {
      body.setVelocityY(this.y > this.spawnY ? -90 : 90);
    }
    this.turnAtPatrolEdge(body);
  }

  protected updateCharger(player: Player): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const distance = Math.abs(player.x - this.x);
    this.dashTimer += this.scene.game.loop.delta;

    if (distance < 430) {
      this.direction = player.x < this.x ? -1 : 1;
    } else {
      this.turnAtPatrolEdge(body);
    }

    const isDashing = distance < 350 && this.dashTimer > 1250;
    const speed = isDashing ? this.config.speed * 1.65 : this.config.speed * 0.62;
    body.setVelocityX(speed * this.direction);
    if (this.dashTimer > 2000) {
      this.dashTimer = 0;
    }
    this.setFlipX(this.direction < 0);
  }

  protected updateJumper(player: Player, delta: number): void {
    this.updateWalker(player);
    this.jumpTimer += delta;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.jumpTimer > 1900 && body.blocked.down) {
      body.setVelocityY(-340);
      this.jumpTimer = 0;
    }
  }

  protected turnAtPatrolEdge(body = this.body as Phaser.Physics.Arcade.Body): void {
    if (body.blocked.left || this.x <= this.spawnX - this.config.patrolRange) {
      this.direction = 1;
    } else if (body.blocked.right || this.x >= this.spawnX + this.config.patrolRange) {
      this.direction = -1;
    }
    this.setFlipX(this.direction < 0);
  }

  private recoverIfFallen(): void {
    if (this.y < this.scene.scale.height + 140) {
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setPosition(this.spawnX, this.spawnY);
    body.setVelocity(0, 0);
    this.direction *= -1;
  }

  private updateHealthBar(): void {
    if (!this.healthBar || !this.active) return;

    const width = 48;
    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    const x = this.x - width / 2;
    const y = this.y - this.displayHeight - 10;
    this.healthBar.clear();
    this.healthBar.fillStyle(0x2c1b12, 0.85);
    this.healthBar.fillRoundedRect(x, y, width, 7, 3);
    this.healthBar.fillStyle(ratio > 0.5 ? 0x71c94b : 0xf2a23a, 1);
    this.healthBar.fillRoundedRect(x + 2, y + 2, (width - 4) * ratio, 3, 2);
  }
}
