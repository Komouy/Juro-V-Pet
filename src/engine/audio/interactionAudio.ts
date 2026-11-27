import type { AudioCore } from "./audioManager";

/**
 * Sound effects for Juro pet physics, expressions, feeding, bathing, and sleep.
 */
export function createInteractionAudio(core: AudioCore) {
  return {
    playSquish: () => {
      core.playTone({
        freq: 280,
        endFreq: 140,
        duration: 0.14,
        stopPad: 0.01,
        type: "sine",
        peakGain: 0.55,
        filterType: "lowpass",
        filterStartFreq: 800,
        filterEndFreq: 250,
      });
    },

    playBoing: () => {
      if (!core.isEnabled()) return;
      const ctx = core.initCtx();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;
        osc.type = "sine";
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.22);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.32);
        gain.gain.setValueAtTime(0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
        osc.connect(gain);
        gain.connect(core.getSfxDestination());
        osc.start();
        osc.stop(now + 0.38);
      } catch {
        // Audio safety
      }
    },

    playHop: () => {
      core.playTone({
        freq: 220,
        endFreq: 380,
        duration: 0.12,
        stopPad: 0.01,
        type: "sine",
        peakGain: 0.48,
      });
    },

    playPlop: () => {
      core.playTone({
        freq: 310,
        endFreq: 110,
        duration: 0.085,
        stopPad: 0.005,
        type: "triangle",
        peakGain: 0.45,
      });
    },

    playFeed: () => {
      [0, 0.09].forEach((delay, idx) => {
        core.playTone({
          freq: 440 + idx * 80,
          endFreq: 300 + idx * 60,
          delay,
          duration: 0.07,
          stopPad: 0.01,
          type: "triangle",
          peakGain: 0.55,
        });
      });
    },

    playHappy: () => {
      core.playSequence([523.25, 659.25, 783.99, 1046.5], 0.06, 0.12, "sine", 0.48);
    },

    playPet: () => {
      if (!core.isEnabled()) return;
      const ctx = core.initCtx();
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
        gain.connect(core.getSfxDestination());
        osc.start(now);
        osc.stop(now + 0.14);
      } catch {
        // Audio safety
      }
    },

    playSleep: () => {
      core.playSequence([523.25, 659.25, 587.33, 440], 0.14, 0.28, "sine", 0.45);
    },

    playWakeUp: () => {
      core.playSequence([392.0, 523.25, 659.25, 783.99], 0.075, 0.18, "triangle", 0.52);
    },

    playDizzy: () => {
      if (!core.isEnabled()) return;
      const ctx = core.initCtx();
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
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(16, now);
        lfoGain.gain.setValueAtTime(68, now);
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        osc.connect(gain);
        gain.connect(core.getSfxDestination());

        lfo.start(now);
        osc.start(now);
        lfo.stop(now + 0.46);
        osc.stop(now + 0.46);
      } catch {
        // Audio safety
      }
    },

    playBubble: () => {
      const baseFreq = 720 + Math.random() * 280;
      core.playTone({
        freq: baseFreq,
        endFreq: baseFreq * 1.5,
        duration: 0.055,
        stopPad: 0.005,
        type: "sine",
        peakGain: 0.40,
      });
    },

    playSplash: () => {
      core.playTone({
        freq: 520,
        endFreq: 190,
        duration: 0.2,
        stopPad: 0.02,
        type: "sawtooth",
        peakGain: 0.45,
        filterType: "bandpass",
        filterStartFreq: 1200,
        filterEndFreq: 420,
      });
    },

    playSparkle: () => {
      core.playSequence([1318.51, 1567.98, 2093.0, 2637.02], 0.05, 0.22, "sine", 0.48);
    },

    playSnore: () => {
      if (!core.isEnabled()) return;
      const ctx = core.initCtx();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(450, now);
        osc.type = "sine";
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.linearRampToValueAtTime(250, now + 0.35);
        osc.frequency.linearRampToValueAtTime(175, now + 0.85);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.40, now + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(core.getSfxDestination());
        osc.start(now);
        osc.stop(now + 0.92);
      } catch {
        // Audio safety
      }
    },

    playScrub: () => {
      [0, 0.04, 0.08].forEach((delay, idx) => {
        core.playTone({
          freq: 820 + idx * 160 + Math.random() * 60,
          endFreq: 320,
          delay,
          duration: 0.045,
          stopPad: 0.005,
          type: "triangle",
          peakGain: 0.35,
        });
      });
    },

    playPurr: () => {
      if (!core.isEnabled()) return;
      const ctx = core.initCtx();
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
        gain.connect(core.getSfxDestination());
        osc.start(now);
        osc.stop(now + 0.25);
      } catch {
        // Audio safety
      }
    },

    playMunch: () => {
      core.playTone({
        freq: 540,
        endFreq: 260,
        duration: 0.07,
        stopPad: 0.01,
        type: "triangle",
        peakGain: 0.52,
      });
    },
  };
}
