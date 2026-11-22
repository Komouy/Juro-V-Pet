import { useUIStore } from "../../stores/uiStore";

export type BgmTrack = "meadow" | "lullaby" | "shop" | "mine" | "cozy";

// Note frequency lookup table (Hz)
const N = {
  _: 0,
  C2: 65.41, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, A5: 880.00, B5: 987.77,
  C6: 1046.50, D6: 1174.66, E6: 1318.51, G6: 1567.98,
};

interface TrackDef {
  stepDur: number;
  melody: number[];
  bass: number[];
  waveform: OscillatorType;
  bassWaveform: OscillatorType;
  melVol: number;
  bassVol: number;
}

const BGM_TRACKS: Record<BgmTrack, TrackDef> = {
  // 1. Daytime Juro Meadow: Joyful, pastoral, cozy chiptune
  meadow: {
    stepDur: 0.27,
    melody: [
      N.C5, N.E5, N.G5, N.A5, N.G5, N.E5, N.D5, N.C5,
      N.E5, N.G5, N.C6, N.B5, N.A5, N.G5, N.E5, N.D5,
      N.C5, N.D5, N.E5, N.G5, N.A5, N.G5, N.E5, N.D5,
      N.C5, N.E5, N.D5, N.G4, N.C5, N._, N.C5, N._,
    ],
    bass: [
      N.C3, N.C3, N.G3, N.G3, N.A3, N.A3, N.F3, N.F3,
      N.C3, N.C3, N.E3, N.E3, N.F3, N.F3, N.G3, N.G3,
      N.C3, N.C3, N.G3, N.G3, N.A3, N.A3, N.F3, N.F3,
      N.C3, N.C3, N.F3, N.G3, N.C3, N._, N.C3, N._,
    ],
    waveform: "triangle",
    bassWaveform: "sine",
    melVol: 0.22,
    bassVol: 0.26,
  },

  // 2. Nighttime / Bedtime Lullaby: Gentle, dreamy music box
  lullaby: {
    stepDur: 0.44,
    melody: [
      N.E5, N.G5, N.B5, N.C6, N.B5, N.G5, N.E5, N.D5,
      N.E5, N.A5, N.C6, N.B5, N.A5, N.G5, N.E5, N.D5,
      N.C5, N.E5, N.G5, N.A5, N.G5, N.E5, N.D5, N.B4,
      N.C5, N.E5, N.D5, N.B4, N.A4, N._, N.A4, N._,
    ],
    bass: [
      N.A2, N.E3, N.F2, N.C3, N.G2, N.D3, N.C3, N.G2,
      N.A2, N.E3, N.F2, N.C3, N.G2, N.D3, N.A2, N.E2,
    ],
    waveform: "sine",
    bassWaveform: "sine",
    melVol: 0.18,
    bassVol: 0.22,
  },

  // 3. Shop Market Theme: Bouncy, upbeat retro shopkeeper melody
  shop: {
    stepDur: 0.22,
    melody: [
      N.G4, N.B4, N.D5, N.G5, N.E5, N.C5, N.E5, N.G5,
      N.Fs5, N.D5, N.Fs5, N.A5, N.G5, N.D5, N.B4, N.G4,
      N.C5, N.E5, N.G5, N.A5, N.B5, N.G5, N.E5, N.D5,
      N.C5, N.D5, N.E5, N.Fs5, N.G5, N._, N.G5, N._,
    ],
    bass: [
      N.G2, N.D3, N.C3, N.G2, N.D3, N.A2, N.G2, N.D3,
      N.C3, N.G3, N.E3, N.C3, N.D3, N.A2, N.G2, N.D3,
    ],
    waveform: "triangle",
    bassWaveform: "triangle",
    melVol: 0.24,
    bassVol: 0.28,
  },

  // 4. Subterranean Mine Theme: Deep resonant cave ambiance & crystal chimes
  mine: {
    stepDur: 0.36,
    melody: [
      N.E5, N._, N.B5, N._, N.G5, N._, N.E6, N._,
      N.D6, N._, N.B5, N._, N.G5, N._, N.A5, N._,
      N.E5, N._, N.B5, N._, N.G5, N._, N.D6, N._,
      N.C6, N._, N.B5, N._, N.A5, N._, N.E5, N._,
    ],
    bass: [
      N.E2, N.E2, N.B2, N.B2, N.C3, N.C3, N.A2, N.B2,
      N.E2, N.E2, N.B2, N.B2, N.A2, N.A2, N.B2, N.B2,
    ],
    waveform: "sine",
    bassWaveform: "triangle",
    melVol: 0.20,
    bassVol: 0.28,
  },

  // 5. Cozy Theme (Collection, Evolution, Settings): Relaxed, warm lofi chiptune
  cozy: {
    stepDur: 0.30,
    melody: [
      N.F5, N.A5, N.C6, N.A5, N.G5, N.B5, N.D6, N.B5,
      N.E5, N.G5, N.B5, N.G5, N.A5, N.C6, N.E6, N.C6,
      N.F5, N.A5, N.C6, N.D6, N.C6, N.A5, N.G5, N.E5,
      N.F5, N.G5, N.A5, N.B5, N.C6, N._, N.C6, N._,
    ],
    bass: [
      N.F2, N.C3, N.G2, N.D3, N.E2, N.B2, N.A2, N.E3,
      N.F2, N.C3, N.G2, N.D3, N.F2, N.G2, N.C3, N.C3,
    ],
    waveform: "triangle",
    bassWaveform: "sine",
    melVol: 0.22,
    bassVol: 0.26,
  },
};

