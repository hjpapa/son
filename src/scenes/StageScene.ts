import Phaser from 'phaser';
import { Music } from '../audio/Music';
import { Sfx } from '../audio/Sfx';
import { BossEnemy } from '../entities/BossEnemy';
import { Enemy } from '../entities/Enemy';
import { EnemyFactory } from '../entities/EnemyFactory';
import { Player } from '../entities/Player';
import { bestiaryEntry } from '../game/data/bestiary';
import { coinSpots, getStage, type StageBackgroundKey, type StageData, type StageHazard } from '../game/data/stages';
import { chapterStories } from '../game/data/story';
import { josa } from '../game/korean';
import { PlayTime } from '../game/playTime';
import { StageManager } from '../game/StageManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import type { PlayerInputState } from '../types/InputState';
import { DialogueBox } from '../ui/DialogueBox';
import { MobileControls } from '../ui/MobileControls';
import { companionTextures } from '../game/data/companions';
import { addCoverBackground } from '../ui/background';
import { bakedImage, bakeTexture } from '../ui/bake';
import { addStageScenery, platformTexture } from '../ui/StageScenery';
import { ArcadeChallenges, mazeBlocksGround, type ArcadeState } from '../game/ArcadeChallenges';
import { CompanionSkills, type CompanionSkillState } from '../game/CompanionSkills';
import { companionSkills } from '../game/data/companions';

// Progress kept when a chapter restarts after the last talisman is used, so
// a young player continues near where they fell instead of from the start.
export type RetryState = {
  checkpointX: number;
  seenBeats: string[];
  collectedCoins: number[];
  arcade?: ArcadeState;
  skills?: CompanionSkillState;
};

type StageSceneInit = {
  stageId?: string;
  retry?: RetryState;
};

type BackgroundPalette = {
  near: number;
  ground: number;
  soil: number;
};

const palettes: Record<StageBackgroundKey, BackgroundPalette> = {
  cornfield: { near: 0x5b9148, ground: 0x78b85a, soil: 0x8a5a2b },
  cave: { near: 0x35353f, ground: 0x55505a, soil: 0x29252c },
  palace: { near: 0x2f6db3, ground: 0x68d7d8, soil: 0x245c9b },
  skywar: { near: 0xb7edff, ground: 0xa4d9ef, soil: 0x5fa2d8 },
  mountain: { near: 0x5d4b39, ground: 0x85c66a, soil: 0x8a5a2b },
  farm: { near: 0xb6783d, ground: 0x81bd55, soil: 0x80512a },
  river: { near: 0x2474b8, ground: 0x68b975, soil: 0x2c74a0 },
  wind: { near: 0xbe9145, ground: 0xd8c06a, soil: 0x9b7233 },
  forest: { near: 0x1f5b37, ground: 0x5fa857, soil: 0x5b3e26 },
  swamp: { near: 0x253626, ground: 0x4d7040, soil: 0x263522 },
  gold: { near: 0xb97b24, ground: 0xdfbd56, soil: 0x8a5a2b },
  ending: { near: 0xcaa24a, ground: 0x97c972, soil: 0x8a5a2b }
};

const REQUIRED_COINS = 5;
const TALISMANS_PER_TRY = 2;
const BOSS_BAR_RANGE = 760;
const PROGRESS_WIDTH = 260;

const hudText = (size: number, color = '#fff8d6'): Phaser.Types.GameObjects.Text.TextStyle => ({
  color,
  fontSize: `${size}px`,
  fontStyle: 'bold',
  stroke: '#2a1a08',
  strokeThickness: 5
});

export class StageScene extends Phaser.Scene {
  private stage!: StageData;
  private retry?: RetryState;
  private player!: Player;
  private arcade!: ArcadeChallenges;
  private companionAbilities!: CompanionSkills;
  private arcadeToast?: Phaser.GameObjects.Text;
  private playerPlatforms!: Phaser.Physics.Arcade.Collider;
  private hazardPulseMs = 0;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private coins!: Phaser.Physics.Arcade.StaticGroup;
  private healthItems!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.GameObjects.Group;
  private boss?: BossEnemy;
  private staffItem?: Phaser.Physics.Arcade.Sprite;
  private staffHint?: Phaser.GameObjects.Text;
  private npcSprite?: Phaser.Physics.Arcade.Sprite;
  private companionSprites: Phaser.GameObjects.Sprite[] = [];
  private hazardZones: Array<{ data: StageHazard; zone: Phaser.GameObjects.Zone }> = [];
  private npcMet = false;
  private rewardCollected = false;
  private hazardHitReadyAt = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'A' | 'D' | 'W' | 'S' | 'SPACE', Phaser.Input.Keyboard.Key>;
  private mobileControls!: MobileControls;
  private dialogue!: DialogueBox;
  private talismanText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private bossBarFrame?: Phaser.GameObjects.Image;
  private bossBarFill?: Phaser.GameObjects.Rectangle;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private progressHero!: Phaser.GameObjects.Image;
  private bossBarName?: Phaser.GameObjects.Text;
  private exitGate?: Phaser.GameObjects.Rectangle;
  private exitHint?: Phaser.GameObjects.Text;
  private bossExitUnlocked = false;
  private exitLockedMessageAt = 0;
  private surviveRemainingMs = 0;
  private surviveTimerText?: Phaser.GameObjects.Text;
  private coinCount = 0;
  private collectedCoins = new Set<number>();
  private stageCleared = false;
  private inputLocked = true;
  private hitThisSwing = new Set<Enemy>();
  private lastAttackId = -1;
  private storyBeatsSeen = new Set<string>();
  private checkpointX = 0;
  private windTimer = 0;
  private revivesRemaining = TALISMANS_PER_TRY;
  private totalCoins = 0;
  private companions: string[] = [];
  private tip?: Phaser.GameObjects.Container;
  private discoveryToast?: Phaser.GameObjects.Container;
  private speech?: { container: Phaser.GameObjects.Container; index: number; until: number };
  private companionHelpUsed = false;
  private bossSpotted = false;
  private hazardsMentioned = new Set<StageHazard>();
  private tipsShown = new Set<string>();

  constructor() {
    super('StageScene');
  }

