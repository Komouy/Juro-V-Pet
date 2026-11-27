import { useUIStore } from "../../stores/uiStore";
import { AudioCore, type BgmTrack } from "./audioManager";
import { AmbientAudioController } from "./ambientAudio";
import { createInteractionAudio } from "./interactionAudio";
import { createUiAudio } from "./uiAudio";

export type { BgmTrack } from "./audioManager";

const core = new AudioCore();
const ambient = new AmbientAudioController(core);
const interactionSfx = createInteractionAudio(core);
const uiSfx = createUiAudio(core);

export const soundEffects = {
  unlockAudio: () => core.unlockAudio(),
  startBgm: () => ambient.startBgm(),
  stopBgm: () => ambient.stopBgm(),
  setBgmTrack: (track: BgmTrack) => ambient.setBgmTrack(track),
  syncSoundEnabled: (enabled: boolean) => ambient.syncSoundEnabled(enabled),
  playWeatherChange: (isRain: boolean) => ambient.playWeatherChange(isRain),
  playRainDrop: () => ambient.playRainDrop(),
  ...interactionSfx,
  ...uiSfx,
};

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

  useUIStore.subscribe((state, prev) => {
    if (state.soundEnabled !== prev.soundEnabled) {
      soundEffects.syncSoundEnabled(state.soundEnabled);
    }
  });
}
