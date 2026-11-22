import {
  FENCE_SPECS,
  GRID_RES,
  HALF_WORLD,
  MAP_OBSTACLES,
  type RockSpec,
  STUMP_SPECS,
  type TreeSpec,
  distanceToCanalAxis,
  generateWorldProps,
  isBridgeDeck,
  isInCanalOrPond,
  isOnCobblePath,
  isOnTrail,
} from "./mapTerrain";

export interface GridPoint {
  gx: number;
  gz: number;
}

export interface WorldPoint {
  x: number;
  z: number;
}

export type NavCellKind = "grass" | "trail" | "cobble" | "bridge" | "water" | "blocked";

export interface NavGrid {
  size: number;
  walkable: Uint8Array;
  cost: Float32Array;
  kind: NavCellKind[];
}

export function worldToGrid(x: number, z: number): GridPoint {
  const gx = Math.max(0, Math.min(GRID_RES - 1, Math.floor(x + HALF_WORLD)));
  const gz = Math.max(0, Math.min(GRID_RES - 1, Math.floor(z + HALF_WORLD)));
  return { gx, gz };
}

export function gridToWorld(gx: number, gz: number): WorldPoint {
  return {
    x: gx - HALF_WORLD + 0.5,
    z: gz - HALF_WORLD + 0.5,
  };
}

export function buildNavGrid(trees: TreeSpec[], rocks: RockSpec[]): NavGrid {
  const size = GRID_RES;
  const total = size * size;
  const walkable = new Uint8Array(total);
  const cost = new Float32Array(total);
  const kind: NavCellKind[] = new Array(total);

  for (let gz = 0; gz < size; gz++) {
    for (let gx = 0; gx < size; gx++) {
      const idx = gz * size + gx;
      const { x, z } = gridToWorld(gx, gz);

      // Outer world boundary
      if (Math.abs(x) > 32.5 || Math.abs(z) > 32.5) {
        walkable[idx] = 0;
        cost[idx] = 999;
        kind[idx] = "blocked";
        continue;
      }

      // Wooden Footbridge crossing over the canal: ALWAYS WALKABLE!
      if (isBridgeDeck(x, z)) {
        walkable[idx] = 1;
        cost[idx] = 0.65;
        kind[idx] = "bridge";
        continue;
      }

      // Water bodies: CANNOT WALK OR SWIM IN WATER!
      if (isInCanalOrPond(x, z)) {
        walkable[idx] = 0;
        cost[idx] = 999;
        kind[idx] = "water";
        continue;
      }

      const { dist: cDist } = distanceToCanalAxis(x, z);
      const pondDist = Math.hypot(x - 9.5, z - 9.5);
      if (cDist < 2.55 || pondDist < 5.45) {
        walkable[idx] = 0;
        cost[idx] = 999;
        kind[idx] = "water";
        continue;
      }

      // Trail & Cobble paths have lower cost to encourage natural path following
      if (isOnTrail(x, z)) {
        walkable[idx] = 1;
        cost[idx] = 0.72;
        kind[idx] = "trail";
      } else if (isOnCobblePath(x, z)) {
        walkable[idx] = 1;
        cost[idx] = 0.8;
        kind[idx] = "cobble";
      } else {
        walkable[idx] = 1;
        cost[idx] = 1.05;
        kind[idx] = "grass";
      }
    }
  }

  const blockRadius = (wx: number, wz: number, r: number) => {
    const minGx = Math.max(0, Math.floor(wx - r + HALF_WORLD));
    const maxGx = Math.min(size - 1, Math.floor(wx + r + HALF_WORLD));
    const minGz = Math.max(0, Math.floor(wz - r + HALF_WORLD));
    const maxGz = Math.min(size - 1, Math.floor(wz + r + HALF_WORLD));
    for (let gz = minGz; gz <= maxGz; gz++) {
      for (let gx = minGx; gx <= maxGx; gx++) {
        const p = gridToWorld(gx, gz);
        if (Math.hypot(p.x - wx, p.z - wz) <= r) {
          const idx = gz * size + gx;
          // Never block bridge deck with obstacle margins
          if (kind[idx] !== "bridge") {
            walkable[idx] = 0;
            cost[idx] = 999;
            kind[idx] = "blocked";
          }
        }
      }
    }
  };

  // Block obstacles from navigation grid
  for (const t of trees) blockRadius(t.x, t.z, 0.92 * t.scale);
  for (const r of rocks) blockRadius(r.x, r.z, 0.85 * r.scale);
  for (const s of STUMP_SPECS) blockRadius(s.x, s.z, 0.78 * s.scale);
  for (const f of FENCE_SPECS) blockRadius(f.x, f.z, 1.35);

  // Static key obstacles (excluding mattress, bench seat, trampoline top so Juro can approach them)
  for (const obs of MAP_OBSTACLES) {
    if (obs.tag === "bed-frame" || obs.tag === "bench" || obs.tag === "trampoline") {
      continue;
    }
    blockRadius(obs.x, obs.z, obs.radius * 0.85);
  }

  return { size, walkable, cost, kind };
}

let cachedNavGrid: NavGrid | null = null;

export function getGlobalNavGrid(): NavGrid {
  if (!cachedNavGrid) {
    const props = generateWorldProps();
    cachedNavGrid = buildNavGrid(props.trees, props.rocks);
  }
  return cachedNavGrid;
}

