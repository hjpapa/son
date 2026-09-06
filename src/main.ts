import Phaser from 'phaser';
import { gameConfig } from './gameConfig';
import './style.css';

const game = new Phaser.Game(gameConfig);

// Local test harness only; stripped from production builds by Vite.
if (import.meta.env.DEV) {
  Object.assign(window, { __GAME__: game });
}
