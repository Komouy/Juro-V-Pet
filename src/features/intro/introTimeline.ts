import * as THREE from "three";
import {
  RAIN_TIME_PALETTES,
  WEATHER_PALETTES,
  type WeatherPalette,
} from "../../components/pet/viewport/viewportConstants";

export const INTRO_DURATION_SEC = 11.5;
export const INTRO_REDUCED_DURATION_SEC = 4.2;

export const INTRO_POND_ORIGIN = { x: 9.5, y: -0.28, z: 9.5 } as const;
export const INTRO_CENTER_TARGET = { x: 0, z: 0.2 } as const;

export interface CelestialArcState {
  dayPhase: number;
  sunPos: [number, number, number];
  moonPos: [number, number, number];
  sunOpacity: number;
  moonOpacity: number;
  starOpacity: number;
  lightDirPos: [number, number, number];
}

export interface TimeLapseAtmosphere {
  celestial: CelestialArcState;
  sky: string;
  fogDensity: number;
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  fillIntensity: number;
  isNight: boolean;
  isRaining: boolean;
  rainIntensity: number;
  cloudSpeedMultiplier: number;
}

export interface IntroCameraPose {
  position: [number, number, number];
  lookAt: [number, number, number];
}

export interface SlimeFormationState {
  pondRippleProgress: number;
  coalesceProgress: number;
  morphProgress: number;
  faceReveal: number;
  welcomeHopY: number;
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

const _cA = new THREE.Color();
const _cB = new THREE.Color();
const _cOut = new THREE.Color();

function lerpHex(hexA: string, hexB: string, t: number): string {
  _cA.set(hexA);
  _cB.set(hexB);
  _cOut.lerpColors(_cA, _cB, clamp01(t));
  return `#${_cOut.getHexString()}`;
}

function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

function blendPalettes(a: WeatherPalette, b: WeatherPalette, t: number): WeatherPalette {
  const k = clamp01(t);
  return {
    sky: lerpHex(a.sky, b.sky, k),
    fogDensity: lerpNumber(a.fogDensity, b.fogDensity, k),
    sunColor: lerpHex(a.sunColor, b.sunColor, k),
    sunIntensity: lerpNumber(a.sunIntensity, b.sunIntensity, k),
    hemiSky: lerpHex(a.hemiSky, b.hemiSky, k),
    hemiGround: lerpHex(a.hemiGround, b.hemiGround, k),
    hemiIntensity: lerpNumber(a.hemiIntensity, b.hemiIntensity, k),
    fillIntensity: lerpNumber(a.fillIntensity, b.fillIntensity, k),
    isNight: k < 0.5 ? a.isNight : b.isNight,
  };
}

/**
 * Evaluates sun and moon coordinates moving East (+X) -> Zenith (+Y) -> West (-X)
 * across the horizon sky dome for a continuous dayPhase in [0, 1).
 */
export function evaluateCelestialArc(dayPhase: number): CelestialArcState {
  const phase = ((dayPhase % 1) + 1) % 1;
  const sunTheta = phase * Math.PI * 2;
  const moonTheta = sunTheta + Math.PI;

  const arcRadiusX = 28;
  const arcHeightY = 16.5;
  const arcBaseY = 1.6;
  const skyZ = -25;

  const sunX = Math.cos(sunTheta) * arcRadiusX;
  const sunY = Math.sin(sunTheta) * arcHeightY + arcBaseY;

  const moonX = Math.cos(moonTheta) * arcRadiusX;
  const moonY = Math.sin(moonTheta) * arcHeightY + arcBaseY;

  const sunOpacity = smoothstep(-1.5, 4.0, sunY);
  const moonOpacity = smoothstep(-1.5, 4.0, moonY);
  const starOpacity = 1 - smoothstep(-2.0, 4.2, sunY);

  // Keep directional light above horizon plane for crisp shadow & shading coverage
  const activeSun = sunY >= moonY;
  const rawX = activeSun ? sunX : moonX;
  const rawY = Math.max(8, activeSun ? sunY * 1.45 : moonY * 1.35);

  return {
    dayPhase: phase,
    sunPos: [sunX, sunY, skyZ],
    moonPos: [moonX, moonY, skyZ - 1.5],
    sunOpacity,
    moonOpacity,
    starOpacity,
    lightDirPos: [rawX * 0.72, rawY, 13],
  };
}

/**
 * Computes smoothly interpolated sky, fog, directional lighting, and fast weather cycles
 * across the 11.5-second intro time-lapse montage.
 */
export function evaluateTimeLapseAtmosphere(progress: number): TimeLapseAtmosphere {
  const p = clamp01(progress);
  // 2.16 cycles starting at sunrise (0.04) -> passes 2 full day/night cycles, settling at bright morning-day (0.20)
  const dayPhase = (0.04 + p * 2.16) % 1;
  const celestial = evaluateCelestialArc(dayPhase);

  // Map dayPhase to seamless palette loop:
  // 0.00 (sunrise/pagi) -> 0.25 (noon/cerah) -> 0.50 (sunset/senja) -> 0.75 (midnight/malam) -> 1.00 (sunrise/pagi)
  let basePalette: WeatherPalette;
  if (dayPhase < 0.25) {
    basePalette = blendPalettes(WEATHER_PALETTES.pagi, WEATHER_PALETTES.cerah, dayPhase / 0.25);
  } else if (dayPhase < 0.5) {
    basePalette = blendPalettes(
      WEATHER_PALETTES.cerah,
      WEATHER_PALETTES.senja,
      (dayPhase - 0.25) / 0.25
    );
  } else if (dayPhase < 0.75) {
    basePalette = blendPalettes(
      WEATHER_PALETTES.senja,
      WEATHER_PALETTES.malam,
      (dayPhase - 0.5) / 0.25
    );
  } else {
    basePalette = blendPalettes(
      WEATHER_PALETTES.malam,
      WEATHER_PALETTES.pagi,
      (dayPhase - 0.75) / 0.25
    );
  }

  // Brief rain shower burst during the mid time-lapse cycle before clearing up as Juro forms
  const rainUp = smoothstep(0.42, 0.48, p);
  const rainDown = 1 - smoothstep(0.61, 0.68, p);
  const rainIntensity = rainUp * rainDown;

  let rainPalette: WeatherPalette;
  if (dayPhase < 0.25) {
    rainPalette = blendPalettes(RAIN_TIME_PALETTES.pagi, RAIN_TIME_PALETTES.cerah, dayPhase / 0.25);
  } else if (dayPhase < 0.5) {
    rainPalette = blendPalettes(
      RAIN_TIME_PALETTES.cerah,
      RAIN_TIME_PALETTES.senja,
      (dayPhase - 0.25) / 0.25
    );
  } else if (dayPhase < 0.75) {
    rainPalette = blendPalettes(
      RAIN_TIME_PALETTES.senja,
      RAIN_TIME_PALETTES.malam,
      (dayPhase - 0.5) / 0.25
    );
  } else {
    rainPalette = blendPalettes(
      RAIN_TIME_PALETTES.malam,
      RAIN_TIME_PALETTES.pagi,
      (dayPhase - 0.75) / 0.25
    );
  }

  const finalPalette =
    rainIntensity > 0.001 ? blendPalettes(basePalette, rainPalette, rainIntensity) : basePalette;

  const isNight = celestial.sunPos[1] < 0.5;
  const cloudSpeedMultiplier = 1 + 7.5 * (1 - smoothstep(0.84, 1.0, p));

  return {
    celestial,
    sky: finalPalette.sky,
    fogDensity: finalPalette.fogDensity,
    sunColor: finalPalette.sunColor,
    sunIntensity: finalPalette.sunIntensity,
    hemiSky: finalPalette.hemiSky,
    hemiGround: finalPalette.hemiGround,
    hemiIntensity: finalPalette.hemiIntensity,
    fillIntensity: finalPalette.fillIntensity,
    isNight,
    isRaining: rainIntensity > 0.15,
    rainIntensity,
    cloudSpeedMultiplier,
  };
}

/**
 * Matches ResponsiveCamera's exact default gameplay camera coordinates so the intro
 * transitions cleanly into gameplay without a camera pop.
 */
export function getGameplayCameraLanding(isPortrait = false): IntroCameraPose {
  const camOffsetX = isPortrait ? 10.5 : 9.5;
  const camOffsetY = isPortrait ? 12.8 : 11.2;
  const camOffsetZ = isPortrait ? 10.5 : 9.5;
  const focusX = INTRO_CENTER_TARGET.x;
  const focusY = 1.02;
  const focusZ = INTRO_CENTER_TARGET.z;

  return {
    position: [focusX + camOffsetX, focusY + camOffsetY, focusZ + camOffsetZ],
    lookAt: [focusX, focusY, focusZ],
  };
}

function catmullRom1D(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function sampleSpline3(
  points: ReadonlyArray<readonly [number, number, number]>,
  tNorm: number
): [number, number, number] {
  const p = clamp01(tNorm);
  if (p <= 0) return [points[0][0], points[0][1], points[0][2]];
  if (p >= 1) {
    const last = points[points.length - 1];
    return [last[0], last[1], last[2]];
  }

  const segCount = points.length - 1;
  const scaled = p * segCount;
  const idx = Math.min(segCount - 1, Math.floor(scaled));
  const localT = scaled - idx;

  const p0 = points[Math.max(0, idx - 1)];
  const p1 = points[idx];
  const p2 = points[Math.min(segCount, idx + 1)];
  const p3 = points[Math.min(segCount, idx + 2)];

  return [
    catmullRom1D(p0[0], p1[0], p2[0], p3[0], localT),
    catmullRom1D(p0[1], p1[1], p2[1], p3[1], localT),
    catmullRom1D(p0[2], p1[2], p2[2], p3[2], localT),
  ];
}

/**
 * Evaluates the cinematic camera trajectory from pond origin -> sky time-lapse sweep -> gameplay landing.
 */
export function evaluateIntroCamera(progress: number, isPortrait = false): IntroCameraPose {
  const p = clamp01(progress);
  const landing = getGameplayCameraLanding(isPortrait);

  const posWaypoints: ReadonlyArray<readonly [number, number, number]> = [
    [15.4, 4.2, 15.8], // 1. Close-up framing the pond
    [13.6, 4.6, 14.2], // 2. Pull back as droplets leap from pond
    [7.2, 3.4, 8.8], // 3. Low hero angle showing sun & moon racing overhead
    [5.8, 4.8, 7.2], // 4. Frame coalescing jelly core in meadow
    landing.position, // 5. Exact gameplay landing pose
  ];

  const lookWaypoints: ReadonlyArray<readonly [number, number, number]> = [
    [INTRO_POND_ORIGIN.x, 0.15, INTRO_POND_ORIGIN.z],
    [4.8, 1.5, 4.5],
    [0.0, 2.4, -3.5], // Tilt toward horizon sky arc for celestial time-lapse
    [INTRO_CENTER_TARGET.x, 0.9, INTRO_CENTER_TARGET.z],
    landing.lookAt,
  ];

  // Smooth S-curve easing along timeline so start and landing settle gracefully
  const eased = smoothstep(0, 1, p * 0.92 + Math.pow(p, 1.25) * 0.08);
  return {
    position: sampleSpline3(posWaypoints, eased),
    lookAt: sampleSpline3(lookWaypoints, eased),
  };
}

/**
 * Evaluates slime emergence, droplet travel, body morphing, face reveal, and welcome hop.
 */
export function evaluateSlimeFormation(progress: number): SlimeFormationState {
  const p = clamp01(progress);
  const pondRippleProgress = smoothstep(0.0, 0.36, p);
  const coalesceProgress = smoothstep(0.06, 0.80, p);
  const morphProgress = smoothstep(0.58, 0.90, p);
  const faceReveal = smoothstep(0.80, 0.93, p);

  let welcomeHopY = 0;
  if (p > 0.88 && p < 0.99) {
    const hopPhase = (p - 0.88) / 0.11;
    welcomeHopY = Math.sin(hopPhase * Math.PI) * 0.42;
  }

  return {
    pondRippleProgress,
    coalesceProgress,
    morphProgress,
    faceReveal,
    welcomeHopY,
  };
}
