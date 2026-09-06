import Phaser from 'phaser';
import { EndingScene } from './scenes/EndingScene';
import { PreloadScene } from './scenes/PreloadScene';
import { StageClearScene } from './scenes/StageClearScene';
import { StageScene } from './scenes/StageScene';
import { TitleScene } from './scenes/TitleScene';

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#8ed8ff',
  pixelArt: false,
  roundPixels: false,
  input: { activePointers: 3 },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1200 },
      debug: false
    }
  },
  scene: [PreloadScene, TitleScene, StageScene, StageClearScene, EndingScene]
};
