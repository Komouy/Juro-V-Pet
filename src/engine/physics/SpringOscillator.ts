import * as THREE from "three";

export interface SpringConfig {
  stiffness: number; // k
  damping: number;   // c
  mass: number;      // m
}

export class SpringOscillator3D {
  position: THREE.Vector3 = new THREE.Vector3();
  velocity: THREE.Vector3 = new THREE.Vector3();
  target: THREE.Vector3 = new THREE.Vector3();
  config: SpringConfig;

  // Deformation & wobble parameters
  wobbleIntensity: number = 0;
  wobbleDecay: number = 4.5;
  wobbleFrequency: number = 14.0;
  wobbleTime: number = 0;

  constructor(
    initialPos = new THREE.Vector3(),
    config: SpringConfig = { stiffness: 140, damping: 10, mass: 1 }
  ) {
    this.position.copy(initialPos);
    this.target.copy(initialPos);
    this.config = config;
  }

  setTarget(target: THREE.Vector3) {
    this.target.copy(target);
  }

  // Add an impulse (e.g. from mouse drag release or tap)
  applyImpulse(impulse: THREE.Vector3) {
    this.velocity.add(impulse);
    this.wobbleIntensity = Math.min(2.5, this.wobbleIntensity + impulse.length() * 0.4);
    this.wobbleTime = 0;
  }

  update(delta: number) {
    // Clamp delta to prevent numerical instability during frame drops
    const dt = Math.min(delta, 0.05);

    // Spring Force: F = -k * (x - x_target) - c * v
    const displacement = new THREE.Vector3().subVectors(this.position, this.target);
    const springForce = displacement.multiplyScalar(-this.config.stiffness);
    const dampingForce = this.velocity.clone().multiplyScalar(-this.config.damping);

    const totalForce = springForce.add(dampingForce);
    const acceleration = totalForce.divideScalar(this.config.mass);

    this.velocity.addScaledVector(acceleration, dt);
    this.position.addScaledVector(this.velocity, dt);

    // Update internal jelly ripple wobble
    this.wobbleTime += dt;
    this.wobbleIntensity = Math.max(0, this.wobbleIntensity - this.wobbleDecay * dt);
  }

  // Enforce solid ground floor boundary so Juro never sinks underground
  clampFloor(minY: number, bounceFactor = 0.22) {
    if (this.position.y < minY) {
      this.position.y = minY;
      if (this.velocity.y < 0) {
        this.velocity.y = -this.velocity.y * bounceFactor;
      }
    }
  }

  // Push horizontally out of solid world obstacles (rocks, trees, bench, lanterns, walls)
  resolveHorizontal(x: number, z: number, damp = 0.45) {
    if (Math.abs(this.position.x - x) > 0.0001 || Math.abs(this.position.z - z) > 0.0001) {
      this.position.x = x;
      this.position.z = z;
      this.velocity.x *= damp;
      this.velocity.z *= damp;
    }
  }

  // Compute Disney-style volume-preserving squash and stretch scale vector
  computeSquashAndStretch(): THREE.Vector3 {
    // Displacement along Y
    const dy = this.position.y - this.target.y;

    // Wobble harmonic oscillation
    const wobble =
      Math.sin(this.wobbleTime * this.wobbleFrequency) *
      this.wobbleIntensity *
      Math.exp(-this.wobbleTime * 2.5);

    // Dynamic stretch factor along Y
    // When dragged upward, stretch (sy > 1). When moving downward or landing, squash (sy < 1).
    let stretchY = 1 + dy * 0.35 + (this.velocity.y * 0.04) + wobble * 0.15;
    // Bound stretch within reasonable organic limits (0.65 to 1.55)
    stretchY = Math.max(0.65, Math.min(1.55, stretchY));

    // Preserve volume: V = sx * sy * sz = 1 -> sx = sz = 1 / sqrt(sy)
    const stretchXZ = 1 / Math.sqrt(stretchY);

    return new THREE.Vector3(stretchXZ, stretchY, stretchXZ);
  }
}
