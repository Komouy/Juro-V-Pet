import { create } from "zustand";
import {
  CRYSTAL_CATALOG,
  DEFAULT_CRYSTALS,
  DEFAULT_FOOD_INVENTORY,
  DEFAULT_OWNED_TOYS,
  DEFAULT_UNLOCKED_SKINS,
  PICKAXE_TIERS,
  SHOP_FOODS,
  SHOP_TOYS,
  SKIN_CATALOG,
  getCrystalById,
  getPickaxeTier,
  type CrystalId,
} from "../data/economyCatalog";
import {
  MAX_MINING_STAMINA,
  MINE_RESET_COOLDOWN_MS,
  MINE_RESET_COST,
  MIN_TILES_DUG_TO_REROLL_SAME_FLOOR,
  STAMINA_REGEN_MS,
  generateMineFloor,
  type MineTile,
} from "../engine/mining/mineGenerator";

export interface ActivityLog {
  id: string;
  type: "feed" | "play" | "sleep" | "clean" | "interaction";
  message: string;
  timestamp: number;
}

export type DigTileResult =
  | { ok: false; reason: "invalid" | "already-dug" | "no-stamina" }
  | { ok: true; outcome: "hit"; tile: MineTile; damage: number }
  | { ok: true; outcome: "empty"; tile: MineTile; damage: number }
  | { ok: true; outcome: "ladder"; tile: MineTile; damage: number }
  | {
      ok: true;
      outcome: "crystal";
      tile: MineTile;
      damage: number;
      crystalId: CrystalId;
      qty: number;
      gotBonus: boolean;
    };

export type ResetFloorResult =
  | { ok: true; floor: number }
  | {
      ok: false;
      reason: "invalid-floor" | "same-floor-unfinished" | "cooldown" | "no-stamina";
      remainingMs?: number;
      cost?: number;
    };

interface GameState {
  coins: number;
  logs: ActivityLog[];
  crystals: Record<CrystalId, number>;
  foodInventory: Record<string, number>;
  ownedToys: string[];
  unlockedSkins: string[];
  activeSkin: string;
  pickaxeLevel: number;
  deepestFloor: number;

  // Persisted Mining State (anti-refresh / anti-reset-spam)
  miningStamina: number;
  miningStaminaUpdatedAt: number;
  mineFloor: number;
  mineTiles: MineTile[];
  mineResetCooldownUntil: number;

  // Core actions
  addLog: (type: ActivityLog["type"], message: string) => void;
  addCoins: (amount: number) => void;

  // Mining & Crystal Market actions
  addCrystal: (id: CrystalId, amount?: number) => void;
  sellCrystal: (id: CrystalId, amount?: number) => number;
  sellAllCrystals: () => number;
  recordFloorReached: (floor: number) => void;
  syncMiningStamina: (now?: number) => void;
  digMineTile: (tileId: number, now?: number) => DigTileResult;
  descendMineFloor: () => number | null;
  resetMineToFloor: (targetFloor: number, now?: number) => ResetFloorResult;

  // Shop & Inventory actions
  buyFood: (foodId: string, quantity?: number) => boolean;
  consumeFood: (foodId: string) => boolean;
  buyToy: (toyId: string) => boolean;
  upgradePickaxe: () => boolean;

  // Collection Skins actions
  unlockSkin: (skinId: string) => boolean;
  equipSkin: (skinId: string) => boolean;
}

