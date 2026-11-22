import * as THREE from 'three';
import { PixelTextureSet } from './pixelTextures';
import {
  FENCE_SPECS,
  LANDMARKS,
  STEPPING_STONES,
  STUMP_SPECS,
  WORLD_SIZE,
  distanceToTrail,
  generateWorldProps,
  grassPatchFactor,
  groundHeightAt,
  isInCanalOrPond,
  mulberry32,
  walkableHeightAt,
} from './worldData';

export interface AnimatedKoi {
  group: THREE.Group;
  tail: THREE.Mesh;
  centerX: number;
  centerZ: number;
  radiusX: number;
  radiusZ: number;
  speed: number;
  phase: number;
  isDuck?: boolean;
}

export interface ExplorerRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  armL: THREE.Mesh;
  armR: THREE.Mesh;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  hatGroup: THREE.Group;
  shadow: THREE.Mesh;
}

export interface NavigationVisuals {
  group: THREE.Group;
  breadcrumbs: THREE.InstancedMesh;
  maxBreadcrumbs: number;
  beaconGroup: THREE.Group;
  beaconRing: THREE.Mesh;
  beaconBeam: THREE.Mesh;
  beaconDiamond: THREE.Mesh;
}

export interface RainSystem {
  mesh: THREE.InstancedMesh;
  count: number;
  positions: Float32Array;
  speeds: Float32Array;
  ripples: THREE.Mesh[];
  ripplePhases: Float32Array;
}

export interface BuiltWorld {
  terrainMesh: THREE.Mesh;
  cobbleOverlay: THREE.Mesh;
  walkableClickTargets: THREE.Object3D[];
  waterMesh: THREE.Mesh;
  explorer: ExplorerRig;
  kois: AnimatedKoi[];
  lanternLights: THREE.PointLight[];
  lanternBulbs: THREE.Mesh[];
  navVisuals: NavigationVisuals;
  rain: RainSystem;
  landmarkHitboxes: THREE.Mesh[];
  dispose: () => void;
}

