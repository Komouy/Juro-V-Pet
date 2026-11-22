import { describe, it, expect } from "vitest";
import {
  BASE_GROUND_Y,
  MAP_OBSTACLES,
  JURO_BED_POS,
  JURO_BENCH_POS,
  JURO_TRAMPOLINE_POS,
  getTerrainHeightAt,
  getBridgeElevation,
  isWaterAt,
  isInsideObstacle,
  resolveHorizontalCollisions,
  pickScenicWaypoint,
  generateWorldProps,
  isBridgeDeck,
} from "../src/engine/world/mapTerrain";
import { findPath, getGlobalNavGrid } from "../src/engine/world/pathfinding";

describe("Terrain & Object Collision Hull System", () => {
  it("includes all essential props, landmarks, sofa bed, and fences in MAP_OBSTACLES", () => {
    expect(MAP_OBSTACLES.length).toBeGreaterThanOrEqual(18);

    // Bed backrest & armrests at Bukit Santai
    const backrest = MAP_OBSTACLES.find((o) => Math.hypot(o.x - -16.55, o.z - 4.0) < 0.1);
    expect(backrest).toBeDefined();

    const leftArmrest = MAP_OBSTACLES.find((o) => Math.hypot(o.x - -15.45, o.z - 1.92) < 0.1);
    expect(leftArmrest).toBeDefined();

    const rightArmrest = MAP_OBSTACLES.find((o) => Math.hypot(o.x - -15.45, o.z - 6.08) < 0.1);
    expect(rightArmrest).toBeDefined();

    // Bench on Pos Pandang Selatan
    const bench = MAP_OBSTACLES.find((o) => Math.hypot(o.x - 6.0, o.z - 20.6) < 0.1);
    expect(bench).toBeDefined();

    // Shop at Kafe Senja
    const shop = MAP_OBSTACLES.find((o) => Math.hypot(o.x - 18.8, o.z - -3.2) < 0.1);
    expect(shop).toBeDefined();

    // Mine at Gerbang Terowongan
    const mine = MAP_OBSTACLES.find((o) => Math.hypot(o.x - -14.2, o.z - -14.2) < 0.1);
    expect(mine).toBeDefined();
  });

  it("calculates terrain height on Bukit Santai terrace matching hill elevation", () => {
    const bedGroundY = getTerrainHeightAt(JURO_BED_POS.x, JURO_BED_POS.z);
    expect(bedGroundY).toBeGreaterThanOrEqual(2.0);
  });

  it("treats sofa bed mattress as solid obstacle when awake, but allows access when sleeping", () => {
    // When awake: walking into bed center is blocked
    const awakeCol = resolveHorizontalCollisions(
      JURO_BED_POS.x,
      JURO_BED_POS.z,
      2.1,
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
      2.3,
      0.38,
      false,
      true
    );
    expect(sleepCol.x).toBeCloseTo(JURO_BED_POS.x, 2);
    expect(sleepCol.z).toBeCloseTo(JURO_BED_POS.z, 2);
  });

  it("treats park bench as solid obstacle while wandering, but allows Juro to sit on it", () => {
    // When wandering normally, walking directly into bench is blocked
    const wanderCol = resolveHorizontalCollisions(
      JURO_BENCH_POS.x,
      JURO_BENCH_POS.z,
      1.75,
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

  it("blocks Juro from walking or swimming into the water and keeps him on dry land", () => {
    const pondCenter = { x: 9.5, z: 9.5 };
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

  it("allows Juro to traverse the wooden footbridge and calculates bridge deck arch", () => {
    const bridgeCenter = { x: -3.2, z: -3.2 };
    const bridgeElev = getBridgeElevation(bridgeCenter.x, bridgeCenter.z);
    expect(bridgeElev).toBeGreaterThan(0.5);
    // On bridge deck, isWaterAt returns false
    expect(isWaterAt(bridgeCenter.x, bridgeCenter.z)).toBe(false);
  });

  it("routes Juro across the Wooden Bridge to reach the opposite side of the canal without entering water", () => {
    const navGrid = getGlobalNavGrid();
    const westBank = { x: -15.0, z: 4.0 }; // Bukit Santai lounge
    const eastBank = { x: 13.4, z: -0.6 }; // Kafe Senja plaza

    const path = findPath(navGrid, westBank, eastBank);
    expect(path.length).toBeGreaterThan(0);

    // Path must cross the wooden bridge
    const hasBridgeWaypoint = path.some((pt) => isBridgeDeck(pt.x, pt.z));
    expect(hasBridgeWaypoint).toBe(true);

    // No waypoint in the path can be in water!
    const anyInWater = path.some((pt) => isWaterAt(pt.x, pt.z));
    expect(anyInWater).toBe(false);
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

  it("ensures procedurally placed trees never stack on each other", () => {
    const { trees } = generateWorldProps();
    expect(trees.length).toBeGreaterThan(40);

    for (let i = 0; i < trees.length; i++) {
      for (let j = i + 1; j < trees.length; j++) {
        const d = Math.hypot(trees[i].x - trees[j].x, trees[i].z - trees[j].z);
        expect(d).toBeGreaterThanOrEqual(2.4);
      }
    }
  });
});
