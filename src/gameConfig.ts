import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './constants';
import { EndingScene } from './scenes/EndingScene';
import { PauseScene } from './scenes/PauseScene';
import { PreloadScene } from './scenes/PreloadScene';
import { StageClearScene } from './scenes/StageClearScene';
import { StageScene } from './scenes/StageScene';
import { TitleScene } from './scenes/TitleScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#8ed8ff',
  pixelArt: false,
  roundPixels: false,
  input: { activePointers: 4 },
  disableContextMenu: true,
  banner: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Full screen the page container, not a wrapper Phaser would create.
    fullscreenTarget: 'game-container'
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1200 },
      debug: false
    }
  },
  scene: [PreloadScene, TitleScene, StageScene, PauseScene, StageClearScene, EndingScene]
};
