import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { SpringOscillator3D } from "../src/engine/physics/SpringOscillator";

describe("SpringOscillator3D", () => {
  it("initializes with starting position and zero velocity", () => {
    const start = new THREE.Vector3(0, 1, 0);
    const spring = new SpringOscillator3D(start);
    expect(spring.position.y).toBe(1);
    expect(spring.velocity.length()).toBe(0);
  });

  it("moves towards target when target changes", () => {
    const spring = new SpringOscillator3D(new THREE.Vector3(0, 0, 0));
    spring.setTarget(new THREE.Vector3(0, 2, 0));

    // Step physics forward 10 frames
    for (let i = 0; i < 10; i++) {
      spring.update(0.016);
    }

    // Position should have moved toward 2
    expect(spring.position.y).toBeGreaterThan(0);
  });

  it("applies impulses correctly and increases wobble intensity", () => {
    const spring = new SpringOscillator3D();
    expect(spring.wobbleIntensity).toBe(0);

    spring.applyImpulse(new THREE.Vector3(0, 5, 0));
    expect(spring.velocity.y).toBe(5);
    expect(spring.wobbleIntensity).toBeGreaterThan(0);
  });

  it("preserves volume during squash and stretch", () => {
    const spring = new SpringOscillator3D();
    spring.position.set(0, 1.5, 0); // Displaced upwards
    spring.setTarget(new THREE.Vector3(0, 0, 0));

    const scale = spring.computeSquashAndStretch();
    const volume = scale.x * scale.y * scale.z;

    // Volume should remain very close to 1.0 (within mathematical tolerance)
    expect(volume).toBeCloseTo(1.0, 1);
  });
});
