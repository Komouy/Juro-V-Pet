import type { CrystalId } from "../../data/economyCatalog";

export type RockKind = "dirt" | "stone" | "deep";

export type TileReward =
  | { kind: "empty" }
  | { kind: "ladder" }
  | { kind: "crystal"; crystalId: CrystalId };

export interface MineTile {
  id: number;
  rock: RockKind;
  hp: number;
  maxHp: number;
  dug: boolean;
  reward: TileReward;
  hasGlint: boolean;
  collected: boolean;
}

export const MAX_MINING_STAMINA = 20;
export const STAMINA_REGEN_MS = 25_000; // +1 stamina every 25 seconds
export const MINE_RESET_COST = 3; // stamina cost to reset/jump floor
export const MINE_RESET_COOLDOWN_MS = 30_000; // 30s anti-spam cooldown on floor reset/jump
export const MINE_DIG_COOLDOWN_MS = 220; // matches pickaxe swing animation
export const MIN_TILES_DUG_TO_REROLL_SAME_FLOOR = 15;

const VALID_CRYSTALS = new Set<string>(["quartz", "amber", "emerald", "amethyst"]);
const VALID_ROCKS = new Set<string>(["dirt", "stone", "deep"]);

function rollCrystalForFloor(floor: number): CrystalId {
  const r = Math.random();
  if (floor >= 4) {
    if (r < 0.22) return "amethyst";
    if (r < 0.54) return "emerald";
    if (r < 0.82) return "amber";
    return "quartz";
  }
  if (floor === 3) {
    if (r < 0.12) return "amethyst";
    if (r < 0.42) return "emerald";
    if (r < 0.76) return "amber";
    return "quartz";
  }
  if (floor === 2) {
    if (r < 0.26) return "emerald";
    if (r < 0.64) return "amber";
    return "quartz";
  }
  if (r < 0.3) return "amber";
  return "quartz";
}

export function generateMineFloor(floor: number): MineTile[] {
  const safeFloor = Math.max(1, Math.floor(floor));
  const totalTiles = 25;
  const indices = Array.from({ length: totalTiles }, (_, i) => i);

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }

  const ladderIdx = indices[0];
  // Balanced crystal density: 4 on Lt.1-2, 5 on Lt.3-4, max 6 on Lt.5+
  const crystalCount = Math.min(6, 4 + Math.floor((safeFloor - 1) / 2));
  const crystalIndices = new Set(indices.slice(1, 1 + crystalCount));

  return Array.from({ length: totalTiles }, (_, id) => {
    let reward: TileReward = { kind: "empty" };
    if (id === ladderIdx) {
      reward = { kind: "ladder" };
    } else if (crystalIndices.has(id)) {
      reward = { kind: "crystal", crystalId: rollCrystalForFloor(safeFloor) };
    }

    const roll = Math.random();
    let rock: RockKind = "dirt";
    let maxHp = 1;

    if (safeFloor >= 3 && roll > 0.52) {
      rock = "deep";
      maxHp = 4;
    } else if ((safeFloor >= 2 && roll > 0.32) || roll > 0.58) {
      rock = "stone";
      maxHp = 2 + (safeFloor >= 4 ? 1 : 0);
    } else {
      rock = "dirt";
      maxHp = 1;
    }

    // Subtle glint hint on ~25% of crystal veins so players explore instead of farming glints
    const hasGlint = reward.kind === "crystal" && Math.random() < 0.25;

    return {
      id,
      rock,
      hp: maxHp,
      maxHp,
      dug: false,
      reward,
      hasGlint,
      collected: false,
    };
  });
}

export function isValidMineBoard(tiles: unknown): tiles is MineTile[] {
  if (!Array.isArray(tiles) || tiles.length !== 25) return false;
  return tiles.every((t, idx) => {
    if (!t || typeof t !== "object") return false;
    const tile = t as Record<string, unknown>;
    if (tile.id !== idx) return false;
    if (typeof tile.rock !== "string" || !VALID_ROCKS.has(tile.rock)) return false;
    if (typeof tile.hp !== "number" || !Number.isFinite(tile.hp) || tile.hp < 0) return false;
    if (typeof tile.maxHp !== "number" || !Number.isFinite(tile.maxHp) || tile.maxHp < 1) return false;
    if (typeof tile.dug !== "boolean" || typeof tile.hasGlint !== "boolean") return false;
    if (!tile.reward || typeof tile.reward !== "object") return false;
    const reward = tile.reward as Record<string, unknown>;
    if (reward.kind === "empty" || reward.kind === "ladder") return true;
    if (reward.kind === "crystal" && typeof reward.crystalId === "string" && VALID_CRYSTALS.has(reward.crystalId)) {
      return true;
    }
    return false;
  });
}