export const useGameStore = create<GameState>((set, get) => ({
  coins: 50,
  logs: [
    {
      id: "log-1",
      type: "interaction",
      message: "Juro baru saja bangun dan menyapa Anda dengan riang.",
      timestamp: Date.now() - 1000 * 60 * 5,
    },
  ],
  crystals: { ...DEFAULT_CRYSTALS },
  foodInventory: { ...DEFAULT_FOOD_INVENTORY },
  ownedToys: [...DEFAULT_OWNED_TOYS],
  unlockedSkins: [...DEFAULT_UNLOCKED_SKINS],
  activeSkin: "classic-orange",
  pickaxeLevel: 1,
  deepestFloor: 1,
  miningStamina: MAX_MINING_STAMINA,
  miningStaminaUpdatedAt: Date.now(),
  mineFloor: 1,
  mineTiles: generateMineFloor(1),
  mineResetCooldownUntil: 0,

  addLog: (type, message) =>
    set((s) => ({
      logs: [
        {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type,
          message,
          timestamp: Date.now(),
        },
        ...s.logs.slice(0, 19),
      ],
    })),

  addCoins: (amount) => set((s) => ({ coins: Math.max(0, s.coins + amount) })),

  addCrystal: (id, amount = 1) => {
    if (amount <= 0) return;
    set((s) => ({
      crystals: {
        ...s.crystals,
        [id]: (s.crystals[id] ?? 0) + amount,
      },
    }));
  },

  sellCrystal: (id, amount = 1) => {
    const state = get();
    const owned = state.crystals[id] ?? 0;
    const sellQty = Math.min(owned, Math.max(0, amount));
    if (sellQty <= 0) return 0;

    const crystal = getCrystalById(id);
    const earned = sellQty * crystal.sellPrice;

    set((s) => ({
      coins: s.coins + earned,
      crystals: {
        ...s.crystals,
        [id]: Math.max(0, (s.crystals[id] ?? 0) - sellQty),
      },
    }));

    return earned;
  },

  sellAllCrystals: () => {
    const state = get();
    let totalEarned = 0;

    for (const c of CRYSTAL_CATALOG) {
      const qty = state.crystals[c.id] ?? 0;
      totalEarned += qty * c.sellPrice;
    }

    if (totalEarned <= 0) return 0;

    set((s) => ({
      coins: s.coins + totalEarned,
      crystals: { ...DEFAULT_CRYSTALS },
    }));

    return totalEarned;
  },

  recordFloorReached: (floor) =>
    set((s) => ({
      deepestFloor: Math.max(s.deepestFloor, floor),
    })),

  syncMiningStamina: (now = Date.now()) => {
    const state = get();
    if (state.miningStamina >= MAX_MINING_STAMINA) {
      if (state.miningStamina > MAX_MINING_STAMINA || state.miningStaminaUpdatedAt > now) {
        set({
          miningStamina: MAX_MINING_STAMINA,
          miningStaminaUpdatedAt: now,
        });
      }
      return;
    }

    // Guard against system clock shifting backwards
    if (state.miningStaminaUpdatedAt > now) {
      set({ miningStaminaUpdatedAt: now });
      return;
    }

    const elapsed = now - state.miningStaminaUpdatedAt;
    const gained = Math.floor(elapsed / STAMINA_REGEN_MS);
    if (gained <= 0) return;

    const nextStamina = Math.min(MAX_MINING_STAMINA, state.miningStamina + gained);
    const nextUpdatedAt =
      nextStamina >= MAX_MINING_STAMINA
        ? now
        : state.miningStaminaUpdatedAt + gained * STAMINA_REGEN_MS;

    set({
      miningStamina: nextStamina,
      miningStaminaUpdatedAt: nextUpdatedAt,
    });
  },

  digMineTile: (tileId, now = Date.now()) => {
    // Always sync time-based regeneration first
    get().syncMiningStamina(now);
    const state = get();
    const tile = state.mineTiles[tileId];
    if (!tile) return { ok: false, reason: "invalid" };
    if (tile.dug) return { ok: false, reason: "already-dug" };
    if (state.miningStamina < 1) return { ok: false, reason: "no-stamina" };

    const pickaxe = getPickaxeTier(state.pickaxeLevel);
    const nextHp = Math.max(0, tile.hp - pickaxe.power);
    const broken = nextHp === 0;

    // Start regen timer when dropping from full; preserve partial progress when already regenerating
    const nextStamina = state.miningStamina - 1;
    const nextUpdatedAt =
      state.miningStamina >= MAX_MINING_STAMINA ? now : state.miningStaminaUpdatedAt;

    if (!broken) {
      const updatedTile: MineTile = { ...tile, hp: nextHp };
      set((s) => ({
        miningStamina: nextStamina,
        miningStaminaUpdatedAt: nextUpdatedAt,
        mineTiles: s.mineTiles.map((t) => (t.id === tileId ? updatedTile : t)),
      }));
      return { ok: true, outcome: "hit", tile: updatedTile, damage: pickaxe.power };
    }

    const brokenTile: MineTile = {
      ...tile,
      hp: 0,
      dug: true,
      collected: tile.reward.kind === "crystal",
    };

    if (tile.reward.kind === "crystal") {
      const crystalId = tile.reward.crystalId;
      const gotBonus = Math.random() < pickaxe.bonusChance;
      const qty = gotBonus ? 2 : 1;

      set((s) => ({
        miningStamina: nextStamina,
        miningStaminaUpdatedAt: nextUpdatedAt,
        crystals: {
          ...s.crystals,
          [crystalId]: (s.crystals[crystalId] ?? 0) + qty,
        },
        mineTiles: s.mineTiles.map((t) => (t.id === tileId ? brokenTile : t)),
      }));

      return {
        ok: true,
        outcome: "crystal",
        tile: brokenTile,
        damage: pickaxe.power,
        crystalId,
        qty,
        gotBonus,
      };
    }

    set((s) => ({
      miningStamina: nextStamina,
      miningStaminaUpdatedAt: nextUpdatedAt,
      mineTiles: s.mineTiles.map((t) => (t.id === tileId ? brokenTile : t)),
    }));

    if (tile.reward.kind === "ladder") {
      return { ok: true, outcome: "ladder", tile: brokenTile, damage: pickaxe.power };
    }

    return { ok: true, outcome: "empty", tile: brokenTile, damage: pickaxe.power };
  },

  descendMineFloor: () => {
    const state = get();
    const hasRevealedLadder = state.mineTiles.some(
      (t) => t.dug && t.reward.kind === "ladder"
    );
    if (!hasRevealedLadder) return null;

    const nextFloor = state.mineFloor + 1;
    set((s) => ({
      mineFloor: nextFloor,
      deepestFloor: Math.max(s.deepestFloor, nextFloor),
      mineTiles: generateMineFloor(nextFloor),
    }));
    return nextFloor;
  },

  resetMineToFloor: (targetFloor, now = Date.now()) => {
    get().syncMiningStamina(now);
    const state = get();

    if (targetFloor < 1 || targetFloor > state.deepestFloor) {
      return { ok: false, reason: "invalid-floor" };
    }

    // Prevent rerolling the exact same floor before genuinely exploring it
    if (targetFloor === state.mineFloor) {
      const dugCount = state.mineTiles.filter((t) => t.dug).length;
      if (dugCount < MIN_TILES_DUG_TO_REROLL_SAME_FLOOR) {
        return { ok: false, reason: "same-floor-unfinished" };
      }
    }

    if (now < state.mineResetCooldownUntil) {
      return {
        ok: false,
        reason: "cooldown",
        remainingMs: state.mineResetCooldownUntil - now,
      };
    }

    if (state.miningStamina < MINE_RESET_COST) {
      return {
        ok: false,
        reason: "no-stamina",
        cost: MINE_RESET_COST,
      };
    }

    const nextStamina = state.miningStamina - MINE_RESET_COST;
    const nextUpdatedAt =
      state.miningStamina >= MAX_MINING_STAMINA ? now : state.miningStaminaUpdatedAt;

    set({
      miningStamina: nextStamina,
      miningStaminaUpdatedAt: nextUpdatedAt,
      mineFloor: targetFloor,
      mineTiles: generateMineFloor(targetFloor),
      mineResetCooldownUntil: now + MINE_RESET_COOLDOWN_MS,
    });

    return { ok: true, floor: targetFloor };
  },

  buyFood: (foodId, quantity = 1) => {
    if (quantity <= 0) return false;
    const item = SHOP_FOODS.find((f) => f.id === foodId);
    if (!item) return false;

    const totalCost = item.price * quantity;
    const state = get();
    if (state.coins < totalCost) return false;

    set((s) => ({
      coins: s.coins - totalCost,
      foodInventory: {
        ...s.foodInventory,
        [foodId]: (s.foodInventory[foodId] ?? 0) + quantity,
      },
    }));
    return true;
  },

  consumeFood: (foodId) => {
    const state = get();
    const currentStock = state.foodInventory[foodId] ?? 0;
    if (currentStock <= 0) return false;

    set((s) => ({
      foodInventory: {
        ...s.foodInventory,
        [foodId]: Math.max(0, (s.foodInventory[foodId] ?? 0) - 1),
      },
    }));
    return true;
  },

  buyToy: (toyId) => {
    const toy = SHOP_TOYS.find((t) => t.id === toyId);
    if (!toy) return false;

    const state = get();
    if (state.ownedToys.includes(toyId)) return false;
    if (state.coins < toy.price) return false;

    set((s) => ({
      coins: s.coins - toy.price,
      ownedToys: [...s.ownedToys, toyId],
    }));
    return true;
  },

  upgradePickaxe: () => {
    const state = get();
    const nextTier = PICKAXE_TIERS.find((p) => p.level === state.pickaxeLevel + 1);
    if (!nextTier) return false;
    if (state.coins < nextTier.price) return false;

    set((s) => ({
      coins: s.coins - nextTier.price,
      pickaxeLevel: nextTier.level,
    }));
    return true;
  },

  unlockSkin: (skinId) => {
    const skin = SKIN_CATALOG.find((s) => s.id === skinId);
    if (!skin) return false;

    const state = get();
    if (state.unlockedSkins.includes(skinId)) return false;

    if (skin.crystalCost) {
      const { crystalId, amount } = skin.crystalCost;
      const owned = state.crystals[crystalId] ?? 0;
      if (owned < amount) return false;

      set((s) => ({
        crystals: {
          ...s.crystals,
          [crystalId]: Math.max(0, (s.crystals[crystalId] ?? 0) - amount),
        },
        unlockedSkins: [...s.unlockedSkins, skinId],
        activeSkin: skinId,
      }));
      return true;
    }

    set((s) => ({
      unlockedSkins: [...s.unlockedSkins, skinId],
      activeSkin: skinId,
    }));
    return true;
  },

  equipSkin: (skinId) => {
    const state = get();
    if (!state.unlockedSkins.includes(skinId)) return false;
    set({ activeSkin: skinId });
    return true;
  },
}));
