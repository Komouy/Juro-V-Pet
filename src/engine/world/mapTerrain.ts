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
  tag?: "bed-frame" | "bench";
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

  // Crystal Mine Cave Portal & Side Rock Mounds
  { x: -0.36, z: -4.55, radius: 1.05, topY: 1.6 },
  { x: -1.14, z: -4.4, radius: 0.75, topY: 1.2 },
  { x: 0.42, z: -4.4, radius: 0.75, topY: 1.2 },

  // Wooden Park Bench atop East Knoll (3 overlapping circles along bench length)
  { x: 3.46, z: 0.77, radius: 0.24, topY: BASE_GROUND_Y + 0.82, tag: "bench" },
  { x: 3.65, z: 0.95, radius: 0.24, topY: BASE_GROUND_Y + 0.82, tag: "bench" },
  { x: 3.84, z: 1.13, radius: 0.24, topY: BASE_GROUND_Y + 0.82, tag: "bench" },

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
    id: "nw-ledge",
    kind: "rock-ledge",
    x: -1.75,
    z: -2.85,
    radius: 0.85,
    height: 0.34,
    label: "Batu Datar Utara",
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

// Check if (x, z) is on the straight wooden footbridge over the brook
export function getBridgeElevation(x: number, z: number): number | null {
  // Straight bridge centered at (-0.36, -2.32), aligned cleanly with world Z (rotation = 0)
  const localX = x - -0.36;
  const localZ = z - -2.32;

  // Deck width is 0.82m (halfWidth = 0.41m, allow 0.44m for clearance)
  if (Math.abs(localX) <= 0.44) {
    const absZ = Math.abs(localZ);
    // Main level wooden bridge deck spans |localZ| <= 0.62
    if (absZ <= 0.62) {
      return 0.11;
    }
    // Smooth wooden ramp transition connecting bridge planks to meadow banks (|localZ| up to 0.86m)
    if (absZ <= 0.86) {
      const rampT = 1 - (absZ - 0.62) / 0.24;
      return 0.11 * Math.max(0, rampT);
    }
  }
  return null;
}

