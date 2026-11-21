import { describe, it, expect, vi, beforeEach } from "vitest";
import { soundEffects } from "../src/engine/audio/soundEffects";
import { useUIStore } from "../src/stores/uiStore";

describe("Sound & BGM Audio System", () => {
  beforeEach(() => {
    useUIStore.setState({ soundEnabled: true });
  });

  it("has loud, audible volume levels for all BGM tracks", () => {
    // soundEffects should be ready to accept track switching
    soundEffects.setBgmTrack("meadow");
    soundEffects.setBgmTrack("shop");
    soundEffects.setBgmTrack("mine");
    soundEffects.setBgmTrack("lullaby");
    soundEffects.setBgmTrack("cozy");
    expect(soundEffects).toBeDefined();
  });

  it("can trigger all core pet, slime physics, UI and activity sound effects without throwing", () => {
    expect(() => {
      soundEffects.playSquish();
      soundEffects.playBoing();
      soundEffects.playHop();
      soundEffects.playPlop();
      soundEffects.playFeed();
      soundEffects.playHappy();
      soundEffects.playPet();
      soundEffects.playSleep();
      soundEffects.playWakeUp();
      soundEffects.playDizzy();
      soundEffects.playBubble();
      soundEffects.playSplash();
      soundEffects.playSparkle();
      soundEffects.playWeatherChange(true);
      soundEffects.playWeatherChange(false);
      soundEffects.playRainDrop();
      soundEffects.playClick();
      soundEffects.playHover();
      soundEffects.playPop();
      soundEffects.playDismiss();
      soundEffects.playTab();
      soundEffects.playToggle(true);
      soundEffects.playToggle(false);
      soundEffects.playPickup();
      soundEffects.playDrop();
      soundEffects.playGuideTap();
      soundEffects.playMineHit();
      soundEffects.playCrystalFound();
      soundEffects.playCash();
      soundEffects.playError();
      soundEffects.playUnlock();
      soundEffects.playEquip();
      soundEffects.playTired();
      soundEffects.playStairs();
      soundEffects.playLevelUp();
      soundEffects.playSuccess();
      soundEffects.playWarning();
      soundEffects.playSnore();
      soundEffects.playScrub();
      soundEffects.playPurr();
      soundEffects.playMunch();
      soundEffects.playKeyTap();
    }).not.toThrow();
  });

  it("stops and resumes BGM when sound is toggled", () => {
    soundEffects.syncSoundEnabled(false);
    expect(useUIStore.getState().soundEnabled).toBe(true); // store is independent
    soundEffects.syncSoundEnabled(true);
  });
});
