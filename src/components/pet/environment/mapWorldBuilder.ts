import type * as THREE from "three";
import type { PixelTextureSet } from "./pixelTextures";
import { buildTerrainAndWater } from "./terrainBuilder";
import { buildLandmarks } from "./landmarkBuilder";
import { buildPropsAndRain } from "./propBuilder";
import {
  createWorldBuildContext,
  type BuiltWorld,
  type WorldBuildOptions,
} from "./worldBuilderTypes";

export type { AnimatedKoi, RainSystem, BuiltWorld, WorldBuildOptions } from "./worldBuilderTypes";

/**
 * Orchestrates the 3D Storybook valley world assembly from terrain, landmarks,
 * instanced nature props, and weather particle systems.
 */
export function buildRetroWorld(
  scene: THREE.Group,
  textures: PixelTextureSet,
  options: boolean | WorldBuildOptions = false
): BuiltWorld {
  const opts: WorldBuildOptions =
    typeof options === "boolean" ? { isSoftwareGl: options } : options;
  const isSoftwareGl = Boolean(opts.isSoftwareGl);
  const shadowsEnabled = opts.shadowsEnabled ?? !isSoftwareGl;
  const maxPointLights = Math.max(0, opts.maxPointLights ?? (shadowsEnabled ? 5 : 1));
  const rainCount = Math.max(40, opts.rainCount ?? 260);
  const terrainSegments = opts.terrainSegments ?? 96;

  const ctx = createWorldBuildContext(scene, textures, shadowsEnabled, maxPointLights);
  const { terrainMesh, cobbleOverlay, waterMesh, kois } = buildTerrainAndWater(ctx, terrainSegments);
  const landmarkHitboxes = buildLandmarks(ctx);
  const rain = buildPropsAndRain(ctx, rainCount);

  return {
    rootGroup: ctx.rootGroup,
    terrainMesh,
    cobbleOverlay,
    waterMesh,
    kois,
    lanternLights: ctx.lanternLights,
    lanternBulbs: ctx.lanternBulbs,
    rain,
    landmarkHitboxes,
    dispose: ctx.disposeAll,
  };
}