// Check if (x, z) is inside the lily pond or winding brook (excluding bridge & dry platforms)
export function isWaterAt(x: number, z: number): boolean {
  if (getBridgeElevation(x, z) !== null) return false;

  // Bridge corridor clearance (both approach ramps and bridge deck)
  const localBridgeX = Math.abs(x - -0.36);
  const localBridgeZ = Math.abs(z - -2.32);
  if (localBridgeX <= 0.46 && localBridgeZ <= 0.90) return false;

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

  // Approximate brook centerline curve
  if (x >= -5.5 && x <= 2.2) {
    const t = (x + 5.5) / 7.7;
    const streamZ = -4.9 + t * 3.7 + Math.sin(t * Math.PI) * 0.35;
    if (Math.abs(z - streamZ) < 0.48) return true;
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
  isSittingOrHeadingToBench = false
): boolean {
  for (let i = 0; i < MAP_OBSTACLES.length; i++) {
    const obs = MAP_OBSTACLES[i];
    if (isSleepingOrHeading && (obs.tag === "bed-frame" || Math.hypot(obs.x - JURO_BED_POS.x, obs.z - JURO_BED_POS.z) < 0.95)) {
      continue;
    }
    if (isSittingOrHeadingToBench && (obs.tag === "bench" || Math.hypot(obs.x - JURO_BENCH_POS.x, obs.z - JURO_BENCH_POS.z) < 0.65)) {
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
  isSittingOrHeadingToBench = false
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

    // 3. Water Collision (Lily Pond & Brook Stream) — Juro must never walk into water unless in bridge corridor!
    const isBridgeCorridor = Math.abs(rx - -0.36) <= 0.46 && Math.abs(rz - -2.32) <= 0.90;
    if (!isBridgeCorridor) {
      // 3a. Lily Pond Oval centered at (2.45, -1.05) with outer bank margin
      const pondCenterX = 2.45;
      const pondCenterZ = -1.05;
      const pondRadiusX = 1.18 + petRadius * 0.65;
      const pondRadiusZ = 0.84 + petRadius * 0.65;
      const pdx = rx - pondCenterX;
      const pdz = rz - pondCenterZ;
      const normX = pdx / pondRadiusX;
      const normZ = pdz / pondRadiusZ;
      const pondDistSq = normX * normX + normZ * normZ;
      if (pondDistSq < 1.0) {
        const dirX = Math.abs(pdx) > 0.0001 || Math.abs(pdz) > 0.0001 ? normX : 1.0;
        const dirZ = Math.abs(pdx) > 0.0001 || Math.abs(pdz) > 0.0001 ? normZ : 0.0;
        const pondDist = Math.hypot(dirX, dirZ) || 1.0;
        rx = pondCenterX + (dirX / pondDist) * (pondRadiusX + 0.08);
        rz = pondCenterZ + (dirZ / pondDist) * (pondRadiusZ + 0.08);
        hitObstacle = true;
      }

      // 3b. Brook Stream Winding Ribbon between x = -5.5 and x = 2.2
      if (rx >= -5.5 && rx <= 2.2) {
        const t = (rx + 5.5) / 7.7;
        const streamZ = -4.9 + t * 3.7 + Math.sin(t * Math.PI) * 0.35;
        const halfWidth = 0.52 + petRadius * 0.62;
        const streamDz = rz - streamZ;
        if (Math.abs(streamDz) < halfWidth) {
          const pushSign = streamDz >= 0 ? 1 : -1;
          rz = streamZ + pushSign * (halfWidth + 0.08);
          hitObstacle = true;
        }
      }
    } else {
      // 4. Wooden Footbridge Handrails: keep Juro centered safely on bridge planks (rx in [-0.56, -0.16])
      // Only apply railings on the bridge deck proper (|rz - -2.32| <= 0.62), keeping north and south approach ramps wide open
      if (Math.abs(rz - -2.32) <= 0.62) {
        if (rx < -0.56) {
          rx = -0.56;
          hitObstacle = true;
        } else if (rx > -0.16) {
          rx = -0.16;
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

// Pick a scenic, walkable waypoint anywhere on the wide map (meadow, hills, stumps, bridge!)
export function pickScenicWaypoint(): { x: number; z: number } {
  // 45% chance to specifically visit an elevated platform, stump, or wooden bridge!
  const roll = Math.random();
  if (roll < 0.35) {
    const platform = MAP_PLATFORMS[Math.floor(Math.random() * MAP_PLATFORMS.length)];
    for (let attempt = 0; attempt < 12; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * platform.radius * 0.55;
      const px = platform.x + Math.cos(angle) * r;
      const pz = platform.z + Math.sin(angle) * r;
      if (!isInsideObstacle(px, pz, 0.42) && !isWaterAt(px, pz)) {
        return { x: px, z: pz };
      }
    }
    // If west-knoll, return a clear spot on the grassy rim rather than inside the bed
    if (platform.id === "west-knoll") {
      return { x: -2.6, z: -0.15 };
    }
    if (!isWaterAt(platform.x, platform.z) && !isInsideObstacle(platform.x, platform.z, 0.2)) {
      return { x: platform.x, z: platform.z };
    }
  }
  if (roll < 0.45) {
    // Visit the wooden footbridge!
    return { x: -0.36, z: -2.32 };
  }

  // Otherwise pick any clear dry spot across the wide valley meadow
  for (let attempt = 0; attempt < 30; attempt++) {
    const x = MAP_BOUNDS.minX + Math.random() * (MAP_BOUNDS.maxX - MAP_BOUNDS.minX);
    const z = MAP_BOUNDS.minZ + Math.random() * (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ);
    if (!isWaterAt(x, z) && !isInsideObstacle(x, z, 0.45)) {
      return { x, z };
    }
  }

  return { x: 0, z: 0.2 };
}
