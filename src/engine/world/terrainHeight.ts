import {
  FENCE_SPECS,
  ISLAND_RADIUS,
  JURO_TRAMPOLINE_POS,
  LANDMARKS,
  STEPPING_STONES,
  STUMP_SPECS,
  TRAIL_EXTRA,
  TRAIL_POINTS,
  TREE_RING_MAX_RADIUS,
  type RockSpec,
  type TreeSpec,
} from "./worldLandmarks";

/** Deterministic PRNG for procedural terrain props and decorations. */
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

  trees.push({
    x: 19.5,
    z: -15.8,
    kind: "pine",
    scale: 1.12,
    rotation: 0.4,
    tintIndex: 0,
  });

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