  init(data: StageSceneInit): void {
    this.stage = getStage(data.stageId ?? StageManager.getFirstStageId());
    this.companions = StageManager.getCompanionsForChapter(this.stage.chapter);
    this.speech = undefined;
    this.companionHelpUsed = false;
    this.bossSpotted = false;
    this.hazardsMentioned = new Set();
    this.tip = undefined;
    this.tipsShown = new Set();
    this.retry = data.retry;
    this.boss = undefined;
    this.staffItem = undefined;
    this.staffHint = undefined;
    this.npcSprite = undefined;
    this.companionSprites = [];
    this.hazardZones = [];
    this.npcMet = false;
    this.rewardCollected = false;
    this.hazardHitReadyAt = 0;
    this.hazardPulseMs = 0;
    this.arcadeToast = undefined;
    this.bossBarFrame = undefined;
    this.bossBarFill = undefined;
    this.bossBarName = undefined;
    this.exitGate = undefined;
    this.exitHint = undefined;
    this.collectedCoins = new Set(this.retry?.collectedCoins ?? []);
    this.coinCount = this.collectedCoins.size;
    this.stageCleared = false;
    this.inputLocked = true;
    this.bossExitUnlocked = false;
    this.exitLockedMessageAt = 0;
    this.surviveRemainingMs = 0;
    this.surviveTimerText = undefined;
    this.lastAttackId = -1;
    this.storyBeatsSeen = new Set(this.retry?.seenBeats ?? []);
    this.checkpointX = this.retry?.checkpointX ?? this.stage.playerStart.x;
    this.windTimer = 0;
    this.revivesRemaining = TALISMANS_PER_TRY;
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

    this.createBackground(worldWidth);
    this.createPlatforms(worldWidth);
    this.createCoins();
    this.createCameos();
    this.createActors();
    this.createNpc();
    this.createHealthItems();
    this.createHazards();
    this.createGoal();
    this.createInput();
    this.createUi();
    // Created before the challenge and skill systems, whose hooks ask whether
    // a story page is open (a restarted scene must not see the old box).
    this.dialogue = new DialogueBox(this);
    this.dialogue.setSkippable(StageManager.getStars(this.stage.id) > 0);
    this.arcade = new ArcadeChallenges(this, this.stage.chapter, this.player, this.platforms, {
      message: text => this.showArcadeMessage(text),
      reward: xp => this.gainExperience(xp),
      damage: () => { if (this.player.takeDamage(1)) this.handlePlayerDamaged(); },
      flight: on => { this.playerPlatforms.active = !on; }
    }, this.retry?.arcade);
    this.updateSurviveTimerText();

    this.companionAbilities = new CompanionSkills(this, this.player, this.companions, this.companionSprites, this.enemies, {
      allowed: () => !this.inputLocked && !this.dialogue?.isOpen && !this.stageCleared && this.player.active && !this.physics.world.isPaused && this.scene.isActive(),
      changed: () => this.updateUi(),
      defeated: enemy => { this.gainExperience(enemy.enemyType === 'boss' ? 5 : 2); this.showDiscovery(enemy.texture.key); },
      say: lines => { this.companionSay(lines); }
    }, this.retry?.skills);

    this.game.events.on(Phaser.Core.Events.HIDDEN, this.pauseForBackground, this);
    this.game.events.on('request-pause', this.pauseForBackground, this);
    Music.play(this.stage.musicKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      Music.setBattle(false);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.pauseForBackground, this);
      this.game.events.off('request-pause', this.pauseForBackground, this);
    });

    if (this.retry) {
      this.cameras.main.fadeIn(350, 255, 248, 214);
      this.showFloatingMessage('다시 도전! 구름 부적이 다시 생겼어요', 1800);
      this.time.delayedCall(500, () => {
        this.inputLocked = false;
      });
      return;
    }

    this.playChapterIntro(() => {
      this.dialogue.show(this.stage.startDialogue, () => {
        this.inputLocked = false;
        this.showChapterTips();
      });
    });
  }

  update(_time: number, delta: number): void {
    if (!this.player?.active) {
      return;
    }
    PlayTime.add(delta);

    const gameplayPaused = this.inputLocked || this.dialogue.isOpen || this.stageCleared;
    this.companionAbilities.update(delta, gameplayPaused);
    if (gameplayPaused) this.mobileControls.reset();
    const input = gameplayPaused ? this.emptyInput() : this.readInput();
    this.arcade.update(delta, gameplayPaused);
    if (!gameplayPaused) this.hazardPulseMs += Math.min(delta, 100);
    this.player.update(input);
    // After the player sets its own velocity, so a gust really pushes back.
    if (!gameplayPaused) this.applyGimmicks(delta);
    if (gameplayPaused && this.arcade.inFlight) this.player.setVelocity(0, 0);
    this.updateCompanionFollowers();

    if (!gameplayPaused) {
      this.updateTutorialTips();
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
    this.updateProgressBar();
    this.arcade.setHudVisible(!gameplayPaused && !this.tip?.active && !this.bossBarFrame?.visible);
  }

  // A storybook title page with a soft gong opens every chapter.
  private playChapterIntro(onDone: () => void): void {
    this.physics.world.pause();
    const card = this.add.container(0, 0).setScrollFactor(0).setDepth(2500).setAlpha(0);
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1d140b, 0.78).setOrigin(0);
    const band = this.add.graphics();
    band.fillStyle(0xf6e2a8, 0.97).fillRect(0, 150, GAME_WIDTH, 232);
    band.fillStyle(0xb5462f, 1).fillRect(0, 142, GAME_WIDTH, 10).fillRect(0, 380, GAME_WIDTH, 10);
    const chapter = this.add.text(GAME_WIDTH / 2, 196, `제 ${this.stage.chapter}장`, { color: '#a13a22', fontSize: '30px', fontStyle: 'bold' }).setOrigin(0.5);
    const title = this.add.text(GAME_WIDTH / 2, 258, this.stage.title, { color: '#3b2100', fontSize: '52px', fontStyle: 'bold' }).setOrigin(0.5);
    const subtitle = this.add.text(GAME_WIDTH / 2, 324, this.stage.subtitle, { color: '#6c4515', fontSize: '24px', fontStyle: 'bold' }).setOrigin(0.5);
    card.add([shade, band, chapter, title, subtitle]);
    Sfx.gong();

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      this.input.off('pointerdown', finish);
      this.input.keyboard?.off('keydown-ENTER', finish);
      this.input.keyboard?.off('keydown-SPACE', finish);
      this.tweens.add({
        targets: card,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          card.destroy();
          this.physics.world.resume();
          onDone();
        }
      });
    };
    this.tweens.add({ targets: card, alpha: 1, duration: 350 });
    this.tweens.add({ targets: title, scale: { from: 0.9, to: 1 }, duration: 600, ease: 'Back.easeOut' });
    // Wait a moment before a tap can skip, so the title is actually seen.
    this.time.delayedCall(600, () => {
      if (finished) return;
      this.input.on('pointerdown', finish);
      this.input.keyboard?.on('keydown-ENTER', finish);
      this.input.keyboard?.on('keydown-SPACE', finish);
    });
    this.time.delayedCall(2600, finish);
  }

  private updateStoryBeats(): void {
    if (this.stageCleared || this.arcade.inFlight) return;
    const story = chapterStories[this.stage.id];
    const encounterX = (this.stage.boss?.x ?? Infinity) - 400;
    const beats = [
      { id: 'trail', x: this.stage.worldWidth * 0.4, lines: story.trail, checkpoint: this.stage.worldWidth * 0.4 },
      { id: 'encounter', x: encounterX, lines: story.encounter, checkpoint: encounterX - 120 }
    ];
    for (const beat of beats) {
      if (this.player.x < beat.x || this.storyBeatsSeen.has(beat.id) || !beat.lines.length) continue;
      this.storyBeatsSeen.add(beat.id);
      this.checkpointX = Math.max(this.checkpointX, beat.checkpoint);
      this.dialogue.show(beat.lines);
      return;
    }
  }

  private createCameos(): void {
    for (const cameo of this.stage.cameos ?? []) {
      const sprite = this.add.image(cameo.x, cameo.y, cameo.spriteKey).setOrigin(0.5, 1).setDepth(3).setFlipX(true);
      sprite.setScale(118 / sprite.height);
      const label = this.add.text(cameo.x, cameo.y - 128, cameo.name, hudText(17, '#fff6bd')).setOrigin(0.5, 1).setDepth(3);
      const targets: Phaser.GameObjects.GameObject[] = [sprite, label];
      if (cameo.floating) {
        const cloud = this.add.ellipse(cameo.x, cameo.y - 6, 150, 34, 0xffffff, 0.9).setStrokeStyle(3, 0xd7e6f2).setDepth(2.9);
        targets.push(cloud);
      }
      this.tweens.add({ targets, y: `-=${cameo.floating ? 10 : 4}`, duration: cameo.floating ? 1500 : 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
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
    }

    const nearGoal = import.meta.env.DEV && new URLSearchParams(window.location.search).get('nearGoal') === '1';
    const playerStartX = nearGoal ? Math.max(120, this.stage.goalX - 520) : this.checkpointX;
    this.player = new Player(this, playerStartX, this.stage.playerStart.y, StageManager.getMaxHealth());
    this.player.healFull();
    this.player.setAttackRangeMultiplier(StageManager.getAttackRangeMultiplier());
    this.player.setStaffUpgraded(StageManager.isStaffUpgraded());
    this.player.setLevelMovementMultiplier(StageManager.getMovementMultiplier());
    // Wukong learns the somersault cloud from 수보리 조사 at the end of chapter 1.
    this.player.setCloudJump(this.stage.chapter >= 2);
    this.createCompanionFollowers();

    this.playerPlatforms = this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.player, this.enemies, (_playerObject, enemyObject) => {
      this.handlePlayerEnemyCollision(enemyObject as Enemy);
    }, () => !this.arcade?.inFlight);
    this.physics.add.overlap(this.player, this.coins, (_playerObject, coinObject) => {
      this.collectCoin(coinObject as Phaser.Physics.Arcade.Sprite);
    });

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(180, 80);
  }

  private createCompanionFollowers(): void {
    this.companionSprites = this.companions.map((name, index) => {
      return this.add.sprite(this.player.x - 58 * (index + 1), this.player.y, companionTextures[name]).setOrigin(0.5, 1).setDepth(4).setDisplaySize(78, 78);
    });
  }

  private updateCompanionFollowers(): void {
    if (this.companionSprites.length === 0) {
      return;
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const trailDirection = body.velocity.x < -5 ? 1 : -1;
    this.companionSprites.forEach((companion, index) => {
      if (this.companionAbilities?.isCasting(this.companions[index])) return;
      const targetX = this.player.x + trailDirection * (54 + index * 48);
      companion.x = Phaser.Math.Linear(companion.x, targetX, 0.08);
      companion.y = Phaser.Math.Linear(companion.y, this.player.y, 0.12);
      companion.setFlipX(trailDirection > 0);
    });

    if (this.speech) {
      const speaker = this.companionSprites[this.speech.index];
      if (this.time.now > this.speech.until || !speaker) {
        this.speech.container.destroy();
        this.speech = undefined;
      } else {
        this.speech.container.setPosition(speaker.x, speaker.y - 86);
      }
    }
    this.mentionHazardsAhead();
  }

  // Friends on the road talk: short speech bubbles over a companion's head.
  private companionSay(lines: Partial<Record<string, string>>, duration = 2600): boolean {
    const name = this.companions.find((companion) => lines[companion]);
    if (!name || this.stageCleared) return false;
    const index = this.companions.indexOf(name);
    const speaker = this.companionSprites[index];
    this.speech?.container.destroy();
    const text = this.add.text(0, 0, lines[name]!, {
      color: '#2a1a08', fontSize: '17px', fontStyle: 'bold', backgroundColor: '#fffaf0', padding: { x: 10, y: 6 }, align: 'center', wordWrap: { width: 220 }
    }).setOrigin(0.5, 1);
    const tail = this.add.triangle(0, 7, 0, 0, 14, 0, 7, 9, 0xfffaf0).setOrigin(0.5, 1);
    const container = this.add.container(speaker.x, speaker.y - 86, [tail, text]).setDepth(60);
    this.speech = { container, index, until: this.time.now + duration };
    return true;
  }

  private mentionHazardsAhead(): void {
    if (this.inputLocked || this.dialogue?.isOpen) return;
    const hazard = this.stage.hazards.find((item) => !this.hazardsMentioned.has(item) && item.x - this.player.x > 0 && item.x - this.player.x < 320);
    if (!hazard) return;
    this.hazardsMentioned.add(hazard);
    const warnings: Record<StageHazard['type'], Partial<Record<string, string>>> = {
      spikes: { '사오정': '뾰족한 곳은 뛰어넘어요!', '저팔계': '앗, 뾰족해! 점프하자!', '삼장법사': '오공아, 가시를 조심하거라.' },
      water: { '사오정': '물살은 제가 잘 알아요. 위로 건너요!', '저팔계': '물에 빠지면 안 돼!', '삼장법사': '다리 위로 건너가자꾸나.' },
      lightning: { '저팔계': '번개다! 표시 옆으로 피하자!', '사오정': '번쩍이는 곳은 피해요!', '삼장법사': '번개 구름이구나. 조심하거라.' },
      mud: { '저팔계': '으, 끈적끈적해…', '사오정': '늪은 천천히 건너요.', '삼장법사': '서두르지 말고 한 걸음씩.' },
      wind: { '사오정': '바람이 세요. 버텨요!', '저팔계': '날아가겠어!', '삼장법사': '바람이 쉴 때 나아가자.' }
    };
    this.companionSay(warnings[hazard.type]);
  }

  private createNpc(): void {
    const npc = this.stage.npc;
    if (!npc) {
      return;
    }

    this.npcSprite = this.physics.add.staticSprite(npc.x, npc.y, npc.spriteKey).setOrigin(0.5, 1).setDisplaySize(128, 128).setDepth(8);
    this.npcSprite.refreshBody();
    const nameText = this.add
      .text(npc.x, npc.y - 138, `${npc.name}\n${npc.role}`, { ...hudText(18, '#fff6bd'), align: 'center' })
      .setOrigin(0.5, 1)
      .setDepth(9);

    const meetingZone = this.add.zone(npc.x, npc.y - 72, 170, 180);
    this.physics.add.existing(meetingZone, true);
    this.physics.add.overlap(this.player, meetingZone, () => this.handleNpcReached());

    this.tweens.add({
      targets: [this.npcSprite, nameText],
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
      const zoneHeight = hazard.type === 'lightning' ? 300 : hazard.type === 'wind' ? 170 : 46;
      const zoneY = hazard.type === 'lightning' ? 282 : hazard.type === 'wind' ? hazard.y - 66 : hazard.y - 14;
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
        const warning = this.add.text(hazard.x, 175, '! 옆으로 피하기', hudText(18)).setOrigin(0.5).setDepth(5);
        const beam = this.add.rectangle(hazard.x, 285, hazard.width, 300, 0xfff2a0, 0.8).setDepth(5);
        const pulse = () => {
          const phase = (this.hazardPulseMs + hazard.x) % 3600;
          marker.setAlpha(phase < 2100 ? 0.15 : phase < 3100 ? 0.65 : 1);
          warning.setVisible(phase >= 2100 && phase < 3100);
          beam.setVisible(phase >= 3100 && phase < 3400);
        };
        // The scene object is reused for every chapter, so remove the
        // listener with this chapter's objects instead of piling them up.
        this.events.on(Phaser.Scenes.Events.UPDATE, pulse);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.UPDATE, pulse));
      } else {
        this.add.rectangle(hazard.x, hazard.y - 56, hazard.width, 128, 0xffffff, 0.08).setStrokeStyle(2, 0xfff4be, 0.32).setDepth(3);
        for (let x = startX + 45; x < startX + hazard.width; x += 90) {
          this.add.text(x, hazard.y - 72, '>>>', { color: '#fff3bb', fontSize: '24px', fontStyle: 'bold' }).setAlpha(0.58).setDepth(4);
        }
      }

      // Name every danger so children learn what to jump over. The name sits on
      // the ground strip below it, clear of any bridge built over the hazard.
      this.add.text(hazard.x, hazard.type === 'wind' ? hazard.y - 150 : 456, hazard.label, hudText(16, '#ffe9a8')).setOrigin(0.5).setDepth(5).setAlpha(0.9);

      if (hazard.type !== 'mud' && hazard.type !== 'wind') {
        this.physics.add.overlap(this.player, zone, () => this.handleHazardHit(hazard));
      }
    });
  }

  private handleHazardHit(hazard: StageHazard): void {
    if (hazard.type === 'water' && this.companionAbilities.waterGuard) return;
    if (this.stageCleared || this.inputLocked || this.dialogue.isOpen || this.time.now < this.hazardHitReadyAt) {
      return;
    }

    if (hazard.type === 'lightning') {
      const phase = (this.hazardPulseMs + hazard.x) % 3600;
      if (phase < 3100 || phase >= 3400) return;
    }
    this.hazardHitReadyAt = this.time.now + 1600;
    if (this.player.takeDamage(1)) {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setVelocityY(-310);
      body.setVelocityX(this.player.x < hazard.x ? -190 : 190);
      this.showFloatingMessage(hazard.type === 'lightning' ? '번개! 표시가 보이면 옆으로 피하세요' : `앗, ${hazard.label}! 점프로 넘어가요`, 1200);
      this.handlePlayerDamaged();
    }
  }

  private createInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('A,D,W,S,SPACE') as Record<'A' | 'D' | 'W' | 'S' | 'SPACE', Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on('keydown-ESC', this.openPause, this);
    this.input.keyboard!.on('keydown-P', this.openPause, this);
    this.mobileControls = new MobileControls(this);
  }

  private readInput(): PlayerInputState {
    const touch = this.mobileControls.getInput();
    return {
      left: this.cursors.left.isDown || this.keys.A.isDown || touch.left,
      right: this.cursors.right.isDown || this.keys.D.isDown || touch.right,
      down: this.cursors.down.isDown || this.keys.S.isDown || touch.down,
      jump: this.cursors.up.isDown || this.keys.W.isDown || touch.jump,
      attack: this.cursors.space.isDown || this.keys.SPACE.isDown || touch.attack
    };
  }

  private emptyInput(): PlayerInputState {
    return { left: false, right: false, down: false, jump: false, attack: false };
  }

  private openPause(): void {
    if (this.stageCleared || this.inputLocked || this.dialogue.isOpen || !this.scene.isActive()) return;
    Sfx.tap();
    this.mobileControls.reset();
    this.scene.launch('PauseScene', { stageId: this.stage.id });
    this.scene.pause();
  }

  // When the tablet sleeps, the child switches apps, or the device is turned
  // upright, wait on the pause menu instead of playing on unseen.
  private pauseForBackground(): void {
    if (this.scene.isActive()) this.openPause();
  }

  private createBackground(worldWidth: number): void {
    const palette = palettes[this.stage.backgroundKey];
    const textureKey = `background-${this.stage.backgroundKey}`;
    this.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
    addCoverBackground(this, textureKey).setScrollFactor(0).setDepth(-20);
    addStageScenery(this, this.stage.backgroundKey, worldWidth, palette);

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
    this.add.tileSprite(x, y, width, height, platformTexture(this, this.stage.backgroundKey, palette)).setDepth(0);
    const rect = this.add.rectangle(x, y, width, height).setVisible(false);
    this.add.rectangle(x, y - height / 2 + 3, width - 4, 6, palette.ground, 0.95).setDepth(1);
    this.physics.add.existing(rect, true);
    this.platforms.add(rect);
  }

  private createCoins(): void {
    this.coins = this.physics.add.staticGroup();
    const spots = coinSpots(this.stage);
    this.totalCoins = spots.length;
    spots.forEach(({ x, y }, index) => {
      if (this.collectedCoins.has(index)) return;
      const coin = this.coins.create(x, y, 'corn-coin') as Phaser.Physics.Arcade.Sprite;
      coin.setData('index', index);
      coin.refreshBody();
      this.tweens.add({ targets: coin, scaleX: 0.55, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
  }

  private createHealthItems(): void {
    this.healthItems = this.physics.add.staticGroup();
    // Healing corn waits on the walking path between ledges and before the
    // boss, never over spikes or water where reaching for it would hurt.
    const { platforms, hazards, goalX } = this.stage;
    const between = platforms.slice(1).map((platform, index) => ({ x: (platforms[index].x + platform.x) / 2, y: 386 }));
    const candidates = Phaser.Utils.Array.Shuffle([...between, { x: goalX - 420, y: 386 }, { x: goalX - 210, y: 386 }])
      .filter(({ x }) => !hazards.some((hazard) => hazard.type !== 'wind' && Math.abs(x - hazard.x) < hazard.width / 2 + 40))
      .filter(({ x }) => !platforms.some((platform) => platform.y >= 340 && Math.abs(x - platform.x) < platform.width / 2 + 30))
      .filter(({ x }) => !mazeBlocksGround(this.stage.chapter, x, 40));

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
        .text(itemX, itemY - 74, needsUnlock ? `봉인된 ${reward?.label ?? '보물'}` : reward?.label ?? '보물', hudText(20, '#fff1a3'))
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

    const locked = this.stage.clearMode === 'boss';
    this.exitGate = this.add.rectangle(this.stage.goalX, 340, 36, 184, locked ? 0x9d8a68 : 0xe7bd42).setStrokeStyle(4, 0x6e4300).setDepth(2);
    this.exitHint = this.add
      .text(this.stage.goalX, 222, locked ? `${this.stage.goalLabel} (잠김)` : this.stage.goalLabel, hudText(22, '#fff1a3'))
      .setOrigin(0.5);
    this.tweens.add({ targets: this.exitHint, y: '-=6', duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const endZone = this.add.zone(this.stage.goalX + 24, 340, 120, 240);
    this.physics.add.existing(endZone, true);
    this.physics.add.overlap(this.player, endZone, () => this.handleExitReached());
  }

  private createUi(): void {
    // Hearts, talismans and panels are redrawn into one image only when they change.
    this.drawHud();
    this.add.image(0, 0, 'hud-layer').setOrigin(0).setScrollFactor(0).setDepth(900);

    this.talismanText = this.add.text(60, 63, '', hudText(19)).setScrollFactor(0).setDepth(902);

    this.add
      .text(GAME_WIDTH / 2, 12, `제 ${this.stage.chapter}장 · ${this.stage.title}`, hudText(23, '#fff3b0'))
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(902);
    this.add
      .text(GAME_WIDTH / 2, 48, this.stage.objective, { ...hudText(18), align: 'center', wordWrap: { width: 540 } })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(902);

    this.add.image(GAME_WIDTH - 196, 32, 'corn-coin').setScrollFactor(0).setDepth(902);
    this.coinText = this.add.text(GAME_WIDTH - 174, 17, '', hudText(22)).setScrollFactor(0).setDepth(902);
    this.levelText = this.add.text(GAME_WIDTH - 212, 52, '', hudText(17, '#d9ffb3')).setScrollFactor(0).setDepth(902);

    this.createPauseButton();
    this.createProgressBar();
    if (this.stage.boss) {
      const width = 360;
      const x = (GAME_WIDTH - width) / 2;
      const y = 128;
      this.bossBarFrame = bakedImage(this, `boss-bar-frame-${GAME_WIDTH}`, { x: x - 2, y: y - 2, width: width + 4, height: 22 }, (g) => {
        g.fillStyle(0x23160a, 0.85).fillRoundedRect(x, y, width, 18, 6);
        g.lineStyle(2, 0xffdf73, 0.9).strokeRoundedRect(x, y, width, 18, 6);
      }).setScrollFactor(0).setDepth(901).setVisible(false);
      this.bossBarFill = this.add.rectangle(x + 3, y + 3, width - 6, 12, 0xe74b3c).setOrigin(0).setScrollFactor(0).setDepth(902).setVisible(false);
      this.bossBarName = this.add.text(GAME_WIDTH / 2, 102, this.stage.boss.name, hudText(18, '#ffd6c9')).setOrigin(0.5, 0).setScrollFactor(0).setDepth(902).setVisible(false);
    }
    this.createSurviveTimerUi();
    this.updateUi();
  }

  // How far is left: the hero's face travels along a road to the chapter's
  // goal flag, with the boss marked where it waits.
  private createProgressBar(): void {
    const left = GAME_WIDTH / 2 - PROGRESS_WIDTH / 2;
    const y = 86;
    bakedImage(this, `progress-track-${GAME_WIDTH}`, { x: left - 4, y: y - 13, width: PROGRESS_WIDTH + 32, height: 22 }, (g) => {
      g.fillStyle(0x2a1a08, 0.7).fillRoundedRect(left - 4, y - 5, PROGRESS_WIDTH + 8, 10, 5);
      g.fillStyle(0x6e4300, 1).fillRect(left + PROGRESS_WIDTH + 6, y - 12, 3, 20);
      g.fillStyle(0xe8453c, 1).fillTriangle(left + PROGRESS_WIDTH + 9, y - 12, left + PROGRESS_WIDTH + 24, y - 7, left + PROGRESS_WIDTH + 9, y - 2);
    }).setScrollFactor(0).setDepth(901);
    this.progressFill = this.add.rectangle(left - 2, y - 3, PROGRESS_WIDTH + 4, 6, 0xffd24a).setOrigin(0).setScrollFactor(0).setDepth(902);
    if (this.stage.boss && this.stage.clearMode !== 'survive') {
      const bossIcon = this.add.image(left + PROGRESS_WIDTH * this.progressRatio(this.stage.boss.x), y, this.stage.boss.spriteKey).setScrollFactor(0).setDepth(902);
      bossIcon.setScale(24 / bossIcon.height);
    }
    this.progressHero = this.add.image(left, y, 'corn-wukong-clean-idle').setScrollFactor(0).setDepth(903);
    this.progressHero.setScale(26 / this.progressHero.height);
    this.updateProgressBar();
  }

  private progressRatio(x: number): number {
    const start = this.stage.playerStart.x;
    const end = this.stage.npc?.x ?? this.stage.reward?.x ?? this.stage.goalX;
    return Phaser.Math.Clamp((x - start) / (end - start), 0, 1);
  }

  private updateProgressBar(): void {
    const left = GAME_WIDTH / 2 - PROGRESS_WIDTH / 2;
    const y = 86;
    const ratio = this.progressRatio(this.player.x);
    this.progressFill.setScale(Math.max(0.02, ratio), 1);
    this.progressHero.setPosition(left + PROGRESS_WIDTH * ratio, y);
  }

  private createPauseButton(): void {
    const x = GAME_WIDTH - 42;
    const y = 40;
    bakedImage(this, `pause-button-${GAME_WIDTH}`, { x: x - 30, y: y - 30, width: 60, height: 60 }, (g) => {
      g.fillStyle(0xfff7dc, 0.85).fillCircle(x, y, 27).lineStyle(3, 0x6d4a00, 0.9).strokeCircle(x, y, 27);
      g.fillStyle(0x5a3a00, 1).fillRoundedRect(x - 10, y - 11, 7, 22, 2).fillRoundedRect(x + 3, y - 11, 7, 22, 2);
    }).setScrollFactor(0).setDepth(903);
    this.add
      .zone(x, y, 70, 70)
      .setScrollFactor(0)
      .setDepth(904)
      .setInteractive()
      .on('pointerdown', () => this.openPause());
  }

  private createSurviveTimerUi(): void {
    if (this.stage.clearMode !== 'survive') {
      return;
    }

    const seconds = this.stage.gimmicks.find((gimmick) => gimmick.type === 'surviveRun')?.value ?? 35;
    this.surviveRemainingMs = seconds * 1000;
    this.surviveTimerText = this.add
      .text(GAME_WIDTH / 2, 108, '', {
        color: '#ffffff',
        fontSize: '24px',
        fontStyle: 'bold',
        backgroundColor: 'rgba(30, 72, 130, 0.82)',
        padding: { x: 14, y: 6 }
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(902);
    // Filled in once the storm challenge exists (it adds the dodge count).
  }

  private updateUi(): void {
    this.drawHud();
    this.talismanText.setText(`× ${this.revivesRemaining}`);
    // Chapter 1 first shows the 5 coins the gate needs, then the stars target.
    const gate = this.stage.id === 'stage-01' && this.coinCount < REQUIRED_COINS;
    this.coinText.setText(`${this.coinCount} / ${gate ? REQUIRED_COINS : this.totalCoins}`);
    const progress = StageManager.getLevelProgress();
    this.levelText.setText(`레벨 ${progress.level}`);
  }

  private drawHud(): void {
    bakeTexture(this, 'hud-layer', GAME_WIDTH, 100, (g) => this.paintHud(g), true);
  }

  private paintHud(g: Phaser.GameObjects.Graphics): void {

    // Hearts: one per health point, easy to count at a glance.
    const max = this.player.maxHealth;
    const step = 26;
    g.fillStyle(0x2a1a08, 0.55).fillRoundedRect(10, 10, 14 + max * step, 40, 12);
    for (let i = 0; i < max; i += 1) {
      const cx = 29 + i * step;
      const cy = 30;
      g.fillStyle(i < this.player.health ? 0xf0453c : 0x5e463d, 1);
      g.fillCircle(cx - 5, cy - 3, 6).fillCircle(cx + 5, cy - 3, 6).fillTriangle(cx - 11, cy - 1, cx + 11, cy - 1, cx, cy + 10);
    }

    // Cloud talismans (extra lives); companion skill cards sit below them.
    g.fillStyle(0x2a1a08, 0.55).fillRoundedRect(10, 56, 120, 38, 12);
    g.fillStyle(0xffffff, 1).fillCircle(28, 78, 8).fillCircle(39, 72, 10).fillCircle(50, 78, 8).fillRect(28, 78, 22, 8);

    // Corn coins and level.
    g.fillStyle(0x2a1a08, 0.55).fillRoundedRect(GAME_WIDTH - 220, 10, 150, 72, 12);
    const progress = StageManager.getLevelProgress();
    const ratio = progress.level >= 10 ? 1 : progress.experience / progress.required;
    const barX = GAME_WIDTH - 140;
    const barY = 60;
    g.fillStyle(0x1a120a, 0.9).fillRoundedRect(barX, barY, 62, 12, 5);
    g.fillStyle(progress.level >= 10 ? 0xffd44f : 0x7ddc5a, 1).fillRoundedRect(barX + 2, barY + 2, Math.max(4, 58 * ratio), 8, 4);
  }

  private updateBossBar(): void {
    if (!this.bossBarFrame || !this.bossBarFill) {
      return;
    }

    const nearby = Boolean(this.boss?.active) && Math.abs(this.boss!.x - this.player.x) < BOSS_BAR_RANGE;
    const show = nearby && this.stage.clearMode !== 'survive';
    this.bossBarName?.setVisible(show);
    Music.setBattle(nearby && !this.stageCleared);
    if (show && !this.bossSpotted) {
      this.bossSpotted = true;
      this.companionSay({ '저팔계': '저기 보스야! 조심해, 형님!', '사오정': '공격이 끝나면 다가가요!', '삼장법사': '침착하게 살피거라.' });
    }
    this.bossBarFrame.setVisible(show);
    this.bossBarFill.setVisible(show);
    if (show && this.boss) this.bossBarFill.setScale(Math.max(0.01, this.boss.hpRatio), 1);
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
    Sfx.hit();
    const defeated = enemy.takeHit(StageManager.getAttackDamage(), this.player.x);
    if (defeated) {
      this.gainExperience(enemy.enemyType === 'boss' ? 5 : 2);
      this.showDiscovery(enemy.texture.key);
    }
  }

  private collectCoin(coin: Phaser.Physics.Arcade.Sprite): void {
    this.collectedCoins.add(coin.getData('index') as number);
    coin.destroy();
    this.coinCount += 1;
    Sfx.coin();
    if (this.coinCount === this.totalCoins) {
      this.companionSay({ '저팔계': '와! 코인을 하나도 안 빼고 다 모았어!', '사오정': '코인을 모두 모았어요!', '삼장법사': '꼼꼼하게 다 모았구나.' });
    }
    if (this.stage.id === 'stage-01' && this.coinCount === REQUIRED_COINS) {
      this.showFloatingMessage('코인을 다 모았어요! 화과산으로 가요 →', 1800);
    }
    this.gainExperience(1);
  }

  private gainExperience(amount: number): void {
    const progress = StageManager.addExperience(amount);
    if (progress.leveledUp) {
      this.player.setAttackRangeMultiplier(StageManager.getAttackRangeMultiplier());
      this.player.setLevelMovementMultiplier(StageManager.getMovementMultiplier());
      this.player.applyLevelUp(progress.level, StageManager.getMaxHealth());
      Sfx.levelUp();
      this.showFloatingMessage('힘과 체력이 자랐어요!', 1500);
    }
    this.updateUi();
  }

  private collectHealthItem(itemObject: Phaser.GameObjects.GameObject): void {
    if (!this.player.heal(1)) {
      return;
    }

    itemObject.destroy();
    Sfx.heal();
    this.updateUi();
    this.showFloatingMessage('회복!', 900, '#baff8a');
  }

  private handlePlayerDamaged(): void {
    this.updateUi();
    // Once per chapter, a companion steps in when the hero is nearly out of hearts.
    if (this.player.health > 0 && this.player.health <= 2 && !this.companionHelpUsed && this.companions.length > 0) {
      this.companionHelpUsed = true;
      this.companionSay({ '삼장법사': '힘내라, 오공아! 내가 도와주마.', '저팔계': '형님, 이거 먹고 힘내!', '사오정': '형님, 제가 도울게요!' }, 2400);
      this.time.delayedCall(450, () => {
        if (this.stageCleared || this.player.health <= 0) return;
        this.player.heal(2);
        Sfx.heal();
        this.showFloatingMessage('친구가 도와줬어요! 하트 +2', 1500, '#baff8a');
        this.updateUi();
      });
    }
    if (this.player.health > 0) {
      return;
    }

    if (this.revivesRemaining > 0) {
      this.revivesRemaining -= 1;
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

  private handleBossDefeated(): void {
    Sfx.reward();
    this.cameras.main.flash(260, 255, 244, 190);
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
    this.staffHint?.setText(`${josa(this.stage.reward?.label ?? '보물', '을', '를')} 잡아요!`);
    if (message) {
      this.showFloatingMessage(message, 1600);
    }
  }

  private handleExitReached(): void {
    if (!this.arcade.exitReady) {
      if (this.time.now > this.exitLockedMessageAt) {
        this.exitLockedMessageAt = this.time.now + 1800;
        this.showFloatingMessage('미로 인장 3개를 찾아요! ← 위쪽 길도 살펴보세요', 1600);
      }
      return;
    }
    if (this.stage.id === 'stage-01' && this.coinCount < REQUIRED_COINS) {
      if (this.time.now > this.exitLockedMessageAt) {
        this.exitLockedMessageAt = this.time.now + 1600;
        this.showFloatingMessage(`옥수수 코인 ${REQUIRED_COINS - this.coinCount}개가 더 필요해! ← 뒤에 있어요`, 1500);
      }
      return;
    }

    if (this.stage.clearMode === 'boss' && !this.bossExitUnlocked) {
      if (this.time.now > this.exitLockedMessageAt) {
        this.exitLockedMessageAt = this.time.now + 1800;
        this.showFloatingMessage(`${josa(this.stage.boss?.name ?? '보스', '을', '를')} 먼저 물리치자!`, 1000);
      }
      return;
    }

    if (this.stage.clearMode === 'survive' && this.surviveRemainingMs > 0) {
      if (this.time.now > this.exitLockedMessageAt) {
        this.exitLockedMessageAt = this.time.now + 1600;
        this.showFloatingMessage('아직 추격 중이야! 조금만 더 버텨요', 1000);
      }
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
    this.exitHint?.setText(`${this.stage.goalLabel} → 길이 열렸어요!`);
    this.inputLocked = true;
    this.dialogue.show(chapterStories[this.stage.id].resolution, () => {
      this.inputLocked = false;
    });
  }

  private showArcadeMessage(message: string): void {
    this.arcadeToast?.destroy();
    const toast = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 178, message, {
      ...hudText(18), backgroundColor: '#211b30dd', padding: { x: 12, y: 8 },
      align: 'center', wordWrap: { width: 600 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1101);
    this.arcadeToast = toast;
    this.tweens.add({ targets: toast, alpha: 0, delay: 1250, duration: 350, onComplete: () => toast.destroy() });
  }

  private showFloatingMessage(message: string, duration = 1000, color = '#fff1a3'): void {
    const floating = this.add
      .text(this.player.x, this.player.y - 160, message, { ...hudText(23, color), align: 'center' })
      .setOrigin(0.5)
      .setDepth(80);

    this.tweens.add({
      targets: floating,
      y: floating.y - 24,
      alpha: 0,
      delay: duration * 0.35,
      duration: duration * 0.65,
      onComplete: () => floating.destroy()
    });
  }

  private collectReward(): void {
    if (this.stageCleared || this.rewardCollected || !this.staffItem?.visible || !this.staffItem.body?.enable) {
      return;
    }

    this.rewardCollected = true;
    Sfx.reward();
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
    Sfx.clear();
    StageManager.markStageCleared(this.stage.id);
    // Surviving the chase also counts as meeting its boss.
    if (this.stage.boss) this.showDiscovery(this.stage.boss.spriteKey);
    // ★ for clearing, ★★ for half the corn coins, ★★★ for all of them.
    const stars = 1 + (this.coinCount >= Math.ceil(this.totalCoins / 2) ? 1 : 0) + (this.coinCount >= this.totalCoins ? 1 : 0);
    const best = StageManager.recordStars(this.stage.id, stars);
    const result = { stageId: this.stage.id, coins: this.coinCount, totalCoins: this.totalCoins, stars, best, arcade: this.arcade.result };
    this.dialogue.show(this.stage.clearDialogue, () => {
      this.scene.start(StageManager.isLastStage(this.stage.id) ? 'EndingScene' : 'StageClearScene', result);
    });
  }

  // "New in the monster book!" slides in at the top right the first time.
  private showDiscovery(key: string): void {
    const entry = bestiaryEntry(key);
    if (!entry || !StageManager.recordDiscovery(key)) return;
    Sfx.discover();
    this.discoveryToast?.destroy();
    const panel = bakedImage(this, 'discovery-panel', { x: -264, y: -2, width: 266, height: 70 }, (g) => {
      g.fillStyle(0x2a1a08, 0.88).fillRoundedRect(-262, 0, 262, 66, 16);
      g.lineStyle(3, 0xffd24a, 1).strokeRoundedRect(-262, 0, 262, 66, 16);
    });
    const picture = this.add.image(-226, 33, key);
    picture.setScale(54 / picture.height);
    const heading = this.add.text(-190, 10, '요괴 도감에 새로 등록!', { color: '#ffd75e', fontSize: '15px', fontStyle: 'bold' });
    const name = this.add.text(-190, 30, entry.name, { color: '#ffffff', fontSize: '21px', fontStyle: 'bold' });
    const toast = this.add.container(GAME_WIDTH + 280, 92, [panel, picture, heading, name]).setScrollFactor(0).setDepth(906);
    this.discoveryToast = toast;
    this.tweens.add({ targets: toast, x: GAME_WIDTH - 12, duration: 320, ease: 'Back.easeOut' });
    this.tweens.add({ targets: toast, x: GAME_WIDTH + 280, delay: 2600, duration: 300, ease: 'Quad.easeIn', onComplete: () => toast.destroy() });
  }

  // Short how-to-play banners with the same icon as the touch button.
  private showChapterTips(): void {
    const touch = this.sys.game.device.input.touch;
    if (this.stage.chapter === 1) {
      this.showTip('move', touch ? '◀ ▶ 버튼을 눌러 걸어요' : '← → 키로 걸어요');
    } else if (this.stage.chapter === 2) {
      this.showTip('cloud', touch ? '근두운을 배웠어요! 공중에서 점프를 한 번 더 누르면 구름을 타요' : '근두운을 배웠어요! 공중에서 ↑ 키를 한 번 더 누르면 구름을 타요', 6500);
    } else if (this.stage.chapter >= 6 && this.stage.chapter <= 8) {
      const name = this.companions[this.companions.length - 1];
      if (name) this.showTip('friend', `${name}: ${companionSkills[name].description}\n${touch ? '왼쪽 위 동료 얼굴을 눌러 호출해요' : '왼쪽 위 동료 얼굴 또는 숫자 1·2·3 키로 호출해요'}`, 6500);
    }
  }

  private updateTutorialTips(): void {
    if (this.stage.chapter !== 1) return;
    const touch = this.sys.game.device.input.touch;
    if (this.player.x > 380) this.showTip('jump', touch ? '점프 버튼으로 발판에 올라 코인을 모아요' : '↑ 키로 점프해서 발판 위 코인을 모아요');
    if (this.player.x > 640) this.showTip('attack', touch ? '공격 버튼으로 까마귀를 물리쳐요' : 'Space 키로 공격해서 까마귀를 물리쳐요');
  }

  private showTip(id: 'move' | 'jump' | 'attack' | 'cloud' | 'friend', text: string, duration = 5000): void {
    if (this.tipsShown.has(id)) return;
    this.tipsShown.add(id);
    this.tip?.destroy();
    const label = this.add.text(30, 0, text, { ...hudText(20), wordWrap: { width: 560 } }).setOrigin(0, 0.5);
    const width = label.width + 92;
    label.setX(-width / 2 + 74);
    const cx = -width / 2 + 40;
    const panel = bakedImage(this, `tip-${id}-${Math.round(width)}`, { x: -width / 2 - 2, y: -32, width: width + 4, height: 64 }, (g) => {
      g.fillStyle(0x2a1a08, 0.82).fillRoundedRect(-width / 2, -30, width, 60, 18);
      g.lineStyle(3, 0xffd24a, 0.9).strokeRoundedRect(-width / 2, -30, width, 60, 18);
      g.fillStyle(0xfff7dc, 1).fillCircle(cx, 0, 22).lineStyle(3, 0x6d4a00, 1).strokeCircle(cx, 0, 22);
      g.fillStyle(0x5a3a00, 1);
      if (id === 'move') g.fillTriangle(cx - 14, 0, cx - 4, -8, cx - 4, 8).fillTriangle(cx + 14, 0, cx + 4, -8, cx + 4, 8);
      if (id === 'jump') g.fillTriangle(cx, -12, cx - 9, 0, cx + 9, 0).fillRect(cx - 3, 0, 6, 9);
      if (id === 'attack') g.lineStyle(5, 0xc98a00, 1).lineBetween(cx - 10, 7, cx + 10, -9);
      if (id === 'cloud') g.fillStyle(0x9fd8ff, 1).fillCircle(cx - 8, 4, 7).fillCircle(cx + 1, -2, 9).fillCircle(cx + 10, 4, 7);
      if (id === 'friend') g.fillStyle(0xffd66c, 1).fillCircle(cx - 7, -4, 6).fillCircle(cx + 7, -4, 6).fillRoundedRect(cx - 16, 3, 32, 12, 5);
    });
    this.tip = this.add.container(GAME_WIDTH / 2, 206, [panel, label]).setScrollFactor(0).setDepth(905).setAlpha(0);
    const tip = this.tip;
    this.tweens.add({ targets: tip, alpha: 1, y: 200, duration: 260 });
    this.tweens.add({ targets: tip, alpha: 0, delay: duration, duration: 400, onComplete: () => tip.destroy() });
  }

  private restartStage(): void {
    this.inputLocked = true;
    this.player.disableBody(true, false);
    this.add
      .text(GAME_WIDTH / 2, 190, '괜찮아요, 다시 해 봐요!', {
        color: '#4f2500',
        fontSize: '40px',
        fontStyle: 'bold',
        align: 'center',
        backgroundColor: 'rgba(255, 232, 152, 0.94)',
        padding: { x: 22, y: 14 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2100);

    const retry: RetryState = {
      checkpointX: this.checkpointX,
      seenBeats: [...this.storyBeatsSeen],
      collectedCoins: [...this.collectedCoins],
      arcade: this.arcade.state,
      skills: this.companionAbilities.state
    };
    this.time.delayedCall(1500, () => this.scene.restart({ stageId: this.stage.id, retry }));
  }

  private applyGimmicks(delta: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const playerBounds = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
    const mudZone = this.hazardZones.find(({ data, zone }) => {
      return data.type === 'mud' && Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, zone.getBounds());
    });
    this.player.setMovementMultiplier(mudZone && !this.companionAbilities.waterGuard ? mudZone.data.value ?? 0.65 : 1);

    const wind = this.stage.gimmicks.find((gimmick) => gimmick.type === 'windPush');
    const windZone = this.hazardZones.find(({ data, zone }) => {
      return data.type === 'wind' && Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, zone.getBounds());
    });
    if (!wind || !windZone || this.inputLocked || this.companionAbilities.waterGuard) {
      this.windTimer = 0;
      return;
    }

    const before = this.windTimer;
    this.windTimer += delta;
    // Announce each gust a moment early so children can brace for it.
    if (before < 2000 && this.windTimer >= 2000) {
      this.showFloatingMessage('휘이잉~ 바람이 와요!', 900, '#fff8d6');
    }
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
      const target = this.player.x + Math.sign(chaseOffset) * 480;
      // Never drop the chasing boss inside a step; wait until the spot is clear.
      const blocked = this.stage.platforms.some((platform) => platform.y >= 340 && Math.abs(target - platform.x) < platform.width / 2 + 60);
      if (Math.abs(chaseOffset) >= 500 && !blocked) {
        this.boss.setX(target);
      }
    }

    if (this.surviveRemainingMs <= 0) {
      this.exitHint?.setText('구름문이 열렸어요! →');
      if (this.player.x >= this.stage.goalX - 70) this.completeStage();
    }
  }

  private updateSurviveTimerText(): void {
    if (!this.surviveTimerText) {
      return;
    }

    const seconds = Math.ceil(this.surviveRemainingMs / 1000);
    const dodges = this.arcade.stormDodges;
    const dodgeText = dodges === undefined ? '' : `번개 회피 ${dodges}회`;
    this.surviveTimerText.setText(seconds > 0
      ? `추격전 ${seconds}초 버티기${dodgeText && ` · ${dodgeText}`}`
      : `성공! ${dodgeText && `${dodgeText} · `}구름문으로 탈출 →`);
    // Green once escaped, red for the last ten seconds; set only on change,
    // since every style change redraws the text.
    const color = seconds <= 0 ? 'rgba(40, 112, 58, 0.88)' : seconds <= 10 ? 'rgba(143, 35, 35, 0.86)' : 'rgba(30, 72, 130, 0.82)';
    if (this.surviveTimerText.style.backgroundColor !== color) this.surviveTimerText.setBackgroundColor(color);
  }
}
