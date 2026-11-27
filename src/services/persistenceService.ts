import { db, type PetSaveRecord, type GameSaveRecord, type PreferencesSaveRecord } from "./db";
import { usePetStore } from "../stores/petStore";
import { useGameStore } from "../stores/gameStore";
import { useUIStore } from "../stores/uiStore";
import { useCaregiverStore } from "../stores/caregiverStore";
import {
  CRYSTAL_CATALOG,
  DEFAULT_CRYSTALS,
  DEFAULT_FOOD_INVENTORY,
  DEFAULT_OWNED_TOYS,
  DEFAULT_UNLOCKED_HATS,
  DEFAULT_UNLOCKED_SKINS,
  HAT_CATALOG,
  SHOP_FOODS,
  SHOP_TOYS,
  SKIN_CATALOG,
  type CrystalId,
} from "../data/economyCatalog";
import {
  MAX_MINING_STAMINA,
  generateMineFloor,
  isValidMineBoard,
} from "../engine/mining/mineGenerator";
import {
  clearChatHistory,
  getPetMemories,
  setPetMemories,
  syncAndMergeMemories,
} from "./petMemoryService";

function safeNum(value: unknown, fallback: number, min = 0, max = Infinity): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function sanitizeCrystals(raw: unknown): Record<CrystalId, number> {
  const result: Record<CrystalId, number> = { ...DEFAULT_CRYSTALS };
  if (!raw || typeof raw !== "object") return result;
  const source = raw as Record<string, unknown>;
  for (const c of CRYSTAL_CATALOG) {
    result[c.id] = Math.round(safeNum(source[c.id], 0, 0, 999_999));
  }
  return result;
}

function sanitizeFoodInventory(raw: unknown): Record<string, number> {
  const result: Record<string, number> = { ...DEFAULT_FOOD_INVENTORY };
  if (!raw || typeof raw !== "object") return result;
  const source = raw as Record<string, unknown>;
  for (const f of SHOP_FOODS) {
    const fallback = DEFAULT_FOOD_INVENTORY[f.id] ?? 0;
    result[f.id] = Math.round(safeNum(source[f.id], fallback, 0, 9999));
  }
  return result;
}

function sanitizeOwnedToys(raw: unknown): string[] {
  const validIds = new Set(SHOP_TOYS.map((t) => t.id));
  if (!Array.isArray(raw)) return [...DEFAULT_OWNED_TOYS];
  const filtered = raw.filter(
    (id): id is string => typeof id === "string" && validIds.has(id)
  );
  return Array.from(new Set([...DEFAULT_OWNED_TOYS, ...filtered]));
}

function sanitizeUnlockedSkins(raw: unknown): string[] {
  const validIds = new Set(SKIN_CATALOG.map((s) => s.id));
  if (!Array.isArray(raw)) return [...DEFAULT_UNLOCKED_SKINS];
  const filtered = raw.filter(
    (id): id is string => typeof id === "string" && validIds.has(id)
  );
  return Array.from(new Set([...DEFAULT_UNLOCKED_SKINS, ...filtered]));
}

function sanitizeUnlockedHats(raw: unknown): string[] {
  const validIds = new Set(HAT_CATALOG.map((h) => h.id));
  if (!Array.isArray(raw)) return [...DEFAULT_UNLOCKED_HATS];
  const filtered = raw.filter(
    (id): id is string => typeof id === "string" && validIds.has(id)
  );
  return Array.from(new Set([...DEFAULT_UNLOCKED_HATS, ...filtered]));
}

class PersistenceService {
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private isInitialized = false;
  private isHydrated = false;

  public isReady(): boolean {
    return this.isHydrated;
  }

  // Initialize and load saved state from IndexedDB
  async initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // 1. Load Pet State
      const savedPet = await db.pets.get("current");
      if (savedPet) {
        usePetStore.setState({
          name: savedPet.name,
          level: savedPet.level,
          xp: savedPet.xp,
          xpToNextLevel: savedPet.xpToNextLevel,
          hunger: savedPet.hunger,
          energy: savedPet.energy,
          happiness: savedPet.happiness,
          cleanliness: savedPet.cleanliness,
          affection: savedPet.affection,
          lastPosition: savedPet.lastPosition,
          lastUpdated: savedPet.lastUpdated,
        });

        // Recalculate needs based on timestamp delta
        usePetStore.getState().recalculateFromTimestamp();
      }

