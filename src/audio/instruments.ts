// Synthesized voices for the background music. Each one is shaped after a
// traditional East Asian instrument so no audio files are needed:
// flute ≈ 대금/dizi, pluck ≈ 가야금/guzheng, bell ≈ 편종, drum ≈ 북, block ≈ 목탁.
export type Instrument = 'flute' | 'pluck' | 'bell' | 'bass' | 'pad' | 'drums';

type Voice = (ctx: BaseAudioContext, out: AudioNode, frequency: number, time: number, duration: number, volume: number) => void;

function envelope(ctx: BaseAudioContext, out: AudioNode, time: number, attack: number, peak: number, end: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(peak, time + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  gain.connect(out);
  return gain;
}

function oscillator(ctx: BaseAudioContext, type: OscillatorType, frequency: number, time: number, stop: number, out: AudioNode): OscillatorNode {
  const node = ctx.createOscillator();
  node.type = type;
  node.frequency.setValueAtTime(frequency, time);
  node.connect(out);
  node.start(time);
  node.stop(stop);
  return node;
}

const flute: Voice = (ctx, out, frequency, time, duration, volume) => {
  const end = time + duration + 0.12;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.06);
  gain.gain.linearRampToValueAtTime(volume * 0.85, time + Math.max(0.07, duration - 0.02));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  gain.connect(out);
  const tone = oscillator(ctx, 'sine', frequency, time, end, gain);
  const breath = ctx.createGain();
  breath.gain.value = 0.12;
  breath.connect(gain);
  oscillator(ctx, 'sine', frequency * 2, time, end, breath);
  // A gentle vibrato that starts after the attack, like a breath held on a flute.
  const vibrato = ctx.createOscillator();
  const depth = ctx.createGain();
  vibrato.frequency.value = 5.2;
  depth.gain.setValueAtTime(0, time);
  depth.gain.linearRampToValueAtTime(frequency * 0.007, time + Math.min(0.35, duration));
  vibrato.connect(depth).connect(tone.frequency);
  vibrato.start(time);
  vibrato.stop(end);
};

const pluck: Voice = (ctx, out, frequency, time, duration, volume) => {
  const end = time + Math.min(1.4, duration + 0.5);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(9000, frequency * 8), time);
  filter.frequency.exponentialRampToValueAtTime(Math.max(300, frequency * 1.5), time + 0.35);
  filter.connect(envelope(ctx, out, time, 0.004, volume, end));
  oscillator(ctx, 'triangle', frequency, time, end, filter);
  const overtone = ctx.createGain();
  overtone.gain.value = 0.25;
  overtone.connect(filter);
  oscillator(ctx, 'sine', frequency * 2.01, time, end, overtone);
};

const bell: Voice = (ctx, out, frequency, time, _duration, volume) => {
  const end = time + 1.8;
  const gain = envelope(ctx, out, time, 0.003, volume, end);
  oscillator(ctx, 'sine', frequency, time, end, gain);
  // Inharmonic partials give the metallic ring of a temple bell.
  for (const [ratio, level, length] of [[2.76, 0.32, 0.9], [5.4, 0.12, 0.45]] as const) {
    const partial = envelope(ctx, out, time, 0.003, volume * level, time + length);
    oscillator(ctx, 'sine', frequency * ratio, time, time + length, partial);
  }
};

const bass: Voice = (ctx, out, frequency, time, duration, volume) => {
  const end = time + duration + 0.15;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 700;
  filter.connect(envelope(ctx, out, time, 0.01, volume, end));
  oscillator(ctx, 'triangle', frequency, time, end, filter);
};

const pad: Voice = (ctx, out, frequency, time, duration, volume) => {
  const end = time + duration + 0.8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.5);
  gain.gain.setValueAtTime(volume, time + Math.max(0.51, duration));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.connect(gain).connect(out);
  // Two slightly detuned voices make a soft, slowly beating drone.
  oscillator(ctx, 'sine', frequency * 0.998, time, end, filter);
  oscillator(ctx, 'triangle', frequency * 1.002, time, end, filter);
};

let noise: AudioBuffer | undefined;
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  if (!noise || noise.sampleRate !== ctx.sampleRate) {
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

// Drum letters: D big drum, d soft drum, T wood block, C cymbal swish.
export function drum(ctx: BaseAudioContext, out: AudioNode, hit: string, time: number, volume: number): void {
  if (hit === 'D' || hit === 'd') {
    const level = volume * (hit === 'D' ? 1 : 0.55);
    const gain = envelope(ctx, out, time, 0.004, level, time + 0.4);
    const body = oscillator(ctx, 'sine', 150, time, time + 0.42, gain);
    body.frequency.exponentialRampToValueAtTime(52, time + 0.2);
  } else if (hit === 'T') {
    const gain = envelope(ctx, out, time, 0.002, volume * 0.45, time + 0.08);
    oscillator(ctx, 'sine', 980, time, time + 0.09, gain);
    oscillator(ctx, 'triangle', 1510, time, time + 0.05, gain);
  } else if (hit === 'C') {
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5500;
    source.connect(filter).connect(envelope(ctx, out, time, 0.01, volume * 0.22, time + 0.45));
    source.start(time);
    source.stop(time + 0.46);
  }
}

export const voices: Record<Exclude<Instrument, 'drums'>, Voice> = { flute, pluck, bell, bass, pad };
