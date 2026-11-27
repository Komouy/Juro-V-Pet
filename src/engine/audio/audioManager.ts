import { useUIStore } from "../../stores/uiStore";

export type BgmTrack = "meadow" | "lullaby" | "shop" | "mine" | "cozy";

export interface ToneStepOptions {
  freq: number;
  endFreq?: number;
  delay?: number;
  duration: number;
  stopPad?: number;
  type: OscillatorType;
  peakGain: number;
  filterType?: BiquadFilterType;
  filterStartFreq?: number;
  filterEndFreq?: number;
  rampLinear?: boolean;
}

/**
 * Core Web Audio API engine managing AudioContext lifecycle, master/BGM gain nodes,
 * and shared SFX synthesis primitives routed through getSfxDestination().
 */
export class AudioCore {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;

  public initCtx(resume = false): AudioContext | null {
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

  public isEnabled(): boolean {
    return Boolean(useUIStore.getState().soundEnabled);
  }

  public unlockAudio(): void {
    if (typeof window === "undefined") return;
    const ctx = this.initCtx(true);
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }

  public getMasterGain(): GainNode {
    const ctx = this.initCtx()!;
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      const enabled = this.isEnabled();
      this.masterGain.gain.setValueAtTime(enabled ? 1.0 : 0.0, ctx.currentTime);
      this.masterGain.connect(ctx.destination);
    }
    return this.masterGain;
  }

  public getBgmGain(): GainNode {
    const ctx = this.initCtx()!;
    if (!this.bgmGain) {
      this.bgmGain = ctx.createGain();
      const enabled = this.isEnabled();
      // Maintained at 0.75 per GEMINI.md audio balance standards
      this.bgmGain.gain.setValueAtTime(enabled ? 0.75 : 0.0, ctx.currentTime);
      this.bgmGain.connect(this.getMasterGain());
    }
    return this.bgmGain;
  }

  public getSfxDestination(): AudioNode {
    return this.getMasterGain();
  }

  public setMasterEnabled(enabled: boolean): void {
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(enabled ? 1.0 : 0.0, this.ctx.currentTime);
    }
  }

  public playTone(opts: ToneStepOptions): void {
    if (!this.isEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const startTime = ctx.currentTime + (opts.delay ?? 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = opts.type;
      osc.frequency.setValueAtTime(opts.freq, startTime);
      if (opts.endFreq !== undefined) {
        if (opts.rampLinear) {
          osc.frequency.linearRampToValueAtTime(opts.endFreq, startTime + opts.duration);
        } else {
          osc.frequency.exponentialRampToValueAtTime(opts.endFreq, startTime + opts.duration);
        }
      }

      gain.gain.setValueAtTime(opts.peakGain, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + opts.duration);

      if (opts.filterType && opts.filterStartFreq !== undefined) {
        const filter = ctx.createBiquadFilter();
        filter.type = opts.filterType;
        filter.frequency.setValueAtTime(opts.filterStartFreq, startTime);
        if (opts.filterEndFreq !== undefined) {
          filter.frequency.exponentialRampToValueAtTime(
            opts.filterEndFreq,
            startTime + opts.duration
          );
        }
        osc.connect(filter);
        filter.connect(gain);
      } else {
        osc.connect(gain);
      }

      gain.connect(this.getSfxDestination());
      osc.start(startTime);
      osc.stop(startTime + opts.duration + (opts.stopPad ?? 0.02));
    } catch {
      // Audio safety
    }
  }

  public playSequence(
    notes: number[],
    stepSec: number,
    noteDuration: number,
    type: OscillatorType,
    peakGain: number
  ): void {
    notes.forEach((freq, i) => {
      this.playTone({
        freq,
        delay: i * stepSec,
        duration: noteDuration,
        type,
        peakGain,
      });
    });
  }
}
