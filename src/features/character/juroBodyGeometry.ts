import * as THREE from "three";

export interface JuroBodyGeometryOptions {
  centerColor: string;
  midColor: string;
  edgeColor: string;
  hasHat: boolean;
  widthSegments: number;
  heightSegments: number;
}

/**
 * Builds Juro's sculpted chubby jelly sphere geometry with smooth vertex colors
 * and parameterized tessellation for low-GPU vs crisp desktop devices.
 */
export function buildJuroBodyGeometry({
  centerColor,
  midColor,
  edgeColor,
  hasHat,
  widthSegments,
  heightSegments,
}: JuroBodyGeometryOptions): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(1.0, widthSegments, heightSegments);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();

  const faceCenter = new THREE.Vector3(0, 0.02, 1.02);
  const cCenter = new THREE.Color(centerColor);
  const cMid = new THREE.Color(midColor);
  const cEdge = new THREE.Color(edgeColor);
  const tempColor = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    // Chubby wide cushion proportions
    v.x *= 1.15;
    v.y *= 0.94;
    v.z *= 1.02;

    // Smoothly flatten bottom base so Juro rests snugly like pudding
    if (v.y < -0.44) {
      const flat = (-v.y - 0.44) / 0.5;
      v.y += flat * 0.13;
      v.x *= 1 + flat * 0.05;
      v.z *= 1 + flat * 0.05;
    }

    // Gentle soft dumpling wave on top-right crown (only when not wearing hat, ensuring flush fit under hats)
    if (!hasHat && v.y > 0.48) {
      const topH = (v.y - 0.48) / 0.46;
      const smoothTop = topH * topH;
      const crestWave =
        Math.exp(-Math.pow((v.x - 0.28) * 2.1 + (v.z - 0.05) * 1.8, 2)) * 0.1 * smoothTop;
      const indent =
        Math.exp(-Math.pow((v.x + 0.15) * 2.4 + (v.z - 0.15) * 2.0, 2)) * -0.045 * smoothTop;
      v.y += crestWave + indent;
    }

    pos.setXYZ(i, v.x, v.y, v.z);

    // Luminous vertex color gradient (milky center -> glossy honey orange rim)
    const distFromFace = v.distanceTo(faceCenter);
    const radialT = THREE.MathUtils.clamp((distFromFace - 0.12) / 1.15, 0, 1);
    const smoothRadial = radialT * radialT * (3 - 2 * radialT);

    const bottomOrange = THREE.MathUtils.clamp((-v.y - 0.42) / 0.42, 0, 1);
    const topOrange = THREE.MathUtils.clamp((v.y - 0.56) / 0.36, 0, 1);

    const t = THREE.MathUtils.clamp(
      smoothRadial * 0.88 + bottomOrange * 0.45 + topOrange * 0.55,
      0,
      1
    );

    if (t < 0.5) {
      tempColor.lerpColors(cCenter, cMid, t * 2);
    } else {
      tempColor.lerpColors(cMid, cEdge, (t - 0.5) * 2);
    }

    colors[i * 3] = tempColor.r;
    colors[i * 3 + 1] = tempColor.g;
    colors[i * 3 + 2] = tempColor.b;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}
