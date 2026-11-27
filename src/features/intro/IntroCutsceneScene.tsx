import React, { useMemo, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getSkinById } from "../../data/economyCatalog";
import { getTerrainHeightAt } from "../../engine/world/mapTerrain";
import { soundEffects } from "../../engine/audio/soundEffects";
import { buildJuroBodyGeometry } from "../character/juroBodyGeometry";
import { createMouthShapes } from "../character/juroMouthShapes";
import { createSoftShadowTexture } from "../character/juroTextures";
import { BODY_BOTTOM_LOCAL, JURO_BASE_SCALE } from "../character/juroTypes";
import {
  INTRO_CENTER_TARGET,
  INTRO_DURATION_SEC,
  INTRO_POND_ORIGIN,
  INTRO_REDUCED_DURATION_SEC,
  evaluateIntroCamera,
  evaluateSlimeFormation,
} from "./introTimeline";

interface DropletSeed {
  startX: number;
  startZ: number;
  departAt: number;
  arriveAt: number;
  arcHeight: number;
  lateralBend: number;
  radius: number;
  bobPhase: number;
}

const DROPLET_COUNT = 18;
const _dummy = new THREE.Object3D();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();

function createDropletSeeds(): DropletSeed[] {
  const seeds: DropletSeed[] = [];
  for (let i = 0; i < DROPLET_COUNT; i++) {
    const angle = (i / DROPLET_COUNT) * Math.PI * 2 + (i % 3) * 0.35;
    const radial = 0.6 + ((i * 0.37) % 1) * 2.5;
    const departAt = 0.03 + (i / DROPLET_COUNT) * 0.34;
    const travelSpan = 0.32 + (i % 4) * 0.055;
    seeds.push({
      startX: INTRO_POND_ORIGIN.x + Math.cos(angle) * radial,
      startZ: INTRO_POND_ORIGIN.z + Math.sin(angle) * radial,
      departAt,
      arriveAt: Math.min(0.84, departAt + travelSpan),
      arcHeight: 1.05 + (i % 5) * 0.36,
      lateralBend: ((i % 2 === 0 ? 1 : -1) * (0.45 + (i % 3) * 0.38)),
      radius: 0.17 + (i % 4) * 0.045,
      bobPhase: i * 0.85,
    });
  }
  return seeds;
}

export interface IntroCutsceneSceneProps {
  introProgressRef: React.RefObject<number>;
  sphereSegments: [number, number];
  usePhysicalMaterial: boolean;
  shadowsEnabled: boolean;
  onComplete?: () => void;
}

/**
 * Real-time 3D intro sequence: viscous slime droplets emerge from the lotus pond,
 * coalesce in the meadow across rapid day/night/weather cycles, and morph into Juro.
 */
