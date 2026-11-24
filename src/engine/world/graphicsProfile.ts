import type * as THREE from "three";

export type GraphicsTier = "low" | "balanced" | "high";
export type GraphicsQualitySetting = "auto" | GraphicsTier;

export interface GraphicsEnvironment {
  nativeDpr: number;
  deviceMemoryGb?: number | null;
  hardwareConcurrency?: number | null;
  viewportWidth: number;
  isTouchDevice: boolean;
  isSoftwareRenderer?: boolean;
}

export interface GraphicsProfile {
  setting: GraphicsQualitySetting;
  tier: GraphicsTier;
  dpr: number;
  terrainSegments: number;
  juroSphereSegs: [number, number];
  shadowsEnabled: boolean;
  shadowMapSize: number;
  maxPointLights: number;
  rainCount: number;
  anisotropy: number;
  usePhysicalJuroBody: boolean;
}

const SOFTWARE_RENDERER_PATTERN = /swiftshader|llvmpipe|software|microsoft basic|subzero/i;

export function detectSoftwareWebGL(
  gl: THREE.WebGLRenderer | WebGLRenderingContext | WebGL2RenderingContext | null | undefined
): boolean {
  if (!gl) return false;
  try {
    const rawGl =
      typeof (gl as THREE.WebGLRenderer).getContext === "function"
        ? (gl as THREE.WebGLRenderer).getContext()
        : (gl as WebGLRenderingContext | WebGL2RenderingContext);
    if (!rawGl || typeof rawGl.getParameter !== "function") return false;

    const debugExt = rawGl.getExtension("WEBGL_debug_renderer_info");
    if (debugExt) {
      const unmaskedRenderer = String(
        rawGl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL) ?? ""
      );
      if (SOFTWARE_RENDERER_PATTERN.test(unmaskedRenderer)) {
        return true;
      }
    }

    const rendererStr = String(rawGl.getParameter(rawGl.RENDERER) ?? "");
    return SOFTWARE_RENDERER_PATTERN.test(rendererStr);
  } catch {
    return false;
  }
}

export function readGraphicsEnvironment(overrides?: {
  isSoftwareRenderer?: boolean;
  viewportWidth?: number;
}): GraphicsEnvironment {
  if (typeof window === "undefined") {
    return {
      nativeDpr: 1,
      deviceMemoryGb: null,
      hardwareConcurrency: null,
      viewportWidth: overrides?.viewportWidth ?? 1024,
      isTouchDevice: false,
      isSoftwareRenderer: overrides?.isSoftwareRenderer ?? false,
    };
  }

  const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { deviceMemory?: number }) : null;
  return {
    nativeDpr: Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1,
    deviceMemoryGb: typeof nav?.deviceMemory === "number" ? nav.deviceMemory : null,
    hardwareConcurrency: typeof nav?.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null,
    viewportWidth: overrides?.viewportWidth ?? window.innerWidth,
    isTouchDevice: (nav?.maxTouchPoints ?? 0) > 0,
    isSoftwareRenderer: overrides?.isSoftwareRenderer ?? false,
  };
}

export function resolveGraphicsTier(
  setting: GraphicsQualitySetting,
  env: GraphicsEnvironment
): GraphicsTier {
  if (setting !== "auto") {
    return setting;
  }

  if (env.isSoftwareRenderer) {
    return "low";
  }

  if (typeof env.deviceMemoryGb === "number" && env.deviceMemoryGb <= 3) {
    return "low";
  }

  if (typeof env.hardwareConcurrency === "number" && env.hardwareConcurrency <= 4) {
    return "low";
  }

  const isMobile = env.isTouchDevice || env.viewportWidth < 768;
  if (isMobile) {
    return "balanced";
  }

  if (typeof env.deviceMemoryGb === "number" && env.deviceMemoryGb <= 4) {
    return "balanced";
  }

  return "high";
}

function roundDpr(value: number): number {
  return Math.round(value * 100) / 100;
}

export function resolveGraphicsProfile(
  setting: GraphicsQualitySetting,
  env: GraphicsEnvironment
): GraphicsProfile {
  const tier = resolveGraphicsTier(setting, env);
  const safeNative =
    Number.isFinite(env.nativeDpr) && env.nativeDpr > 0 ? env.nativeDpr : 1;

  let dpr: number;
  if (env.isSoftwareRenderer) {
    dpr = roundDpr(Math.min(safeNative, 1.25));
  } else if (safeNative >= 1.5) {
    if (tier === "low") {
      dpr = roundDpr(Math.min(safeNative, 1.5));
    } else if (tier === "balanced") {
      dpr = roundDpr(Math.min(safeNative, 1.85));
    } else {
      dpr = roundDpr(Math.min(safeNative, 2.25));
    }
  } else {
    dpr = roundDpr(safeNative);
  }

  const shadowsEnabled = !env.isSoftwareRenderer && tier !== "low";

  if (tier === "low") {
    return {
      setting,
      tier,
      dpr,
      terrainSegments: 72,
      juroSphereSegs: [32, 24],
      shadowsEnabled,
      shadowMapSize: 0,
      maxPointLights: 1,
      rainCount: 120,
      anisotropy: 2,
      usePhysicalJuroBody: false,
    };
  }

  if (tier === "balanced") {
    return {
      setting,
      tier,
      dpr,
      terrainSegments: 96,
      juroSphereSegs: [44, 32],
      shadowsEnabled,
      shadowMapSize: shadowsEnabled ? 512 : 0,
      maxPointLights: 3,
      rainCount: 200,
      anisotropy: 4,
      usePhysicalJuroBody: !env.isSoftwareRenderer,
    };
  }

  return {
    setting,
    tier,
    dpr,
    terrainSegments: 112,
    juroSphereSegs: [56, 40],
    shadowsEnabled,
    shadowMapSize: shadowsEnabled ? 1024 : 0,
    maxPointLights: 5,
    rainCount: 260,
    anisotropy: 4,
    usePhysicalJuroBody: !env.isSoftwareRenderer,
  };
}
