import { safeStorage } from './storage';

const soundKey = 'corn-wukong-sound';

// Sound effects default to on; the toggle is saved per device.
export const Settings = {
  get sound(): boolean {
    return safeStorage.get(soundKey) !== 'off';
  },
  set sound(on: boolean) {
    safeStorage.set(soundKey, on ? 'on' : 'off');
  }
};