      // 2. Load Game State (with safe migration defaults for economy/inventory/skin fields)
      const savedGame = await db.game.get("current");
      if (savedGame) {
        const rawSkins = savedGame.unlockedSkins ?? savedGame.unlockedCases;
        const unlockedSkins = sanitizeUnlockedSkins(rawSkins);
        const activeSkin =
          savedGame.activeSkin && unlockedSkins.includes(savedGame.activeSkin)
            ? savedGame.activeSkin
            : "classic-orange";

        const unlockedHats = sanitizeUnlockedHats(savedGame.unlockedHats);
        const activeHat =
          savedGame.activeHat && unlockedHats.includes(savedGame.activeHat)
            ? savedGame.activeHat
            : "hat-none";

        const deepestFloor = Math.round(safeNum(savedGame.deepestFloor, 1, 1));
        const mineFloor = Math.round(safeNum(savedGame.mineFloor, 1, 1, deepestFloor));
        const mineTiles = isValidMineBoard(savedGame.mineTiles)
          ? savedGame.mineTiles
          : generateMineFloor(mineFloor);
        const now = Date.now();

        useGameStore.setState({
          coins: Math.round(safeNum(savedGame.coins, 50, 0)),
          logs: Array.isArray(savedGame.logs) ? savedGame.logs : [],
          crystals: sanitizeCrystals(savedGame.crystals),
          foodInventory: sanitizeFoodInventory(savedGame.foodInventory),
          ownedToys: sanitizeOwnedToys(savedGame.ownedToys),
          unlockedSkins,
          activeSkin,
          unlockedHats,
          activeHat,
          pickaxeLevel: Math.round(safeNum(savedGame.pickaxeLevel, 1, 1, 5)),
          deepestFloor,
          miningStamina: Math.round(
            safeNum(savedGame.miningStamina, MAX_MINING_STAMINA, 0, MAX_MINING_STAMINA)
          ),
          miningStaminaUpdatedAt: safeNum(savedGame.miningStaminaUpdatedAt, now, 0, now),
          mineFloor,
          mineTiles,
          mineResetCooldownUntil: safeNum(savedGame.mineResetCooldownUntil, 0, 0),
        });

        // Restore pet memories from database if available
        if (Array.isArray(savedGame.memories) && savedGame.memories.length > 0) {
          syncAndMergeMemories(savedGame.memories);
        }

        // Recalculate offline mining stamina regeneration
        useGameStore.getState().syncMiningStamina(now);
      }

