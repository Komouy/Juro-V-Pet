export interface ElevatedPlatform {
  id: string;
  kind: "terrace" | "rock-ledge" | "stump";
  x: number;
  z: number;
  radius: number;
  height: number;
  label: string;
}

export interface SolidObstacle {
  x: number;
  z: number;
  radius: number;
  topY: number;
  tag?: "bed-frame" | "bench" | "trampoline";
}

export interface Landmark {
  id: string;
  name: string;
  subtitle: string;
  category: "portal" | "lounge" | "bridge" | "cafe" | "nature" | "overlook";
  position: { x: number; z: number };
  entryPoint: { x: number; z: number };
  color: string;
  description: string;
}

export interface TreeSpec {
  x: number;
  z: number;
  kind: "pine" | "round";
  scale: number;
  rotation: number;
  tintIndex: number;
}

export interface RockSpec {
  x: number;
  z: number;
  scale: number;
  rotation: number;
}

export interface StumpSpec {
  x: number;
  z: number;
  scale: number;
  rotation: number;
}

export interface FenceSpec {
  x: number;
  z: number;
  rotation: number;
  panels: number;
}

export interface SteppingStone {
  x: number;
  z: number;
  radius: number;
  rotation: number;
}

export const WORLD_SIZE = 72;
export const HALF_WORLD = WORLD_SIZE / 2;
export const GRID_RES = 72;
export const BASE_GROUND_Y = 0.0;
export const ISLAND_RADIUS = 31.5;
export const TREE_RING_MAX_RADIUS = 29.9;
export const WALKABLE_RADIUS = 26.0;

// Landmarks definition matching the Storybook world map
export const LANDMARKS: Landmark[] = [
  {
    id: "tunnel",
    name: "Gerbang Tambang",
    subtitle: "Hulu Kanal Utara (Tambang)",
    category: "portal",
    position: { x: -14.2, z: -14.2 },
    entryPoint: { x: -10.5, z: -10.5 },
    color: "#e6a23c",
    description: "Pintu batu kuno tempat aliran kanal dimulai dan gerbang masuk tambang kristal.",
  },
  {
    id: "lounge",
    name: "Bukit Santai",
    subtitle: "Tebing Terakota (Kasur Tidur)",
    category: "lounge",
    position: { x: -15.0, z: 4.0 },
    entryPoint: { x: -11.5, z: 4.0 },
    color: "#eb8352",
    description: "Tebing rumput bertingkat dengan pelataran batu pasir dan sofa tidur santai Juro.",
  },
  {
    id: "bridge",
    name: "Jembatan Kayu",
    subtitle: "Penyeberangan Kanal",
    category: "bridge",
    position: { x: -3.2, z: -3.2 },
    entryPoint: { x: -3.2, z: -3.2 },
    color: "#cf924a",
    description: "Jembatan papan kayu hangat yang menghubungkan jalur setapak lembah.",
  },
  {
    id: "cafe",
    name: "WARUNG & Kios Jamur",
    subtitle: "Alun-Alun Timur (Toko)",
    category: "cafe",
    position: { x: 16.5, z: -2.2 },
    entryPoint: { x: 13.4, z: -0.6 },
    color: "#e56b55",
    description: "Kafe beratap pastel terakota dengan kios payung jamur merah dan konter belanja makanan/mainan.",
  },
  {
    id: "pond",
    name: "Kolam Bebek & Teratai",
    subtitle: "Taman Air (Mandi & Segar)",
    category: "nature",
    position: { x: 9.5, z: 9.5 },
    entryPoint: { x: 4.0, z: 11.8 },
    color: "#4baee8",
    description: "Kolam biru jernih dengan batu alam, daun teratai, ikan koi, dan bebek kuning.",
  },
  {
    id: "overlook",
    name: "Pos Pandang Selatan",
    subtitle: "Tebing Teleskop (Tempat Duduk)",
    category: "overlook",
    position: { x: 6.0, z: 20.0 },
    entryPoint: { x: 6.0, z: 17.6 },
    color: "#73bd48",
    description: "Puncak tebing selatan dengan bangku kayu, papan arah, dan teleskop pemandangan.",
  },
];

export const STEPPING_STONES: SteppingStone[] = [];