export const IntroCutsceneScene: React.FC<IntroCutsceneSceneProps> = ({
  introProgressRef,
  sphereSegments,
  usePhysicalMaterial,
  shadowsEnabled,
  onComplete,
}) => {
  const { camera, size } = useThree();
  const elapsedRef = useRef(0);
  const completedRef = useRef(false);
  const firedSfxRef = useRef<Set<string>>(new Set());
  const prefersReducedMotionRef = useRef(false);

  const dropletsRef = useRef<THREE.InstancedMesh>(null);
  const ripplesRef = useRef<Array<THREE.Mesh | null>>([]);
  const coreGroupRef = useRef<THREE.Group>(null);
  const coreFaceRef = useRef<THREE.Group>(null);
  const coreLimbsRef = useRef<THREE.Group>(null);
  const coreShadowRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const dropletSeeds = useMemo(() => createDropletSeeds(), []);
  const skinPalette = getSkinById("classic-orange");
  const mouthShapes = useMemo(() => createMouthShapes(), []);
  const softShadowTexture = useMemo(() => createSoftShadowTexture(), []);
  const dropletGeo = useMemo(() => new THREE.SphereGeometry(1, 14, 12), []);
  const rippleGeo = useMemo(() => new THREE.RingGeometry(0.75, 1.0, 28), []);
  const juroBodyGeo = useMemo(
    () =>
      buildJuroBodyGeometry({
        centerColor: skinPalette.centerColor,
        midColor: skinPalette.midColor,
        edgeColor: skinPalette.edgeColor,
        hasHat: false,
        widthSegments: sphereSegments[0],
        heightSegments: sphereSegments[1],
      }),
    [skinPalette.centerColor, skinPalette.midColor, skinPalette.edgeColor, sphereSegments]
  );

  useEffect(() => {
    return () => {
      dropletGeo.dispose();
      rippleGeo.dispose();
      juroBodyGeo.dispose();
      softShadowTexture?.dispose();
    };
  }, [dropletGeo, rippleGeo, juroBodyGeo, softShadowTexture]);

  const fireSfxOnce = (id: string, fn: () => void) => {
    if (firedSfxRef.current.has(id)) return;
    firedSfxRef.current.add(id);
    fn();
  };

  useFrame((state, delta) => {
    const duration = prefersReducedMotionRef.current
      ? INTRO_REDUCED_DURATION_SEC
      : INTRO_DURATION_SEC;

    elapsedRef.current += Math.min(delta, 0.1);
    const p = Math.min(1, elapsedRef.current / duration);
    introProgressRef.current = p;

    const t = state.clock.elapsedTime;
    const formation = evaluateSlimeFormation(p);

    // 1. Trigger synchronized Web Audio SFX milestones
    if (p >= 0.03) fireSfxOnce("pond-splash", () => soundEffects.playSplash());
    if (p >= 0.14) fireSfxOnce("droplet-bubble-1", () => soundEffects.playBubble());
    if (p >= 0.25) fireSfxOnce("droplet-plop", () => soundEffects.playPlop());
    if (p >= 0.35) fireSfxOnce("droplet-bubble-2", () => soundEffects.playBubble());
    if (p >= 0.43) fireSfxOnce("weather-rain-start", () => soundEffects.playWeatherChange(true));
    if (p >= 0.48) fireSfxOnce("rain-1", () => soundEffects.playRainDrop());
    if (p >= 0.55) fireSfxOnce("rain-2", () => soundEffects.playRainDrop());
    if (p >= 0.62) fireSfxOnce("rain-3", () => soundEffects.playRainDrop());
    if (p >= 0.68) fireSfxOnce("weather-clear", () => soundEffects.playWeatherChange(false));
    if (p >= 0.77) fireSfxOnce("slime-coalesce", () => soundEffects.playSquish());
    if (p >= 0.88) fireSfxOnce("juro-hop", () => soundEffects.playHop());
    if (p >= 0.92) fireSfxOnce("juro-happy", () => soundEffects.playHappy());

    // 2. Drive cinematic camera trajectory matching viewport orientation
    const isPortrait = size.width / Math.max(1, size.height) < 0.85;
    const camPose = evaluateIntroCamera(p, isPortrait);
    camera.position.set(camPose.position[0], camPose.position[1], camPose.position[2]);
    camera.lookAt(camPose.lookAt[0], camPose.lookAt[1], camPose.lookAt[2]);

    // 3. Animate pond surface ripples as slime emerges
    for (let r = 0; r < ripplesRef.current.length; r++) {
      const mesh = ripplesRef.current[r];
      if (!mesh) continue;
      const cycle = ((p * 4.2 + r * 0.33) % 1);
      const visibilityFade = p < 0.44 ? 1 - Math.max(0, (p - 0.32) / 0.12) : 0;
      mesh.visible = visibilityFade > 0.02;
      if (mesh.visible) {
        const radius = 0.6 + cycle * 2.8;
        mesh.scale.setScalar(radius);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = (1 - cycle) * 0.55 * visibilityFade;
      }
    }

    // 4. Animate 18 viscous slime droplets travelling from pond to meadow center
    if (dropletsRef.current) {
      for (let i = 0; i < dropletSeeds.length; i++) {
        const d = dropletSeeds[i];
        if (p < d.departAt) {
          // Emerge and bob in pond water before launching
          const emerge = Math.min(1, p / Math.max(0.04, d.departAt));
          const bobY = INTRO_POND_ORIGIN.y - 0.18 + emerge * 0.24 + Math.sin(t * 5 + d.bobPhase) * 0.05;
          const r = d.radius * (0.4 + 0.6 * emerge);
          _dummy.position.set(d.startX, bobY, d.startZ);
          _dummy.quaternion.identity();
          _dummy.scale.set(r * 1.15, r * 0.85, r * 1.15);
        } else if (p <= d.arriveAt) {
          const u = (p - d.departAt) / Math.max(0.05, d.arriveAt - d.departAt);
          const smoothU = u * u * (3 - 2 * u);

          const dx = INTRO_CENTER_TARGET.x - d.startX;
          const dz = INTRO_CENTER_TARGET.z - d.startZ;
          const len = Math.max(0.1, Math.hypot(dx, dz));
          const perpX = -dz / len;
          const perpZ = dx / len;
          const bend = Math.sin(smoothU * Math.PI) * d.lateralBend;

          const x = THREE.MathUtils.lerp(d.startX, INTRO_CENTER_TARGET.x, smoothU) + perpX * bend;
          const z = THREE.MathUtils.lerp(d.startZ, INTRO_CENTER_TARGET.z, smoothU) + perpZ * bend;
          const groundY = getTerrainHeightAt(x, z);
          const arcY = Math.sin(smoothU * Math.PI) * d.arcHeight;
          const bounceSub = Math.abs(Math.sin(u * Math.PI * 3.0)) * 0.28 * (1 - u * 0.35);
          const y = THREE.MathUtils.lerp(INTRO_POND_ORIGIN.y + 0.1, groundY + 0.25, smoothU) + arcY + bounceSub;

          // Next sample for viscous velocity stretch alignment
          const uNext = Math.min(1, u + 0.04);
          const suNext = uNext * uNext * (3 - 2 * uNext);
          const bendNext = Math.sin(suNext * Math.PI) * d.lateralBend;
          const xNext = THREE.MathUtils.lerp(d.startX, INTRO_CENTER_TARGET.x, suNext) + perpX * bendNext;
          const zNext = THREE.MathUtils.lerp(d.startZ, INTRO_CENTER_TARGET.z, suNext) + perpZ * bendNext;
          const yNext =
            THREE.MathUtils.lerp(INTRO_POND_ORIGIN.y + 0.1, getTerrainHeightAt(xNext, zNext) + 0.25, suNext) +
            Math.sin(suNext * Math.PI) * d.arcHeight;

          _dir.set(xNext - x, yNext - y, zNext - z);
          if (_dir.lengthSq() > 1e-5) {
            _dir.normalize();
            _quat.setFromUnitVectors(_up, _dir);
          } else {
            _quat.identity();
          }

          const shrinkAsAbsorbed = u > 0.85 ? 1 - (u - 0.85) / 0.15 : 1;
          const stretch = 1.38 + Math.sin(u * Math.PI) * 0.35;
          const radius = d.radius * Math.max(0.05, shrinkAsAbsorbed);

          _dummy.position.set(x, y, z);
          _dummy.quaternion.copy(_quat);
          _dummy.scale.set(radius * 0.82, radius * stretch, radius * 0.82);
        } else {
          _dummy.position.set(INTRO_CENTER_TARGET.x, -10, INTRO_CENTER_TARGET.z);
          _dummy.scale.set(0.0001, 0.0001, 0.0001);
        }
        _dummy.updateMatrix();
        dropletsRef.current.setMatrixAt(i, _dummy.matrix);
      }
      dropletsRef.current.instanceMatrix.needsUpdate = true;
    }

    // 5. Animate coalescing Juro core morphing into Level-1 Juro at meadow center
    const centerGroundY = getTerrainHeightAt(INTRO_CENTER_TARGET.x, INTRO_CENTER_TARGET.z);
    const targetPetScale = JURO_BASE_SCALE * 0.68; // Matches Level 1 JuroModel initial growth
    const absorbFill = Math.min(1, Math.max(0, (p - 0.22) / 0.56));

    if (coreGroupRef.current) {
      const visible = absorbFill > 0.01;
      coreGroupRef.current.visible = visible;
      if (visible) {
        const massGrowth = Math.pow(absorbFill, 0.65);
        const wobble = (1 - formation.morphProgress) * Math.sin(t * 11) * 0.14;
        const puddleFlatten = THREE.MathUtils.lerp(0.42, 1.0, formation.morphProgress);
        const puddleSpread = THREE.MathUtils.lerp(1.28, 1.0, formation.morphProgress);

        const hopArc = formation.welcomeHopY;
        const hopSquash = hopArc > 0.01 ? hopArc * 0.35 : 0;

        const sx = targetPetScale * massGrowth * puddleSpread * (1 + wobble - hopSquash * 0.55);
        const sy = targetPetScale * massGrowth * puddleFlatten * (1 - wobble * 0.6 + hopSquash);
        const sz = targetPetScale * massGrowth * puddleSpread * (1 + wobble * 0.8 - hopSquash * 0.55);

        coreGroupRef.current.scale.set(sx, sy, sz);
        coreGroupRef.current.position.set(
          INTRO_CENTER_TARGET.x,
          centerGroundY + BODY_BOTTOM_LOCAL * sy + hopArc,
          INTRO_CENTER_TARGET.z
        );
        coreGroupRef.current.rotation.y = THREE.MathUtils.lerp(Math.PI * 0.35, 0, formation.morphProgress);
      }
    }

    if (coreLimbsRef.current) {
      const limbAlpha = Math.max(0, Math.min(1, (formation.morphProgress - 0.35) / 0.65));
      coreLimbsRef.current.visible = limbAlpha > 0.01;
      coreLimbsRef.current.scale.setScalar(0.01 + 0.99 * limbAlpha);
    }

    if (coreFaceRef.current) {
      const reveal = formation.faceReveal;
      coreFaceRef.current.visible = reveal > 0.01;
      if (coreFaceRef.current.visible) {
        // Gentle elastic overshoot pop as Juro opens its eyes
        const pop = reveal < 0.7 ? (reveal / 0.7) * 1.1 : 1.1 - ((reveal - 0.7) / 0.3) * 0.1;
        coreFaceRef.current.scale.setScalar(Math.max(0.01, pop));
      }
    }

    if (coreShadowRef.current) {
      coreShadowRef.current.visible = absorbFill > 0.02;
      const shadowGrowth = Math.pow(absorbFill, 0.65);
      const liftShrink = 1 / (1 + formation.welcomeHopY * 0.6);
      coreShadowRef.current.position.set(INTRO_CENTER_TARGET.x, centerGroundY + 0.005, INTRO_CENTER_TARGET.z);
      coreShadowRef.current.scale.set(
        2.45 * targetPetScale * shadowGrowth * liftShrink,
        2.15 * targetPetScale * shadowGrowth * liftShrink,
        1
      );
      const shadowMat = coreShadowRef.current.material as THREE.MeshBasicMaterial;
      shadowMat.opacity = 0.75 * shadowGrowth * liftShrink;
    }

    // 6. Finish cleanly
    if (p >= 1 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  });

  return (
    <group name="IntroCutsceneActors">
      {/* Pond emergence ripples */}
      {[0, 1, 2].map((idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            ripplesRef.current[idx] = el;
          }}
          geometry={rippleGeo}
          position={[INTRO_POND_ORIGIN.x, INTRO_POND_ORIGIN.y + 0.01, INTRO_POND_ORIGIN.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <meshBasicMaterial
            color="#fdba74"
            transparent
            opacity={0.45}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* 18 instanced viscous orange slime droplets */}
      <instancedMesh
        ref={dropletsRef}
        args={[dropletGeo, undefined, DROPLET_COUNT]}
        castShadow={shadowsEnabled}
        frustumCulled={false}
      >
        {usePhysicalMaterial ? (
          <meshPhysicalMaterial
            color="#fb923c"
            roughness={0.14}
            metalness={0.02}
            clearcoat={1.0}
            clearcoatRoughness={0.06}
            emissive="#f97316"
            emissiveIntensity={0.18}
            transparent
            opacity={0.92}
          />
        ) : (
          <meshStandardMaterial
            color="#fb923c"
            roughness={0.18}
            metalness={0.05}
            emissive="#f97316"
            emissiveIntensity={0.2}
          />
        )}
      </instancedMesh>

      {/* Coalescing Juro core */}
      <group ref={coreGroupRef} visible={false}>
        <mesh geometry={juroBodyGeo} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          {usePhysicalMaterial ? (
            <meshPhysicalMaterial
              vertexColors={true}
              roughness={0.14}
              metalness={0.02}
              clearcoat={1.0}
              clearcoatRoughness={0.06}
              sheen={0.55}
              sheenColor={skinPalette.centerColor}
              emissive={skinPalette.emissiveColor}
              emissiveIntensity={0.08}
            />
          ) : (
            <meshStandardMaterial
              vertexColors={true}
              roughness={0.14}
              metalness={0.08}
              emissive={skinPalette.emissiveColor}
              emissiveIntensity={0.1}
            />
          )}
        </mesh>

        {/* Top swirl & droplet arms */}
        <group ref={coreLimbsRef} visible={false}>
          <mesh position={[0.24, 0.72, 0.02]} rotation={[0.22, 0.35, -0.2]} scale={[1.0, 0.72, 1.0]}>
            <torusGeometry args={[0.3, 0.088, 12, 24, Math.PI * 0.85]} />
            <meshStandardMaterial
              color={skinPalette.limbColor}
              roughness={0.12}
              metalness={0.06}
              emissive={skinPalette.emissiveColor}
              emissiveIntensity={0.12}
            />
          </mesh>
          <mesh position={[-1.16, -0.22, 0.04]} rotation={[0, 0, 0.35]} scale={[1.22, 0.85, 0.85]}>
            <sphereGeometry args={[0.21, 16, 14]} />
            <meshStandardMaterial
              color={skinPalette.limbColor}
              roughness={0.14}
              metalness={0.06}
              emissive={skinPalette.emissiveColor}
              emissiveIntensity={0.1}
            />
          </mesh>
          <mesh position={[1.16, -0.2, 0.02]} rotation={[0, 0, -0.35]} scale={[1.22, 0.85, 0.85]}>
            <sphereGeometry args={[0.21, 16, 14]} />
            <meshStandardMaterial
              color={skinPalette.limbColor}
              roughness={0.14}
              metalness={0.06}
              emissive={skinPalette.emissiveColor}
              emissiveIntensity={0.1}
            />
          </mesh>
        </group>

        {/* Awakening eyes & smile */}
        <group ref={coreFaceRef} visible={false}>
          <group position={[-0.35, 0.07, 0.96]} rotation={[0, -0.24, -0.05]}>
            <mesh scale={[1.0, 1.24, 0.52]}>
              <sphereGeometry args={[0.11, 20, 20]} />
              <meshStandardMaterial color="#1E140E" roughness={0.08} metalness={0.05} />
            </mesh>
            <mesh position={[0.032, 0.042, 0.056]}>
              <sphereGeometry args={[0.032, 10, 10]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
            <mesh position={[-0.025, -0.042, 0.052]}>
              <sphereGeometry args={[0.014, 8, 8]} />
              <meshBasicMaterial color="#FFFFFF" opacity={0.7} transparent />
            </mesh>
          </group>

          <group position={[0.35, 0.07, 0.96]} rotation={[0, 0.24, 0.05]}>
            <mesh scale={[1.0, 1.24, 0.52]}>
              <sphereGeometry args={[0.11, 20, 20]} />
              <meshStandardMaterial color="#1E140E" roughness={0.08} metalness={0.05} />
            </mesh>
            <mesh position={[0.032, 0.042, 0.056]}>
              <sphereGeometry args={[0.032, 10, 10]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
            <mesh position={[-0.025, -0.042, 0.052]}>
              <sphereGeometry args={[0.014, 8, 8]} />
              <meshBasicMaterial color="#FFFFFF" opacity={0.7} transparent />
            </mesh>
          </group>

          <group position={[0, -0.01, 1.035]}>
            <mesh>
              <shapeGeometry args={[mouthShapes.mouthShape]} />
              <meshBasicMaterial color="#7C2D12" side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0.008, 0.006]}>
              <shapeGeometry args={[mouthShapes.tongueShape]} />
              <meshBasicMaterial color="#FB7185" side={THREE.DoubleSide} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Ground contact shadow under coalescing Juro */}
      {softShadowTexture && (
        <mesh ref={coreShadowRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={softShadowTexture}
            transparent
            opacity={0.7}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};
