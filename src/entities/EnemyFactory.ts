import Phaser from 'phaser';
import type { BossData, EnemyData } from '../game/data/stages';
import { BossEnemy } from './BossEnemy';
import { Enemy } from './Enemy';

export class EnemyFactory {
  static create(scene: Phaser.Scene, enemy: EnemyData): Enemy {
    if (enemy.type === 'boss') {
      return new BossEnemy(scene, enemy as BossData);
    }

    return new Enemy(scene, enemy);
  }
}