// Comprehensive Web Audio API Sound & Music Generator for cozy, retro pixel UI/UX & jelly pet SFX
class SoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private currentTrack: BgmTrack = "meadow";
  private isBgmPlaying: boolean = false;
  private bgmIntervalId: ReturnType<typeof setInterval> | null = null;
  private bgmStep: number = 0;
  private bgmNextNoteTime: number = 0;

  private initCtx(resume = false) {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (resume && this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private isEnabled(): boolean {
    return Boolean(useUIStore.getState().soundEnabled);
  }

  public unlockAudio() {
    if (typeof window === "undefined") return;
    const ctx = this.initCtx(true);
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }

  private getMasterGain(): GainNode {
    const ctx = this.initCtx()!;
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      const enabled = this.isEnabled();
      this.masterGain.gain.setValueAtTime(enabled ? 1.0 : 0.0, ctx.currentTime);
      this.masterGain.connect(ctx.destination);
    }
    return this.masterGain;
  }

  private getBgmGain(): GainNode {
    const ctx = this.initCtx()!;
    if (!this.bgmGain) {
      this.bgmGain = ctx.createGain();
      const enabled = this.isEnabled();
      this.bgmGain.gain.setValueAtTime(enabled ? 0.75 : 0.0, ctx.currentTime);
      this.bgmGain.connect(this.getMasterGain());
    }
    return this.bgmGain;
  }

  private getSfxDestination(): AudioNode {
    return this.getMasterGain();
  }

  // === PROCEDURAL RETRO BGM SEQUENCER ===

  public startBgm() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    if (this.isBgmPlaying && this.bgmIntervalId) return;

    this.isBgmPlaying = true;
    this.bgmStep = 0;
    this.bgmNextNoteTime = ctx.currentTime + 0.08;

    if (this.bgmIntervalId) clearInterval(this.bgmIntervalId);
    this.bgmIntervalId = setInterval(() => {
      this.scheduleBgm();
    }, 50);
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  public setBgmTrack(track: BgmTrack) {
    if (this.currentTrack === track && this.isBgmPlaying) return;
    this.currentTrack = track;
    this.bgmStep = 0;
    if (this.ctx) {
      this.bgmNextNoteTime = this.ctx.currentTime + 0.08;
    }
    if (this.isEnabled() && !this.isBgmPlaying) {
      this.startBgm();
    }
  }

  public syncSoundEnabled(enabled: boolean) {
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(enabled ? 1.0 : 0.0, this.ctx.currentTime);
    }
    if (enabled) {
      this.unlockAudio();
      this.startBgm();
    } else {
      this.stopBgm();
    }
  }

  private scheduleBgm() {
    if (!this.ctx || this.ctx.state !== "running" || !this.isEnabled() || !this.isBgmPlaying) return;
    const track = BGM_TRACKS[this.currentTrack];
    if (!track) return;

    if (this.bgmNextNoteTime < this.ctx.currentTime) {
      this.bgmNextNoteTime = this.ctx.currentTime + 0.05;
    }
    const lookahead = 0.30;
    while (this.bgmNextNoteTime < this.ctx.currentTime + lookahead) {
      const stepIdx = this.bgmStep % track.melody.length;
      const melFreq = track.melody[stepIdx];
      const bassIdx = this.bgmStep % track.bass.length;
      const bassFreq = track.bass[bassIdx];

      const noteTime = this.bgmNextNoteTime;
      const stepDur = track.stepDur;

      if (melFreq > 0) {
        this.playBgmNote(melFreq, noteTime, stepDur * 0.82, track.waveform, track.melVol);
      }

      if (bassFreq > 0) {
        this.playBgmNote(bassFreq, noteTime, stepDur * 0.92, track.bassWaveform, track.bassVol);
      }

      this.bgmStep++;
      this.bgmNextNoteTime += stepDur;
    }
  }

  private playBgmNote(
    freq: number,
    time: number,
    duration: number,
    type: OscillatorType,
    vol: number
  ) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(gain);
      gain.connect(this.getBgmGain());

      osc.start(time);
      osc.stop(time + duration + 0.02);
    } catch {
      // Audio safety
    }
  }

  // === 1. CORE PET & SLIME PHYSICS SOUNDS ===

  // Soft gummy squish sound (when pointer touches or drags Juro)
  playSquish() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.12);

      osc.type = "sine";
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.55, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio safety
    }
  }

  // Springy boing sound (when releasing Juro and spring oscillator rebounds)
  playBoing() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      const now = ctx.currentTime;

      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.22);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.32);

      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start();
      osc.stop(now + 0.38);
    } catch {
      // Audio safety
    }
  }

  // Cute slime hop sound when crawling over hills, stairs & terraces
  playHop() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(380, now + 0.09);

      gain.gain.setValueAtTime(0.48, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Audio safety
    }
  }

  // Soft jelly plop when landing back onto the ground
  playPlop() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(310, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.07);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Audio safety
    }
  }

  // Cute bite / munch sound when eating
  playFeed() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.09].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(440 + idx * 80, now + delay);
        osc.frequency.exponentialRampToValueAtTime(300 + idx * 60, now + delay + 0.07);

        gain.gain.setValueAtTime(0.55, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.07);

        osc.connect(gain);
        gain.connect(this.getSfxDestination());

        osc.start(now + delay);
        osc.stop(now + delay + 0.08);
      });
    } catch {
      // Audio safety
    }
  }

  // Cheerful chime / giggle when happy
  playHappy() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
      const now = ctx.currentTime;

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.48, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.12);

        osc.connect(gain);
        gain.connect(this.getSfxDestination());

        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.14);
      });
    } catch {
      // Audio safety
    }
  }

  // Affectionate chirp / pet sound when petting or clicking Juro
  playPet() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(940, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.11);

      gain.gain.setValueAtTime(0.48, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.14);
    } catch {
      // Audio safety
    }
  }

  // Cozy music box lullaby when Juro goes to bed / falls asleep
  playSleep() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const lullaby = [523.25, 659.25, 587.33, 440]; // C5, E5, D5, A4

      lullaby.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.14);

        gain.gain.setValueAtTime(0.45, now + i * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.28);

        osc.connect(gain);
        gain.connect(this.getSfxDestination());

        osc.start(now + i * 0.14);
        osc.stop(now + i * 0.14 + 0.3);
      });
    } catch {
      // Audio safety
    }
  }

  // Cheerful ascending morning motif when Juro wakes up
  playWakeUp() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [392.0, 523.25, 659.25, 783.99]; // G4, C5, E5, G5

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.075);

        gain.gain.setValueAtTime(0.52, now + i * 0.075);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.075 + 0.18);

        osc.connect(gain);
        gain.connect(this.getSfxDestination());

        osc.start(now + i * 0.075);
        osc.stop(now + i * 0.075 + 0.2);
      });
    } catch {
      // Audio safety
    }
  }

  // Playful cartoon dizzy wobble sound when Juro is flung/shaken rapidly
  playDizzy() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.42);

      // Vibrato LFO creating a comedic spinning/dizzy warble
      lfo.type = "sine";
      lfo.frequency.setValueAtTime(16, now);
      lfoGain.gain.setValueAtTime(68, now);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.46);
      osc.stop(now + 0.46);
    } catch {
      // Audio safety
    }
  }

  // === 2. BATH & CLEANING SOUNDS ===

  // Playful soap bubble lather sound when rubbing soap on Juro
  playBubble() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const baseFreq = 720 + Math.random() * 280;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.045);

      gain.gain.setValueAtTime(0.40, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // Audio safety
    }
  }

  // Splash sound for cleaning / pouring water
  playSplash() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(420, now + 0.18);

      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.18);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Audio safety
    }
  }

  // Clean sparkly glockenspiel chime when Juro is fully cleaned
  playSparkle() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const glockenspiel = [1318.51, 1567.98, 2093.0, 2637.02]; // E6, G6, C7, E7

      glockenspiel.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.05);

        gain.gain.setValueAtTime(0.48, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.22);

        osc.connect(gain);
        gain.connect(this.getSfxDestination());

        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.24);
      });
    } catch {
      // Audio safety
    }
  }

  // Cozy weather atmosphere change chime
  playWeatherChange(isRain: boolean) {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Rain: soothing descending water-drop tones; Clear: cheerful ascending melody
      const notes = isRain ? [880, 784, 587.33] : [587.33, 784, 987.77];

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0.45, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.28);

        osc.connect(gain);
        gain.connect(this.getSfxDestination());

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.3);
      });
    } catch {
      // Audio safety
    }
  }

  // Gentle raindrop water plop sound
  playRainDrop() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      const baseFreq = 950 + Math.random() * 350;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Audio safety
    }
  }

  // === 3. GENERAL UI & NAVIGATION SOUNDS ===

  // Crisp subtle UI button click
  playClick() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(380, now + 0.045);

      gain.gain.setValueAtTime(0.40, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.055);
    } catch {
      // Audio safety
    }
  }

  // Ultra-subtle high-frequency blip when hovering interactive elements
  playHover() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(920, now);

      gain.gain.setValueAtTime(0.50, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // Audio safety
    }
  }

  // Bouncy bubble pop when radial/popover menus & drawers open
  playPop() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.055);

      gain.gain.setValueAtTime(0.52, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.075);
    } catch {
      // Audio safety
    }
  }

  // Soft reverse pop when closing menus, modals or trays
  playDismiss() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.05);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.065);
    } catch {
      // Audio safety
    }
  }

  // Crisp mechanical tab tick for navigation links and segmented switches
  playTab() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.03);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Audio safety
    }
  }

  // Two-tone switch sound for toggles (higher pitch for ON, lower for OFF)
  playToggle(on: boolean) {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const f1 = on ? 440 : 660;
      const f2 = on ? 660 : 440;

      [f1, f2].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        gain.gain.setValueAtTime(0.40, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.05);

        osc.connect(gain);
        gain.connect(this.getSfxDestination());

        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.06);
      });
    } catch {
      // Audio safety
    }
  }

  // Tactile pluck when picking up an item from tray to drag
  playPickup() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(460, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.05);

      gain.gain.setValueAtTime(0.48, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      // Audio safety
    }
  }

  // Soft drop sound when item is released or returned to inventory
  playDrop() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Audio safety
    }
  }

  // Gentle acoustic pip when clicking the valley meadow to guide Juro
  playGuideTap() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(940, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.04);

      gain.gain.setValueAtTime(0.30, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Audio safety
    }
  }

  // === 4. ECONOMY, SHOP & MINING SOUNDS ===

  // Tactile stone pickaxe tap sound in mining mini-game
  playMineHit() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.07);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Audio safety
    }
  }

  // Shimmering crystal discovery chime
  playCrystalFound() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [880, 1174.66, 1567.98];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.045);

        gain.gain.setValueAtTime(0.65, now + i * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.16);

        osc.connect(gain);
        gain.connect(this.getSfxDestination());

        osc.start(now + i * 0.045);
        osc.stop(now + i * 0.045 + 0.18);
      });
    } catch {
      // Audio safety
    }
  }

  // Retro coin cash-register ding when buying/selling in the shop
  playCash() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [987.77, 1318.51].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.065);

        gain.gain.setValueAtTime(0.60, now + idx * 0.065);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.065 + 0.18);

        osc.connect(gain);
        gain.connect(this.getSfxDestination());

        osc.start(now + idx * 0.065);
        osc.stop(now + idx * 0.065 + 0.2);
      });
    } catch {
      // Audio safety
    }
  }

  // Retro double-buzz when action cannot be completed (e.g. not enough coins / invalid file)
  playError() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.09].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, now + delay);

        gain.gain.setValueAtTime(0.48, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.07);

        osc.connect(gain);
        gain.connect(this.getSfxDestination());

        osc.start(now + delay);
        osc.stop(now + delay + 0.08);
      });
    } catch {
      // Audio safety
    }
  }

  // Celebratory retro fanfare for unlocking skins, toys or tiers
  playUnlock() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.65, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);

        osc.connect(gain);
        gain.connect(this.getSfxDestination());

        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.2);
      });
    } catch {
      // Audio safety
    }
  }

  // Snappy equip chime when dressing Juro with a new skin
  playEquip() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [784, 1174].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.045);

        gain.gain.setValueAtTime(0.50, now + i * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.1);

        osc.connect(gain);
        gain.connect(this.getSfxDestination());

        osc.start(now + i * 0.045);
        osc.stop(now + i * 0.045 + 0.12);
      });
    } catch {
      // Audio safety
    }
  }

  // Dull clunk when pickaxe stamina is depleted
  playTired() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.22);

      gain.gain.setValueAtTime(0.48, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {
      // Audio safety
    }
  }

  // Descending cave echo steps when descending deeper into the mine
  playStairs() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [659.25, 523.25, 440.0, 329.63]; // E5, C5, A4, E4

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0.45, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.16);

        osc.connect(gain);
        gain.connect(this.getSfxDestination());

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.18);
      });
    } catch {
      // Audio safety
    }
  }

  // Classic triumphant 8-bit fanfare on level up or evolution stage unlock
  playLevelUp() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5, E5, G5, C6, E6

      fanfare.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        const dur = i === fanfare.length - 1 ? 0.35 : 0.14;
        gain.gain.setValueAtTime(0.70, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + dur);

        osc.connect(gain);
        gain.connect(this.getSfxDestination());

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + dur + 0.02);
      });
    } catch {
      // Audio safety
    }
  }

  // Pleasant confirmation chime for successful saves, exports, and edits
  playSuccess() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const chord = [698.46, 880.0, 1046.5]; // F5, A5, C6 major chord

      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.55, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.getSfxDestination());

        osc.start(now);
        osc.stop(now + 0.24);
      });
    } catch {
      // Audio safety
    }
  }

  // Soft caution tone for reset dialogues or destructive confirmations
  playWarning() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [370.0, 311.13]; // F#4, D#4

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + i * 0.1);

        gain.gain.setValueAtTime(0.45, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.15);

        osc.connect(gain);
        gain.connect(this.getSfxDestination());

        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.17);
      });
    } catch {
      // Audio safety
    }
  }

  // === 5. NEW JELLY ANIMATION & DETAIL SFX ===

  // Gentle adorable breath/snore when Juro is asleep on the sofa
  playSnore() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, now);

      osc.type = "sine";
      // Gentle inhale and exhale pitch wave
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.linearRampToValueAtTime(250, now + 0.35);
      osc.frequency.linearRampToValueAtTime(175, now + 0.85);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.40, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.92);
    } catch {
      // Audio safety
    }
  }

  // Foamy bubbly sound when scrubbing Juro with the soap sponge
  playScrub() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [0, 0.04, 0.08].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(820 + idx * 160 + Math.random() * 60, now + delay);
        osc.frequency.exponentialRampToValueAtTime(320, now + delay + 0.04);

        gain.gain.setValueAtTime(0.35, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.045);

        osc.connect(gain);
        gain.connect(this.getSfxDestination());

        osc.start(now + delay);
        osc.stop(now + delay + 0.05);
      });
    } catch {
      // Audio safety
    }
  }

  // Warm loving purr vibration when gently stroking Juro
  playPurr() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(65, now);
      osc.frequency.linearRampToValueAtTime(85, now + 0.1);
      osc.frequency.linearRampToValueAtTime(60, now + 0.22);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio safety
    }
  }

  // Crunchy, cute jelly munch bite when eating food
  playMunch() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.06);

      gain.gain.setValueAtTime(0.52, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Audio safety
    }
  }

  // Subtle 8-bit typewriter click when typing in text inputs
  playKeyTap() {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(600 + Math.random() * 120, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.025);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + 0.035);
    } catch {
      // Audio safety
    }
  }
}

export const soundEffects = new SoundSystem();

// Global user-gesture interaction unlocker for all browsers (Chrome, Edge, Safari, Mobile)
if (typeof window !== "undefined") {
  const unlockEvents = ["pointerdown", "keydown", "touchstart", "click"];
  const handleFirstInteraction = () => {
    soundEffects.unlockAudio();
    if (useUIStore.getState().soundEnabled) {
      soundEffects.startBgm();
    }
    unlockEvents.forEach((ev) => window.removeEventListener(ev, handleFirstInteraction, true));
  };
  unlockEvents.forEach((ev) =>
    window.addEventListener(ev, handleFirstInteraction, { capture: true, once: true })
  );

  // Sync BGM and master volume whenever soundEnabled is toggled anywhere in the app
  useUIStore.subscribe((state, prev) => {
    if (state.soundEnabled !== prev.soundEnabled) {
      soundEffects.syncSoundEnabled(state.soundEnabled);
    }
  });
}
