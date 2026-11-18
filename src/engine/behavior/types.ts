import type { PetBehaviorState } from "../../types/pet";

export type { PetBehaviorState };

export interface BehaviorStateConfig {
  state: PetBehaviorState;
  minDuration: number; // in seconds
  maxDuration: number;
  priority: number;    // Higher priority overrides lower
  canInterrupt: boolean;
}

export const BEHAVIOR_CONFIGS: Record<PetBehaviorState, BehaviorStateConfig> = {
  dragging: {
    state: "dragging",
    minDuration: 0,
    maxDuration: Infinity,
    priority: 100, // Highest priority: user touch always takes control
    canInterrupt: false,
  },
  eating: {
    state: "eating",
    minDuration: 3.4,
    maxDuration: 3.6,
    priority: 80,
    canInterrupt: false,
  },
  sleep: {
    state: "sleep",
    minDuration: 8.0,
    maxDuration: 20.0,
    priority: 70,
    canInterrupt: true,
  },
  play: {
    state: "play",
    minDuration: 3.0,
    maxDuration: 6.0,
    priority: 60,
    canInterrupt: true,
  },
  happy: {
    state: "happy",
    minDuration: 2.0,
    maxDuration: 4.0,
    priority: 50,
    canInterrupt: true,
  },
  curious: {
    state: "curious",
    minDuration: 2.0,
    maxDuration: 4.5,
    priority: 30,
    canInterrupt: true,
  },
  wander: {
    state: "wander",
    minDuration: 3.0,
    maxDuration: 7.0,
    priority: 20,
    canInterrupt: true,
  },
  idle: {
    state: "idle",
    minDuration: 2.5,
    maxDuration: 5.0,
    priority: 10,
    canInterrupt: true,
  },
};
