import { describe, it, expect } from "vitest";
import {
  BASE_GROUND_Y,
  MAP_OBSTACLES,
  MAP_PLATFORMS,
  JURO_BED_POS,
  JURO_BENCH_POS,
  JURO_TRAMPOLINE_POS,
  getTerrainHeightAt,
  getBridgeElevation,
  isWaterAt,
  isInsideObstacle,
  resolveHorizontalCollisions,
  pickScenicWaypoint,
} from "../src/engine/world/mapTerrain";

describe("Terrain & Object Collision Hull System", () => {
  it("includes all essential props, landmarks, sofa bed, and fences in MAP_OBSTACLES", () => {
    expect(MAP_OBSTACLES.length).toBeGreaterThanOrEqual(35);

    // Bed backrest & armrests
    const backrest = MAP_OBSTACLES.find((o) => Math.hypot(o.x - -3.33, o.z - -0.78) < 0.1);
    expect(backrest).toBeDefined();

    const leftArmrest = MAP_OBSTACLES.find((o) => Math.hypot(o.x - -3.6, o.z - -0.38) < 0.1);
    expect(leftArmrest).toBeDefined();

    const rightArmrest = MAP_OBSTACLES.find((o) => Math.hypot(o.x - -2.87, o.z - -0.65) < 0.1);
    expect(rightArmrest).toBeDefined();

    // Bench on East Knoll
    const bench = MAP_OBSTACLES.find((o) => Math.hypot(o.x - 3.65, o.z - 1.15) < 0.1);
    expect(bench).toBeDefined();

    // Shop and Mine
    const shop = MAP_OBSTACLES.find((o) => Math.hypot(o.x - 4.55, o.z - -2.55) < 0.1);
    expect(shop).toBeDefined();

    const mine = MAP_OBSTACLES.find((o) => Math.hypot(o.x - -4.35, o.z - -4.05) < 0.1);
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

  it("verifies all tree stumps are removed from MAP_PLATFORMS leaving open meadow", () => {
    const stumps = MAP_PLATFORMS.filter((p) => p.kind === "stump" || p.id.startsWith("stump-"));
    expect(stumps).toHaveLength(0);
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

  it("allows Juro to freely wade and swim into the lily pond water without collision blockage", () => {
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
    // As requested: Juro can traverse water freely without invisible walls!
    expect(resolved.hitObstacle).toBe(false);
    expect(isWaterAt(resolved.x, resolved.z)).toBe(true);
  });

  it("allows Juro to wade and swim across the winding brook stream", () => {
    // Open brook water near x = 0.0
    const brookX = 0.0;
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
    // Juro can freely splash and cross water without invisible walls!
    expect(resolved.hitObstacle).toBe(false);
    expect(isWaterAt(resolved.x, resolved.z)).toBe(true);
  });

  it("verifies footbridge and nw river rock ledge are removed and stream flows freely", () => {
    // Footbridge elevation is null (removed as requested)
    expect(getBridgeElevation(-0.36, -2.32)).toBeNull();

    // Verify nw-ledge large river boulder is removed from MAP_PLATFORMS
    const nwLedge = MAP_PLATFORMS.find((p) => p.id === "nw-ledge");
    expect(nwLedge).toBeUndefined();

    // Former rock position in river is now clear water
    expect(isWaterAt(-1.75, -2.85)).toBe(true);

    const streamCrossing = resolveHorizontalCollisions(
      -0.36,
      -2.32,
      BASE_GROUND_Y,
      0.38,
      false,
      false
    );
    expect(streamCrossing.hitObstacle).toBe(false);
    expect(isWaterAt(-0.36, -2.32)).toBe(true);
  });

  it("prevents clipping horizontally into platform cliff walls from below", () => {
    // East knoll center is (3.65, 1.15), radius 1.25, height 0.42
    // Bottom ground is at BASE_GROUND_Y
    const wallCol = resolveHorizontalCollisions(
      3.65,
      1.15,
      BASE_GROUND_Y,
      0.38,
      false,
      false
    );
    expect(wallCol.hitObstacle).toBe(true);
    // Pushed outside platform radius towards bounds
    expect(Math.hypot(wallCol.x - 3.65, wallCol.z - 1.15)).toBeGreaterThan(1.0);
  });

  it("treats mushroom trampoline as solid obstacle when wandering, but allows Juro onto it when bouncing", () => {
    // When wandering normally, walking directly into trampoline is blocked
    const wanderCol = resolveHorizontalCollisions(
      JURO_TRAMPOLINE_POS.x,
      JURO_TRAMPOLINE_POS.z,
      BASE_GROUND_Y,
      0.38,
      false,
      false,
      false,
      false
    );
    expect(wanderCol.hitObstacle).toBe(true);

    // When bouncing on trampoline: can occupy the trampoline position
    const bounceCol = resolveHorizontalCollisions(
      JURO_TRAMPOLINE_POS.x,
      JURO_TRAMPOLINE_POS.z,
      JURO_TRAMPOLINE_POS.surfaceY,
      0.38,
      false,
      false,
      false,
      true
    );
    expect(bounceCol.x).toBeCloseTo(JURO_TRAMPOLINE_POS.x, 2);
    expect(bounceCol.z).toBeCloseTo(JURO_TRAMPOLINE_POS.z, 2);
  });

  it("picks scenic waypoints that never spawn inside obstacles", () => {
    for (let i = 0; i < 25; i++) {
      const pt = pickScenicWaypoint();
      expect(isInsideObstacle(pt.x, pt.z, 0.1)).toBe(false);
    }
  });
});
