// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "../src/stores/uiStore";
import {
  generateFirefliesData,
  generatePixelRainData,
  generateRiverRipplesData,
} from "../src/components/pet/environment/landscapeData";
import { isWaterAt } from "../src/engine/world/mapTerrain";

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

  it("sets explicit weather using setWeather", () => {
    useUIStore.getState().setWeather("rain");
    expect(useUIStore.getState().weather).toBe("rain");

    useUIStore.getState().setWeather("clear");
    expect(useUIStore.getState().weather).toBe("clear");
  });

  it("generates organic glowing night fireflies across meadow coordinates", () => {
    const fireflies = generateFirefliesData();
    expect(fireflies.length).toBeGreaterThanOrEqual(18);

    fireflies.forEach((f) => {
      expect(f.base).toHaveLength(3);
      expect(f.radius).toBeGreaterThan(0.2);
      expect(f.speed).toBeGreaterThan(0.5);
      expect(f.pulseSpeed).toBeGreaterThan(1.0);
      expect(f.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      // Fireflies should float comfortably above ground
      expect(f.base[1]).toBeGreaterThan(-0.8);
    });
  });

  it("generates deterministic vertical pixel rain streaks across world bounds", () => {
    const rain = generatePixelRainData();
    expect(rain.length).toBe(150);

    rain.forEach((streak) => {
      expect(streak.x).toBeGreaterThanOrEqual(-8);
      expect(streak.x).toBeLessThanOrEqual(8);
      expect(streak.z).toBeGreaterThanOrEqual(-7);
      expect(streak.z).toBeLessThanOrEqual(7);
      expect(streak.speed).toBeGreaterThan(6.0);
      expect(streak.height).toBeGreaterThan(0.18);
    });
  });

  it("generates river and pond ripples located on actual water areas", () => {
    const ripples = generateRiverRipplesData();
    expect(ripples.length).toBeGreaterThanOrEqual(15);

    ripples.forEach((r) => {
      expect(r.maxRadius).toBeGreaterThan(0.25);
      expect(r.speed).toBeGreaterThan(0.5);
      // Every ripple must sit squarely in water (brook or lily pond)
      expect(isWaterAt(r.x, r.z)).toBe(true);
    });
  });
});
