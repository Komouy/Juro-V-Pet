import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import type { NormalizedWeather } from "../../../types/ui";

export interface StorybookSkyProps {
  weather: NormalizedWeather;
  isNight: boolean;
  isRaining?: boolean;
  cloudSegments?: [number, number];
}

const CLOUD_TOP_PUFFS: Array<{ pos: [number, number, number]; scale: [number, number, number] }> = [
  { pos: [0, 0.12, 0], scale: [1.15, 0.92, 0.95] },
  { pos: [-0.95, -0.1, 0.08], scale: [0.82, 0.68, 0.78] },
  { pos: [0.98, -0.08, -0.06], scale: [0.86, 0.72, 0.8] },
  { pos: [0.25, 0.52, 0], scale: [0.72, 0.64, 0.7] },
];

const CLOUD_BASE_PUFF: { pos: [number, number, number]; scale: [number, number, number] } = {
  pos: [0, -0.25, 0],
  scale: [1.55, 0.55, 0.92],
};

const _cloudDummy = new THREE.Object3D();

/**
 * Generates deterministic starfield positions spread from just above the horizon
 * mountain silhouettes (y >= 5.5) up across the celestial dome (y <= 44) in 360 deg.
 */
function generateStarPositions(count: number, seedInit: number, minRadius: number, maxRadius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  let seed = seedInit;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    // Cover azimuth 0..2PI and elevation from ~5 deg above mountain ridge up to upper dome
    const theta = rnd() * Math.PI * 2;
    const elevation = 0.08 + Math.pow(rnd(), 1.35) * 0.85;
    const r = minRadius + rnd() * (maxRadius - minRadius);

    const cosEl = Math.cos(elevation);
    positions[i * 3] = r * cosEl * Math.cos(theta);
    positions[i * 3 + 1] = Math.max(4.5, r * Math.sin(elevation));
    positions[i * 3 + 2] = r * cosEl * Math.sin(theta);
  }
  return positions;
}

