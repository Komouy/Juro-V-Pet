import * as THREE from "three";
import {
  FENCE_SPECS,
  JURO_TRAMPOLINE_POS,
  LANDMARKS,
  STUMP_SPECS,
  groundHeightAt,
  walkableHeightAt,
} from "../../../engine/world/mapTerrain";
import type { WorldBuildContext } from "./worldBuilderTypes";

/**
 * Builds composite landmarks (canal footbridge, mine tunnel, sofa bed lounge,
 * cafe shop, south overlook bench, mushroom trampoline, stumps, fences),
 * interactive hitboxes, ground rings, and prioritizes GPU point lights.
 */
export function buildLandmarks(ctx: WorldBuildContext): THREE.Mesh[] {
  const {
    rootGroup,
    textures,
    shadowsEnabled,
    maxPointLights,
    trackGeo,
    trackMat,
    woodMat,
    stoneMat,
    darkIronMat,
    bulbMat,
    curbMat,
    lanternLights,
    lanternBulbs,
    lightCandidates,
    registerPointLight,
  } = ctx;

  const lanternPostGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 7));
  const lanternArmGeo = trackGeo(new THREE.BoxGeometry(0.5, 0.1, 0.1));
  const lanternCapGeo = trackGeo(new THREE.ConeGeometry(0.22, 0.18, 6));
  const lanternBulbGeo = trackGeo(new THREE.SphereGeometry(0.14, 7, 6));

  const createLantern = (
    x: number,
    y: number,
    z: number,
    withLight = true,
    lightPriority = 5
  ): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    const post = new THREE.Mesh(lanternPostGeo, woodMat);
    post.position.y = 1.1;
    post.castShadow = shadowsEnabled;
    g.add(post);

    const arm = new THREE.Mesh(lanternArmGeo, darkIronMat);
    arm.position.set(0.22, 2.12, 0);
    g.add(arm);

    const cap = new THREE.Mesh(lanternCapGeo, darkIronMat);
    cap.position.set(0.44, 2.02, 0);
    g.add(cap);

    const bulb = new THREE.Mesh(lanternBulbGeo, bulbMat);
    bulb.position.set(0.44, 1.82, 0);
    g.add(bulb);
    lanternBulbs.push(bulb);

    if (withLight) {
      registerPointLight(lightPriority, g, "#ffc46b", 0.9, 13, 1.6, 0.44, 1.8, 0);
    }

    rootGroup.add(g);
    return g;
  };

  // --- A. WOODEN CANAL FOOTBRIDGE ---
  {
    const bridge = new THREE.Group();
    bridge.position.set(-3.2, 0, -3.2);
    bridge.rotation.y = Math.PI / 4;

    const bridgeSpan = 7.4;
    const bridgeWidth = 3.2;

    // Support pilings strictly underneath the arched deck so they never poke above planks
    const pilingGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.16, 1.5, 8));
    for (const px of [-2.4, 2.4]) {
      for (const pz of [-1.35, 1.35]) {
        const piling = new THREE.Mesh(pilingGeo, woodMat);
        piling.position.set(px, -0.15, pz);
        piling.castShadow = shadowsEnabled;
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
      plank.castShadow = shadowsEnabled;
      plank.receiveShadow = shadowsEnabled;
      bridge.add(plank);
    }

    const getBridgeArchY = (px: number) => 0.52 + Math.cos((px / 3.5) * Math.PI * 0.5) * 0.4;
    const endPostY = getBridgeArchY(3.1) + 0.92;
    const centerPostY = getBridgeArchY(0) + 0.92;
    const halfRailDx = 3.1;
    const halfRailDy = centerPostY - endPostY;
    const halfRailLen = Math.hypot(halfRailDx, halfRailDy) + 0.12;
    const halfRailTilt = Math.atan2(halfRailDy, halfRailDx);

    const railPostGeo = trackGeo(new THREE.CylinderGeometry(0.085, 0.095, 0.96, 8));
    const railHalfBarGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.06, halfRailLen, 8));
    const postCapGeo = trackGeo(new THREE.SphereGeometry(0.105, 8, 6));

    for (const rz of [-bridgeWidth * 0.46, bridgeWidth * 0.46]) {
      for (const px of [-3.1, 0, 3.1]) {
        const archY = getBridgeArchY(px);
        const post = new THREE.Mesh(railPostGeo, woodMat);
        post.position.set(px, archY + 0.44, rz);
        post.castShadow = shadowsEnabled;
        bridge.add(post);

        const cap = new THREE.Mesh(postCapGeo, woodMat);
        cap.position.set(px, archY + 0.92, rz);
        bridge.add(cap);
      }

      // Two sloped handrail bars following the bridge arch smoothly
      const midY = (endPostY + centerPostY) * 0.5;
      const leftRail = new THREE.Mesh(railHalfBarGeo, woodMat);
      leftRail.position.set(-1.55, midY, rz);
      leftRail.rotation.z = Math.PI / 2 - halfRailTilt;
      leftRail.castShadow = shadowsEnabled;
      bridge.add(leftRail);

      const rightRail = new THREE.Mesh(railHalfBarGeo, woodMat);
      rightRail.position.set(1.55, midY, rz);
      rightRail.rotation.z = Math.PI / 2 + halfRailTilt;
      rightRail.castShadow = shadowsEnabled;
      bridge.add(rightRail);
    }

    rootGroup.add(bridge);
    // Position lanterns neatly beside the bridge ends on dry ground instead of blocking the center path
    createLantern(-7.1, groundHeightAt(-7.1, -1.7), -1.7, true, 4);
    createLantern(0.7, groundHeightAt(0.7, -4.7), -4.7, false);
  }

  // --- B. GERBANG TEROWONGAN (TAMBANG) ---
  {
    const tunnel = new THREE.Group();
    tunnel.position.set(-14.2, 0, -14.2);
    tunnel.rotation.y = Math.PI / 4;

    const rockMat = trackMat(
      new THREE.MeshStandardMaterial({ color: "#88909e", roughness: 0.9, flatShading: true })
    );
    const stoneArchMat = trackMat(
      new THREE.MeshStandardMaterial({ map: textures.stoneBrick, roughness: 0.84 })
    );

    const boulderOffsets: Array<[number, number, number, number]> = [
      [0, 2.5, -4.2, 3.6],
      [-2.8, 1.8, -3.4, 2.5],
      [2.8, 1.8, -3.4, 2.5],
      [-1.8, 3.8, -3.8, 2.2],
      [1.8, 3.8, -3.8, 2.2],
      [0, 4.4, -4.2, 2.4],
    ];
    const sharedTunnelBoulderGeo = trackGeo(new THREE.DodecahedronGeometry(1.0, 1));
    for (const [bx, by, bz, br] of boulderOffsets) {
      const boulder = new THREE.Mesh(sharedTunnelBoulderGeo, rockMat);
      boulder.position.set(bx, by, bz);
      boulder.scale.set(1.1 * br, 0.9 * br, 1.0 * br);
      boulder.castShadow = shadowsEnabled;
      boulder.receiveShadow = shadowsEnabled;
      tunnel.add(boulder);
    }

    const voidMat = trackMat(new THREE.MeshBasicMaterial({ color: "#242b35" }));
    const caveVoid = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.4, 3.1, 2.8)), voidMat);
    caveVoid.position.set(0, 1.2, -1.4);
    tunnel.add(caveVoid);

    const pillarGeo = trackGeo(new THREE.BoxGeometry(0.85, 3.3, 1.2));
    for (const sx of [-2.0, 2.0]) {
      const pillar = new THREE.Mesh(pillarGeo, stoneArchMat);
      pillar.position.set(sx, 1.25, 0.1);
      pillar.castShadow = shadowsEnabled;
      tunnel.add(pillar);
    }
    const lintel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.1, 0.85, 1.35)), stoneArchMat);
    lintel.position.set(0, 3.1, 0.2);
    lintel.castShadow = shadowsEnabled;
    tunnel.add(lintel);

    const signMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.signTunnel,
        emissiveMap: textures.signTunnel,
        emissive: "#ffcf6e",
        emissiveIntensity: 0.45,
        roughness: 0.45,
      })
    );
    const marquee = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.5, 0.85, 0.18)), signMat);
    marquee.position.set(0, 3.1, 0.92);
    tunnel.add(marquee);

    for (const sx of [-2.1, 2.1]) {
      const bulb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.18, 8, 8)), bulbMat);
      bulb.position.set(sx, 2.15, 0.94);
      tunnel.add(bulb);
      lanternBulbs.push(bulb);
    }
    registerPointLight(3, tunnel, "#ffbb5c", 1.2, 15, 1.5, 0, 2.4, 1.4);

    rootGroup.add(tunnel);
  }

  // --- C. BUKIT SANTAI (KASUR SOFA TIDUR) ---
  {
    const baseY = groundHeightAt(-15, 4);
    const lounge = new THREE.Group();
    lounge.position.set(-15.0, baseY, 4.0);
    lounge.userData = { landmarkId: "bed" };

    const sofaFrameMat = trackMat(new THREE.MeshStandardMaterial({ color: "#df7643", roughness: 0.65 }));
    const cushionMat = trackMat(new THREE.MeshStandardMaterial({ color: "#fad16b", roughness: 0.82 }));
    const pillowMat = trackMat(new THREE.MeshStandardMaterial({ color: "#eb6c42", roughness: 0.75 }));

    const baseFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.35, 0.24, 4.4)), sofaFrameMat);
    baseFrame.position.set(-0.35, 0.12, 0);
    baseFrame.receiveShadow = shadowsEnabled;
    baseFrame.castShadow = shadowsEnabled;
    baseFrame.userData = { landmarkId: "bed" };
    lounge.add(baseFrame);

    const backWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.38, 0.56, 4.4)), sofaFrameMat);
    backWall.position.set(-1.42, 0.40, 0);
    backWall.castShadow = shadowsEnabled;
    backWall.userData = { landmarkId: "bed" };
    lounge.add(backWall);

    for (const sz of [-2.08, 2.08]) {
      const armrest = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.0, 0.44, 0.32)), sofaFrameMat);
      armrest.position.set(-0.32, 0.34, sz);
      armrest.castShadow = shadowsEnabled;
      armrest.userData = { landmarkId: "bed" };
      lounge.add(armrest);
    }

    const mattress = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.92, 0.28, 3.92)), cushionMat);
    mattress.position.set(-0.35, 0.29, 0);
    mattress.receiveShadow = shadowsEnabled;
    mattress.userData = { landmarkId: "bed" };
    lounge.add(mattress);

    for (const pz of [-1.2, 0, 1.2]) {
      const pillow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.32, 0.65)), pillowMat);
      pillow.position.set(-1.12, 0.44, pz);
      pillow.rotation.z = 0.18;
      pillow.castShadow = shadowsEnabled;
      lounge.add(pillow);
    }

    const tableMat = trackMat(new THREE.MeshStandardMaterial({ color: "#7c4f34", roughness: 0.7 }));
    const table = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.72, 0.42, 0.68)), tableMat);
    table.position.set(-0.35, 0.21, -2.65);
    table.castShadow = shadowsEnabled;
    table.receiveShadow = shadowsEnabled;
    lounge.add(table);

    const knobMat = trackMat(new THREE.MeshStandardMaterial({ color: "#f59e0b", metalness: 0.8, roughness: 0.2 }));
    const knob = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.04, 8, 8)), knobMat);
    knob.position.set(0.02, 0.21, -2.65);
    lounge.add(knob);

    const lampBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.12, 0.16, 0.08, 10)), tableMat);
    lampBase.position.set(-0.35, 0.46, -2.65);
    lounge.add(lampBase);

    const lampStem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8)), knobMat);
    lampStem.position.set(-0.35, 0.64, -2.65);
    lounge.add(lampStem);

    const shadeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: "#fef08a",
        emissive: "#f59e0b",
        emissiveIntensity: 1.35,
        roughness: 0.4,
      })
    );
    const shade = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.20, 0.32, 0.28, 12, 1, true)), shadeMat);
    shade.position.set(-0.35, 0.82, -2.65);
    lounge.add(shade);

    const bedBulb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.08, 8, 8)), bulbMat);
    bedBulb.position.set(-0.35, 0.80, -2.65);
    lounge.add(bedBulb);
    lanternBulbs.push(bedBulb);

    registerPointLight(1, lounge, "#ffba66", 1.4, 9, 1.5, -0.35, 0.85, -2.65);

    const glowMat = trackMat(
      new THREE.MeshBasicMaterial({ color: "#fde047", transparent: true, opacity: 0.18, depthWrite: false })
    );
    const bedGlow = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.48, 10, 8)), glowMat);
    bedGlow.position.set(-0.35, 0.82, -2.65);
    lounge.add(bedGlow);

    const stairStepGeo = trackGeo(new THREE.BoxGeometry(0.8, 0.22, 1.9));
    for (let s = 1; s <= 4; s++) {
      const sx = -15.0 + 2.6 + s * 0.95;
      const sy = groundHeightAt(sx, 4.0) + 0.05;
      const step = new THREE.Mesh(stairStepGeo, stoneMat);
      step.position.set(sx, sy, 4.0);
      step.receiveShadow = shadowsEnabled;
      step.castShadow = shadowsEnabled;
      rootGroup.add(step);
    }

    rootGroup.add(lounge);
  }

  // --- D. WARUNG (TOKO) ---
  {
    const plazaY = groundHeightAt(16.5, -2.2);
    const cafe = new THREE.Group();
    cafe.position.set(18.8, plazaY, -3.2);
    cafe.rotation.y = -Math.PI / 6;

    const wallMat = trackMat(new THREE.MeshStandardMaterial({ map: textures.cafeWall, roughness: 0.84 }));
    const roofMat = trackMat(new THREE.MeshStandardMaterial({ map: textures.terracottaRoof, roughness: 0.68 }));
    const awningMat = trackMat(new THREE.MeshStandardMaterial({ map: textures.awningStripe, roughness: 0.78 }));

    const plinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.6, 0.35, 5.2)), stoneMat);
    plinth.position.y = 0.17;
    plinth.receiveShadow = shadowsEnabled;
    cafe.add(plinth);

    const mainBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.8, 2.8, 4.4)), wallMat);
    mainBody.position.y = 1.75;
    mainBody.castShadow = shadowsEnabled;
    mainBody.receiveShadow = shadowsEnabled;
    cafe.add(mainBody);

    const cornerGeo = trackGeo(new THREE.BoxGeometry(0.28, 2.85, 0.28));
    for (const cx of [-2.4, 2.4]) {
      for (const cz of [-2.2, 2.2]) {
        const col = new THREE.Mesh(cornerGeo, woodMat);
        col.position.set(cx, 1.75, cz);
        col.castShadow = shadowsEnabled;
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
    awning.position.set(0, 2.42, 2.70);
    awning.rotation.x = 0.25;
    awning.castShadow = shadowsEnabled;
    cafe.add(awning);

    const roof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(4.15, 2.45, 4)), roofMat);
    roof.position.y = 4.48;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = shadowsEnabled;
    cafe.add(roof);

    const finial = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.26, 8, 8)), woodMat);
    finial.position.y = 5.71;
    cafe.add(finial);

    const chimney = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.65, 1.4, 0.65)), curbMat);
    chimney.position.set(-1.35, 4.88, -1.1);
    chimney.castShadow = shadowsEnabled;
    cafe.add(chimney);

    const fascia = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.6, 0.65, 0.24)), woodMat);
    fascia.position.set(0, 2.92, 2.42);
    fascia.castShadow = shadowsEnabled;
    cafe.add(fascia);

    const cafeSignMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.signCafe,
        emissiveMap: textures.signCafe,
        emissive: "#ffd280",
        emissiveIntensity: 0.35,
        roughness: 0.5,
      })
    );
    const cafeSign = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.1, 0.62, 0.16)), cafeSignMat);
    cafeSign.position.set(0, 2.92, 2.56);
    cafe.add(cafeSign);

    registerPointLight(2, cafe, "#ffc06e", 1.1, 15, 1.5, 0, 2.4, 3.4);

    rootGroup.add(cafe);
    createLantern(15.3, groundHeightAt(15.3, -0.5), -0.5, true, 6);
  }

  // --- E. POS PANDANG SELATAN (BENCH) ---
  {
    const ovY = groundHeightAt(6.0, 20.0);
    const overlook = new THREE.Group();
    overlook.position.set(6.0, ovY, 20.0);

    const bench = new THREE.Group();
    bench.position.set(0, 0, 0.6);
    const seat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.2, 0.16, 0.72)), woodMat);
    seat.position.y = 0.52;
    seat.castShadow = shadowsEnabled;
    seat.userData.landmarkId = "overlook";
    bench.add(seat);
    const back = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.2, 0.55, 0.14)), woodMat);
    back.position.set(0, 0.85, 0.3);
    back.rotation.x = 0.15;
    back.castShadow = shadowsEnabled;
    back.userData.landmarkId = "overlook";
    bench.add(back);
    for (const lx of [-0.85, 0.85]) {
      const leg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 0.52, 0.62)), darkIronMat);
      leg.position.set(lx, 0.26, 0);
      leg.userData.landmarkId = "overlook";
      bench.add(leg);
    }
    overlook.add(bench);

    const brassMat = trackMat(
      new THREE.MeshStandardMaterial({ color: "#e5b34b", metalness: 0.65, roughness: 0.32 })
    );
    const lensMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: "#7dd3fc",
        emissive: "#0284c7",
        emissiveIntensity: 0.3,
        metalness: 0.25,
        roughness: 0.1,
      })
    );
    const scopeGroup = new THREE.Group();
    scopeGroup.position.set(-1.85, 0, -0.4);

    // 3 splayed wooden tripod legs meeting at the brass mount collar
    const legGeo = trackGeo(new THREE.CylinderGeometry(0.036, 0.026, 1.12, 6));
    const legFootGeo = trackGeo(new THREE.SphereGeometry(0.034, 6, 6));
    for (let i = 0; i < 3; i++) {
      const yaw = (i * Math.PI * 2) / 3 + 0.25;
      const legHolder = new THREE.Group();
      legHolder.rotation.y = yaw;
      legHolder.position.set(0, 1.04, 0);

      const legPivot = new THREE.Group();
      legPivot.rotation.z = 0.26;
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.y = -0.54;
      leg.castShadow = shadowsEnabled;
      leg.userData.landmarkId = "overlook";
      legPivot.add(leg);

      const foot = new THREE.Mesh(legFootGeo, brassMat);
      foot.position.y = -1.08;
      legPivot.add(foot);

      legHolder.add(legPivot);
      scopeGroup.add(legHolder);
    }

    // Brass tripod hub & swivel yoke
    const hub = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.09, 0.1, 0.1, 8)), brassMat);
    hub.position.y = 1.04;
    hub.userData.landmarkId = "overlook";
    scopeGroup.add(hub);

    const neck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.045, 0.05, 0.16, 8)), brassMat);
    neck.position.y = 1.15;
    neck.userData.landmarkId = "overlook";
    scopeGroup.add(neck);

    // Multi-part brass telescope barrel angled upward over the valley
    const scopeHead = new THREE.Group();
    scopeHead.position.y = 1.24;
    scopeHead.rotation.x = Math.PI / 2 + 0.22;

    const barrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.072, 0.056, 0.62, 12)), brassMat);
    barrel.castShadow = shadowsEnabled;
    barrel.userData.landmarkId = "overlook";
    scopeHead.add(barrel);

    const hood = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.096, 0.08, 0.22, 12)), brassMat);
    hood.position.y = -0.4;
    hood.castShadow = shadowsEnabled;
    hood.userData.landmarkId = "overlook";
    scopeHead.add(hood);

    const lens = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.082, 12)), lensMat);
    lens.position.y = -0.512;
    lens.rotation.x = Math.PI / 2;
    scopeHead.add(lens);

    const eyepiece = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.036, 0.046, 0.22, 10)), darkIronMat);
    eyepiece.position.y = 0.4;
    eyepiece.userData.landmarkId = "overlook";
    scopeHead.add(eyepiece);

    scopeGroup.add(scopeHead);
    overlook.add(scopeGroup);

    const signGroup = new THREE.Group();
    signGroup.position.set(2.0, 0, -0.3);
    signGroup.rotation.y = -0.35;

    const post = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.075, 0.09, 1.38, 8)), woodMat);
    post.position.y = 0.63;
    post.castShadow = shadowsEnabled;
    post.userData.landmarkId = "overlook";
    signGroup.add(post);

    const mountBracket = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 0.08, 0.14)), woodMat);
    mountBracket.position.y = 1.32;
    mountBracket.castShadow = shadowsEnabled;
    mountBracket.userData.landmarkId = "overlook";
    signGroup.add(mountBracket);

    const boardMat = trackMat(
      new THREE.MeshStandardMaterial({ map: textures.signPost, roughness: 0.8 })
    );
    const board = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.5, 0.52, 0.1)), boardMat);
    board.position.y = 1.60;
    board.castShadow = shadowsEnabled;
    board.userData.landmarkId = "overlook";
    signGroup.add(board);

    overlook.add(signGroup);

    rootGroup.add(overlook);
    createLantern(8.1, groundHeightAt(8.1, 18.8), 18.8, true, 5);
  }

  // --- F. TRAMPOLIN JAMUR ---
  {
    const trampY = groundHeightAt(JURO_TRAMPOLINE_POS.x, JURO_TRAMPOLINE_POS.z);
    const trampGroup = new THREE.Group();
    trampGroup.position.set(JURO_TRAMPOLINE_POS.x, trampY, JURO_TRAMPOLINE_POS.z);
    trampGroup.scale.setScalar(JURO_TRAMPOLINE_POS.scale);

    const stemMat = trackMat(new THREE.MeshStandardMaterial({ color: "#fbf1dc", roughness: 0.82 }));
    const capMat = trackMat(
      new THREE.MeshStandardMaterial({ map: textures.mushroomCap, roughness: 0.48 })
    );

    const stem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.32, 0.42, 0.48, 14)), stemMat);
    stem.position.y = 0.24;
    stem.castShadow = shadowsEnabled;
    trampGroup.add(stem);

    const counterRing = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.68, 0.62, 0.10, 16)), woodMat);
    counterRing.position.y = 0.38;
    counterRing.castShadow = shadowsEnabled;
    trampGroup.add(counterRing);

    const cap = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.96, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)),
      capMat
    );
    cap.position.y = 0.42;
    cap.scale.set(1, 0.68, 1);
    cap.castShadow = shadowsEnabled;
    cap.receiveShadow = shadowsEnabled;
    trampGroup.add(cap);

    rootGroup.add(trampGroup);
  }

  // Attach prioritized point lights within GPU budget
  lightCandidates.sort((a, b) => a.priority - b.priority);
  for (let i = 0; i < Math.min(maxPointLights, lightCandidates.length); i++) {
    const { parent, light } = lightCandidates[i];
    parent.add(light);
    lanternLights.push(light);
  }

  // --- G. TREE STUMPS & FENCES ---
  const stumpTopMat = trackMat(new THREE.MeshStandardMaterial({ color: "#efd19c", roughness: 0.82 }));
  const stumpBaseGeo = trackGeo(new THREE.CylinderGeometry(0.32, 0.52, 0.58, 8));
  const stumpRingGeo = trackGeo(new THREE.CylinderGeometry(0.29, 0.29, 0.06, 8));
  for (const st of STUMP_SPECS) {
    const sy = groundHeightAt(st.x, st.z);
    const g = new THREE.Group();
    g.position.set(st.x, sy, st.z);
    g.rotation.y = st.rotation;
    g.scale.setScalar(st.scale);

    const base = new THREE.Mesh(stumpBaseGeo, woodMat);
    base.position.y = 0.28;
    base.castShadow = shadowsEnabled;
    g.add(base);

    const ring = new THREE.Mesh(stumpRingGeo, stumpTopMat);
    ring.position.y = 0.57;
    g.add(ring);

    rootGroup.add(g);
  }

  const fencePostGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.1, 1.05, 6));
  for (const f of FENCE_SPECS) {
    const fy = groundHeightAt(f.x, f.z);
    const fg = new THREE.Group();
    fg.position.set(f.x, fy, f.z);
    fg.rotation.y = f.rotation;

    for (let p = 0; p <= f.panels; p++) {
      const post = new THREE.Mesh(fencePostGeo, woodMat);
      post.position.set((p - f.panels * 0.5) * 1.15, 0.48, 0);
      post.rotation.z = (p % 2 === 0 ? 1 : -1) * 0.05;
      fg.add(post);
    }

    const railLen = f.panels * 1.15 + 0.3;
    const railGeo = trackGeo(new THREE.BoxGeometry(railLen, 0.1, 0.08));
    for (const ry of [0.36, 0.72]) {
      const rail = new THREE.Mesh(railGeo, woodMat);
      rail.position.set(0, ry, 0.06);
      fg.add(rail);
    }

    rootGroup.add(fg);
  }

  // --- H. INTERACTIVE HITBOXES ---
  const landmarkHitboxes: THREE.Mesh[] = [];
  const hitboxMat = trackMat(new THREE.MeshBasicMaterial({ visible: false }));
  for (const lm of LANDMARKS) {
    if (lm.id === "cafe" || lm.id === "tunnel") {
      const gy = walkableHeightAt(lm.position.x, lm.position.z);
      const hb = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.6, 2.6, 4.2, 8)), hitboxMat);
      hb.position.set(lm.position.x, gy + 2.0, lm.position.z);
      hb.userData.landmarkId = lm.id;
      rootGroup.add(hb);
      landmarkHitboxes.push(hb);
    }
  }

  const trampGy = groundHeightAt(JURO_TRAMPOLINE_POS.x, JURO_TRAMPOLINE_POS.z);
  const trampHb = new THREE.Mesh(
    trackGeo(
      new THREE.CylinderGeometry(
        1.05 * JURO_TRAMPOLINE_POS.scale,
        1.05 * JURO_TRAMPOLINE_POS.scale,
        0.58 * JURO_TRAMPOLINE_POS.scale,
        10
      )
    ),
    hitboxMat
  );
  trampHb.position.set(
    JURO_TRAMPOLINE_POS.x,
    trampGy + 0.36 * JURO_TRAMPOLINE_POS.scale,
    JURO_TRAMPOLINE_POS.z
  );
  trampHb.userData.landmarkId = "trampoline";
  rootGroup.add(trampHb);
  landmarkHitboxes.push(trampHb);

  return landmarkHitboxes;
}
