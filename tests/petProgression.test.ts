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
      pendingEvolutionAlert: null,
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

  it("does not trigger evolution alert on standard level ups (e.g. Lv 2)", () => {
    usePetStore.getState().addXP(150);
    const state = usePetStore.getState();
    expect(state.level).toBe(2);
    expect(state.pendingEvolutionAlert).toBeNull();
  });

  it("triggers evolution alert for Stage 2 (Slime Memantul) upon reaching Level 5", () => {
    usePetStore.setState({ level: 4, xp: 350, xpToNextLevel: 400 });
    usePetStore.getState().addXP(60); // Crosses into Level 5

    const state = usePetStore.getState();
    expect(state.level).toBe(5);
    expect(state.pendingEvolutionAlert).not.toBeNull();
    expect(state.pendingEvolutionAlert?.stageNumber).toBe(2);
    expect(state.pendingEvolutionAlert?.stageName).toBe("Slime Memantul");

    usePetStore.getState().clearEvolutionAlert();
    expect(usePetStore.getState().pendingEvolutionAlert).toBeNull();
  });

  it("triggers evolution alert for Stage 3 (Juro Mulia) upon reaching Level 10", () => {
    usePetStore.setState({ level: 9, xp: 880, xpToNextLevel: 900 });
    usePetStore.getState().addXP(50); // Crosses into Level 10

    const state = usePetStore.getState();
    expect(state.level).toBe(10);
    expect(state.pendingEvolutionAlert).not.toBeNull();
    expect(state.pendingEvolutionAlert?.stageNumber).toBe(3);
    expect(state.pendingEvolutionAlert?.stageName).toBe("Juro Mulia");
  });

  it("computes physical growth scale accurately from Level 1 to 10+", () => {
    const calcGrowth = (lvl: number) =>
      Number((0.68 + (Math.min(10, Math.max(1, lvl)) - 1) * (0.52 / 9)).toFixed(3));

    expect(calcGrowth(1)).toBe(0.68);
    expect(calcGrowth(5)).toBeCloseTo(0.911, 2);
    expect(calcGrowth(10)).toBe(1.2);
    expect(calcGrowth(15)).toBe(1.2); // Capped at adult maximum
  });
});
