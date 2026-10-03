// One shared AudioContext for sound effects and music, each with its own
// volume bus. Browsers start audio suspended until the first tap or key.
type Buses = { ctx: AudioContext; sfx: GainNode; music: GainNode };

let buses: Buses | undefined;
let pausedByGame = false;

const SFX_VOLUME = 0.32;
// Music sits well under the effects so jumps and hits stay easy to hear.
export const MUSIC_VOLUME = 0.26;

export function getAudio(): Buses | undefined {
  if (!buses) {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return undefined;
    const ctx = new AudioContextClass();
    const sfx = ctx.createGain();
    sfx.gain.value = SFX_VOLUME;
    sfx.connect(ctx.destination);
    const music = ctx.createGain();
    music.gain.value = MUSIC_VOLUME;
    music.connect(ctx.destination);
    buses = { ctx, sfx, music };
  }
  if (buses.ctx.state === 'suspended' && !pausedByGame) void buses.ctx.resume().catch(() => undefined);
  return buses;
}

// Called when the game is hidden or paused for the upright-phone hint.
export function suspendAudio(): void {
  pausedByGame = true;
  void buses?.ctx.suspend().catch(() => undefined);
}

export function resumeAudio(): void {
  pausedByGame = false;
  if (buses?.ctx.state === 'suspended') void buses.ctx.resume().catch(() => undefined);
}

// Mobile browsers only allow audio after a tap. iOS needs the touchend.
export function unlockAudio(): void {
  const events = ['pointerdown', 'touchend', 'keydown'] as const;
  const resume = () => {
    const audio = getAudio();
    if (!audio || audio.ctx.state === 'running') events.forEach((name) => window.removeEventListener(name, resume));
  };
  events.forEach((name) => window.addEventListener(name, resume));
}
