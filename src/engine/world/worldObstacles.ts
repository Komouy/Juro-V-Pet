import {
  clampToCircularWorld,
  JURO_BED_POS,
  JURO_BENCH_POS,
  JURO_TRAMPOLINE_POS,
  TRAIL_POINTS,
  WALKABLE_RADIUS,
  type SolidObstacle,
} from "./worldLandmarks";
import {
  distanceToCanalAxis,
  generateWorldProps,
  groundHeightAt,
  isWaterAt,
} from "./terrainHeight";

export const MAP_OBSTACLES: SolidObstacle[] = [
  // WARUNG Main Building + Plinth Corners + Front Service Counter
  { x: 18.8, z: -3.2, radius: 3.05, topY: 4.5 },
  { x: 17.56, z: -1.05, radius: 1.35, topY: 2.2 },
  { x: 17.89, z: -6.03, radius: 1.15, topY: 4.2 },
  { x: 21.71, z: -3.83, radius: 1.15, topY: 4.2 },
  { x: 19.71, z: -0.37, radius: 1.15, topY: 4.2 },
  { x: 15.89, z: -2.57, radius: 1.15, topY: 4.2 },

  // Gerbang Tambang Stone Arch & Mountain Rocks
  { x: -14.2, z: -14.2, radius: 2.6, topY: 4.5 },
  { x: -16.5, z: -12.5, radius: 1.8, topY: 3.5 },
  { x: -12.5, z: -16.5, radius: 1.8, topY: 3.5 },

  // Bukit Santai Sofa Bed Frame (Backrest, Lengthened Armrests & Bedside Table)
  { x: -16.55, z: 4.0, radius: 0.75, topY: 3.2, tag: "bed-frame" },
  { x: -15.45, z: 1.92, radius: 0.65, topY: 3.0, tag: "bed-frame" },
  { x: -15.45, z: 6.08, radius: 0.65, topY: 3.0, tag: "bed-frame" },
  { x: -15.35, z: 1.35, radius: 0.55, topY: 2.9, tag: "bed-frame" },

  // Pos Pandang Selatan Park Bench & Telescope
  { x: 6.0, z: 20.6, radius: 0.75, topY: 2.8, tag: "bench" },
  { x: 4.15, z: 19.6, radius: 0.38, topY: 2.5 },
  { x: 8.0, z: 19.7, radius: 0.3, topY: 2.5 },

  // Bouncy Mushroom Trampoline (North-West grassy clearing)
  { x: JURO_TRAMPOLINE_POS.x, z: JURO_TRAMPOLINE_POS.z, radius: 1.12, topY: 1.65, tag: "trampoline" },

  // Footbridge Side Railings (South-East & North-West rails keeping center walkway clear)
  { x: -3.59, z: -0.62, radius: 0.32, topY: 1.8 },
  { x: -2.1, z: -2.1, radius: 0.32, topY: 1.8 },
  { x: -0.62, z: -3.59, radius: 0.32, topY: 1.8 },
  { x: -5.78, z: -2.81, radius: 0.32, topY: 1.8 },
  { x: -4.3, z: -4.3, radius: 0.32, topY: 1.8 },
  { x: -2.81, z: -5.78, radius: 0.32, topY: 1.8 },

  // Lantern posts
  { x: -7.1, z: -1.7, radius: 0.22, topY: 2.2 },
  { x: 0.7, z: -4.7, radius: 0.22, topY: 2.2 },
  { x: 15.3, z: -0.5, radius: 0.22, topY: 2.2 },
  { x: 8.1, z: 18.8, radius: 0.22, topY: 2.2 },

  // Rustic Fences
  { x: -2.5, z: 16.2, radius: 1.25, topY: 1.8 },
  { x: 4.2, z: -16.8, radius: 1.25, topY: 1.8 },

  // Tree Stumps
  { x: 0.8, z: 22.8, radius: 0.55, topY: 2.4 },
  { x: -8.6, z: 14.5, radius: 0.6, topY: 1.2 },
  { x: 11.8, z: 15.2, radius: 0.55, topY: 1.2 },
  { x: -5.4, z: -17.5, radius: 0.55, topY: 1.2 },
  { x: 10.6, z: -21.2, radius: 0.58, topY: 1.2 },
];

const PROP_CELL_SIZE = 4.0;
let cachedPropGrid: Map<number, SolidObstacle[]> | null = null;

function propCellKey(cx: number, cz: number): number {
  return ((cx + 32) << 8) ^ (cz + 32);
}

