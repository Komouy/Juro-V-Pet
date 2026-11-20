export interface ElevatedPlatform {
  id: string;
  kind: "terrace" | "rock-ledge" | "stump";
  x: number;
  z: number;
  radius: number;
  height: number; // elevation above BASE_GROUND_Y
  label: string;
}

export interface SolidObstacle {
  x: number;
  z: number;
  radius: number;
  topY: number; // world Y above which Juro could jump/fly over it
  tag?: "bed-frame" | "bench" | "trampoline";
}

export const BASE_GROUND_Y = -0.92;

// Solid world props inside & bordering Juro's walkable valley so Juro NEVER clips through them
export const MAP_OBSTACLES: SolidObstacle[] = [
  // Trees on knolls & bordering meadow
  { x: -3.9, z: -1.35, radius: 0.38, topY: 1.4 },
  { x: 4.25, z: 1.40, radius: 0.26, topY: 1.4 },
  { x: -4.4, z: -4.5, radius: 0.45, topY: 1.4 },
  { x: 3.2, z: -4.2, radius: 0.45, topY: 1.4 },
  { x: -2.8, z: -4.8, radius: 0.42, topY: 1.4 },
  { x: 1.55, z: -4.7, radius: 0.42, topY: 1.4 },
  { x: -4.8, z: 2.2, radius: 0.42, topY: 1.4 },
  { x: 4.9, z: 2.35, radius: 0.42, topY: 1.4 },
  // Pine trees bordering meadow
  { x: -3.6, z: -5.3, radius: 0.45, topY: 1.4 },
  { x: -1.4, z: -5.4, radius: 0.45, topY: 1.4 },
  { x: 0.55, z: -5.4, radius: 0.45, topY: 1.4 },
  { x: 2.4, z: -5.0, radius: 0.45, topY: 1.4 },
  { x: 4.8, z: -4.9, radius: 0.45, topY: 1.4 },

  // Miniature Juro Shop Building & Porch Counter
  { x: 4.55, z: -2.55, radius: 1.12, topY: 1.5 },
  { x: 4.35, z: -2.08, radius: 0.68, topY: 1.1 },

  // Crystal Mine Cave Portal & Side Rock Mounds at West River Headwaters
  { x: -4.65, z: -4.35, radius: 1.15, topY: 1.6 },
  { x: -5.35, z: -4.15, radius: 0.85, topY: 1.3 },
  { x: -4.15, z: -4.85, radius: 0.85, topY: 1.3 },

  // Wooden Park Bench atop East Knoll (3 overlapping circles along bench length)
  { x: 3.46, z: 0.77, radius: 0.24, topY: BASE_GROUND_Y + 0.82, tag: "bench" },
  { x: 3.65, z: 0.95, radius: 0.24, topY: BASE_GROUND_Y + 0.82, tag: "bench" },
  { x: 3.84, z: 1.13, radius: 0.24, topY: BASE_GROUND_Y + 0.82, tag: "bench" },

  // Bouncy Mushroom Trampoline in South-West Meadow
  { x: -1.75, z: 1.25, radius: 0.50, topY: BASE_GROUND_Y + 0.44, tag: "trampoline" },

  // West Knoll Sofa Bed Frame (Backrest, Armrests & Nightstand)
  { x: -3.88, z: -0.52, radius: 0.24, topY: BASE_GROUND_Y + 0.85, tag: "bed-frame" }, // Nightstand & Lamp
  { x: -3.37, z: -0.82, radius: 0.28, topY: BASE_GROUND_Y + 0.78, tag: "bed-frame" }, // Backrest
  { x: -3.60, z: -0.38, radius: 0.22, topY: BASE_GROUND_Y + 0.72, tag: "bed-frame" }, // Left Armrest
  { x: -2.87, z: -0.65, radius: 0.22, topY: BASE_GROUND_Y + 0.72, tag: "bed-frame" }, // Right Armrest

  // Two Glowing Meadow Lantern Posts
  { x: -1.45, z: -1.65, radius: 0.18, topY: 0.5 },
  { x: 2.25, z: 0.22, radius: 0.18, topY: 0.5 },

  // Bushes inside & bordering valley
  { x: -5.1, z: -1.7, radius: 0.36, topY: BASE_GROUND_Y + 0.4 },
  { x: -4.8, z: 0.85, radius: 0.34, topY: BASE_GROUND_Y + 0.4 },
  { x: -4.2, z: -0.95, radius: 0.32, topY: BASE_GROUND_Y + 0.35 },
  { x: -2.1, z: -3.95, radius: 0.34, topY: BASE_GROUND_Y + 0.4 },
  { x: 0.85, z: -4.1, radius: 0.36, topY: BASE_GROUND_Y + 0.4 },
  { x: 2.5, z: -3.8, radius: 0.34, topY: BASE_GROUND_Y + 0.4 },
  { x: 4.2, z: -3.3, radius: 0.36, topY: BASE_GROUND_Y + 0.4 },
  { x: 5.2, z: -1.4, radius: 0.34, topY: BASE_GROUND_Y + 0.4 },
  { x: 5.0, z: 0.45, radius: 0.32, topY: BASE_GROUND_Y + 0.4 },
  { x: 4.1, z: 1.85, radius: 0.30, topY: BASE_GROUND_Y + 0.35 },
  { x: -3.9, z: 2.35, radius: 0.34, topY: BASE_GROUND_Y + 0.4 },
  { x: 3.8, z: 2.55, radius: 0.32, topY: BASE_GROUND_Y + 0.4 },
  { x: -1.48, z: -4.05, radius: 0.32, topY: BASE_GROUND_Y + 0.4 },
  { x: 5.5, z: -2.65, radius: 0.34, topY: BASE_GROUND_Y + 0.4 },
  { x: -5.6, z: -3.4, radius: 0.36, topY: BASE_GROUND_Y + 0.4 },

  // Fences
  { x: -5.2, z: 1.5, radius: 0.26, topY: BASE_GROUND_Y + 0.45 },
  { x: -5.05, z: 0.8, radius: 0.26, topY: BASE_GROUND_Y + 0.45 },
  { x: -4.95, z: 0.1, radius: 0.26, topY: BASE_GROUND_Y + 0.45 },
  { x: -4.85, z: -0.6, radius: 0.26, topY: BASE_GROUND_Y + 0.45 },
  { x: -4.65, z: -1.3, radius: 0.26, topY: BASE_GROUND_Y + 0.45 },
  { x: 3.4, z: -2.95, radius: 0.26, topY: BASE_GROUND_Y + 0.45 },
  { x: 4.1, z: -3.05, radius: 0.26, topY: BASE_GROUND_Y + 0.45 },
  { x: 4.8, z: -3.1, radius: 0.26, topY: BASE_GROUND_Y + 0.45 },
  { x: 5.5, z: -2.95, radius: 0.26, topY: BASE_GROUND_Y + 0.45 },

  // Rocks, scenic boulders & river pebbles in walkable zone
  { x: 1.38, z: -0.82, radius: 0.20, topY: BASE_GROUND_Y + 0.22 },
  { x: 1.56, z: -0.62, radius: 0.16, topY: BASE_GROUND_Y + 0.18 },
  { x: 2.95, z: -0.45, radius: 0.22, topY: BASE_GROUND_Y + 0.24 },
  { x: 3.22, z: -0.64, radius: 0.18, topY: BASE_GROUND_Y + 0.20 },
  { x: 3.55, z: -1.30, radius: 0.20, topY: BASE_GROUND_Y + 0.22 },
  { x: -0.95, z: -2.00, radius: 0.19, topY: BASE_GROUND_Y + 0.22 },
  { x: 0.45, z: -1.58, radius: 0.17, topY: BASE_GROUND_Y + 0.18 },
  { x: -4.65, z: -1.75, radius: 0.38, topY: BASE_GROUND_Y + 0.35 },
  { x: -4.32, z: -1.52, radius: 0.26, topY: BASE_GROUND_Y + 0.28 },
  { x: -2.65, z: 1.75, radius: 0.26, topY: BASE_GROUND_Y + 0.26 },
  { x: 2.25, z: 1.95, radius: 0.24, topY: BASE_GROUND_Y + 0.25 },
  { x: 1.15, z: -3.25, radius: 0.34, topY: BASE_GROUND_Y + 0.34 },
  { x: -3.45, z: 2.25, radius: 0.30, topY: BASE_GROUND_Y + 0.30 },
  { x: 5.15, z: 1.55, radius: 0.36, topY: BASE_GROUND_Y + 0.35 },
  { x: -1.80, z: 0.35, radius: 0.22, topY: BASE_GROUND_Y + 0.22 },
  { x: 2.05, z: 0.85, radius: 0.22, topY: BASE_GROUND_Y + 0.22 },
  { x: -2.10, z: -1.60, radius: 0.24, topY: BASE_GROUND_Y + 0.24 },
];

