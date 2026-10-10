/** Procedural chiptune audio. No asset files: everything is synthesised with WebAudio. */

export type SfxName =
  | 'ui'
  | 'step'
  | 'bump'
  | 'door'
  | 'stairs'
  | 'buy'
  | 'error'
  | 'encounter'
  | 'hit'
  | 'miss'
  | 'crit'
  | 'monsterHit'
  | 'monsterDeath'
  | 'death'
  | 'spell'
  | 'heal'
  | 'levelup'
  | 'victory'
  | 'defeat';

export type TrackName = 'title' | 'town' | 'dungeon' | 'battle' | 'victory';

interface Tone {
  freq: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
  slide?: number;
  delay?: number;
}

const SFX: Record<SfxName, Tone[]> = {
  ui: [{ freq: 660, dur: 0.05, type: 'square', vol: 0.05 }],
  step: [{ freq: 90, dur: 0.06, type: 'triangle', vol: 0.09, slide: -30 }],
  bump: [{ freq: 70, dur: 0.1, type: 'sawtooth', vol: 0.08, slide: -30 }],
  door: [{ freq: 180, dur: 0.12, type: 'sawtooth', vol: 0.06, slide: 90 }, { freq: 260, dur: 0.1, type: 'square', vol: 0.04, delay: 0.1 }],
  stairs: [{ freq: 330, dur: 0.08, type: 'square', vol: 0.06 }, { freq: 262, dur: 0.08, type: 'square', vol: 0.06, delay: 0.09 }, { freq: 196, dur: 0.12, type: 'square', vol: 0.06, delay: 0.18 }],
  buy: [{ freq: 988, dur: 0.06, type: 'square', vol: 0.06 }, { freq: 1319, dur: 0.12, type: 'square', vol: 0.06, delay: 0.07 }],
  error: [{ freq: 150, dur: 0.14, type: 'square', vol: 0.07 }, { freq: 110, dur: 0.18, type: 'square', vol: 0.07, delay: 0.12 }],
  encounter: [{ freq: 220, dur: 0.12, type: 'sawtooth', vol: 0.09 }, { freq: 330, dur: 0.12, type: 'sawtooth', vol: 0.09, delay: 0.12 }, { freq: 165, dur: 0.3, type: 'sawtooth', vol: 0.1, delay: 0.24 }],
  hit: [{ freq: 200, dur: 0.1, type: 'sawtooth', vol: 0.09, slide: -120 }],
  miss: [{ freq: 420, dur: 0.1, type: 'triangle', vol: 0.05, slide: -200 }],
  crit: [{ freq: 300, dur: 0.07, type: 'sawtooth', vol: 0.1, slide: -150 }, { freq: 600, dur: 0.14, type: 'square', vol: 0.08, delay: 0.06 }],
  monsterHit: [{ freq: 130, dur: 0.14, type: 'square', vol: 0.09, slide: -60 }],
  monsterDeath: [{ freq: 300, dur: 0.25, type: 'square', vol: 0.07, slide: -240 }],
  death: [{ freq: 220, dur: 0.2, type: 'sawtooth', vol: 0.09, slide: -160 }, { freq: 110, dur: 0.4, type: 'sawtooth', vol: 0.09, slide: -70, delay: 0.18 }],
  spell: [{ freq: 500, dur: 0.18, type: 'sine', vol: 0.08, slide: 700 }, { freq: 900, dur: 0.12, type: 'triangle', vol: 0.05, delay: 0.12 }],
  heal: [{ freq: 523, dur: 0.08, type: 'sine', vol: 0.08 }, { freq: 659, dur: 0.08, type: 'sine', vol: 0.08, delay: 0.08 }, { freq: 784, dur: 0.16, type: 'sine', vol: 0.08, delay: 0.16 }],
  levelup: [262, 330, 392, 523, 659].map((freq, i) => ({ freq, dur: 0.12, type: 'square' as const, vol: 0.06, delay: i * 0.1 })),
  victory: [392, 392, 392, 523, 466, 523, 659].map((freq, i) => ({ freq, dur: 0.16, type: 'square' as const, vol: 0.06, delay: i * 0.14 })),
  defeat: [330, 311, 294, 262].map((freq, i) => ({ freq, dur: 0.3, type: 'triangle' as const, vol: 0.09, delay: i * 0.3 })),
};

/** Music is a looping list of [midiNote | 0 for rest, beats] per voice. */
interface Track {
  tempo: number;
  lead: [number, number][];
  bass: [number, number][];
  leadType: OscillatorType;
  vol: number;
}

