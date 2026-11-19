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
}

export const BASE_GROUND_Y = -0.92;

// Solid world props inside & bordering Juro's walkable valley so Juro NEVER clips through them
export const MAP_OBSTACLES: SolidObstacle[] = [
  // Trees on knolls & bordering meadow
  { x: -3.9, z: -1.35, radius: 0.34, topY: 1.4 },
  { x: 4.2, z: 1.35, radius: 0.34, topY: 1.4 },
  { x: -4.4, z: -4.5, radius: 0.4, topY: 1.4 },
  { x: 3.2, z: -4.2, radius: 0.4, topY: 1.4 },
  // Miniature Juro Shop Building (back-right) & Crystal Mine Cave (north across straight bridge)
  { x: 4.55, z: -2.55, radius: 0.96, topY: 1.4 },
  { x: -0.36, z: -4.55, radius: 1.05, topY: 1.5 },
  // Wooden Park Bench atop East Knoll (2 overlapping circles along bench length)
  { x: 3.5, z: 0.82, radius: 0.28, topY: BASE_GROUND_Y + 0.9 },
  { x: 3.8, z: 1.08, radius: 0.28, topY: BASE_GROUND_Y + 0.9 },
  // Nightstand & Bed Headboard atop West Knoll (keeps mattress clear for sleeping)
  { x: -3.64, z: -0.76, radius: 0.22, topY: BASE_GROUND_Y + 0.85 },
  // Two Glowing Meadow Lantern Posts
  { x: -1.45, z: -1.65, radius: 0.16, topY: 0.5 },
  { x: 2.25, z: 0.22, radius: 0.16, topY: 0.5 },
  // Bushes inside/bordering valley
  { x: -4.2, z: -0.95, radius: 0.32, topY: 0.2 },
  { x: 4.1, z: 1.85, radius: 0.3, topY: 0.2 },
  { x: -3.9, z: 2.35, radius: 0.34, topY: 0.0 },
  { x: 3.8, z: 2.55, radius: 0.32, topY: 0.0 },
  // Rocks, scenic boulders & river pebbles in walkable zone
  { x: 1.38, z: -0.82, radius: 0.18, topY: BASE_GROUND_Y + 0.22 },
  { x: 1.56, z: -0.62, radius: 0.14, topY: BASE_GROUND_Y + 0.18 },
  { x: 2.95, z: -0.45, radius: 0.2, topY: BASE_GROUND_Y + 0.24 },
  { x: 3.22, z: -0.64, radius: 0.15, topY: BASE_GROUND_Y + 0.2 },
  { x: 3.55, z: -1.3, radius: 0.18, topY: BASE_GROUND_Y + 0.22 },
  { x: -0.95, z: -2.0, radius: 0.17, topY: BASE_GROUND_Y + 0.22 },
  { x: 0.45, z: -1.58, radius: 0.15, topY: BASE_GROUND_Y + 0.18 },
  { x: -4.32, z: -1.52, radius: 0.22, topY: BASE_GROUND_Y + 0.26 },
  { x: -2.65, z: 1.75, radius: 0.24, topY: BASE_GROUND_Y + 0.24 },
  { x: 2.25, z: 1.95, radius: 0.22, topY: BASE_GROUND_Y + 0.24 },
  { x: 1.15, z: -3.25, radius: 0.32, topY: BASE_GROUND_Y + 0.32 },
  { x: -3.45, z: 2.25, radius: 0.28, topY: BASE_GROUND_Y + 0.28 },
  { x: -1.8, z: 0.35, radius: 0.21, topY: BASE_GROUND_Y + 0.22 },
  { x: 2.05, z: 0.85, radius: 0.2, topY: BASE_GROUND_Y + 0.22 },
  { x: -2.1, z: -1.6, radius: 0.22, topY: BASE_GROUND_Y + 0.24 },
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
  x: -3.25,
  z: -0.55,
  platformId: "west-knoll",
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
    id: "stump-sw",
    kind: "stump",
    x: -1.55,
    z: 1.35,
    radius: 0.42,
    height: 0.28,
    label: "Tunggul Kayu Barat",
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

  if (Math.abs(localX) <= 0.44 && Math.abs(localZ) <= 0.64) {
    return 0.11;
  }
  return null;
}

// Check if (x, z) is inside the lily pond or winding brook (excluding bridge)
export function isWaterAt(x: number, z: number): boolean {
  if (getBridgeElevation(x, z) !== null) return false;

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
export function isInsideObstacle(x: number, z: number, pad = 0.35): boolean {
  for (let i = 0; i < MAP_OBSTACLES.length; i++) {
    const obs = MAP_OBSTACLES[i];
    if (Math.hypot(x - obs.x, z - obs.z) < obs.radius + pad) {
      return true;
    }
  }
  return false;
}

// Resolve horizontal collisions against all solid props, water pond & steep un-jumped platform cliffs
export function resolveHorizontalCollisions(
  x: number,
  z: number,
  bottomY: number,
  petRadius = 0.38,
  allowClimbing = false
): { x: number; z: number; hitObstacle: boolean } {
  let rx = Math.max(MAP_BOUNDS.minX, Math.min(MAP_BOUNDS.maxX, x));
  let rz = Math.max(MAP_BOUNDS.minZ, Math.min(MAP_BOUNDS.maxZ, z));
  let hitObstacle = false;

  // 2 solver passes ensure clean resolution when wedged between two nearby objects
  for (let pass = 0; pass < 2; pass++) {
    // 1. Push out of solid props (trees, bench, basket, lanterns, boulders, cottage, bushes)
    for (let i = 0; i < MAP_OBSTACLES.length; i++) {
      const obs = MAP_OBSTACLES[i];
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

    // 2. Prevent clipping sideways into elevated terrace/stump/rock walls unless Juro is already high enough!
    if (!allowClimbing) {
      for (let i = 0; i < MAP_PLATFORMS.length; i++) {
        const p = MAP_PLATFORMS[i];
        const platformTopY = BASE_GROUND_Y + p.height;
        // If Juro's bottom is well below the top ledge, treat the side wall as solid!
        if (bottomY < platformTopY - 0.14) {
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
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * platform.radius * 0.52;
      const px = platform.x + Math.cos(angle) * r;
      const pz = platform.z + Math.sin(angle) * r;
      if (!isInsideObstacle(px, pz, 0.42)) {
        return { x: px, z: pz };
      }
    }
    return { x: platform.x, z: platform.z };
  }
  if (roll < 0.45) {
    // Visit the wooden footbridge!
    return { x: -0.36, z: -2.32 };
  }

  // Otherwise pick any clear dry spot across the wide valley meadow
  for (let attempt = 0; attempt < 16; attempt++) {
    const x = MAP_BOUNDS.minX + Math.random() * (MAP_BOUNDS.maxX - MAP_BOUNDS.minX);
    const z = MAP_BOUNDS.minZ + Math.random() * (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ);
    if (!isWaterAt(x, z) && !isInsideObstacle(x, z, 0.45)) {
      return { x, z };
    }
  }

  return { x: 0, z: 0.2 };
}
