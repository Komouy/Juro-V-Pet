import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { TimeThemeConfig } from "../../utils/timeOfDay";
import { BASE_GROUND_Y, MAP_PLATFORMS, isWaterAt } from "../../engine/world/mapTerrain";

interface OutdoorEnvironmentProps {
  theme: TimeThemeConfig;
  onWalkPointSelect?: (x: number, z: number) => void;
  onOpenShop?: () => void;
  onOpenMine?: () => void;
  onBedClick?: () => void;
}

// Reusable scratch objects at module scope (zero GC allocations per frame, 0 lint warnings)
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

// Crisp pixel-styled wooden signboard CanvasTexture for interactive 3D landmarks
function createSignTexture(
  label: string,
  bgColor: string,
  borderColor: string,
  textColor: string
): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = borderColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = bgColor;
  ctx.fillRect(8, 8, canvas.width - 16, canvas.height - 16);

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

  ctx.fillStyle = textColor;
  ctx.font = 'bold 34px "Silkscreen", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

// Deterministic pseudo-random helper (pure for React render/linting)
function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Smooth organic pond shape
function createOrganicPondShape(scaleX: number, scaleY: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-1.05 * scaleX, 0.05 * scaleY);
  shape.bezierCurveTo(
    -1.08 * scaleX,
    0.72 * scaleY,
    -0.25 * scaleX,
    0.92 * scaleY,
    0.45 * scaleX,
    0.72 * scaleY
  );
  shape.bezierCurveTo(
    1.15 * scaleX,
    0.52 * scaleY,
    1.22 * scaleX,
    -0.32 * scaleY,
    0.68 * scaleX,
    -0.72 * scaleY
  );
  shape.bezierCurveTo(
    0.15 * scaleX,
    -1.02 * scaleY,
    -0.95 * scaleX,
    -0.72 * scaleY,
    -1.05 * scaleX,
    0.05 * scaleY
  );
  return shape;
}

// Smooth winding brook ribbon shape (sy maps to -worldZ when rotated -PI/2 on X)
function createStreamShape(halfWidthPad = 0): THREE.Shape {
  const centerPoints: [number, number, number][] = [
    [-6.8, 5.8, 0.3],
    [-4.3, 4.15, 0.36],
    [-2.2, 3.0, 0.42],
    [-0.45, 2.35, 0.44],
    [0.95, 1.95, 0.46],
    [2.25, 1.25, 0.56],
  ];

  const upperEdge: THREE.Vector2[] = [];
  const lowerEdge: THREE.Vector2[] = [];

  for (let i = 0; i < centerPoints.length; i++) {
    const [x, y, hw] = centerPoints[i];
    const prev = centerPoints[Math.max(0, i - 1)];
    const next = centerPoints[Math.min(centerPoints.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const width = hw + halfWidthPad;
    upperEdge.push(new THREE.Vector2(x + nx * width, y + ny * width));
    lowerEdge.push(new THREE.Vector2(x - nx * width, y - ny * width));
  }

  const shape = new THREE.Shape();
  shape.moveTo(upperEdge[0].x, upperEdge[0].y);
  for (let i = 1; i < upperEdge.length; i++) {
    const prev = upperEdge[i - 1];
    const curr = upperEdge[i];
    shape.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2);
  }
  const lastUpper = upperEdge[upperEdge.length - 1];
  shape.lineTo(lastUpper.x, lastUpper.y);

  const lastLower = lowerEdge[lowerEdge.length - 1];
  shape.lineTo(lastLower.x, lastLower.y);
  for (let i = lowerEdge.length - 2; i >= 0; i--) {
    const prev = lowerEdge[i + 1];
    const curr = lowerEdge[i];
    shape.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2);
  }
  shape.lineTo(lowerEdge[0].x, lowerEdge[0].y);
  shape.closePath();
  return shape;
}

