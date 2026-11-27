import { describe, it, expect } from "vitest";
import { PartnerInterpolationBuffer } from "../src/features/multiplayer/PartnerInterpolationBuffer";

describe("PartnerInterpolationBuffer", () => {
  it("returns null when no samples have been pushed", () => {
    const buffer = new PartnerInterpolationBuffer();
    expect(buffer.sample(1000)).toBeNull();
  });

  it("interpolates position and shortest-path yaw smoothly between samples", () => {
    const buffer = new PartnerInterpolationBuffer({
      interpolationDelayMs: 150,
      maxExtrapolateMs: 180,
      snapDistance: 4.5,
    });

    buffer.pushSample(0, 0, Math.PI * 0.9, 1000);
    buffer.pushSample(2, 4, -Math.PI * 0.9, 1400);

    // renderTime = 1350 - 150 = 1200 (midpoint between 1000 and 1400 -> alpha = 0.5)
    const mid = buffer.sample(1350);
    expect(mid).not.toBeNull();
    expect(mid!.x).toBeCloseTo(1, 4);
    expect(mid!.z).toBeCloseTo(2, 4);
    // Shortest path across +/-PI wraps cleanly around +/-PI
    expect(Math.abs(mid!.yaw)).toBeCloseTo(Math.PI, 4);
  });

  it("snaps cleanly when partner teleports beyond snapDistance", () => {
    const buffer = new PartnerInterpolationBuffer({
      interpolationDelayMs: 150,
      maxExtrapolateMs: 180,
      snapDistance: 4.5,
    });

    buffer.pushSample(0, 0, 0, 1000);
    buffer.pushSample(1, 0, 0.2, 1200);
    // Jump 10 units (> snapDistance 4.5)
    buffer.pushSample(11, 0, 1.0, 1400);

    const pose = buffer.sample(1550);
    expect(pose).not.toBeNull();
    expect(pose!.x).toBeCloseTo(11, 4);
    expect(pose!.z).toBeCloseTo(0, 4);
    expect(pose!.yaw).toBeCloseTo(1.0, 4);
  });

  it("bounds extrapolation to maxExtrapolateMs when packet delivery stalls", () => {
    const buffer = new PartnerInterpolationBuffer({
      interpolationDelayMs: 100,
      maxExtrapolateMs: 150,
      snapDistance: 10,
    });

    buffer.pushSample(0, 0, 0, 1000);
    buffer.pushSample(2, 0, 0, 1200); // velocity = 2 units / 200ms = 0.01 units/ms

    // nowMs = 2000 -> renderTime = 1900 -> overdue = 700ms, clamped to maxExtrapolateMs (150ms)
    // Expected extrapolation = 2 + 2 * (150 / 200) = 3.5
    const pose = buffer.sample(2000);
    expect(pose).not.toBeNull();
    expect(pose!.x).toBeCloseTo(3.5, 4);
    expect(pose!.z).toBeCloseTo(0, 4);
  });
});
