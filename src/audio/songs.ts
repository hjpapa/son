import type { Instrument } from './instruments';

// Background music written in jianpu (numbered notation, used for East Asian
// folk tunes): 1 2 3 5 6 = do re mi sol la. ' raises and , lowers an octave,
// - holds the previous note, 0 is a rest, | is only a bar line for reading.
// One token is an eighth note. Drum tokens: D big drum, d soft drum,
// T wood block, C cymbal swish.
//
// Most tunes use the five-note (pentatonic) scale of traditional Korean and
// Chinese music. Songs with tonic 6 are in the sadder la-mode (minor).

export type Layer = {
  instrument: Instrument;
  pattern: string;
  volume: number;
  // Shifts the whole layer by octaves.
  octave?: number;
};

export type Song = {
  bpm: number;
  // Frequency of degree 1 (do).
  root: number;
  tonic: '1' | '6';
  layers: Layer[];
};

const C4 = 261.63;
const D4 = 293.66;
const F3 = 174.61;
const G3 = 196.0;

const titleMelody =
  '5 - 6 - 1\' - 2\' - | 3\' - - 2\' 1\' - 6 - | 5 - 6 1\' 2\' - 3\' 2\' | 1\' - - - - - 0 0 | ' +
  '3\' - 5\' - 3\' 2\' 1\' - | 2\' - 3\' 2\' 1\' - 6 - | 5 6 1\' - 2\' - 3\' 2\' | 1\' - - - - - 0 0';