export const STUMP_SPECS: StumpSpec[] = [
  { x: 0.8, z: 22.8, scale: 0.95, rotation: 0.4 },
  { x: -8.6, z: 14.5, scale: 1.05, rotation: -0.6 },
  { x: 11.8, z: 15.2, scale: 0.9, rotation: 1.1 },
  { x: -5.4, z: -17.5, scale: 0.92, rotation: -0.4 },
  { x: 10.6, z: -21.2, scale: 1.0, rotation: 0.8 },
];

export const FENCE_SPECS: FenceSpec[] = [
  { x: -2.5, z: 16.2, rotation: -0.35, panels: 2 },
  { x: 4.2, z: -16.8, rotation: -0.55, panels: 2 },
];

// Winding S-curve storybook sandy trail waypoints (ending neatly inside the circular woodland)
export const TRAIL_POINTS: Array<[number, number]> = [
  [8.6, 25.2],
  [3.0, 23.8],
  [-3.2, 20.6],
  [5.2, 16.8],
  [2.5, 11.5],
  [-6.8, 8.2],
  [-11.2, 4.2],
  [-7.0, 0.2],
  [-3.2, -3.2],
  [1.2, -6.5],
  [8.5, -5.2],
  [13.4, -0.8],
  [10.2, -8.5],
  [2.0, -13.5],
  [-7.5, -11.5],
  [-10.2, -10.0],
];

export const TRAIL_EXTRA: Array<[number, number]> = [
  [2.0, -13.5],
  [-1.2, -18.5],
  [5.2, -22.8],
  [10.2, -25.4],
];

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function distToPolyline(x: number, z: number, pts: Array<[number, number]>): number {
  let minDist = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const vx = bx - ax;
    const vz = bz - az;
    const lenSq = vx * vx + vz * vz;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / lenSq));
    const px = ax + t * vx;
    const pz = az + t * vz;
    const d = Math.hypot(x - px, z - pz);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

export function distanceToTrail(x: number, z: number): number {
  return Math.min(
    distToPolyline(x, z, TRAIL_POINTS),
    distToPolyline(x, z, TRAIL_EXTRA)
  );
}

export function isOnTrail(x: number, z: number): boolean {
  return distanceToTrail(x, z) < 1.68;
}

export function distanceToCanalAxis(x: number, z: number): { dist: number; t: number } {
  const ax = -13.5;
  const az = -13.5;
  const bx = 7.5;
  const bz = 7.5;
  const vx = bx - ax;
  const vz = bz - az;
  const lenSq = vx * vx + vz * vz;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / lenSq));
  const px = ax + t * vx;
  const pz = az + t * vz;
  return { dist: Math.hypot(x - px, z - pz), t };
}

export function isBridgeDeck(x: number, z: number): boolean {
  const dx = x - -3.2;
  const dz = z - -3.2;
  const along = (dx - dz) * Math.SQRT1_2;
  const across = (dx + dz) * Math.SQRT1_2;
  return Math.abs(along) <= 3.7 && Math.abs(across) <= 1.75;
}

export function isInCanalOrPond(x: number, z: number): boolean {
  const { dist } = distanceToCanalAxis(x, z);
  const pondDist = Math.hypot(x - 9.5, z - 9.5);
  return dist < 2.35 || pondDist < 5.35;
}

export function isOnCobblePath(x: number, z: number): boolean {
  const cafeDist = Math.hypot((x - 14.5) * 0.85, z + 1.4);
  if (cafeDist < 5.2) return true;
  const pierDist = Math.hypot(x - 4.0, z - 11.8);
  if (pierDist < 1.35) return true;
  return false;
}

export function grassPatchFactor(x: number, z: number): number {
  const patches: Array<[number, number, number]> = [
    [-15, 4, 9.2],
    [6, 20, 7.8],
    [9.5, 9.5, 8.2],
    [-4, 15, 4.2],
    [14, -2, 8.2],
    [-12, -12, 7.5],
    [13, 19, 5.2],
    [-19, 17, 5.8],
    [18, -16, 6.2],
  ];
  let best = 0;
  for (const [px, pz, r] of patches) {
    const d = Math.hypot(x - px, z - pz);
    const f = 1 - smoothstep(r * 0.55, r, d);
    if (f > best) best = f;
  }
  return best;
}

