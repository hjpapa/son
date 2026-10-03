import { Settings } from '../game/Settings';
import { getAudio, MUSIC_VOLUME } from './engine';
import { drum, voices, type Instrument } from './instruments';
import { battleLayers, songs, type Layer, type Song } from './songs';

type NoteEvent = { frequency?: number; hit?: string; steps: number };
type PreparedLayer = { instrument: Instrument; volume: number; events: Array<NoteEvent | undefined> };
export type PreparedSong = { stepSeconds: number; layers: PreparedLayer[]; battle: PreparedLayer[] };

const semitones: Record<string, number> = { '1': 0, '2': 2, '3': 4, '4': 5, '5': 7, '6': 9, '7': 11 };
const LOOKAHEAD_SECONDS = 0.2;
const TICK_MS = 50;
const FADE_SECONDS = 0.9;
const DUCKED = 0.35;

function prepareLayer(layer: Layer, root: number): PreparedLayer {
  const tokens = layer.pattern.split(/\s+/).filter((token) => token && token !== '|');
  const events = tokens.map((token, index): NoteEvent | undefined => {
    if (token === '0' || token === '-') return undefined;
    let steps = 1;
    while (tokens[index + steps] === '-') steps += 1;
    if (layer.instrument === 'drums') return { hit: token, steps };
    const octave = (token.match(/'/g)?.length ?? 0) - (token.match(/,/g)?.length ?? 0) + (layer.octave ?? 0);
    const semitone = semitones[token[0]];
    if (semitone === undefined) throw new Error(`Unknown note "${token}"`);
    return { frequency: root * 2 ** ((semitone + 12 * octave) / 12), steps };
  });
  return { instrument: layer.instrument, volume: layer.volume, events };
}

export function prepareSong(song: Song): PreparedSong {
  return {
    stepSeconds: 60 / song.bpm / 2,
    layers: song.layers.map((layer) => prepareLayer(layer, song.root)),
    battle: battleLayers(song).map((layer) => prepareLayer(layer, song.root))
  };
}

// Schedules every note that starts on one eighth-note step.
export function playStep(ctx: BaseAudioContext, out: AudioNode, song: PreparedSong, step: number, time: number, battle: boolean): number {
  let notes = 0;
  for (const layer of battle ? [...song.layers, ...song.battle] : song.layers) {
    const event = layer.events[step % layer.events.length];
    if (!event) continue;
    if (layer.instrument === 'drums') drum(ctx, out, event.hit!, time, layer.volume);
    else voices[layer.instrument](ctx, out, event.frequency!, time, event.steps * song.stepSeconds, layer.volume);
    notes += 1;
  }
  return notes;
}

class Track {
  private step = 0;
  private nextTime: number;
  private timer: number;
  readonly gain: GainNode;

  constructor(private readonly ctx: AudioContext, out: AudioNode, private readonly song: PreparedSong, private readonly isBattle: () => boolean, private readonly onNotes: (count: number) => void) {
    this.gain = ctx.createGain();
    this.gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + FADE_SECONDS);
    this.gain.connect(out);
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), TICK_MS);
    this.schedule();
  }

  private schedule(): void {
    const now = this.ctx.currentTime;
    // If the page was busy (loading a chapter), skip missed beats instead of
    // playing them all at once.
    while (this.nextTime < now - 0.05) {
      this.nextTime += this.song.stepSeconds;
      this.step += 1;
    }
    while (this.nextTime < now + LOOKAHEAD_SECONDS) {
      this.onNotes(playStep(this.ctx, this.gain, this.song, this.step, this.nextTime, this.isBattle()));
      this.nextTime += this.song.stepSeconds;
      this.step += 1;
    }
  }

  stop(): void {
    window.clearInterval(this.timer);
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(Math.max(0.0001, this.gain.gain.value), now);
    this.gain.gain.exponentialRampToValueAtTime(0.0001, now + FADE_SECONDS);
    window.setTimeout(() => this.gain.disconnect(), (FADE_SECONDS + LOOKAHEAD_SECONDS + 0.5) * 1000);
  }
}

const prepared = new Map<string, PreparedSong>();
let track: Track | undefined;
let currentKey: string | undefined;
let wantedKey: string | undefined;
let battle = false;
let ducked = false;
let scheduledNotes = 0;

function setBusVolume(): void {
  const audio = getAudio();
  if (!audio) return;
  const now = audio.ctx.currentTime;
  audio.music.gain.cancelScheduledValues(now);
  audio.music.gain.setTargetAtTime(MUSIC_VOLUME * (ducked ? DUCKED : 1), now, 0.12);
}

export const Music = {
  // Starts the song for a scene, crossfading from the one before.
  play(key: string): void {
    wantedKey = key;
    if (ducked) {
      ducked = false;
      setBusVolume();
    }
    if (!Settings.music || (currentKey === key && track)) return;
    const song = songs[key];
    const audio = getAudio();
    if (!song || !audio) return;
    if (!prepared.has(key)) prepared.set(key, prepareSong(song));
    track?.stop();
    battle = false;
    currentKey = key;
    track = new Track(audio.ctx, audio.music, prepared.get(key)!, () => battle, (count) => {
      scheduledNotes += count;
    });
  },

  stop(): void {
    track?.stop();
    track = undefined;
    currentKey = undefined;
  },

  // War drums join while a boss is close.
  setBattle(on: boolean): void {
    battle = on;
  },

  // Quieter music behind the pause menu.
  duck(on: boolean): void {
    if (ducked === on) return;
    ducked = on;
    setBusVolume();
  },

  // Applies the on/off setting right away.
  refresh(): void {
    if (!Settings.music) this.stop();
    else if (wantedKey) this.play(wantedKey);
  },

  // For tests: what is playing and how many notes have been scheduled.
  get state(): { key?: string; battle: boolean; ducked: boolean; scheduledNotes: number } {
    return { key: currentKey, battle, ducked, scheduledNotes };
  }
};
