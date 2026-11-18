import { create } from "zustand";
import type { PetMood, PetBehaviorState, PetAttributes, FoodItem, ToyItem } from "../types/pet";

export const DEFAULT_FOODS: FoodItem[] = [
  {
    id: "honey-drop",
    name: "Tetes Madu Hangat",
    desc: "Sirup madu kental manis alami, cepat diserap jeli.",
    hungerRestore: 20,
    happinessGain: 8,
    energyGain: 5,
    xpReward: 15,
  },
  {
    id: "orange-slice",
    name: "Irisan Jeruk Manis",
    desc: "Camilan citrus segar kaya rasa oranye khas Juro.",
    hungerRestore: 30,
    happinessGain: 12,
    energyGain: 10,
    xpReward: 25,
  },
  {
    id: "melon-cubes",
    name: "Potongan Melon Embun",
    desc: "Segar dan renyah, camilan mewah penyejuk suasana.",
    hungerRestore: 40,
    happinessGain: 18,
    energyGain: 15,
    xpReward: 35,
  },
];

export const DEFAULT_TOYS: ToyItem[] = [
  {
    id: "bounce-ball",
    name: "Bola Pantul Karet",
    desc: "Melompat tinggi saat dilempar, melatih refleks Juro.",
    happinessGain: 20,
    affectionGain: 8,
    energyCost: 12,
    xpReward: 20,
  },
  {
    id: "bubble-blower",
    name: "Peniup Gelembung Sabun",
    desc: "Menciptakan gelembung pelangi yang bisa dikejar Juro.",
    happinessGain: 25,
    affectionGain: 12,
    energyCost: 15,
    xpReward: 30,
  },
];

interface PetState {
  name: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  hunger: number;
  energy: number;
  happiness: number;
  cleanliness: number;
  affection: number;
  currentState: PetBehaviorState;
  currentFoodBeingEaten: FoodItem | null;
  lastUpdated: number;
  lastSleepRewardAt: number;
  lastCleanRewardAt: number;

  // Level Up Alert State
  recentlyLeveledUp: boolean;
  clearLevelUpAlert: () => void;

  // Actions
  addXP: (amount: number) => boolean;
  feed: () => void;
  feedWithItem: (food: FoodItem) => void;
  play: () => void;
  playWithItem: (toy: ToyItem) => void;
  sleep: () => void;
  wakeUp: () => void;
  recoverSleepEnergy: (amount?: number) => void;
  clean: () => void;
  setBehaviorState: (state: PetBehaviorState) => void;
  recalculateFromTimestamp: () => void;
  getMood: () => PetMood;
  getAttributes: () => PetAttributes;
}

