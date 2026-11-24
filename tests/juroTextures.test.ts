// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import {
  createSleepZTexture,
  createSoftShadowTexture,
  createDizzyEyeTexture,
  createDizzyMouthTexture,
  createDizzyStarTexture,
} from "../src/features/character/juroTextures";

describe("Juro Textures & Procedural Canvas Assets", () => {
  beforeEach(() => {
    // Setup mock canvas 2D context for jsdom
    const mockCtx = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      createRadialGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
      shadowColor: "",
      shadowBlur: 0,
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      lineCap: "",
      lineJoin: "",
    };

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => mockCtx as unknown as CanvasRenderingContext2D
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates crisp pixel-style Zzz texture with sRGB colorSpace and NearestFilter", () => {
    const tex = createSleepZTexture();
    expect(tex).toBeInstanceOf(THREE.CanvasTexture);
    expect(tex?.image.width).toBe(128);
    expect(tex?.image.height).toBe(128);
    expect(tex?.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(tex?.minFilter).toBe(THREE.NearestFilter);
    expect(tex?.magFilter).toBe(THREE.NearestFilter);
  });

  it("creates soft radial contact shadow texture with feathered gradient and sRGB colorSpace", () => {
    const tex = createSoftShadowTexture();
    expect(tex).toBeInstanceOf(THREE.CanvasTexture);
    expect(tex?.image.width).toBe(128);
    expect(tex?.image.height).toBe(128);
    expect(tex?.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it("creates cartoon spiral eye texture with sRGB colorSpace and LinearFilter", () => {
    const tex = createDizzyEyeTexture();
    expect(tex).toBeInstanceOf(THREE.CanvasTexture);
    expect(tex?.image.width).toBe(128);
    expect(tex?.image.height).toBe(128);
    expect(tex?.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(tex?.minFilter).toBe(THREE.LinearFilter);
    expect(tex?.magFilter).toBe(THREE.LinearFilter);
  });

  it("creates wavy mouth texture with sRGB colorSpace and LinearFilter", () => {
    const tex = createDizzyMouthTexture();
    expect(tex).toBeInstanceOf(THREE.CanvasTexture);
    expect(tex?.image.width).toBe(128);
    expect(tex?.image.height).toBe(64);
    expect(tex?.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(tex?.minFilter).toBe(THREE.LinearFilter);
    expect(tex?.magFilter).toBe(THREE.LinearFilter);
  });

  it("creates crisp golden pixel star texture with sRGB colorSpace and NearestFilter", () => {
    const tex = createDizzyStarTexture();
    expect(tex).toBeInstanceOf(THREE.CanvasTexture);
    expect(tex?.image.width).toBe(64);
    expect(tex?.image.height).toBe(64);
    expect(tex?.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(tex?.minFilter).toBe(THREE.NearestFilter);
    expect(tex?.magFilter).toBe(THREE.NearestFilter);
  });

  it("returns null safely when 2D canvas context is unavailable", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(createSleepZTexture()).toBeNull();
    expect(createSoftShadowTexture()).toBeNull();
    expect(createDizzyEyeTexture()).toBeNull();
    expect(createDizzyMouthTexture()).toBeNull();
    expect(createDizzyStarTexture()).toBeNull();
  });
});
