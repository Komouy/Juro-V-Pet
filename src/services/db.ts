import Dexie, { type EntityTable } from "dexie";
import type { ActivityLog } from "../stores/gameStore";
import type { CrystalId } from "../data/economyCatalog";
import type { MineTile } from "../engine/mining/mineGenerator";

export interface PetSaveRecord {
  id: string; // "current"
  name: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  hunger: number;
  energy: number;
  happiness: number;
  cleanliness: number;
  affection: number;
  lastPosition?: { x: number; y: number; z: number };
  lastUpdated: number;
}

export interface GameSaveRecord {
  id: string; // "current"
  coins: number;
  logs: ActivityLog[];
  unlockedCases: string[];
  activeSkin?: string;
  unlockedHats?: string[];
  activeHat?: string;
  crystals?: Record<CrystalId, number>;
  foodInventory?: Record<string, number>;
  ownedToys?: string[];
  pickaxeLevel?: number;
  deepestFloor?: number;
  miningStamina?: number;
  miningStaminaUpdatedAt?: number;
  mineFloor?: number;
  mineTiles?: MineTile[];
  mineResetCooldownUntil?: number;
}

export interface PreferencesSaveRecord {
  id: string; // "current"
  theme: "light" | "dark";
  soundEnabled: boolean;
}

// Dexie IndexedDB Database Instance
class JuroDatabase extends Dexie {
  pets!: EntityTable<PetSaveRecord, "id">;
  game!: EntityTable<GameSaveRecord, "id">;
  preferences!: EntityTable<PreferencesSaveRecord, "id">;

  constructor() {
    super("JuroVirtualPetDB");
    this.version(1).stores({
      pets: "id, lastUpdated",
      game: "id",
      preferences: "id",
    });
  }
}

export const db = new JuroDatabase();
