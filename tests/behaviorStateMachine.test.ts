import { describe, it, expect, beforeEach } from "vitest";
import { BehaviorStateMachine } from "../src/engine/behavior/BehaviorStateMachine";
import type { PetAttributes } from "../src/types/pet";

describe("BehaviorStateMachine", () => {
  let fsm: BehaviorStateMachine;
  const normalAttributes: PetAttributes = {
    hunger: 80,
    energy: 70,
    happiness: 85,
    cleanliness: 90,
    affection: 60,
  };

  beforeEach(() => {
    fsm = new BehaviorStateMachine("idle");
  });

  it("initializes with idle state", () => {
    expect(fsm.currentState).toBe("idle");
    expect(fsm.timeInState).toBe(0);
  });

  it("transitions to wander and selects a waypoint within floor bounds", () => {
    const success = fsm.transitionTo("wander");
    expect(success).toBe(true);
    expect(fsm.currentState).toBe("wander");
    expect(fsm.wanderTarget.x).toBeGreaterThanOrEqual(fsm.minX);
    expect(fsm.wanderTarget.x).toBeLessThanOrEqual(fsm.maxX);
  });

  it("allows dragging to override any state with high priority", () => {
    fsm.transitionTo("sleep");
    expect(fsm.currentState).toBe("sleep");

    // Dragging overrides sleep immediately
    const dragSuccess = fsm.transitionTo("dragging", true);
    expect(dragSuccess).toBe(true);
    expect(fsm.currentState).toBe("dragging");
  });

  it("protects eating state from being interrupted by low-priority state", () => {
    fsm.transitionTo("eating", true);
    expect(fsm.currentState).toBe("eating");

    // Attempt low priority transition without force should fail
    const wanderAttempt = fsm.transitionTo("wander", false);
    expect(wanderAttempt).toBe(false);
    expect(fsm.currentState).toBe("eating");
  });

  it("automatically forces sleep when pet energy is critically low (<25)", () => {
    const exhaustedAttributes: PetAttributes = {
      ...normalAttributes,
      energy: 15,
    };

    // Fast-forward past state duration
    fsm.timeInState = 10;
    fsm.update(0.1, exhaustedAttributes, "sleepy");

    expect(fsm.currentState).toBe("sleep");
  });

  it("transitions out of eating to happy once eating duration expires", () => {
    fsm.transitionTo("eating", true);
    fsm.timeInState = fsm.stateDuration + 0.1;

    fsm.update(0.1, normalAttributes, "happy");
    expect(fsm.currentState).toBe("happy");
  });
});
