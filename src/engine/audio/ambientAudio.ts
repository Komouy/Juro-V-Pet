import type { AudioCore, BgmTrack } from "./audioManager";

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

/**
 * Procedural chiptune BGM sequencer and weather ambience SFX controller.
 */
export class AmbientAudioController {
  private currentTrack: BgmTrack = "meadow";
  private isBgmPlaying = false;
  private bgmIntervalId: ReturnType<typeof setInterval> | null = null;
  private bgmStep = 0;
  private bgmNextNoteTime = 0;
  private readonly core: AudioCore;

  constructor(core: AudioCore) {
    this.core = core;
  }

  public startBgm(): void {
    if (!this.core.isEnabled()) return;
    const ctx = this.core.initCtx();
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

  public stopBgm(): void {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  public setBgmTrack(track: BgmTrack): void {
    if (this.currentTrack === track && this.isBgmPlaying) return;
    this.currentTrack = track;
    this.bgmStep = 0;
    const ctx = this.core.initCtx();
    if (ctx) {
      this.bgmNextNoteTime = ctx.currentTime + 0.08;
    }
    if (this.core.isEnabled() && !this.isBgmPlaying) {
      this.startBgm();
    }
  }

  public syncSoundEnabled(enabled: boolean): void {
    this.core.setMasterEnabled(enabled);
    if (enabled) {
      this.core.unlockAudio();
      this.startBgm();
    } else {
      this.stopBgm();
    }
  }

  public playWeatherChange(isRain: boolean): void {
    const notes = isRain ? [880, 784, 587.33] : [587.33, 784, 987.77];
    this.core.playSequence(notes, 0.08, 0.28, "sine", 0.45);
  }

  public playRainDrop(): void {
    const baseFreq = 950 + Math.random() * 350;
    this.core.playTone({
      freq: baseFreq,
      endFreq: 320,
      duration: 0.08,
      stopPad: 0.02,
      type: "sine",
      peakGain: 0.25,
    });
  }

  private scheduleBgm(): void {
    const ctx = this.core.initCtx();
    if (!ctx || ctx.state !== "running" || !this.core.isEnabled() || !this.isBgmPlaying) return;
    const track = BGM_TRACKS[this.currentTrack];
    if (!track) return;

    if (this.bgmNextNoteTime < ctx.currentTime) {
      this.bgmNextNoteTime = ctx.currentTime + 0.05;
    }
    const lookahead = 0.30;
    while (this.bgmNextNoteTime < ctx.currentTime + lookahead) {
      const stepIdx = this.bgmStep % track.melody.length;
      const melFreq = track.melody[stepIdx];
      const bassIdx = this.bgmStep % track.bass.length;
      const bassFreq = track.bass[bassIdx];

      const noteTime = this.bgmNextNoteTime;
      const stepDur = track.stepDur;

      if (melFreq > 0) {
        this.playBgmNote(ctx, melFreq, noteTime, stepDur * 0.82, track.waveform, track.melVol);
      }
      if (bassFreq > 0) {
        this.playBgmNote(ctx, bassFreq, noteTime, stepDur * 0.92, track.bassWaveform, track.bassVol);
      }

      this.bgmStep++;
      this.bgmNextNoteTime += stepDur;
    }
  }

  private playBgmNote(
    ctx: AudioContext,
    freq: number,
    time: number,
    duration: number,
    type: OscillatorType,
    vol: number
  ): void {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(gain);
      gain.connect(this.core.getBgmGain());

      osc.start(time);
      osc.stop(time + duration + 0.02);
    } catch {
      // Audio safety
    }
  }
}
