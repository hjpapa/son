import Phaser from 'phaser';
import { stages } from '../game/data/stages';

// Phone and tablet glue: offline caching, full screen, and pausing while
// the device is held upright (the game is designed for landscape).

const isTouch = () => window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then(() => navigator.serviceWorker.ready)
      .then(warmChapterBackgrounds)
      .catch((error) => {
        console.warn('Offline play is unavailable:', error);
      });
  });
}

// Chapter backgrounds load one at a time as the story moves on. Fetch them
// once in the background (the service worker keeps them) so every chapter
// also opens offline. Skipped when the device asks to save data.
function warmChapterBackgrounds(): void {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return;
  const backgrounds = [...new Set(stages.map((stage) => `${location.origin}${import.meta.env.BASE_URL}assets/backgrounds/${stage.backgroundKey}.webp`))];
  // Files fetched before the worker took control (scripts, characters) are
  // requested again so they are kept too; most come from the HTTP cache.
  const alreadyLoaded = performance
    .getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((url) => url.startsWith(location.origin));
  window.setTimeout(() => {
    new Set([...alreadyLoaded, ...backgrounds]).forEach((url) => {
      void fetch(url).catch(() => undefined);
    });
  }, 4000);
}

// Called from a button tap: browsers only allow full screen inside a gesture.
export function enterFullscreen(scene: Phaser.Scene): void {
  if (!isTouch() || isStandalone() || scene.scale.isFullscreen || !scene.scale.fullscreen.available) return;
  scene.scale.startFullscreen();
  const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
  orientation?.lock?.('landscape').catch(() => {
    // iPadOS and desktop browsers do not allow locking; the rotate hint covers it.
  });
}

export function watchOrientation(game: Phaser.Game): void {
  const portrait = window.matchMedia('(orientation: portrait)');
  const update = () => {
    const upright = portrait.matches && isTouch();
    document.body.classList.toggle('rotate-device', upright);
    if (upright) {
      // Leave the chapter on its pause menu so nothing happens off screen.
      game.events.emit('request-pause');
      game.pause();
    } else if (game.isPaused) {
      game.resume();
    }
  };
  portrait.addEventListener('change', update);
  update();
}

// iOS Safari ignores user-scalable=no; block pinch and double-tap zoom here.
export function preventBrowserGestures(): void {
  const block = (event: Event) => event.preventDefault();
  document.addEventListener('gesturestart', block, { passive: false });
  document.addEventListener('dblclick', block, { passive: false });
  document.addEventListener('contextmenu', block);
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd < 320) event.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
}
