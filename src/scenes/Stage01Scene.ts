import Phaser from 'phaser';
import { MudMonster } from '../entities/MudMonster';
import { Player } from '../entities/Player';
import { GAME_HEIGHT, GAME_WIDTH } from '../gameConfig';
import type { PlayerInputState } from '../types/InputState';
import { MobileControls } from '../ui/MobileControls';

export class Stage01Scene extends Phaser.Scene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.GameObjects.Group;
  private coins!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'A' | 'D' | 'SPACE', Phaser.Input.Keyboard.Key>;
  private mobileControls!: MobileControls;
  private healthText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private coinCount = 0;
  private stageCleared = false;

  constructor() {
    super('Stage01Scene');
  }

  create(): void {
    this.physics.world.setBounds(0, 0, 3200, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, 3200, GAME_HEIGHT);

    this.createGeneratedTextures();
    this.createBackground();
    this.createPlatforms();
    this.createCoins();
    this.createEnemies();

    this.player = new Player(this, 120, 382);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(180, 80);

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.player, this.enemies, (_playerObject, enemyObject) => {
      this.handlePlayerEnemyCollision(enemyObject as MudMonster);
    });
    this.physics.add.overlap(this.player, this.coins, (_playerObject, coinObject) => {
      this.collectCoin(coinObject as Phaser.GameObjects.GameObject);
    });

    this.createStageEnd();
    this.createInput();
    this.createUi();
  }

  update(): void {
    const input = this.readInput();
    this.player.update(input);

    this.enemies.children.each((child) => {
      (child as MudMonster).update();
      return true;
    });

    this.checkAttackHits();
  }

  private createInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('A,D,SPACE') as Record<
      'A' | 'D' | 'SPACE',
      Phaser.Input.Keyboard.Key
    >;
    this.mobileControls = new MobileControls(this);
  }

  private readInput(): PlayerInputState {
    const touch = this.mobileControls.getInput();
    return {
      left: this.cursors.left.isDown || this.keys.A.isDown || touch.left,
      right: this.cursors.right.isDown || this.keys.D.isDown || touch.right,
      down: this.cursors.down.isDown || touch.down,
      jump: this.cursors.up.isDown || touch.jump,
      attack: this.cursors.space.isDown || this.keys.SPACE.isDown || touch.attack
    };
  }

  private createBackground(): void {
    this.add.rectangle(0, 0, 3200, GAME_HEIGHT, 0x8ed8ff).setOrigin(0);
    this.add.circle(240, 88, 48, 0xffef8d).setScrollFactor(0.18);

    for (let i = 0; i < 8; i += 1) {
      const x = i * 460 + 120;
      this.add.triangle(x, 390, 0, 170, 170, 0, 360, 170, 0x6ea669).setScrollFactor(0.45);
      this.add.triangle(x + 70, 405, 0, 130, 140, 0, 300, 130, 0x557f58).setScrollFactor(0.5);
    }

    this.add.rectangle(0, 432, 3200, 108, 0x85c66a).setOrigin(0);
    this.add.rectangle(0, 486, 3200, 54, 0x5a813f).setOrigin(0);
  }

  private createPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();
    this.addPlatform(420, 438, 840, 54);
    this.addPlatform(1160, 388, 300, 42);
    this.addPlatform(1650, 438, 620, 54);
    this.addPlatform(2190, 350, 300, 42);
    this.addPlatform(2700, 438, 820, 54);
  }

  private addPlatform(x: number, y: number, width: number, height: number): void {
    const rect = this.add.rectangle(x, y, width, height, 0x8a5a2b).setStrokeStyle(4, 0x593518);
    this.physics.add.existing(rect, true);
    this.platforms.add(rect);
  }

  private createEnemies(): void {
    this.enemies = this.add.group();
    [
      { x: 760, y: 392, left: 690, right: 880 },
      { x: 1560, y: 392, left: 1470, right: 1690 },
      { x: 2470, y: 392, left: 2380, right: 2620 }
    ].forEach(({ x, y, left, right }) => {
      this.enemies.add(new MudMonster(this, x, y, left, right));
    });
  }

  private createCoins(): void {
    this.coins = this.physics.add.staticGroup();
    [460, 560, 660, 1160, 1260, 1730, 1830, 2190, 2290, 2780, 2880].forEach((x, index) => {
      const y = index === 3 || index === 4 || index === 7 || index === 8 ? 292 : 350;
      const coin = this.coins.create(x, y, 'corn-coin') as Phaser.Physics.Arcade.Sprite;
      coin.setScale(1);
      coin.refreshBody();
    });
  }

  private createStageEnd(): void {
    const gate = this.add.rectangle(3040, 340, 34, 184, 0xe9bb46).setStrokeStyle(4, 0x6e4300);
    this.add.text(3040, 230, '출구', { color: '#4f2e00', fontSize: '22px', fontStyle: 'bold' }).setOrigin(0.5);

    const endZone = this.add.zone(3070, 340, 120, 240);
    this.physics.add.existing(endZone, true);
    this.physics.add.overlap(this.player, endZone, () => {
      if (!this.stageCleared) {
        this.stageCleared = true;
        this.showDialogue();
      }
    });

    gate.setDepth(2);
  }

  private createUi(): void {
    this.healthText = this.add
      .text(18, 16, '', {
        color: '#2e2100',
        fontSize: '22px',
        fontStyle: 'bold',
        backgroundColor: 'rgba(255, 245, 190, 0.72)',
        padding: { x: 10, y: 6 }
      })
      .setScrollFactor(0)
      .setDepth(900);

    this.coinText = this.add
      .text(18, 58, '', {
        color: '#2e2100',
        fontSize: '20px',
        fontStyle: 'bold',
        backgroundColor: 'rgba(255, 245, 190, 0.72)',
        padding: { x: 10, y: 6 }
      })
      .setScrollFactor(0)
      .setDepth(900);

    this.updateUi();
  }

  private updateUi(): void {
    this.healthText.setText(`체력: ${this.player.health}`);
    this.coinText.setText(`옥수수 코인: ${this.coinCount}`);
  }

  private handlePlayerEnemyCollision(enemy: MudMonster): void {
    if (this.player.isAttackActive()) {
      enemy.defeat();
      return;
    }

    if (this.player.takeDamage()) {
      this.updateUi();
      if (this.player.health <= 0) {
        this.showRestartMessage();
      }
    }
  }

  private collectCoin(coinObject: Phaser.GameObjects.GameObject): void {
    coinObject.destroy();
    this.coinCount += 1;
    this.updateUi();
  }

  private checkAttackHits(): void {
    if (!this.player.isAttackActive()) {
      return;
    }

    const hitbox = this.player.getAttackBounds();
    this.enemies.children.each((child) => {
      const enemy = child as MudMonster;
      if (enemy.active && Phaser.Geom.Intersects.RectangleToRectangle(hitbox, enemy.getBounds())) {
        enemy.defeat();
      }
      return true;
    });
  }

  private showDialogue(): void {
    const panel = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 88, 820, 92, 0x241705, 0.9)
      .setScrollFactor(0)
      .setDepth(1100)
      .setStrokeStyle(4, 0xffcf4a);

    this.add
      .text(panel.x - 370, panel.y - 18, '삼장법사: 이제 함께 천축국으로 떠나자!', {
        color: '#fff2bb',
        fontSize: '26px',
        fontStyle: 'bold',
        wordWrap: { width: 740 }
      })
      .setScrollFactor(0)
      .setDepth(1101);
  }

  private showRestartMessage(): void {
    this.player.disableBody(true, false);
    this.add
      .text(GAME_WIDTH / 2, 160, '다시 도전!', {
        color: '#4f2500',
        fontSize: '42px',
        fontStyle: 'bold',
        backgroundColor: 'rgba(255, 232, 152, 0.9)',
        padding: { x: 18, y: 12 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1200);

    this.time.delayedCall(1300, () => this.scene.restart());
  }

  private createGeneratedTextures(): void {
    if (!this.textures.exists('mud-monster')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0x8b5a3a, 1);
      graphics.fillRoundedRect(8, 20, 80, 44, 18);
      graphics.fillStyle(0x6d3f27, 1);
      graphics.fillCircle(24, 52, 13);
      graphics.fillCircle(72, 52, 13);
      graphics.fillStyle(0xf5e2b6, 1);
      graphics.fillCircle(34, 36, 5);
      graphics.fillCircle(62, 36, 5);
      graphics.fillStyle(0x332116, 1);
      graphics.fillCircle(35, 37, 2);
      graphics.fillCircle(63, 37, 2);
      graphics.generateTexture('mud-monster', 96, 72);
      graphics.destroy();
    }

    if (!this.textures.exists('corn-coin')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xffd437, 1);
      graphics.fillEllipse(16, 16, 24, 28);
      graphics.lineStyle(3, 0x9b6800, 1);
      graphics.strokeEllipse(16, 16, 24, 28);
      graphics.lineBetween(16, 4, 16, 28);
      graphics.lineBetween(8, 14, 24, 14);
      graphics.lineBetween(9, 21, 23, 21);
      graphics.generateTexture('corn-coin', 32, 32);
      graphics.destroy();
    }
  }
}