export function groundHeightAt(x: number, z: number): number {
  let h = 0;

  const gentleNoise =
    Math.sin(x * 0.12) * Math.cos(z * 0.12) * 0.16 +
    Math.sin((x - z) * 0.07) * 0.1;

  // Hill 1: Bukit Santai (West Hilltop Cliff Ledge) centered at (-15, 4)
  const dLounge = Math.hypot(x + 15.0, z - 4.0);
  const hillLounge = (1 - smoothstep(4.5, 8.2, dLounge)) * 2.3;

  // Hill 2: Pos Pandang Selatan (South Cliff Ledge) centered at (6, 20)
  const dOverlook = Math.hypot(x - 6.0, z - 20.0);
  const hillOverlook = (1 - smoothstep(3.6, 6.9, dOverlook)) * 1.75;

  // Hill 3: North-East Scenic Cliff Ledge at (19, -15)
  const dEastLedge = Math.hypot(x - 19.5, z + 15.5);
  const hillEastLedge = (1 - smoothstep(3.0, 5.8, dEastLedge)) * 1.9;

  // Hill 4: Tunnel cliff mound behind (-16.5, -16.5)
  const dTunnelMound = Math.hypot(x + 16.5, z + 16.5);
  const tunnelMound = (1 - smoothstep(2.8, 7.0, dTunnelMound)) * 4.1;
  const { dist: canalDist } = distanceToCanalAxis(x, z);
  const mouthCarve = canalDist < 3.4 && x > -14.8 && z > -14.8 ? 0 : 1;

  // Gentle circular forest bowl rim that softens near the island cliff lip
  const radialDist = Math.hypot(x, z);
  const rimRise = smoothstep(23.5, 29.2, radialDist) * 1.15;
  const rimBevel = smoothstep(29.8, ISLAND_RADIUS, radialDist) * 0.45;
  const rimLift = rimRise - rimBevel;

  h += gentleNoise + hillLounge + hillOverlook + hillEastLedge + tunnelMound * mouthCarve + rimLift;

  // Keep sandy trail smoothly graded so character walks cleanly
  const tDist = distanceToTrail(x, z);
  if (tDist < 2.8) {
    const trailFlatten = 1 - smoothstep(1.2, 2.8, tDist);
    h = h * (1 - trailFlatten * 0.35);
  }

  // Flatten plaza around WARUNG & Kios Jamur
  const dCafePlaza = Math.hypot(x - 15.0, z + 1.5);
  const cafeFlatten = smoothstep(5.8, 9.2, dCafePlaza);
  h = h * cafeFlatten + 0.06 * (1 - cafeFlatten);

  // Carve canal & lotus pond basin
  const pondDist = Math.hypot(x - 9.5, z - 9.5);
  const canalFactor = 1 - smoothstep(1.9, 3.05, canalDist);
  const pondFactor = 1 - smoothstep(4.6, 6.2, pondDist);
  const waterCarve = Math.max(canalFactor, pondFactor);
  if (waterCarve > 0) {
    h = h * (1 - waterCarve) + -1.02 * waterCarve;
  }

  return h;
}

export function walkableHeightAt(x: number, z: number): number {
  if (isBridgeDeck(x, z)) {
    const dx = x + 3.2;
    const dz = z + 3.2;
    const along = (dx - dz) * Math.SQRT1_2;
    const arch = Math.cos((along / 3.8) * (Math.PI * 0.5)) * 0.42;
    return 0.52 + Math.max(0, arch);
  }
  return groundHeightAt(x, z);
}

export function getTerrainHeightAt(x: number, z: number): number {
  return walkableHeightAt(x, z);
}

export function getBridgeElevation(x: number, z: number): number | null {
  if (isBridgeDeck(x, z)) {
    const dx = x + 3.2;
    const dz = z + 3.2;
    const along = (dx - dz) * Math.SQRT1_2;
    const arch = Math.cos((along / 3.8) * (Math.PI * 0.5)) * 0.42;
    return 0.52 + Math.max(0, arch);
  }
  return null;
}

export function isWaterAt(x: number, z: number): boolean {
  if (isBridgeDeck(x, z)) return false;
  for (const st of STEPPING_STONES) {
    if (Math.hypot(x - st.x, z - st.z) < st.radius) return false;
  }
  return isInCanalOrPond(x, z);
}

