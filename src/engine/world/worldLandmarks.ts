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

export const JURO_BED_POS = {
  x: -15.35,
  y: 1.42,
  z: 4.0,
  platformId: "bukit-santai",
} as const;

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

export const JURO_BENCH_POS = {
  x: 6.0,
  z: 20.6,
  seatY: 2.27,
  rotY: Math.PI,
  platformId: "pos-pandang",
} as const;

export const JURO_TRAMPOLINE_POS = {
  x: -6.2,
  z: -15.5,
  scale: 1.24,
  surfaceY: 1.12,
  label: "Trampolin Jamur",
} as const;

export const JURO_SHOP_POS = {
  x: 13.4,
  z: -0.6,
  label: "WARUNG & Kios Jamur",
} as const;

export const JURO_MINE_POS = {
  x: -10.5,
  z: -10.5,
  label: "Gerbang Tambang",
} as const;

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
