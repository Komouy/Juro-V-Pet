import * as THREE from "three";
import {
  ISLAND_RADIUS,
  TREE_RING_MAX_RADIUS,
  distanceToTrail,
  generateWorldProps,
  groundHeightAt,
  isInCanalOrPond,
  mulberry32,
  type RockSpec,
  type TreeSpec,
} from "../../../engine/world/mapTerrain";
import type { RainSystem, WorldBuildContext } from "./worldBuilderTypes";

/**
 * Builds instanced pine trees, round trees, rocks, grass tufts, wildflowers,
 * and rain particles + pond water ripples.
 */
export function buildPropsAndRain(ctx: WorldBuildContext, rainCount: number): RainSystem {
  const { rootGroup, textures, shadowsEnabled, trackGeo, trackMat } = ctx;

  // 1. Trees & Rocks
  const { trees, rocks } = generateWorldProps();
  const pineTrees = trees.filter((t: TreeSpec) => t.kind === "pine");
  const roundTrees = trees.filter((t: TreeSpec) => t.kind === "round");

  const trunkMat = trackMat(new THREE.MeshStandardMaterial({ map: textures.bark, roughness: 0.88 }));
  const pineMat = trackMat(new THREE.MeshStandardMaterial({ map: textures.foliagePine, roughness: 0.82 }));
  const roundMat = trackMat(new THREE.MeshStandardMaterial({ map: textures.foliageRound, roughness: 0.8 }));

  const dummy = new THREE.Object3D();
  const foliagePalette = [
    new THREE.Color("#ffffff"),
    new THREE.Color("#eaf6dd"),
    new THREE.Color("#f4f9d9"),
    new THREE.Color("#ddf1de"),
  ];

  if (pineTrees.length > 0) {
    const pTrunk = new THREE.InstancedMesh(
      trackGeo(new THREE.CylinderGeometry(0.22, 0.34, 1.45, 8)),
      trunkMat,
      pineTrees.length
    );
    const pCone1 = new THREE.InstancedMesh(
      trackGeo(new THREE.ConeGeometry(1.48, 2.05, 10)),
      pineMat,
      pineTrees.length
    );
    const pCone2 = new THREE.InstancedMesh(
      trackGeo(new THREE.ConeGeometry(1.14, 1.9, 10)),
      pineMat,
      pineTrees.length
    );
    const pCone3 = new THREE.InstancedMesh(
      trackGeo(new THREE.ConeGeometry(0.76, 1.6, 10)),
      pineMat,
      pineTrees.length
    );

    pTrunk.castShadow = shadowsEnabled;
    pTrunk.receiveShadow = shadowsEnabled;
    pCone1.castShadow = shadowsEnabled;
    pCone1.receiveShadow = shadowsEnabled;
    pCone2.receiveShadow = shadowsEnabled;
    pCone3.receiveShadow = shadowsEnabled;

    pineTrees.forEach((t: TreeSpec, idx: number) => {
      const gy = groundHeightAt(t.x, t.z);
      const s = t.scale;

      dummy.position.set(t.x, gy + 0.65 * s, t.z);
      dummy.rotation.set(0, t.rotation, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      pTrunk.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(t.x, gy + 1.9 * s, t.z);
      dummy.updateMatrix();
      pCone1.setMatrixAt(idx, dummy.matrix);
      pCone1.setColorAt(idx, foliagePalette[t.tintIndex]);

      dummy.position.set(t.x, gy + 3.05 * s, t.z);
      dummy.rotation.y = t.rotation + 0.4;
      dummy.updateMatrix();
      pCone2.setMatrixAt(idx, dummy.matrix);
      pCone2.setColorAt(idx, foliagePalette[t.tintIndex]);

      dummy.position.set(t.x, gy + 4.1 * s, t.z);
      dummy.rotation.y = t.rotation + 0.8;
      dummy.updateMatrix();
      pCone3.setMatrixAt(idx, dummy.matrix);
      pCone3.setColorAt(idx, foliagePalette[t.tintIndex]);
    });

    [pTrunk, pCone1, pCone2, pCone3].forEach((im) => {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere();
      rootGroup.add(im);
    });
  }

  if (roundTrees.length > 0) {
    const rTrunk = new THREE.InstancedMesh(
      trackGeo(new THREE.CylinderGeometry(0.22, 0.34, 1.7, 8)),
      trunkMat,
      roundTrees.length
    );
    const rCrownMain = new THREE.InstancedMesh(
      trackGeo(new THREE.SphereGeometry(1.32, 12, 9)),
      roundMat,
      roundTrees.length
    );
    const rCrownTop = new THREE.InstancedMesh(
      trackGeo(new THREE.SphereGeometry(0.92, 10, 8)),
      roundMat,
      roundTrees.length
    );

    rTrunk.castShadow = shadowsEnabled;
    rTrunk.receiveShadow = shadowsEnabled;
    rCrownMain.castShadow = shadowsEnabled;
    rCrownMain.receiveShadow = shadowsEnabled;
    rCrownTop.receiveShadow = shadowsEnabled;

    roundTrees.forEach((t: TreeSpec, idx: number) => {
      const gy = groundHeightAt(t.x, t.z);
      const s = t.scale;

      dummy.position.set(t.x, gy + 0.8 * s, t.z);
      dummy.rotation.set(0, t.rotation, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      rTrunk.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(t.x, gy + 2.3 * s, t.z);
      dummy.scale.set(s * 1.15, s * 0.86, s * 1.15);
      dummy.updateMatrix();
      rCrownMain.setMatrixAt(idx, dummy.matrix);
      rCrownMain.setColorAt(idx, foliagePalette[t.tintIndex]);

      dummy.position.set(
        t.x + Math.cos(t.rotation) * 0.42 * s,
        gy + 2.95 * s,
        t.z + Math.sin(t.rotation) * 0.42 * s
      );
      dummy.scale.set(s * 1.05, s * 0.88, s * 1.05);
      dummy.updateMatrix();
      rCrownTop.setMatrixAt(idx, dummy.matrix);
      rCrownTop.setColorAt(idx, foliagePalette[t.tintIndex]);
    });

    [rTrunk, rCrownMain, rCrownTop].forEach((im) => {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere();
      rootGroup.add(im);
    });
  }

  if (rocks.length > 0) {
    const rockGeo = trackGeo(new THREE.DodecahedronGeometry(0.75, 1));
    const rockMatInst = trackMat(
      new THREE.MeshStandardMaterial({ color: "#a5adb8", roughness: 0.88, flatShading: true })
    );
    const rockInst = new THREE.InstancedMesh(rockGeo, rockMatInst, rocks.length);
    rockInst.castShadow = shadowsEnabled;
    rockInst.receiveShadow = shadowsEnabled;
    rocks.forEach((r: RockSpec, idx: number) => {
      const gy = groundHeightAt(r.x, r.z);
      dummy.position.set(r.x, gy + 0.25 * r.scale, r.z);
      dummy.rotation.set(r.rotation * 0.2, r.rotation, 0);
      dummy.scale.set(r.scale * 1.15, r.scale * 0.72, r.scale);
      dummy.updateMatrix();
      rockInst.setMatrixAt(idx, dummy.matrix);
    });
    rockInst.instanceMatrix.needsUpdate = true;
    rockInst.computeBoundingSphere();
    rootGroup.add(rockInst);
  }

  // 2. Grass Tufts & Wildflowers
  const randProps = mulberry32(99123);
  const tuftPositions: Array<[number, number, number]> = [];
  const flowerPositions: Array<[number, number, number]> = [];

  for (let i = 0; i < 240; i++) {
    const angle = randProps() * Math.PI * 2;
    const radius = Math.sqrt(randProps()) * (TREE_RING_MAX_RADIUS - 0.8);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (isInCanalOrPond(x, z)) continue;
    const td = distanceToTrail(x, z);
    if (td < 1.5) continue;

    if (td < 4.5 || randProps() > 0.6) {
      if (tuftPositions.length < 72) {
        tuftPositions.push([x, z, randProps() * Math.PI]);
      } else if (flowerPositions.length < 64) {
        flowerPositions.push([x, z, randProps() * Math.PI]);
      }
    }
  }

  if (tuftPositions.length > 0) {
    const tuftGeo = trackGeo(new THREE.ConeGeometry(0.22, 0.42, 5));
    const tuftMat = trackMat(new THREE.MeshStandardMaterial({ color: "#8ad150", roughness: 0.82 }));
    const tuftInst = new THREE.InstancedMesh(tuftGeo, tuftMat, tuftPositions.length);
    tuftPositions.forEach(([x, z, rot], idx) => {
      dummy.position.set(x, groundHeightAt(x, z) + 0.18, z);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.set(1.1, 1.0, 0.55);
      dummy.updateMatrix();
      tuftInst.setMatrixAt(idx, dummy.matrix);
    });
    tuftInst.instanceMatrix.needsUpdate = true;
    tuftInst.computeBoundingSphere();
    rootGroup.add(tuftInst);
  }

  if (flowerPositions.length > 0) {
    const flGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.08, 0.08, 6));
    const flMat = trackMat(new THREE.MeshStandardMaterial({ color: "#f598b3", roughness: 0.7 }));
    const flInst = new THREE.InstancedMesh(flGeo, flMat, flowerPositions.length);
    flowerPositions.forEach(([x, z, rot], idx) => {
      dummy.position.set(x, groundHeightAt(x, z) + 0.06, z);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      flInst.setMatrixAt(idx, dummy.matrix);
    });
    flInst.instanceMatrix.needsUpdate = true;
    flInst.computeBoundingSphere();
    rootGroup.add(flInst);
  }

  // 3. Rain Particles & Water Ripples
  const rainGeo = trackGeo(new THREE.BoxGeometry(0.035, 0.72, 0.035));
  const rainMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: "#d4f0ff",
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    })
  );
  const mesh = new THREE.InstancedMesh(rainGeo, rainMat, rainCount);
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.raycast = () => {};

  const randRain = mulberry32(88421);
  const positions = new Float32Array(rainCount * 3);
  const speeds = new Float32Array(rainCount);
  const rainDummy = new THREE.Object3D();
  for (let i = 0; i < rainCount; i++) {
    const rAngle = randRain() * Math.PI * 2;
    const rDist = Math.sqrt(randRain()) * ISLAND_RADIUS;
    const rx = Math.cos(rAngle) * rDist;
    const ry = randRain() * 18 + 1;
    const rz = Math.sin(rAngle) * rDist;
    positions[i * 3] = rx;
    positions[i * 3 + 1] = ry;
    positions[i * 3 + 2] = rz;
    speeds[i] = 17 + randRain() * 8;

    rainDummy.position.set(rx, ry, rz);
    rainDummy.updateMatrix();
    mesh.setMatrixAt(i, rainDummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  rootGroup.add(mesh);

  const rippleCount = 8;
  const ripples: THREE.Mesh[] = [];
  const ripplePhases = new Float32Array(rippleCount);
  const rippleGeo = trackGeo(new THREE.RingGeometry(0.3, 0.42, 10));
  for (let r = 0; r < rippleCount; r++) {
    const rMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: "#e0f6ff",
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    const rm = new THREE.Mesh(rippleGeo, rMat);
    rm.rotation.x = -Math.PI / 2;
    let rx = 9.5 + (randRain() * 2 - 1) * 3.5;
    let rz = 9.5 + (randRain() * 2 - 1) * 3.5;
    if (r < 5) {
      const t = -10 + r * 4;
      rx = t + (randRain() - 0.5) * 1.4;
      rz = t + (randRain() - 0.5) * 1.4;
    }
    if (!isInCanalOrPond(rx, rz)) {
      rx = 9.5;
      rz = 9.5;
    }
    rm.position.set(rx, -0.27, rz);
    rm.visible = false;
    ripplePhases[r] = randRain();
    rootGroup.add(rm);
    ripples.push(rm);
  }

  return { mesh, count: rainCount, positions, speeds, ripples, ripplePhases };
}
