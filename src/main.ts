import Phaser from 'phaser';
import { unlockAudio } from './audio/Sfx';
import { gameConfig } from './gameConfig';
import { preventBrowserGestures, registerServiceWorker, watchOrientation } from './platform/webapp';
import './style.css';

const game = new Phaser.Game(gameConfig);

unlockAudio();
preventBrowserGestures();
watchOrientation(game);
registerServiceWorker();

// Local test harness only; stripped from production builds by Vite.
if (import.meta.env.DEV) {
  Object.assign(window, { __GAME__: game });
}
