import * as THREE from "three";
import {
  ISLAND_RADIUS,
  WORLD_SIZE,
  distanceToTrail,
  grassPatchFactor,
  groundHeightAt,
} from "../../../engine/world/mapTerrain";
import type { AnimatedKoi, WorldBuildContext } from "./worldBuilderTypes";

export interface TerrainAndWaterResult {
  terrainMesh: THREE.Mesh;
  waterMesh: THREE.Mesh;
  kois: AnimatedKoi[];
}

/**
 * Builds the circular 3D storybook island terrain mesh, sculpted earthen cliff skirt,
 * vertex colors, cobblestone plaza, stepping stones, canal/pond water, aquatic flora, and koi.
 */
export function buildTerrainAndWater(
  ctx: WorldBuildContext,
  terrainSegments: number
): TerrainAndWaterResult {
  const { rootGroup, textures, shadowsEnabled, trackGeo, trackMat } = ctx;

  // 1. Circular Storybook Island Surface (Polar Disc Grid)
  const radialSegments = Math.max(72, terrainSegments);
  const ringSegments = Math.max(36, Math.round(terrainSegments * 0.55));
  const vertexCount = 1 + ringSegments * radialSegments;

  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  // Center vertex (index 0)
  const centerY = groundHeightAt(0, 0);
  positions[0] = 0;
  positions[1] = centerY;
  positions[2] = 0;
  uvs[0] = 0.5;
  uvs[1] = 0.5;

  const ringAngles: number[] = [];
  for (let ia = 0; ia < radialSegments; ia++) {
    ringAngles.push((ia / radialSegments) * Math.PI * 2);
  }

  let vCursor = 1;
  for (let ir = 1; ir <= ringSegments; ir++) {
    const r = (ir / ringSegments) * ISLAND_RADIUS;
    for (let ia = 0; ia < radialSegments; ia++) {
      const theta = ringAngles[ia];
      const vx = Math.cos(theta) * r;
      const vz = Math.sin(theta) * r;
      const vy = groundHeightAt(vx, vz);

      positions[vCursor * 3] = vx;
      positions[vCursor * 3 + 1] = vy;
      positions[vCursor * 3 + 2] = vz;
      uvs[vCursor * 2] = vx / WORLD_SIZE + 0.5;
      uvs[vCursor * 2 + 1] = vz / WORLD_SIZE + 0.5;
      vCursor++;
    }
  }

  const indices: number[] = [];
  // Inner fan around center vertex (counter-clockwise looking from +Y -> normals point +Y)
  for (let ia = 0; ia < radialSegments; ia++) {
    const nextIa = (ia + 1) % radialSegments;
    const curr = 1 + ia;
    const next = 1 + nextIa;
    indices.push(0, next, curr);
  }

  // Concentric rings
  for (let ir = 2; ir <= ringSegments; ir++) {
    const innerBase = 1 + (ir - 2) * radialSegments;
    const outerBase = 1 + (ir - 1) * radialSegments;
    for (let ia = 0; ia < radialSegments; ia++) {
      const nextIa = (ia + 1) % radialSegments;
      const a = innerBase + ia;
      const b = outerBase + ia;
      const c = outerBase + nextIa;
      const d = innerBase + nextIa;
      indices.push(a, d, b);
      indices.push(d, c, b);
    }
  }

  const terrainGeo = trackGeo(new THREE.BufferGeometry());
  terrainGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  terrainGeo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  terrainGeo.setIndex(indices);
  terrainGeo.computeVertexNormals();

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const normAttr = terrainGeo.attributes.normal as THREE.BufferAttribute;
  const colorArray = new Float32Array(posAttr.count * 3);

  const cMeadowBase = new THREE.Color("#7ec254");
  const cGrassPatch = new THREE.Color("#64ab3f");
  const cGrassHillTop = new THREE.Color("#95d462");
  const cWoodlandRim = new THREE.Color("#5ca33b");
  const cTrailCore = new THREE.Color("#dfb263");
  const cTrailEdge = new THREE.Color("#bd8a3f");
  const cCliffEarth = new THREE.Color("#a67543");
  const cSandBank = new THREE.Color("#bfa473");
  const cDeepBed = new THREE.Color("#3b799c");
  const cTemp = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);
    const ny = normAttr.getY(i);
    const radialDist = Math.hypot(vx, vz);

    if (vy < -0.45) {
      cTemp.copy(cDeepBed);
    } else if (vy < -0.02) {
      const t = (vy + 0.45) / 0.43;
      cTemp.copy(cDeepBed).lerp(cSandBank, Math.max(0, Math.min(1, t)));
    } else {
      const patch = grassPatchFactor(vx, vz);
      cTemp.copy(cMeadowBase).lerp(cGrassPatch, patch);

      if (radialDist > 25.5) {
        const rimShade = Math.min(1, (radialDist - 25.5) / 5.5);
        cTemp.lerp(cWoodlandRim, rimShade * 0.42);
      }

      if (vy > 0.6) {
        const hillT = Math.min(1, (vy - 0.6) / 1.8);
        cTemp.lerp(cGrassHillTop, hillT * 0.55);
      }

      if (ny < 0.87 && vy > 0.15) {
        const cliffT = Math.min(1, (0.87 - ny) * 4.2);
        cTemp.lerp(cCliffEarth, cliffT);
      }

      const tDist = distanceToTrail(vx, vz);
      if (tDist < 2.3) {
        const trailWeight = 1 - Math.max(0, Math.min(1, (tDist - 1.05) / 1.25));
        const smoothWeight = trailWeight * trailWeight * (3 - 2 * trailWeight);
        const coreFactor = 1 - Math.max(0, Math.min(1, (tDist - 0.35) / 0.95));
        const smoothCore = coreFactor * coreFactor * (3 - 2 * coreFactor);
        cTemp.lerp(cTrailEdge, smoothWeight * 0.92);
        cTemp.lerp(cTrailCore, smoothCore * 0.96);
      }
    }

    colorArray[i * 3] = cTemp.r;
    colorArray[i * 3 + 1] = cTemp.g;
    colorArray[i * 3 + 2] = cTemp.b;
  }
  terrainGeo.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.grass,
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.0,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = shadowsEnabled;
  terrainMesh.name = "terrain";
  rootGroup.add(terrainMesh);

  // 1b. Circular Earthen Cliff Rim & Floating Island Skirt
  const cliffRings = 4;
  const cliffVertsCount = cliffRings * radialSegments + 1;
  const cliffPos = new Float32Array(cliffVertsCount * 3);
  const cliffColors = new Float32Array(cliffVertsCount * 3);

  const cLipTurf = new THREE.Color("#63a341");
  const cUpperEarth = new THREE.Color("#9e6e42");
  const cMidEarth = new THREE.Color("#7f532f");
  const cDeepEarth = new THREE.Color("#53341d");

  for (let ia = 0; ia < radialSegments; ia++) {
    const theta = ringAngles[ia];
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const edgeX = cosT * ISLAND_RADIUS;
    const edgeZ = sinT * ISLAND_RADIUS;
    const edgeY = groundHeightAt(edgeX, edgeZ);
    const rockWave = Math.sin(theta * 11) * 0.38 + Math.cos(theta * 17) * 0.24;

    const ringSpecs: Array<{ r: number; y: number; col: THREE.Color }> = [
      { r: ISLAND_RADIUS, y: edgeY + 0.01, col: cLipTurf },
      { r: ISLAND_RADIUS + 0.36 + rockWave * 0.25, y: edgeY - 0.58, col: cUpperEarth },
      { r: ISLAND_RADIUS - 0.85 + rockWave * 0.75, y: -3.2 + rockWave * 0.35, col: cMidEarth },
      { r: ISLAND_RADIUS - 4.2 + rockWave * 0.5, y: -6.4, col: cDeepEarth },
    ];

    for (let rk = 0; rk < cliffRings; rk++) {
      const idx = rk * radialSegments + ia;
      const spec = ringSpecs[rk];
      cliffPos[idx * 3] = cosT * spec.r;
      cliffPos[idx * 3 + 1] = spec.y;
      cliffPos[idx * 3 + 2] = sinT * spec.r;
      cliffColors[idx * 3] = spec.col.r;
      cliffColors[idx * 3 + 1] = spec.col.g;
      cliffColors[idx * 3 + 2] = spec.col.b;
    }
  }

  const bottomCenterIdx = cliffRings * radialSegments;
  cliffPos[bottomCenterIdx * 3] = 0;
  cliffPos[bottomCenterIdx * 3 + 1] = -7.6;
  cliffPos[bottomCenterIdx * 3 + 2] = 0;
  cliffColors[bottomCenterIdx * 3] = cDeepEarth.r;
  cliffColors[bottomCenterIdx * 3 + 1] = cDeepEarth.g;
  cliffColors[bottomCenterIdx * 3 + 2] = cDeepEarth.b;

  const cliffIndices: number[] = [];
  for (let rk = 0; rk < cliffRings - 1; rk++) {
    const upperBase = rk * radialSegments;
    const lowerBase = (rk + 1) * radialSegments;
    for (let ia = 0; ia < radialSegments; ia++) {
      const nextIa = (ia + 1) % radialSegments;
      const t0 = upperBase + ia;
      const t1 = upperBase + nextIa;
      const b0 = lowerBase + ia;
      const b1 = lowerBase + nextIa;
      cliffIndices.push(t0, t1, b0);
      cliffIndices.push(t1, b1, b0);
    }
  }

  // Bottom cap (outward/downward -Y winding)
  const lastRingBase = (cliffRings - 1) * radialSegments;
  for (let ia = 0; ia < radialSegments; ia++) {
    const nextIa = (ia + 1) % radialSegments;
    cliffIndices.push(bottomCenterIdx, lastRingBase + ia, lastRingBase + nextIa);
  }

  const cliffGeo = trackGeo(new THREE.BufferGeometry());
  cliffGeo.setAttribute("position", new THREE.BufferAttribute(cliffPos, 3));
  cliffGeo.setAttribute("color", new THREE.BufferAttribute(cliffColors, 3));
  cliffGeo.setIndex(cliffIndices);
  cliffGeo.computeVertexNormals();

  const cliffMat = trackMat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.0,
      flatShading: true,
    })
  );
  const cliffMesh = new THREE.Mesh(cliffGeo, cliffMat);
  cliffMesh.receiveShadow = shadowsEnabled;
  cliffMesh.name = "island-cliff-skirt";
  rootGroup.add(cliffMesh);

  // 2. Canal & Pond Water + Aquatic Flora & Fauna
  const waterGeo = trackGeo(new THREE.PlaneGeometry(36, 36, 12, 12));
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.waterPixel,
      color: "#52b6f0",
      roughness: 0.16,
      metalness: 0.06,
      transparent: true,
      opacity: 0.86,
    })
  );
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(-1, -0.32, -1);
  waterMesh.receiveShadow = shadowsEnabled;
  rootGroup.add(waterMesh);

  const lilyMat = trackMat(new THREE.MeshStandardMaterial({ color: "#73c956", roughness: 0.7 }));
  const lotusMat = trackMat(new THREE.MeshStandardMaterial({ color: "#ff9ec2", roughness: 0.55 }));
  const sharedLilyPadGeo = trackGeo(
    new THREE.CylinderGeometry(1.0, 1.0, 0.06, 12, 1, false, 0, Math.PI * 1.85)
  );
  const sharedLotusPetalGeo = trackGeo(new THREE.SphereGeometry(0.14, 6, 5));
  const lilySpecs: Array<[number, number, number, boolean]> = [
    [8.2, 8.6, 0.75, true],
    [11.4, 8.4, 0.62, false],
    [10.8, 11.4, 0.8, true],
    [7.4, 10.9, 0.58, false],
    [12.2, 10.2, 0.65, true],
    [-8.5, -7.8, 0.48, false],
    [2.1, 2.7, 0.52, true],
  ];
  for (const [lx, lz, lr, hasFlower] of lilySpecs) {
    const pad = new THREE.Mesh(sharedLilyPadGeo, lilyMat);
    pad.position.set(lx, -0.28, lz);
    pad.scale.set(lr, 1, lr);
    pad.rotation.y = lx * 1.1;
    rootGroup.add(pad);

    if (hasFlower) {
      const flowerGroup = new THREE.Group();
      flowerGroup.position.set(lx, -0.24, lz);
      for (let p = 0; p < 5; p++) {
        const petal = new THREE.Mesh(sharedLotusPetalGeo, lotusMat);
        const ang = (p / 5) * Math.PI * 2;
        petal.position.set(Math.cos(ang) * 0.12, 0.06, Math.sin(ang) * 0.12);
        petal.scale.set(1.2, 0.7, 0.9);
        flowerGroup.add(petal);
      }
      rootGroup.add(flowerGroup);
    }
  }

  const reedStemMat = trackMat(new THREE.MeshStandardMaterial({ color: "#58a346", roughness: 0.82 }));
  const reedHeadMat = trackMat(new THREE.MeshStandardMaterial({ color: "#8f5832", roughness: 0.88 }));
  const sharedReedStemGeo = trackGeo(new THREE.CylinderGeometry(0.03, 0.04, 1.0, 5));
  const sharedReedHeadGeo = trackGeo(new THREE.CapsuleGeometry(0.06, 0.16, 3, 5));
  const reedCoords: Array<[number, number]> = [
    [5.6, 7.6],
    [6.1, 12.1],
    [13.4, 7.3],
    [13.6, 11.9],
    [-6.2, -9.2],
  ];
  for (const [rx, rz] of reedCoords) {
    for (let k = 0; k < 3; k++) {
      const stalk = new THREE.Group();
      stalk.position.set(rx + (k - 1) * 0.28, -0.35, rz + ((k % 2) - 0.5) * 0.25);
      const stem = new THREE.Mesh(sharedReedStemGeo, reedStemMat);
      stem.position.y = 0.5;
      stalk.add(stem);
      const head = new THREE.Mesh(sharedReedHeadGeo, reedHeadMat);
      head.position.y = 0.9;
      stalk.add(head);
      stalk.rotation.z = (k - 1) * 0.08;
      rootGroup.add(stalk);
    }
  }

  // Articulated Storybook Koi Fish (River Canal + Lotus Pond) & Ducklings
  const koiBodyGeo = trackGeo(new THREE.SphereGeometry(0.145, 12, 10));
  const koiBellyGeo = trackGeo(new THREE.SphereGeometry(0.125, 10, 8));
  const koiSpotGeo = trackGeo(new THREE.SphereGeometry(0.085, 8, 8));
  const koiEyeGeo = trackGeo(new THREE.SphereGeometry(0.026, 6, 6));
  const koiEyeShineGeo = trackGeo(new THREE.SphereGeometry(0.011, 5, 5));
  const koiDorsalGeo = trackGeo(new THREE.ConeGeometry(0.055, 0.22, 4));
  const koiPectoralGeo = trackGeo(new THREE.ConeGeometry(0.065, 0.16, 4));
  const koiTailLobeGeo = trackGeo(new THREE.ConeGeometry(0.075, 0.23, 4));

  const koiEyeMat = trackMat(new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.2 }));
  const koiShineMat = trackMat(new THREE.MeshBasicMaterial({ color: "#ffffff" }));
  const koiBellyMat = trackMat(new THREE.MeshStandardMaterial({ color: "#fff8eb", roughness: 0.45 }));

  interface KoiBlueprint {
    bodyColor: string;
    spotColor: string | null;
    finColor: string;
    spotLayout: "kohaku" | "tancho" | "showa" | "solid";
    centerX: number;
    centerZ: number;
    radiusX: number;
    radiusZ: number;
    pathRotation: number;
    meanderAmp: number;
    speed: number;
    phase: number;
    scale: number;
  }

  const koiBlueprints: KoiBlueprint[] = [
    // River fish #1: Kohaku patrolling upstream tunnel <-> wooden bridge
    {
      bodyColor: "#fff8ef",
      spotColor: "#f97316",
      finColor: "#fde68a",
      spotLayout: "kohaku",
      centerX: -5.4,
      centerZ: -5.4,
      radiusX: 5.0,
      radiusZ: 0.7,
      pathRotation: Math.PI / 4,
      meanderAmp: 0.22,
      speed: 0.34,
      phase: 0.4,
      scale: 1.08,
    },
    // River fish #2: Yamabuki Ogon swimming under bridge <-> pond entrance
    {
      bodyColor: "#facc15",
      spotColor: "#fb923c",
      finColor: "#fef08a",
      spotLayout: "showa",
      centerX: 1.4,
      centerZ: 1.4,
      radiusX: 5.2,
      radiusZ: 0.68,
      pathRotation: Math.PI / 4,
      meanderAmp: 0.24,
      speed: 0.3,
      phase: 3.1,
      scale: 1.0,
    },
    // River fish #3: Coral Red Koi swimming along mid-canal near bridge
    {
      bodyColor: "#fb7185",
      spotColor: "#ffffff",
      finColor: "#fecdd3",
      spotLayout: "kohaku",
      centerX: -1.8,
      centerZ: -1.8,
      radiusX: 4.1,
      radiusZ: 0.62,
      pathRotation: Math.PI / 4,
      meanderAmp: 0.18,
      speed: 0.38,
      phase: 1.75,
      scale: 0.92,
    },
    // Pond fish #1: Classic Tancho Koi circling lotus pond
    {
      bodyColor: "#ffffff",
      spotColor: "#ef4444",
      finColor: "#fed7aa",
      spotLayout: "tancho",
      centerX: 9.6,
      centerZ: 9.4,
      radiusX: 2.55,
      radiusZ: 2.25,
      pathRotation: 0.3,
      meanderAmp: 0.15,
      speed: 0.42,
      phase: 0.0,
      scale: 1.12,
    },
    // Pond fish #2: Golden Hi-Utsuri circling outer pond
    {
      bodyColor: "#ff8552",
      spotColor: "#27272a",
      finColor: "#fdba74",
      spotLayout: "showa",
      centerX: 9.4,
      centerZ: 9.7,
      radiusX: 3.25,
      radiusZ: 2.75,
      pathRotation: -0.25,
      meanderAmp: 0.18,
      speed: 0.35,
      phase: 2.4,
      scale: 1.04,
    },
    // Pond fish #3: Azure Asagi smaller koi darting inside pond
    {
      bodyColor: "#7dd3fc",
      spotColor: "#fb923c",
      finColor: "#e0f2fe",
      spotLayout: "kohaku",
      centerX: 9.8,
      centerZ: 9.2,
      radiusX: 1.75,
      radiusZ: 1.95,
      pathRotation: 0.5,
      meanderAmp: 0.14,
      speed: 0.5,
      phase: 4.5,
      scale: 0.88,
    },
  ];

  const kois: AnimatedKoi[] = [];

  for (const bp of koiBlueprints) {
    const koiGroup = new THREE.Group();
    koiGroup.scale.setScalar(bp.scale);

    const bodyPivot = new THREE.Group();
    koiGroup.add(bodyPivot);

    const primaryMat = trackMat(
      new THREE.MeshStandardMaterial({ color: bp.bodyColor, roughness: 0.32, metalness: 0.05 })
    );
    const finMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: bp.finColor,
        roughness: 0.45,
        transparent: true,
        opacity: 0.88,
      })
    );
    const spotMat = bp.spotColor
      ? trackMat(new THREE.MeshStandardMaterial({ color: bp.spotColor, roughness: 0.36 }))
      : null;

    // Sculpted Koi Body (+Z is forward nose)
    const torso = new THREE.Mesh(koiBodyGeo, primaryMat);
    torso.scale.set(0.84, 0.9, 1.85);
    bodyPivot.add(torso);

    // Cream Underbelly
    const belly = new THREE.Mesh(koiBellyGeo, koiBellyMat);
    belly.position.set(0, -0.025, 0.01);
    belly.scale.set(0.76, 0.72, 1.68);
    bodyPivot.add(belly);

    // Dorsal Crest Fin
    const dorsal = new THREE.Mesh(koiDorsalGeo, finMat);
    dorsal.position.set(0, 0.135, -0.02);
    dorsal.rotation.x = -0.55;
    dorsal.scale.set(0.28, 1.0, 1.35);
    bodyPivot.add(dorsal);

    // Koi Dorsal Markings
    if (spotMat) {
      if (bp.spotLayout === "tancho") {
        const crownSpot = new THREE.Mesh(koiSpotGeo, spotMat);
        crownSpot.position.set(0, 0.095, 0.14);
        crownSpot.scale.set(0.75, 0.45, 0.75);
        bodyPivot.add(crownSpot);
      } else {
        const spot1 = new THREE.Mesh(koiSpotGeo, spotMat);
        spot1.position.set(0.02, 0.092, 0.11);
        spot1.scale.set(0.95, 0.45, 1.05);
        bodyPivot.add(spot1);

        const spot2 = new THREE.Mesh(koiSpotGeo, spotMat);
        spot2.position.set(-0.025, 0.088, -0.09);
        spot2.scale.set(0.82, 0.42, 0.92);
        bodyPivot.add(spot2);
      }
    }

    // Expressive Glossy Eyes with Specular Dot
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(koiEyeGeo, koiEyeMat);
      eye.position.set(side * 0.088, 0.03, 0.175);
      bodyPivot.add(eye);

      const shine = new THREE.Mesh(koiEyeShineGeo, koiShineMat);
      shine.position.set(side * 0.102, 0.044, 0.186);
      bodyPivot.add(shine);
    }

    // Articulated Left & Right Pectoral Side Fins
    const leftFinPivot = new THREE.Group();
    leftFinPivot.position.set(-0.095, -0.03, 0.06);
    const leftFinMesh = new THREE.Mesh(koiPectoralGeo, finMat);
    leftFinMesh.rotation.set(0, 0, Math.PI * 0.42);
    leftFinMesh.scale.set(0.32, 1.0, 1.05);
    leftFinMesh.position.set(-0.065, -0.01, -0.02);
    leftFinPivot.add(leftFinMesh);
    bodyPivot.add(leftFinPivot);

    const rightFinPivot = new THREE.Group();
    rightFinPivot.position.set(0.095, -0.03, 0.06);
    const rightFinMesh = new THREE.Mesh(koiPectoralGeo, finMat);
    rightFinMesh.rotation.set(0, 0, -Math.PI * 0.42);
    rightFinMesh.scale.set(0.32, 1.0, 1.05);
    rightFinMesh.position.set(0.065, -0.01, -0.02);
    rightFinPivot.add(rightFinMesh);
    bodyPivot.add(rightFinPivot);

    // Articulated Forked Caudal Tail Fin pivoted cleanly at tail peduncle
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0, -0.22);

    const upperTail = new THREE.Mesh(koiTailLobeGeo, finMat);
    upperTail.rotation.x = -Math.PI / 2 - 0.34;
    upperTail.scale.set(0.28, 1.05, 0.9);
    upperTail.position.set(0, 0.045, -0.1);
    tailPivot.add(upperTail);

    const lowerTail = new THREE.Mesh(koiTailLobeGeo, finMat);
    lowerTail.rotation.x = -Math.PI / 2 + 0.34;
    lowerTail.scale.set(0.28, 1.05, 0.9);
    lowerTail.position.set(0, -0.04, -0.1);
    tailPivot.add(lowerTail);

    koiGroup.add(tailPivot);
    rootGroup.add(koiGroup);

    kois.push({
      group: koiGroup,
      body: bodyPivot,
      tail: tailPivot,
      leftFin: leftFinPivot,
      rightFin: rightFinPivot,
      centerX: bp.centerX,
      centerZ: bp.centerZ,
      radiusX: bp.radiusX,
      radiusZ: bp.radiusZ,
      pathRotation: bp.pathRotation,
      meanderAmp: bp.meanderAmp,
      baseY: -0.38,
      speed: bp.speed,
      phase: bp.phase,
      scale: bp.scale,
    });
  }

  const duckYellow = trackMat(new THREE.MeshStandardMaterial({ color: "#ffd942", roughness: 0.48 }));
  const duckBeak = trackMat(new THREE.MeshStandardMaterial({ color: "#f5842c", roughness: 0.5 }));
  const sharedDuckBodyGeo = trackGeo(new THREE.SphereGeometry(0.22, 8, 6));
  const sharedDuckHeadGeo = trackGeo(new THREE.SphereGeometry(0.15, 8, 6));
  const sharedDuckTailGeo = trackGeo(new THREE.ConeGeometry(0.08, 0.18, 5));
  const sharedDuckBeakGeo = trackGeo(new THREE.ConeGeometry(0.06, 0.14, 5));
  for (let d = 0; d < 2; d++) {
    const duckGroup = new THREE.Group();
    const dBody = new THREE.Mesh(sharedDuckBodyGeo, duckYellow);
    dBody.scale.set(0.95, 0.78, 1.2);
    duckGroup.add(dBody);
    const dHead = new THREE.Mesh(sharedDuckHeadGeo, duckYellow);
    dHead.position.set(0, 0.2, 0.16);
    duckGroup.add(dHead);
    const dTail = new THREE.Mesh(sharedDuckTailGeo, duckYellow);
    dTail.position.set(0, 0.12, -0.24);
    dTail.rotation.x = -0.65;
    duckGroup.add(dTail);
    const beak = new THREE.Mesh(sharedDuckBeakGeo, duckBeak);
    beak.position.set(0, 0.18, 0.31);
    beak.rotation.x = Math.PI / 2;
    duckGroup.add(beak);

    rootGroup.add(duckGroup);
    kois.push({
      group: duckGroup,
      tail: dTail,
      centerX: 9.2 + d * 1.1,
      centerZ: 8.8 + d * 0.9,
      radiusX: 1.3 + d * 0.5,
      radiusZ: 1.1 + d * 0.45,
      baseY: -0.27,
      speed: 0.32 + d * 0.08,
      phase: d * 1.6,
      isDuck: true,
    });
  }

  return { terrainMesh, waterMesh, kois };
}
