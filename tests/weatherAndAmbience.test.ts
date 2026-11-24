// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "../src/stores/uiStore";
import {
  isNightWeather,
  isRainingWeather,
  normalizeWeather,
} from "../src/types/ui";
import { isWaterAt } from "../src/engine/world/mapTerrain";
import { shouldShowRainLeaf } from "../src/features/character/juroHelpers";

describe("Dynamic Weather & Ambience System", () => {
  beforeEach(() => {
    useUIStore.setState({
      weather: "clear",
    });
  });

  it("initializes with clear weather by default", () => {
    expect(useUIStore.getState().weather).toBe("clear");
  });

  it("toggles weather between clear and rain seamlessly", () => {
    useUIStore.getState().toggleWeather();
    expect(useUIStore.getState().weather).toBe("rain");

    useUIStore.getState().toggleWeather();
    expect(useUIStore.getState().weather).toBe("clear");
  });

  it("sets explicit weather modes and normalizes aliases properly", () => {
    useUIStore.getState().setWeather("rain");
    expect(useUIStore.getState().weather).toBe("rain");
    expect(isRainingWeather(useUIStore.getState().weather)).toBe(true);
    expect(normalizeWeather("rain")).toBe("hujan");

    useUIStore.getState().setWeather("hujan");
    expect(isRainingWeather(useUIStore.getState().weather)).toBe(true);
    expect(normalizeWeather("hujan")).toBe("hujan");

    useUIStore.getState().setWeather("clear");
    expect(isRainingWeather(useUIStore.getState().weather)).toBe(false);
    expect(normalizeWeather("clear")).toBe("cerah");

    useUIStore.getState().setWeather("malam");
    expect(isNightWeather(useUIStore.getState().weather)).toBe(true);
    expect(normalizeWeather("malam")).toBe("malam");
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