export function buildRetroWorld(
  scene: THREE.Scene,
  textures: PixelTextureSet,
  isSoftwareGl: boolean,
): BuiltWorld {
  const disposables: Array<{ dispose: () => void }> = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposables.push(m);
    return m;
  };

  // =========================================================
  // 1. SOFT STORYBOOK TERRAIN WITH WINDING SANDY TRAIL & CLIFF FACES
  // =========================================================
  const segs = 128;
  const terrainGeo = trackGeo(new THREE.PlaneGeometry(WORLD_SIZE + 24, WORLD_SIZE + 24, segs, segs));
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, groundHeightAt(vx, vz));
  }
  terrainGeo.computeVertexNormals();

  const normAttr = terrainGeo.attributes.normal as THREE.BufferAttribute;
  const colorArray = new Float32Array(posAttr.count * 3);

  const cMeadowBase = new THREE.Color('#7ec254'); // Soft lush sage meadow (no chalky white)
  const cGrassPatch = new THREE.Color('#64ab3f'); // Deeper mossy grass islands
  const cGrassHillTop = new THREE.Color('#95d462'); // Sunlit hilltops
  const cTrailCore = new THREE.Color('#dfb263'); // Warm golden sandy path
  const cTrailEdge = new THREE.Color('#bd8a3f'); // Soft warm border along path
  const cCliffEarth = new THREE.Color('#a67543'); // Warm earthen cliff wall
  const cSandBank = new THREE.Color('#bfa473');
  const cDeepBed = new THREE.Color('#3b799c');
  const cTemp = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);
    const ny = normAttr.getY(i);

    if (vy < -0.45) {
      cTemp.copy(cDeepBed);
    } else if (vy < -0.02) {
      const t = (vy + 0.45) / 0.43;
      cTemp.copy(cDeepBed).lerp(cSandBank, Math.max(0, Math.min(1, t)));
    } else {
      const patch = grassPatchFactor(vx, vz);
      cTemp.copy(cMeadowBase).lerp(cGrassPatch, patch);

      if (vy > 0.6) {
        const hillT = Math.min(1, (vy - 0.6) / 1.8);
        cTemp.lerp(cGrassHillTop, hillT * 0.6);
      }

      // Earthen cliff slopes (where normal tilts away from vertical)
      if (ny < 0.87 && vy > 0.15) {
        const cliffT = Math.min(1, (0.87 - ny) * 4.2);
        cTemp.lerp(cCliffEarth, cliffT);
      }

      // Winding sandy trail blend
      const tDist = distanceToTrail(vx, vz);
      if (tDist < 2.05) {
        if (tDist < 1.38) {
          const coreT = 1 - Math.max(0, (tDist - 1.0) / 0.38);
          cTemp.lerp(cTrailEdge, 1).lerp(cTrailCore, coreT);
        } else {
          const edgeT = 1 - (tDist - 1.38) / 0.67;
          cTemp.lerp(cTrailEdge, edgeT * 0.85);
        }
      }
    }

    colorArray[i * 3] = cTemp.r;
    colorArray[i * 3 + 1] = cTemp.g;
    colorArray[i * 3 + 2] = cTemp.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.grass,
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.0,
    }),
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = !isSoftwareGl;
  terrainMesh.name = 'terrain';
  scene.add(terrainMesh);

  // =========================================================
  // 2. SOFT COBBLESTONE PLAZA & STEPPING STONES
  // =========================================================
  const plazaGeo = trackGeo(new THREE.CylinderGeometry(5.5, 5.8, 0.12, 20));
  const plazaMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.cobble,
      roughness: 0.88,
      metalness: 0.02,
    }),
  );
  const cobbleOverlay = new THREE.Mesh(plazaGeo, plazaMat);
  cobbleOverlay.position.set(14.8, 0.07, -1.6);
  cobbleOverlay.scale.set(1.12, 1, 0.92);
  cobbleOverlay.receiveShadow = !isSoftwareGl;
  scene.add(cobbleOverlay);

  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.sandstoneTile,
      color: '#f2e3c2',
      roughness: 0.85,
    }),
  );
  for (const st of STEPPING_STONES) {
    const g = trackGeo(new THREE.CylinderGeometry(st.radius, st.radius * 1.06, 0.16, 12));
    const m = new THREE.Mesh(g, stoneMat);
    m.position.set(st.x, groundHeightAt(st.x, st.z) + 0.04, st.z);
    m.rotation.y = st.rotation;
    m.receiveShadow = !isSoftwareGl;
    m.castShadow = !isSoftwareGl;
    scene.add(m);
  }

  // =========================================================
  // 3. CANAL & POND WATER + POND BOULDERS + DUCKLINGS + KOI + LILYPADS
  // =========================================================
  const waterGeo = trackGeo(new THREE.PlaneGeometry(36, 36, 32, 32));
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: textures.waterPixel,
      color: '#52b6f0',
      roughness: 0.18,
      metalness: 0.04,
      clearcoat: 0.5,
      transparent: true,
      opacity: 0.86,
    }),
  );
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(-1, -0.32, -1);
  waterMesh.receiveShadow = !isSoftwareGl;
  scene.add(waterMesh);

  // Soft warm stone canal edging
  const curbMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.stoneBrick,
      color: '#b8a084',
      roughness: 0.88,
    }),
  );
  const canalAngle = Math.atan2(1, 1);
  const curbGeo = trackGeo(new THREE.BoxGeometry(0.42, 0.58, 29.0));
  for (const side of [-1, 1]) {
    const curb = new THREE.Mesh(curbGeo, curbMat);
    const nx = Math.SQRT1_2 * side * 2.55;
    const nz = -Math.SQRT1_2 * side * 2.55;
    curb.position.set(-3.2 + nx, -0.1, -3.2 + nz);
    curb.rotation.y = canalAngle;
    curb.castShadow = !isSoftwareGl;
    curb.receiveShadow = !isSoftwareGl;
    scene.add(curb);
  }

  // Rounded Grey-Lavender Pond Boulders (matching reference pond rocks)
  const pondRockMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#a3aab8',
      roughness: 0.86,
      flatShading: true,
    }),
  );
  const pondRocks: Array<[number, number, number, number, number]> = [
    [6.6, 5.8, 1.35, 0.95, 1.15],
    [8.4, 5.2, 1.1, 0.78, 0.95],
    [5.2, 7.2, 0.85, 0.55, 0.78],
  ];
  for (const [rx, rz, sx, sy, sz] of pondRocks) {
    const rb = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(1.0, 1)), pondRockMat);
    rb.position.set(rx, -0.05, rz);
    rb.scale.set(sx, sy, sz);
    rb.rotation.y = rx * 0.4;
    rb.castShadow = !isSoftwareGl;
    rb.receiveShadow = !isSoftwareGl;
    scene.add(rb);
  }

  // Lilypads & Pink Lotus flowers
  const lilyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#73c956',
      roughness: 0.7,
    }),
  );
  const lotusMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ff9ec2',
      roughness: 0.55,
    }),
  );
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
    const padGeo = trackGeo(new THREE.CylinderGeometry(lr, lr, 0.06, 14, 1, false, 0, Math.PI * 1.85));
    const pad = new THREE.Mesh(padGeo, lilyMat);
    pad.position.set(lx, -0.28, lz);
    pad.rotation.y = lx * 1.1;
    scene.add(pad);

    if (hasFlower) {
      const flowerGroup = new THREE.Group();
      flowerGroup.position.set(lx, -0.24, lz);
      const petalGeo = trackGeo(new THREE.SphereGeometry(0.14, 7, 6));
      for (let p = 0; p < 5; p++) {
        const petal = new THREE.Mesh(petalGeo, lotusMat);
        const ang = (p / 5) * Math.PI * 2;
        petal.position.set(Math.cos(ang) * 0.12, 0.06, Math.sin(ang) * 0.12);
        petal.scale.set(1.2, 0.7, 0.9);
        flowerGroup.add(petal);
      }
      scene.add(flowerGroup);
    }
  }

  // Cattail Reeds
  const reedStemMat = trackMat(new THREE.MeshStandardMaterial({ color: '#58a346', roughness: 0.82 }));
  const reedHeadMat = trackMat(new THREE.MeshStandardMaterial({ color: '#8f5832', roughness: 0.88 }));
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
      const stem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.03, 0.04, 1.0, 6)), reedStemMat);
      stem.position.y = 0.5;
      stalk.add(stem);
      const head = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.06, 0.16, 4, 6)), reedHeadMat);
      head.position.y = 0.9;
      stalk.add(head);
      stalk.rotation.z = (k - 1) * 0.08;
      scene.add(stalk);
    }
  }

  // Animated Koi Fish + Cute Yellow Ducklings!
  const kois: AnimatedKoi[] = [];
  const koiColors = ['#ff8552', '#fff6e3', '#f7c552'];
  for (let i = 0; i < 3; i++) {
    const koiGroup = new THREE.Group();
    const koiMat = trackMat(new THREE.MeshStandardMaterial({ color: koiColors[i], roughness: 0.4 }));
    const body = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.11, 0.3, 4, 8)), koiMat);
    body.rotation.x = Math.PI / 2;
    koiGroup.add(body);
    const tail = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.1, 0.22, 5)), koiMat);
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = -0.26;
    koiGroup.add(tail);

    scene.add(koiGroup);
    kois.push({
      group: koiGroup,
      tail,
      centerX: i === 2 ? -5.0 : 9.5,
      centerZ: i === 2 ? -5.0 : 9.5,
      radiusX: i === 2 ? 1.1 : 2.3 + i * 0.65,
      radiusZ: i === 2 ? 1.1 : 2.1 + i * 0.55,
      speed: 0.4 + i * 0.1,
      phase: i * 2.1,
    });
  }

  // 2 Cute Yellow Ducklings swimming on the pond surface
  const duckYellow = trackMat(new THREE.MeshStandardMaterial({ color: '#ffd942', roughness: 0.48 }));
  const duckBeak = trackMat(new THREE.MeshStandardMaterial({ color: '#f5842c', roughness: 0.5 }));
  for (let d = 0; d < 2; d++) {
    const duckGroup = new THREE.Group();
    const dBody = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.22, 10, 8)), duckYellow);
    dBody.scale.set(0.95, 0.78, 1.2);
    duckGroup.add(dBody);
    const dHead = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.15, 10, 8)), duckYellow);
    dHead.position.set(0, 0.2, 0.16);
    duckGroup.add(dHead);
    const dTail = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.08, 0.18, 6)), duckYellow);
    dTail.position.set(0, 0.12, -0.24);
    dTail.rotation.x = -0.65;
    duckGroup.add(dTail);
    const beak = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.06, 0.14, 6)), duckBeak);
    beak.position.set(0, 0.18, 0.31);
    beak.rotation.x = Math.PI / 2;
    duckGroup.add(beak);

    scene.add(duckGroup);
    kois.push({
      group: duckGroup,
      tail: dTail,
      centerX: 9.2 + d * 1.1,
      centerZ: 8.8 + d * 0.9,
      radiusX: 1.3 + d * 0.5,
      radiusZ: 1.1 + d * 0.45,
      speed: 0.32 + d * 0.08,
      phase: d * 1.6,
      isDuck: true,
    });
  }

  // =========================================================
  // 4. COMPOSITE LANDMARK STRUCTURES (SOFT STORYBOOK FINISH)
  // =========================================================
  const lanternLights: THREE.PointLight[] = [];
  const lanternBulbs: THREE.Mesh[] = [];

  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.woodPlank,
      roughness: 0.82,
      metalness: 0.02,
    }),
  );
  const darkIronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#4c5866',
      roughness: 0.48,
      metalness: 0.55,
    }),
  );
  const bulbMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ffebb3',
      emissive: '#ffb84d',
      emissiveIntensity: 1.1,
      roughness: 0.25,
    }),
  );

  const createLantern = (x: number, y: number, z: number, withLight = true): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    const post = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 8)), woodMat);
    post.position.y = 1.1;
    post.castShadow = !isSoftwareGl;
    g.add(post);

    const arm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.5, 0.1, 0.1)), darkIronMat);
    arm.position.set(0.22, 2.12, 0);
    g.add(arm);

    const cap = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.22, 0.18, 6)), darkIronMat);
    cap.position.set(0.44, 2.02, 0);
    g.add(cap);

    const bulb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.14, 8, 8)), bulbMat);
    bulb.position.set(0.44, 1.82, 0);
    g.add(bulb);
    lanternBulbs.push(bulb);

    if (withLight) {
      const pt = new THREE.PointLight('#ffc46b', 0.9, 13, 1.6);
      pt.position.set(0.44, 1.8, 0);
      g.add(pt);
      lanternLights.push(pt);
    }

    scene.add(g);
    return g;
  };

  // --- A. WOODEN CANAL FOOTBRIDGE ---
  {
    const bridge = new THREE.Group();
    bridge.position.set(-3.2, 0, -3.2);
    bridge.rotation.y = Math.PI / 4;

    const bridgeSpan = 7.4;
    const bridgeWidth = 3.2;

    const pilingGeo = trackGeo(new THREE.CylinderGeometry(0.15, 0.16, 2.2, 8));
    for (const px of [-2.4, 2.4]) {
      for (const pz of [-1.35, 1.35]) {
        const piling = new THREE.Mesh(pilingGeo, woodMat);
        piling.position.set(px, 0.1, pz);
        piling.castShadow = !isSoftwareGl;
        bridge.add(piling);
      }
    }

    const plankGeo = trackGeo(new THREE.BoxGeometry(0.6, 0.16, bridgeWidth));
    for (let i = 0; i < 11; i++) {
      const t = (i / 10) * 2 - 1;
      const px = t * (bridgeSpan * 0.45);
      const archY = 0.48 + Math.cos(t * Math.PI * 0.5) * 0.42;
      const plank = new THREE.Mesh(plankGeo, woodMat);
      plank.position.set(px, archY, 0);
      plank.rotation.z = -Math.sin(t * Math.PI * 0.5) * 0.11;
      plank.castShadow = !isSoftwareGl;
      plank.receiveShadow = !isSoftwareGl;
      bridge.add(plank);
    }

    const railPostGeo = trackGeo(new THREE.CylinderGeometry(0.09, 0.1, 1.05, 8));
    const railBarGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.06, bridgeSpan * 0.94, 8));
    for (const rz of [-bridgeWidth * 0.46, bridgeWidth * 0.46]) {
      for (const px of [-3.1, 0, 3.1]) {
        const archY = 0.52 + Math.cos((px / 3.5) * Math.PI * 0.5) * 0.4;
        const post = new THREE.Mesh(railPostGeo, woodMat);
        post.position.set(px, archY + 0.48, rz);
        post.castShadow = !isSoftwareGl;
        bridge.add(post);
      }
      const rail = new THREE.Mesh(railBarGeo, woodMat);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, 1.38, rz);
      rail.castShadow = !isSoftwareGl;
      bridge.add(rail);
    }

    scene.add(bridge);
    createLantern(-6.0, groundHeightAt(-6.0, -0.4), -0.4, true);
    createLantern(-0.4, groundHeightAt(-0.4, -6.0), -6.0, false);
  }

  // --- B. GERBANG TEROWONGAN ---
  {
    const tunnel = new THREE.Group();
    tunnel.position.set(-14.2, 0, -14.2);
    tunnel.rotation.y = Math.PI / 4;

    const rockMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#88909e',
        roughness: 0.9,
        flatShading: true,
      }),
    );
    const stoneArchMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.stoneBrick,
        roughness: 0.84,
      }),
    );

    const boulderOffsets: Array<[number, number, number, number]> = [
      [0, 2.2, -2.5, 3.8],
      [-2.5, 1.7, -1.6, 2.5],
      [2.5, 1.8, -1.6, 2.6],
      [-1.5, 3.4, -2.8, 2.3],
      [1.5, 3.2, -2.7, 2.2],
    ];
    for (const [bx, by, bz, br] of boulderOffsets) {
      const boulder = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(br, 1)), rockMat);
      boulder.position.set(bx, by, bz);
      boulder.scale.set(1.1, 0.9, 1.0);
      boulder.castShadow = !isSoftwareGl;
      boulder.receiveShadow = !isSoftwareGl;
      tunnel.add(boulder);
    }

    const voidMat = trackMat(new THREE.MeshBasicMaterial({ color: '#242b35' }));
    const caveVoid = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.4, 3.1, 2.8)), voidMat);
    caveVoid.position.set(0, 1.2, -1.4);
    tunnel.add(caveVoid);

    const pillarGeo = trackGeo(new THREE.BoxGeometry(0.85, 3.3, 1.2));
    for (const sx of [-2.0, 2.0]) {
      const pillar = new THREE.Mesh(pillarGeo, stoneArchMat);
      pillar.position.set(sx, 1.25, 0.1);
      pillar.castShadow = !isSoftwareGl;
      tunnel.add(pillar);
    }
    const lintel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.1, 0.85, 1.35)), stoneArchMat);
    lintel.position.set(0, 3.1, 0.15);
    lintel.castShadow = !isSoftwareGl;
    tunnel.add(lintel);

    const signMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.signTunnel,
        emissiveMap: textures.signTunnel,
        emissive: '#ffcf6e',
        emissiveIntensity: 0.45,
        roughness: 0.45,
      }),
    );
    const marquee = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.5, 0.85, 0.18)), signMat);
    marquee.position.set(0, 3.1, 0.86);
    tunnel.add(marquee);

    for (const sx of [-2.1, 2.1]) {
      const bulb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.18, 8, 8)), bulbMat);
      bulb.position.set(sx, 2.15, 0.88);
      tunnel.add(bulb);
      lanternBulbs.push(bulb);
    }
    const tunnelLight = new THREE.PointLight('#ffbb5c', 1.2, 15, 1.5);
    tunnelLight.position.set(0, 2.4, 1.4);
    tunnel.add(tunnelLight);
    lanternLights.push(tunnelLight);

    scene.add(tunnel);
  }

  // --- C. BUKIT SANTAI (Cliff Ledge Lounge) ---
  {
    const baseY = groundHeightAt(-15, 4);
    const lounge = new THREE.Group();
    lounge.position.set(-15.0, baseY, 4.0);

    const floorMat = trackMat(
      new THREE.MeshStandardMaterial({ map: textures.sandstoneTile, roughness: 0.82 }),
    );
    const sofaWallMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#eb8352', roughness: 0.72 }),
    );
    const cushionMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#fad16b', roughness: 0.78 }),
    );

    const patio = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.0, 0.22, 5.0)), floorMat);
    patio.position.y = 0.08;
    patio.receiveShadow = !isSoftwareGl;
    lounge.add(patio);

    const backWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.55, 0.9, 3.6)), sofaWallMat);
    backWall.position.set(-1.55, 0.62, 0);
    backWall.castShadow = !isSoftwareGl;
    lounge.add(backWall);

    for (const sz of [-1.52, 1.52]) {
      const sideWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.7, 0.9, 0.55)), sofaWallMat);
      sideWall.position.set(-0.45, 0.62, sz);
      sideWall.castShadow = !isSoftwareGl;
      lounge.add(sideWall);
    }

    const seatBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.75, 0.36, 2.55)), cushionMat);
    seatBack.position.set(-0.92, 0.36, 0);
    lounge.add(seatBack);
    for (const sz of [-1.02, 1.02]) {
      const sideSeat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.75, 0.36, 0.65)), cushionMat);
      sideSeat.position.set(-0.2, 0.36, sz);
      lounge.add(sideSeat);
    }

    const table = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.95, 0.42, 0.95)), woodMat);
    table.position.set(0.25, 0.38, 0);
    table.castShadow = !isSoftwareGl;
    lounge.add(table);

    const miniLamp = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.16, 8, 8)), bulbMat);
    miniLamp.position.set(0.25, 0.74, 0);
    lounge.add(miniLamp);
    lanternBulbs.push(miniLamp);

    for (let s = 1; s <= 4; s++) {
      const sx = -15.0 + 2.6 + s * 0.95;
      const sy = groundHeightAt(sx, 4.0) + 0.05;
      const step = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.8, 0.22, 1.9)), stoneMat);
      step.position.set(sx, sy, 4.0);
      step.receiveShadow = !isSoftwareGl;
      step.castShadow = !isSoftwareGl;
      scene.add(step);
    }

    scene.add(lounge);
    createLantern(-12.6, groundHeightAt(-12.6, 1.8), 1.8, true);
  }

  // --- D. KAFE SENJA & KIOS JAMUR ---
  {
    const plazaY = groundHeightAt(16.5, -2.2);

    const mush = new THREE.Group();
    mush.position.set(11.5, groundHeightAt(11.5, -1.5), -1.5);

    const stemMat = trackMat(new THREE.MeshStandardMaterial({ color: '#fbf1dc', roughness: 0.82 }));
    const capMat = trackMat(
      new THREE.MeshStandardMaterial({ map: textures.mushroomCap, roughness: 0.48 }),
    );

    const stem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.75, 0.95, 2.3, 14)), stemMat);
    stem.position.y = 1.15;
    stem.castShadow = !isSoftwareGl;
    mush.add(stem);

    const counterRing = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.55, 1.45, 0.28, 16)), woodMat);
    counterRing.position.y = 1.05;
    counterRing.castShadow = !isSoftwareGl;
    mush.add(counterRing);

    const cap = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(2.35, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)), capMat);
    cap.position.y = 1.95;
    cap.scale.set(1, 0.72, 1);
    cap.castShadow = !isSoftwareGl;
    mush.add(cap);

    const fenceBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.2, 0.14, 0.14)), woodMat);
    fenceBar.position.set(3.2, 0.85, -0.8);
    fenceBar.rotation.y = 0.25;
    mush.add(fenceBar);

    scene.add(mush);

    const cafe = new THREE.Group();
    cafe.position.set(18.8, plazaY, -3.2);
    cafe.rotation.y = -Math.PI / 6;

    const wallMat = trackMat(new THREE.MeshStandardMaterial({ map: textures.cafeWall, roughness: 0.84 }));
    const roofMat = trackMat(new THREE.MeshStandardMaterial({ map: textures.terracottaRoof, roughness: 0.68 }));
    const awningMat = trackMat(new THREE.MeshStandardMaterial({ map: textures.awningStripe, roughness: 0.78 }));

    const plinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.6, 0.35, 5.2)), stoneMat);
    plinth.position.y = 0.17;
    plinth.receiveShadow = !isSoftwareGl;
    cafe.add(plinth);

    const mainBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.8, 2.8, 4.4)), wallMat);
    mainBody.position.y = 1.75;
    mainBody.castShadow = !isSoftwareGl;
    mainBody.receiveShadow = !isSoftwareGl;
    cafe.add(mainBody);

    const cornerGeo = trackGeo(new THREE.BoxGeometry(0.28, 2.85, 0.28));
    for (const cx of [-2.4, 2.4]) {
      for (const cz of [-2.2, 2.2]) {
        const col = new THREE.Mesh(cornerGeo, woodMat);
        col.position.set(cx, 1.75, cz);
        col.castShadow = !isSoftwareGl;
        cafe.add(col);
      }
    }

    const windowGlow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 1.15, 0.16)), bulbMat);
    windowGlow.position.set(0, 1.85, 2.22);
    cafe.add(windowGlow);
    lanternBulbs.push(windowGlow);

    const serviceShelf = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.0, 0.2, 0.72)), woodMat);
    serviceShelf.position.set(0, 1.2, 2.48);
    cafe.add(serviceShelf);

    const awning = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.6, 0.18, 1.35)), awningMat);
    awning.position.set(0, 2.65, 2.75);
    awning.rotation.x = 0.28;
    awning.castShadow = !isSoftwareGl;
    cafe.add(awning);

    const roof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(4.15, 2.45, 4)), roofMat);
    roof.position.y = 4.35;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = !isSoftwareGl;
    cafe.add(roof);

    const finial = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.26, 8, 8)), woodMat);
    finial.position.y = 5.58;
    cafe.add(finial);

    const chimney = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.65, 1.4, 0.65)), curbMat);
    chimney.position.set(-1.35, 4.75, -1.1);
    chimney.castShadow = !isSoftwareGl;
    cafe.add(chimney);

    const cafeSignMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.signCafe,
        emissiveMap: textures.signCafe,
        emissive: '#ffd280',
        emissiveIntensity: 0.35,
        roughness: 0.5,
      }),
    );
    const cafeSign = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.1, 0.78, 0.16)), cafeSignMat);
    cafeSign.position.set(0, 3.18, 2.45);
    cafe.add(cafeSign);

    const cafeLight = new THREE.PointLight('#ffc06e', 1.1, 15, 1.5);
    cafeLight.position.set(0, 2.4, 3.4);
    cafe.add(cafeLight);
    lanternLights.push(cafeLight);

    scene.add(cafe);
    createLantern(14.2, plazaY, 2.6, true);
  }

  // --- E. POS PANDANG SELATAN ---
  {
    const ovY = groundHeightAt(6.0, 20.0);
    const overlook = new THREE.Group();
    overlook.position.set(6.0, ovY, 20.0);

    const bench = new THREE.Group();
    bench.position.set(0, 0, 0.6);
    const seat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.2, 0.16, 0.72)), woodMat);
    seat.position.y = 0.52;
    seat.castShadow = !isSoftwareGl;
    bench.add(seat);
    const back = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.2, 0.55, 0.14)), woodMat);
    back.position.set(0, 0.85, 0.3);
    back.rotation.x = 0.15;
    back.castShadow = !isSoftwareGl;
    bench.add(back);
    for (const lx of [-0.85, 0.85]) {
      const leg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 0.52, 0.62)), darkIronMat);
      leg.position.set(lx, 0.26, 0);
      bench.add(leg);
    }
    overlook.add(bench);

    const brassMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#e5b34b', metalness: 0.65, roughness: 0.32 }),
    );
    const scopeGroup = new THREE.Group();
    scopeGroup.position.set(-1.85, 0, -0.4);
    const tripod = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.38, 1.15, 6)), woodMat);
    tripod.position.y = 0.58;
    scopeGroup.add(tripod);
    const tube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.08, 0.95, 10)), brassMat);
    tube.position.y = 1.25;
    tube.rotation.x = Math.PI / 2 - 0.15;
    scopeGroup.add(tube);
    overlook.add(scopeGroup);

    const post = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.09, 1.85, 8)), woodMat);
    post.position.set(2.0, 0.92, -0.3);
    overlook.add(post);
    const boardMat = trackMat(
      new THREE.MeshStandardMaterial({ map: textures.signPost, roughness: 0.8 }),
    );
    const board = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.5, 0.52, 0.1)), boardMat);
    board.position.set(2.0, 1.55, -0.2);
    board.rotation.y = -0.35;
    overlook.add(board);

    scene.add(overlook);
    createLantern(8.1, groundHeightAt(8.1, 18.8), 18.8, true);
  }

  // --- F. TREE STUMPS & RUSTIC WOODEN FENCES (FROM REFERENCE) ---
  const stumpTopMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#efd19c', roughness: 0.82 }),
  );
  for (const st of STUMP_SPECS) {
    const sy = groundHeightAt(st.x, st.z);
    const g = new THREE.Group();
    g.position.set(st.x, sy, st.z);
    g.rotation.y = st.rotation;
    g.scale.setScalar(st.scale);

    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.32, 0.52, 0.58, 9)), woodMat);
    base.position.y = 0.28;
    base.castShadow = !isSoftwareGl;
    g.add(base);

    const ring = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.29, 0.29, 0.06, 9)), stumpTopMat);
    ring.position.y = 0.57;
    g.add(ring);

    scene.add(g);
  }

  for (const f of FENCE_SPECS) {
    const fy = groundHeightAt(f.x, f.z);
    const fg = new THREE.Group();
    fg.position.set(f.x, fy, f.z);
    fg.rotation.y = f.rotation;

    const postGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.1, 1.05, 7));
    for (let p = 0; p <= f.panels; p++) {
      const post = new THREE.Mesh(postGeo, woodMat);
      post.position.set((p - f.panels * 0.5) * 1.15, 0.48, 0);
      post.rotation.z = (p % 2 === 0 ? 1 : -1) * 0.05;
      post.castShadow = !isSoftwareGl;
      fg.add(post);
    }

    const railLen = f.panels * 1.15 + 0.3;
    const railGeo = trackGeo(new THREE.BoxGeometry(railLen, 0.1, 0.08));
    for (const ry of [0.36, 0.72]) {
      const rail = new THREE.Mesh(railGeo, woodMat);
      rail.position.set(0, ry, 0.06);
      rail.castShadow = !isSoftwareGl;
      fg.add(rail);
    }

    scene.add(fg);
  }

  // =========================================================
  // 5. SOFT LAYERED TREES, ROCKS, GRASS TUFTS & PINK WILDFLOWERS
  // =========================================================
  const { trees, rocks } = generateWorldProps();
  const pineTrees = trees.filter((t) => t.kind === 'pine');
  const roundTrees = trees.filter((t) => t.kind === 'round');

  const trunkMat = trackMat(new THREE.MeshStandardMaterial({ map: textures.bark, roughness: 0.88 }));
  const pineMat = trackMat(new THREE.MeshStandardMaterial({ map: textures.foliagePine, roughness: 0.82 }));
  const roundMat = trackMat(new THREE.MeshStandardMaterial({ map: textures.foliageRound, roughness: 0.8 }));

  const dummy = new THREE.Object3D();
  const foliagePalette = [
    new THREE.Color('#ffffff'),
    new THREE.Color('#eaf6dd'),
    new THREE.Color('#f4f9d9'),
    new THREE.Color('#ddf1de'),
  ];

  if (pineTrees.length > 0) {
    const pTrunk = new THREE.InstancedMesh(
      trackGeo(new THREE.CylinderGeometry(0.22, 0.34, 1.45, 8)),
      trunkMat,
      pineTrees.length,
    );
    const pCone1 = new THREE.InstancedMesh(
      trackGeo(new THREE.ConeGeometry(1.48, 2.05, 10)),
      pineMat,
      pineTrees.length,
    );
    const pCone2 = new THREE.InstancedMesh(
      trackGeo(new THREE.ConeGeometry(1.14, 1.9, 10)),
      pineMat,
      pineTrees.length,
    );
    const pCone3 = new THREE.InstancedMesh(
      trackGeo(new THREE.ConeGeometry(0.76, 1.6, 10)),
      pineMat,
      pineTrees.length,
    );

    [pTrunk, pCone1, pCone2, pCone3].forEach((im) => {
      im.castShadow = !isSoftwareGl;
      im.receiveShadow = !isSoftwareGl;
    });

    pineTrees.forEach((t, idx) => {
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
      scene.add(im);
    });
  }

  if (roundTrees.length > 0) {
    const rTrunk = new THREE.InstancedMesh(
      trackGeo(new THREE.CylinderGeometry(0.22, 0.34, 1.7, 8)),
      trunkMat,
      roundTrees.length,
    );
    const rCrownMain = new THREE.InstancedMesh(
      trackGeo(new THREE.SphereGeometry(1.32, 12, 9)),
      roundMat,
      roundTrees.length,
    );
    const rCrownTop = new THREE.InstancedMesh(
      trackGeo(new THREE.SphereGeometry(0.92, 10, 8)),
      roundMat,
      roundTrees.length,
    );

    [rTrunk, rCrownMain, rCrownTop].forEach((im) => {
      im.castShadow = !isSoftwareGl;
      im.receiveShadow = !isSoftwareGl;
    });

    roundTrees.forEach((t, idx) => {
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

      dummy.position.set(t.x + Math.cos(t.rotation) * 0.42 * s, gy + 2.95 * s, t.z + Math.sin(t.rotation) * 0.42 * s);
      dummy.scale.set(s * 1.05, s * 0.88, s * 1.05);
      dummy.updateMatrix();
      rCrownTop.setMatrixAt(idx, dummy.matrix);
      rCrownTop.setColorAt(idx, foliagePalette[t.tintIndex]);
    });

    [rTrunk, rCrownMain, rCrownTop].forEach((im) => {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere();
      scene.add(im);
    });
  }

  if (rocks.length > 0) {
    const rockGeo = trackGeo(new THREE.DodecahedronGeometry(0.75, 1));
    const rockMatInst = trackMat(
      new THREE.MeshStandardMaterial({ color: '#a5adb8', roughness: 0.88, flatShading: true }),
    );
    const rockInst = new THREE.InstancedMesh(rockGeo, rockMatInst, rocks.length);
    rockInst.castShadow = !isSoftwareGl;
    rockInst.receiveShadow = !isSoftwareGl;
    rocks.forEach((r, idx) => {
      const gy = groundHeightAt(r.x, r.z);
      dummy.position.set(r.x, gy + 0.25 * r.scale, r.z);
      dummy.rotation.set(r.rotation * 0.2, r.rotation, 0);
      dummy.scale.set(r.scale * 1.15, r.scale * 0.72, r.scale);
      dummy.updateMatrix();
      rockInst.setMatrixAt(idx, dummy.matrix);
    });
    rockInst.instanceMatrix.needsUpdate = true;
    rockInst.computeBoundingSphere();
    scene.add(rockInst);
  }

  // Scattered Soft Grass Tufts & Pink Wildflowers along the winding trail
  {
    const rand = mulberry32(99123);
    const tuftPositions: Array<[number, number, number]> = [];
    const flowerPositions: Array<[number, number, number]> = [];

    for (let i = 0; i < 240; i++) {
      const x = (rand() * 2 - 1) * 30;
      const z = (rand() * 2 - 1) * 30;
      if (isInCanalOrPond(x, z)) continue;
      const td = distanceToTrail(x, z);
      if (td < 1.5) continue;

      if (td < 4.5 || rand() > 0.6) {
        if (tuftPositions.length < 72) {
          tuftPositions.push([x, z, rand() * Math.PI]);
        } else if (flowerPositions.length < 64) {
          flowerPositions.push([x, z, rand() * Math.PI]);
        }
      }
    }

    if (tuftPositions.length > 0) {
      const tuftGeo = trackGeo(new THREE.ConeGeometry(0.22, 0.42, 5));
      const tuftMat = trackMat(
        new THREE.MeshStandardMaterial({ color: '#8ad150', roughness: 0.82 }),
      );
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
      scene.add(tuftInst);
    }

    if (flowerPositions.length > 0) {
      const flGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.08, 0.08, 6));
      const flMat = trackMat(
        new THREE.MeshStandardMaterial({ color: '#f598b3', roughness: 0.7 }),
      );
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
      scene.add(flInst);
    }
  }

  // =========================================================
  // 6. EXPLORER CHARACTER (SOFT ROUNDED RETRO HERO)
  // =========================================================
  const explorer = (() => {
    const root = new THREE.Group();
    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    const tunicMat = trackMat(new THREE.MeshStandardMaterial({ color: '#f28b42', roughness: 0.68 }));
    const skinMat = trackMat(new THREE.MeshStandardMaterial({ color: '#ffe0bd', roughness: 0.72 }));
    const pantsMat = trackMat(new THREE.MeshStandardMaterial({ color: '#39576e', roughness: 0.8 }));
    const packMat = trackMat(new THREE.MeshStandardMaterial({ color: '#a36434', roughness: 0.82 }));
    const hatMat = trackMat(new THREE.MeshStandardMaterial({ color: '#f2d085', roughness: 0.78 }));
    const ribbonMat = trackMat(new THREE.MeshStandardMaterial({ color: '#58b85c', roughness: 0.68 }));
    const eyeMat = trackMat(new THREE.MeshBasicMaterial({ color: '#2b333b' }));

    const legGeo = trackGeo(new THREE.CapsuleGeometry(0.11, 0.2, 4, 8));
    const legL = new THREE.Mesh(legGeo, pantsMat);
    legL.position.set(-0.17, 0.21, 0);
    legL.castShadow = !isSoftwareGl;
    bodyGroup.add(legL);

    const legR = new THREE.Mesh(legGeo, pantsMat);
    legR.position.set(0.17, 0.21, 0);
    legR.castShadow = !isSoftwareGl;
    bodyGroup.add(legR);

    const torso = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.36, 0.32, 6, 12)), tunicMat);
    torso.position.y = 0.74;
    torso.castShadow = !isSoftwareGl;
    bodyGroup.add(torso);

    const face = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.24, 10, 8)), skinMat);
    face.position.set(0, 0.84, 0.22);
    face.scale.set(1.05, 0.85, 0.7);
    bodyGroup.add(face);

    const eyeGeo = trackGeo(new THREE.SphereGeometry(0.045, 6, 6));
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.1, 0.86, 0.37);
    bodyGroup.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.1, 0.86, 0.37);
    bodyGroup.add(eyeR);

    const pack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.46, 0.26)), packMat);
    pack.position.set(0, 0.72, -0.36);
    pack.castShadow = !isSoftwareGl;
    bodyGroup.add(pack);

    const armGeo = trackGeo(new THREE.CapsuleGeometry(0.09, 0.24, 4, 8));
    const armL = new THREE.Mesh(armGeo, tunicMat);
    armL.position.set(-0.46, 0.72, 0);
    armL.castShadow = !isSoftwareGl;
    bodyGroup.add(armL);

    const armR = new THREE.Mesh(armGeo, tunicMat);
    armR.position.set(0.46, 0.72, 0);
    armR.castShadow = !isSoftwareGl;
    bodyGroup.add(armR);

    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 1.15, 0);
    const brim = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.84, 0.88, 0.09, 16)), hatMat);
    brim.castShadow = !isSoftwareGl;
    hatGroup.add(brim);
    const ribbon = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.49, 0.49, 0.12, 14)), ribbonMat);
    ribbon.position.y = 0.08;
    hatGroup.add(ribbon);
    const crown = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.4, 0.47, 0.28, 14)), hatMat);
    crown.position.y = 0.22;
    crown.castShadow = !isSoftwareGl;
    hatGroup.add(crown);
    bodyGroup.add(hatGroup);

    const shadow = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(1.5, 1.5)),
      trackMat(
        new THREE.MeshBasicMaterial({
          map: textures.contactShadow,
          transparent: true,
          depthWrite: false,
          opacity: 0.65,
        }),
      ),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    root.add(shadow);

    const startX = -6.2;
    const startZ = 0.2;
    root.position.set(startX, walkableHeightAt(startX, startZ), startZ);
    scene.add(root);

    return { root, bodyGroup, armL, armR, legL, legR, hatGroup, shadow };
  })();

  // =========================================================
  // 7. SOFT GLOWING NAVIGATION MARKERS & BEACON
  // =========================================================
  const navVisuals = (() => {
    const group = new THREE.Group();
    scene.add(group);

    const maxBreadcrumbs = 64;
    const crumbGeo = trackGeo(new THREE.SphereGeometry(0.2, 10, 8));
    const crumbMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#ffe373',
        emissive: '#f5b942',
        emissiveIntensity: 0.65,
        roughness: 0.35,
      }),
    );
    const breadcrumbs = new THREE.InstancedMesh(crumbGeo, crumbMat, maxBreadcrumbs);
    breadcrumbs.count = 0;
    breadcrumbs.frustumCulled = false;
    group.add(breadcrumbs);

    const beaconGroup = new THREE.Group();
    beaconGroup.visible = false;
    group.add(beaconGroup);

    const beaconRing = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(0.55, 0.82, 20)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: '#ffd24d',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        }),
      ),
    );
    beaconRing.rotation.x = -Math.PI / 2;
    beaconRing.position.y = 0.08;
    beaconGroup.add(beaconRing);

    const beaconBeam = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.14, 0.36, 4.0, 12, 1, true)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: '#ffe270',
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
    );
    beaconBeam.position.y = 2.0;
    beaconGroup.add(beaconBeam);

    const beaconDiamond = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.34, 1)),
      trackMat(
        new THREE.MeshStandardMaterial({
          color: '#ffe680',
          emissive: '#f5b038',
          emissiveIntensity: 0.8,
        }),
      ),
    );
    beaconDiamond.position.y = 1.45;
    beaconGroup.add(beaconDiamond);

    return {
      group,
      breadcrumbs,
      maxBreadcrumbs,
      beaconGroup,
      beaconRing,
      beaconBeam,
      beaconDiamond,
    };
  })();

  // =========================================================
  // 8. INTERACTIVE LANDMARK HITBOXES & SUBTLE GROUND RINGS
  // =========================================================
  const landmarkHitboxes: THREE.Mesh[] = [];
  const hitboxMat = trackMat(new THREE.MeshBasicMaterial({ visible: false }));
  for (const lm of LANDMARKS) {
    const gy = walkableHeightAt(lm.position.x, lm.position.z);
    const hb = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.8, 2.8, 4.5, 8)), hitboxMat);
    hb.position.set(lm.position.x, gy + 2.0, lm.position.z);
    hb.userData.landmarkId = lm.id;
    scene.add(hb);
    landmarkHitboxes.push(hb);

    const ey = walkableHeightAt(lm.entryPoint.x, lm.entryPoint.z);
    const markerRing = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(0.45, 0.64, 16)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: lm.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65,
        }),
      ),
    );
    markerRing.rotation.x = -Math.PI / 2;
    markerRing.position.set(lm.entryPoint.x, ey + 0.06, lm.entryPoint.z);
    scene.add(markerRing);
  }

  // =========================================================
  // 9. RAIN PARTICLES & WATER RIPPLES
  // =========================================================
  const rain = (() => {
    const count = 260;
    const rainGeo = trackGeo(new THREE.BoxGeometry(0.035, 0.72, 0.035));
    const rainMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: '#d4f0ff',
        transparent: true,
        opacity: 0.5,
      }),
    );
    const mesh = new THREE.InstancedMesh(rainGeo, rainMat, count);
    mesh.frustumCulled = false;
    mesh.visible = false;

    const rand = mulberry32(88421);
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() * 2 - 1) * 30;
      positions[i * 3 + 1] = rand() * 18 + 1;
      positions[i * 3 + 2] = (rand() * 2 - 1) * 30;
      speeds[i] = 17 + rand() * 8;
    }
    scene.add(mesh);

    const ripples: THREE.Mesh[] = [];
    const ripplePhases = new Float32Array(12);
    const rippleGeo = trackGeo(new THREE.RingGeometry(0.3, 0.42, 16));
    for (let r = 0; r < 12; r++) {
      const rMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: '#e0f6ff',
          transparent: true,
          opacity: 0.48,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      const rm = new THREE.Mesh(rippleGeo, rMat);
      rm.rotation.x = -Math.PI / 2;
      let rx = 9.5 + (rand() * 2 - 1) * 3.5;
      let rz = 9.5 + (rand() * 2 - 1) * 3.5;
      if (r < 5) {
        const t = -10 + r * 4;
        rx = t + (rand() - 0.5) * 1.4;
        rz = t + (rand() - 0.5) * 1.4;
      }
      if (!isInCanalOrPond(rx, rz)) {
        rx = 9.5;
        rz = 9.5;
      }
      rm.position.set(rx, -0.27, rz);
      rm.visible = false;
      ripplePhases[r] = rand();
      scene.add(rm);
      ripples.push(rm);
    }

    return { mesh, count, positions, speeds, ripples, ripplePhases };
  })();

  const bridgeClickPlane = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(7.6, 0.2, 3.4)),
    hitboxMat,
  );
  bridgeClickPlane.position.set(-3.2, 0.85, -3.2);
  bridgeClickPlane.rotation.y = Math.PI / 4;
  scene.add(bridgeClickPlane);

  const walkableClickTargets: THREE.Object3D[] = [
    terrainMesh,
    cobbleOverlay,
    bridgeClickPlane,
  ];

  return {
    terrainMesh,
    cobbleOverlay,
    walkableClickTargets,
    waterMesh,
    explorer,
    kois,
    lanternLights,
    lanternBulbs,
    navVisuals,
    rain,
    landmarkHitboxes,
    dispose: () => {
      for (const d of disposables) {
        d.dispose();
      }
    },
  };
}