      // 3. Load Preferences
      const savedPrefs = await db.preferences.get("current");
      if (savedPrefs) {
        useUIStore.setState({
          theme: savedPrefs.theme,
          soundEnabled: savedPrefs.soundEnabled,
        });
        if (savedPrefs.theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }

      // Mark hydration barrier as ready - only now can auto-save safely persist changes
      this.isHydrated = true;

      // Setup Auto-save watchers
      this.attachAutoSaveListeners();
    } catch {
      // IndexedDB fallback safety - ensure barrier still unlocks
      this.isHydrated = true;
    }
  }

  // Save current state to IndexedDB immediately
  async saveNow() {
    // Critical barrier: Never overwrite persistent storage if state has not been hydrated yet
    if (!this.isHydrated) return;

    try {
      const pet = usePetStore.getState();
      const game = useGameStore.getState();
      const ui = useUIStore.getState();

      const petRecord: PetSaveRecord = {
        id: "current",
        name: pet.name,
        level: pet.level,
        xp: pet.xp,
        xpToNextLevel: pet.xpToNextLevel,
        hunger: pet.hunger,
        energy: pet.energy,
        happiness: pet.happiness,
        cleanliness: pet.cleanliness,
        affection: pet.affection,
        lastPosition: pet.lastPosition,
        lastUpdated: Date.now(),
      };

      const gameRecord: GameSaveRecord = {
        id: "current",
        coins: game.coins,
        logs: game.logs,
        unlockedCases: game.unlockedSkins,
        unlockedSkins: game.unlockedSkins,
        activeSkin: game.activeSkin,
        unlockedHats: game.unlockedHats,
        activeHat: game.activeHat,
        crystals: game.crystals,
        foodInventory: game.foodInventory,
        ownedToys: game.ownedToys,
        pickaxeLevel: game.pickaxeLevel,
        deepestFloor: game.deepestFloor,
        miningStamina: game.miningStamina,
        miningStaminaUpdatedAt: game.miningStaminaUpdatedAt,
        mineFloor: game.mineFloor,
        mineTiles: game.mineTiles,
        mineResetCooldownUntil: game.mineResetCooldownUntil,
        memories: getPetMemories(),
      };

      const prefRecord: PreferencesSaveRecord = {
        id: "current",
        theme: ui.theme,
        soundEnabled: ui.soundEnabled,
      };

      await Promise.all([
        db.pets.put(petRecord),
        db.game.put(gameRecord),
        db.preferences.put(prefRecord),
      ]);
    } catch {
      // Storage safety
    }
  }

  // Debounced auto-save (triggers 1 second after user actions settle)
  triggerDebouncedSave() {
    if (!this.isHydrated) return;

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveNow();
    }, 1000);
  }

  private attachAutoSaveListeners() {
    // Watch store changes
    usePetStore.subscribe(() => this.triggerDebouncedSave());
    useGameStore.subscribe(() => this.triggerDebouncedSave());
    useUIStore.subscribe((state, prev) => {
      if (state.theme !== prev.theme || state.soundEnabled !== prev.soundEnabled) {
        this.triggerDebouncedSave();
      }
    });

    // Flush immediately when browser tab hides or closes
    if (typeof window !== "undefined") {
      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          this.saveNow();
        }
      });
      window.addEventListener("beforeunload", () => {
        this.saveNow();
      });
    }
  }

  // Export full save file as JSON
  async exportSaveFile(): Promise<string> {
    this.isHydrated = true;
    await this.saveNow();
    const pet = await db.pets.get("current");
    const game = await db.game.get("current");
    const preferences = await db.preferences.get("current");

    const payload = {
      version: 1,
      exportedAt: Date.now(),
      pet,
      game,
      preferences,
    };

    return JSON.stringify(payload, null, 2);
  }

  // Import and restore save file from JSON
  async importSaveFile(jsonString: string): Promise<boolean> {
    try {
      this.isHydrated = true;
      const data = JSON.parse(jsonString);
      if (!data || !data.pet) return false;

      if (data.pet) {
        const rawPos = data.pet.lastPosition;
        const safeLastPos =
          rawPos &&
          typeof rawPos === "object" &&
          typeof rawPos.x === "number" &&
          Number.isFinite(rawPos.x) &&
          typeof rawPos.y === "number" &&
          Number.isFinite(rawPos.y) &&
          typeof rawPos.z === "number" &&
          Number.isFinite(rawPos.z)
            ? { x: rawPos.x, y: rawPos.y, z: rawPos.z }
            : undefined;
        const sanitizedPet: PetSaveRecord = {
          id: "current",
          name: typeof data.pet.name === "string" && data.pet.name.trim() ? data.pet.name.trim() : "Juro",
          level: Math.round(safeNum(data.pet.level, 1, 1)),
          xp: Math.round(safeNum(data.pet.xp, 0, 0)),
          xpToNextLevel: Math.round(safeNum(data.pet.xpToNextLevel, 100, 10)),
          hunger: safeNum(data.pet.hunger, 80, 0, 100),
          energy: safeNum(data.pet.energy, 70, 0, 100),
          happiness: safeNum(data.pet.happiness, 90, 0, 100),
          cleanliness: safeNum(data.pet.cleanliness, 85, 0, 100),
          affection: safeNum(data.pet.affection, 50, 0, 100),
          lastPosition: safeLastPos,
          lastUpdated: Date.now(),
        };
        await db.pets.put(sanitizedPet);
        usePetStore.setState({
          name: sanitizedPet.name,
          level: sanitizedPet.level,
          xp: sanitizedPet.xp,
          xpToNextLevel: sanitizedPet.xpToNextLevel,
          hunger: sanitizedPet.hunger,
          energy: sanitizedPet.energy,
          happiness: sanitizedPet.happiness,
          cleanliness: sanitizedPet.cleanliness,
          affection: sanitizedPet.affection,
          lastPosition: sanitizedPet.lastPosition,
          lastUpdated: sanitizedPet.lastUpdated,
        });
      }

      if (data.game) {
        const rawSkins = data.game.unlockedSkins ?? data.game.unlockedCases;
        const unlockedSkins = sanitizeUnlockedSkins(rawSkins);
        const activeSkin =
          typeof data.game.activeSkin === "string" && unlockedSkins.includes(data.game.activeSkin)
            ? data.game.activeSkin
            : "classic-orange";

        const unlockedHats = sanitizeUnlockedHats(data.game.unlockedHats);
        const activeHat =
          typeof data.game.activeHat === "string" && unlockedHats.includes(data.game.activeHat)
            ? data.game.activeHat
            : "hat-none";

        const deepestFloor = Math.round(safeNum(data.game.deepestFloor, 1, 1));
        const mineFloor = Math.round(safeNum(data.game.mineFloor, 1, 1, deepestFloor));
        const mineTiles = isValidMineBoard(data.game.mineTiles)
          ? data.game.mineTiles
          : generateMineFloor(mineFloor);
        const now = Date.now();

        const sanitizedGame: GameSaveRecord = {
          id: "current",
          coins: Math.round(safeNum(data.game.coins, 50, 0)),
          logs: Array.isArray(data.game.logs) ? data.game.logs : [],
          unlockedCases: unlockedSkins,
          unlockedSkins,
          activeSkin,
          unlockedHats,
          activeHat,
          crystals: sanitizeCrystals(data.game.crystals),
          foodInventory: sanitizeFoodInventory(data.game.foodInventory),
          ownedToys: sanitizeOwnedToys(data.game.ownedToys),
          pickaxeLevel: Math.round(safeNum(data.game.pickaxeLevel, 1, 1, 5)),
          deepestFloor,
          miningStamina: Math.round(
            safeNum(data.game.miningStamina, MAX_MINING_STAMINA, 0, MAX_MINING_STAMINA)
          ),
          miningStaminaUpdatedAt: safeNum(data.game.miningStaminaUpdatedAt, now, 0, now),
          mineFloor,
          mineTiles,
          mineResetCooldownUntil: safeNum(data.game.mineResetCooldownUntil, 0, 0),
          memories: Array.isArray(data.game.memories) ? data.game.memories : getPetMemories(),
        };

        await db.game.put(sanitizedGame);
        if (Array.isArray(data.game.memories)) {
          setPetMemories(data.game.memories);
        }
        useGameStore.setState({
          coins: sanitizedGame.coins,
          logs: sanitizedGame.logs,
          crystals: sanitizedGame.crystals!,
          foodInventory: sanitizedGame.foodInventory!,
          ownedToys: sanitizedGame.ownedToys!,
          unlockedSkins,
          activeSkin,
          unlockedHats,
          activeHat,
          pickaxeLevel: sanitizedGame.pickaxeLevel!,
          deepestFloor: sanitizedGame.deepestFloor!,
          miningStamina: sanitizedGame.miningStamina!,
          miningStaminaUpdatedAt: sanitizedGame.miningStaminaUpdatedAt!,
          mineFloor: sanitizedGame.mineFloor!,
          mineTiles: sanitizedGame.mineTiles!,
          mineResetCooldownUntil: sanitizedGame.mineResetCooldownUntil!,
        });
      }

      if (data.preferences && typeof data.preferences === "object") {
        const safeTheme = data.preferences.theme === "dark" ? "dark" : "light";
        const safeSound =
          typeof data.preferences.soundEnabled === "boolean"
            ? data.preferences.soundEnabled
            : true;

        await db.preferences.put({
          id: "current",
          theme: safeTheme,
          soundEnabled: safeSound,
        });
        useUIStore.setState({
          theme: safeTheme,
          soundEnabled: safeSound,
        });
        if (typeof document !== "undefined") {
          if (safeTheme === "dark") {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  // Reset all local database records
  async resetAll(): Promise<void> {
    await Promise.all([db.pets.clear(), db.game.clear(), db.preferences.clear()]);
    usePetStore.setState({
      name: "Juro",
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      hunger: 80,
      energy: 70,
      happiness: 90,
      cleanliness: 85,
      affection: 50,
      currentState: "idle",
      currentFoodBeingEaten: null,
      currentToyBeingPlayed: null,
      lastPosition: undefined,
      lastUpdated: Date.now(),
      recentlyLeveledUp: false,
      pendingEvolutionAlert: null,
    });
    useGameStore.setState({
      coins: 50,
      logs: [],
      crystals: { ...DEFAULT_CRYSTALS },
      foodInventory: { ...DEFAULT_FOOD_INVENTORY },
      ownedToys: [...DEFAULT_OWNED_TOYS],
      unlockedSkins: [...DEFAULT_UNLOCKED_SKINS],
      activeSkin: "classic-orange",
      unlockedHats: [...DEFAULT_UNLOCKED_HATS],
      activeHat: "hat-none",
      pickaxeLevel: 1,
      deepestFloor: 1,
      miningStamina: MAX_MINING_STAMINA,
      miningStaminaUpdatedAt: Date.now(),
      mineFloor: 1,
      mineTiles: generateMineFloor(1),
      mineResetCooldownUntil: 0,
    });
    setPetMemories([]);
    clearChatHistory();
    useUIStore.getState().resetIntro();
    useCaregiverStore.getState().resetProfile();
    await this.saveNow();
  }
}

export const persistenceService = new PersistenceService();
