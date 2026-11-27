// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  INTRO_DURATION_SEC,
  evaluateCelestialArc,
  evaluateIntroCamera,
  evaluateSlimeFormation,
  evaluateTimeLapseAtmosphere,
  getGameplayCameraLanding,
} from "../src/features/intro/introTimeline";
import { useUIStore } from "../src/stores/uiStore";
import { useCaregiverStore } from "../src/stores/caregiverStore";
import { persistenceService } from "../src/services/persistenceService";

describe("Intro 3D Cutscene Timeline & State", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useUIStore.setState({ hasSeenIntro: false });
  });

  it("moves sun from East (+X) through zenith (+Y) to West (-X) with opposite moon phase", () => {
    const sunrise = evaluateCelestialArc(0.0);
    const noon = evaluateCelestialArc(0.25);
    const sunset = evaluateCelestialArc(0.5);
    const midnight = evaluateCelestialArc(0.75);

    expect(sunrise.sunPos[0]).toBeGreaterThan(20);
    expect(noon.sunPos[0]).toBeCloseTo(0, 4);
    expect(noon.sunPos[1]).toBeGreaterThan(15);
    expect(sunset.sunPos[0]).toBeLessThan(-20);

    // Moon is 180 degrees opposite the sun (overhead at midnight)
    expect(midnight.moonPos[0]).toBeCloseTo(0, 4);
    expect(midnight.moonPos[1]).toBeGreaterThan(15);
    expect(midnight.moonOpacity).toBeGreaterThan(0.9);
    expect(midnight.starOpacity).toBeGreaterThan(0.9);
  });

  it("triggers rain shower during the mid time-lapse window and clears cleanly at completion", () => {
    expect(INTRO_DURATION_SEC).toBeGreaterThanOrEqual(10);
    expect(INTRO_DURATION_SEC).toBeLessThanOrEqual(12);

    const start = evaluateTimeLapseAtmosphere(0);
    const midRain = evaluateTimeLapseAtmosphere(0.55);
    const end = evaluateTimeLapseAtmosphere(1.0);
    const overClamped = evaluateTimeLapseAtmosphere(1.5);

    expect(start.isRaining).toBe(false);
    expect(midRain.isRaining).toBe(true);
    expect(midRain.rainIntensity).toBeGreaterThan(0.5);
    expect(end.isRaining).toBe(false);
    expect(end.sky).toMatch(/^#[0-9a-f]{6}$/i);
    expect(overClamped.sky).toBe(end.sky);
  });

  it("sweeps intro camera from pond origin to exact gameplay landing pose", () => {
    const startCam = evaluateIntroCamera(0, false);
    const endCam = evaluateIntroCamera(1, false);
    const landing = getGameplayCameraLanding(false);

    expect(startCam.lookAt[0]).toBeCloseTo(9.5, 2);
    expect(startCam.lookAt[2]).toBeCloseTo(9.5, 2);
    expect(endCam.position).toEqual(landing.position);
    expect(endCam.lookAt).toEqual(landing.lookAt);
  });

  it("completes slime morphing and welcome hop cleanly across [0, 1]", () => {
    const early = evaluateSlimeFormation(0.05);
    const morphing = evaluateSlimeFormation(0.75);
    const hopping = evaluateSlimeFormation(0.93);
    const finished = evaluateSlimeFormation(1.0);

    expect(early.morphProgress).toBe(0);
    expect(morphing.morphProgress).toBeGreaterThan(0.4);
    expect(hopping.welcomeHopY).toBeGreaterThan(0.1);
    expect(finished.morphProgress).toBe(1);
    expect(finished.faceReveal).toBe(1);
    expect(finished.welcomeHopY).toBe(0);
  });

  it("persists markIntroSeen and resets intro & caregiver profile on resetAll", async () => {
    useCaregiverStore.getState().setProfile("Dhavi");
    useUIStore.getState().markIntroSeen();

    expect(useUIStore.getState().hasSeenIntro).toBe(true);
    expect(window.localStorage.getItem("juro_has_seen_intro")).toBe("true");
    expect(useCaregiverStore.getState().hasRegisteredName).toBe(true);

    await persistenceService.resetAll();

    expect(useUIStore.getState().hasSeenIntro).toBe(false);
    expect(window.localStorage.getItem("juro_has_seen_intro")).toBeNull();
    expect(useCaregiverStore.getState().hasRegisteredName).toBe(false);
  });
});