// Wide explorable valley bounds for Juro
export const MAP_BOUNDS = {
  minX: -4.1,
  maxX: 4.1,
  minZ: -3.2,
  maxZ: 2.35,
} as const;

// Cozy sleep bed location atop the West Knoll
export const JURO_BED_POS = {
  x: -3.24,
  z: -0.52,
  platformId: "west-knoll",
} as const;

// Cozy wooden park bench atop East Knoll where Juro can sit and look over the meadow
export const JURO_BENCH_POS = {
  x: 3.65,
  z: 0.95,
  seatY: BASE_GROUND_Y + 0.42 + 0.175,
  rotY: -0.75,
  platformId: "east-knoll",
} as const;

// Interactive bouncy mushroom trampoline in South-West Meadow
export const JURO_TRAMPOLINE_POS = {
  x: -1.75,
  z: 1.25,
  surfaceY: BASE_GROUND_Y + 0.42,
  label: "Trampolin Jamur",
} as const;

// Elevated platforms, terraces, rock ledges & tree stumps Juro can climb/jump onto!
export const MAP_PLATFORMS: ElevatedPlatform[] = [
  {
    id: "west-knoll",
    kind: "terrace",
    x: -3.25,
    z: -0.55,
    radius: 1.55,
    height: 0.46,
    label: "Ranjang Tidur Juro",
  },
  {
    id: "east-knoll",
    kind: "terrace",
    x: 3.45,
    z: 0.75,
    radius: 1.45,
    height: 0.42,
    label: "Bukit Santai Timur",
  },
  {
    id: "mushroom-trampoline",
    kind: "stump",
    x: -1.75,
    z: 1.25,
    radius: 0.50,
    height: 0.42,
    label: "Trampolin Jamur",
  },
  {
    id: "stump-se",
    kind: "stump",
    x: 1.55,
    z: 1.35,
    radius: 0.42,
    height: 0.28,
    label: "Tunggul Kayu Timur",
  },
  {
    id: "stump-north",
    kind: "stump",
    x: 0.95,
    z: -1.35,
    radius: 0.36,
    height: 0.24,
    label: "Tunggul Tepi Sungai",
  },
];

