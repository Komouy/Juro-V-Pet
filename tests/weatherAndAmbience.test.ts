// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { rollAutoWeatherWindow, useUIStore } from "../src/stores/uiStore";
import { getEffectiveWeatherPalette } from "../src/components/pet/viewport/viewportConstants";
import {
  getDayTimeWeather,
  isNightWeather,
  isRainingWeather,
  normalizeWeather,
} from "../src/types/ui";
import { getTimePhaseFromDate } from "../src/utils/timeOfDay";
import { isWaterAt } from "../src/engine/world/mapTerrain";
import { shouldShowRainLeaf } from "../src/features/character/juroHelpers";

describe("Dynamic Weather & Ambience System", () => {
  beforeEach(() => {
    useUIStore.setState({
      weather: "auto",
      autoRaining: false,
      autoWeatherNextChangeAt: Date.now() + 60_000,
    });
  });

  it("defaults to auto weather mode", () => {
    expect(useUIStore.getState().weather).toBe("auto");
  });

  it("evaluates automatic random rain windows and rolls new state on expiry", () => {
    const now = 1_700_000_000_000;
    const rainyRoll = rollAutoWeatherWindow(now, () => 0.1);
    expect(rainyRoll.isRaining).toBe(true);
    expect(rainyRoll.nextChangeAt).toBeGreaterThan(now);

    const clearRoll = rollAutoWeatherWindow(now, () => 0.9);
    expect(clearRoll.isRaining).toBe(false);
    expect(clearRoll.nextChangeAt).toBeGreaterThan(now);

    useUIStore.setState({
      weather: "auto",
      autoRaining: false,
      autoWeatherNextChangeAt: now - 1,
    });
    useUIStore.getState().syncAutoWeather(now, () => 0.05);
    expect(useUIStore.getState().autoRaining).toBe(true);
    expect(isRainingWeather(useUIStore.getState().weather, useUIStore.getState().autoRaining)).toBe(
      true
    );
  });

  it("aligns rainy atmosphere lighting and night flag with the active time-of-day", () => {
    const morningRain = getEffectiveWeatherPalette("pagi", true);
    const dayRain = getEffectiveWeatherPalette("cerah", true);
    const sunsetRain = getEffectiveWeatherPalette("senja", true);
    const nightRain = getEffectiveWeatherPalette("malam", true);

    expect(morningRain.isNight).toBe(false);
    expect(dayRain.isNight).toBe(false);
    expect(sunsetRain.isNight).toBe(false);
    expect(nightRain.isNight).toBe(true);
    expect(nightRain.sunIntensity).toBeLessThan(dayRain.sunIntensity);
    expect(nightRain.sky).not.toBe(dayRain.sky);

    expect(getDayTimeWeather(new Date(2026, 0, 1, 22, 0, 0))).toBe("malam");
    expect(isNightWeather("hujan", new Date(2026, 0, 1, 22, 0, 0))).toBe(true);
    expect(isNightWeather("hujan", new Date(2026, 0, 1, 13, 0, 0))).toBe(false);
  });

  it("transitions across auto morning, day, sunset, and night phases accurately", () => {
    const morningDate = new Date(2026, 0, 1, 7, 30, 0);
    const dayDate = new Date(2026, 0, 1, 13, 0, 0);
    const sunsetDate = new Date(2026, 0, 1, 17, 15, 0);
    const nightDate = new Date(2026, 0, 1, 22, 0, 0);
    const lateNightDate = new Date(2026, 0, 1, 3, 0, 0);

    expect(getTimePhaseFromDate(morningDate)).toBe("morning");
    expect(getTimePhaseFromDate(dayDate)).toBe("day");
    expect(getTimePhaseFromDate(sunsetDate)).toBe("sunset");
    expect(getTimePhaseFromDate(nightDate)).toBe("night");
    expect(getTimePhaseFromDate(lateNightDate)).toBe("night");

    expect(normalizeWeather("auto", morningDate)).toBe("pagi");
    expect(normalizeWeather("auto", dayDate)).toBe("cerah");
    expect(normalizeWeather("auto", sunsetDate)).toBe("senja");
    expect(normalizeWeather("auto", nightDate)).toBe("malam");
    expect(normalizeWeather("auto", lateNightDate)).toBe("malam");

    expect(isNightWeather("auto", morningDate)).toBe(false);
    expect(isNightWeather("auto", nightDate)).toBe(true);
  });

  it("detects river and pond water boundaries accurately on mapTerrain", () => {
    expect(isWaterAt(13.4, -0.6)).toBe(false); // Dry cafe plaza
    expect(isWaterAt(-3.2, -3.2)).toBe(false); // Wooden bridge deck over canal
    expect(isWaterAt(0, 0)).toBe(true); // Center of diagonal canal
    expect(isWaterAt(9.5, 9.5)).toBe(true); // Lotus & duck pond
  });

  it("only shows green leaf parasol in the rain when Juro is not wearing any hat", () => {
    expect(shouldShowRainLeaf(false, null)).toBe(false);
    expect(shouldShowRainLeaf(false, "hat-none")).toBe(false);
    expect(shouldShowRainLeaf(false, "hat-straw")).toBe(false);

    expect(shouldShowRainLeaf(true, null)).toBe(true);
    expect(shouldShowRainLeaf(true, undefined)).toBe(true);
    expect(shouldShowRainLeaf(true, "")).toBe(true);
    expect(shouldShowRainLeaf(true, "hat-none")).toBe(true);

    expect(shouldShowRainLeaf(true, "hat-straw")).toBe(false);
    expect(shouldShowRainLeaf(true, "hat-propeller")).toBe(false);
    expect(shouldShowRainLeaf(true, "hat-wizard")).toBe(false);
    expect(shouldShowRainLeaf(true, "hat-chef")).toBe(false);
    expect(shouldShowRainLeaf(true, "hat-crown")).toBe(false);
  });
});
