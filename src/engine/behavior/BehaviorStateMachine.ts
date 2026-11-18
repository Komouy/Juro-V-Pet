import * as THREE from "three";
import { BEHAVIOR_CONFIGS } from "./types";
import type { PetBehaviorState } from "./types";
import type { PetAttributes, PetMood } from "../../types/pet";
import { MAP_BOUNDS, pickScenicWaypoint, getTerrainHeightAt } from "../world/mapTerrain";

export class BehaviorStateMachine {
  currentState: PetBehaviorState = "idle";
  timeInState: number = 0;
  stateDuration: number = 3.5;

  // Waypoint position when wandering or being curious (full 3D X/Z map exploration!)
  wanderTarget: THREE.Vector3 = new THREE.Vector3(0, -0.46, 0);
  lookTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 1);

  // Bounds for wandering across the wide valley map
  readonly minX = MAP_BOUNDS.minX - 0.3;
  readonly maxX = MAP_BOUNDS.maxX + 0.3;
  readonly minZ = MAP_BOUNDS.minZ;
  readonly maxZ = MAP_BOUNDS.maxZ;
  readonly baseY = -0.46;

  constructor(initialState: PetBehaviorState = "idle") {
    this.currentState = initialState;
    this.resetDuration();
  }

  private resetDuration() {
    const config = BEHAVIOR_CONFIGS[this.currentState];
    const range = config.maxDuration - config.minDuration;
    this.stateDuration = config.minDuration + Math.random() * (range > 0 && range < 100 ? range : 2.0);
    this.timeInState = 0;
  }

  // Force transition with priority check
  transitionTo(nextState: PetBehaviorState, force = false): boolean {
    if (this.currentState === nextState) return false;

    const currentConfig = BEHAVIOR_CONFIGS[this.currentState];
    const nextConfig = BEHAVIOR_CONFIGS[nextState];

    if (!force) {
      // Cannot interrupt if current state disallows it and has higher priority
      if (!currentConfig.canInterrupt && currentConfig.priority > nextConfig.priority) {
        return false;
      }
    }

    this.currentState = nextState;
    this.resetDuration();

    // Setup specific state behaviors
    if (nextState === "wander") {
      this.pickNewWanderTarget();
      // Give Juro enough time to crawl across the valley and hop onto hills/stumps
      this.stateDuration = 5.5 + Math.random() * 4.5;
    } else if (nextState === "curious") {
      this.pickCuriousTarget();
    }

    return true;
  }

  private pickNewWanderTarget() {
    // Pick an accessible scenic spot across the entire 3D map (meadow, hills, stumps, bridge)
    const pt = pickScenicWaypoint();
    const clampedX = Math.max(this.minX, Math.min(this.maxX, pt.x));
    const clampedZ = Math.max(this.minZ, Math.min(this.maxZ, pt.z));
    const surfaceY = getTerrainHeightAt(clampedX, clampedZ);
    this.wanderTarget.set(clampedX, surfaceY, clampedZ);
  }

  private pickCuriousTarget() {
    // Focus look target at an interest point
    const side = Math.random() > 0.5 ? 0.8 : -0.8;
    this.lookTarget.set(side, 0.4 + Math.random() * 0.4, 0.5);
  }

  // Update tick called from requestAnimationFrame loop
  update(delta: number, attributes: PetAttributes, mood: PetMood): PetBehaviorState {
    this.timeInState += delta;

    // Dragging overrides everything
    if (this.currentState === "dragging") {
      return this.currentState;
    }

    // Sleep stays active indefinitely until user wakes Juro up or triggers another action
    if (this.currentState === "sleep") {
      return this.currentState;
    }

    // Eating must complete its animation
    if (this.currentState === "eating") {
      if (this.timeInState >= this.stateDuration) {
        this.transitionTo("happy", true);
      }
      return this.currentState;
    }

    // Check if current autonomous state expired
    if (this.timeInState >= this.stateDuration) {
      this.decideNextState(attributes, mood);
    }

    return this.currentState;
  }

  // Autonomous decision engine based on pet attributes and personality
  private decideNextState(attributes: PetAttributes, mood: PetMood) {
    // 1. Extreme fatigue -> Sleep
    if (attributes.energy < 25) {
      this.transitionTo("sleep", true);
      return;
    }

    // 2. State transition probability matrix
    const roll = Math.random();

    switch (this.currentState) {
      case "idle":
        if (mood === "happy" || mood === "excited") {
          // High energy pets wander or play
          if (roll < 0.5) this.transitionTo("wander");
          else if (roll < 0.8) this.transitionTo("curious");
          else this.transitionTo("happy");
        } else if (mood === "sleepy") {
          this.transitionTo(roll < 0.7 ? "sleep" : "idle");
        } else {
          // Normal idle flow
          if (roll < 0.5) this.transitionTo("wander");
          else if (roll < 0.8) this.transitionTo("curious");
          else this.transitionTo("idle");
        }
        break;

      case "wander":
        // After reaching a destination, inspect curiously or pause
        if (roll < 0.45) this.transitionTo("curious");
        else if (roll < 0.8) this.transitionTo("idle");
        else this.transitionTo("wander"); // wander again
        break;

      case "curious":
        if (roll < 0.4) this.transitionTo("idle");
        else if (roll < 0.7) this.transitionTo("wander");
        else this.transitionTo("happy");
        break;

      case "happy":
      case "play":
        // Settle down after joy
        if (roll < 0.6) this.transitionTo("idle");
        else this.transitionTo("curious");
        break;

      case "sleep":
        // Wake up when energy recovered or duration finished
        if (attributes.energy > 60 || roll > 0.4) {
          this.transitionTo("idle", true);
        }
        break;

      default:
        this.transitionTo("idle", true);
    }
  }
}