export const usePetStore = create<PetState>((set, get) => ({
  name: "Juro",
  level: 1,
  xp: 35,
  xpToNextLevel: 100,
  hunger: 80,
  energy: 70,
  happiness: 90,
  cleanliness: 85,
  affection: 50,
  currentState: "idle",
  currentFoodBeingEaten: null,
  lastUpdated: Date.now(),
  lastSleepRewardAt: 0,
  lastCleanRewardAt: 0,
  recentlyLeveledUp: false,

  clearLevelUpAlert: () => set({ recentlyLeveledUp: false }),

  getAttributes: () => {
    const { hunger, energy, happiness, cleanliness, affection } = get();
    return { hunger, energy, happiness, cleanliness, affection };
  },

  getMood: () => {
    const { hunger, energy, cleanliness, happiness, affection } = get();
    if (hunger < 35) return "hungry";
    if (energy < 30) return "sleepy";
    if (cleanliness < 30) return "dirty";
    if (happiness > 80 && affection > 60) return "excited";
    if (happiness > 60) return "happy";
    if (happiness < 40) return "bored";
    return "content";
  },

  addXP: (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const state = get();
    let currentXP = state.xp + Math.round(amount);
    let currentLevel = state.level;
    let targetXP = state.xpToNextLevel;
    let leveledUp = false;

    while (currentXP >= targetXP) {
      currentXP -= targetXP;
      currentLevel += 1;
      targetXP = currentLevel * 100;
      leveledUp = true;
    }

    set({
      xp: currentXP,
      level: currentLevel,
      xpToNextLevel: targetXP,
      recentlyLeveledUp: leveledUp ? true : state.recentlyLeveledUp,
    });

    return leveledUp;
  },

  setBehaviorState: (currentState) =>
    set((s) => ({
      currentState,
      currentFoodBeingEaten: currentState === "eating" ? s.currentFoodBeingEaten : null,
    })),

  feed: () => {
    const food = DEFAULT_FOODS[0];
    get().feedWithItem(food);
  },

  feedWithItem: (food: FoodItem) => {
    set((s) => ({
      hunger: Math.min(100, s.hunger + food.hungerRestore),
      happiness: Math.min(100, s.happiness + food.happinessGain),
      energy: Math.min(100, s.energy + food.energyGain),
      currentState: "eating",
      currentFoodBeingEaten: food,
      lastUpdated: Date.now(),
    }));
    get().addXP(food.xpReward);
  },

  play: () => {
    const toy = DEFAULT_TOYS[0];
    get().playWithItem(toy);
  },

  playWithItem: (toy: ToyItem) => {
    set((s) => ({
      happiness: Math.min(100, s.happiness + toy.happinessGain),
      energy: Math.max(10, s.energy - toy.energyCost),
      affection: Math.min(100, s.affection + toy.affectionGain),
      hunger: Math.max(10, s.hunger - 6),
      currentState: "play",
      lastUpdated: Date.now(),
    }));
    get().addXP(toy.xpReward);
  },

  sleep: () => {
    const state = get();
    if (state.currentState === "sleep") return;

    const now = Date.now();
    const canReward = now - state.lastSleepRewardAt >= 15_000;

    set((s) => ({
      energy: canReward ? Math.min(100, s.energy + 35) : s.energy,
      hunger: canReward ? Math.max(10, s.hunger - 8) : s.hunger,
      currentState: "sleep",
      lastUpdated: now,
      lastSleepRewardAt: canReward ? now : s.lastSleepRewardAt,
    }));

    if (canReward) {
      get().addXP(10);
    }
  },

  wakeUp: () => {
    set({
      currentState: "idle",
      lastUpdated: Date.now(),
    });
  },

  recoverSleepEnergy: (amount = 2) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    set((s) => {
      if (s.currentState !== "sleep" || s.energy >= 100) return s;
      return {
        energy: Math.min(100, s.energy + amount),
        lastUpdated: Date.now(),
      };
    });
  },

  clean: () => {
    const now = Date.now();
    const canRewardXp = now - get().lastCleanRewardAt >= 10_000;

    set((s) => ({
      cleanliness: Math.min(100, s.cleanliness + 35),
      happiness: Math.min(100, s.happiness + 8),
      affection: Math.min(100, s.affection + 5),
      currentState: "happy",
      lastUpdated: now,
      lastCleanRewardAt: canRewardXp ? now : s.lastCleanRewardAt,
    }));

    if (canRewardXp) {
      get().addXP(15);
    }
  },

  recalculateFromTimestamp: () => {
    const { lastUpdated } = get();
    const now = Date.now();
    // Guard against negative elapsed time if system clock shifts backwards
    const hoursAway = Math.max(0, (now - lastUpdated) / (1000 * 60 * 60));

    const decay = Math.min(hoursAway * 2, 40);

    set((s) => ({
      hunger: Math.max(15, s.hunger - decay),
      energy: Math.max(15, s.energy - decay * 0.5),
      happiness: Math.max(25, s.happiness - decay * 0.3),
      cleanliness: Math.max(20, s.cleanliness - decay * 0.7),
      lastUpdated: now,
    }));
  },
}));
