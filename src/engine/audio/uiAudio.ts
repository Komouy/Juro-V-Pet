import type { AudioCore } from "./audioManager";

/**
 * Sound effects for UI interactions, navigation, economy, mining, and level milestones.
 */
export function createUiAudio(core: AudioCore) {
  return {
    playClick: () => {
      core.playTone({
        freq: 640,
        endFreq: 380,
        duration: 0.05,
        stopPad: 0.005,
        type: "triangle",
        peakGain: 0.40,
      });
    },

    playHover: () => {
      core.playTone({
        freq: 920,
        duration: 0.025,
        stopPad: 0.005,
        type: "sine",
        peakGain: 0.50,
      });
    },

    playPop: () => {
      core.playTone({
        freq: 380,
        endFreq: 740,
        duration: 0.07,
        stopPad: 0.005,
        type: "sine",
        peakGain: 0.52,
      });
    },

    playDismiss: () => {
      core.playTone({
        freq: 620,
        endFreq: 260,
        duration: 0.06,
        stopPad: 0.005,
        type: "sine",
        peakGain: 0.45,
      });
    },

    playTab: () => {
      core.playTone({
        freq: 780,
        endFreq: 540,
        duration: 0.035,
        stopPad: 0.005,
        type: "triangle",
        peakGain: 0.35,
      });
    },

    playToggle: (on: boolean) => {
      const notes = on ? [440, 660] : [660, 440];
      core.playSequence(notes, 0.04, 0.05, "sine", 0.40);
    },

    playPickup: () => {
      core.playTone({
        freq: 460,
        endFreq: 680,
        duration: 0.065,
        stopPad: 0.005,
        type: "sine",
        peakGain: 0.48,
      });
    },

    playDrop: () => {
      core.playTone({
        freq: 320,
        endFreq: 180,
        duration: 0.075,
        stopPad: 0.005,
        type: "triangle",
        peakGain: 0.45,
      });
    },

    playGuideTap: () => {
      core.playTone({
        freq: 940,
        endFreq: 620,
        duration: 0.045,
        stopPad: 0.005,
        type: "sine",
        peakGain: 0.30,
      });
    },

    playMineHit: () => {
      core.playTone({
        freq: 240,
        endFreq: 95,
        duration: 0.08,
        stopPad: 0.01,
        type: "square",
        peakGain: 0.45,
      });
    },

    playCrystalFound: () => {
      core.playSequence([880, 1174.66, 1567.98], 0.045, 0.16, "sine", 0.65);
    },

    playCash: () => {
      core.playSequence([987.77, 1318.51], 0.065, 0.18, "sine", 0.60);
    },

    playError: () => {
      [0, 0.09].forEach((delay) => {
        core.playTone({
          freq: 150,
          delay,
          duration: 0.07,
          stopPad: 0.01,
          type: "sawtooth",
          peakGain: 0.48,
        });
      });
    },

    playUnlock: () => {
      core.playSequence([523.25, 659.25, 783.99, 1046.5], 0.06, 0.18, "triangle", 0.65);
    },

    playEquip: () => {
      core.playSequence([784, 1174], 0.045, 0.1, "sine", 0.50);
    },

    playTired: () => {
      core.playTone({
        freq: 220,
        endFreq: 95,
        duration: 0.24,
        stopPad: 0.02,
        type: "sine",
        peakGain: 0.48,
      });
    },

    playStairs: () => {
      core.playSequence([659.25, 523.25, 440.0, 329.63], 0.08, 0.16, "triangle", 0.45);
    },

    playLevelUp: () => {
      const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      fanfare.forEach((freq, i) => {
        const dur = i === fanfare.length - 1 ? 0.35 : 0.14;
        core.playTone({
          freq,
          delay: i * 0.08,
          duration: dur,
          type: "triangle",
          peakGain: 0.70,
        });
      });
    },

    playSuccess: () => {
      const chord = [698.46, 880.0, 1046.5];
      chord.forEach((freq) => {
        core.playTone({
          freq,
          duration: 0.22,
          type: "sine",
          peakGain: 0.55,
        });
      });
    },

    playWarning: () => {
      core.playSequence([370.0, 311.13], 0.1, 0.15, "sawtooth", 0.45);
    },

    playKeyTap: () => {
      core.playTone({
        freq: 600 + Math.random() * 120,
        endFreq: 200,
        duration: 0.03,
        stopPad: 0.005,
        type: "triangle",
        peakGain: 0.25,
      });
    },
  };
}
