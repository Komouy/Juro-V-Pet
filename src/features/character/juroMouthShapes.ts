import * as THREE from "three";

export interface JuroMouthShapes {
  mouthShape: THREE.Shape;
  tongueShape: THREE.Shape;
  hungryMouthShape: THREE.Shape;
  poutMouthShape: THREE.Shape;
  flatMouthShape: THREE.Shape;
  sleepyMouthShape: THREE.Shape;
}

/**
 * Builds the 2D Three.js shapes for Juro's mouth expressions.
 */
export function createMouthShapes(): JuroMouthShapes {
  const mouthShape = new THREE.Shape();
  const w = 0.145;
  const h = 0.115;
  mouthShape.moveTo(-w, 0.01);
  mouthShape.quadraticCurveTo(0, -0.01, w, 0.01);
  mouthShape.quadraticCurveTo(w * 0.9, -h * 1.45, 0, -h * 1.45);
  mouthShape.quadraticCurveTo(-w * 0.9, -h * 1.45, -w, 0.01);

  const tongueShape = new THREE.Shape();
  const tw = 0.095;
  const th = 0.075;
  tongueShape.moveTo(-tw, -0.075);
  tongueShape.quadraticCurveTo(0, -0.01, tw, -0.075);
  tongueShape.quadraticCurveTo(tw * 0.65, -th * 2.0, 0, -th * 2.0);
  tongueShape.quadraticCurveTo(-tw * 0.65, -th * 2.0, -tw, -0.075);

  const hungryMouthShape = new THREE.Shape();
  hungryMouthShape.absellipse(0, -0.04, 0.056, 0.072, 0, Math.PI * 2, false, 0);

  const poutMouthShape = new THREE.Shape();
  const pw = 0.105;
  poutMouthShape.moveTo(-pw, -0.065);
  poutMouthShape.quadraticCurveTo(0, -0.025, pw, -0.065);
  poutMouthShape.quadraticCurveTo(pw * 0.9, -0.08, 0, -0.05);
  poutMouthShape.quadraticCurveTo(-pw * 0.9, -0.08, -pw, -0.065);

  const flatMouthShape = new THREE.Shape();
  const fw = 0.085;
  flatMouthShape.moveTo(-fw, -0.05);
  flatMouthShape.lineTo(fw, -0.05);
  flatMouthShape.lineTo(fw, -0.065);
  flatMouthShape.lineTo(-fw, -0.065);

  const sleepyMouthShape = new THREE.Shape();
  const sw = 0.052;
  const sh = 0.012;
  sleepyMouthShape.moveTo(-sw, -0.055);
  sleepyMouthShape.quadraticCurveTo(0, -0.058, sw, -0.055);
  sleepyMouthShape.quadraticCurveTo(sw * 0.9, -0.055 - sh, 0, -0.055 - sh * 0.85);
  sleepyMouthShape.quadraticCurveTo(-sw * 0.9, -0.055 - sh, -sw, -0.055);

  return {
    mouthShape,
    tongueShape,
    hungryMouthShape,
    poutMouthShape,
    flatMouthShape,
    sleepyMouthShape,
  };
}
