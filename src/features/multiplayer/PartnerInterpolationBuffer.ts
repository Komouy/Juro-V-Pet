export interface MovementSample {
  x: number;
  z: number;
  yaw: number;
  receivedAtMs: number;
}

export interface InterpolatedPose {
  x: number;
  z: number;
  yaw: number;
}

function normalizeAngle(rad: number): number {
  let a = rad % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function lerpAngle(a: number, b: number, t: number): number {
  const diff = normalizeAngle(b - a);
  return normalizeAngle(a + diff * t);
}

/**
 * Smooths partner pet coordinates across irregular network intervals using
 * a short interpolation buffer and bounded extrapolation.
 */
export class PartnerInterpolationBuffer {
  private samples: MovementSample[] = [];
  private readonly interpolationDelayMs: number;
  private readonly maxExtrapolateMs: number;
  private readonly snapDistance: number;

  constructor(options?: {
    interpolationDelayMs?: number;
    maxExtrapolateMs?: number;
    snapDistance?: number;
  }) {
    this.interpolationDelayMs = options?.interpolationDelayMs ?? 150;
    this.maxExtrapolateMs = options?.maxExtrapolateMs ?? 180;
    this.snapDistance = options?.snapDistance ?? 4.5;
  }

  public pushSample(x: number, z: number, yaw: number, receivedAtMs: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const safeYaw = Number.isFinite(yaw) ? yaw : 0;

    const last = this.samples[this.samples.length - 1];
    if (last) {
      // Snap cleanly when partner teleports or first joins from far away
      if (Math.hypot(x - last.x, z - last.z) >= this.snapDistance) {
        this.samples = [{ x, z, yaw: safeYaw, receivedAtMs }];
        return;
      }
      // Drop duplicate/stale timestamps
      if (receivedAtMs <= last.receivedAtMs) {
        last.x = x;
        last.z = z;
        last.yaw = safeYaw;
        return;
      }
    }

    this.samples.push({ x, z, yaw: safeYaw, receivedAtMs });
    if (this.samples.length > 12) {
      this.samples.shift();
    }
  }

  public sample(nowMs: number): InterpolatedPose | null {
    if (this.samples.length === 0) return null;
    if (this.samples.length === 1) {
      const only = this.samples[0];
      return { x: only.x, z: only.z, yaw: only.yaw };
    }

    const renderTime = nowMs - this.interpolationDelayMs;
    const first = this.samples[0];
    if (renderTime <= first.receivedAtMs) {
      return { x: first.x, z: first.z, yaw: first.yaw };
    }

    for (let i = 0; i < this.samples.length - 1; i++) {
      const a = this.samples[i];
      const b = this.samples[i + 1];
      if (renderTime >= a.receivedAtMs && renderTime <= b.receivedAtMs) {
        const span = Math.max(1, b.receivedAtMs - a.receivedAtMs);
        const alpha = Math.max(0, Math.min(1, (renderTime - a.receivedAtMs) / span));
        return {
          x: a.x + (b.x - a.x) * alpha,
          z: a.z + (b.z - a.z) * alpha,
          yaw: lerpAngle(a.yaw, b.yaw, alpha),
        };
      }
    }

    // Slightly extrapolate beyond the newest sample if packet interval exceeds buffer delay
    const prev = this.samples[this.samples.length - 2];
    const latest = this.samples[this.samples.length - 1];
    const overdue = Math.min(this.maxExtrapolateMs, Math.max(0, renderTime - latest.receivedAtMs));
    const dtPrev = Math.max(1, latest.receivedAtMs - prev.receivedAtMs);
    const ratio = overdue / dtPrev;

    return {
      x: latest.x + (latest.x - prev.x) * ratio,
      z: latest.z + (latest.z - prev.z) * ratio,
      yaw: latest.yaw,
    };
  }

  public clear(): void {
    this.samples = [];
  }
}