const TRACKS: Record<TrackName, Track> = {
  title: {
    tempo: 84, leadType: 'triangle', vol: 0.07,
    lead: [[69, 1], [72, 1], [76, 2], [74, 1], [72, 1], [69, 2], [67, 1], [71, 1], [74, 2], [72, 1], [71, 1], [69, 2]],
    bass: [[45, 4], [41, 4], [43, 4], [45, 4]],
  },
  town: {
    tempo: 112, leadType: 'square', vol: 0.045,
    lead: [[67, 1], [71, 1], [74, 1], [71, 1], [72, 1], [76, 1], [74, 1], [72, 1], [71, 1], [67, 1], [69, 1], [71, 1], [67, 2], [0, 2]],
    bass: [[43, 2], [50, 2], [48, 2], [43, 2], [47, 2], [50, 2], [43, 4]],
  },
  dungeon: {
    tempo: 66, leadType: 'triangle', vol: 0.05,
    lead: [[0, 2], [57, 1], [0, 1], [60, 2], [0, 4], [56, 1], [0, 1], [59, 2], [0, 2]],
    bass: [[33, 4], [32, 4], [33, 4], [31, 4]],
  },
  battle: {
    tempo: 152, leadType: 'sawtooth', vol: 0.04,
    lead: [[69, 0.5], [69, 0.5], [72, 0.5], [69, 0.5], [76, 1], [74, 1], [67, 0.5], [67, 0.5], [71, 0.5], [67, 0.5], [74, 1], [72, 1]],
    bass: [[45, 0.5], [45, 0.5], [45, 0.5], [45, 0.5], [43, 0.5], [43, 0.5], [43, 0.5], [43, 0.5]],
  },
  victory: {
    tempo: 120, leadType: 'square', vol: 0.05,
    lead: [[72, 1], [76, 1], [79, 1], [84, 2], [0, 1], [83, 1], [79, 1], [76, 2], [72, 2]],
    bass: [[48, 4], [55, 4], [48, 4]],
  },
};

import { readStored, writeStored } from './storage';

const midiToHz = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);
const STORAGE_KEY = 'eagles-tale:muted';

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted: boolean;
  private current: TrackName | null = null;
  private timer: number | null = null;
  private nextBar = 0;

  constructor() {
    this.muted = readStored(STORAGE_KEY) === '1';
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Browsers only allow audio after a user gesture, so the context is created lazily. */
  private ensure(): AudioContext | null {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Call from a user-gesture handler so queued music can actually start. */
  unlock(): void {
    if (!this.muted) this.ensure();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    writeStored(STORAGE_KEY, this.muted ? '1' : '0');
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.8;
    else if (!this.muted) this.ensure();
    return this.muted;
  }

  private tone(t: Tone, start: number, vol = 1): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const at = start + (t.delay ?? 0);
    osc.type = t.type ?? 'square';
    osc.frequency.setValueAtTime(t.freq, at);
    if (t.slide) osc.frequency.linearRampToValueAtTime(Math.max(20, t.freq + t.slide), at + t.dur);
    const peak = (t.vol ?? 0.06) * vol;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(peak, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + t.dur);
    osc.connect(gain).connect(this.master);
    osc.start(at);
    osc.stop(at + t.dur + 0.02);
  }

  sfx(name: SfxName): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    for (const t of SFX[name]) this.tone(t, ctx.currentTime);
  }

  /** Starts looping a track (no-op if it is already playing). */
  music(name: TrackName | null): void {
    if (name === this.current) return;
    this.current = name;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    if (!name) return;
    const ctx = this.ensure();
    if (!ctx) return;
    this.nextBar = ctx.currentTime + 0.1;
    this.schedule();
    this.timer = window.setInterval(() => this.schedule(), 250);
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.current || this.muted) {
      if (ctx) this.nextBar = Math.max(this.nextBar, ctx.currentTime);
      return;
    }
    const track = TRACKS[this.current];
    // Queue the next loop when the current one is about to run out.
    if (this.nextBar - ctx.currentTime > 0.6) return;
    const beat = 60 / track.tempo;
    const length = (voice: [number, number][]): number => voice.reduce((s, [, b]) => s + b, 0);
    const loopBeats = Math.max(length(track.lead), length(track.bass));
    const play = (voice: [number, number][], type: OscillatorType, vol: number): void => {
      let t = this.nextBar;
      let beats = 0;
      while (beats < loopBeats) {
        for (const [note, b] of voice) {
          if (note) this.tone({ freq: midiToHz(note), dur: b * beat * 0.9, type, vol }, t);
          t += b * beat;
          beats += b;
        }
      }
    };
    play(track.lead, track.leadType, track.vol);
    play(track.bass, 'triangle', track.vol * 1.2);
    this.nextBar += loopBeats * beat;
  }
}