export function isNearWater(x: number, z: number, buffer = 0.6): boolean {
  const { dist: canalDist } = distanceToCanalAxis(x, z);
  const pondDist = Math.hypot(x - 9.5, z - 9.5);
  return canalDist < 2.35 + buffer || pondDist < 5.35 + buffer;
}

export function generateWorldProps(): { trees: TreeSpec[]; rocks: RockSpec[] } {
  const rand = mulberry32(20261122);
  const trees: TreeSpec[] = [];
  const rocks: RockSpec[] = [];

  const isReserved = (x: number, z: number, pad = 2.4, maxRadius = TREE_RING_MAX_RADIUS): boolean => {
    if (Math.hypot(x, z) > maxRadius) return true;
    const { dist } = distanceToCanalAxis(x, z);
    if (dist < 3.5 + pad * 0.35) return true;
    if (Math.hypot(x - 9.5, z - 9.5) < 6.7 + pad * 0.35) return true;
    if (isBridgeDeck(x, z)) return true;
    if (isOnCobblePath(x, z)) return true;
    if (distanceToTrail(x, z) < 2.65) return true;

    for (const lm of LANDMARKS) {
      const clearRadius = lm.id === "cafe" ? 6.4 : lm.id === "lounge" ? 5.6 : 4.4;
      if (Math.hypot(x - lm.position.x, z - lm.position.z) < clearRadius) return true;
      if (Math.hypot(x - lm.entryPoint.x, z - lm.entryPoint.z) < 2.5) return true;
    }

    for (const st of STEPPING_STONES) {
      if (Math.hypot(x - st.x, z - st.z) < 2.1) return true;
    }

    for (const stump of STUMP_SPECS) {
      if (Math.hypot(x - stump.x, z - stump.z) < 2.0) return true;
    }

    for (const fence of FENCE_SPECS) {
      if (Math.hypot(x - fence.x, z - fence.z) < 2.6) return true;
    }

    if (Math.hypot(x + 16.5, z + 16.5) < 5.6) return true;
    if (Math.hypot(x - JURO_TRAMPOLINE_POS.x, z - JURO_TRAMPOLINE_POS.z) < 3.4) return true;
    return false;
  };

  const canPlaceTree = (x: number, z: number): boolean => {
    for (const t of trees) {
      if (Math.hypot(x - t.x, z - t.z) < 2.65) {
        return false;
      }
    }
    return true;
  };

  // Iconic North-East scenic cliff pine
  trees.push({
    x: 19.5,
    z: -15.8,
    kind: "pine",
    scale: 1.12,
    rotation: 0.4,
    tintIndex: 0,
  });

  // Pass 1: Continuous circular perimeter tree ring framing the island rim without empty edges
  const perimeterRings: Array<{ count: number; minR: number; maxR: number; pineChance: number }> = [
    { count: 58, minR: 28.0, maxR: 29.8, pineChance: 0.78 },
    { count: 44, minR: 25.0, maxR: 27.6, pineChance: 0.65 },
  ];

  for (const ring of perimeterRings) {
    for (let i = 0; i < ring.count; i++) {
      const angle = (i / ring.count) * Math.PI * 2 + (rand() - 0.5) * 0.08;
      const radius = ring.minR + rand() * (ring.maxR - ring.minR);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (isReserved(x, z)) continue;
      if (!canPlaceTree(x, z)) continue;

      trees.push({
        x,
        z,
        kind: rand() < ring.pineChance ? "pine" : "round",
        scale: 0.9 + rand() * 0.3,
        rotation: rand() * Math.PI * 2,
        tintIndex: Math.floor(rand() * 4),
      });
    }
  }

  // Pass 2: Natural polar interior woodland accents inside the outer ring
  for (let attempt = 0; attempt < 650 && trees.length < 168; attempt++) {
    const angle = rand() * Math.PI * 2;
    const radius = Math.sqrt(rand()) * 27.4;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (isReserved(x, z)) continue;

    const edgeBias = radius / 27.4;
    const keepChance = edgeBias > 0.72 ? 0.85 : edgeBias > 0.45 ? 0.34 : 0.18;
    if (rand() > keepChance) continue;
    if (!canPlaceTree(x, z)) continue;

    trees.push({
      x,
      z,
      kind: rand() > 0.38 ? "pine" : "round",
      scale: 0.86 + rand() * 0.3,
      rotation: rand() * Math.PI * 2,
      tintIndex: Math.floor(rand() * 4),
    });
  }

  // Pass 3: Polar rock scatter inside playable woodland radius
  for (let attempt = 0; attempt < 220 && rocks.length < 30; attempt++) {
    const angle = rand() * Math.PI * 2;
    const radius = Math.sqrt(rand()) * (TREE_RING_MAX_RADIUS - 1.5);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (isReserved(x, z, 1.5, TREE_RING_MAX_RADIUS - 1.5)) continue;

    let tooClose = false;
    for (const t of trees) {
      if (Math.hypot(x - t.x, z - t.z) < 1.9) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    rocks.push({
      x,
      z,
      scale: 0.65 + rand() * 0.55,
      rotation: rand() * Math.PI * 2,
    });
  }

  return { trees, rocks };
}

// Wide explorable circular map bounds
export const MAP_BOUNDS = {
  minX: -WALKABLE_RADIUS,
  maxX: WALKABLE_RADIUS,
  minZ: -WALKABLE_RADIUS,
  maxZ: WALKABLE_RADIUS,
} as const;

export function clampToCircularWorld(
  x: number,
  z: number,
  maxRadius = WALKABLE_RADIUS
): { x: number; z: number } {
  const r = Math.hypot(x, z);
  if (r <= maxRadius || r < 0.0001) {
    return { x, z };
  }
  const scale = maxRadius / r;
  return { x: x * scale, z: z * scale };
}

// Cozy sleep bed location atop the Bukit Santai terrace
export const JURO_BED_POS = {
  x: -15.35,
  y: 1.42,
  z: 4.0,
  platformId: "bukit-santai",
} as const;

// Dual Pet Sleep Slots on the Bukit Santai Twin Terracotta Sofa:
export const JURO_BED_SLOT_1 = {
  x: -15.35,
  y: 1.42,
  z: 3.2,
  platformId: "bukit-santai",
  label: "Slot Tidur Pet 1 (Kiri)",
} as const;

export const JURO_BED_SLOT_2 = {
  x: -15.35,
  y: 1.42,
  z: 4.8,
  platformId: "bukit-santai",
  label: "Slot Tidur Pet 2 (Kanan)",
} as const;

// Cozy wooden park bench atop Pos Pandang Selatan overlooking the valley
export const JURO_BENCH_POS = {
  x: 6.0,
  z: 20.6,
  seatY: 2.27,
  rotY: Math.PI,
  platformId: "pos-pandang",
} as const;

// Interactive bouncy mushroom trampoline in north-west meadow clearing (between tunnel/canal and sandy trail)
export const JURO_TRAMPOLINE_POS = {
  x: -6.2,
  z: -15.5,
  scale: 1.24,
  surfaceY: 1.12,
  label: "Trampolin Jamur",
} as const;

// Interactive shop counter at WARUNG & Kios Jamur
export const JURO_SHOP_POS = {
  x: 13.4,
  z: -0.6,
  label: "WARUNG & Kios Jamur",
} as const;

// Interactive mine entrance at Gerbang Tambang
export const JURO_MINE_POS = {
  x: -10.5,
  z: -10.5,
  label: "Gerbang Tambang",
} as const;

// Elevated platforms Juro can climb / rest on
export const MAP_PLATFORMS: ElevatedPlatform[] = [
  {
    id: "bukit-santai",
    kind: "terrace",
    x: -15.35,
    z: 4.0,
    radius: 2.8,
    height: 2.1,
    label: "Bukit Santai (Kasur)",
  },
  {
    id: "pos-pandang",
    kind: "terrace",
    x: 6.0,
    z: 20.0,
    radius: 2.6,
    height: 1.75,
    label: "Pos Pandang Selatan (Tempat Duduk)",
  },
  {
    id: "mushroom-trampoline",
    kind: "terrace",
    x: JURO_TRAMPOLINE_POS.x,
    z: JURO_TRAMPOLINE_POS.z,
    radius: 1.28,
    height: JURO_TRAMPOLINE_POS.surfaceY,
    label: "Trampolin Jamur",
  },
  {
    id: "wooden-bridge",
    kind: "terrace",
    x: -3.2,
    z: -3.2,
    radius: 2.2,
    height: 0.65,
    label: "Jembatan Kayu",
  },
  {
    id: "cafe-plaza",
    kind: "terrace",
    x: 14.8,
    z: -1.6,
    radius: 3.5,
    height: 0.12,
    label: "WARUNG & Kios Jamur",
  },
];

// Solid world obstacles so Juro never clips through props
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
  { x: -16.55, z: 4.0, radius: 0.75, topY: 3.2, tag: "bed-frame" }, // Backrest
  { x: -15.45, z: 1.92, radius: 0.65, topY: 3.0, tag: "bed-frame" }, // Left Armrest
  { x: -15.45, z: 6.08, radius: 0.65, topY: 3.0, tag: "bed-frame" }, // Right Armrest
  { x: -15.35, z: 1.35, radius: 0.55, topY: 2.9, tag: "bed-frame" }, // Bedside Table & Lamp

  // Pos Pandang Selatan Park Bench & Telescope
  { x: 6.0, z: 20.6, radius: 0.75, topY: 2.8, tag: "bench" },
  { x: 4.15, z: 19.6, radius: 0.38, topY: 2.5 },
  { x: 8.0, z: 19.7, radius: 0.3, topY: 2.5 },

  // Bouncy Mushroom Trampoline (North-West grassy clearing)
  { x: JURO_TRAMPOLINE_POS.x, z: JURO_TRAMPOLINE_POS.z, radius: 1.12, topY: 1.65, tag: "trampoline" },

  // Footbridge Side Railings (South-East & North-West rails keeping center walkway clear)
  { x: -3.59, z: -0.62, radius: 0.32, topY: 1.8 },
  { x: -2.10, z: -2.10, radius: 0.32, topY: 1.8 },
  { x: -0.62, z: -3.59, radius: 0.32, topY: 1.8 },
  { x: -5.78, z: -2.81, radius: 0.32, topY: 1.8 },
  { x: -4.30, z: -4.30, radius: 0.32, topY: 1.8 },
  { x: -2.81, z: -5.78, radius: 0.32, topY: 1.8 },

  // Lantern posts
  { x: -7.1, z: -1.7, radius: 0.22, topY: 2.2 },
  { x: 0.7, z: -4.7, radius: 0.22, topY: 2.2 },
  { x: 14.2, z: 2.6, radius: 0.22, topY: 2.2 },
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
      isSleepingOrHeading &&
      (obs.tag === "bed-frame" || Math.hypot(obs.x - JURO_BED_POS.x, obs.z - JURO_BED_POS.z) < 2.35)
    ) {
      continue;
    }
    if (
      isSittingOrHeadingToBench &&
      (obs.tag === "bench" || Math.hypot(obs.x - JURO_BENCH_POS.x, obs.z - JURO_BENCH_POS.z) < 0.75)
    ) {
      continue;
    }
    if (
      isBouncingOrHeadingToTrampoline &&
      (obs.tag === "trampoline" || Math.hypot(obs.x - JURO_TRAMPOLINE_POS.x, obs.z - JURO_TRAMPOLINE_POS.z) < 0.75)
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

  // Check bed mattress while awake
  if (!isSleepingOrHeading && Math.hypot(x - JURO_BED_POS.x, z - JURO_BED_POS.z) < 0.55 + pad) {
    return true;
  }
  return false;
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
        isSleepingOrHeadingToBed &&
        (obs.tag === "bed-frame" || Math.hypot(obs.x - JURO_BED_POS.x, obs.z - JURO_BED_POS.z) < 2.35)
      ) {
        continue;
      }
      if (
        isSittingOrHeadingToBench &&
        (obs.tag === "bench" || Math.hypot(obs.x - JURO_BENCH_POS.x, obs.z - JURO_BENCH_POS.z) < 0.75)
      ) {
        continue;
      }
      if (
        isBouncingOrHeadingToTrampoline &&
        (obs.tag === "trampoline" || Math.hypot(obs.x - JURO_TRAMPOLINE_POS.x, obs.z - JURO_TRAMPOLINE_POS.z) < 0.75)
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

    for (let i = 0; i < nearbyProps.length; i++) {
      const prop = nearbyProps[i];
      if (bottomY >= prop.topY) continue;

      const dx = rx - prop.x;
      const dz = rz - prop.z;
      const dist = Math.hypot(dx, dz);
      const minDist = prop.radius + petRadius;
      if (dist < minDist) {
        const nx = dist > 0.0001 ? dx / dist : 1;
        const nz = dist > 0.0001 ? dz / dist : 0;
        rx = prop.x + nx * minDist;
        rz = prop.z + nz * minDist;
        hitObstacle = true;
      }
    }

    // Sofa Bed Mattress: awake pet cannot penetrate mattress
    if (!isSleepingOrHeadingToBed) {
      const dx = rx - JURO_BED_POS.x;
      const dz = rz - JURO_BED_POS.z;
      const dist = Math.hypot(dx, dz);
      const minDist = 0.55 + petRadius;
      if (dist < minDist) {
        const nx = dist > 0.0001 ? dx / dist : 1;
        const nz = dist > 0.0001 ? dz / dist : 0;
        rx = JURO_BED_POS.x + nx * minDist;
        rz = JURO_BED_POS.z + nz * minDist;
        hitObstacle = true;
      }
    }

    // Water barrier: Juro CANNOT walk or swim in water!
    // Must cross using the Wooden Bridge (where isWaterAt returns false).
    if (isWaterAt(rx, rz)) {
      const canal = distanceToCanalAxis(rx, rz);
      const pondDist = Math.hypot(rx - 9.5, rz - 9.5);
      if (pondDist < 5.45) {
        const pdx = rx - 9.5;
        const pdz = rz - 9.5;
        const pdist = Math.hypot(pdx, pdz);
        const nx = pdist > 0.0001 ? pdx / pdist : 1;
        const nz = pdist > 0.0001 ? pdz / pdist : 0;
        rx = 9.5 + nx * (5.45 + petRadius);
        rz = 9.5 + nz * (5.45 + petRadius);
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

export function pickScenicWaypoint(bias?: "water" | "bed" | "food" | "bench" | "trampoline"): { x: number; z: number } {
  for (let attempt = 0; attempt < 35; attempt++) {
    let candidate: { x: number; z: number };

    if (bias === "water") {
      // Target lotus pond shore or canal bank on dry land (NOT in water!)
      const angle = Math.random() * Math.PI * 2;
      const r = 5.65 + Math.random() * 1.5;
      candidate = { x: 9.5 + Math.cos(angle) * r, z: 9.5 + Math.sin(angle) * r };
    } else if (bias === "bed") {
      // Bukit Santai lounge entry or terrace
      candidate = { x: -11.5 + (Math.random() - 0.5) * 0.8, z: 4.0 + (Math.random() - 0.5) * 0.8 };
    } else if (bias === "bench") {
      // Pos Pandang overlook terrace in front of bench
      candidate = { x: 6.0 + (Math.random() - 0.5) * 0.8, z: 18.5 + (Math.random() - 0.5) * 0.8 };
    } else if (bias === "trampoline") {
      // Clear meadow beside the enlarged mushroom trampoline
      candidate = {
        x: JURO_TRAMPOLINE_POS.x + 1.45 + (Math.random() - 0.5) * 0.4,
        z: JURO_TRAMPOLINE_POS.z + 0.45 + (Math.random() - 0.5) * 0.4,
      };
    } else if (bias === "food") {
      // WARUNG plaza
      candidate = { x: 13.4 + (Math.random() - 0.5) * 1.5, z: -0.6 + (Math.random() - 0.5) * 1.5 };
    } else if (Math.random() < 0.4) {
      // Pick a point along the scenic sandy trail
      const idx = Math.floor(Math.random() * TRAIL_POINTS.length);
      const [tx, tz] = TRAIL_POINTS[idx];
      const offset = (Math.random() - 0.5) * 0.8;
      candidate = { x: tx + offset, z: tz + offset };
    } else {
      // Clear spot across the circular meadow
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

  // Safe fallback point on clear path near bridge entry
  return { x: -5.0, z: -1.0 };
}