function getPropSpatialGrid(): Map<number, SolidObstacle[]> {
  if (cachedPropGrid) return cachedPropGrid;
  const grid = new Map<number, SolidObstacle[]>();
  const { trees, rocks } = generateWorldProps();

  const insert = (obs: SolidObstacle) => {
    const cx = Math.floor(obs.x / PROP_CELL_SIZE);
    const cz = Math.floor(obs.z / PROP_CELL_SIZE);
    const key = propCellKey(cx, cz);
    let bucket = grid.get(key);
    if (!bucket) {
      bucket = [];
      grid.set(key, bucket);
    }
    bucket.push(obs);
  };

  for (const t of trees) {
    insert({
      x: t.x,
      z: t.z,
      radius: 0.48 * t.scale,
      topY: groundHeightAt(t.x, t.z) + 4.5 * t.scale,
    });
  }
  for (const r of rocks) {
    insert({
      x: r.x,
      z: r.z,
      radius: 0.68 * r.scale,
      topY: groundHeightAt(r.x, r.z) + 0.95 * r.scale,
    });
  }

  cachedPropGrid = grid;
  return grid;
}

function getNearbyPropObstacles(x: number, z: number): SolidObstacle[] {
  const grid = getPropSpatialGrid();
  const cx = Math.floor(x / PROP_CELL_SIZE);
  const cz = Math.floor(z / PROP_CELL_SIZE);
  const results: SolidObstacle[] = [];
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const bucket = grid.get(propCellKey(cx + dx, cz + dz));
      if (bucket) {
        for (let i = 0; i < bucket.length; i++) {
          results.push(bucket[i]);
        }
      }
    }
  }
  return results;
}

function shouldSkipLandmarkObstacle(
  obs: SolidObstacle,
  isSleepingOrHeading: boolean,
  isSittingOrHeadingToBench: boolean,
  isBouncingOrHeadingToTrampoline: boolean
): boolean {
  if (
    isSleepingOrHeading &&
    (obs.tag === "bed-frame" || Math.hypot(obs.x - JURO_BED_POS.x, obs.z - JURO_BED_POS.z) < 2.35)
  ) {
    return true;
  }
  if (
    isSittingOrHeadingToBench &&
    (obs.tag === "bench" || Math.hypot(obs.x - JURO_BENCH_POS.x, obs.z - JURO_BENCH_POS.z) < 0.75)
  ) {
    return true;
  }
  if (
    isBouncingOrHeadingToTrampoline &&
    (obs.tag === "trampoline" ||
      Math.hypot(obs.x - JURO_TRAMPOLINE_POS.x, obs.z - JURO_TRAMPOLINE_POS.z) < 0.75)
  ) {
    return true;
  }
  return false;
}

export function isInsideObstacle(
  x: number,
  z: number,
  pad = 0.35,
  isSleepingOrHeading = false,
  isSittingOrHeadingToBench = false,
  isBouncingOrHeadingToTrampoline = false
): boolean {
  for (let i = 0; i < MAP_OBSTACLES.length; i++) {
    const obs = MAP_OBSTACLES[i];
    if (
      shouldSkipLandmarkObstacle(
        obs,
        isSleepingOrHeading,
        isSittingOrHeadingToBench,
        isBouncingOrHeadingToTrampoline
      )
    ) {
      continue;
    }
    if (Math.hypot(x - obs.x, z - obs.z) < obs.radius + pad) {
      return true;
    }
  }

  const nearbyProps = getNearbyPropObstacles(x, z);
  for (let i = 0; i < nearbyProps.length; i++) {
    const prop = nearbyProps[i];
    if (Math.hypot(x - prop.x, z - prop.z) < prop.radius + pad) {
      return true;
    }
  }

  if (!isSleepingOrHeading && Math.hypot(x - JURO_BED_POS.x, z - JURO_BED_POS.z) < 0.55 + pad) {
    return true;
  }
  return false;
}

function pushOutOfCircle(
  rx: number,
  rz: number,
  cx: number,
  cz: number,
  minDist: number
): { x: number; z: number; pushed: boolean } {
  const dx = rx - cx;
  const dz = rz - cz;
  const dist = Math.hypot(dx, dz);
  if (dist >= minDist) return { x: rx, z: rz, pushed: false };
  const nx = dist > 0.0001 ? dx / dist : 1;
  const nz = dist > 0.0001 ? dz / dist : 0;
  return { x: cx + nx * minDist, z: cz + nz * minDist, pushed: true };
}

