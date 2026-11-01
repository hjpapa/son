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
  private dashState: 'patrol' | 'windup' | 'dash' | 'recover' = 'patrol';
  private dashStateMs = 0;
  private stunnedUntil = 0;
  // Plain rectangles: cheap to move every frame, unlike rebuilt Graphics.
  private healthBar?: { back: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle };
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
    this.pauseTimer = Phaser.Math.Between(0, 300);
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
      this.healthBar = {
        back: scene.add.rectangle(0, 0, 48, 7, 0x2c1b12, 0.85).setOrigin(0).setDepth(40),
        fill: scene.add.rectangle(0, 0, 44, 3, 0x71c94b).setOrigin(0).setDepth(41)
      };
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
    // Knocked back by a hit: let the push play out before walking again.
    if (this.scene.time.now < this.stunnedUntil) return;

    switch (this.enemyType) {
      case 'flyer':
        this.updateFlyer(delta);
        break;
      case 'charger':
        this.updateCharger(player, delta);
        break;
      case 'jumper':
        this.updateJumper(player, delta);
        break;
      default:
        this.updateWalker(player, delta);
        break;
    }
  }

  takeHit(amount = 1, fromX?: number): boolean {
    this.hp -= amount;
    this.updateHealthBar();
    this.setTint(0xfff0a3);
    this.sparkle(6);
    if (fromX !== undefined && this.enemyType !== 'boss' && this.hp > 0) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX((this.x >= fromX ? 1 : -1) * 230);
      if (body.blocked.down) body.setVelocityY(-170);
      this.stunnedUntil = this.scene.time.now + 280;
      if (this.enemyType === 'charger') {
        this.dashState = 'recover';
        this.dashStateMs = 0;
        this.dashTimer = 0;
      }
    }
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
    this.sparkle(12);
    this.healthBar?.back.destroy();
    this.healthBar?.fill.destroy();
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

  // Little stars fly out where the staff lands.
  private sparkle(count: number): void {
    const centerY = this.y - this.displayHeight / 2;
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.4;
      const spark = this.scene.add.star(this.x, centerY, 5, 3, 7, index % 2 ? 0xffffff : 0xffe04b).setDepth(51);
      this.scene.tweens.add({
        targets: spark,
        x: spark.x + Math.cos(angle) * (40 + count * 3),
        y: spark.y + Math.sin(angle) * (34 + count * 2),
        angle: 180,
        alpha: 0,
        scale: 0.4,
        duration: 380,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy()
      });
    }
  }

  protected updateWalker(_player?: Player, delta = this.scene.game.loop.delta): void {
    this.updatePatrol(delta, this.config.speed * 0.72);
  }

  private updatePatrol(delta: number, speed: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const previousDirection = this.direction;
    this.turnAtPatrolEdge(body);
    // Walk to the edge before turning; a nearby hero must not flip patrol
    // direction every frame or keep the monster pacing on the same spot.
    if (this.direction !== previousDirection) this.pauseTimer = 220;
    this.pauseTimer = Math.max(0, this.pauseTimer - delta);
    body.setVelocityX(this.pauseTimer > 0 ? 0 : speed * this.direction);
  }

  protected updateFlyer(_delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const weave = Math.sin(this.scene.time.now / 360 + this.spawnX * 0.01);
    this.turnAtPatrolEdge(body);
    body.setVelocityX((this.config.speed * 0.72 + weave * 18) * this.direction);
    body.setVelocityY(Math.cos(this.scene.time.now / 300 + this.spawnX * 0.01) * 58);
    if (Math.abs(this.y - this.spawnY) > 92) {
      body.setVelocityY(this.y > this.spawnY ? -90 : 90);
    }
  }

  protected updateCharger(player: Player, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const distance = Math.abs(player.x - this.x);
    this.dashStateMs += delta;
    if (this.dashState === 'windup') {
      body.setVelocityX(0);
      if (this.dashStateMs >= 320) {
        this.dashState = 'dash';
        this.dashStateMs = 0;
        this.clearTint();
      }
    } else if (this.dashState === 'dash') {
      const atEdge = (this.x <= this.spawnX - this.config.patrolRange && this.direction < 0)
        || (this.x >= this.spawnX + this.config.patrolRange && this.direction > 0)
        || body.blocked.left || body.blocked.right;
      if (this.dashStateMs >= 420 || atEdge) {
        this.dashState = 'recover';
        this.dashStateMs = 0;
        body.setVelocityX(0);
      } else {
        body.setVelocityX(Math.max(170, this.config.speed * 2) * this.direction);
      }
    } else if (this.dashState === 'recover') {
      body.setVelocityX(0);
      if (this.dashStateMs >= 420) {
        this.dashState = 'patrol';
        this.dashStateMs = 0;
      }
    } else {
      this.dashTimer += delta;
      const playerInRange = distance < 350 && Math.abs(player.y - this.y) < 130
        && player.x >= this.spawnX - this.config.patrolRange && player.x <= this.spawnX + this.config.patrolRange;
      if (playerInRange && this.dashTimer >= 1250) {
        this.direction = player.x < this.x ? -1 : 1;
        this.dashState = 'windup';
        this.dashStateMs = 0;
        this.dashTimer = 0;
        body.setVelocityX(0);
        this.setTint(0xffaa6f);
      } else {
        this.updatePatrol(delta, this.config.speed * 0.72);
      }
    }
    this.setFlipX(this.direction < 0);
  }

  protected updateJumper(player: Player, delta: number): void {
    this.updateWalker(player, delta);
    this.jumpTimer += delta;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.jumpTimer > 1900 && body.blocked.down) {
      body.setVelocityY(-340);
      this.jumpTimer = 0;
    }
  }

  protected turnAtPatrolEdge(body = this.body as Phaser.Physics.Arcade.Body): void {
    if (this.x <= this.spawnX - this.config.patrolRange || (this.direction < 0 && body.blocked.left)) {
      this.direction = 1;
    } else if (this.x >= this.spawnX + this.config.patrolRange || (this.direction > 0 && body.blocked.right)) {
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

    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    const x = this.x - 24;
    const y = this.y - this.displayHeight - 10;
    this.healthBar.back.setPosition(x, y);
    this.healthBar.fill.setPosition(x + 2, y + 2).setScale(Math.max(0.02, ratio), 1).setFillStyle(ratio > 0.5 ? 0x71c94b : 0xf2a23a);
  }
}