function findNearestWalkable(grid: NavGrid, start: GridPoint): GridPoint | null {
  const { size, walkable } = grid;
  if (walkable[start.gz * size + start.gx] === 1) return start;

  for (let radius = 1; radius <= 8; radius++) {
    let best: GridPoint | null = null;
    let bestDist = Infinity;
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = start.gx + dx;
        const nz = start.gz + dz;
        if (nx < 0 || nz < 0 || nx >= size || nz >= size) continue;
        if (walkable[nz * size + nx] === 1) {
          const d = dx * dx + dz * dz;
          if (d < bestDist) {
            bestDist = d;
            best = { gx: nx, gz: nz };
          }
        }
      }
    }
    if (best) return best;
  }
  return null;
}

export function hasLineOfSight(grid: NavGrid, a: WorldPoint, b: WorldPoint): boolean {
  // Do NOT allow line-of-sight shortcuts that skip across the canal from one bank to another!
  // Juro must explicitly step onto the bridge and cross through the bridge waypoints.
  const aOnBridge = isBridgeDeck(a.x, a.z);
  const bOnBridge = isBridgeDeck(b.x, b.z);
  if (!aOnBridge && !bOnBridge) {
    const sideA = a.x - a.z > 0;
    const sideB = b.x - b.z > 0;
    if (sideA !== sideB) {
      return false;
    }
  }

  const dist = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.ceil(dist * 3.5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = a.x + (b.x - a.x) * t;
    const z = a.z + (b.z - a.z) * t;
    const g = worldToGrid(x, z);
    if (grid.walkable[g.gz * grid.size + g.gx] === 0) {
      return false;
    }
  }
  return true;
}

/**
 * A* Pathfinding that guarantees Juro NEVER steps into water and MUST cross via the Wooden Bridge
 * when traveling between the west and east sides of the valley.
 */
export function findPath(grid: NavGrid, from: WorldPoint, to: WorldPoint): WorldPoint[] {
  const startRaw = worldToGrid(from.x, from.z);
  const endRaw = worldToGrid(to.x, to.z);

  const start = findNearestWalkable(grid, startRaw);
  const goal = findNearestWalkable(grid, endRaw);
  if (!start || !goal) return [];

  const size = grid.size;
  const total = size * size;
  const startIdx = start.gz * size + start.gx;
  const goalIdx = goal.gz * size + goal.gx;

  if (startIdx === goalIdx) {
    return [{ x: to.x, z: to.z }];
  }

  const gScore = new Float32Array(total).fill(Infinity);
  const fScore = new Float32Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const inOpen = new Uint8Array(total);

  const openList: number[] = [startIdx];
  inOpen[startIdx] = 1;
  gScore[startIdx] = 0;
  fScore[startIdx] = Math.hypot(goal.gx - start.gx, goal.gz - start.gz);

  const dirs = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2],
  ];

  while (openList.length > 0) {
    let bestPos = 0;
    let bestF = fScore[openList[0]];
    for (let i = 1; i < openList.length; i++) {
      const f = fScore[openList[i]];
      if (f < bestF) {
        bestF = f;
        bestPos = i;
      }
    }
    const current = openList[bestPos];
    openList[bestPos] = openList[openList.length - 1];
    openList.pop();
    inOpen[current] = 0;

    if (current === goalIdx) {
      const rawWorld: WorldPoint[] = [];
      let cur = current;
      while (cur !== -1 && cur !== startIdx) {
        const cx = cur % size;
        const cz = Math.floor(cur / size);
        rawWorld.push(gridToWorld(cx, cz));
        cur = cameFrom[cur];
      }
      rawWorld.reverse();
      if (rawWorld.length === 0) return [{ x: to.x, z: to.z }];

      const exactGoalGrid = worldToGrid(to.x, to.z);
      if (grid.walkable[exactGoalGrid.gz * size + exactGoalGrid.gx] === 1) {
        rawWorld[rawWorld.length - 1] = { x: to.x, z: to.z };
      }

      // Smooth path with line-of-sight checks so Juro moves naturally
      const fullChain: WorldPoint[] = [from, ...rawWorld];
      const smoothed: WorldPoint[] = [];
      let anchorIdx = 0;
      while (anchorIdx < fullChain.length - 1) {
        let furthest = anchorIdx + 1;
        for (let probe = fullChain.length - 1; probe > anchorIdx + 1; probe--) {
          if (hasLineOfSight(grid, fullChain[anchorIdx], fullChain[probe])) {
            furthest = probe;
            break;
          }
        }
        smoothed.push(fullChain[furthest]);
        anchorIdx = furthest;
      }

      return smoothed;
    }

    closed[current] = 1;
    const cx = current % size;
    const cz = Math.floor(current / size);

    for (let d = 0; d < dirs.length; d++) {
      const dx = dirs[d][0];
      const dz = dirs[d][1];
      const stepDist = dirs[d][2];
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= size || nz >= size) continue;

      const nIdx = nz * size + nx;
      if (closed[nIdx] || grid.walkable[nIdx] === 0) continue;

      if (dx !== 0 && dz !== 0) {
        if (grid.walkable[cz * size + nx] === 0 || grid.walkable[nz * size + cx] === 0) {
          continue;
        }
      }

      const tentativeG = gScore[current] + stepDist * grid.cost[nIdx];
      if (tentativeG < gScore[nIdx]) {
        cameFrom[nIdx] = current;
        gScore[nIdx] = tentativeG;
        const h = Math.hypot(goal.gx - nx, goal.gz - nz);
        fScore[nIdx] = tentativeG + h;
        if (!inOpen[nIdx]) {
          openList.push(nIdx);
          inOpen[nIdx] = 1;
        }
      }
    }
  }

  return [];
}
