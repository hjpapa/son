import Phaser from 'phaser';
import { BossEnemy } from '../entities/BossEnemy';
import { Enemy } from '../entities/Enemy';
import { EnemyFactory } from '../entities/EnemyFactory';
import { Player } from '../entities/Player';
import { getStage, type StageBackgroundKey, type StageData, type StageHazard } from '../game/data/stages';
import { StageManager } from '../game/StageManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../gameConfig';
import type { PlayerInputState } from '../types/InputState';
import { DialogueBox } from '../ui/DialogueBox';
import { MobileControls } from '../ui/MobileControls';
import { chapterStories } from '../game/data/story';

type StageSceneInit = {
  stageId?: string;
};

type BackgroundPalette = {
  sky: number;
  far: number;
  near: number;
  ground: number;
  soil: number;
};

const palettes: Record<StageBackgroundKey, BackgroundPalette> = {
  cornfield: { sky: 0xffd44f, far: 0x85b957, near: 0x5b9148, ground: 0x78b85a, soil: 0x8a5a2b },
  cave: { sky: 0x2a2a34, far: 0x4c4c58, near: 0x35353f, ground: 0x55505a, soil: 0x29252c },
  palace: { sky: 0x55c7ff, far: 0x3f91d6, near: 0x2f6db3, ground: 0x68d7d8, soil: 0x245c9b },
  skywar: { sky: 0x92ddff, far: 0xffffff, near: 0xb7edff, ground: 0xa4d9ef, soil: 0x5fa2d8 },
  mountain: { sky: 0x8ed8ff, far: 0x7c674b, near: 0x5d4b39, ground: 0x85c66a, soil: 0x8a5a2b },
  farm: { sky: 0xffcc70, far: 0xdeb35f, near: 0xb6783d, ground: 0x81bd55, soil: 0x80512a },
  river: { sky: 0x76cfff, far: 0x3f9cdb, near: 0x2474b8, ground: 0x68b975, soil: 0x2c74a0 },
  wind: { sky: 0xf1d58a, far: 0xd8b763, near: 0xbe9145, ground: 0xd8c06a, soil: 0x9b7233 },
  forest: { sky: 0x86d6a3, far: 0x347f4d, near: 0x1f5b37, ground: 0x5fa857, soil: 0x5b3e26 },
  swamp: { sky: 0x536f55, far: 0x314a37, near: 0x253626, ground: 0x4d7040, soil: 0x263522 },
  gold: { sky: 0xffdf70, far: 0xd5a339, near: 0xb97b24, ground: 0xdfbd56, soil: 0x8a5a2b },
  ending: { sky: 0xfff1a8, far: 0xf2d377, near: 0xcaa24a, ground: 0x97c972, soil: 0x8a5a2b }
};

export class StageScene extends Phaser.Scene {
  private stage!: StageData;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private coins!: Phaser.Physics.Arcade.StaticGroup;
  private healthItems!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.GameObjects.Group;
  private boss?: BossEnemy;
  private staffItem?: Phaser.Physics.Arcade.Sprite;
  private staffHint?: Phaser.GameObjects.Text;
  private npcSprite?: Phaser.Physics.Arcade.Sprite;
  private npcNameText?: Phaser.GameObjects.Text;
  private companionSprites: Phaser.GameObjects.Sprite[] = [];
  private objectiveText?: Phaser.GameObjects.Text;
  private companionsText?: Phaser.GameObjects.Text;
  private hazardZones: Array<{ data: StageHazard; zone: Phaser.GameObjects.Zone }> = [];
  private npcMet = false;
  private rewardCollected = false;
  private hazardHitReadyAt = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'A' | 'D' | 'SPACE', Phaser.Input.Keyboard.Key>;
  private mobileControls!: MobileControls;
  private dialogue!: DialogueBox;
  private healthText!: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Graphics;
  private coinText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private experienceBar!: Phaser.GameObjects.Graphics;
  private bossBar?: Phaser.GameObjects.Graphics;
  private bossNameText?: Phaser.GameObjects.Text;
  private exitGate?: Phaser.GameObjects.Rectangle;
  private exitHint?: Phaser.GameObjects.Text;
  private bossExitUnlocked = false;
  private exitLockedMessageAt = 0;
  private surviveRemainingMs = 0;
  private surviveTimerText?: Phaser.GameObjects.Text;
  private coinCount = 0;
  private stageCleared = false;
  private inputLocked = true;
  private hitThisSwing = new Set<Enemy>();
  private lastAttackId = -1;
  private storyBeatsSeen = new Set<string>();
  private windTimer = 0;
  private revivesRemaining = 1;

  constructor() {
    super('StageScene');
  }

  init(data: StageSceneInit): void {
    this.stage = getStage(data.stageId ?? StageManager.getFirstStageId());
    this.boss = undefined;
    this.staffItem = undefined;
    this.staffHint = undefined;
    this.npcSprite = undefined;
    this.npcNameText = undefined;
    this.companionSprites = [];
    this.objectiveText = undefined;
    this.companionsText = undefined;
    this.hazardZones = [];
    this.npcMet = false;
    this.rewardCollected = false;
    this.hazardHitReadyAt = 0;
    this.bossNameText = undefined;
    this.exitGate = undefined;
    this.exitHint = undefined;
    this.coinCount = 0;
    this.stageCleared = false;
    this.inputLocked = true;
    this.bossExitUnlocked = false;
    this.exitLockedMessageAt = 0;
    this.surviveRemainingMs = 0;
    this.surviveTimerText = undefined;
    this.lastAttackId = -1;
    this.storyBeatsSeen.clear();
    this.windTimer = 0;
    this.revivesRemaining = 1;
    this.hitThisSwing.clear();
  }

  preload(): void {
    const textureKey = `background-${this.stage.backgroundKey}`;
    if (!this.textures.exists(textureKey)) {
      this.load.image(textureKey, `assets/backgrounds/${this.stage.backgroundKey}.webp`);
    }
  }

  create(): void {
    const worldWidth = this.stage.worldWidth;
    this.physics.world.setBounds(0, 0, worldWidth, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, worldWidth, GAME_HEIGHT);

    this.createGeneratedTextures();
    this.createBackground(worldWidth);
    this.createPlatforms(worldWidth);
    this.createCoins();
    this.createActors();
    this.createNpc();
    this.createHealthItems();
    this.createHazards();
    this.createGoal();
    this.createInput();
    this.createUi();

    this.dialogue = new DialogueBox(this);
    this.dialogue.show(this.stage.startDialogue, () => {
      this.inputLocked = false;
    });
  }

  update(_time: number, delta: number): void {
    if (!this.player?.active) {
      return;
    }

    const gameplayPaused = this.inputLocked || this.dialogue.isOpen;
    if (gameplayPaused) this.mobileControls.reset();
    else this.applyGimmicks(delta);
    this.player.update(gameplayPaused ? this.emptyInput() : this.readInput());
    this.updateCompanionFollowers();

    if (!gameplayPaused) {
      this.updateStoryBeats();
      if (this.dialogue.isOpen) return;
      this.enemies.children.each((child) => {
        (child as Enemy).updateEnemy(this.player, delta);
        return true;
      });
    }

    this.checkAttackHits();
    this.updateSurviveStage(delta);
    this.updateBossBar();
    this.updateBossNameText();
  }

  private updateStoryBeats(): void {
    if (this.stageCleared) return;
    const story = chapterStories[this.stage.id];
    const beats = [
      { id: 'trail', x: this.stage.worldWidth * 0.4, lines: story.trail },
      { id: 'encounter', x: (this.stage.boss?.x ?? Infinity) - 400, lines: story.encounter }
    ];
    for (const beat of beats) {
      if (this.player.x < beat.x || this.storyBeatsSeen.has(beat.id) || !beat.lines.length) continue;
      this.storyBeatsSeen.add(beat.id);
      this.dialogue.show(beat.lines);
      return;
    }
  }

