export const WORLD_SIZE = 72;
export const HALF_WORLD = WORLD_SIZE / 2;
export const GRID_RES = 72;

export type WeatherMode = 'cerah' | 'hujan' | 'senja' | 'malam';
export type CameraMode = 'follow' | 'isometric' | 'orbit';
export type PixelLevel = 'soft' | 'crisp' | 'retro';

export interface Landmark {
  id: string;
  name: string;
  subtitle: string;
  category: 'portal' | 'lounge' | 'bridge' | 'cafe' | 'nature' | 'overlook';
  position: { x: number; z: number };
  entryPoint: { x: number; z: number };
  color: string;
  description: string;
}

export interface TreeSpec {
  x: number;
  z: number;
  kind: 'pine' | 'round';
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

export const LANDMARKS: Landmark[] = [
  {
    id: 'tunnel',
    name: 'Gerbang Terowongan',
    subtitle: 'Hulu Kanal Utara',
    category: 'portal',
    position: { x: -13.5, z: -13.5 },
    entryPoint: { x: -10.0, z: -10.0 },
    color: '#e6a23c',
    description: 'Pintu batu kuno tempat aliran kanal dimulai, diterangi lentera hangat.',
  },
  {
    id: 'lounge',
    name: 'Bukit Santai',
    subtitle: 'Tebing Terakota',
    category: 'lounge',
    position: { x: -15.0, z: 4.0 },
    entryPoint: { x: -11.5, z: 4.0 },
    color: '#eb8352',
    description: 'Tebing rumput lembut dengan pelataran batu pasir dan sofa santai.',
  },
  {
    id: 'bridge',
    name: 'Jembatan Kayu',
    subtitle: 'Penyeberangan Kanal',
    category: 'bridge',
    position: { x: -3.2, z: -3.2 },
    entryPoint: { x: -3.2, z: -3.2 },
    color: '#cf924a',
    description: 'Jembatan papan kayu hangat yang menghubungkan jalur setapak lembah.',
  },
  {
    id: 'cafe',
    name: 'Kafe Senja & Kios Jamur',
    subtitle: 'Alun-Alun Timur',
    category: 'cafe',
    position: { x: 16.5, z: -2.2 },
    entryPoint: { x: 13.4, z: -0.6 },
    color: '#e56b55',
    description: 'Kafe beratap pastel terakota dengan kios payung jamur merah dan konter kopi.',
  },
  {
    id: 'pond',
    name: 'Kolam Bebek & Teratai',
    subtitle: 'Taman Air',
    category: 'nature',
    position: { x: 9.5, z: 9.5 },
    entryPoint: { x: 4.0, z: 11.8 },
    color: '#4baee8',
    description: 'Kolam biru jernih dengan batu alam, daun teratai, ikan koi, dan bebek kuning.',
  },
  {
    id: 'overlook',
    name: 'Pos Pandang Selatan',
    subtitle: 'Tebing Teleskop',
    category: 'overlook',
    position: { x: 6.0, z: 20.0 },
    entryPoint: { x: 6.0, z: 17.6 },
    color: '#73bd48',
    description: 'Puncak tebing selatan dengan bangku kayu, papan arah, dan teleskop.',
  },
];

export const STEPPING_STONES: SteppingStone[] = [
  { x: -10.5, z: 8.5, radius: 0.95, rotation: 0.2 },
  { x: -7.5, z: 9.8, radius: 0.85, rotation: -0.3 },
  { x: -4.4, z: 10.6, radius: 0.95, rotation: 0.5 },
  { x: -1.3, z: 11.4, radius: 0.85, rotation: -0.1 },
  { x: 1.7, z: 12.0, radius: 0.95, rotation: 0.4 },
  { x: 4.4, z: 13.6, radius: 0.9, rotation: -0.2 },
];

// Winding S-curve storybook sandy trail waypoints (South -> Overlook -> Pond -> Bridge -> Cafe -> North)
const TRAIL_POINTS: Array<[number, number]> = [
  [12.0, 29.0],
  [3.0, 25.5],
  [-3.5, 21.0],
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

// Extra upper-north continuation for scenic S-curve silhouette like reference illustration
const TRAIL_EXTRA: Array<[number, number]> = [
  [2.0, -13.5],
  [-1.5, -19.5],
  [6.5, -24.5],
  [14.0, -30.0],
];

export const STUMP_SPECS: StumpSpec[] = [
  { x: 0.8, z: 22.8, scale: 0.95, rotation: 0.4 },
  { x: -8.6, z: 14.5, scale: 1.05, rotation: -0.6 },
  { x: 11.8, z: 15.2, scale: 0.9, rotation: 1.1 },
  { x: 4.5, z: -9.8, scale: 1.0, rotation: 0.2 },
  { x: -5.4, z: -17.5, scale: 0.92, rotation: -0.4 },
  { x: 10.6, z: -21.2, scale: 1.0, rotation: 0.8 },
];

export const FENCE_SPECS: FenceSpec[] = [
  { x: -2.5, z: 16.2, rotation: -0.35, panels: 2 },
  { x: 9.8, z: 4.2, rotation: 0.85, panels: 2 },
  { x: 4.2, z: -16.8, rotation: -0.55, panels: 2 },
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
    distToPolyline(x, z, TRAIL_EXTRA),
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

/**
 * Soft grass patch islands (like the reference illustration's lush green patches around trees & hills)
 */
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

/**
 * Continuous terrain height with soft cliff ledges & gentle meadows.
 */
export function groundHeightAt(x: number, z: number): number {
  let h = 0;

  const gentleNoise =
    Math.sin(x * 0.12) * Math.cos(z * 0.12) * 0.16 +
    Math.sin((x - z) * 0.07) * 0.1;

  // Hill 1: Bukit Santai (West Hilltop Cliff Ledge) centered at (-15, 4)
  const dLounge = Math.hypot(x + 15.0, z - 4.0);
  const hillLounge = (1 - smoothstep(4.5, 8.2, dLounge)) * 2.1;

  // Hill 2: Pos Pandang Selatan (South Cliff Ledge) centered at (6, 20)
  const dOverlook = Math.hypot(x - 6.0, z - 20.0);
  const hillOverlook = (1 - smoothstep(3.6, 6.9, dOverlook)) * 1.75;

  // Hill 3: North-East Scenic Cliff Ledge at (19, -15) matching top-right ledge in reference
  const dEastLedge = Math.hypot(x - 19.5, z + 15.5);
  const hillEastLedge = (1 - smoothstep(3.0, 5.8, dEastLedge)) * 1.9;

  // Hill 4: Tunnel cliff mound behind (-16.5, -16.5)
  const dTunnelMound = Math.hypot(x + 16.5, z + 16.5);
  const tunnelMound = (1 - smoothstep(2.8, 7.0, dTunnelMound)) * 4.1;
  const { dist: canalDist } = distanceToCanalAxis(x, z);
  const mouthCarve = canalDist < 3.4 && x > -14.8 && z > -14.8 ? 0 : 1;

  // Gentle outer rim
  const edgeDist = Math.max(Math.abs(x), Math.abs(z));
  const rimLift = smoothstep(28.5, 36.5, edgeDist) * 1.6;

  h += gentleNoise + hillLounge + hillOverlook + hillEastLedge + tunnelMound * mouthCarve + rimLift;

  // Keep sandy trail smoothly graded so character walks cleanly
  const tDist = distanceToTrail(x, z);
  if (tDist < 2.8) {
    const trailFlatten = 1 - smoothstep(1.2, 2.8, tDist);
    // Blend gently toward base slope without abrupt trenches
    h = h * (1 - trailFlatten * 0.35);
  }

  // Flatten plaza around Kafe Senja & Kios Jamur
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

export interface WorldPropsLayout {
  trees: TreeSpec[];
  rocks: RockSpec[];
}

export function generateWorldProps(): WorldPropsLayout {
  const rand = mulberry32(20261122);
  const trees: TreeSpec[] = [];
  const rocks: RockSpec[] = [];

  const isReserved = (x: number, z: number, pad = 2.4): boolean => {
    if (Math.abs(x) > 33.5 || Math.abs(z) > 33.5) return true;
    const { dist } = distanceToCanalAxis(x, z);
    if (dist < 3.5 + pad * 0.35) return true;
    if (Math.hypot(x - 9.5, z - 9.5) < 6.7 + pad * 0.35) return true;
    if (isBridgeDeck(x, z)) return true;
    if (isOnCobblePath(x, z)) return true;
    if (distanceToTrail(x, z) < 2.65) return true;

    for (const lm of LANDMARKS) {
      const clearRadius = lm.id === 'cafe' ? 6.4 : lm.id === 'lounge' ? 5.6 : 4.4;
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

    return false;
  };

  // Curated hero pine on top-right ledge (19.5, -15.5) like reference
  trees.push({
    x: 19.5,
    z: -15.8,
    kind: 'pine',
    scale: 1.12,
    rotation: 0.4,
    tintIndex: 0,
  });

  for (let attempt = 0; attempt < 900 && trees.length < 155; attempt++) {
    const x = (rand() * 2 - 1) * 32.5;
    const z = (rand() * 2 - 1) * 32.5;
    if (isReserved(x, z)) continue;

    const edgeBias = Math.max(Math.abs(x), Math.abs(z)) / 32.5;
    const keepChance = edgeBias > 0.65 ? 0.85 : 0.3;
    if (rand() > keepChance) continue;

    let tooClose = false;
    for (const t of trees) {
      if (Math.hypot(x - t.x, z - t.z) < 2.65) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    trees.push({
      x,
      z,
      kind: rand() > 0.35 ? 'pine' : 'round',
      scale: 0.86 + rand() * 0.32,
      rotation: rand() * Math.PI * 2,
      tintIndex: Math.floor(rand() * 4),
    });
  }

  for (let attempt = 0; attempt < 220 && rocks.length < 32; attempt++) {
    const x = (rand() * 2 - 1) * 30.5;
    const z = (rand() * 2 - 1) * 30.5;
    if (isReserved(x, z, 1.5)) continue;

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
