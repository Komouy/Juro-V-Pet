import type { PartnerMovementPayload } from "../../ports/roomSyncPort";

/**
 * Deduplicates incoming activity log entries by ID across reconnects and partial snapshots.
 */
export class ActivityLogDeduplicator {
  private seenIds = new Set<string>();
  private orderedIds: string[] = [];
  private readonly maxTracked: number;

  constructor(maxTracked = 250) {
    this.maxTracked = maxTracked;
  }

  public seed(ids: string[]): void {
    for (const id of ids) {
      this.markSeen(id);
    }
  }

  public isNewAndTrack(id: string): boolean {
    if (!id || this.seenIds.has(id)) return false;
    this.markSeen(id);
    return true;
  }

  public reset(): void {
    this.seenIds.clear();
    this.orderedIds = [];
  }

  private markSeen(id: string): void {
    if (!id || this.seenIds.has(id)) return;
    this.seenIds.add(id);
    this.orderedIds.push(id);
    if (this.orderedIds.length > this.maxTracked) {
      const evicted = this.orderedIds.shift();
      if (evicted) this.seenIds.delete(evicted);
    }
  }
}

export interface SyncCoordinatorOptions {
  checkpointIntervalMs?: number;
  minMoveDistance?: number;
  onDispatchMovement: (payload: PartnerMovementPayload) => void;
}

/**
 * Coordinates hybrid intent + throttled position checkpoints so multiplayer movement
 * stays responsive and smooth without saturating Firebase RTDB.
 */
export class MovementSyncCoordinator {
  private readonly checkpointIntervalMs: number;
  private readonly minMoveDistance: number;
  private readonly onDispatchMovement: (payload: PartnerMovementPayload) => void;

  private lastSentAtMs = 0;
  private lastX = Number.NaN;
  private lastZ = Number.NaN;
  private lastState = "";
  private lastTargetKey = "";

  constructor(options: SyncCoordinatorOptions) {
    this.checkpointIntervalMs = options.checkpointIntervalMs ?? 450;
    this.minMoveDistance = options.minMoveDistance ?? 0.12;
    this.onDispatchMovement = options.onDispatchMovement;
  }

  /**
   * Immediately broadcasts a new walk destination so the partner begins moving right away.
   */
  public publishWalkIntent(
    position: { x: number; y: number; z: number },
    walkTarget: { x: number; z: number },
    yaw: number,
    nowMs: number
  ): boolean {
    const targetKey = `${walkTarget.x.toFixed(2)},${walkTarget.z.toFixed(2)}`;
    if (targetKey === this.lastTargetKey && nowMs - this.lastSentAtMs < 150) {
      return false;
    }

    this.lastTargetKey = targetKey;
    this.commitSent(position.x, position.z, "wander", nowMs);
    this.onDispatchMovement({
      position: {
        x: Number(position.x.toFixed(3)),
        y: Number(position.y.toFixed(3)),
        z: Number(position.z.toFixed(3)),
      },
      walkTarget: {
        x: Number(walkTarget.x.toFixed(3)),
        z: Number(walkTarget.z.toFixed(3)),
      },
      yaw: Number(yaw.toFixed(3)),
      currentState: "wander",
    });
    return true;
  }

  /**
   * Emits throttled position checkpoints while moving or on significant state change.
   */
  public publishCheckpoint(
    position: { x: number; y: number; z: number },
    yaw: number,
    currentState: string,
    nowMs: number,
    force = false
  ): boolean {
    const movedDist = Number.isNaN(this.lastX)
      ? Infinity
      : Math.hypot(position.x - this.lastX, position.z - this.lastZ);
    const stateChanged = currentState !== this.lastState;
    const intervalElapsed = nowMs - this.lastSentAtMs >= this.checkpointIntervalMs;

    if (!force && !stateChanged && (!intervalElapsed || movedDist < this.minMoveDistance)) {
      return false;
    }

    if (currentState !== "wander") {
      this.lastTargetKey = "";
    }

    this.commitSent(position.x, position.z, currentState, nowMs);
    this.onDispatchMovement({
      position: {
        x: Number(position.x.toFixed(3)),
        y: Number(position.y.toFixed(3)),
        z: Number(position.z.toFixed(3)),
      },
      walkTarget: currentState === "wander" ? undefined : null,
      yaw: Number(yaw.toFixed(3)),
      currentState,
    });
    return true;
  }

  public reset(): void {
    this.lastSentAtMs = 0;
    this.lastX = Number.NaN;
    this.lastZ = Number.NaN;
    this.lastState = "";
    this.lastTargetKey = "";
  }

  private commitSent(x: number, z: number, state: string, nowMs: number): void {
    this.lastX = x;
    this.lastZ = z;
    this.lastState = state;
    this.lastSentAtMs = nowMs;
  }
}
