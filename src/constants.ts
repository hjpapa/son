// The game is always 540 px tall. Its width follows the screen between 16:9
// and 19.5:9, so long phones use their whole screen instead of side bars.
export const GAME_HEIGHT = 540;
export const MIN_GAME_WIDTH = 960;
export const MAX_GAME_WIDTH = 1170;
export let GAME_WIDTH = MIN_GAME_WIDTH;

// Measured once at startup, before the game is created. A phone held upright
// at that moment is sized for the landscape view it will be turned to.
export function initGameSize(): void {
  const rect = document.getElementById('game-container')?.getBoundingClientRect();
  let width = rect?.width || window.innerWidth;
  let height = rect?.height || window.innerHeight;
  if (height > width) [width, height] = [height, width];
  const fitted = Math.min(MAX_GAME_WIDTH, Math.max(MIN_GAME_WIDTH, (GAME_HEIGHT * width) / Math.max(1, height)));
  GAME_WIDTH = Math.round(fitted / 2) * 2;
}
