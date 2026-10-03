import Phaser from 'phaser';
import { Sfx } from '../audio/Sfx';
import type { PlayerInputState } from '../types/InputState';

// Forgiving jumps for young players: a jump still works shortly after
// running off a ledge, and a press just before landing is remembered.
const COYOTE_MS = 110;
const JUMP_BUFFER_MS = 150;

export class Player extends Phaser.Physics.Arcade.Sprite {
  maxHealth: number;
  private facing: -1 | 1 = 1;
  private previousJump = false;
  private previousAttack = false;
  private attacking = false;
  private attackSerial = 0;
  private crouching = false;
  private attackHitActive = false;
  private invulnerable = false;
  private currentHealth: number;
  private attackRangeMultiplier = 1;
  private movementMultiplier = 1;
  private levelMovementMultiplier = 1;
  private staffUpgraded = false;
  private staffGlow: Phaser.GameObjects.Graphics;
  private currentPose?: 'idle' | 'run' | 'attack' | 'crouch';
  private lastGroundedAt = 0;
  private jumpBufferedUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, maxHealth = 6) {
    super(scene, x, y, 'corn-wukong-clean-idle');

    this.maxHealth = maxHealth;
    this.currentHealth = maxHealth;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setDepth(5);
    this.staffGlow = scene.add.graphics().setDepth(4.8);

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setPose('idle');
    body.setCollideWorldBounds(true);
    body.setMaxVelocity(340, 820);
  }

  get health(): number {
    return this.currentHealth;
  }

  setAttackRangeMultiplier(multiplier: number): void {
    this.attackRangeMultiplier = multiplier;
    this.updateStaffGlow();
  }

  setStaffUpgraded(upgraded: boolean): void {
    this.staffUpgraded = upgraded;
    this.updateStaffGlow();
  }

  setMovementMultiplier(multiplier: number): void {
    this.movementMultiplier = multiplier;
  }

  setLevelMovementMultiplier(multiplier: number): void {
    this.levelMovementMultiplier = multiplier;
  }

  healFull(): void {
    this.currentHealth = this.maxHealth;
  }

  heal(amount = 1): boolean {
    if (this.currentHealth >= this.maxHealth) {
      return false;
    }

    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    this.setTint(0x8cff9f);
    this.scene.time.delayedCall(180, () => this.clearTint());
    return true;
  }

  update(input: PlayerInputState): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const now = this.scene.time.now;
    const grounded = body.blocked.down || body.touching.down;
    const crouching = input.down && grounded && !this.attacking;
    const jumpPressed = input.jump && !this.previousJump;
    const attackPressed = input.attack && !this.previousAttack;
    if (grounded && body.velocity.y >= 0) this.lastGroundedAt = now;
    if (jumpPressed) this.jumpBufferedUntil = now + JUMP_BUFFER_MS;

    let velocityX = 0;
    if (input.left && !input.right) {
      velocityX = -240 * this.movementMultiplier * this.levelMovementMultiplier;
      this.facing = -1;
    } else if (input.right && !input.left) {
      velocityX = 240 * this.movementMultiplier * this.levelMovementMultiplier;
      this.facing = 1;
    }

    this.crouching = crouching;
    body.setVelocityX(crouching ? 0 : this.attacking ? velocityX * 0.45 : velocityX);

    if (now <= this.jumpBufferedUntil && now - this.lastGroundedAt <= COYOTE_MS && !crouching) {
      body.setVelocityY(-590);
      this.jumpBufferedUntil = 0;
      this.lastGroundedAt = -Infinity;
      Sfx.jump();
    }

    if (attackPressed && !crouching) {
      this.beginAttack();
    }

    this.setFlipX(this.facing < 0);
    this.updateAnimation(crouching ? 0 : velocityX, grounded);
    this.updateStaffGlow();

    this.previousJump = input.jump;
    this.previousAttack = input.attack;
  }

  showStaffUpgradeEffect(): void {
    this.staffUpgraded = true;
    this.setAttackRangeMultiplier(Math.max(this.attackRangeMultiplier, 1.25));
    this.setTint(0xfff17a);
    this.scene.time.delayedCall(500, () => this.clearTint());

    const flash = this.scene.add
      .text(this.x, this.y - 188, '여의봉 강화!', {
        color: '#fff176',
        fontSize: '24px',
        fontStyle: 'bold',
        stroke: '#5d3300',
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(90);

    this.scene.tweens.add({
      targets: flash,
      y: flash.y - 34,
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy()
    });
  }

  applyLevelUp(level: number, maxHealth: number): void {
    this.maxHealth = maxHealth;
    this.currentHealth = maxHealth;
    this.invulnerable = true;
    this.setTint(0xffed65);

    const flash = this.scene.add
      .text(this.x, this.y - 188, `레벨 ${level}!`, {
        color: '#fff176',
        fontSize: '30px',
        fontStyle: 'bold',
        stroke: '#6b3b00',
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(90);

    for (let index = 0; index < 6; index += 1) {
      const star = this.scene.add.circle(this.x, this.y - 90, 6, index % 2 === 0 ? 0xffe04b : 0xffffff).setDepth(89);
      const angle = (Math.PI * 2 * index) / 6;
      this.scene.tweens.add({
        targets: star,
        x: star.x + Math.cos(angle) * 86,
        y: star.y + Math.sin(angle) * 70,
        alpha: 0,
        duration: 900,
        onComplete: () => star.destroy()
      });
    }

    this.scene.tweens.add({
      targets: flash,
      y: flash.y - 42,
      alpha: 0,
      duration: 1300,
      onComplete: () => flash.destroy()
    });
    this.scene.time.delayedCall(1200, () => {
      this.invulnerable = false;
      this.clearTint();
    });
  }

  revive(): void {
    this.currentHealth = this.maxHealth;
    this.invulnerable = true;
    this.setAlpha(0.72).setTint(0x9fe7ff);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, -240);
    this.scene.time.delayedCall(1800, () => {
      this.invulnerable = false;
      this.setAlpha(1).clearTint();
    });
  }

  isAttackActive(): boolean {
    return this.attackHitActive;
  }

  get attackId(): number {
    return this.attackSerial;
  }

  getAttackBounds(): Phaser.Geom.Rectangle {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const width = 108 * this.attackRangeMultiplier;
    const height = 50;
    const x = this.facing > 0 ? body.right - 4 : body.left - width + 4;
    const y = body.y + 44;
    return new Phaser.Geom.Rectangle(x, y, width, height);
  }

  takeDamage(amount = 1): boolean {
    if (this.invulnerable || this.currentHealth <= 0) {
      return false;
    }

    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.invulnerable = true;
    this.setTint(0xff6b4a);
    Sfx.hurt();
    this.scene.cameras.main.shake(140, 0.006);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(-this.facing * 220);
    body.setVelocityY(-260);

    this.scene.time.delayedCall(1600, () => {
      this.invulnerable = false;
      this.clearTint();
    });

    return true;
  }

  private beginAttack(): void {
    if (this.attacking) {
      return;
    }

    this.attacking = true;
    this.attackSerial += 1;
    Sfx.swing();
    this.attackHitActive = false;
    this.setPose('attack');
    this.setAngle(0);

    this.scene.time.delayedCall(105, () => {
      this.attackHitActive = true;
    });

    this.scene.time.delayedCall(265, () => {
      this.attackHitActive = false;
    });

    this.scene.time.delayedCall(340, () => {
      this.attacking = false;
      this.attackHitActive = false;
      this.setPose('idle');
      this.updateStaffGlow();
    });
  }

  private updateAnimation(velocityX: number, grounded: boolean): void {
    if (this.attacking) {
      return;
    }

    if (!grounded) {
      this.setPose('run');
      this.setAngle(-this.facing * 3);
      return;
    }

    if (this.crouching) {
      this.setPose('crouch');
      this.setAngle(0);
      return;
    }

    if (Math.abs(velocityX) > 0) {
      this.setPose('run');
      this.setAngle(Math.sin(this.scene.time.now / 85) * 2.5);
      return;
    }

    this.setPose('idle');
    this.setAngle(0);
  }

  private setPose(pose: 'idle' | 'run' | 'attack' | 'crouch'): void {
    if (this.currentPose === pose) {
      return;
    }

    const poses = {
      idle: { key: 'corn-wukong-clean-idle', width: 116, height: 142 },
      run: { key: 'corn-wukong-clean-run', width: 140, height: 140 },
      attack: { key: 'corn-wukong-clean-attack', width: 194, height: 129 },
      crouch: { key: 'corn-wukong-clean-crouch', width: 160, height: 100 }
    } as const;
    const next = poses[pose];

    this.currentPose = pose;
    this.setTexture(next.key);
    this.setDisplaySize(next.width, next.height);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const scaleX = Math.abs(this.scaleX);
    const scaleY = Math.abs(this.scaleY);
    const bodyWidth = (pose === 'crouch' ? 64 : 50) / scaleX;
    const bodyHeight = (pose === 'crouch' ? 48 : 90) / scaleY;
    body.setSize(bodyWidth, bodyHeight, false);
    body.setOffset((this.width - bodyWidth) / 2, this.height - bodyHeight);
  }

  private updateStaffGlow(): void {
    this.staffGlow.clear();
    if (!this.staffUpgraded || !this.attacking) {
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const reach = 112 * this.attackRangeMultiplier;
    const startX = this.facing > 0 ? body.center.x + 20 : body.center.x - 20;
    const endX = startX + this.facing * reach;
    const y = this.y - 63;
    const endY = y - 5;

    this.staffGlow.lineStyle(14, 0xffd84a, 0.22);
    this.staffGlow.lineBetween(startX, y, endX, endY);
    this.staffGlow.lineStyle(5, 0xffc928, 0.7);
    this.staffGlow.lineBetween(startX, y, endX, endY);
  }
}