// Check if (x, z) is on any bridge (kept for backward-compatibility, footbridge removed as Juro walks through water)
export function getBridgeElevation(_x: number, _z: number): number | null {
  return null;
}

const BROOK_SEGMENTS = [
  [-4.15, -3.95, 0.42],
  [-2.2, -3.0, 0.46],
  [-0.45, -2.35, 0.48],
  [0.95, -1.95, 0.50],
  [2.25, -1.25, 0.60],
];

// Check if (x, z) is inside the lily pond or winding brook (Juro can swim/glide over water!)
export function isWaterAt(x: number, z: number): boolean {
  // Stumps and platforms are elevated dry land above water
  for (let i = 0; i < MAP_PLATFORMS.length; i++) {
    const p = MAP_PLATFORMS[i];
    if (Math.hypot(x - p.x, z - p.z) <= p.radius * 0.98) {
      return false;
    }
  }

  // Pond oval centered at (2.45, -1.05)
  const pdx = (x - 2.45) / 1.15;
  const pdz = (z - -1.05) / 0.8;
  if (pdx * pdx + pdz * pdz < 1.0) return true;

  // Brook stream from mine headwaters (-4.15, -3.95) down to pond (2.25, -1.25)
  for (let i = 0; i < BROOK_SEGMENTS.length - 1; i++) {
    const p1 = BROOK_SEGMENTS[i];
    const p2 = BROOK_SEGMENTS[i + 1];
    const dx = p2[0] - p1[0];
    const dz = p2[1] - p1[1];
    const segLenSq = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - p1[0]) * dx + (z - p1[1]) * dz) / segLenSq));
    const projX = p1[0] + t * dx;
    const projZ = p1[1] + t * dz;
    const halfWidth = p1[2] + t * (p2[2] - p1[2]);
    if (Math.hypot(x - projX, z - projZ) < halfWidth) {
      return true;
    }
  }

  return false;
}

