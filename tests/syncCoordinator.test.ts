import { describe, it, expect, vi } from "vitest";
import {
  ActivityLogDeduplicator,
  MovementSyncCoordinator,
} from "../src/features/multiplayer/SyncCoordinator";
import type { PartnerMovementPayload } from "../src/ports/roomSyncPort";

describe("ActivityLogDeduplicator", () => {
  it("tracks new IDs once and rejects duplicates", () => {
    const dedup = new ActivityLogDeduplicator(5);
    dedup.seed(["log_1", "log_2"]);

    expect(dedup.isNewAndTrack("log_1")).toBe(false);
    expect(dedup.isNewAndTrack("log_2")).toBe(false);
    expect(dedup.isNewAndTrack("log_3")).toBe(true);
    expect(dedup.isNewAndTrack("log_3")).toBe(false);
  });

  it("evicts oldest tracked IDs when exceeding maxTracked", () => {
    const dedup = new ActivityLogDeduplicator(3);
    expect(dedup.isNewAndTrack("a")).toBe(true);
    expect(dedup.isNewAndTrack("b")).toBe(true);
    expect(dedup.isNewAndTrack("c")).toBe(true);
    expect(dedup.isNewAndTrack("d")).toBe(true); // evicts "a"

    expect(dedup.isNewAndTrack("b")).toBe(false);
    expect(dedup.isNewAndTrack("a")).toBe(true);
  });
});

describe("MovementSyncCoordinator", () => {
  it("throttles repeated checkpoints within checkpointIntervalMs unless forced or state changes", () => {
    const dispatched: PartnerMovementPayload[] = [];
    const onDispatch = vi.fn((p: PartnerMovementPayload) => dispatched.push(p));
    const coordinator = new MovementSyncCoordinator({
      checkpointIntervalMs: 450,
      minMoveDistance: 0.12,
      onDispatchMovement: onDispatch,
    });

    // First checkpoint sends immediately (state changed from "")
    expect(coordinator.publishCheckpoint({ x: 0, y: 0, z: 0 }, 0, "wander", 1000)).toBe(true);
    // Within 450ms and same state -> throttled
    expect(coordinator.publishCheckpoint({ x: 1, y: 0, z: 0 }, 0.5, "wander", 1200)).toBe(false);
    // Forced bypasses throttle
    expect(coordinator.publishCheckpoint({ x: 1.5, y: 0, z: 0 }, 0.5, "wander", 1250, true)).toBe(
      true
    );
    // Elapsed >= 450ms with sufficient move distance -> sends
    expect(coordinator.publishCheckpoint({ x: 2.0, y: 0, z: 0 }, 0.6, "wander", 1750)).toBe(true);
    // State transition sends immediately and clears walkTarget
    expect(coordinator.publishCheckpoint({ x: 2.0, y: 0, z: 0 }, 0.6, "idle", 1800)).toBe(true);

    expect(onDispatch).toHaveBeenCalledTimes(4);
    expect(dispatched[3].currentState).toBe("idle");
    expect(dispatched[3].walkTarget).toBeNull();
  });

  it("deduplicates identical walk intents sent within 150ms", () => {
    const onDispatch = vi.fn();
    const coordinator = new MovementSyncCoordinator({
      onDispatchMovement: onDispatch,
    });

    expect(
      coordinator.publishWalkIntent({ x: 0, y: 0, z: 0 }, { x: 5, z: 3 }, 1.2, 1000)
    ).toBe(true);
    expect(
      coordinator.publishWalkIntent({ x: 0.1, y: 0, z: 0.1 }, { x: 5, z: 3 }, 1.2, 1080)
    ).toBe(false);
    expect(
      coordinator.publishWalkIntent({ x: 0.2, y: 0, z: 0.2 }, { x: 6, z: 4 }, 1.1, 1100)
    ).toBe(true);

    expect(onDispatch).toHaveBeenCalledTimes(2);
  });
});
