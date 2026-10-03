import { safeStorage } from './storage';

const soundKey = 'corn-wukong-sound';
const musicKey = 'corn-wukong-music';

// Sound effects and background music default to on; each toggle is saved per device.
export const Settings = {
  get sound(): boolean {
    return safeStorage.get(soundKey) !== 'off';
  },
  set sound(on: boolean) {
    safeStorage.set(soundKey, on ? 'on' : 'off');
  },
  get music(): boolean {
    return safeStorage.get(musicKey) !== 'off';
  },
  set music(on: boolean) {
    safeStorage.set(musicKey, on ? 'on' : 'off');
  }
};