// Check if (x, z) is in or near water within a safety buffer margin (used by vegetation generators)
export function isNearWater(x: number, z: number, buffer = 0.6): boolean {
  const pdx = (x - 2.45) / (1.15 + buffer);
  const pdz = (z - -1.05) / (0.8 + buffer);
  if (pdx * pdx + pdz * pdz < 1.0) return true;

  for (let i = 0; i < BROOK_SEGMENTS.length - 1; i++) {
    const p1 = BROOK_SEGMENTS[i];
    const p2 = BROOK_SEGMENTS[i + 1];
    const dx = p2[0] - p1[0];
    const dz = p2[1] - p1[1];
    const segLenSq = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - p1[0]) * dx + (z - p1[1]) * dz) / segLenSq));
    const projX = p1[0] + t * dx;
    const projZ = p1[1] + t * dz;
    const halfWidth = p1[2] + t * (p2[2] - p1[2]) + buffer;
    if (Math.hypot(x - projX, z - projZ) < halfWidth) {
      return true;
    }
  }

  return false;
}

// Compute exact walkable terrain surface Y at any (x, z) across the entire map
export function getTerrainHeightAt(x: number, z: number): number {
  let maxY = BASE_GROUND_Y;

  // Check wooden bridge arch
  const bridgeElev = getBridgeElevation(x, z);
  if (bridgeElev !== null) {
    maxY = Math.max(maxY, BASE_GROUND_Y + bridgeElev);
  }

  // Check elevated terraces, rock ledges & tree stumps
  for (let i = 0; i < MAP_PLATFORMS.length; i++) {
    const p = MAP_PLATFORMS[i];
    const dist = Math.hypot(x - p.x, z - p.z);
    if (dist <= p.radius * 0.96) {
      maxY = Math.max(maxY, BASE_GROUND_Y + p.height);
    } else if (dist <= p.radius * 1.12 && p.kind === "terrace") {
      // Smooth bevel ramp right at terrace rim
      const slopeT = 1 - (dist - p.radius * 0.96) / (p.radius * 0.16);
      maxY = Math.max(maxY, BASE_GROUND_Y + p.height * slopeT);
    }
  }

  return maxY;
}

// Check if (x, z) collides with any solid world obstacle
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
    if (isSleepingOrHeading && (obs.tag === "bed-frame" || Math.hypot(obs.x - JURO_BED_POS.x, obs.z - JURO_BED_POS.z) < 0.95)) {
      continue;
    }
    if (isSittingOrHeadingToBench && (obs.tag === "bench" || Math.hypot(obs.x - JURO_BENCH_POS.x, obs.z - JURO_BENCH_POS.z) < 0.65)) {
      continue;
    }
    if (isBouncingOrHeadingToTrampoline && (obs.tag === "trampoline" || Math.hypot(obs.x - JURO_TRAMPOLINE_POS.x, obs.z - JURO_TRAMPOLINE_POS.z) < 0.65)) {
      continue;
    }
    if (Math.hypot(x - obs.x, z - obs.z) < obs.radius + pad) {
      return true;
    }
  }
  // Check bed mattress
  if (!isSleepingOrHeading && Math.hypot(x - JURO_BED_POS.x, z - JURO_BED_POS.z) < 0.44 + pad) {
    return true;
  }
  return false;
}