export function resolveHorizontalCollisions(
  x: number,
  z: number,
  bottomY: number,
  petRadius = 0.38,
  _allowClimbing = false,
  isSleepingOrHeadingToBed = false,
  isSittingOrHeadingToBench = false,
  isBouncingOrHeadingToTrampoline = false
): { x: number; z: number; hitObstacle: boolean } {
  const initialClamped = clampToCircularWorld(x, z);
  let rx = initialClamped.x;
  let rz = initialClamped.z;
  let hitObstacle = false;
  const nearbyProps = getNearbyPropObstacles(rx, rz);

  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < MAP_OBSTACLES.length; i++) {
      const obs = MAP_OBSTACLES[i];
      if (
        shouldSkipLandmarkObstacle(
          obs,
          isSleepingOrHeadingToBed,
          isSittingOrHeadingToBench,
          isBouncingOrHeadingToTrampoline
        )
      ) {
        continue;
      }
      if (bottomY >= obs.topY) continue;
      const res = pushOutOfCircle(rx, rz, obs.x, obs.z, obs.radius + petRadius);
      if (res.pushed) {
        rx = res.x;
        rz = res.z;
        hitObstacle = true;
      }
    }

    for (let i = 0; i < nearbyProps.length; i++) {
      const prop = nearbyProps[i];
      if (bottomY >= prop.topY) continue;
      const res = pushOutOfCircle(rx, rz, prop.x, prop.z, prop.radius + petRadius);
      if (res.pushed) {
        rx = res.x;
        rz = res.z;
        hitObstacle = true;
      }
    }

    if (!isSleepingOrHeadingToBed) {
      const res = pushOutOfCircle(rx, rz, JURO_BED_POS.x, JURO_BED_POS.z, 0.55 + petRadius);
      if (res.pushed) {
        rx = res.x;
        rz = res.z;
        hitObstacle = true;
      }
    }

    if (isWaterAt(rx, rz)) {
      const canal = distanceToCanalAxis(rx, rz);
      const pondDist = Math.hypot(rx - 9.5, rz - 9.5);
      if (pondDist < 5.45) {
        const res = pushOutOfCircle(rx, rz, 9.5, 9.5, 5.45 + petRadius);
        rx = res.x;
        rz = res.z;
        hitObstacle = true;
      } else if (canal.dist < 2.55) {
        const signedPerp = (rx - rz) * Math.SQRT1_2;
        const sign = signedPerp >= 0 ? 1 : -1;
        const targetPerp = sign * (2.65 + petRadius);
        const shift = targetPerp - signedPerp;
        rx += shift * Math.SQRT1_2;
        rz -= shift * Math.SQRT1_2;
        hitObstacle = true;
      }
    }
  }

  const finalClamped = clampToCircularWorld(rx, rz);
  return {
    x: finalClamped.x,
    z: finalClamped.z,
    hitObstacle,
  };
}

export function pickScenicWaypoint(
  bias?: "water" | "bed" | "food" | "bench" | "trampoline"
): { x: number; z: number } {
  for (let attempt = 0; attempt < 35; attempt++) {
    let candidate: { x: number; z: number };

    if (bias === "water") {
      const angle = Math.random() * Math.PI * 2;
      const r = 5.65 + Math.random() * 1.5;
      candidate = { x: 9.5 + Math.cos(angle) * r, z: 9.5 + Math.sin(angle) * r };
    } else if (bias === "bed") {
      candidate = { x: -11.5 + (Math.random() - 0.5) * 0.8, z: 4.0 + (Math.random() - 0.5) * 0.8 };
    } else if (bias === "bench") {
      candidate = { x: 6.0 + (Math.random() - 0.5) * 0.8, z: 18.5 + (Math.random() - 0.5) * 0.8 };
    } else if (bias === "trampoline") {
      candidate = {
        x: JURO_TRAMPOLINE_POS.x + 1.45 + (Math.random() - 0.5) * 0.4,
        z: JURO_TRAMPOLINE_POS.z + 0.45 + (Math.random() - 0.5) * 0.4,
      };
    } else if (bias === "food") {
      candidate = { x: 13.4 + (Math.random() - 0.5) * 1.5, z: -0.6 + (Math.random() - 0.5) * 1.5 };
    } else if (Math.random() < 0.4) {
      const idx = Math.floor(Math.random() * TRAIL_POINTS.length);
      const [tx, tz] = TRAIL_POINTS[idx];
      const offset = (Math.random() - 0.5) * 0.8;
      candidate = { x: tx + offset, z: tz + offset };
    } else {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * 21.0;
      candidate = {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
      };
    }

    if (
      Math.hypot(candidate.x, candidate.z) <= WALKABLE_RADIUS &&
      !isInsideObstacle(candidate.x, candidate.z, 0.35) &&
      !isWaterAt(candidate.x, candidate.z)
    ) {
      return candidate;
    }
  }

  return { x: -5.0, z: -1.0 };
}
