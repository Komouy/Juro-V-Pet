// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveGraphicsProfile,
  resolveGraphicsTier,
} from "../src/engine/world/graphicsProfile";
import { useUIStore } from "../src/stores/uiStore";

describe("Adaptive Graphics Profile & Mobile Sharpness", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useUIStore.setState({ graphicsQuality: "auto" });
  });

  it("keeps HiDPI mobile DPR sharp (>= 1.5) even on low-end phones to prevent blurry 144p rendering", () => {
    const profile = resolveGraphicsProfile("auto", {
      nativeDpr: 3,
      deviceMemoryGb: 2,
      hardwareConcurrency: 4,
      viewportWidth: 390,
      isTouchDevice: true,
      isSoftwareRenderer: false,
    });

    expect(profile.tier).toBe("low");
    expect(profile.dpr).toBe(1.5);
    expect(profile.shadowsEnabled).toBe(false);
    expect(profile.usePhysicalJuroBody).toBe(false);
    expect(profile.terrainSegments).toBe(72);
    expect(profile.maxPointLights).toBe(1);
    expect(profile.rainCount).toBe(120);
  });

  it("selects balanced crisp profile on typical mid/high mobile devices", () => {
    const profile = resolveGraphicsProfile("auto", {
      nativeDpr: 2.75,
      deviceMemoryGb: 6,
      hardwareConcurrency: 8,
      viewportWidth: 412,
      isTouchDevice: true,
      isSoftwareRenderer: false,
    });

    expect(profile.tier).toBe("balanced");
    expect(profile.dpr).toBe(1.85);
    expect(profile.shadowsEnabled).toBe(true);
    expect(profile.shadowMapSize).toBe(512);
    expect(profile.juroSphereSegs).toEqual([44, 32]);
    expect(profile.anisotropy).toBe(4);
  });

  it("falls back safely on software WebGL renderers without crashing or oversampling", () => {
    const profile = resolveGraphicsProfile("high", {
      nativeDpr: 2,
      deviceMemoryGb: 8,
      hardwareConcurrency: 8,
      viewportWidth: 1280,
      isTouchDevice: false,
      isSoftwareRenderer: true,
    });

    expect(profile.tier).toBe("high");
    expect(profile.dpr).toBe(1.25);
    expect(profile.shadowsEnabled).toBe(false);
    expect(profile.usePhysicalJuroBody).toBe(false);
  });

  it("respects desktop high-tier budgets while keeping native 1x monitors at 1", () => {
    const tier = resolveGraphicsTier("auto", {
      nativeDpr: 1,
      deviceMemoryGb: 8,
      hardwareConcurrency: 8,
      viewportWidth: 1440,
      isTouchDevice: false,
    });
    const profile = resolveGraphicsProfile("auto", {
      nativeDpr: 1,
      deviceMemoryGb: 8,
      hardwareConcurrency: 8,
      viewportWidth: 1440,
      isTouchDevice: false,
    });

    expect(tier).toBe("high");
    expect(profile.dpr).toBe(1);
    expect(profile.shadowMapSize).toBe(1024);
    expect(profile.terrainSegments).toBe(112);
    expect(profile.maxPointLights).toBe(5);
  });

  it("persists graphicsQuality updates in uiStore", () => {
    useUIStore.getState().setGraphicsQuality("balanced");
    expect(useUIStore.getState().graphicsQuality).toBe("balanced");
    expect(window.localStorage.getItem("juro_graphics_quality")).toBe("balanced");
  });
});