// Resolve horizontal collisions against all solid props, water pond & steep un-jumped platform cliffs
export function resolveHorizontalCollisions(
  x: number,
  z: number,
  bottomY: number,
  petRadius = 0.38,
  allowClimbing = false,
  isSleepingOrHeadingToBed = false,
  isSittingOrHeadingToBench = false,
  isBouncingOrHeadingToTrampoline = false
): { x: number; z: number; hitObstacle: boolean } {
  let rx = Math.max(MAP_BOUNDS.minX, Math.min(MAP_BOUNDS.maxX, x));
  let rz = Math.max(MAP_BOUNDS.minZ, Math.min(MAP_BOUNDS.maxZ, z));
  let hitObstacle = false;

  // 2 solver passes ensure clean resolution when wedged between two nearby objects
  for (let pass = 0; pass < 2; pass++) {
    // 1. Push out of solid props (trees, bench, sofa bed frame, lanterns, boulders, shop, mine, bushes, fences)
    for (let i = 0; i < MAP_OBSTACLES.length; i++) {
      const obs = MAP_OBSTACLES[i];
      if (
        isSleepingOrHeadingToBed &&
        (obs.tag === "bed-frame" || Math.hypot(obs.x - JURO_BED_POS.x, obs.z - JURO_BED_POS.z) < 0.95)
      ) {
        continue;
      }
      if (
        isSittingOrHeadingToBench &&
        (obs.tag === "bench" || Math.hypot(obs.x - JURO_BENCH_POS.x, obs.z - JURO_BENCH_POS.z) < 0.65)
      ) {
        continue;
      }
      if (
        isBouncingOrHeadingToTrampoline &&
        (obs.tag === "trampoline" || Math.hypot(obs.x - JURO_TRAMPOLINE_POS.x, obs.z - JURO_TRAMPOLINE_POS.z) < 0.65)
      ) {
        continue;
      }
      if (bottomY >= obs.topY) continue;
      const dx = rx - obs.x;
      const dz = rz - obs.z;
      const dist = Math.hypot(dx, dz);
      const minDist = obs.radius + petRadius;
      if (dist < minDist) {
        const nx = dist > 0.0001 ? dx / dist : 1;
        const nz = dist > 0.0001 ? dz / dist : 0;
        rx = obs.x + nx * minDist;
        rz = obs.z + nz * minDist;
        hitObstacle = true;
      }
    }

    // 1b. Sofa Bed Mattress (impenetrable barrier while awake so Juro walks around it on the knoll grass)
    if (!isSleepingOrHeadingToBed) {
      const dx = rx - JURO_BED_POS.x;
      const dz = rz - JURO_BED_POS.z;
      const dist = Math.hypot(dx, dz);
      const minDist = 0.44 + petRadius;
      if (dist >= 0.22 && dist < minDist) {
        const nx = dx / dist;
        const nz = dz / dist;
        rx = JURO_BED_POS.x + nx * minDist;
        rz = JURO_BED_POS.z + nz * minDist;
        hitObstacle = true;
      }
    }

    // 2. Prevent clipping sideways into elevated terrace/stump/rock walls
    for (let i = 0; i < MAP_PLATFORMS.length; i++) {
      const p = MAP_PLATFORMS[i];
      if (isSleepingOrHeadingToBed && p.id === "west-knoll") continue;
      if (isSittingOrHeadingToBench && p.id === "east-knoll") continue;
      if (isBouncingOrHeadingToTrampoline && p.id === "mushroom-trampoline") continue;
      const platformTopY = BASE_GROUND_Y + p.height;
      // If Juro's bottom is below the platform top rim, treat the wall as solid even during early jump arc
      const threshold = allowClimbing ? platformTopY - 0.06 : platformTopY - 0.14;
      if (bottomY < threshold) {
        const dx = rx - p.x;
        const dz = rz - p.z;
        const dist = Math.hypot(dx, dz);
        const minDist = p.radius * 1.02 + petRadius * 0.72;
        if (dist < minDist) {
          const nx = dist > 0.0001 ? dx / dist : 1;
          const nz = dist > 0.0001 ? dz / dist : 0;
          rx = p.x + nx * minDist;
          rz = p.z + nz * minDist;
          hitObstacle = true;
        }
      }
    }
  }

  return {
    x: Math.max(MAP_BOUNDS.minX, Math.min(MAP_BOUNDS.maxX, rx)),
    z: Math.max(MAP_BOUNDS.minZ, Math.min(MAP_BOUNDS.maxZ, rz)),
    hitObstacle,
  };
}

