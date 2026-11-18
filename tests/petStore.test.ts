import { describe, it, expect, beforeEach } from "vitest";
import { usePetStore } from "../src/stores/petStore";

describe("usePetStore", () => {
  beforeEach(() => {
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
      lastUpdated: Date.now(),
      lastSleepRewardAt: 0,
      lastCleanRewardAt: 0,
    });
  });

  it("should initialize with default attributes", () => {
    const state = usePetStore.getState();
    expect(state.name).toBe("Juro");
    expect(state.hunger).toBe(80);
    expect(state.happiness).toBe(90);
  });

  it("should increase hunger and happiness when feeding", () => {
    usePetStore.getState().feed();
    const state = usePetStore.getState();
    expect(state.hunger).toBe(100);
    expect(state.happiness).toBe(98);
  });

  it("should increase happiness and decrease energy when playing", () => {
    usePetStore.getState().play();
    const state = usePetStore.getState();
    expect(state.happiness).toBe(100);
    expect(state.energy).toBe(58);
    expect(state.affection).toBe(58);
  });

  it("should restore energy when sleeping", () => {
    usePetStore.setState({ energy: 20 });
    usePetStore.getState().sleep();
    const state = usePetStore.getState();
    expect(state.energy).toBe(55);
  });

  it("should restore cleanliness when cleaning", () => {
    usePetStore.setState({ cleanliness: 30 });
    usePetStore.getState().clean();
    const state = usePetStore.getState();
    expect(state.cleanliness).toBe(65);
  });

  it("should compute mood dynamically based on attribute levels", () => {
    usePetStore.setState({ hunger: 20 });
    expect(usePetStore.getState().getMood()).toBe("hungry");

    usePetStore.setState({ hunger: 90, energy: 15 });
    expect(usePetStore.getState().getMood()).toBe("sleepy");

    usePetStore.setState({ energy: 80, happiness: 95, affection: 75 });
    expect(usePetStore.getState().getMood()).toBe("excited");
  });

  it("blocks rapid sleep/wake toggle spam for infinite energy and XP", () => {
    usePetStore.setState({ energy: 20, xp: 0, currentState: "idle", lastSleepRewardAt: 0 });
    usePetStore.getState().sleep();
    expect(usePetStore.getState().energy).toBe(55);
    expect(usePetStore.getState().xp).toBe(10);

    // Rapid wake -> sleep within cooldown should still sleep without granting extra energy or XP
    usePetStore.getState().wakeUp();
    usePetStore.getState().sleep();
    expect(usePetStore.getState().currentState).toBe("sleep");
    expect(usePetStore.getState().energy).toBe(55);
    expect(usePetStore.getState().xp).toBe(10);

    // Invalid XP amounts are ignored
    expect(usePetStore.getState().addXP(-50)).toBe(false);
    expect(usePetStore.getState().addXP(Number.NaN)).toBe(false);
    expect(usePetStore.getState().xp).toBe(10);
  });
});