  private createActors(): void {
    this.enemies = this.add.group();
    this.stage.enemies.forEach((enemyData) => {
      this.enemies.add(EnemyFactory.create(this, enemyData));
    });

    if (this.stage.boss) {
      this.boss = EnemyFactory.create(this, this.stage.boss) as BossEnemy;
      this.boss.onDefeated(() => this.handleBossDefeated());
      this.boss.onPlayerDamaged(() => this.handlePlayerDamaged());
      this.enemies.add(this.boss);
      this.bossNameText = this.add
        .text(this.boss.x, this.boss.y - 128, this.stage.boss.name, {
          color: '#fff1a3',
          fontSize: '20px',
          fontStyle: 'bold',
          stroke: '#321400',
          strokeThickness: 4
        })
        .setOrigin(0.5)
        .setDepth(70);
    }

    const nearGoal = import.meta.env.DEV && new URLSearchParams(window.location.search).get('nearGoal') === '1';
    const playerStartX = nearGoal ? Math.max(120, this.stage.goalX - 520) : this.stage.playerStart.x;
    this.player = new Player(this, playerStartX, this.stage.playerStart.y, StageManager.getMaxHealth());
    this.player.healFull();
    this.player.setAttackRangeMultiplier(StageManager.getAttackRangeMultiplier());
    this.player.setStaffUpgraded(StageManager.isStaffUpgraded());
    this.player.setLevelMovementMultiplier(StageManager.getMovementMultiplier());
    this.createCompanionFollowers();

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.player, this.enemies, (_playerObject, enemyObject) => {
      this.handlePlayerEnemyCollision(enemyObject as Enemy);
    });
    this.physics.add.overlap(this.player, this.coins, (_playerObject, coinObject) => {
      this.collectCoin(coinObject as Phaser.GameObjects.GameObject);
    });

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(180, 80);
  }

  private createCompanionFollowers(): void {
    const textureKeys: Record<string, string> = {
      '삼장법사': 'companion-samjang',
      '저팔계': 'companion-bajie',
      '사오정': 'companion-sandy'
    };

    this.companionSprites = StageManager.getCompanions().map((name, index) => {
      return this.add.sprite(this.player.x - 58 * (index + 1), this.player.y, textureKeys[name]).setOrigin(0.5, 1).setDepth(4).setDisplaySize(78, 78);
    });
  }

  private updateCompanionFollowers(): void {
    if (this.companionSprites.length === 0) {
      return;
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const trailDirection = body.velocity.x < -5 ? 1 : -1;
    this.companionSprites.forEach((companion, index) => {
      const targetX = this.player.x + trailDirection * (54 + index * 48);
      companion.x = Phaser.Math.Linear(companion.x, targetX, 0.08);
      companion.y = Phaser.Math.Linear(companion.y, this.player.y, 0.12);
      companion.setFlipX(trailDirection > 0);
    });
  }

  private createNpc(): void {
    const npc = this.stage.npc;
    if (!npc) {
      return;
    }

    this.npcSprite = this.physics.add.staticSprite(npc.x, npc.y, npc.spriteKey).setOrigin(0.5, 1).setDisplaySize(128, 128).setDepth(8);
    this.npcSprite.refreshBody();
    this.npcNameText = this.add
      .text(npc.x, npc.y - 138, `${npc.name}\n${npc.role}`, {
        align: 'center',
        color: '#fff6bd',
        fontSize: '18px',
        fontStyle: 'bold',
        stroke: '#321e08',
        strokeThickness: 4
      })
      .setOrigin(0.5, 1)
      .setDepth(9);

    const meetingZone = this.add.zone(npc.x, npc.y - 72, 170, 180);
    this.physics.add.existing(meetingZone, true);
    this.physics.add.overlap(this.player, meetingZone, () => this.handleNpcReached());

    this.tweens.add({
      targets: [this.npcSprite, this.npcNameText],
      y: '-=5',
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private handleNpcReached(): void {
    if (this.npcMet || this.stageCleared || !this.stage.npc) {
      return;
    }

    this.npcMet = true;
    this.inputLocked = true;
    this.dialogue.show(this.stage.npc.dialogue, () => {
      if (this.stage.clearMode === 'npc') {
        this.completeStage();
        return;
      }

      if (this.stage.clearMode === 'item' && this.staffItem) {
        this.unlockReward('부처님이 불경을 건네주셨어요!');
      }
      this.inputLocked = false;
    });
  }

  private createHazards(): void {
    this.stage.hazards.forEach((hazard) => {
      const zoneHeight = hazard.type === 'wind' ? 170 : 46;
      const zoneY = hazard.type === 'wind' ? hazard.y - 66 : hazard.y - 14;
      const zone = this.add.zone(hazard.x, zoneY, hazard.width, zoneHeight);
      this.physics.add.existing(zone, true);
      this.hazardZones.push({ data: hazard, zone });

      const startX = hazard.x - hazard.width / 2;
      if (hazard.type === 'spikes') {
        for (let x = startX + 12; x < startX + hazard.width; x += 24) {
          this.add.triangle(x, hazard.y, 0, 20, 12, 0, 24, 20, 0xd9d9d9).setStrokeStyle(2, 0x3d3d48).setDepth(5);
        }
      } else if (hazard.type === 'water') {
        this.add.rectangle(hazard.x, hazard.y, hazard.width, 28, 0x2ca6df, 0.85).setStrokeStyle(3, 0xb8f3ff).setDepth(4);
        for (let x = startX + 18; x < startX + hazard.width; x += 38) {
          this.add.arc(x, hazard.y - 10, 16, 180, 360, false, 0x91eaff, 0.8).setDepth(5);
        }
      } else if (hazard.type === 'mud') {
        this.add.ellipse(hazard.x, hazard.y, hazard.width, 46, 0x493d25, 0.9).setStrokeStyle(3, 0x77733d).setDepth(4);
        for (let x = startX + 35; x < startX + hazard.width; x += 70) {
          this.add.circle(x, hazard.y - 4, 8, 0x817544, 0.8).setDepth(5);
        }
      } else if (hazard.type === 'lightning') {
        const marker = this.add.rectangle(hazard.x, hazard.y, hazard.width, 18, 0x754cc8, 0.65).setStrokeStyle(3, 0xf8e85e).setDepth(4);
        this.tweens.add({ targets: marker, alpha: 0.18, duration: 430, yoyo: true, repeat: -1 });
        this.add.text(hazard.x, hazard.y - 34, '!', { color: '#fff266', fontSize: '32px', fontStyle: 'bold', stroke: '#45206f', strokeThickness: 4 }).setOrigin(0.5).setDepth(5);
      } else {
        this.add.rectangle(hazard.x, hazard.y - 56, hazard.width, 128, 0xffffff, 0.08).setStrokeStyle(2, 0xfff4be, 0.32).setDepth(3);
        for (let x = startX + 45; x < startX + hazard.width; x += 90) {
          this.add.text(x, hazard.y - 72, '>>>', { color: '#fff3bb', fontSize: '24px', fontStyle: 'bold' }).setAlpha(0.58).setDepth(4);
        }
      }

      if (hazard.type !== 'mud' && hazard.type !== 'wind') {
        this.physics.add.overlap(this.player, zone, () => this.handleHazardHit(hazard));
      }
    });
  }

  private handleHazardHit(hazard: StageHazard): void {
    if (this.stageCleared || this.inputLocked || this.dialogue.isOpen || this.time.now < this.hazardHitReadyAt) {
      return;
    }

    this.hazardHitReadyAt = this.time.now + 1600;
    if (this.player.takeDamage(1)) {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setVelocityY(-310);
      body.setVelocityX(this.player.x < hazard.x ? -190 : 190);
      this.showFloatingMessage(hazard.label, 900);
      this.handlePlayerDamaged();
    }
  }

  private createInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('A,D,SPACE') as Record<'A' | 'D' | 'SPACE', Phaser.Input.Keyboard.Key>;
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

  private emptyInput(): PlayerInputState {
    return { left: false, right: false, down: false, jump: false, attack: false };
  }

  private createBackground(worldWidth: number): void {
    const palette = palettes[this.stage.backgroundKey];
    const textureKey = `background-${this.stage.backgroundKey}`;
    this.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.add
      .image(0, 0, textureKey)
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setScrollFactor(0)
      .setDepth(-20);

    this.add.rectangle(0, 432, worldWidth, 108, palette.ground, 0.5).setOrigin(0);
    this.add.rectangle(0, 486, worldWidth, 54, palette.soil, 0.72).setOrigin(0);
  }

  private createPlatforms(worldWidth: number): void {
    this.platforms = this.physics.add.staticGroup();
    this.addPlatform(worldWidth / 2, 459, worldWidth, 54);
    this.stage.platforms.forEach((platform) => {
      this.addPlatform(platform.x, platform.y, platform.width, platform.height ?? 26);
    });
  }

  private addPlatform(x: number, y: number, width: number, height: number): void {
    const palette = palettes[this.stage.backgroundKey];
    const rect = this.add.rectangle(x, y, width, height, palette.soil, 0.9).setStrokeStyle(4, palette.near, 0.96);
    this.add.rectangle(x, y - height / 2 + 3, width - 4, 6, palette.ground, 0.95).setDepth(1);
    this.physics.add.existing(rect, true);
    this.platforms.add(rect);
  }

  private createCoins(): void {
    this.coins = this.physics.add.staticGroup();
    const positions = [
      { x: 430, y: 350 },
      { x: 550, y: 350 },
      { x: 680, y: 350 },
      { x: 1130, y: 290 },
      { x: 1240, y: 290 },
      { x: 1740, y: 350 },
      { x: 1870, y: 350 }
    ];

    positions.forEach(({ x, y }) => {
      const coin = this.coins.create(x, y, 'corn-coin') as Phaser.Physics.Arcade.Sprite;
      coin.refreshBody();
    });
  }

  private createHealthItems(): void {
    this.healthItems = this.physics.add.staticGroup();
    const candidates = Phaser.Utils.Array.Shuffle([
      { x: 910, y: 326 },
      { x: 1265, y: 326 },
      { x: 1510, y: 386 },
      { x: 1980, y: 306 },
      { x: this.stage.goalX - 420, y: 386 },
      { x: this.stage.goalX - 210, y: 386 }
    ]);

    candidates.slice(0, 3).forEach(({ x, y }) => {
      if (x < 260 || x > this.stage.goalX - 90) {
        return;
      }
      const item = this.healthItems.create(x, y, 'health-corn') as Phaser.Physics.Arcade.Sprite;
      item.refreshBody();
      this.tweens.add({
        targets: item,
        y: y - 8,
        duration: 820,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    this.physics.add.overlap(this.player, this.healthItems, (_playerObject, itemObject) => {
      this.collectHealthItem(itemObject as Phaser.GameObjects.GameObject);
    });
  }

  private createGoal(): void {
    if (this.stage.clearMode === 'npc') {
      return;
    }

    if (this.stage.clearMode === 'item') {
      const reward = this.stage.reward;
      const itemX = reward?.x ?? this.stage.goalX;
      const itemY = reward?.y ?? 324;
      const itemKey = reward?.type === 'sutra' ? 'sutra-item' : 'staff-item';
      const needsUnlock = Boolean(this.boss || this.stage.npc);
      this.add
        .rectangle(itemX, 406, 150, 18, 0xffd76a, 0.95)
        .setStrokeStyle(3, 0x5a3300)
        .setDepth(3);
      this.staffItem = this.physics.add.staticSprite(itemX, itemY, itemKey).setDepth(8);
      this.staffHint = this.add
        .text(itemX, itemY - 74, needsUnlock ? `봉인된 ${reward?.label ?? '보물'}` : reward?.label ?? '보물', {
          color: '#fff1a3',
          fontSize: '20px',
          fontStyle: 'bold',
          stroke: '#3b2100',
          strokeThickness: 4
        })
        .setOrigin(0.5)
        .setDepth(9);

      if (this.staffItem.body) {
        this.staffItem.body.enable = !needsUnlock;
      }
      if (needsUnlock) {
        this.staffItem.setAlpha(0.45);
        this.staffItem.setTint(0x6b86b8);
        this.add
          .circle(itemX, itemY, 64, 0x4f76ff, 0.18)
          .setStrokeStyle(5, 0x8fd4ff, 0.78)
          .setDepth(7);
      }
      this.tweens.add({
        targets: this.staffHint,
        y: '-=8',
        duration: 850,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      this.tweens.add({
        targets: this.staffItem,
        alpha: needsUnlock ? 0.62 : 1,
        duration: 850,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      this.physics.add.overlap(this.player, this.staffItem, () => this.collectReward());
      return;
    }

    this.exitGate = this.add.rectangle(this.stage.goalX, 340, 36, 184, 0xe7bd42).setStrokeStyle(4, 0x6e4300).setDepth(2);
    this.exitHint = this.add
      .text(this.stage.goalX, 228, this.stage.goalLabel, {
        color: '#4f2e00',
        fontSize: '22px',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    if (this.stage.clearMode === 'goal' || this.stage.clearMode === 'boss' || this.stage.clearMode === 'survive') {
      const endZone = this.add.zone(this.stage.goalX + 24, 340, 120, 240);
      this.physics.add.existing(endZone, true);
      this.physics.add.overlap(this.player, endZone, () => this.handleExitReached());
    }

    this.exitGate.setDepth(2);
  }

  private createUi(): void {
    this.healthText = this.add
      .text(18, 16, '체력', {
        color: '#2e2100',
        fontSize: '21px',
        fontStyle: 'bold',
        backgroundColor: 'rgba(255, 245, 190, 0.78)',
        padding: { x: 10, y: 6 }
      })
      .setScrollFactor(0)
      .setDepth(900);

    this.healthBar = this.add.graphics().setScrollFactor(0).setDepth(901);

    this.coinText = this.add
      .text(GAME_WIDTH - 18, 16, '', {
        color: '#2e2100',
        fontSize: '20px',
        fontStyle: 'bold',
        backgroundColor: 'rgba(255, 245, 190, 0.78)',
        padding: { x: 10, y: 6 }
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(900);

    this.titleText = this.add
      .text(GAME_WIDTH / 2, 17, `제 ${this.stage.chapter}장 · ${this.stage.title}`, {
        color: '#2e2100',
        fontSize: '21px',
        fontStyle: 'bold',
        backgroundColor: 'rgba(255, 245, 190, 0.72)',
        padding: { x: 12, y: 6 }
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(900);

    this.levelText = this.add
      .text(GAME_WIDTH - 18, 62, '', {
        color: '#fff5bd',
        fontSize: '16px',
        fontStyle: 'bold',
        backgroundColor: 'rgba(48, 40, 27, 0.72)',
        padding: { x: 9, y: 5 }
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(902);
    this.experienceBar = this.add.graphics().setScrollFactor(0).setDepth(902);

    this.objectiveText = this.add
      .text(GAME_WIDTH / 2, 56, `목표: ${this.stage.objective}`, {
        align: 'center',
        color: '#fff8d6',
        fontSize: '15px',
        fontStyle: 'bold',
        backgroundColor: 'rgba(42, 35, 24, 0.72)',
        padding: { x: 10, y: 5 },
        wordWrap: { width: 480 }
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(900);

    const companions = StageManager.getCompanions();
    this.companionsText = this.add
      .text(18, 62, companions.length > 0 ? `동료 ${companions.length}명 · 구름 부적 ${this.revivesRemaining}` : `구름 부적 ${this.revivesRemaining} · 동료 찾기`, {
        color: '#fff4c4',
        fontSize: '15px',
        fontStyle: 'bold',
        backgroundColor: 'rgba(48, 40, 27, 0.66)',
        padding: { x: 8, y: 5 }
      })
      .setScrollFactor(0)
      .setDepth(900);

    this.bossBar = this.add.graphics().setScrollFactor(0).setDepth(901);
    this.createSurviveTimerUi();
    this.updateUi();
  }

  private createSurviveTimerUi(): void {
    if (this.stage.clearMode !== 'survive') {
      return;
    }

    const seconds = this.stage.gimmicks.find((gimmick) => gimmick.type === 'surviveRun')?.value ?? 35;
    this.surviveRemainingMs = seconds * 1000;
    this.surviveTimerText = this.add
      .text(GAME_WIDTH / 2, 120, '', {
        color: '#ffffff',
        fontSize: '22px',
        fontStyle: 'bold',
        backgroundColor: 'rgba(30, 72, 130, 0.78)',
        padding: { x: 12, y: 6 }
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(902);
    this.updateSurviveTimerText();
  }

  private updateUi(): void {
    this.drawHealthBar();
    this.coinText.setText(`옥수수 코인: ${this.coinCount}`);
    this.drawExperienceBar();
  }

  private drawExperienceBar(): void {
    const progress = StageManager.getLevelProgress();
    const width = 174;
    const height = 11;
    const x = GAME_WIDTH - width - 18;
    const y = 96;
    const ratio = progress.level >= 10 ? 1 : progress.experience / progress.required;

    this.levelText.setText(progress.level >= 10 ? `레벨 ${progress.level} · 최고!` : `레벨 ${progress.level} · 경험 ${progress.experience}/${progress.required}`);
    this.experienceBar.clear();
    this.experienceBar.fillStyle(0x2b2117, 0.82);
    this.experienceBar.fillRoundedRect(x, y, width, height, 4);
    this.experienceBar.fillStyle(0x63cf65, 1);
    this.experienceBar.fillRoundedRect(x + 2, y + 2, Math.max(4, (width - 4) * ratio), height - 4, 3);
    this.experienceBar.lineStyle(2, 0xffe48a, 0.9);
    this.experienceBar.strokeRoundedRect(x, y, width, height, 4);
  }

  private drawHealthBar(): void {
    this.healthBar.clear();

    const x = 82;
    const y = 20;
    const width = 132;
    const height = 24;
    const gap = 4;
    const segmentWidth = (width - gap * (this.player.maxHealth - 1)) / this.player.maxHealth;

    this.healthBar.fillStyle(0x2b1808, 0.82);
    this.healthBar.fillRoundedRect(x - 4, y - 4, width + 8, height + 8, 6);

    for (let i = 0; i < this.player.maxHealth; i += 1) {
      this.healthBar.fillStyle(i < this.player.health ? 0xe9463f : 0x6f4b3f, 1);
      this.healthBar.fillRoundedRect(x + i * (segmentWidth + gap), y, segmentWidth, height, 4);
    }

    this.healthBar.lineStyle(2, 0xffdf73, 0.9);
    this.healthBar.strokeRoundedRect(x - 4, y - 4, width + 8, height + 8, 6);
  }

  private updateBossBar(): void {
    if (!this.bossBar) {
      return;
    }

    this.bossBar.clear();
    if (!this.boss?.active) {
      return;
    }

    const width = 420;
    const x = (GAME_WIDTH - width) / 2;
    const y = 94;
    this.bossBar.fillStyle(0x23160a, 0.82);
    this.bossBar.fillRoundedRect(x, y, width, 18, 5);
    this.bossBar.fillStyle(0xe74b3c, 1);
    this.bossBar.fillRoundedRect(x + 3, y + 3, (width - 6) * this.boss.hpRatio, 12, 4);
    this.bossBar.lineStyle(2, 0xffdf73, 0.9);
    this.bossBar.strokeRoundedRect(x, y, width, 18, 5);
  }

  private updateBossNameText(): void {
    if (!this.bossNameText) {
      return;
    }

    if (!this.boss?.active) {
      this.bossNameText.setVisible(false);
      return;
    }

    this.bossNameText.setPosition(this.boss.x, this.boss.y - this.boss.displayHeight - 8);
  }

  private handlePlayerEnemyCollision(enemy: Enemy): void {
    if (!enemy.active || this.stageCleared || this.inputLocked || this.dialogue.isOpen) {
      return;
    }

    if (this.player.isAttackActive()) {
      this.hitEnemy(enemy);
      return;
    }

    if (this.player.takeDamage(enemy.damage)) {
      this.handlePlayerDamaged();
    }
  }

  private checkAttackHits(): void {
    if (this.inputLocked || this.dialogue.isOpen) return;
    const attackActive = this.player.isAttackActive();

    if (!attackActive) {
      return;
    }

    const hitbox = this.player.getAttackBounds();
    this.enemies.children.each((child) => {
      const enemy = child as Enemy;
      if (enemy.active && Phaser.Geom.Intersects.RectangleToRectangle(hitbox, enemy.getBounds())) {
        this.hitEnemy(enemy);
      }
      return true;
    });
  }

  private hitEnemy(enemy: Enemy): void {
    if (!enemy.active || this.inputLocked || this.dialogue.isOpen) return;
    if (this.lastAttackId !== this.player.attackId) {
      this.hitThisSwing.clear();
      this.lastAttackId = this.player.attackId;
    }
    if (this.hitThisSwing.has(enemy)) return;
    this.hitThisSwing.add(enemy);
    const defeated = enemy.takeHit(StageManager.getAttackDamage());
    if (defeated) {
      this.gainExperience(enemy.enemyType === 'boss' ? 5 : 2);
    }
  }

  private collectCoin(coinObject: Phaser.GameObjects.GameObject): void {
    coinObject.destroy();
    this.coinCount += 1;
    this.gainExperience(1);
    this.updateUi();
  }

  private gainExperience(amount: number): void {
    const progress = StageManager.addExperience(amount);
    if (progress.leveledUp) {
      this.player.setAttackRangeMultiplier(StageManager.getAttackRangeMultiplier());
      this.player.setLevelMovementMultiplier(StageManager.getMovementMultiplier());
      this.player.applyLevelUp(progress.level, StageManager.getMaxHealth());
      this.showFloatingMessage('힘과 체력이 자랐어요!', 1500);
    }
    this.updateUi();
  }

  private collectHealthItem(itemObject: Phaser.GameObjects.GameObject): void {
    if (!this.player.heal(1)) {
      return;
    }

    itemObject.destroy();
    this.updateUi();
    const healText = this.add
      .text(this.player.x, this.player.y - 170, '회복!', {
        color: '#baff8a',
        fontSize: '20px',
        fontStyle: 'bold',
        stroke: '#12440f',
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(80);

    this.tweens.add({
      targets: healText,
      y: healText.y - 24,
      alpha: 0,
      duration: 900,
      onComplete: () => healText.destroy()
    });
  }

  private handlePlayerDamaged(): void {
    this.updateUi();
    if (this.player.health <= 0) {
      if (this.revivesRemaining > 0) {
        this.revivesRemaining -= 1;
        const companions = StageManager.getCompanions();
        this.companionsText?.setText(companions.length > 0 ? `동료 ${companions.length}명 · 구름 부적 ${this.revivesRemaining}` : `구름 부적 ${this.revivesRemaining} · 동료 찾기`);
        this.inputLocked = true;
        this.player.revive();
        this.showFloatingMessage('구름 부적이 도와줬어!', 1600);
        this.time.delayedCall(900, () => {
          if (!this.stageCleared) this.inputLocked = false;
        });
        this.updateUi();
      } else {
        this.restartStage();
      }
    }
  }

  private handleBossDefeated(): void {
    if (this.stage.clearMode === 'boss') {
      this.unlockBossExit();
      return;
    }

    if (this.stage.clearMode === 'item' && this.staffItem) {
      this.unlockReward('수문장이 물러났어요! 여의봉의 봉인이 풀렸습니다.');
      this.inputLocked = true;
      this.dialogue.show(chapterStories[this.stage.id].resolution, () => {
        this.inputLocked = false;
      });
    }
  }

  private unlockReward(message?: string): void {
    if (!this.staffItem) {
      return;
    }

    this.staffItem.setVisible(true).setAlpha(1).clearTint();
    if (this.staffItem.body) {
      this.staffItem.body.enable = true;
    }
    this.staffItem.refreshBody();
    this.staffHint?.setText(`${this.stage.reward?.label ?? '보물'} 획득!`);
    if (message) {
      this.showFloatingMessage(message, 1600);
    }
  }

  private handleExitReached(): void {
    if (this.stage.id === 'stage-01' && this.coinCount < 5) {
      this.showFloatingMessage(`옥수수 코인 ${5 - this.coinCount}개가 더 필요해!`, 1200);
      return;
    }

    if (this.stage.clearMode === 'boss' && !this.bossExitUnlocked) {
      if (this.time.now > this.exitLockedMessageAt) {
        this.exitLockedMessageAt = this.time.now + 1800;
        const warning = this.add
          .text(this.player.x, this.player.y - 150, '보스를 먼저 물리치자!', {
            color: '#fff1a3',
            fontSize: '20px',
            fontStyle: 'bold',
            stroke: '#3a1700',
            strokeThickness: 4
          })
          .setOrigin(0.5)
          .setDepth(80);

        this.tweens.add({
          targets: warning,
          y: warning.y - 20,
          alpha: 0,
          duration: 1000,
          onComplete: () => warning.destroy()
        });
      }
      return;
    }

    if (this.stage.clearMode === 'survive') {
      if (this.surviveRemainingMs > 0) {
        this.showFloatingMessage('아직 추격 중이야!', 1000);
        return;
      }
      this.completeStage();
      return;
    }

    this.completeStage();
  }

  private unlockBossExit(): void {
    if (this.bossExitUnlocked) {
      return;
    }

    this.bossExitUnlocked = true;
    this.exitGate?.setFillStyle(0x8cff6b, 0.95).setStrokeStyle(4, 0xffffff);
    this.exitHint?.setText('길 열림!');
    this.inputLocked = true;
    this.dialogue.show(chapterStories[this.stage.id].resolution, () => {
      this.inputLocked = false;
    });
  }

  private showFloatingMessage(message: string, duration = 1000): void {
    const floating = this.add
      .text(this.player.x, this.player.y - 150, message, {
        color: '#fff1a3',
        fontSize: '20px',
        fontStyle: 'bold',
        stroke: '#3a1700',
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(80);

    this.tweens.add({
      targets: floating,
      y: floating.y - 20,
      alpha: 0,
      duration,
      onComplete: () => floating.destroy()
    });
  }

  private collectReward(): void {
    if (this.stageCleared || this.rewardCollected || !this.staffItem?.visible || !this.staffItem.body?.enable) {
      return;
    }

    this.rewardCollected = true;
    if (this.stage.reward?.type === 'staff') {
      StageManager.setStaffUpgraded(true);
      this.player.setAttackRangeMultiplier(StageManager.getAttackRangeMultiplier());
      this.player.showStaffUpgradeEffect();
      this.showFloatingMessage('황금 여의봉 획득!', 1800);
    } else {
      this.showFloatingMessage('서유기의 불경 획득!', 1800);
    }
    this.staffItem.disableBody(true, true);
    this.staffHint?.destroy();
    this.inputLocked = true;
    this.time.delayedCall(2100, () => this.completeStage());
  }

  private completeStage(): void {
    if (this.stageCleared) {
      return;
    }

    this.stageCleared = true;
    this.inputLocked = true;
    StageManager.markStageCleared(this.stage.id);
    this.dialogue.show(this.stage.clearDialogue, () => {
      if (StageManager.isLastStage(this.stage.id)) {
        this.scene.start('EndingScene', { stageId: this.stage.id });
      } else {
        this.scene.start('StageClearScene', { stageId: this.stage.id });
      }
    });
  }

  private restartStage(): void {
    this.inputLocked = true;
    this.player.disableBody(true, false);
    this.add
      .text(GAME_WIDTH / 2, 156, '다시 도전!', {
        color: '#4f2500',
        fontSize: '42px',
        fontStyle: 'bold',
        backgroundColor: 'rgba(255, 232, 152, 0.9)',
        padding: { x: 18, y: 12 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2100);

    this.time.delayedCall(1200, () => this.scene.restart({ stageId: this.stage.id }));
  }

  private applyGimmicks(delta: number): void {
    const mudZone = this.hazardZones.find(({ data, zone }) => {
      return data.type === 'mud' && Math.abs(this.player.x - zone.x) <= zone.width / 2 && Math.abs(this.player.y - zone.y) <= zone.height / 2;
    });
    this.player.setMovementMultiplier(mudZone ? mudZone.data.value ?? 0.65 : 1);

    const wind = this.stage.gimmicks.find((gimmick) => gimmick.type === 'windPush');
    const windZone = this.hazardZones.find(({ data, zone }) => {
      return data.type === 'wind' && Math.abs(this.player.x - zone.x) <= zone.width / 2 && Math.abs(this.player.y - zone.y) <= zone.height / 2;
    });
    if (!wind || !windZone || this.inputLocked) {
      this.windTimer = 0;
      return;
    }

    this.windTimer += delta;
    if (this.windTimer > 2600) {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(body.velocity.x - (wind.value ?? 90));
      if (this.windTimer > 3300) {
        this.windTimer = 0;
      }
    }
  }

  private updateSurviveStage(delta: number): void {
    if (this.stage.clearMode !== 'survive' || this.stageCleared || this.inputLocked || this.dialogue.isOpen) {
      return;
    }

    this.surviveRemainingMs = Math.max(0, this.surviveRemainingMs - delta);
    this.updateSurviveTimerText();

    if (this.boss?.active) {
      const chaseOffset = Phaser.Math.Clamp(this.boss.x - this.player.x, -520, 520);
      if (Math.abs(chaseOffset) >= 500) {
        this.boss.setX(this.player.x + Math.sign(chaseOffset) * 480);
      }
    }

    if (this.surviveRemainingMs <= 0) {
      this.completeStage();
    }
  }

  private updateSurviveTimerText(): void {
    if (!this.surviveTimerText) {
      return;
    }

    const seconds = Math.ceil(this.surviveRemainingMs / 1000);
    this.surviveTimerText.setText(`추격전: ${seconds}초 버티기`);
    if (seconds <= 10) {
      this.surviveTimerText.setStyle({
        color: '#fff1a3',
        fontSize: '24px',
        fontStyle: 'bold',
        backgroundColor: 'rgba(143, 35, 35, 0.82)',
        padding: { x: 12, y: 6 }
      });
    }
  }

  private createGeneratedTextures(): void {
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

    if (!this.textures.exists('staff-item')) {
      const graphics = this.add.graphics();
      graphics.lineStyle(8, 0xffd23f, 1);
      graphics.lineBetween(8, 32, 88, 18);
      graphics.lineStyle(3, 0x8a5a00, 1);
      graphics.lineBetween(8, 36, 88, 22);
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(88, 18, 5);
      graphics.generateTexture('staff-item', 96, 48);
      graphics.destroy();
    }

    if (!this.textures.exists('sutra-item')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xfff0a8, 1);
      graphics.fillRoundedRect(12, 8, 70, 48, 7);
      graphics.lineStyle(4, 0xa44b24, 1);
      graphics.strokeRoundedRect(12, 8, 70, 48, 7);
      graphics.fillStyle(0xc73f2d, 1);
      graphics.fillRect(39, 8, 16, 48);
      graphics.fillStyle(0xffd75a, 1);
      graphics.fillCircle(47, 32, 7);
      graphics.lineStyle(3, 0x7d321f, 1);
      graphics.lineBetween(18, 20, 35, 20);
      graphics.lineBetween(59, 20, 76, 20);
      graphics.generateTexture('sutra-item', 94, 64);
      graphics.destroy();
    }

    if (!this.textures.exists('health-corn')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0x2f9c3f, 1);
      graphics.fillCircle(16, 17, 13);
      graphics.fillStyle(0xe94742, 1);
      graphics.fillCircle(13, 15, 8);
      graphics.fillCircle(21, 15, 8);
      graphics.fillTriangle(7, 19, 27, 19, 17, 30);
      graphics.lineStyle(3, 0xffffff, 1);
      graphics.strokeCircle(16, 17, 13);
      graphics.generateTexture('health-corn', 34, 34);
      graphics.destroy();
    }

    if (!this.textures.exists('boss-orb')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(18, 18, 16);
      graphics.fillStyle(0xfff4b0, 1);
      graphics.fillCircle(22, 14, 8);
      graphics.lineStyle(3, 0x492b1a, 1);
      graphics.strokeCircle(18, 18, 15);
      graphics.generateTexture('boss-orb', 36, 36);
      graphics.destroy();
    }

    if (!this.textures.exists('boss-wave')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xffffff, 0.95);
      graphics.fillTriangle(2, 26, 64, 4, 64, 48);
      graphics.lineStyle(3, 0x6b3500, 1);
      graphics.strokeTriangle(2, 26, 64, 4, 64, 48);
      graphics.generateTexture('boss-wave', 68, 52);
      graphics.destroy();
    }

    const colorByKey: Array<[string, number]> = [
      ['honse', 0xb53a32], ['gatekeeper', 0x248aa8], ['erlang', 0x3568b8], ['bajie', 0xe68f9b],
      ['sandy', 0x387d9d], ['yellowwind', 0xd4a238], ['boss-tiger', 0xdb7638], ['boss-mud', 0x655a34],
      ['shadow', 0x604b91], ['crow', 0x202020], ['worm', 0x9bc34a], ['grasshopper', 0x65a54e],
      ['bat', 0x4b3b72], ['stone', 0x8a8a8a], ['rock', 0x777f86], ['bubble', 0x9eeaff],
      ['crab', 0xe06b43], ['seahorse', 0x62b6bf], ['cloud', 0xe9f5ff], ['thunder', 0x6e78c9],
      ['heaven', 0xd6c159], ['wind', 0xd8c16d], ['pig', 0xc98287], ['pumpkin', 0xe79a3b],
      ['bull', 0x704833], ['fish', 0x55a6d8], ['whirlpool', 0x3d87bd], ['frog', 0x70a952],
      ['sand', 0xd0aa59], ['tornado', 0xb8aa82], ['wolf', 0x776854], ['tiger', 0xd57735],
      ['tree', 0x4e7740], ['moth', 0x8b77a5], ['mud', 0x625232], ['swamp', 0x506a3d],
      ['mist', 0x829574], ['pride', 0xb96b57], ['fear', 0x56638f], ['haste', 0xb68c3f]
    ];

    const spriteKeys = new Set<string>();
    this.stage.enemies.forEach((enemy) => spriteKeys.add(enemy.spriteKey));
    if (this.stage.boss) {
      spriteKeys.add(this.stage.boss.spriteKey);
    }

    spriteKeys.forEach((key) => {
      if (this.textures.exists(key)) {
        return;
      }

      const color = colorByKey.find(([part]) => key.includes(part))?.[1] ?? 0x8b5a3a;
      this.createStoryEnemyTexture(key, color);
    });

    const npc = this.stage.npc;
    if (npc && !this.textures.exists(npc.spriteKey)) {
      const graphics = this.add.graphics();
      if (npc.spriteKey.includes('buddha')) {
        graphics.fillStyle(0xffe66c, 0.45);
        graphics.fillCircle(48, 42, 38);
      }
      graphics.fillStyle(0xf2bd78, 1);
      graphics.fillCircle(48, 35, 20);
      graphics.fillStyle(npc.color, 1);
      graphics.fillRoundedRect(18, 54, 60, 67, 18);
      graphics.lineStyle(4, 0x5a321c, 1);
      graphics.strokeRoundedRect(18, 54, 60, 67, 18);
      graphics.fillStyle(npc.spriteKey.includes('buddha') ? 0x275eaa : 0x8d2929, 1);
      graphics.fillRect(43, 57, 10, 61);
      graphics.fillStyle(0x2a1a10, 1);
      graphics.fillCircle(41, 34, 2);
      graphics.fillCircle(55, 34, 2);
      graphics.lineStyle(2, 0x6b321a, 1);
      graphics.lineBetween(42, 44, 54, 44);
      graphics.generateTexture(npc.spriteKey, 96, 128);
      graphics.destroy();
    }

    const companionLooks: Record<string, { key: string; body: number; head: number; accent: number }> = {
      '삼장법사': { key: 'companion-samjang', body: 0xe9b44c, head: 0xf2bd78, accent: 0xa32f2f },
      '저팔계': { key: 'companion-bajie', body: 0x5a9e62, head: 0xe99a9f, accent: 0x6e3c31 },
      '사오정': { key: 'companion-sandy', body: 0x4d8fb4, head: 0x74a9b9, accent: 0x8a2f2a }
    };
    StageManager.getCompanions().forEach((name) => {
      const look = companionLooks[name];
      if (!look || this.textures.exists(look.key)) {
        return;
      }

      const graphics = this.add.graphics();
      if (name === '저팔계') {
        graphics.fillStyle(look.head, 1);
        graphics.fillCircle(10, 21, 8);
        graphics.fillCircle(38, 21, 8);
      }
      graphics.fillStyle(look.head, 1);
      graphics.fillCircle(24, 21, 15);
      graphics.fillStyle(look.body, 1);
      graphics.fillRoundedRect(8, 34, 32, 30, 10);
      graphics.lineStyle(3, 0x4b2c1b, 1);
      graphics.strokeRoundedRect(8, 34, 32, 30, 10);
      graphics.fillStyle(look.accent, 1);
      graphics.fillRect(21, 35, 6, 27);
      graphics.fillStyle(0x24170f, 1);
      graphics.fillCircle(19, 20, 2);
      graphics.fillCircle(29, 20, 2);
      if (name === '삼장법사') {
        graphics.fillStyle(0xa32f2f, 1);
        graphics.fillRect(12, 3, 24, 7);
        graphics.fillRect(17, 0, 14, 9);
      } else if (name === '사오정') {
        graphics.fillStyle(0x8a2f2a, 1);
        graphics.fillCircle(24, 6, 9);
      } else {
        graphics.fillStyle(0xd87f85, 1);
        graphics.fillEllipse(24, 27, 15, 9);
      }
      graphics.generateTexture(look.key, 48, 66);
      graphics.destroy();
    });
  }

  private createStoryEnemyTexture(key: string, color: number): void {
    const isBoss = key.startsWith('boss-');
    const width = isBoss ? 112 : 96;
    const height = isBoss ? 90 : 78;
    const outline = 0x3b2717;
    const cream = 0xffedb5;
    const graphics = this.add.graphics();
    const lineWidth = isBoss ? 5 : 4;

    const ellipse = (x: number, y: number, w: number, h: number, fill: number, stroke = outline) => {
      graphics.fillStyle(fill, 1);
      graphics.fillEllipse(x, y, w, h);
      graphics.lineStyle(lineWidth, stroke, 1);
      graphics.strokeEllipse(x, y, w, h);
    };
    const circle = (x: number, y: number, radius: number, fill: number, stroke = outline) => {
      graphics.fillStyle(fill, 1);
      graphics.fillCircle(x, y, radius);
      graphics.lineStyle(lineWidth, stroke, 1);
      graphics.strokeCircle(x, y, radius);
    };
    const rounded = (x: number, y: number, w: number, h: number, radius: number, fill: number, stroke = outline) => {
      graphics.fillStyle(fill, 1);
      graphics.fillRoundedRect(x, y, w, h, radius);
      graphics.lineStyle(lineWidth, stroke, 1);
      graphics.strokeRoundedRect(x, y, w, h, radius);
    };
    const triangle = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, fill: number) => {
      graphics.fillStyle(fill, 1);
      graphics.fillTriangle(x1, y1, x2, y2, x3, y3);
      graphics.lineStyle(lineWidth, outline, 1);
      graphics.strokeTriangle(x1, y1, x2, y2, x3, y3);
    };
    const eyes = (y: number, left = width * 0.39, right = width * 0.61, radius = isBoss ? 7 : 6) => {
      circle(left, y, radius, 0xffffff);
      circle(right, y, radius, 0xffffff);
      graphics.fillStyle(0x24170f, 1);
      graphics.fillCircle(left + 1, y + 1, Math.max(2, radius - 3));
      graphics.fillCircle(right + 1, y + 1, Math.max(2, radius - 3));
    };
    const mouth = (y: number, halfWidth = 10) => {
      graphics.lineStyle(lineWidth - 1, outline, 1);
      graphics.lineBetween(width / 2 - halfWidth, y, width / 2 + halfWidth, y);
    };
    const feet = (left: number, right: number, y: number, fill = cream) => {
      ellipse(left, y, 18, 8, fill);
      ellipse(right, y, 18, 8, fill);
    };
    const speedLines = (x: number, y: number, fill = outline) => {
      graphics.lineStyle(4, fill, 1);
      graphics.lineBetween(x, y, x + 15, y);
      graphics.lineBetween(x + 3, y + 9, x + 19, y + 9);
      graphics.lineBetween(x, y + 18, x + 12, y + 18);
    };

    switch (key) {
      case 'enemy-crow':
        ellipse(48, 43, 56, 48, color);
        triangle(22, 41, 5, 28, 25, 58, 0x323232);
        triangle(70, 38, 94, 44, 71, 52, 0xffc83d);
        circle(57, 33, 7, 0xffffff);
        graphics.fillStyle(0x24170f, 1);
        graphics.fillCircle(59, 34, 3);
        feet(38, 57, 69, 0xffc83d);
        break;
      case 'enemy-worm':
        circle(27, 52, 15, 0x7ea943);
        circle(46, 48, 17, color);
        circle(68, 44, 19, 0xb5d95e);
        eyes(40, 62, 74, 5);
        graphics.lineStyle(3, outline, 1);
        graphics.lineBetween(61, 25, 57, 15);
        graphics.lineBetween(73, 25, 79, 14);
        break;
      case 'enemy-grasshopper':
        ellipse(50, 45, 55, 40, color);
        circle(71, 34, 15, 0x82bc55);
        eyes(31, 67, 77, 5);
        graphics.lineStyle(4, outline, 1);
        graphics.lineBetween(28, 54, 10, 70);
        graphics.lineBetween(43, 58, 33, 75);
        graphics.lineBetween(67, 20, 60, 8);
        graphics.lineBetween(76, 20, 85, 7);
        break;
      case 'enemy-bat':
        triangle(38, 35, 4, 16, 16, 59, 0x66538d);
        triangle(58, 35, 92, 16, 80, 59, 0x66538d);
        ellipse(48, 45, 31, 50, color);
        triangle(36, 26, 38, 10, 47, 28, color);
        triangle(60, 26, 58, 10, 49, 28, color);
        eyes(39, 42, 54, 5);
        mouth(55, 7);
        break;
      case 'enemy-stone':
        rounded(15, 24, 66, 45, 15, color);
        triangle(20, 30, 37, 12, 48, 28, 0xa6a6a6);
        graphics.lineStyle(3, 0x5b5b5b, 1);
        graphics.lineBetween(26, 39, 37, 47);
        graphics.lineBetween(37, 47, 31, 59);
        eyes(43, 38, 59, 5);
        mouth(58, 8);
        break;
      case 'enemy-horn':
        triangle(30, 27, 22, 3, 43, 26, cream);
        triangle(66, 27, 74, 3, 53, 26, cream);
        rounded(14, 23, 68, 48, 17, color);
        eyes(43);
        graphics.fillStyle(0xffcf8d, 1);
        graphics.fillEllipse(48, 55, 21, 13);
        mouth(61, 8);
        break;
      case 'enemy-bubble':
        circle(49, 40, 29, 0x9eeaff, 0x3287a6);
        circle(24, 22, 9, 0xdaf8ff, 0x3287a6);
        circle(75, 16, 7, 0xdaf8ff, 0x3287a6);
        graphics.fillStyle(0xffffff, 0.8);
        graphics.fillCircle(39, 28, 7);
        eyes(43, 41, 58, 5);
        mouth(57, 7);
        break;
      case 'enemy-crab':
        ellipse(48, 47, 55, 38, color);
        circle(16, 38, 12, 0xed8057);
        circle(80, 38, 12, 0xed8057);
        graphics.lineStyle(4, outline, 1);
        graphics.lineBetween(33, 52, 18, 69);
        graphics.lineBetween(43, 57, 36, 73);
        graphics.lineBetween(63, 53, 78, 69);
        graphics.lineBetween(53, 58, 60, 73);
        circle(39, 28, 7, 0xffffff);
        circle(57, 28, 7, 0xffffff);
        graphics.fillStyle(0x24170f, 1);
        graphics.fillCircle(40, 29, 3);
        graphics.fillCircle(58, 29, 3);
        mouth(52, 8);
        break;
      case 'enemy-seahorse':
        circle(57, 27, 18, color);
        ellipse(46, 51, 27, 39, 0x72c9c9);
        rounded(66, 25, 24, 10, 5, cream);
        circle(59, 24, 5, 0xffffff);
        graphics.fillStyle(0x24170f, 1);
        graphics.fillCircle(60, 25, 2);
        graphics.lineStyle(5, outline, 1);
        graphics.lineBetween(42, 66, 28, 69);
        graphics.lineBetween(28, 69, 24, 58);
        graphics.lineBetween(24, 58, 33, 54);
        triangle(36, 39, 20, 30, 33, 52, 0x4c9aa5);
        break;
      case 'enemy-cloud':
        circle(32, 48, 20, 0xf5fbff, 0x60788b);
        circle(49, 38, 25, color, 0x60788b);
        circle(69, 49, 18, 0xf5fbff, 0x60788b);
        rounded(27, 27, 43, 10, 4, 0xd7b83c);
        eyes(45, 41, 57, 5);
        graphics.lineStyle(4, 0x8c6a22, 1);
        graphics.lineBetween(83, 18, 83, 70);
        triangle(83, 15, 76, 29, 90, 29, 0xffd45a);
        break;
      case 'enemy-thunderbird':
        ellipse(48, 43, 55, 44, color);
        triangle(24, 42, 3, 17, 33, 31, 0x7d8fe1);
        triangle(69, 42, 93, 20, 66, 34, 0x7d8fe1);
        triangle(69, 39, 94, 44, 70, 53, 0xffd34e);
        circle(57, 34, 6, 0xffffff);
        graphics.fillStyle(0x24170f, 1);
        graphics.fillCircle(59, 35, 3);
        graphics.lineStyle(6, 0xffdc4f, 1);
        graphics.lineBetween(38, 45, 50, 51);
        graphics.lineBetween(50, 51, 42, 64);
        break;
      case 'enemy-heaven-spear':
        circle(46, 29, 18, 0xe9b77a);
        rounded(22, 43, 49, 30, 9, color);
        rounded(29, 7, 34, 13, 4, 0xe7c348);
        triangle(46, 6, 37, 18, 55, 18, 0xf6dc67);
        eyes(29, 40, 52, 5);
        graphics.lineStyle(5, outline, 1);
        graphics.lineBetween(80, 8, 80, 74);
        triangle(80, 4, 72, 18, 88, 18, 0xffd45a);
        break;
      case 'enemy-rock':
        rounded(10, 26, 76, 45, 13, color);
        triangle(15, 32, 35, 12, 49, 30, 0x929aa0);
        triangle(52, 29, 68, 14, 82, 35, 0x6d7479);
        eyes(45, 38, 59, 5);
        graphics.lineStyle(3, 0x454b4f, 1);
        graphics.lineBetween(61, 52, 69, 60);
        graphics.lineBetween(69, 60, 62, 69);
        mouth(59, 10);
        break;
      case 'enemy-mountain-wind':
        ellipse(50, 46, 69, 45, color, 0x806532);
        graphics.lineStyle(5, 0xf4e3a1, 1);
        graphics.lineBetween(18, 30, 42, 30);
        graphics.lineBetween(9, 43, 34, 43);
        graphics.lineBetween(17, 56, 40, 56);
        eyes(43, 53, 68, 5);
        graphics.lineStyle(4, outline, 1);
        graphics.strokeCircle(61, 58, 7);
        break;
      case 'enemy-stone-monkey':
        circle(24, 37, 12, 0x777f86);
        circle(72, 37, 12, 0x777f86);
        ellipse(48, 44, 53, 52, color);
        ellipse(48, 49, 31, 26, 0xc7b28e);
        eyes(39, 40, 56, 5);
        graphics.lineStyle(4, outline, 1);
        graphics.lineBetween(69, 59, 84, 67);
        graphics.lineBetween(84, 67, 89, 56);
        break;
      case 'enemy-pig':
        circle(27, 30, 12, 0xe9a2a6);
        circle(69, 30, 12, 0xe9a2a6);
        ellipse(48, 44, 57, 50, color);
        ellipse(48, 52, 28, 18, 0xf3b0ad);
        graphics.fillStyle(0x8b4947, 1);
        graphics.fillCircle(43, 52, 3);
        graphics.fillCircle(53, 52, 3);
        eyes(37, 40, 56, 5);
        break;
      case 'enemy-pumpkin':
        ellipse(48, 47, 63, 49, color);
        graphics.lineStyle(3, 0xb55c1c, 1);
        graphics.strokeEllipse(38, 47, 26, 47);
        graphics.strokeEllipse(58, 47, 26, 47);
        rounded(43, 9, 11, 17, 4, 0x4f7d35);
        triangle(31, 41, 41, 34, 42, 45, 0xffe270);
        triangle(65, 41, 55, 34, 54, 45, 0xffe270);
        mouth(57, 12);
        break;
      case 'enemy-bull':
        triangle(31, 28, 13, 8, 39, 22, cream);
        triangle(65, 28, 83, 8, 57, 22, cream);
        ellipse(48, 44, 61, 51, color);
        circle(35, 35, 7, 0xffffff);
        circle(61, 35, 7, 0xffffff);
        graphics.fillStyle(0x24170f, 1);
        graphics.fillCircle(37, 36, 3);
        graphics.fillCircle(63, 36, 3);
        ellipse(48, 55, 29, 18, 0xb9865e);
        break;
      case 'enemy-fish':
        triangle(29, 42, 5, 23, 5, 61, 0x7ac7ea);
        ellipse(54, 42, 61, 40, color, 0x315d7b);
        triangle(50, 29, 65, 12, 70, 32, 0x7ac7ea);
        circle(70, 36, 6, 0xffffff);
        graphics.fillStyle(0x24170f, 1);
        graphics.fillCircle(72, 37, 3);
        mouth(51, 7);
        break;
      case 'enemy-whirlpool':
        ellipse(48, 49, 72, 38, color, 0x245f8c);
        ellipse(48, 45, 50, 24, 0x71bde0, 0x245f8c);
        ellipse(48, 43, 25, 11, 0xd1f3ff, 0x245f8c);
        eyes(47, 41, 56, 4);
        break;
      case 'enemy-frog':
        circle(32, 29, 15, color);
        circle(64, 29, 15, color);
        ellipse(48, 48, 62, 45, 0x7fba57);
        circle(33, 28, 7, 0xffffff);
        circle(63, 28, 7, 0xffffff);
        graphics.fillStyle(0x24170f, 1);
        graphics.fillCircle(34, 29, 3);
        graphics.fillCircle(64, 29, 3);
        mouth(54, 15);
        feet(28, 68, 71, 0x91ca64);
        break;
      case 'enemy-sand':
        ellipse(49, 48, 74, 40, color, 0x886a32);
        circle(29, 42, 17, 0xe0be70, 0x886a32);
        circle(63, 39, 22, 0xd7b467, 0x886a32);
        eyes(45, 51, 66, 5);
        graphics.lineStyle(4, 0xffe4a1, 1);
        graphics.lineBetween(13, 61, 42, 61);
        break;
      case 'enemy-tornado':
        graphics.lineStyle(12, color, 1);
        graphics.lineBetween(18, 23, 80, 23);
        graphics.lineBetween(27, 38, 70, 38);
        graphics.lineBetween(35, 53, 63, 53);
        graphics.lineBetween(43, 68, 55, 68);
        graphics.lineStyle(4, outline, 1);
        graphics.lineBetween(15, 18, 83, 18);
        graphics.lineBetween(25, 33, 73, 33);
        graphics.lineBetween(33, 48, 66, 48);
        eyes(28, 42, 58, 5);
        break;
      case 'enemy-dust-wolf':
        triangle(29, 29, 21, 7, 43, 25, color);
        triangle(67, 29, 75, 7, 53, 25, color);
        ellipse(48, 44, 64, 50, color);
        ellipse(61, 50, 30, 22, 0xa28d69);
        eyes(38, 39, 58, 6);
        graphics.lineStyle(4, outline, 1);
        graphics.lineBetween(22, 60, 10, 69);
        break;
      case 'enemy-tiger':
        triangle(29, 29, 23, 8, 43, 25, color);
        triangle(67, 29, 73, 8, 53, 25, color);
        ellipse(48, 44, 64, 51, color);
        eyes(39, 39, 57, 6);
        ellipse(48, 53, 26, 18, cream);
        graphics.lineStyle(4, 0x4a2916, 1);
        graphics.lineBetween(48, 20, 48, 31);
        graphics.lineBetween(26, 31, 37, 35);
        graphics.lineBetween(70, 31, 59, 35);
        break;
      case 'enemy-tree':
        rounded(39, 38, 18, 37, 5, 0x81512d);
        circle(31, 35, 23, color, 0x36562c);
        circle(58, 30, 25, 0x5c894a, 0x36562c);
        circle(70, 47, 18, color, 0x36562c);
        eyes(39, 41, 58, 5);
        mouth(54, 8);
        break;
      case 'enemy-moth':
        ellipse(24, 42, 37, 49, 0xa993bd, 0x4c3d63);
        ellipse(72, 42, 37, 49, 0xa993bd, 0x4c3d63);
        ellipse(48, 45, 20, 49, color, 0x4c3d63);
        circle(48, 25, 10, 0xbba9ca, 0x4c3d63);
        graphics.lineStyle(3, outline, 1);
        graphics.lineBetween(44, 17, 35, 5);
        graphics.lineBetween(52, 17, 61, 5);
        eyes(25, 44, 52, 4);
        break;
      case 'enemy-mud':
        ellipse(48, 52, 71, 38, color);
        circle(29, 45, 17, 0x76623d);
        circle(61, 39, 23, color);
        eyes(43, 52, 69, 5);
        mouth(57, 9);
        break;
      case 'enemy-swamp':
        ellipse(48, 52, 73, 37, color, 0x31462a);
        circle(31, 43, 18, 0x5e7f49, 0x31462a);
        circle(61, 40, 22, color, 0x31462a);
        eyes(42, 50, 68, 5);
        graphics.lineStyle(4, 0x7fa65d, 1);
        graphics.lineBetween(17, 43, 10, 19);
        graphics.lineBetween(78, 43, 86, 16);
        break;
      case 'enemy-mist-bug':
        ellipse(27, 42, 38, 34, 0xb9d5aa, 0x50634a);
        ellipse(69, 42, 38, 34, 0xb9d5aa, 0x50634a);
        ellipse(48, 45, 25, 49, color, 0x50634a);
        graphics.lineStyle(4, outline, 1);
        graphics.lineBetween(44, 22, 36, 7);
        graphics.lineBetween(52, 22, 60, 7);
        eyes(36, 43, 53, 5);
        break;
      case 'enemy-pride':
        triangle(31, 27, 38, 7, 47, 27, 0xffd35a);
        triangle(47, 27, 55, 4, 64, 27, 0xffd35a);
        ellipse(48, 47, 61, 48, color);
        eyes(41, 39, 57, 5);
        graphics.lineStyle(4, outline, 1);
        graphics.lineBetween(35, 31, 44, 34);
        graphics.lineBetween(61, 31, 52, 34);
        mouth(58, 11);
        break;
      case 'enemy-fear':
        triangle(20, 53, 32, 68, 43, 53, color);
        triangle(42, 53, 53, 70, 64, 53, color);
        triangle(62, 53, 76, 67, 80, 48, color);
        ellipse(48, 39, 60, 48, color);
        eyes(36, 38, 58, 8);
        graphics.fillStyle(0x24170f, 1);
        graphics.fillCircle(48, 57, 6);
        break;
      case 'enemy-haste':
        speedLines(3, 27, 0x8d6720);
        ellipse(58, 43, 61, 47, color);
        eyes(37, 52, 69, 5);
        graphics.lineStyle(4, outline, 1);
        graphics.lineBetween(49, 29, 57, 33);
        graphics.lineBetween(76, 29, 68, 33);
        mouth(55, 9);
        break;
      case 'boss-honse':
        triangle(32, 31, 21, 2, 47, 26, cream);
        triangle(80, 31, 91, 2, 65, 26, cream);
        rounded(8, 25, 96, 60, 20, color);
        eyes(48, 44, 68, 7);
        triangle(56, 54, 49, 65, 63, 65, 0xffd6a0);
        mouth(70, 15);
        break;
      case 'boss-gatekeeper':
        rounded(8, 26, 96, 58, 18, color, 0x214d68);
        rounded(18, 10, 76, 22, 7, 0xd9b83d, 0x573d16);
        triangle(56, 2, 45, 18, 67, 18, 0xf5d45b);
        eyes(48, 45, 67, 7);
        graphics.fillStyle(0xf1cf55, 1);
        graphics.fillCircle(24, 67, 8);
        graphics.fillCircle(88, 67, 8);
        mouth(68, 12);
        break;
      case 'boss-erlang':
        rounded(9, 26, 94, 58, 18, color, 0x1e416f);
        rounded(20, 9, 72, 18, 5, 0xe0bf45, 0x5d431c);
        triangle(56, 2, 47, 15, 65, 15, 0xffdc62);
        eyes(50, 45, 67, 7);
        circle(56, 34, 5, 0xff7757, 0x5d261c);
        mouth(69, 12);
        break;
      case 'boss-bajie':
        circle(25, 28, 15, 0xf0a3aa);
        circle(87, 28, 15, 0xf0a3aa);
        rounded(8, 25, 96, 60, 22, color);
        eyes(47, 45, 68, 7);
        ellipse(56, 61, 34, 22, 0xf4b6b3);
        graphics.fillStyle(0x8f4b49, 1);
        graphics.fillCircle(50, 61, 4);
        graphics.fillCircle(62, 61, 4);
        break;
      case 'boss-sandy':
        circle(56, 12, 12, 0xb84734);
        rounded(9, 25, 94, 60, 19, color, 0x244b61);
        eyes(48, 45, 67, 7);
        graphics.fillStyle(0xf2d059, 1);
        [24, 40, 56, 72, 88].forEach((x) => graphics.fillCircle(x, 73, 5));
        mouth(64, 12);
        break;
      case 'boss-yellowwind':
        circle(27, 27, 15, 0xd9af4d);
        circle(85, 27, 15, 0xd9af4d);
        rounded(9, 25, 94, 60, 20, color, 0x79581e);
        eyes(47, 45, 69, 7);
        triangle(72, 50, 103, 59, 72, 66, 0xe8c675);
        graphics.lineStyle(3, outline, 1);
        graphics.lineBetween(73, 57, 101, 48);
        graphics.lineBetween(73, 61, 103, 70);
        break;
      case 'boss-tiger':
        triangle(30, 30, 23, 5, 49, 24, color);
        triangle(82, 30, 89, 5, 63, 24, color);
        rounded(8, 24, 96, 61, 22, color);
        eyes(48, 45, 68, 7);
        ellipse(56, 60, 32, 21, cream);
        graphics.lineStyle(5, outline, 1);
        graphics.lineBetween(56, 25, 56, 38);
        graphics.lineBetween(24, 35, 40, 40);
        graphics.lineBetween(88, 35, 72, 40);
        break;
      case 'boss-mud':
        ellipse(56, 63, 101, 43, color, 0x3e351f);
        circle(31, 47, 23, 0x776a3e, 0x3e351f);
        circle(69, 39, 31, color, 0x3e351f);
        eyes(46, 58, 79, 7);
        mouth(68, 15);
        break;
      case 'boss-shadow':
        graphics.lineStyle(8, 0x46366d, 1);
        graphics.lineBetween(17, 78, 96, 12);
        graphics.lineStyle(3, 0xd8b94c, 1);
        graphics.lineBetween(14, 81, 99, 10);
        circle(22, 39, 15, 0x745da7, 0x34294f);
        circle(90, 39, 15, 0x745da7, 0x34294f);
        rounded(10, 24, 92, 61, 22, color, 0x34294f);
        rounded(27, 22, 58, 12, 5, 0xd8b94c, 0x5f4318);
        triangle(56, 7, 45, 24, 67, 24, 0xf0cf57);
        ellipse(56, 61, 39, 27, 0x816bae, 0x34294f);
        eyes(48, 46, 67, 7);
        mouth(68, 10);
        graphics.lineStyle(5, outline, 1);
        graphics.lineBetween(89, 68, 105, 78);
        graphics.lineBetween(105, 78, 108, 65);
        break;
      default:
        rounded(8, 23, width - 16, height - 30, 18, color);
        eyes(height * 0.5);
        mouth(height - 18);
        break;
    }

    graphics.generateTexture(key, width, height);
    graphics.destroy();
    this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}