// Pick a scenic, walkable waypoint anywhere on the wide map (meadow, hills, water, stumps!)
export function pickScenicWaypoint(bias?: "water" | "bed" | "food" | "bench" | "trampoline"): { x: number; z: number } {
  // If specific need bias is given, strongly prioritize that area of the living meadow
  if (bias === "water") {
    // 80% chance to target the clear water stream/brook for a refreshing splash or wash
    if (Math.random() < 0.8) {
      const brookX = -2.5 + Math.random() * 3.5;
      const t = (brookX + 4.15) / 6.4;
      const brookZ = -3.95 + t * 2.7 + Math.sin(t * Math.PI) * 0.35;
      if (!isInsideObstacle(brookX, brookZ, 0.3)) {
        return { x: brookX, z: brookZ };
      }
    }
  } else if (bias === "bed") {
    // Grassy knoll right beside the cozy sleeping leaf bed
    const bedX = -2.35 + (Math.random() - 0.5) * 0.5;
    const bedZ = 1.15 + (Math.random() - 0.5) * 0.5;
    if (!isInsideObstacle(bedX, bedZ, 0.3)) {
      return { x: bedX, z: bedZ };
    }
  } else if (bias === "bench") {
    // Grassy area in front of the eastern park bench
    const benchX = 3.15 + (Math.random() - 0.5) * 0.6;
    const benchZ = 1.25 + (Math.random() - 0.5) * 0.5;
    if (!isInsideObstacle(benchX, benchZ, 0.3)) {
      return { x: benchX, z: benchZ };
    }
  } else if (bias === "trampoline") {
    // Grassy area in front of the bouncy mushroom trampoline
    const tx = -1.35 + (Math.random() - 0.5) * 0.4;
    const tz = 1.25 + (Math.random() - 0.5) * 0.4;
    if (!isInsideObstacle(tx, tz, 0.3)) {
      return { x: tx, z: tz };
    }
  } else if (bias === "food") {
    // Sunny foreground meadow where berries & picnics happen
    for (let attempt = 0; attempt < 10; attempt++) {
      const fx = -1.4 + Math.random() * 2.8;
      const fz = 0.5 + Math.random() * 1.0;
      if (!isInsideObstacle(fx, fz, 0.35)) {
        return { x: fx, z: fz };
      }
    }
  }

  // 35% chance to specifically visit an elevated platform or stump
  const roll = Math.random();
  if (roll < 0.35) {
    const eligiblePlatforms = MAP_PLATFORMS.filter((p) => p.id !== "mushroom-trampoline");
    const platform = eligiblePlatforms[Math.floor(Math.random() * eligiblePlatforms.length)];
    for (let attempt = 0; attempt < 12; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * platform.radius * 0.55;
      const px = platform.x + Math.cos(angle) * r;
      const pz = platform.z + Math.sin(angle) * r;
      if (!isInsideObstacle(px, pz, 0.42)) {
        return { x: px, z: pz };
      }
    }
    // If west-knoll, return a clear spot on the grassy rim rather than inside the bed
    if (platform.id === "west-knoll") {
      return { x: -2.6, z: -0.15 };
    }
    if (!isInsideObstacle(platform.x, platform.z, 0.2)) {
      return { x: platform.x, z: platform.z };
    }
  }

  // 15% chance to visit the cool winding brook stream or lily pond for a splash!
  if (roll < 0.5) {
    const brookX = -2.5 + Math.random() * 3.5;
    const t = (brookX + 5.5) / 7.7;
    const brookZ = -4.9 + t * 3.7 + Math.sin(t * Math.PI) * 0.35;
    if (!isInsideObstacle(brookX, brookZ, 0.3)) {
      return { x: brookX, z: brookZ };
    }
  }

  // Otherwise pick any clear spot across the wide valley
  for (let attempt = 0; attempt < 30; attempt++) {
    const x = MAP_BOUNDS.minX + Math.random() * (MAP_BOUNDS.maxX - MAP_BOUNDS.minX);
    const z = MAP_BOUNDS.minZ + Math.random() * (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ);
    if (!isInsideObstacle(x, z, 0.45)) {
      return { x, z };
    }
  }

  return { x: 0, z: 0.2 };
}