export const songs: Record<string, Song> = {
  // Title: the hero's theme, bright and hopeful.
  title: {
    bpm: 100, root: G3, tonic: '1',
    layers: [
      { instrument: 'flute', pattern: titleMelody, volume: 0.15 },
      { instrument: 'pluck', pattern: '1 5 1\' 5 1 5 1\' 5 | 6, 3 6 3 6, 3 6 3', volume: 0.1 },
      { instrument: 'bass', pattern: '1 - - - 5, - - - | 6, - - - 3, - - -', volume: 0.2 },
      { instrument: 'drums', pattern: 'D 0 0 T d 0 T 0 | D 0 D T d 0 T T', volume: 0.22 }
    ]
  },
  // 1장 옥수수밭: playful, bouncy steps.
  'stage-cornfield': {
    bpm: 116, root: C4, tonic: '1',
    layers: [
      { instrument: 'pluck', pattern: '1 2 3 5 3 2 1 0 | 3 5 6 5 3 0 2 0 | 1 2 3 5 6 1\' 6 5 | 3 - 2 - 1 - 0 0', volume: 0.23 },
      { instrument: 'bass', pattern: '1, 0 5, 0 1, 0 5, 0 | 6, 0 3, 0 5, 0 2, 0', volume: 0.2 },
      { instrument: 'drums', pattern: 'T 0 T T d 0 T 0', volume: 0.2 },
      { instrument: 'bell', pattern: '0 0 0 0 0 0 0 0 | 0 0 0 0 0 0 0 0 | 0 0 0 0 0 0 0 0 | 5\' 0 0 0 0 0 0 0', volume: 0.06 }
    ]
  },
  // 2장 혼세마왕의 동굴: low, careful, a little scary.
  'stage-cave': {
    bpm: 92, root: C4, tonic: '6',
    layers: [
      { instrument: 'flute', pattern: '6, - 1 - 2 - 3 - | 2 - 1 - 6, - - - | 3 - 5 - 6 - 5 3 | 2 - - - 0 0 0 0', volume: 0.15 },
      { instrument: 'pad', pattern: '6, - - - - - - - | 3, - - - - - - -', volume: 0.08 },
      { instrument: 'drums', pattern: 'D 0 T 0 d 0 T 0 | D 0 T d D 0 T 0', volume: 0.24 }
    ]
  },
  // 3장 용궁: shimmering, underwater bells.
  'stage-palace': {
    bpm: 84, root: D4, tonic: '1',
    layers: [
      { instrument: 'flute', pattern: '3 - 5 - 6 - 5 3 | 2 - 3 - 1 - - - | 6, - 1 - 2 - 3 5 | 3 - - - 2 - - -', volume: 0.14 },
      { instrument: 'bell', pattern: '1\' 5 3 5 1\' 5 3 5 | 6 3 1 3 6 3 1 3', volume: 0.06 },
      { instrument: 'pad', pattern: '1, - - - - - - - | 6,, - - - - - - -', volume: 0.08 },
      { instrument: 'drums', pattern: '0 0 0 0 d 0 0 0', volume: 0.15 }
    ]
  },
  // 4장 천궁 추격전: fast chase.
  'stage-skywar': {
    bpm: 144, root: G3, tonic: '6',
    layers: [
      { instrument: 'pluck', pattern: '6 6 1\' 6 2\' 6 3\' 2\' | 1\' 6 5 6 1\' - 6 0 | 6 6 1\' 6 2\' 6 3\' 5\' | 3\' 2\' 1\' 2\' 6 - - 0', volume: 0.17 },
      { instrument: 'flute', pattern: '3\' - - - - - - - | 2\' - - - 1\' - - - | 3\' - - - 5\' - - - | 6\' - - - - - - -', volume: 0.09 },
      { instrument: 'bass', pattern: '6, 6, 6 6, 6, 6, 6 6, | 5, 5, 5 5, 5, 5, 5 5,', volume: 0.16 },
      { instrument: 'drums', pattern: 'D 0 T D D 0 T C', volume: 0.24 }
    ]
  },
  // 5장 오행산: five hundred years of waiting, calm and thoughtful.
  'stage-mountain': {
    bpm: 72, root: F3, tonic: '1',
    layers: [
      {
        instrument: 'flute',
        pattern: '5 - - 6 1\' - - - | 6 - 5 - 3 - - - | 2 - 3 - 5 - 6 5 | 3 - - - - - 0 0 | ' +
          '5 - - 6 1\' - 2\' - | 3\' - 2\' - 1\' - 6 - | 5 - 6 - 3 - 2 - | 5 - - - - - 0 0',
        volume: 0.15
      },
      { instrument: 'pad', pattern: '1 - - - - - - - | 5, - - - - - - -', volume: 0.07 },
      { instrument: 'bell', pattern: '0 0 0 0 0 0 0 0 | 1\'\' 0 0 0 0 0 0 0', volume: 0.05 }
    ]
  },
  // 6장 고로장: cheerful village dance.
  'stage-farm': {
    bpm: 112, root: G3, tonic: '1',
    layers: [
      { instrument: 'pluck', pattern: '5 5 6 5 3 0 1\' 0 | 2\' 3\' 5\' 3\' 2\' - 0 0 | 5 5 6 1\' 6 5 3 0 | 2 3 2 1 1 - 0 0', volume: 0.23 },
      { instrument: 'bass', pattern: '1 0 5, 0 1 0 5, 0', volume: 0.18 },
      { instrument: 'drums', pattern: 'd T 0 T d T 0 T', volume: 0.2 }
    ]
  },
  // 7장 유사하: a flowing river.
  'stage-river': {
    bpm: 88, root: D4, tonic: '1',
    layers: [
      { instrument: 'pluck', pattern: '1 3 5 1\' 5 3 1 3 | 6, 1 3 6 3 1 6, 1 | 2 5 6 2\' 6 5 2 5 | 1 3 5 1\' 5 3 1 0', volume: 0.1 },
      { instrument: 'flute', pattern: '3\' - - - 2\' - 1\' - | 6 - - - 5 - - - | 6 - 1\' - 2\' - 3\' - | 1\' - - - - - - -', volume: 0.14, octave: -1 },
      { instrument: 'pad', pattern: '1, - - - - - - - | 6,, - - - - - - - | 2, - - - - - - - | 1, - - - - - - -', volume: 0.08 }
    ]
  },
  // 8장 황풍산: gusts of wind (cymbal swishes) over a minor flute.
  'stage-wind': {
    bpm: 104, root: C4, tonic: '6',
    layers: [
      { instrument: 'flute', pattern: '6 - - 5 6 - 1\' - | 2\' - 1\' 6 5 - - - | 3 - 5 - 6 - 1\' 2\' | 1\' - 6 - - - 0 0', volume: 0.14 },
      { instrument: 'pad', pattern: '6, - - - - - - - | 5, - - - - - - -', volume: 0.07 },
      { instrument: 'pluck', pattern: '6, 0 3 0 6, 0 3 0', volume: 0.08 },
      { instrument: 'drums', pattern: 'D 0 0 C 0 0 d 0', volume: 0.22 }
    ]
  },
  // 9장 어둠숲: mysterious, sparse bells.
  'stage-forest': {
    bpm: 90, root: G3, tonic: '6',
    layers: [
      { instrument: 'bell', pattern: '6 0 0 3\' 0 0 2\' 0 | 1\' 0 0 6 0 0 0 0 | 5 0 0 1\' 0 0 6 0 | 3 0 0 0 0 0 0 0', volume: 0.08 },
      { instrument: 'flute', pattern: '0 0 0 0 0 0 0 0 | 0 0 0 0 6 - 5 - | 3 - - - 0 0 0 0 | 2 - 3 - 6 - - -', volume: 0.13 },
      { instrument: 'pad', pattern: '6, - - - - - - - - - - - - - - -', volume: 0.08 },
      { instrument: 'drums', pattern: 'd 0 0 0 0 0 T 0', volume: 0.16 }
    ]
  },
  // 10장 진흙 늪: slow, heavy steps, but never giving up.
  'stage-swamp': {
    bpm: 70, root: F3, tonic: '6',
    layers: [
      { instrument: 'bass', pattern: '6, - - 6, 1 - 6, - | 5, - - 5, 3, - - -', volume: 0.22 },
      { instrument: 'flute', pattern: '6 - - - 1\' - 2\' - | 1\' - 6 - - - - - | 3\' - 2\' - 1\' - 2\' - | 6 - - - - - 0 0', volume: 0.14 },
      { instrument: 'drums', pattern: 'D 0 0 0 0 0 0 0 | D 0 0 0 d 0 0 0', volume: 0.22 }
    ]
  },
  // 11장 마음 거울: solemn temple bells.
  'stage-gold': {
    bpm: 92, root: C4, tonic: '1',
    layers: [
      { instrument: 'bell', pattern: '1\' - 5 - 6 - 5 - | 3 - 2 - 1 - - - | 2 - 3 - 5 - 6 - | 5 - - - - - - -', volume: 0.09 },
      { instrument: 'flute', pattern: '0 0 0 0 0 0 0 0 | 0 0 0 0 0 0 5 6 | 1\' - - - 2\' - 3\' - | 2\' - - - 1\' - - -', volume: 0.12 },
      { instrument: 'pad', pattern: '1 - - - - - - - | 5, - - - - - - -', volume: 0.07 },
      { instrument: 'drums', pattern: 'D 0 0 0 0 0 0 0 | d 0 0 0 T 0 0 0', volume: 0.22 }
    ]
  },
  // 12장 천축국: peaceful arrival.
  'stage-ending': {
    bpm: 76, root: F3, tonic: '1',
    layers: [
      {
        instrument: 'flute',
        pattern: '1 - 2 - 3 - 5 - | 3 - 2 - 1 - - - | 6, - 1 - 2 - 3 - | 2 - - - - - - - | ' +
          '1 - 2 - 3 - 5 - | 6 - 5 - 3 - - - | 2 - 3 - 2 - 6, - | 1 - - - - - - -',
        volume: 0.14,
        octave: 1
      },
      { instrument: 'bell', pattern: '1\' 0 5 0 3 0 5 0 | 6 0 3 0 1 0 3 0', volume: 0.05, octave: 1 },
      { instrument: 'pad', pattern: '1 - - - - - - - | 6, - - - - - - -', volume: 0.08 }
    ]
  },
  // Chapter clear screen: the hero's theme, softly, on the road west.
  journey: {
    bpm: 88, root: G3, tonic: '1',
    layers: [
      { instrument: 'pluck', pattern: '5 - 6 - 1\' - 2\' - | 3\' - - 2\' 1\' - 6 - | 5 - 6 1\' 2\' - 3\' 2\' | 1\' - - - - - 0 0', volume: 0.2 },
      { instrument: 'pad', pattern: '1 - - - - - - - | 6, - - - - - - -', volume: 0.07 },
      { instrument: 'drums', pattern: '0 0 0 0 T 0 0 0', volume: 0.15 }
    ]
  },
  // Ending: the hero's theme in full, with bells and drums.
  finale: {
    bpm: 96, root: G3, tonic: '1',
    layers: [
      { instrument: 'flute', pattern: titleMelody, volume: 0.15 },
      { instrument: 'bell', pattern: titleMelody, volume: 0.04, octave: 1 },
      { instrument: 'pluck', pattern: '1 5 1\' 5 1 5 1\' 5 | 6, 3 6 3 6, 3 6 3', volume: 0.09 },
      { instrument: 'bass', pattern: '1 - - - 5, - - - | 6, - - - 3, - - -', volume: 0.2 },
      { instrument: 'drums', pattern: 'D 0 T T D 0 T C | D 0 D T D 0 T C', volume: 0.22 }
    ]
  }
};

// Extra layers that join while a boss is near: a war drum and a pulsing
// bass on the song's home note.
export function battleLayers(song: Song): Layer[] {
  return [
    { instrument: 'drums', pattern: 'D 0 d 0 D d T 0', volume: 0.24 },
    { instrument: 'pluck', pattern: song.tonic === '6' ? '6, 0 6, 6, 3 0 6, 0' : '1 0 1 1 5, 0 1 0', volume: 0.12 }
  ];
}
