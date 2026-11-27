import * as THREE from "three";
import { BEHAVIOR_CONFIGS } from "./types";
import type { PetBehaviorState } from "./types";
import type { PetAttributes, PetMood } from "../../types/pet";
import {
  MAP_BOUNDS,
  clampToCircularWorld,
  pickScenicWaypoint,
  getTerrainHeightAt,
} from "../world/mapTerrain";

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
  transitionTo(nextState: PetBehaviorState, force = false, attributes?: PetAttributes): boolean {
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
      this.pickNewWanderTarget(undefined, attributes);
      // Give Juro enough time to crawl across the valley and hop onto hills/stumps
      this.stateDuration = 5.5 + Math.random() * 4.5;
    } else if (nextState === "curious") {
      this.pickCuriousTarget();
    }

    return true;
  }

  public pickNewWanderTarget(currentPos?: THREE.Vector3, attributes?: PetAttributes) {
    let bias: "water" | "bed" | "food" | "bench" | undefined;
    if (attributes) {
      if (attributes.cleanliness < 45) {
        bias = "water";
      } else if (attributes.energy < 45) {
        bias = Math.random() < 0.65 ? "bed" : "bench";
      } else if (attributes.hunger < 45) {
        bias = "food";
      }
    }

    // Pick an accessible scenic spot across the entire 3D map (meadow, hills, stumps, bridge, water)
    let pt = pickScenicWaypoint(bias);
    if (currentPos) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const candidate = pickScenicWaypoint(bias);
        if (Math.hypot(candidate.x - currentPos.x, candidate.z - currentPos.z) > 1.2) {
          pt = candidate;
          break;
        }
      }
    }
    const { x: clampedX, z: clampedZ } = clampToCircularWorld(pt.x, pt.z);
    const surfaceY = getTerrainHeightAt(clampedX, clampedZ);
    this.wanderTarget.set(clampedX, surfaceY, clampedZ);
    this.timeInState = 0;
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

    // 2. High priority need-based behavioral transitions
    const roll = Math.random();

    // Sleepy / low energy: stay put or wander towards bed
    if (attributes.energy < 45 || mood === "sleepy") {
      if (this.currentState === "sleep") {
        if (attributes.energy > 60 || roll > 0.45) {
          this.transitionTo("idle", true);
        }
        return;
      }
      if (roll < 0.55) {
        this.transitionTo("idle");
      } else if (roll < 0.82) {
        this.transitionTo("wander", false, attributes); // bias to bed/bench
      } else {
        this.transitionTo("sleep");
      }
      return;
    }

    // Hungry: curious sniffing grass or wandering towards picnic area
    if (attributes.hunger < 45) {
      if (this.currentState === "idle") {
        this.transitionTo(roll < 0.55 ? "curious" : "wander", false, attributes);
      } else if (this.currentState === "wander") {
        this.transitionTo(roll < 0.6 ? "curious" : "idle");
      } else {
        this.transitionTo(roll < 0.5 ? "idle" : "wander", false, attributes);
      }
      return;
    }

    // Dirty: higher probability of heading to water brook or shaking dust
    if (attributes.cleanliness < 45) {
      if (this.currentState === "wander") {
        this.transitionTo(roll < 0.5 ? "idle" : "curious");
      } else {
        this.transitionTo(roll < 0.6 ? "wander" : "idle", false, attributes);
      }
      return;
    }

    // Lonely / low affection: stay seated waiting for player
    if (attributes.affection < 40) {
      if (this.currentState !== "idle") {
        this.transitionTo(roll < 0.65 ? "idle" : "curious");
      } else {
        this.transitionTo(roll < 0.7 ? "idle" : "curious");
      }
      return;
    }

    // Thriving (well-fed, rested, clean, happy): spontaneous happy hops
    if (attributes.happiness > 75 && attributes.hunger > 60 && attributes.cleanliness > 60) {
      if (this.currentState === "idle") {
        if (roll < 0.35) this.transitionTo("happy");
        else if (roll < 0.75) this.transitionTo("wander", false, attributes);
        else this.transitionTo("curious");
        return;
      }
    }

    // 3. General baseline state transition matrix
    switch (this.currentState) {
      case "idle":
        if (mood === "happy" || mood === "excited") {
          // High energy pets wander or play
          if (roll < 0.5) this.transitionTo("wander");
          else if (roll < 0.8) this.transitionTo("curious");
          else this.transitionTo("happy");
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