export const OutdoorEnvironment: React.FC<OutdoorEnvironmentProps> = React.memo(
  ({ theme, onWalkPointSelect, onOpenShop, onOpenMine, onBedClick }) => {
    const [hoveredLandmark, setHoveredLandmark] = useState<"none" | "shop" | "mine" | "bed">("none");

    // Signboard textures for interactive 3D Shop ("TOKO") & Mine Cave ("TAMBANG")
    const shopSignTex = useMemo(
      () => createSignTexture("TOKO", "#FFF7ED", "#171717", "#EA580C"),
      []
    );
    const mineSignTex = useMemo(
      () => createSignTexture("TAMBANG", "#1C1917", "#F59E0B", "#FEF08A"),
      []
    );

    useEffect(() => {
      return () => {
        shopSignTex?.dispose();
        mineSignTex?.dispose();
      };
    }, [shopSignTex, mineSignTex]);

    useEffect(() => {
      if (typeof document === "undefined") return;
      document.body.style.cursor = hoveredLandmark !== "none" ? "pointer" : "auto";
      return () => {
        document.body.style.cursor = "auto";
      };
    }, [hoveredLandmark]);

    // InstancedMesh refs for mobile-optimized batched rendering
    const starsInstRef = useRef<THREE.InstancedMesh>(null);
    const grassInstRef = useRef<THREE.InstancedMesh>(null);
    const outerGrassInstRef = useRef<THREE.InstancedMesh>(null);
    const reedsInstRef = useRef<THREE.InstancedMesh>(null);
    const rocksInstRef = useRef<THREE.InstancedMesh>(null);
    const bushesInstRef = useRef<THREE.InstancedMesh>(null);
    const steppingStonesInstRef = useRef<THREE.InstancedMesh>(null);
    const mushroomStemsInstRef = useRef<THREE.InstancedMesh>(null);
    const mushroomCapsInstRef = useRef<THREE.InstancedMesh>(null);
    const roundTreeTrunksInstRef = useRef<THREE.InstancedMesh>(null);
    const roundTreeCrownsInstRef = useRef<THREE.InstancedMesh>(null);
    const pineTrunksInstRef = useRef<THREE.InstancedMesh>(null);
    const pineLowerInstRef = useRef<THREE.InstancedMesh>(null);
    const pineUpperInstRef = useRef<THREE.InstancedMesh>(null);
    const fencePostsInstRef = useRef<THREE.InstancedMesh>(null);
    const fenceRailsInstRef = useRef<THREE.InstancedMesh>(null);
    const shimmerInstRef = useRef<THREE.InstancedMesh>(null);

    // Small dynamic groups
    const cloudsGroupRef = useRef<THREE.Group>(null);
    const ripple1Ref = useRef<THREE.Mesh>(null);
    const ripple2Ref = useRef<THREE.Mesh>(null);
    const butterfliesGroupRef = useRef<THREE.Group>(null);

    // Track pointer down coords to distinguish a clean tap-to-walk from an OrbitControls camera drag
    const pointerDownPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    const handleGroundPointerDown = (e: ThreeEvent<PointerEvent>) => {
      pointerDownPos.current.x = e.clientX;
      pointerDownPos.current.y = e.clientY;
    };

    const handleGroundClick = (e: ThreeEvent<MouseEvent>) => {
      if (!onWalkPointSelect) return;
      const dist = Math.hypot(
        e.clientX - pointerDownPos.current.x,
        e.clientY - pointerDownPos.current.y
      );
      // Only command Juro to walk on a deliberate tap/click (not after dragging camera)
      if (dist < 6) {
        e.stopPropagation();
        onWalkPointSelect(e.point.x, e.point.z);
      }
    };

    const handleLandmarkPointerDown = (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      pointerDownPos.current.x = e.clientX;
      pointerDownPos.current.y = e.clientY;
    };

    const handleShopClick = (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const dist = Math.hypot(
        e.clientX - pointerDownPos.current.x,
        e.clientY - pointerDownPos.current.y
      );
      if (dist < 6) {
        onOpenShop?.();
      }
    };

    const handleMineClick = (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const dist = Math.hypot(
        e.clientX - pointerDownPos.current.x,
        e.clientY - pointerDownPos.current.y
      );
      if (dist < 6) {
        onOpenMine?.();
      }
    };

    // Pond & Stream shapes
    const pondBankShape = useMemo(() => createOrganicPondShape(1.18, 0.86), []);
    const pondWaterShape = useMemo(() => createOrganicPondShape(1.06, 0.75), []);
    const streamBankShape = useMemo(() => createStreamShape(0.11), []);
    const streamWaterShape = useMemo(() => createStreamShape(0), []);

    // 1. Stars (70 instances -> 1 draw call!)
    const stars = useMemo(() => {
      const list: { pos: [number, number, number]; size: number; phase: number }[] = [];
      for (let i = 0; i < 70; i++) {
        list.push({
          pos: [
            (seeded(i * 3 + 1) - 0.5) * 28,
            0.7 + seeded(i * 3 + 2) * 5.6,
            -8.2 - seeded(i * 3 + 3) * 1.8,
          ],
          size: 0.022 + seeded(i * 5 + 4) * 0.032,
          phase: seeded(i * 7 + 5) * Math.PI * 2,
        });
      }
      return list;
    }, []);

    // 2. Daytime Butterflies (4 fluttering companions over valley)
    const butterflies = useMemo(
      () => [
        { base: [-3.1, 0.05, -0.4] as [number, number, number], radius: 0.65, speed: 1.1, phase: 0, color: "#FDE047" },
        { base: [2.3, -0.22, -0.85] as [number, number, number], radius: 0.55, speed: 1.35, phase: 2.1, color: "#F472B6" },
        { base: [3.3, 0.02, 0.75] as [number, number, number], radius: 0.5, speed: 0.95, phase: 4.0, color: "#38BDF8" },
        { base: [-1.4, -0.1, 1.4] as [number, number, number], radius: 0.55, speed: 1.2, phase: 5.2, color: "#C084FC" },
      ],
      []
    );

    // 3. Dense Miniature Terrarium Forest: Core Trees + Procedural Small Trees Filling All Empty Map Areas!
    const roundTrees = useMemo(() => {
      const list: { pos: [number, number, number]; scale: number }[] = [
        { pos: [-6.4, -0.82, -4.2], scale: 1.05 },
        { pos: [-4.4, -0.82, -4.5], scale: 0.95 },
        { pos: [-2.8, -0.84, -4.8], scale: 0.82 },
        { pos: [1.55, -0.85, -4.7], scale: 0.8 },
        { pos: [3.2, -0.82, -4.2], scale: 0.95 },
        { pos: [5.9, -0.82, -4.2], scale: 1.05 },
        { pos: [-5.9, -0.82, -2.0], scale: 1.05 },
        { pos: [-5.5, -0.82, 0.25], scale: 0.92 },
        { pos: [-4.8, -0.84, 2.2], scale: 0.85 },
        { pos: [-3.9, -0.44, -1.35], scale: 0.78 },
        { pos: [6.2, -0.82, -1.6], scale: 1.0 },
        { pos: [5.6, -0.82, 0.85], scale: 0.95 },
        { pos: [4.9, -0.84, 2.35], scale: 0.82 },
        { pos: [4.2, -0.48, 1.35], scale: 0.76 },
      ];

      // Procedurally fill empty outer left, right, back & far-corner areas with small mini trees
      for (let i = 0; i < 65; i++) {
        const angle = seeded(i * 19 + 1) * Math.PI * 2;
        const radius = 5.4 + seeded(i * 19 + 2) * 7.6;
        const x = Math.cos(angle) * radius * 1.15;
        const z = Math.sin(angle) * radius * 0.85;
        // Keep central valley clear & keep front-center camera sightline open
        if (Math.abs(x) < 4.9 && z > -3.8 && z < 3.6) continue;
        if (Math.abs(x) < 4.2 && z > 2.4) continue;
        if (isWaterAt(x, z)) continue;
        if (Math.hypot(x - 4.55, z - -2.55) < 1.9) continue; // keep shop clear
        if (Math.hypot(x - -0.36, z - -4.55) < 2.05) continue; // keep mine cave clear
        const scale = 0.42 + seeded(i * 19 + 3) * 0.46;
        list.push({ pos: [x, -0.86, z], scale });
      }
      return list;
    }, []);

    const pineTrees = useMemo(() => {
      const list: { pos: [number, number, number]; scale: number }[] = [
        { pos: [-5.4, -0.84, -5.0], scale: 1.05 },
        { pos: [-3.6, -0.85, -5.3], scale: 0.9 },
        { pos: [-1.4, -0.86, -5.4], scale: 0.84 },
        { pos: [0.55, -0.86, -5.4], scale: 0.88 },
        { pos: [2.4, -0.84, -5.0], scale: 0.96 },
        { pos: [4.8, -0.84, -4.9], scale: 1.08 },
        { pos: [6.8, -0.84, -3.5], scale: 0.95 },
        { pos: [-6.7, -0.84, -0.85], scale: 1.02 },
        { pos: [-6.1, -0.84, 1.45], scale: 0.92 },
        { pos: [6.6, -0.84, -0.2], scale: 1.0 },
        { pos: [6.0, -0.84, 1.95], scale: 0.88 },
        { pos: [-7.2, -0.84, -3.1], scale: 0.96 },
      ];

      // Procedurally fill empty outer areas with small miniature pine trees
      for (let i = 0; i < 60; i++) {
        const angle = seeded(i * 23 + 7) * Math.PI * 2;
        const radius = 5.6 + seeded(i * 23 + 8) * 8.0;
        const x = Math.cos(angle) * radius * 1.18;
        const z = Math.sin(angle) * radius * 0.88;
        if (Math.abs(x) < 5.0 && z > -4.0 && z < 3.6) continue;
        if (Math.abs(x) < 4.4 && z > 2.4) continue;
        if (isWaterAt(x, z)) continue;
        if (Math.hypot(x - 4.55, z - -2.55) < 1.9) continue;
        if (Math.hypot(x - -0.36, z - -4.55) < 2.05) continue;
        const scale = 0.44 + seeded(i * 23 + 9) * 0.48;
        list.push({ pos: [x, -0.86, z], scale });
      }
      return list;
    }, []);

    // 4. Cozy Rounded Shrubs / Mini Bushes filling empty meadow edges (1 draw call!)
    const bushes = useMemo(() => {
      const list: { pos: [number, number, number]; scale: [number, number, number] }[] = [
        { pos: [-5.1, -0.78, -1.7], scale: [0.38, 0.28, 0.34] },
        { pos: [-4.8, -0.78, 0.85], scale: [0.34, 0.25, 0.32] },
        { pos: [-4.2, -0.35, -0.95], scale: [0.28, 0.22, 0.26] },
        { pos: [-2.1, -0.78, -3.95], scale: [0.36, 0.28, 0.32] },
        { pos: [0.85, -0.78, -4.1], scale: [0.38, 0.28, 0.34] },
        { pos: [2.5, -0.78, -3.8], scale: [0.34, 0.25, 0.3] },
        { pos: [4.2, -0.78, -3.3], scale: [0.38, 0.28, 0.34] },
        { pos: [5.2, -0.78, -1.4], scale: [0.36, 0.26, 0.32] },
        { pos: [5.0, -0.78, 0.45], scale: [0.34, 0.25, 0.3] },
        { pos: [4.1, -0.38, 1.85], scale: [0.28, 0.2, 0.26] },
        { pos: [-3.9, -0.78, 2.35], scale: [0.34, 0.25, 0.3] },
        { pos: [3.8, -0.78, 2.55], scale: [0.32, 0.24, 0.28] },
        { pos: [-1.48, -0.78, -4.05], scale: [0.32, 0.24, 0.3] },
        { pos: [5.5, -0.78, -2.65], scale: [0.34, 0.26, 0.32] },
        { pos: [-5.6, -0.78, -3.4], scale: [0.38, 0.28, 0.34] },
      ];

      for (let i = 0; i < 48; i++) {
        const angle = seeded(i * 29 + 3) * Math.PI * 2;
        const radius = 4.6 + seeded(i * 29 + 4) * 7.8;
        const x = Math.cos(angle) * radius * 1.15;
        const z = Math.sin(angle) * radius * 0.85;
        if (Math.abs(x) < 4.5 && z > -3.5 && z < 3.0) continue;
        if (Math.abs(x) < 3.5 && z > 2.4) continue;
        if (isWaterAt(x, z)) continue;
        if (Math.hypot(x - 4.55, z - -2.55) < 1.65) continue;
        if (Math.hypot(x - -0.36, z - -4.55) < 1.85) continue;
        const s = 0.2 + seeded(i * 29 + 5) * 0.2;
        list.push({ pos: [x, -0.82, z], scale: [s * 1.15, s * 0.82, s] });
      }
      return list;
    }, []);

    // 5. Rustic Wooden Garden Fence along left pasture & cottage garden (2 draw calls!)
    const fenceSegments = useMemo(() => {
      const pts: [number, number, number][] = [
        // Left meadow fence arc
        [-5.2, 1.5, 1.35],
        [-5.05, 0.8, 1.48],
        [-4.95, 0.1, 1.55],
        [-4.85, -0.6, 1.65],
        [-4.65, -1.3, 1.8],
        // Back cottage garden fence
        [3.4, -2.95, 0.12],
        [4.1, -3.05, 0.08],
        [4.8, -3.1, 0.0],
        [5.5, -2.95, -0.35],
      ];
      return pts.map(([x, z, rotY]) => ({ x, z, rotY }));
    }, []);

    // 6. Lush Grass Blades across the whole valley & knolls (120 blades -> 1 draw call!)
    const grassBlades = useMemo(() => {
      const clusterCenters: [number, number, number][] = [
        [-1.85, 0.55, BASE_GROUND_Y], [-2.25, 0.95, BASE_GROUND_Y], [-1.35, -1.15, BASE_GROUND_Y],
        [-1.12, 1.58, BASE_GROUND_Y], [1.18, 1.52, BASE_GROUND_Y], [1.78, 0.32, BASE_GROUND_Y],
        [2.25, 0.22, BASE_GROUND_Y], [3.55, -0.75, BASE_GROUND_Y], [3.85, -1.62, BASE_GROUND_Y],
        [-0.48, -1.68, BASE_GROUND_Y], [-2.45, -2.15, BASE_GROUND_Y], [0.78, -1.15, BASE_GROUND_Y],
        [-3.45, 1.45, BASE_GROUND_Y], [2.45, 1.75, BASE_GROUND_Y], [-4.15, 0.95, BASE_GROUND_Y],
        [4.65, 0.15, BASE_GROUND_Y], [-2.05, 2.05, BASE_GROUND_Y], [0.45, 1.95, BASE_GROUND_Y],
        [-3.15, -2.35, BASE_GROUND_Y], [3.25, -2.45, BASE_GROUND_Y], [-4.55, -2.2, BASE_GROUND_Y],
        [1.55, -2.85, BASE_GROUND_Y], [-0.95, -3.25, BASE_GROUND_Y], [4.95, -1.15, BASE_GROUND_Y],
        [-4.85, -0.35, BASE_GROUND_Y], [1.95, 1.95, BASE_GROUND_Y], [-0.35, 2.15, BASE_GROUND_Y],
        [0.85, 0.65, BASE_GROUND_Y], [-0.95, -0.55, BASE_GROUND_Y], [-2.85, 1.95, BASE_GROUND_Y],
        [3.1, 2.2, BASE_GROUND_Y], [-4.35, 1.85, BASE_GROUND_Y], [4.55, 1.75, BASE_GROUND_Y],
        // Grass on elevated knolls too!
        [-2.75, -0.15, BASE_GROUND_Y + 0.46], [-3.75, -0.25, BASE_GROUND_Y + 0.46],
        [-3.05, -1.25, BASE_GROUND_Y + 0.46], [2.95, 0.45, BASE_GROUND_Y + 0.42],
        [3.85, 0.25, BASE_GROUND_Y + 0.42], [3.25, 1.35, BASE_GROUND_Y + 0.42],
        [-1.45, -2.55, BASE_GROUND_Y + 0.34],
      ];

      const blades: {
        x: number;
        y: number;
        z: number;
        h: number;
        tiltZ: number;
        tiltX: number;
        rotY: number;
        phase: number;
      }[] = [];

      clusterCenters.forEach(([cx, cz, cy], ci) => {
        for (let b = 0; b < 3; b++) {
          const idx = ci * 3 + b;
          const angle = (b / 3) * Math.PI * 2 + seeded(idx * 7 + 1) * 0.8;
          const dist = 0.025 + seeded(idx * 7 + 2) * 0.055;
          blades.push({
            x: cx + Math.cos(angle) * dist,
            y: cy,
            z: cz + Math.sin(angle) * dist,
            h: 0.12 + seeded(idx * 7 + 3) * 0.085,
            tiltZ: (b - 1) * 0.24 + (seeded(idx * 7 + 4) - 0.5) * 0.12,
            tiltX: (seeded(idx * 7 + 5) - 0.5) * 0.18,
            rotY: seeded(idx * 7 + 6) * Math.PI,
            phase: seeded(ci * 13 + 3) * Math.PI * 2,
          });
        }
      });
      return blades;
    }, []);

    // 6b. Dense Static Small Outer Grass Tufts Filling All Empty Surroundings (ZERO per-frame CPU cost!)
    const outerGrassBlades = useMemo(() => {
      const blades: {
        x: number;
        y: number;
        z: number;
        h: number;
        tiltZ: number;
        tiltX: number;
        rotY: number;
      }[] = [];

      for (let ci = 0; ci < 130; ci++) {
        const angle = seeded(ci * 31 + 1) * Math.PI * 2;
        const radius = 2.6 + seeded(ci * 31 + 2) * 9.8;
        const cx = Math.cos(angle) * radius * 1.15;
        const cz = Math.sin(angle) * radius * 0.85;
        if (isWaterAt(cx, cz)) continue;
        if (Math.hypot(cx - 4.55, cz - -2.55) < 1.45) continue;
        if (Math.hypot(cx - -0.36, cz - -4.55) < 1.65) continue;
        // Skip directly on top of elevated terraces (inner grass covers terraces)
        let onPlatform = false;
        for (let p = 0; p < MAP_PLATFORMS.length; p++) {
          const pl = MAP_PLATFORMS[p];
          if (Math.hypot(cx - pl.x, cz - pl.z) < pl.radius * 1.15) {
            onPlatform = true;
            break;
          }
        }
        if (onPlatform) continue;

        for (let b = 0; b < 3; b++) {
          const idx = ci * 3 + b;
          const bAngle = (b / 3) * Math.PI * 2 + seeded(idx * 13 + 1) * 0.8;
          const dist = 0.02 + seeded(idx * 13 + 2) * 0.05;
          blades.push({
            x: cx + Math.cos(bAngle) * dist,
            y: BASE_GROUND_Y,
            z: cz + Math.sin(bAngle) * dist,
            h: 0.1 + seeded(idx * 13 + 3) * 0.075,
            tiltZ: (b - 1) * 0.24 + (seeded(idx * 13 + 4) - 0.5) * 0.12,
            tiltX: (seeded(idx * 13 + 5) - 0.5) * 0.18,
            rotY: seeded(idx * 13 + 6) * Math.PI,
          });
        }
      }
      return blades;
    }, []);

    // 7. Tall Swaying Reeds along Pond & Stream Banks (18 blades -> 1 draw call!)
    const reeds = useMemo(() => {
      const spots: [number, number][] = [
        [1.38, -1.25], [1.45, -1.32], [1.5, -1.18],
        [3.42, -1.45], [3.5, -1.36], [3.35, -1.52],
        [3.25, -0.58], [3.32, -0.52],
        [-1.55, -2.55], [-1.45, -2.62], [-1.62, -2.48],
        [-2.85, -3.18], [-2.75, -3.26],
        [0.65, -2.48], [0.74, -2.55], [0.58, -2.42],
        [-3.95, -3.75], [-3.85, -3.82],
      ];
      return spots.map(([x, z], i) => ({
        x,
        z,
        h: 0.34 + seeded(i * 17 + 1) * 0.18,
        tilt: (seeded(i * 17 + 2) - 0.5) * 0.25,
        phase: seeded(i * 17 + 3) * Math.PI * 2,
      }));
    }, []);

    // 8. Rocks, Scenic Boulders & River Pebbles (20 instances -> 1 draw call!)
    const rocks = useMemo(
      () => [
        // Pebbles around pond
        { pos: [1.38, -0.9, -0.82] as [number, number, number], scale: [0.16, 0.08, 0.13] as [number, number, number], rotY: 0.4, shade: 0 },
        { pos: [1.56, -0.9, -0.62] as [number, number, number], scale: [0.11, 0.06, 0.1] as [number, number, number], rotY: 1.2, shade: 1 },
        { pos: [2.95, -0.9, -0.45] as [number, number, number], scale: [0.18, 0.09, 0.14] as [number, number, number], rotY: -0.5, shade: 0 },
        { pos: [3.22, -0.9, -0.64] as [number, number, number], scale: [0.12, 0.065, 0.11] as [number, number, number], rotY: 0.8, shade: 2 },
        { pos: [3.55, -0.9, -1.3] as [number, number, number], scale: [0.16, 0.08, 0.13] as [number, number, number], rotY: 2.1, shade: 1 },
        { pos: [-0.95, -0.9, -2.0] as [number, number, number], scale: [0.15, 0.075, 0.12] as [number, number, number], rotY: 0.6, shade: 0 },
        { pos: [0.45, -0.9, -1.58] as [number, number, number], scale: [0.13, 0.065, 0.1] as [number, number, number], rotY: -1.1, shade: 2 },
        // Larger scenic boulders near knolls & valley rim (kept clear of Shop & Mine Cave entrances)
        { pos: [-4.65, -0.84, -1.75] as [number, number, number], scale: [0.38, 0.24, 0.3] as [number, number, number], rotY: 0.3, shade: 2 },
        { pos: [-4.32, -0.87, -1.52] as [number, number, number], scale: [0.2, 0.13, 0.18] as [number, number, number], rotY: 1.4, shade: 1 },
        { pos: [-2.65, -0.89, 1.75] as [number, number, number], scale: [0.24, 0.12, 0.19] as [number, number, number], rotY: 0.2, shade: 1 },
        { pos: [2.25, -0.89, 1.95] as [number, number, number], scale: [0.22, 0.11, 0.17] as [number, number, number], rotY: -0.6, shade: 0 },
        { pos: [1.15, -0.88, -3.25] as [number, number, number], scale: [0.32, 0.19, 0.26] as [number, number, number], rotY: 2.3, shade: 2 },
        { pos: [-3.45, -0.88, 2.25] as [number, number, number], scale: [0.3, 0.16, 0.24] as [number, number, number], rotY: 0.8, shade: 1 },
        { pos: [5.15, -0.86, 1.55] as [number, number, number], scale: [0.34, 0.2, 0.26] as [number, number, number], rotY: -0.4, shade: 0 },
        { pos: [-1.8, -0.88, 0.35] as [number, number, number], scale: [0.2, 0.1, 0.16] as [number, number, number], rotY: 1.1, shade: 2 },
        { pos: [2.05, -0.88, 0.85] as [number, number, number], scale: [0.2, 0.1, 0.15] as [number, number, number], rotY: -0.9, shade: 1 },
        { pos: [-2.1, -0.88, -1.6] as [number, number, number], scale: [0.22, 0.12, 0.18] as [number, number, number], rotY: 0.5, shade: 0 },
      ],
      []
    );

    // 9. Cozy Stepping Stones Path connecting center, west hill, east hill & wooden bridge (10 stones -> 1 draw call!)
    const steppingStones = useMemo(
      () => [
        { pos: [-0.85, -0.908, 1.48] as [number, number, number], scale: [0.26, 0.03, 0.18] as [number, number, number], rotY: 0.2 },
        { pos: [-0.55, -0.908, 1.02] as [number, number, number], scale: [0.22, 0.03, 0.16] as [number, number, number], rotY: -0.15 },
        { pos: [-0.36, -0.908, -1.16] as [number, number, number], scale: [0.24, 0.03, 0.17] as [number, number, number], rotY: 0.05 },
        { pos: [-0.36, -0.908, -1.56] as [number, number, number], scale: [0.26, 0.03, 0.18] as [number, number, number], rotY: -0.05 },
        { pos: [-0.36, -0.908, -3.1] as [number, number, number], scale: [0.24, 0.03, 0.17] as [number, number, number], rotY: 0.05 },
        // Branch toward West Picnic Knoll
        { pos: [-1.15, -0.908, -0.35] as [number, number, number], scale: [0.22, 0.03, 0.16] as [number, number, number], rotY: 0.4 },
        { pos: [-1.58, -0.908, -0.48] as [number, number, number], scale: [0.24, 0.03, 0.17] as [number, number, number], rotY: 0.2 },
        // Branch toward East Knoll
        { pos: [1.25, -0.908, 0.42] as [number, number, number], scale: [0.22, 0.03, 0.16] as [number, number, number], rotY: -0.3 },
        { pos: [1.72, -0.908, 0.58] as [number, number, number], scale: [0.24, 0.03, 0.17] as [number, number, number], rotY: -0.15 },
      ],
      []
    );

    // 10. Cute Forest Toadstool Mushrooms tucked near rocks, stumps & knolls (10 instances -> 2 draw calls!)
    const mushrooms = useMemo(
      () => [
        { pos: [-4.15, -0.91, -1.4] as [number, number, number], scale: 1.0, capColor: "#EF4444" },
        { pos: [-3.98, -0.91, -1.28] as [number, number, number], scale: 0.68, capColor: "#F97316" },
        { pos: [3.65, -0.91, -2.18] as [number, number, number], scale: 0.95, capColor: "#EF4444" },
        { pos: [3.82, -0.91, -2.08] as [number, number, number], scale: 0.65, capColor: "#FB923C" },
        { pos: [-2.45, -0.91, 1.55] as [number, number, number], scale: 0.78, capColor: "#EF4444" },
        { pos: [2.05, -0.91, 1.78] as [number, number, number], scale: 0.75, capColor: "#F59E0B" },
        { pos: [-1.18, -0.91, -1.92] as [number, number, number], scale: 0.8, capColor: "#EF4444" },
        { pos: [-3.65, -0.46, -1.05] as [number, number, number], scale: 0.72, capColor: "#EF4444" },
        { pos: [3.95, -0.5, 1.1] as [number, number, number], scale: 0.76, capColor: "#F97316" },
        { pos: [-1.85, -0.91, 1.52] as [number, number, number], scale: 0.68, capColor: "#EF4444" },
      ],
      []
    );

    // 11. Water shimmers (8 glints -> 1 draw call!)
    const waterShimmers = useMemo(
      () => [
        { pos: [-3.4, -0.903, -3.65] as [number, number, number], width: 0.34, phase: 0.1 },
        { pos: [-2.4, -0.903, -3.05] as [number, number, number], width: 0.32, phase: 0.9 },
        { pos: [-1.25, -0.903, -2.6] as [number, number, number], width: 0.28, phase: 1.7 },
        { pos: [0.42, -0.903, -2.1] as [number, number, number], width: 0.32, phase: 2.5 },
        { pos: [1.45, -0.903, -1.62] as [number, number, number], width: 0.28, phase: 3.3 },
        { pos: [2.15, -0.902, -0.9] as [number, number, number], width: 0.36, phase: 4.1 },
        { pos: [2.75, -0.902, -1.25] as [number, number, number], width: 0.28, phase: 4.9 },
        { pos: [2.45, -0.902, -0.68] as [number, number, number], width: 0.24, phase: 5.5 },
      ],
      []
    );

    // Populate static InstancedMesh transforms & per-instance colors on mount/theme change
    useEffect(() => {
      // Round trees
      if (roundTreeTrunksInstRef.current && roundTreeCrownsInstRef.current) {
        roundTrees.forEach((tr, i) => {
          _dummy.position.set(tr.pos[0], tr.pos[1] + 0.24 * tr.scale, tr.pos[2]);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(tr.scale, tr.scale, tr.scale);
          _dummy.updateMatrix();
          roundTreeTrunksInstRef.current!.setMatrixAt(i, _dummy.matrix);

          _dummy.position.set(tr.pos[0], tr.pos[1] + 0.68 * tr.scale, tr.pos[2]);
          _dummy.scale.set(tr.scale * 1.08, tr.scale * 0.96, tr.scale * 1.08);
          _dummy.updateMatrix();
          roundTreeCrownsInstRef.current!.setMatrixAt(i, _dummy.matrix);
        });
        roundTreeTrunksInstRef.current.instanceMatrix.needsUpdate = true;
        roundTreeCrownsInstRef.current.instanceMatrix.needsUpdate = true;
      }

      // Pine trees
      if (pineTrunksInstRef.current && pineLowerInstRef.current && pineUpperInstRef.current) {
        pineTrees.forEach((tr, i) => {
          _dummy.position.set(tr.pos[0], tr.pos[1] + 0.22 * tr.scale, tr.pos[2]);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(tr.scale, tr.scale, tr.scale);
          _dummy.updateMatrix();
          pineTrunksInstRef.current!.setMatrixAt(i, _dummy.matrix);

          _dummy.position.set(tr.pos[0], tr.pos[1] + 0.62 * tr.scale, tr.pos[2]);
          _dummy.updateMatrix();
          pineLowerInstRef.current!.setMatrixAt(i, _dummy.matrix);

          _dummy.position.set(tr.pos[0], tr.pos[1] + 1.02 * tr.scale, tr.pos[2]);
          _dummy.updateMatrix();
          pineUpperInstRef.current!.setMatrixAt(i, _dummy.matrix);
        });
        pineTrunksInstRef.current.instanceMatrix.needsUpdate = true;
        pineLowerInstRef.current.instanceMatrix.needsUpdate = true;
        pineUpperInstRef.current.instanceMatrix.needsUpdate = true;
      }

      // Bushes
      if (bushesInstRef.current) {
        bushes.forEach((b, i) => {
          _dummy.position.set(b.pos[0], b.pos[1], b.pos[2]);
          _dummy.rotation.set(0, i * 0.7, 0);
          _dummy.scale.set(b.scale[0], b.scale[1], b.scale[2]);
          _dummy.updateMatrix();
          bushesInstRef.current!.setMatrixAt(i, _dummy.matrix);
        });
        bushesInstRef.current.instanceMatrix.needsUpdate = true;
      }

      // Rustic Fence
      if (fencePostsInstRef.current && fenceRailsInstRef.current) {
        fenceSegments.forEach((seg, i) => {
          _dummy.position.set(seg.x, BASE_GROUND_Y + 0.17, seg.z);
          _dummy.rotation.set(0, seg.rotY, 0);
          _dummy.scale.set(1, 1, 1);
          _dummy.updateMatrix();
          fencePostsInstRef.current!.setMatrixAt(i, _dummy.matrix);

          _dummy.position.set(seg.x, BASE_GROUND_Y + 0.24, seg.z);
          _dummy.rotation.set(0, seg.rotY, 0);
          _dummy.scale.set(1, 1, 1);
          _dummy.updateMatrix();
          fenceRailsInstRef.current!.setMatrixAt(i, _dummy.matrix);
        });
        fencePostsInstRef.current.instanceMatrix.needsUpdate = true;
        fenceRailsInstRef.current.instanceMatrix.needsUpdate = true;
      }

      // Rocks & pebbles
      if (rocksInstRef.current) {
        const shades = theme.isNight
          ? ["#475569", "#334155", "#64748B"]
          : ["#A8A29E", "#D6D3D1", "#78716C"];
        rocks.forEach((rk, i) => {
          _dummy.position.set(rk.pos[0], rk.pos[1], rk.pos[2]);
          _dummy.rotation.set(0, rk.rotY, 0);
          _dummy.scale.set(rk.scale[0], rk.scale[1], rk.scale[2]);
          _dummy.updateMatrix();
          rocksInstRef.current!.setMatrixAt(i, _dummy.matrix);
          _color.set(shades[rk.shade]);
          rocksInstRef.current!.setColorAt(i, _color);
        });
        rocksInstRef.current.instanceMatrix.needsUpdate = true;
        if (rocksInstRef.current.instanceColor) {
          rocksInstRef.current.instanceColor.needsUpdate = true;
        }
      }

      // Stepping stones
      if (steppingStonesInstRef.current) {
        steppingStones.forEach((st, i) => {
          _dummy.position.set(st.pos[0], st.pos[1], st.pos[2]);
          _dummy.rotation.set(0, st.rotY, 0);
          _dummy.scale.set(st.scale[0], st.scale[1], st.scale[2]);
          _dummy.updateMatrix();
          steppingStonesInstRef.current!.setMatrixAt(i, _dummy.matrix);
        });
        steppingStonesInstRef.current.instanceMatrix.needsUpdate = true;
      }

      // Static outer small grass blades (populated once -> 0ms CPU per frame!)
      if (outerGrassInstRef.current) {
        outerGrassBlades.forEach((g, i) => {
          _dummy.position.set(g.x, g.y + g.h * 0.48, g.z);
          _dummy.rotation.set(g.tiltX, g.rotY, g.tiltZ);
          _dummy.scale.set(1, g.h / 0.18, 1);
          _dummy.updateMatrix();
          outerGrassInstRef.current!.setMatrixAt(i, _dummy.matrix);
        });
        outerGrassInstRef.current.instanceMatrix.needsUpdate = true;
      }

      // Mushrooms
      if (mushroomStemsInstRef.current && mushroomCapsInstRef.current) {
        mushrooms.forEach((m, i) => {
          _dummy.position.set(m.pos[0], m.pos[1] + 0.045 * m.scale, m.pos[2]);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(m.scale, m.scale, m.scale);
          _dummy.updateMatrix();
          mushroomStemsInstRef.current!.setMatrixAt(i, _dummy.matrix);

          _dummy.position.set(m.pos[0], m.pos[1] + 0.09 * m.scale, m.pos[2]);
          _dummy.scale.set(m.scale * 1.15, m.scale * 0.72, m.scale * 1.15);
          _dummy.updateMatrix();
          mushroomCapsInstRef.current!.setMatrixAt(i, _dummy.matrix);
          _color.set(m.capColor);
          mushroomCapsInstRef.current!.setColorAt(i, _color);
        });
        mushroomStemsInstRef.current.instanceMatrix.needsUpdate = true;
        mushroomCapsInstRef.current.instanceMatrix.needsUpdate = true;
        if (mushroomCapsInstRef.current.instanceColor) {
          mushroomCapsInstRef.current.instanceColor.needsUpdate = true;
        }
      }
    }, [theme.isNight, roundTrees, pineTrees, bushes, fenceSegments, rocks, steppingStones, outerGrassBlades, mushrooms]);

    // Lightweight per-frame animations (using scratch _dummy — zero allocations!)
    useFrame((state) => {
      const t = state.clock.getElapsedTime();

      if (cloudsGroupRef.current) {
        cloudsGroupRef.current.position.x = Math.sin(t * 0.07) * 0.65;
      }

      // Twinkling stars at night
      if (starsInstRef.current && theme.isNight) {
        for (let i = 0; i < stars.length; i++) {
          const st = stars[i];
          const s = st.size * (0.65 + Math.sin(t * 3.0 + st.phase) * 0.35);
          _dummy.position.set(st.pos[0], st.pos[1], st.pos[2]);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(s, s, s);
          _dummy.updateMatrix();
          starsInstRef.current.setMatrixAt(i, _dummy.matrix);
        }
        starsInstRef.current.instanceMatrix.needsUpdate = true;
      }

      // Daytime butterflies
      if (butterfliesGroupRef.current && !theme.isNight) {
        butterfliesGroupRef.current.children.forEach((child, i) => {
          const b = butterflies[i];
          if (!b) return;
          const angle = t * b.speed + b.phase;
          child.position.set(
            b.base[0] + Math.cos(angle) * b.radius,
            b.base[1] + Math.sin(angle * 2.3) * 0.14,
            b.base[2] + Math.sin(angle) * (b.radius * 0.7)
          );
          child.rotation.y = -angle;
          const wingFlap = Math.abs(Math.sin(t * 14 + b.phase)) * 0.7 + 0.3;
          child.scale.set(wingFlap, 1, 1);
        });
      }

      // Swaying grass blades across valley & knolls (1 draw call!)
      if (grassInstRef.current) {
        for (let i = 0; i < grassBlades.length; i++) {
          const g = grassBlades[i];
          const sway = Math.sin(t * 1.9 + g.phase) * 0.075;
          _dummy.position.set(g.x, g.y + g.h * 0.48, g.z);
          _dummy.rotation.set(g.tiltX, g.rotY, g.tiltZ + sway);
          _dummy.scale.set(1, g.h / 0.18, 1);
          _dummy.updateMatrix();
          grassInstRef.current.setMatrixAt(i, _dummy.matrix);
        }
        grassInstRef.current.instanceMatrix.needsUpdate = true;
      }

      // Swaying tall pond reeds
      if (reedsInstRef.current) {
        for (let i = 0; i < reeds.length; i++) {
          const r = reeds[i];
          const sway = Math.sin(t * 1.5 + r.phase) * 0.09;
          _dummy.position.set(r.x, BASE_GROUND_Y + r.h * 0.48, r.z);
          _dummy.rotation.set(0.05, 0, r.tilt + sway);
          _dummy.scale.set(1, r.h / 0.4, 1);
          _dummy.updateMatrix();
          reedsInstRef.current.setMatrixAt(i, _dummy.matrix);
        }
        reedsInstRef.current.instanceMatrix.needsUpdate = true;
      }

      // Pond ripples
      if (ripple1Ref.current) {
        const p1 = (t * 0.32) % 1;
        const s1 = 0.25 + p1 * 0.95;
        ripple1Ref.current.scale.set(s1, s1, 1);
        (ripple1Ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - p1) * 0.42;
      }
      if (ripple2Ref.current) {
        const p2 = (t * 0.32 + 0.5) % 1;
        const s2 = 0.25 + p2 * 0.85;
        ripple2Ref.current.scale.set(s2, s2, 1);
        (ripple2Ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - p2) * 0.36;
      }

      // Water shimmer glints
      if (shimmerInstRef.current) {
        for (let i = 0; i < waterShimmers.length; i++) {
          const sh = waterShimmers[i];
          const drift = Math.sin(t * 1.3 + sh.phase) * 0.09;
          const pulse = 0.65 + Math.sin(t * 2.5 + sh.phase) * 0.35;
          _dummy.position.set(sh.pos[0] + drift, sh.pos[1], sh.pos[2]);
          _dummy.rotation.set(-Math.PI / 2, 0, -0.25);
          _dummy.scale.set(sh.width * pulse, 0.045, 1);
          _dummy.updateMatrix();
          shimmerInstRef.current.setMatrixAt(i, _dummy.matrix);
        }
        shimmerInstRef.current.instanceMatrix.needsUpdate = true;
      }
    });

    const isLanternLit = theme.isNight || theme.phase === "sunset";
    const woodColor = theme.isNight ? "#451A03" : "#92400E";
    const woodDarkColor = theme.isNight ? "#2D1002" : "#78350F";
    const cliffSoilColor = theme.isNight ? "#3B2618" : "#8D6E63";

    return (
      <group>
        {/* 1. Dynamic Sun or Crescent Moon */}
        <group position={theme.celestialPos}>
          <mesh>
            <sphereGeometry args={[theme.isNight ? 0.46 : 0.6, 20, 20]} />
            <meshBasicMaterial color={theme.celestialColor} />
          </mesh>
          <mesh>
            <sphereGeometry args={[theme.isNight ? 0.72 : 0.92, 16, 16]} />
            <meshBasicMaterial
              color={theme.celestialColor}
              transparent
              opacity={theme.isNight ? 0.22 : 0.3}
            />
          </mesh>
          {theme.isNight && (
            <mesh position={[0.18, 0.08, 0.14]}>
              <sphereGeometry args={[0.4, 16, 16]} />
              <meshBasicMaterial color="#0D1736" />
            </mesh>
          )}
        </group>

        {/* 2. Twinkling Night Sky Stars */}
        {theme.isNight && (
          <instancedMesh ref={starsInstRef} args={[undefined, undefined, stars.length]} frustumCulled={false}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshBasicMaterial color="#FFFFFF" />
          </instancedMesh>
        )}

        {/* 3. Layered Distant Mountains & Rolling Green Horizon Hills */}
        <mesh position={[-3.8, -1.4, -10.5]} scale={[3.8, 2.4, 0.7]}>
          <coneGeometry args={[1.6, 2.2, 5]} />
          <meshBasicMaterial color={theme.hillFarColor} transparent opacity={0.55} />
        </mesh>
        <mesh position={[3.8, -1.35, -10.8]} scale={[4.2, 2.6, 0.7]}>
          <coneGeometry args={[1.6, 2.2, 5]} />
          <meshBasicMaterial color={theme.hillFarColor} transparent opacity={0.5} />
        </mesh>
        <mesh position={[0.2, -1.85, -8.5]} scale={[10.2, 1.85, 0.8]}>
          <sphereGeometry args={[1.6, 28, 12]} />
          <meshBasicMaterial color={theme.hillFarColor} />
        </mesh>
        <mesh position={[-5.6, -1.85, -6.8]} scale={[5.2, 1.4, 0.8]}>
          <sphereGeometry args={[1.5, 24, 12]} />
          <meshBasicMaterial color={theme.hillNearColor} />
        </mesh>
        <mesh position={[5.6, -1.85, -6.6]} scale={[5.4, 1.38, 0.8]}>
          <sphereGeometry args={[1.5, 24, 12]} />
          <meshBasicMaterial color={theme.hillNearColor} />
        </mesh>

        {/* 4. Instanced Forest Belt: 14 Round Trees + 12 Pine Trees + 16 Shrubs */}
        <instancedMesh ref={roundTreeTrunksInstRef} args={[undefined, undefined, roundTrees.length]}>
          <cylinderGeometry args={[0.065, 0.095, 0.48, 7]} />
          <meshLambertMaterial color={woodDarkColor} />
        </instancedMesh>
        <instancedMesh ref={roundTreeCrownsInstRef} args={[undefined, undefined, roundTrees.length]}>
          <sphereGeometry args={[0.4, 12, 10]} />
          <meshLambertMaterial color={theme.hillNearColor} />
        </instancedMesh>

        <instancedMesh ref={pineTrunksInstRef} args={[undefined, undefined, pineTrees.length]}>
          <cylinderGeometry args={[0.055, 0.085, 0.44, 6]} />
          <meshLambertMaterial color={woodDarkColor} />
        </instancedMesh>
        <instancedMesh ref={pineLowerInstRef} args={[undefined, undefined, pineTrees.length]}>
          <coneGeometry args={[0.44, 0.68, 7]} />
          <meshLambertMaterial color={theme.groundRimColor} />
        </instancedMesh>
        <instancedMesh ref={pineUpperInstRef} args={[undefined, undefined, pineTrees.length]}>
          <coneGeometry args={[0.32, 0.58, 7]} />
          <meshLambertMaterial color={theme.hillNearColor} />
        </instancedMesh>

        <instancedMesh ref={bushesInstRef} args={[undefined, undefined, bushes.length]}>
          <sphereGeometry args={[1, 9, 8]} />
          <meshLambertMaterial color={theme.grassTuftColor} />
        </instancedMesh>

        {/* 5. Rustic Wooden Garden Fences (2 Draw Calls) */}
        <instancedMesh ref={fencePostsInstRef} args={[undefined, undefined, fenceSegments.length]}>
          <boxGeometry args={[0.07, 0.34, 0.07]} />
          <meshLambertMaterial color={woodDarkColor} />
        </instancedMesh>
        <instancedMesh ref={fenceRailsInstRef} args={[undefined, undefined, fenceSegments.length]}>
          <boxGeometry args={[0.76, 0.05, 0.04]} />
          <meshLambertMaterial color={woodColor} />
        </instancedMesh>

        {/* 6. Drifting Fluffy Clouds */}
        <group ref={cloudsGroupRef} position={[0, 1.9, -6.2]}>
          <group position={[-3.8, 0.35, 0]}>
            <mesh><sphereGeometry args={[0.54, 12, 10]} /><meshBasicMaterial color={theme.cloudColor} transparent opacity={theme.cloudOpacity} /></mesh>
            <mesh position={[0.44, -0.08, 0]}><sphereGeometry args={[0.4, 10, 8]} /><meshBasicMaterial color={theme.cloudColor} transparent opacity={theme.cloudOpacity} /></mesh>
            <mesh position={[-0.44, -0.1, 0]}><sphereGeometry args={[0.36, 10, 8]} /><meshBasicMaterial color={theme.cloudColor} transparent opacity={theme.cloudOpacity} /></mesh>
          </group>
          <group position={[3.8, 0.68, -0.4]}>
            <mesh><sphereGeometry args={[0.58, 12, 10]} /><meshBasicMaterial color={theme.cloudColor} transparent opacity={theme.cloudOpacity} /></mesh>
            <mesh position={[0.5, -0.1, 0]}><sphereGeometry args={[0.44, 10, 8]} /><meshBasicMaterial color={theme.cloudColor} transparent opacity={theme.cloudOpacity} /></mesh>
            <mesh position={[-0.48, -0.1, 0]}><sphereGeometry args={[0.4, 10, 8]} /><meshBasicMaterial color={theme.cloudColor} transparent opacity={theme.cloudOpacity} /></mesh>
          </group>
          <group position={[0.15, 1.15, -1.2]} scale={0.76}>
            <mesh><sphereGeometry args={[0.48, 10, 8]} /><meshBasicMaterial color={theme.cloudColor} transparent opacity={theme.cloudOpacity * 0.85} /></mesh>
            <mesh position={[0.38, -0.06, 0]}><sphereGeometry args={[0.34, 10, 8]} /><meshBasicMaterial color={theme.cloudColor} transparent opacity={theme.cloudOpacity * 0.85} /></mesh>
          </group>
        </group>

        {/* 7. Lush Grassy Valley Meadow Floor (Clickable to guide Juro!) */}
        <mesh
          position={[0, BASE_GROUND_Y, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerDown={handleGroundPointerDown}
          onClick={handleGroundClick}
        >
          <circleGeometry args={[24, 48]} />
          <meshLambertMaterial color={theme.groundColor} />
        </mesh>
        <mesh position={[0, BASE_GROUND_Y + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[4.4, 40]} />
          <meshBasicMaterial color={theme.groundRimColor} opacity={0.22} transparent />
        </mesh>

        {/* 8. Jumpable Elevated Platforms, Grassy Knolls, Rock Ledge & Tree Stumps (Synced to MAP_PLATFORMS!) */}
        <group onPointerDown={handleGroundPointerDown} onClick={handleGroundClick}>
          {MAP_PLATFORMS.map((p) => {
            if (p.kind === "terrace") {
              return (
                <group key={p.id} position={[p.x, BASE_GROUND_Y, p.z]}>
                  {/* Earthy Cliff Side Base */}
                  <mesh position={[0, p.height * 0.44, 0]}>
                    <cylinderGeometry args={[p.radius * 0.98, p.radius * 1.12, p.height * 0.88, 22]} />
                    <meshLambertMaterial color={cliffSoilColor} />
                  </mesh>
                  {/* Lush Grassy Top Cap */}
                  <mesh position={[0, p.height - 0.045, 0]}>
                    <cylinderGeometry args={[p.radius * 1.0, p.radius * 1.03, 0.09, 22]} />
                    <meshLambertMaterial color={theme.groundColor} />
                  </mesh>
                  {/* Soft Highlight Meadow Ring on Top */}
                  <mesh position={[0, p.height + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[p.radius * 0.82, 20]} />
                    <meshBasicMaterial color={theme.groundRimColor} transparent opacity={0.28} />
                  </mesh>
                </group>
              );
            }

            if (p.kind === "rock-ledge") {
              return (
                <group key={p.id} position={[p.x, BASE_GROUND_Y, p.z]}>
                  <mesh position={[0, p.height * 0.48, 0]}>
                    <cylinderGeometry args={[p.radius * 0.94, p.radius * 1.1, p.height * 0.96, 9]} />
                    <meshLambertMaterial color={theme.isNight ? "#475569" : "#9CA3AF"} />
                  </mesh>
                  <mesh position={[0, p.height - 0.02, 0]}>
                    <cylinderGeometry args={[p.radius * 0.9, p.radius * 0.94, 0.045, 9]} />
                    <meshLambertMaterial color={theme.groundRimColor} />
                  </mesh>
                </group>
              );
            }

            // Tree stump Juro can hop right on top of!
            return (
              <group key={p.id} position={[p.x, BASE_GROUND_Y, p.z]}>
                <mesh position={[0, p.height * 0.5, 0]}>
                  <cylinderGeometry args={[p.radius * 0.92, p.radius * 1.08, p.height, 12]} />
                  <meshLambertMaterial color={woodDarkColor} />
                </mesh>
                <mesh position={[0, p.height + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[p.radius * 0.82, 12]} />
                  <meshLambertMaterial color={theme.isNight ? "#785334" : "#E7CBA9"} />
                </mesh>
              </group>
            );
          })}
        </group>

        {/* 9. Cozy Props atop the Knolls: Juro's Pet Sofa Bed (West) + Park Bench (East) + Mini Cottage (Back-Right) */}
        {/* West Knoll: Juro's Cozy Pet Sofa Bed & Bedside Table (Alas Tidur Sofa Pet Juro) */}
        <group
          position={[-3.25, BASE_GROUND_Y + 0.465, -0.55]}
          rotation={[0, 0.35, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onBedClick?.();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredLandmark("bed");
          }}
          onPointerOut={() => setHoveredLandmark("none")}
        >
          {/* 1. Cozy Woven Rug under the sofa */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
            <planeGeometry args={[1.35, 1.05]} />
            <meshLambertMaterial color={theme.isNight ? "#1E293B" : "#FEF3C7"} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
            <planeGeometry args={[1.22, 0.92]} />
            <meshLambertMaterial color={theme.isNight ? "#334155" : "#FDE68A"} />
          </mesh>

          {/* 2. Pet Sofa Bed Base (Sofa Alas Tidur Pet) */}
          {/* 4 Tiny Wooden Stubby Feet */}
          <mesh position={[-0.38, 0.02, -0.24]}>
            <cylinderGeometry args={[0.028, 0.02, 0.04, 6]} />
            <meshLambertMaterial color={woodDarkColor} />
          </mesh>
          <mesh position={[0.38, 0.02, -0.24]}>
            <cylinderGeometry args={[0.028, 0.02, 0.04, 6]} />
            <meshLambertMaterial color={woodDarkColor} />
          </mesh>
          <mesh position={[-0.38, 0.02, 0.24]}>
            <cylinderGeometry args={[0.028, 0.02, 0.04, 6]} />
            <meshLambertMaterial color={woodDarkColor} />
          </mesh>
          <mesh position={[0.38, 0.02, 0.24]}>
            <cylinderGeometry args={[0.028, 0.02, 0.04, 6]} />
            <meshLambertMaterial color={woodDarkColor} />
          </mesh>

          {/* Wooden Trim Plinth */}
          <mesh position={[0, 0.042, 0]}>
            <boxGeometry args={[0.92, 0.025, 0.68]} />
            <meshLambertMaterial color={woodDarkColor} />
          </mesh>

          {/* Sofa Upholstered Outer Base */}
          <mesh position={[0, 0.075, 0]}>
            <boxGeometry args={[0.9, 0.05, 0.66]} />
            <meshLambertMaterial color={theme.isNight ? "#312E81" : "#EA580C"} />
          </mesh>

          {/* Padded Curved Backrest (Sandaran Punggung Sofa Empuk) */}
          <mesh position={[0, 0.165, -0.24]}>
            <boxGeometry args={[0.9, 0.15, 0.14]} />
            <meshLambertMaterial color={theme.isNight ? "#3730A3" : "#F97316"} />
          </mesh>
          {/* Backrest Bolster Curve */}
          <mesh position={[0, 0.24, -0.24]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, 0.9, 12]} />
            <meshLambertMaterial color={theme.isNight ? "#4338CA" : "#FB923C"} />
          </mesh>

          {/* Left Padded Armrest (Sandaran Tangan Kiri) */}
          <mesh position={[-0.39, 0.135, 0.04]}>
            <boxGeometry args={[0.12, 0.11, 0.44]} />
            <meshLambertMaterial color={theme.isNight ? "#3730A3" : "#F97316"} />
          </mesh>
          <mesh position={[-0.39, 0.19, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.44, 10]} />
            <meshLambertMaterial color={theme.isNight ? "#4338CA" : "#FB923C"} />
          </mesh>

          {/* Right Padded Armrest (Sandaran Tangan Kanan) */}
          <mesh position={[0.39, 0.135, 0.04]}>
            <boxGeometry args={[0.12, 0.11, 0.44]} />
            <meshLambertMaterial color={theme.isNight ? "#3730A3" : "#F97316"} />
          </mesh>
          <mesh position={[0.39, 0.19, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.44, 10]} />
            <meshLambertMaterial color={theme.isNight ? "#4338CA" : "#FB923C"} />
          </mesh>

          {/* 3. Super Soft Center Mattress Cushion Pad (Bantalan Tengah Super Empuk untuk Juro) */}
          <mesh position={[0, 0.09, 0.035]}>
            <boxGeometry args={[0.66, 0.075, 0.44]} />
            <meshLambertMaterial color={theme.isNight ? "#CBD5E1" : "#FFFBEB"} />
          </mesh>
          {/* Subtle Button Tuft Impressions */}
          <mesh position={[-0.14, 0.129, 0.035]}>
            <cylinderGeometry args={[0.016, 0.016, 0.005, 8]} />
            <meshLambertMaterial color={theme.isNight ? "#94A3B8" : "#FDE68A"} />
          </mesh>
          <mesh position={[0.14, 0.129, 0.035]}>
            <cylinderGeometry args={[0.016, 0.016, 0.005, 8]} />
            <meshLambertMaterial color={theme.isNight ? "#94A3B8" : "#FDE68A"} />
          </mesh>

          {/* 4. Cute Accent Throw Pillow (Bantal Sofa Bintang Pastel) */}
          <group position={[0.26, 0.155, -0.12]} rotation={[0.15, -0.28, 0.12]}>
            <mesh>
              <boxGeometry args={[0.16, 0.16, 0.05]} />
              <meshLambertMaterial color={theme.isNight ? "#FDE047" : "#FDE047"} />
            </mesh>
            <mesh position={[0, 0, 0.026]}>
              <sphereGeometry args={[0.022, 8, 8]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
          </group>

          {/* 5. Adorable Wooden Nightstand & Warm Bedside Lamp (Di Sebelah Kiri, Tetap Dipertahankan) */}
          <group position={[-0.62, 0, -0.18]}>
            {/* Nightstand Table */}
            <mesh position={[0, 0.11, 0]}>
              <boxGeometry args={[0.22, 0.22, 0.22]} />
              <meshLambertMaterial color={woodColor} />
            </mesh>
            {/* Drawer line */}
            <mesh position={[0, 0.13, 0.112]}>
              <boxGeometry args={[0.16, 0.02, 0.01]} />
              <meshLambertMaterial color={woodDarkColor} />
            </mesh>
            <mesh position={[0, 0.08, 0.115]}>
              <sphereGeometry args={[0.015, 6, 6]} />
              <meshLambertMaterial color="#FDE047" />
            </mesh>

            {/* Bedside Lamp Base */}
            <mesh position={[0, 0.235, 0]}>
              <cylinderGeometry args={[0.035, 0.045, 0.03, 8]} />
              <meshLambertMaterial color={woodDarkColor} />
            </mesh>
            {/* Lamp Stem */}
            <mesh position={[0, 0.265, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.04, 6]} />
              <meshLambertMaterial color="#E5E7EB" />
            </mesh>
            {/* Lamp Shade (Glowing Warm Amber at Night!) */}
            <mesh position={[0, 0.31, 0]}>
              <cylinderGeometry args={[0.055, 0.08, 0.075, 10]} />
              <meshStandardMaterial
                color={theme.isNight ? "#FEF08A" : "#FEF3C7"}
                emissive={theme.isNight ? "#F59E0B" : "#000000"}
                emissiveIntensity={theme.isNight ? 1.5 : 0}
              />
            </mesh>
            {/* Soft Ambient Night Glow */}
            {theme.isNight && (
              <mesh position={[0, 0.32, 0]}>
                <sphereGeometry args={[0.34, 10, 8]} />
                <meshBasicMaterial color="#FDE047" transparent opacity={0.18} depthWrite={false} />
              </mesh>
            )}
          </group>
        </group>

        {/* East Knoll Wooden Park Bench */}
        <group position={[3.65, BASE_GROUND_Y + 0.42, 0.95]} rotation={[0, -0.75, 0]}>
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[0.72, 0.05, 0.24]} />
            <meshLambertMaterial color={woodColor} />
          </mesh>
          <mesh position={[0, 0.3, -0.1]}>
            <boxGeometry args={[0.72, 0.16, 0.045]} />
            <meshLambertMaterial color={woodColor} />
          </mesh>
          <mesh position={[-0.28, 0.08, 0]}>
            <boxGeometry args={[0.06, 0.16, 0.2]} />
            <meshLambertMaterial color={woodDarkColor} />
          </mesh>
          <mesh position={[0.28, 0.08, 0]}>
            <boxGeometry args={[0.06, 0.16, 0.2]} />
            <meshLambertMaterial color={woodDarkColor} />
          </mesh>
        </group>

        {/* Interactive 3D Juro Shop Building ("TOKO") on Back-Right Hillside — Click to open /shop! */}
        <group
          position={[4.55, BASE_GROUND_Y, -2.55]}
          rotation={[0, -0.52, 0]}
          scale={hoveredLandmark === "shop" ? 1.045 : 1}
          onPointerDown={handleLandmarkPointerDown}
          onClick={handleShopClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredLandmark("shop");
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setHoveredLandmark((curr) => (curr === "shop" ? "none" : curr));
          }}
        >
          {/* Wooden Shop Foundation Step */}
          <mesh position={[0, 0.04, 0.08]}>
            <boxGeometry args={[1.4, 0.08, 1.18]} />
            <meshLambertMaterial color={woodDarkColor} />
          </mesh>
          {/* Warm Cream Shop Walls */}
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[1.28, 0.88, 0.98]} />
            <meshLambertMaterial color={theme.isNight ? "#94A3B8" : "#FFF7ED"} />
          </mesh>
          {/* Crisp Wooden Roof Trim */}
          <mesh position={[0, 0.96, 0]}>
            <boxGeometry args={[1.38, 0.08, 1.08]} />
            <meshLambertMaterial color={woodColor} />
          </mesh>
          {/* Pitched Shop Roof */}
          <mesh position={[0, 1.26, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[1.04, 0.58, 4]} />
            <meshLambertMaterial color={theme.isNight ? "#9A3412" : "#EA580C"} />
          </mesh>
          {/* Wooden Entrance Door (Left Side of Storefront) */}
          <mesh position={[-0.34, 0.34, 0.505]}>
            <boxGeometry args={[0.3, 0.54, 0.03]} />
            <meshLambertMaterial color={woodDarkColor} />
          </mesh>
          <mesh position={[-0.24, 0.34, 0.53]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshLambertMaterial color="#FACC15" />
          </mesh>
          {/* Wide Illuminated Shop Display Window (Right Side) */}
          <mesh position={[0.24, 0.44, 0.505]}>
            <boxGeometry args={[0.56, 0.34, 0.03]} />
            <meshStandardMaterial
              color={isLanternLit ? "#FEF08A" : "#E0F2FE"}
              emissive={isLanternLit ? "#F59E0B" : "#38BDF8"}
              emissiveIntensity={isLanternLit ? 1.1 : hoveredLandmark === "shop" ? 0.35 : 0.08}
            />
          </mesh>
          {/* Wooden Display Counter Shelf + Mini Shop Goods */}
          <mesh position={[0.24, 0.25, 0.58]}>
            <boxGeometry args={[0.62, 0.05, 0.16]} />
            <meshLambertMaterial color={woodColor} />
          </mesh>
          <mesh position={[0.06, 0.33, 0.58]}>
            <cylinderGeometry args={[0.045, 0.05, 0.11, 8]} />
            <meshLambertMaterial color="#F97316" />
          </mesh>
          <mesh position={[0.22, 0.32, 0.58]}>
            <boxGeometry args={[0.09, 0.09, 0.09]} />
            <meshLambertMaterial color="#10B981" />
          </mesh>
          <mesh position={[0.38, 0.33, 0.58]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshLambertMaterial color="#FACC15" />
          </mesh>
          {/* Striped Orange & Cream Shop Awning Canopy */}
          <group position={[0, 0.72, 0.63]} rotation={[0.38, 0, 0]}>
            {[-0.5, -0.25, 0, 0.25, 0.5].map((xOff, idx) => (
              <mesh key={idx} position={[xOff, 0, 0]}>
                <boxGeometry args={[0.25, 0.045, 0.36]} />
                <meshLambertMaterial color={idx % 2 === 0 ? "#F97316" : "#FFF7ED"} />
              </mesh>
            ))}
          </group>
          {/* Pixel Wooden Signboard: "TOKO" (Mounted cleanly in front of roof eaves, zero clipping!) */}
          <group position={[0, 1.07, 0.78]}>
            {/* Two wooden support brackets anchored to the roof eave */}
            <mesh position={[-0.24, -0.14, -0.04]}>
              <boxGeometry args={[0.05, 0.18, 0.05]} />
              <meshLambertMaterial color={woodDarkColor} />
            </mesh>
            <mesh position={[0.24, -0.14, -0.04]}>
              <boxGeometry args={[0.05, 0.18, 0.05]} />
              <meshLambertMaterial color={woodDarkColor} />
            </mesh>
            <mesh>
              <boxGeometry args={[0.82, 0.25, 0.05]} />
              <meshLambertMaterial color="#171717" />
            </mesh>
            {shopSignTex && (
              <mesh position={[0, 0, 0.028]}>
                <planeGeometry args={[0.78, 0.22]} />
                <meshBasicMaterial map={shopSignTex} />
              </mesh>
            )}
          </group>
        </group>

        {/* Interactive 3D Crystal Mine Cave ("TAMBANG") Straight North Across Bridge — Click to open /mine! */}
        <group
          position={[-0.36, BASE_GROUND_Y, -4.55]}
          rotation={[0, 0, 0]}
          scale={hoveredLandmark === "mine" ? 1.045 : 1}
          onPointerDown={handleLandmarkPointerDown}
          onClick={handleMineClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredLandmark("mine");
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setHoveredLandmark((curr) => (curr === "mine" ? "none" : curr));
          }}
        >
          {/* Sculpted Rocky Cave Mountain Mound (Set cleanly behind tunnel mouth so zero rocks poke inside!) */}
          <mesh position={[0, 0.62, -0.36]} scale={[1.38, 1.02, 0.78]}>
            <dodecahedronGeometry args={[0.82, 1]} />
            <meshLambertMaterial color={theme.isNight ? "#334155" : "#64748B"} />
          </mesh>
          <mesh position={[-0.78, 0.36, -0.12]} scale={[0.92, 0.8, 0.75]}>
            <dodecahedronGeometry args={[0.52, 0]} />
            <meshLambertMaterial color={theme.isNight ? "#1E293B" : "#475569"} />
          </mesh>
          <mesh position={[0.78, 0.38, -0.1]} scale={[0.92, 0.82, 0.75]}>
            <dodecahedronGeometry args={[0.54, 0]} />
            <meshLambertMaterial color={theme.isNight ? "#1E293B" : "#475569"} />
          </mesh>
          <mesh position={[0.06, 1.05, -0.38]} scale={[1.08, 0.65, 0.76]}>
            <dodecahedronGeometry args={[0.56, 0]} />
            <meshLambertMaterial color={theme.isNight ? "#334155" : "#78716C"} />
          </mesh>

          {/* Deep Dark Mine Tunnel Portal (Unobstructed!) */}
          <mesh position={[0, 0.38, 0.34]}>
            <boxGeometry args={[0.7, 0.74, 0.28]} />
            <meshBasicMaterial color="#0C0A09" />
          </mesh>

          {/* Timber Mine-Shaft Support Beams */}
          <mesh position={[-0.39, 0.4, 0.5]}>
            <boxGeometry args={[0.11, 0.8, 0.13]} />
            <meshLambertMaterial color={woodDarkColor} />
          </mesh>
          <mesh position={[0.39, 0.4, 0.5]}>
            <boxGeometry args={[0.11, 0.8, 0.13]} />
            <meshLambertMaterial color={woodDarkColor} />
          </mesh>
          <mesh position={[0, 0.8, 0.5]}>
            <boxGeometry args={[0.98, 0.12, 0.16]} />
            <meshLambertMaterial color={woodColor} />
          </mesh>

          {/* Hanging Mine Lantern */}
          <mesh position={[0.25, 0.67, 0.53]}>
            <boxGeometry args={[0.08, 0.1, 0.08]} />
            <meshStandardMaterial
              color="#FEF08A"
              emissive="#F59E0B"
              emissiveIntensity={isLanternLit || hoveredLandmark === "mine" ? 1.5 : 0.85}
            />
          </mesh>

          {/* Mini Mine-Cart Wooden Sleepers & Steel Rails Leading Out to the Bridge Path */}
          {[0.64, 0.84, 1.04].map((zOff, idx) => (
            <mesh key={idx} position={[0, 0.02, zOff]}>
              <boxGeometry args={[0.54, 0.03, 0.06]} />
              <meshLambertMaterial color={woodDarkColor} />
            </mesh>
          ))}
          <mesh position={[-0.18, 0.04, 0.84]}>
            <boxGeometry args={[0.04, 0.025, 0.66]} />
            <meshLambertMaterial color="#94A3B8" />
          </mesh>
          <mesh position={[0.18, 0.04, 0.84]}>
            <boxGeometry args={[0.04, 0.025, 0.66]} />
            <meshLambertMaterial color="#94A3B8" />
          </mesh>

          {/* Glowing Miniature Crystal Clusters Embedded on Cave Entrance */}
          {/* Sky-Blue Kuarsa Cluster (Left) */}
          <mesh position={[-0.64, 0.25, 0.42]} rotation={[0.2, 0.2, 0.35]}>
            <coneGeometry args={[0.085, 0.28, 5]} />
            <meshStandardMaterial
              color="#38BDF8"
              emissive="#0284C7"
              emissiveIntensity={hoveredLandmark === "mine" ? 1.1 : 0.55}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[-0.53, 0.18, 0.51]} rotation={[0.3, -0.2, -0.25]}>
            <coneGeometry args={[0.065, 0.2, 5]} />
            <meshStandardMaterial
              color="#7DD3FC"
              emissive="#38BDF8"
              emissiveIntensity={0.6}
              roughness={0.2}
            />
          </mesh>
          {/* Emerald & Amethyst Cluster (Right) */}
          <mesh position={[0.64, 0.26, 0.42]} rotation={[0.15, -0.3, -0.35]}>
            <coneGeometry args={[0.085, 0.28, 5]} />
            <meshStandardMaterial
              color="#10B981"
              emissive="#059669"
              emissiveIntensity={hoveredLandmark === "mine" ? 1.1 : 0.55}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0.53, 0.18, 0.51]} rotation={[0.35, 0.1, 0.2]}>
            <coneGeometry args={[0.065, 0.21, 5]} />
            <meshStandardMaterial
              color="#A855F7"
              emissive="#9333EA"
              emissiveIntensity={0.65}
              roughness={0.2}
            />
          </mesh>

          {/* Pixel Wooden Signboard: "TAMBANG" */}
          <group position={[0, 1.0, 0.55]}>
            <mesh>
              <boxGeometry args={[0.92, 0.25, 0.05]} />
              <meshLambertMaterial color="#171717" />
            </mesh>
            {mineSignTex && (
              <mesh position={[0, 0, 0.028]}>
                <planeGeometry args={[0.88, 0.22]} />
                <meshBasicMaterial map={mineSignTex} />
              </mesh>
            )}
          </group>
        </group>

        {/* 10. Winding Brook & Cozy Lily Pond */}
        <group>
          <mesh position={[0, -0.912, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <shapeGeometry args={[streamBankShape]} />
            <meshBasicMaterial color={theme.waterRimColor} transparent opacity={0.42} />
          </mesh>
          <mesh position={[0, -0.909, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <shapeGeometry args={[streamWaterShape]} />
            <meshStandardMaterial
              color={theme.waterColor}
              roughness={0.14}
              metalness={0.18}
              emissive={theme.waterColor}
              emissiveIntensity={theme.isNight ? 0.25 : 0.08}
            />
          </mesh>

          <mesh position={[2.45, -0.911, -1.05]} rotation={[-Math.PI / 2, 0, 0]}>
            <shapeGeometry args={[pondBankShape]} />
            <meshBasicMaterial color={theme.waterRimColor} transparent opacity={0.48} />
          </mesh>
          <mesh position={[2.45, -0.907, -1.05]} rotation={[-Math.PI / 2, 0, 0]}>
            <shapeGeometry args={[pondWaterShape]} />
            <meshStandardMaterial
              color={theme.waterColor}
              roughness={0.12}
              metalness={0.2}
              emissive={theme.waterColor}
              emissiveIntensity={theme.isNight ? 0.28 : 0.1}
            />
          </mesh>

          <mesh ref={ripple1Ref} position={[2.3, -0.904, -1.0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.28, 0.32, 24]} />
            <meshBasicMaterial color={theme.waterShimmerColor} transparent opacity={0.35} depthWrite={false} />
          </mesh>
          <mesh ref={ripple2Ref} position={[2.75, -0.904, -1.25]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.2, 0.235, 20]} />
            <meshBasicMaterial color={theme.waterShimmerColor} transparent opacity={0.3} depthWrite={false} />
          </mesh>

          <instancedMesh ref={shimmerInstRef} args={[undefined, undefined, waterShimmers.length]} frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={theme.waterShimmerColor} transparent opacity={0.32} depthWrite={false} />
          </instancedMesh>

          <group position={[2.92, -0.902, -0.82]}>
            <mesh rotation={[-Math.PI / 2, 0, 0.6]}>
              <circleGeometry args={[0.21, 16, 0, Math.PI * 1.82]} />
              <meshLambertMaterial color={theme.isNight ? "#15803D" : "#22C55E"} />
            </mesh>
            <mesh position={[0.02, 0.035, 0]} scale={[1.1, 0.75, 1.1]}>
              <sphereGeometry args={[0.055, 8, 8]} />
              <meshStandardMaterial color="#F472B6" roughness={0.4} emissive="#F472B6" emissiveIntensity={theme.isNight ? 0.28 : 0.05} />
            </mesh>
          </group>
          <mesh position={[2.02, -0.902, -1.32]} rotation={[-Math.PI / 2, 0, 2.5]}>
            <circleGeometry args={[0.145, 14, 0, Math.PI * 1.84]} />
            <meshLambertMaterial color={theme.isNight ? "#166534" : "#16A34A"} />
          </mesh>
        </group>

        {/* 11. Straight Flat Wooden Footbridge Over the Brook (Clickable!) */}
        <group
          position={[-0.36, -0.9, -2.32]}
          rotation={[0, 0, 0]}
          onPointerDown={handleGroundPointerDown}
          onClick={handleGroundClick}
        >
          {/* Two Straight Longitudinal Support Beams Underneath */}
          <mesh position={[-0.28, 0.05, 0]}>
            <boxGeometry args={[0.07, 0.06, 1.18]} />
            <meshLambertMaterial color={woodDarkColor} />
          </mesh>
          <mesh position={[0.28, 0.05, 0]}>
            <boxGeometry args={[0.07, 0.06, 1.18]} />
            <meshLambertMaterial color={woodDarkColor} />
          </mesh>

          {/* 5 Even, Level Wooden Bridge Planks */}
          {[-0.46, -0.23, 0, 0.23, 0.46].map((zOff, idx) => (
            <mesh key={idx} position={[0, 0.095, zOff]}>
              <boxGeometry args={[0.82, 0.045, 0.19]} />
              <meshLambertMaterial color={idx % 2 === 0 ? woodColor : woodDarkColor} />
            </mesh>
          ))}

          {/* 4 Straight Corner Posts */}
          {[-0.38, 0.38].map((xOff, xi) =>
            [-0.5, 0.5].map((zOff, zi) => (
              <mesh key={`${xi}-${zi}`} position={[xOff, 0.24, zOff]}>
                <boxGeometry args={[0.06, 0.36, 0.06]} />
                <meshLambertMaterial color={woodDarkColor} />
              </mesh>
            ))
          )}

          {/* Straight Left & Right Handrails */}
          <mesh position={[-0.38, 0.38, 0]}>
            <boxGeometry args={[0.048, 0.048, 1.06]} />
            <meshLambertMaterial color={woodColor} />
          </mesh>
          <mesh position={[0.38, 0.38, 0]}>
            <boxGeometry args={[0.048, 0.048, 1.06]} />
            <meshLambertMaterial color={woodColor} />
          </mesh>
        </group>

        {/* 12. Two Cozy Glowing Meadow Lantern Posts (Bridge & East Path) */}
        {[
          { pos: [-1.45, BASE_GROUND_Y, -1.65] as [number, number, number], rotY: 0.45 },
          { pos: [2.25, BASE_GROUND_Y, 0.22] as [number, number, number], rotY: -2.2 },
        ].map((lamp, idx) => (
          <group key={idx} position={lamp.pos} rotation={[0, lamp.rotY, 0]}>
            <mesh position={[0, 0.38, 0]}>
              <boxGeometry args={[0.075, 0.76, 0.075]} />
              <meshLambertMaterial color={woodDarkColor} />
            </mesh>
            <mesh position={[0.14, 0.72, 0]}>
              <boxGeometry args={[0.32, 0.055, 0.055]} />
              <meshLambertMaterial color={woodColor} />
            </mesh>
            <mesh position={[0.26, 0.65, 0]}>
              <coneGeometry args={[0.1, 0.08, 4]} />
              <meshLambertMaterial color="#1F2937" />
            </mesh>
            <mesh position={[0.26, 0.56, 0]}>
              <boxGeometry args={[0.11, 0.13, 0.11]} />
              <meshStandardMaterial
                color={isLanternLit ? "#FEF08A" : "#E5E7EB"}
                emissive={isLanternLit ? "#F59E0B" : "#000000"}
                emissiveIntensity={isLanternLit ? 1.4 : 0}
              />
            </mesh>
            {isLanternLit && (
              <mesh position={[0.26, 0.56, 0]}>
                <sphereGeometry args={[0.3, 12, 10]} />
                <meshBasicMaterial color="#FDE047" transparent opacity={0.18} depthWrite={false} />
              </mesh>
            )}
          </group>
        ))}

        {/* 13. Instanced Stepping Stones, Rocks & Pebbles */}
        <instancedMesh ref={steppingStonesInstRef} args={[undefined, undefined, steppingStones.length]}>
          <cylinderGeometry args={[1, 1.05, 1, 8]} />
          <meshLambertMaterial color={theme.isNight ? "#475569" : "#D6D3D1"} />
        </instancedMesh>
        <instancedMesh ref={rocksInstRef} args={[undefined, undefined, rocks.length]}>
          <sphereGeometry args={[1, 8, 7]} />
          <meshLambertMaterial color="#FFFFFF" />
        </instancedMesh>

        {/* 14. Instanced Swaying Inner Grass, Static Outer Grass & Pond Reeds (3 Draw Calls Total!) */}
        <instancedMesh ref={grassInstRef} args={[undefined, undefined, grassBlades.length]} frustumCulled={false}>
          <coneGeometry args={[0.022, 0.18, 4]} />
          <meshLambertMaterial color={theme.grassTuftColor} />
        </instancedMesh>
        <instancedMesh ref={outerGrassInstRef} args={[undefined, undefined, outerGrassBlades.length]}>
          <coneGeometry args={[0.02, 0.18, 4]} />
          <meshLambertMaterial color={theme.grassTuftColor} />
        </instancedMesh>
        <instancedMesh ref={reedsInstRef} args={[undefined, undefined, reeds.length]} frustumCulled={false}>
          <coneGeometry args={[0.018, 0.4, 4]} />
          <meshLambertMaterial color={theme.groundRimColor} />
        </instancedMesh>

        {/* 15. Instanced Forest Mushrooms */}
        <instancedMesh ref={mushroomStemsInstRef} args={[undefined, undefined, mushrooms.length]}>
          <cylinderGeometry args={[0.022, 0.028, 0.09, 6]} />
          <meshLambertMaterial color="#FEF3C7" />
        </instancedMesh>
        <instancedMesh ref={mushroomCapsInstRef} args={[undefined, undefined, mushrooms.length]}>
          <sphereGeometry args={[0.055, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshLambertMaterial color="#FFFFFF" />
        </instancedMesh>

        {/* 16. Daytime Butterflies */}
        {!theme.isNight && (
          <group ref={butterfliesGroupRef}>
            {butterflies.map((b, idx) => (
              <group key={idx} position={b.base}>
                <mesh position={[-0.032, 0, 0]} rotation={[0.3, 0, 0.25]}>
                  <planeGeometry args={[0.058, 0.044]} />
                  <meshBasicMaterial color={b.color} side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0.032, 0, 0]} rotation={[0.3, 0, -0.25]}>
                  <planeGeometry args={[0.058, 0.044]} />
                  <meshBasicMaterial color={b.color} side={THREE.DoubleSide} />
                </mesh>
              </group>
            ))}
          </group>
        )}
      </group>
    );
  }
);
