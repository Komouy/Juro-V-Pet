import { describe, it, expect, beforeEach } from "vitest";
import { usePetStore, DEFAULT_FOODS, DEFAULT_TOYS } from "../src/stores/petStore";

describe("Virtual Pet Core & Progression", () => {
  beforeEach(() => {
    usePetStore.setState({
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      hunger: 50,
      energy: 50,
      happiness: 50,
      cleanliness: 50,
      affection: 50,
      recentlyLeveledUp: false,
    });
  });

  it("accumulates XP correctly without level up", () => {
    const leveledUp = usePetStore.getState().addXP(40);
    expect(leveledUp).toBe(false);
    expect(usePetStore.getState().xp).toBe(40);
    expect(usePetStore.getState().level).toBe(1);
  });

  it("triggers level up and updates target XP when threshold is crossed", () => {
    const leveledUp = usePetStore.getState().addXP(120);
    expect(leveledUp).toBe(true);

    const state = usePetStore.getState();
    expect(state.level).toBe(2);
    expect(state.xp).toBe(20); // 120 - 100 = 20 rollover
    expect(state.xpToNextLevel).toBe(200); // 2 * 100 = 200
    expect(state.recentlyLeveledUp).toBe(true);
  });

  it("feedWithItem applies food-specific bonuses and adds XP", () => {
    const melon = DEFAULT_FOODS[2]; // Potongan Melon Embun (+40 hunger, +18 happiness, +15 energy, +35 xp)
    usePetStore.getState().feedWithItem(melon);

    const state = usePetStore.getState();
    expect(state.hunger).toBe(90); // 50 + 40
    expect(state.happiness).toBe(68); // 50 + 18
    expect(state.energy).toBe(65); // 50 + 15
    expect(state.xp).toBe(35);
    expect(state.currentState).toBe("eating");
  });

  it("playWithItem applies toy bonuses and reduces energy", () => {
    const ball = DEFAULT_TOYS[0]; // Bola Pantul (+20 happy, +8 affection, -12 energy, +20 xp)
    usePetStore.getState().playWithItem(ball);

    const state = usePetStore.getState();
    expect(state.happiness).toBe(70);
    expect(state.affection).toBe(58);
    expect(state.energy).toBe(38); // 50 - 12
    expect(state.xp).toBe(20);
    expect(state.currentState).toBe("play");
  });

  it("sleep action restores energy and sets sleep state", () => {
    usePetStore.getState().sleep();
    const state = usePetStore.getState();
    expect(state.energy).toBe(85); // 50 + 35
    expect(state.currentState).toBe("sleep");
  });

  it("clean action restores cleanliness and boosts affection", () => {
    usePetStore.getState().clean();
    const state = usePetStore.getState();
    expect(state.cleanliness).toBe(85); // 50 + 35
    expect(state.affection).toBe(55); // 50 + 5
    expect(state.currentState).toBe("happy");
  });
});
