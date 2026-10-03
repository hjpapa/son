import Phaser from 'phaser';
import { resumeAudio, suspendAudio, unlockAudio } from './audio/engine';
import { gameConfig } from './gameConfig';
import { preventBrowserGestures, registerServiceWorker, watchOrientation } from './platform/webapp';
import './style.css';

const game = new Phaser.Game(gameConfig);

unlockAudio();
// Silence everything while the game is hidden or paused for the rotate hint.
game.events.on(Phaser.Core.Events.PAUSE, suspendAudio);
game.events.on(Phaser.Core.Events.RESUME, resumeAudio);
preventBrowserGestures();
watchOrientation(game);
registerServiceWorker();

// Local test harness only; stripped from production builds by Vite.
if (import.meta.env.DEV) {
  Object.assign(window, { __GAME__: game });
}
