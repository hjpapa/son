// Counts time spent inside chapters (not menus) so the game can suggest a
// short break between chapters. Kept in memory: a fresh visit starts at zero.
const BREAK_AFTER_MS = 30 * 60 * 1000;
let played = 0;

export const PlayTime = {
  add(ms: number): void {
    played += ms;
  },
  get breakDue(): boolean {
    return played >= BREAK_AFTER_MS;
  },
  reset(): void {
    played = 0;
  },
  // For tests.
  set(ms: number): void {
    played = ms;
  }
};
