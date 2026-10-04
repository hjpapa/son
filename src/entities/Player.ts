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
  private cloudJumpUnlocked = false;
  private cloudJumpUsed = false;
  private cloudRide = false;
  private companionShield = false;
  private companionGuardUntil = 0;

  get hasCompanionShield(): boolean { return this.companionShield; }
  setCompanionShield(enabled: boolean): void { this.companionShield = enabled; }

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
    if (this.staffUpgraded !== upgraded) {
      this.staffUpgraded = upgraded;
      const pose = this.currentPose ?? 'idle';
      this.currentPose = undefined;
      this.setPose(pose);
    }
    this.updateStaffGlow();
  }

  setCloudRide(enabled: boolean): void {
    this.cloudRide = enabled;
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(!enabled);
    this.setVelocity(0, 0);
  }

  setMovementMultiplier(multiplier: number): void {
    this.movementMultiplier = multiplier;
  }

  // 근두운: one extra jump in mid-air, refreshed on landing.
  setCloudJump(unlocked: boolean): void {
    this.cloudJumpUnlocked = unlocked;
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
    if (this.cloudRide) {
      this.facing = 1;
      body.setVelocityX(input.left ? 95 : input.right ? 305 : 210);
      body.setVelocityY(input.jump ? -150 : 110);
      if (this.y <= 205 && body.velocity.y < 0 || this.y >= 408 && body.velocity.y > 0) body.setVelocityY(0);
      this.setY(Phaser.Math.Clamp(this.y, 205, 408));
      this.setFlipX(false);
      // The staff still swings from the cloud, so monsters on the way can be met.
      if (input.attack && !this.previousAttack) this.beginAttack();
      if (!this.attacking) {
        this.setPose('crouch');
        this.setAngle(input.jump ? -3 : 2);
      }
      this.updateStaffGlow();
      this.previousJump = input.jump;
      this.previousAttack = input.attack;
      return;
    }
    const grounded = body.blocked.down || body.touching.down;
    const crouching = input.down && grounded && !this.attacking;
    const jumpPressed = input.jump && !this.previousJump;
    const attackPressed = input.attack && !this.previousAttack;
    if (grounded && body.velocity.y >= 0) {
      this.lastGroundedAt = now;
      this.cloudJumpUsed = false;
    }
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
    } else if (jumpPressed && this.cloudJumpUnlocked && !this.cloudJumpUsed && !grounded && !crouching) {
      body.setVelocityY(-540);
      this.cloudJumpUsed = true;
      this.jumpBufferedUntil = 0;
      this.showCloudPuff();
      Sfx.cloud();
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

  private showCloudPuff(): void {
    const puff = this.scene.add.container(this.x, this.y - 6).setDepth(4.9);
    for (const [dx, dy, r] of [[-22, 2, 13], [0, -4, 17], [22, 2, 13], [-9, 7, 11], [11, 7, 11]] as const) {
      puff.add(this.scene.add.circle(dx, dy, r, 0xffffff, 0.95).setStrokeStyle(2, 0xbfe6ff));
    }
    this.scene.tweens.add({ targets: puff, scale: 1.5, alpha: 0, y: puff.y + 14, duration: 460, ease: 'Quad.easeOut', onComplete: () => puff.destroy() });
  }

  showStaffUpgradeEffect(): void {
    this.setStaffUpgraded(true);
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
    if (this.invulnerable || this.currentHealth <= 0 || this.scene.time.now < this.companionGuardUntil) {
      return false;
    }

    if (this.companionShield) {
      this.companionShield = false;
      this.companionGuardUntil = this.scene.time.now + 650;
      Sfx.cloud();
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
    this.setTexture(this.staffUpgraded ? `corn-wukong-golden-${pose}` : next.key);
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
    if (!this.staffUpgraded || !this.attackHitActive) {
      return;
    }

    // A short impact crescent at the actual hit area, never a second shaft.
    const hit = this.getAttackBounds();
    const tip = this.facing > 0 ? hit.right : hit.left;
    this.staffGlow.lineStyle(4, 0xffe8a3, 0.65);
    this.staffGlow.beginPath();
    this.staffGlow.arc(tip - this.facing * 14, hit.centerY, 28, this.facing > 0 ? -1.0 : Math.PI - 1.0, this.facing > 0 ? 1.0 : Math.PI + 1.0);
    this.staffGlow.strokePath();
  }
}
