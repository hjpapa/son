import { Settings } from '../game/Settings';
import { getAudio } from './engine';

// Small synthesized sound effects. No audio files to download, and the
// pentatonic notes keep the East Asian storybook mood of the game.
type Wave = OscillatorType;

function tone(frequency: number, duration: number, options: { wave?: Wave; delay?: number; to?: number; volume?: number } = {}): void {
  if (!Settings.sound) return;
  const audio = getAudio();
  if (!audio) return;
  const { ctx, sfx } = audio;
  const start = ctx.currentTime + (options.delay ?? 0);
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = options.wave ?? 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  if (options.to) oscillator.frequency.exponentialRampToValueAtTime(options.to, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(options.volume ?? 0.5, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(sfx);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function melody(notes: number[], step: number, wave: Wave = 'triangle', volume = 0.45): void {
  notes.forEach((note, index) => tone(note, step * 1.6, { wave, delay: index * step, volume }));
}

export const Sfx = {
  jump: () => tone(360, 0.16, { to: 760, wave: 'sine', volume: 0.35 }),
  swing: () => tone(620, 0.12, { to: 210, wave: 'triangle', volume: 0.3 }),
  hit: () => {
    tone(260, 0.09, { to: 120, wave: 'square', volume: 0.22 });
    tone(880, 0.05, { wave: 'triangle', volume: 0.25 });
  },
  coin: () => melody([988, 1319], 0.07, 'sine', 0.35),
  hurt: () => tone(320, 0.28, { to: 110, wave: 'sawtooth', volume: 0.18 }),
  heal: () => melody([523, 659, 784], 0.07, 'sine', 0.35),
  levelUp: () => melody([523, 587, 659, 784, 880, 1047], 0.075),
  reward: () => melody([587, 784, 880, 1175], 0.11),
  clear: () => melody([523, 587, 659, 784, 880, 784, 1047], 0.12),
  // A soft gong opens every chapter, like turning the page of a storybook.
  gong: () => {
    tone(98, 2.4, { wave: 'sine', volume: 0.55 });
    tone(147, 1.8, { wave: 'sine', volume: 0.25 });
    tone(262, 1.1, { wave: 'triangle', volume: 0.12 });
  },
  tap: () => tone(700, 0.05, { wave: 'sine', volume: 0.2 })
};
