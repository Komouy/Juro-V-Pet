import { describe, it, expect, beforeEach } from "vitest";
import { usePetStore, DEFAULT_TOYS } from "../src/stores/petStore";

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

  it("identifies hungry mood when hunger < 35", () => {
    usePetStore.setState({ hunger: 25 });
    expect(usePetStore.getState().getMood()).toBe("hungry");
  });

  it("identifies sleepy/tired mood when energy < 30", () => {
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
});
