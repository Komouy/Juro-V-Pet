import { describe, it, expect } from "vitest";
import {
  BASE_GROUND_Y,
  MAP_OBSTACLES,
  MAP_PLATFORMS,
  JURO_BED_POS,
  JURO_BENCH_POS,
  getTerrainHeightAt,
  getBridgeElevation,
  isWaterAt,
  isInsideObstacle,
  resolveHorizontalCollisions,
  pickScenicWaypoint,
} from "../src/engine/world/mapTerrain";

describe("Terrain & Object Collision Hull System", () => {
  it("includes all essential props, landmarks, sofa bed, and fences in MAP_OBSTACLES", () => {
    expect(MAP_OBSTACLES.length).toBeGreaterThanOrEqual(40);

    // Bed backrest & armrests
    const backrest = MAP_OBSTACLES.find((o) => Math.hypot(o.x - -3.33, o.z - -0.78) < 0.1);
    expect(backrest).toBeDefined();

    const leftArmrest = MAP_OBSTACLES.find((o) => Math.hypot(o.x - -3.6, o.z - -0.38) < 0.1);
    expect(leftArmrest).toBeDefined();

    const rightArmrest = MAP_OBSTACLES.find((o) => Math.hypot(o.x - -2.87, o.z - -0.65) < 0.1);
    expect(rightArmrest).toBeDefined();

    // Bench on East Knoll
    const bench = MAP_OBSTACLES.find((o) => Math.hypot(o.x - 3.65, o.z - 0.95) < 0.1);
    expect(bench).toBeDefined();

    // Shop and Mine
    const shop = MAP_OBSTACLES.find((o) => Math.hypot(o.x - 4.55, o.z - -2.55) < 0.1);
    expect(shop).toBeDefined();

    const mine = MAP_OBSTACLES.find((o) => Math.hypot(o.x - -0.36, o.z - -4.55) < 0.1);
    expect(mine).toBeDefined();
  });

  it("calculates terrain height on sofa bed knoll matching terrace elevation", () => {
    const bedGroundY = getTerrainHeightAt(JURO_BED_POS.x, JURO_BED_POS.z);
    expect(bedGroundY).toBeCloseTo(BASE_GROUND_Y + 0.46, 2);
  });

  it("treats sofa bed mattress as solid obstacle when awake, but allows access when sleeping", () => {
    // When awake: walking into bed center is blocked
    const awakeCol = resolveHorizontalCollisions(
      JURO_BED_POS.x,
      JURO_BED_POS.z,
      BASE_GROUND_Y + 0.46,
      0.38,
      false,
      false
    );
    expect(awakeCol.hitObstacle).toBe(true);
    expect(Math.hypot(awakeCol.x - JURO_BED_POS.x, awakeCol.z - JURO_BED_POS.z)).toBeGreaterThan(0.4);

    // When sleeping: can rest on the mattress
    const sleepCol = resolveHorizontalCollisions(
      JURO_BED_POS.x,
      JURO_BED_POS.z,
      BASE_GROUND_Y + 0.585,
      0.38,
      false,
      true
    );
    expect(sleepCol.x).toBeCloseTo(JURO_BED_POS.x, 2);
    expect(sleepCol.z).toBeCloseTo(JURO_BED_POS.z, 2);
  });

  it("verifies left tree stump is removed from MAP_PLATFORMS leaving open meadow", () => {
    const leftStump = MAP_PLATFORMS.find((p) => p.id === "stump-sw");
    expect(leftStump).toBeUndefined();
  });

  it("treats park bench as solid obstacle while wandering, but allows Juro to sit on it", () => {
    // When wandering normally, walking directly into bench is blocked
    const wanderCol = resolveHorizontalCollisions(
      JURO_BENCH_POS.x,
      JURO_BENCH_POS.z,
      BASE_GROUND_Y + 0.42,
      0.38,
      false,
      false,
      false
    );
    expect(wanderCol.hitObstacle).toBe(true);

    // When sitting on bench: can occupy the bench seat position
    const sitCol = resolveHorizontalCollisions(
      JURO_BENCH_POS.x,
      JURO_BENCH_POS.z,
      JURO_BENCH_POS.seatY,
      0.38,
      false,
      false,
      true
    );
    expect(sitCol.x).toBeCloseTo(JURO_BENCH_POS.x, 2);
    expect(sitCol.z).toBeCloseTo(JURO_BENCH_POS.z, 2);
  });

  it("blocks Juro from walking into the lily pond water", () => {
    const pondCenter = { x: 2.45, z: -1.05 };
    expect(isWaterAt(pondCenter.x, pondCenter.z)).toBe(true);

    const resolved = resolveHorizontalCollisions(
      pondCenter.x,
      pondCenter.z,
      BASE_GROUND_Y,
      0.38,
      false,
      false
    );
    expect(resolved.hitObstacle).toBe(true);
    expect(isWaterAt(resolved.x, resolved.z)).toBe(false);
  });

  it("blocks Juro from walking into the winding brook stream off-bridge", () => {
    // Open brook water near x = -3.5
    const brookX = -3.5;
    const t = (brookX + 5.5) / 7.7;
    const streamZ = -4.9 + t * 3.7 + Math.sin(t * Math.PI) * 0.35;

    expect(isWaterAt(brookX, streamZ)).toBe(true);

    const resolved = resolveHorizontalCollisions(
      brookX,
      streamZ,
      BASE_GROUND_Y,
      0.38,
      false,
      false
    );
    expect(resolved.hitObstacle).toBe(true);
    expect(isWaterAt(resolved.x, resolved.z)).toBe(false);
  });

  it("allows Juro to smoothly walk onto and across the footbridge from both south and north banks", () => {
    // 1. South approach (stepping stones at z = -1.56 and z = -1.75)
    const southApproach = resolveHorizontalCollisions(
      -0.36,
      -1.56,
      BASE_GROUND_Y,
      0.38,
      false,
      false
    );
    // Must NOT be pushed back by stream water collision!
    expect(southApproach.hitObstacle).toBe(false);
    expect(southApproach.z).toBeCloseTo(-1.56, 2);
    expect(isWaterAt(-0.36, -1.56)).toBe(false);

    // 2. Mid-bridge wooden deck planks
    const deckMid = resolveHorizontalCollisions(
      -0.36,
      -2.32,
      BASE_GROUND_Y + 0.11,
      0.38,
      false,
      false
    );
    expect(deckMid.hitObstacle).toBe(false);
    expect(getBridgeElevation(-0.36, -2.32)).toBe(0.11);

    // 3. North approach (mine path at z = -3.10)
    const northApproach = resolveHorizontalCollisions(
      -0.36,
      -3.10,
      BASE_GROUND_Y,
      0.38,
      false,
      false
    );
    expect(northApproach.hitObstacle).toBe(false);
    expect(northApproach.z).toBeCloseTo(-3.10, 2);
    expect(isWaterAt(-0.36, -3.10)).toBe(false);
  });

  it("clamps Juro safely between bridge railings when crossing footbridge", () => {
    const bridgeZ = -2.32;
    expect(getBridgeElevation(-0.36, bridgeZ)).not.toBeNull();

    // Trying to walk past the west bridge railing (e.g. x = -0.65)
    const westCol = resolveHorizontalCollisions(
      -0.65,
      bridgeZ,
      BASE_GROUND_Y + 0.11,
      0.38,
      false,
      false
    );
    expect(westCol.hitObstacle).toBe(true);
    expect(westCol.x).toBeGreaterThanOrEqual(-0.56);

    // Trying to walk past the east bridge railing (e.g. x = -0.10)
    const eastCol = resolveHorizontalCollisions(
      -0.1,
      bridgeZ,
      BASE_GROUND_Y + 0.11,
      0.38,
      false,
      false
    );
    expect(eastCol.hitObstacle).toBe(true);
    expect(eastCol.x).toBeLessThanOrEqual(-0.16);
  });

  it("prevents clipping horizontally into platform cliff walls from below", () => {
    // East knoll center is (3.45, 0.75), radius 1.45, height 0.42
    // Bottom ground is at BASE_GROUND_Y
    const wallCol = resolveHorizontalCollisions(
      3.45,
      0.75,
      BASE_GROUND_Y,
      0.38,
      false,
      false
    );
    expect(wallCol.hitObstacle).toBe(true);
    // Pushed outside platform radius
    expect(Math.hypot(wallCol.x - 3.45, wallCol.z - 0.75)).toBeGreaterThan(1.4);
  });

  it("picks scenic waypoints that never spawn inside obstacles or water", () => {
    for (let i = 0; i < 25; i++) {
      const pt = pickScenicWaypoint();
      expect(isWaterAt(pt.x, pt.z)).toBe(false);
      expect(isInsideObstacle(pt.x, pt.z, 0.1)).toBe(false);
    }
  });
});
