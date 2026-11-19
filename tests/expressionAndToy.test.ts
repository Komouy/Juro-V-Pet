import { describe, it, expect, beforeEach } from "vitest";
import { usePetStore, DEFAULT_TOYS } from "../src/stores/petStore";
import { useGameStore } from "../src/stores/gameStore";

describe("Dynamic Expressions & Toy Play System", () => {
  beforeEach(() => {
    usePetStore.setState({
      hunger: 80,
      energy: 80,
      happiness: 80,
      cleanliness: 80,
      affection: 80,
      currentState: "idle",
      currentToyBeingPlayed: null,
    });
  });

  it("identifies hungry mood when hunger < 45 with realistic threshold", () => {
    usePetStore.setState({ hunger: 42 });
    expect(usePetStore.getState().getMood()).toBe("hungry");
  });

  it("prioritizes the lowest need when multiple attributes are below threshold", () => {
    // Both hunger (40) and energy (25) are below 45, but energy (25) is lower
    usePetStore.setState({ hunger: 40, energy: 25 });
    expect(usePetStore.getState().getMood()).toBe("sleepy");

    // Hunger is lower than energy
    usePetStore.setState({ hunger: 20, energy: 35 });
    expect(usePetStore.getState().getMood()).toBe("hungry");
  });

  it("identifies sleepy/tired mood when energy < 40", () => {
    usePetStore.setState({ hunger: 80, energy: 25 });
    expect(usePetStore.getState().getMood()).toBe("sleepy");
  });

  it("identifies dirty mood when cleanliness < 30", () => {
    usePetStore.setState({ hunger: 80, energy: 80, cleanliness: 22 });
    expect(usePetStore.getState().getMood()).toBe("dirty");
  });

  it("identifies angry/pouting mood when affection < 35 (lack of affection)", () => {
    usePetStore.setState({ hunger: 80, energy: 80, cleanliness: 80, affection: 25 });
    expect(usePetStore.getState().getMood()).toBe("angry");
  });

  it("identifies bored/jenuh mood when happiness < 35", () => {
    usePetStore.setState({ hunger: 80, energy: 80, cleanliness: 80, affection: 80, happiness: 25 });
    expect(usePetStore.getState().getMood()).toBe("bored");
  });

  it("handles toy play interaction correctly", () => {
    const ball = DEFAULT_TOYS[0];
    usePetStore.getState().playWithItem(ball);

    const state = usePetStore.getState();
    expect(state.currentState).toBe("play");
    expect(state.currentToyBeingPlayed).toEqual(ball);
    expect(state.happiness).toBe(100);

    usePetStore.getState().clearToyBeingPlayed();
    expect(usePetStore.getState().currentToyBeingPlayed).toBeNull();
  });

  it("retains fetch ball in inventory after retrieval so user can throw it again", () => {
    const ball = DEFAULT_TOYS.find((t) => t.id === "bounce-ball")!;
    expect(ball).toBeDefined();

    // Throw / play with ball
    usePetStore.getState().playWithItem(ball);
    expect(usePetStore.getState().currentToyBeingPlayed?.id).toBe("bounce-ball");

    // After Juro catches and returns it to inventory
    usePetStore.getState().clearToyBeingPlayed();
    usePetStore.getState().setBehaviorState("happy");

    const finalState = usePetStore.getState();
    expect(finalState.currentToyBeingPlayed).toBeNull();
    expect(finalState.currentState).toBe("happy");
    // Ball remains in owned toys list
    const hasBall = useGameStore.getState().ownedToys.includes("bounce-ball");
    expect(hasBall).toBe(true);
  });

  it("ensures nocturnal sleepy expression persists from 9 PM (21:00) until morning (06:00)", async () => {
    const { isBedtimeHour, isSleepyHour } = await import("../src/utils/timeOfDay");
    const { computePetExpression } = await import("../src/services/geminiService");
    const { computePetEmotionalState } = await import("../src/engine/ai/cognitiveCore");

    const night9pm = new Date(2026, 10, 20, 21, 15, 0);
    const midnight = new Date(2026, 10, 20, 0, 30, 0);
    const morning5am = new Date(2026, 10, 20, 5, 45, 0);
    const morning7am = new Date(2026, 10, 20, 7, 0, 0);

    expect(isBedtimeHour(night9pm)).toBe(true);
    expect(isSleepyHour(night9pm)).toBe(true);
    expect(isBedtimeHour(midnight)).toBe(true);
    expect(isBedtimeHour(morning5am)).toBe(true);
    expect(isBedtimeHour(morning7am)).toBe(false);

    // Expression & emotional awareness reflect sleepy state during 9 PM - morning
    const expr = computePetExpression({
      hunger: 90,
      energy: 90,
      cleanliness: 90,
      happiness: 90,
      affection: 90,
      isNightSleepy: true,
    });
    expect(expr.toLowerCase()).toContain("mengantuk");

    const emo = computePetEmotionalState(
      { hunger: 90, energy: 90, happiness: 90, cleanliness: 90, affection: 90 },
      { isNightSleepy: true }
    );
    expect(emo.primaryEmotion).toBe("Sangat Mengantuk");
    expect(emo.thoughtSummary.toLowerCase()).toContain("jam 9 malam");
  });
});