function createRadialGlowTexture(size = 128): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, "rgba(255, 255, 255, 1)");
  grad.addColorStop(0.28, "rgba(255, 255, 255, 0.72)");
  grad.addColorStop(0.6, "rgba(255, 255, 255, 0.22)");
  grad.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createSunRayTexture(size = 256): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const half = size / 2;
  ctx.clearRect(0, 0, size, size);

  // Soft 12-spoke storybook sunbeams fading smoothly outward
  const rayCount = 12;
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2;
    const isMajor = i % 2 === 0;
    const len = isMajor ? half * 0.96 : half * 0.78;
    const halfAngle = isMajor ? 0.14 : 0.10;

    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(angle);

    const grad = ctx.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.75)");
    grad.addColorStop(0.45, "rgba(255, 255, 255, 0.32)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, Math.sin(-halfAngle) * len);
    ctx.lineTo(len, Math.sin(halfAngle) * len);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Mask soft radial falloff at perimeter
  ctx.globalCompositeOperation = "destination-in";
  const maskGrad = ctx.createRadialGradient(half, half, half * 0.15, half, half, half * 0.98);
  maskGrad.addColorStop(0, "rgba(255,255,255,1)");
  maskGrad.addColorStop(0.7, "rgba(255,255,255,0.65)");
  maskGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = maskGrad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createStarSpriteTexture(size = 64): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const half = size / 2;

  // Soft circular halo
  const halo = ctx.createRadialGradient(half, half, 0, half, half, half * 0.9);
  halo.addColorStop(0, "rgba(255, 255, 255, 1)");
  halo.addColorStop(0.25, "rgba(255, 255, 255, 0.75)");
  halo.addColorStop(0.55, "rgba(255, 255, 255, 0.18)");
  halo.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  // Subtle 4-point star cross flare
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.beginPath();
  ctx.ellipse(half, half, half * 0.72, size * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(half, half, size * 0.045, half * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

interface CloudClusterData {
  baseX: number;
  y: number;
  z: number;
  scale: number;
  speed: number;
  flip?: boolean;
}

// 14 clouds arranged in a 360-degree ring across horizon-visible valley skies
const CLOUD_CONFIGS: CloudClusterData[] = [
  // Back horizon arc (primary camera gaze direction)
  { baseX: -36, y: 10.5, z: -32, scale: 2.3, speed: 0.34 },
  { baseX: -18, y: 12.8, z: -36, scale: 2.8, speed: 0.41, flip: true },
  { baseX: 2, y: 11.2, z: -34, scale: 2.5, speed: 0.32 },
  { baseX: 22, y: 13.4, z: -35, scale: 2.7, speed: 0.39, flip: true },
  { baseX: 38, y: 10.2, z: -26, scale: 2.1, speed: 0.31 },
  // Mid-sky & flank horizons
  { baseX: -40, y: 9.8, z: -12, scale: 2.2, speed: 0.28, flip: true },
  { baseX: -28, y: 15.2, z: -22, scale: 2.4, speed: 0.36 },
  { baseX: 12, y: 15.8, z: -24, scale: 2.3, speed: 0.37, flip: true },
  { baseX: 35, y: 11.6, z: -6, scale: 2.4, speed: 0.33 },
  // Side & front perimeter so rotating 360 deg always shows clouds
  { baseX: -34, y: 10.8, z: 14, scale: 2.2, speed: 0.29 },
  { baseX: -12, y: 12.2, z: 30, scale: 2.6, speed: 0.35, flip: true },
  { baseX: 16, y: 11.8, z: 32, scale: 2.5, speed: 0.38 },
  { baseX: 36, y: 10.0, z: 18, scale: 2.1, speed: 0.30, flip: true },
  { baseX: 0, y: 16.5, z: -16, scale: 2.0, speed: 0.33 },
];

const HERO_NIGHT_STARS: Array<{ pos: [number, number, number]; size: number; color: string; phase: number }> = [
  { pos: [-32, 9.5, -34], size: 2.4, color: "#fef08a", phase: 0.2 },
  { pos: [-8, 12.5, -38], size: 2.6, color: "#e0f2fe", phase: 1.4 },
  { pos: [14, 11.0, -35], size: 2.4, color: "#fef08a", phase: 2.5 },
  { pos: [30, 8.8, -28], size: 2.2, color: "#bae6fd", phase: 3.1 },
  { pos: [-26, 11.8, -26], size: 2.1, color: "#e0f2fe", phase: 1.8 },
  { pos: [3, 8.2, -37], size: 2.2, color: "#fef08a", phase: 2.9 },
  { pos: [-35, 9.0, 16], size: 2.2, color: "#fef08a", phase: 0.9 },
  { pos: [26, 10.5, 28], size: 2.3, color: "#e0f2fe", phase: 2.0 },
];

export const StorybookSky: React.FC<StorybookSkyProps> = React.memo(
  ({ weather, isNight, isRaining = false, cloudSegments = [10, 8] }) => {
    const cloudTopInstancedRef = useRef<THREE.InstancedMesh>(null);
    const cloudBaseInstancedRef = useRef<THREE.InstancedMesh>(null);
    const cloudXOffsetsRef = useRef<Float32Array>(
      Float32Array.from(CLOUD_CONFIGS, (c) => c.baseX)
    );
    const starsLayerARef = useRef<THREE.Points>(null);
    const starsLayerBRef = useRef<THREE.Points>(null);
    const heroStarsRef = useRef<THREE.Group>(null);
    const sunGlowSpriteRef = useRef<THREE.Sprite>(null);
    const sunRaysSpriteRef = useRef<THREE.Sprite>(null);
    const moonGlowSpriteRef = useRef<THREE.Sprite>(null);

    const starPositionsA = useMemo(() => generateStarPositions(240, 42, 46, 58), []);
    const starPositionsB = useMemo(() => generateStarPositions(95, 1337, 44, 54), []);

    const sunGlowTex = useMemo(() => createRadialGlowTexture(128), []);
    const sunRayTex = useMemo(() => createSunRayTexture(256), []);
    const starTex = useMemo(() => createStarSpriteTexture(64), []);

    useEffect(() => {
      return () => {
        sunGlowTex?.dispose();
        sunRayTex?.dispose();
        starTex?.dispose();
      };
    }, [sunGlowTex, sunRayTex, starTex]);

    // Shared cloud & star geometries (disposed cleanly on unmount)
    const [cloudSegW, cloudSegH] = cloudSegments;
    const spherePuffGeo = useMemo(
      () => new THREE.SphereGeometry(1, cloudSegW, cloudSegH),
      [cloudSegW, cloudSegH]
    );
  const starGeoA = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(starPositionsA, 3));
    return geo;
  }, [starPositionsA]);
  const starGeoB = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(starPositionsB, 3));
    return geo;
  }, [starPositionsB]);

  useEffect(() => {
    return () => {
      spherePuffGeo.dispose();
      starGeoA.dispose();
      starGeoB.dispose();
    };
  }, [spherePuffGeo, starGeoA, starGeoB]);

  const raining = isRaining || weather === "hujan";

  // Cloud palette & opacity per weather/time phase (rain follows current time-of-day)
  const { cloudTopColor, cloudBaseColor, cloudOpacity } = useMemo(() => {
    if (raining) {
      if (isNight || weather === "malam") {
        return { cloudTopColor: "#26344a", cloudBaseColor: "#192334", cloudOpacity: 0.56 };
      }
      if (weather === "senja") {
        return { cloudTopColor: "#7e6775", cloudBaseColor: "#5b4754", cloudOpacity: 0.90 };
      }
      if (weather === "pagi") {
        return { cloudTopColor: "#9cb3c5", cloudBaseColor: "#7990a3", cloudOpacity: 0.90 };
      }
      return { cloudTopColor: "#94a3b8", cloudBaseColor: "#64748b", cloudOpacity: 0.90 };
    }
    if (weather === "pagi") {
      return { cloudTopColor: "#fffbeb", cloudBaseColor: "#fde68a", cloudOpacity: 0.94 };
    }
    if (weather === "senja") {
      return { cloudTopColor: "#ffedd5", cloudBaseColor: "#fdba74", cloudOpacity: 0.92 };
    }
    if (weather === "malam") {
      return { cloudTopColor: "#475569", cloudBaseColor: "#334155", cloudOpacity: 0.44 };
    }
    return { cloudTopColor: "#ffffff", cloudBaseColor: "#e2e8f0", cloudOpacity: 0.95 };
  }, [weather, raining, isNight]);

  // Sun geometry & colors tuned per sunlit time phase
  const sunConfig = useMemo(() => {
    if (weather === "pagi") {
      return {
        position: [24, 10.5, -25] as [number, number, number],
        radius: 2.3,
        coreColor: "#fffbeb",
        glowColor: "#fde047",
        rayColor: "#fef08a",
        glowScale: 10.0,
        rayScale: 13.0,
      };
    }
    if (weather === "senja") {
      return {
        position: [-23, 10.2, -25] as [number, number, number],
        radius: 2.5,
        coreColor: "#ffedd5",
        glowColor: "#fb923c",
        rayColor: "#fdba74",
        glowScale: 11.2,
        rayScale: 14.2,
      };
    }
    return {
      position: [14, 15, -28] as [number, number, number],
      radius: 2.1,
      coreColor: "#ffffff",
      glowColor: "#fde047",
      rayColor: "#fef9c3",
      glowScale: 9.2,
      rayScale: 12.0,
    };
  }, [weather]);

    const syncCloudMatrices = (rainScale: number) => {
      const topMesh = cloudTopInstancedRef.current;
      const baseMesh = cloudBaseInstancedRef.current;
      if (!topMesh || !baseMesh) return;
      const xs = cloudXOffsetsRef.current;

      for (let i = 0; i < CLOUD_CONFIGS.length; i++) {
        const cfg = CLOUD_CONFIGS[i];
        const dir = cfg.flip ? -1 : 1;
        const s = cfg.scale * rainScale;
        const cx = xs[i];

        for (let p = 0; p < CLOUD_TOP_PUFFS.length; p++) {
          const puff = CLOUD_TOP_PUFFS[p];
          _cloudDummy.position.set(
            cx + puff.pos[0] * s * dir,
            cfg.y + puff.pos[1] * s,
            cfg.z + puff.pos[2] * s
          );
          _cloudDummy.scale.set(puff.scale[0] * s, puff.scale[1] * s, puff.scale[2] * s);
          _cloudDummy.updateMatrix();
          topMesh.setMatrixAt(i * CLOUD_TOP_PUFFS.length + p, _cloudDummy.matrix);
        }

        _cloudDummy.position.set(
          cx + CLOUD_BASE_PUFF.pos[0] * s * dir,
          cfg.y + CLOUD_BASE_PUFF.pos[1] * s,
          cfg.z + CLOUD_BASE_PUFF.pos[2] * s
        );
        _cloudDummy.scale.set(
          CLOUD_BASE_PUFF.scale[0] * s,
          CLOUD_BASE_PUFF.scale[1] * s,
          CLOUD_BASE_PUFF.scale[2] * s
        );
        _cloudDummy.updateMatrix();
        baseMesh.setMatrixAt(i, _cloudDummy.matrix);
      }

      topMesh.instanceMatrix.needsUpdate = true;
      baseMesh.instanceMatrix.needsUpdate = true;
    };

    useEffect(() => {
      syncCloudMatrices(raining ? 1.18 : 1);
    }, [raining]);

    useFrame((state, delta) => {
      const t = state.clock.elapsedTime;

      // 1. Drift instanced clouds smoothly across the sky perimeter (2 draw calls total)
      const xs = cloudXOffsetsRef.current;
      for (let i = 0; i < CLOUD_CONFIGS.length; i++) {
        xs[i] += delta * CLOUD_CONFIGS[i].speed;
        if (xs[i] > 48) {
          xs[i] = -48;
        }
      }
      syncCloudMatrices(raining ? 1.18 : 1);

    // 2. Two-tier twinkling starlight at night (hidden under heavy rain overcast)
    if (isNight && !raining) {
      if (starsLayerARef.current) {
        const matA = starsLayerARef.current.material as THREE.PointsMaterial;
        matA.opacity = 0.72 + Math.sin(t * 1.9) * 0.22;
      }
      if (starsLayerBRef.current) {
        const matB = starsLayerBRef.current.material as THREE.PointsMaterial;
        matB.opacity = 0.76 + Math.cos(t * 2.7) * 0.24;
      }
      if (heroStarsRef.current) {
        heroStarsRef.current.children.forEach((child, idx) => {
          const hero = HERO_NIGHT_STARS[idx];
          if (!hero) return;
          const pulse = 0.85 + Math.sin(t * 2.4 + hero.phase) * 0.24;
          child.scale.setScalar(hero.size * pulse);
        });
      }
    }

    // 3. Camera-always-facing billboarded sun corona & rotating sunbeams
    if (!isNight && !raining) {
      if (sunGlowSpriteRef.current) {
        sunGlowSpriteRef.current.scale.setScalar(
          sunConfig.glowScale * (1 + Math.sin(t * 1.6) * 0.04)
        );
      }
      if (sunRaysSpriteRef.current) {
        const mat = sunRaysSpriteRef.current.material as THREE.SpriteMaterial;
        mat.rotation += delta * 0.14;
        sunRaysSpriteRef.current.scale.setScalar(
          sunConfig.rayScale * (1 + Math.cos(t * 1.2) * 0.03)
        );
      }
    }

    // 4. Gentle luminous pulse on moon corona
    if (isNight && !raining && moonGlowSpriteRef.current) {
      moonGlowSpriteRef.current.scale.setScalar(9.5 * (1 + Math.sin(t * 1.4) * 0.035));
    }
  });

  return (
    <group name="StorybookSky">
      {/* --- 1. CELESTIAL SUN (Billboarded Corona + Soft Rays + Bright Sphere) --- */}
      {!isNight && !raining && (
        <group position={sunConfig.position}>
          {/* Crisp 3D Luminous Core */}
          <mesh>
            <sphereGeometry args={[sunConfig.radius, 24, 24]} />
            <meshBasicMaterial color={sunConfig.coreColor} fog={false} />
          </mesh>

          {/* Soft Circular Radial Glow Sprite (always faces camera, never distorts) */}
          {sunGlowTex && (
            <sprite ref={sunGlowSpriteRef} scale={sunConfig.glowScale}>
              <spriteMaterial
                map={sunGlowTex}
                color={sunConfig.glowColor}
                transparent
                opacity={weather === "senja" ? 0.72 : 0.62}
                depthWrite={false}
                fog={false}
                blending={THREE.AdditiveBlending}
              />
            </sprite>
          )}

          {/* Rotating Soft Sunbeams Sprite */}
          {sunRayTex && (
            <sprite ref={sunRaysSpriteRef} scale={sunConfig.rayScale}>
              <spriteMaterial
                map={sunRayTex}
                color={sunConfig.rayColor}
                transparent
                opacity={weather === "senja" ? 0.45 : 0.40}
                depthWrite={false}
                fog={false}
                blending={THREE.AdditiveBlending}
              />
            </sprite>
          )}
        </group>
      )}

      {/* --- 2. CELESTIAL MOON (Malam) --- */}
      {isNight && !raining && (
        <group position={[-16, 13.5, -27]}>
          {/* Luminous Ivory Moon Sphere */}
          <mesh>
            <sphereGeometry args={[2.0, 20, 20]} />
            <meshBasicMaterial color="#fffef0" fog={false} />
          </mesh>
          {/* Subtle Crater Markings on Moon Face */}
          <mesh position={[0.6, 0.45, 1.85]}>
            <sphereGeometry args={[0.38, 10, 10]} />
            <meshBasicMaterial color="#e2e8f0" fog={false} />
          </mesh>
          <mesh position={[-0.55, -0.35, 1.88]}>
            <sphereGeometry args={[0.26, 10, 10]} />
            <meshBasicMaterial color="#cbd5e1" fog={false} />
          </mesh>
          {/* Circular Billboarded Moonbeam Glow */}
          {sunGlowTex && (
            <sprite ref={moonGlowSpriteRef} scale={9.5}>
              <spriteMaterial
                map={sunGlowTex}
                color="#93c5fd"
                transparent
                opacity={0.44}
                depthWrite={false}
                fog={false}
                blending={THREE.AdditiveBlending}
              />
            </sprite>
          )}
        </group>
      )}

      {/* --- 3. TWINKLING STARFIELD (Malam) --- */}
      {isNight && !raining && (
        <group>
          <points ref={starsLayerARef} geometry={starGeoA}>
            <pointsMaterial
              map={starTex ?? undefined}
              size={1.25}
              color="#f8fafc"
              transparent
              alphaTest={0.02}
              opacity={0.85}
              sizeAttenuation={true}
              fog={false}
              depthWrite={false}
            />
          </points>

          <points ref={starsLayerBRef} geometry={starGeoB}>
            <pointsMaterial
              map={starTex ?? undefined}
              size={1.8}
              color="#fef08a"
              transparent
              alphaTest={0.02}
              opacity={0.9}
              sizeAttenuation={true}
              fog={false}
              depthWrite={false}
            />
          </points>

          {starTex && (
            <group ref={heroStarsRef}>
              {HERO_NIGHT_STARS.map((hero, idx) => (
                <sprite key={idx} position={hero.pos} scale={hero.size}>
                  <spriteMaterial
                    map={starTex}
                    color={hero.color}
                    transparent
                    opacity={0.95}
                    depthWrite={false}
                    fog={false}
                    blending={THREE.AdditiveBlending}
                  />
                </sprite>
              ))}
            </group>
          )}
        </group>
      )}

      {/* --- 4. DRIFTING SCULPTED CUMULUS CLOUDS (2 Instanced Draw Calls) --- */}
      <group>
        <instancedMesh
          ref={cloudTopInstancedRef}
          args={[spherePuffGeo, undefined, CLOUD_CONFIGS.length * CLOUD_TOP_PUFFS.length]}
          frustumCulled={false}
        >
          <meshBasicMaterial
            color={cloudTopColor}
            transparent
            opacity={cloudOpacity}
            depthWrite={false}
            fog={false}
          />
        </instancedMesh>
        <instancedMesh
          ref={cloudBaseInstancedRef}
          args={[spherePuffGeo, undefined, CLOUD_CONFIGS.length]}
          frustumCulled={false}
        >
          <meshBasicMaterial
            color={cloudBaseColor}
            transparent
            opacity={cloudOpacity}
            depthWrite={false}
            fog={false}
          />
        </instancedMesh>
      </group>
    </group>
  );
});
