import * as THREE from "three";
import type { PixelTextureSet } from "./pixelTextures";

export interface AnimatedKoi {
  group: THREE.Group;
  tail: THREE.Object3D;
  body?: THREE.Object3D;
  leftFin?: THREE.Object3D;
  rightFin?: THREE.Object3D;
  centerX: number;
  centerZ: number;
  radiusX: number;
  radiusZ: number;
  /** Optional diagonal axis rotation (radians) for elongated river/canal patrol loops. */
  pathRotation?: number;
  /** Optional lateral sinusoidal meander amplitude perpendicular to path. */
  meanderAmp?: number;
  baseY: number;
  speed: number;
  phase: number;
  scale?: number;
  isDuck?: boolean;
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
  rootGroup: THREE.Group;
  terrainMesh: THREE.Mesh;
  cobbleOverlay: THREE.Mesh;
  waterMesh: THREE.Mesh;
  kois: AnimatedKoi[];
  lanternLights: THREE.PointLight[];
  lanternBulbs: THREE.Mesh[];
  rain: RainSystem;
  landmarkHitboxes: THREE.Mesh[];
  dispose: () => void;
}

export interface WorldBuildOptions {
  isSoftwareGl?: boolean;
  terrainSegments?: number;
  shadowsEnabled?: boolean;
  maxPointLights?: number;
  rainCount?: number;
}

export interface PointLightCandidate {
  priority: number;
  parent: THREE.Object3D;
  light: THREE.PointLight;
}

export interface WorldBuildContext {
  rootGroup: THREE.Group;
  textures: PixelTextureSet;
  shadowsEnabled: boolean;
  maxPointLights: number;
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T;
  trackMat: <T extends THREE.Material>(m: T) => T;
  disposeAll: () => void;
  woodMat: THREE.MeshStandardMaterial;
  stoneMat: THREE.MeshStandardMaterial;
  darkIronMat: THREE.MeshStandardMaterial;
  bulbMat: THREE.MeshStandardMaterial;
  curbMat: THREE.MeshStandardMaterial;
  lanternLights: THREE.PointLight[];
  lanternBulbs: THREE.Mesh[];
  lightCandidates: PointLightCandidate[];
  registerPointLight: (
    priority: number,
    parent: THREE.Object3D,
    color: string,
    intensity: number,
    distance: number,
    decay: number,
    x: number,
    y: number,
    z: number
  ) => void;
}

export function createWorldBuildContext(
  scene: THREE.Group,
  textures: PixelTextureSet,
  shadowsEnabled: boolean,
  maxPointLights: number
): WorldBuildContext {
  const disposables: Array<{ dispose: () => void }> = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposables.push(m);
    return m;
  };

  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.woodPlank,
      roughness: 0.82,
      metalness: 0.02,
    })
  );
  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.sandstoneTile,
      color: "#f2e3c2",
      roughness: 0.85,
    })
  );
  const darkIronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: "#4c5866",
      roughness: 0.48,
      metalness: 0.55,
    })
  );
  const bulbMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: "#ffebb3",
      emissive: "#ffb84d",
      emissiveIntensity: 1.1,
      roughness: 0.25,
    })
  );
  const curbMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.stoneBrick,
      color: "#b8a084",
      roughness: 0.88,
    })
  );

  const lanternLights: THREE.PointLight[] = [];
  const lanternBulbs: THREE.Mesh[] = [];
  const lightCandidates: PointLightCandidate[] = [];

  const registerPointLight = (
    priority: number,
    parent: THREE.Object3D,
    color: string,
    intensity: number,
    distance: number,
    decay: number,
    x: number,
    y: number,
    z: number
  ) => {
    const pt = new THREE.PointLight(color, intensity, distance, decay);
    pt.position.set(x, y, z);
    lightCandidates.push({ priority, parent, light: pt });
  };

  return {
    rootGroup,
    textures,
    shadowsEnabled,
    maxPointLights,
    trackGeo,
    trackMat,
    disposeAll: () => {
      for (const d of disposables) {
        d.dispose();
      }
    },
    woodMat,
    stoneMat,
    darkIronMat,
    bulbMat,
    curbMat,
    lanternLights,
    lanternBulbs,
    lightCandidates,
    registerPointLight,
  };
}
