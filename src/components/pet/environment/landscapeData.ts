import * as THREE from "three";
import { BASE_GROUND_Y, MAP_PLATFORMS, isWaterAt, isNearWater } from "../../../engine/world/mapTerrain";

// Crisp pixel-styled wooden signboard CanvasTexture for interactive 3D landmarks
export function createSignTexture(
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
  const fontSize = label.length > 5 ? 28 : 34;
  ctx.font = `bold ${fontSize}px "Silkscreen", monospace`;
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
export function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Smooth organic small lake (danau kecil) shape
export function createOrganicPondShape(scaleX: number, scaleY: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-1.18 * scaleX, 0.05 * scaleY);
  shape.bezierCurveTo(
    -1.18 * scaleX,
    0.75 * scaleY,
    -0.35 * scaleX,
    1.02 * scaleY,
    0.45 * scaleX,
    0.85 * scaleY
  );
  shape.bezierCurveTo(
    1.28 * scaleX,
    0.68 * scaleY,
    1.35 * scaleX,
    -0.35 * scaleY,
    0.78 * scaleX,
    -0.85 * scaleY
  );
  shape.bezierCurveTo(
    0.15 * scaleX,
    -1.08 * scaleY,
    -0.98 * scaleX,
    -0.82 * scaleY,
    -1.18 * scaleX,
    0.05 * scaleY
  );
  return shape;
}

// Smooth winding brook ribbon shape (sy maps to -worldZ when rotated -PI/2 on X)
// Flows naturally and gracefully enters into the small lake
export function createStreamShape(halfWidthPad = 0): THREE.Shape {
  const centerPoints: [number, number, number][] = [
    [-4.15, 3.95, 0.36],
    [-2.2, 3.0, 0.42],
    [-0.45, 2.35, 0.44],
    [0.95, 1.85, 0.42],
    [1.75, 1.40, 0.38],
    [2.35, 1.10, 0.28],
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
    const width = hw + halfWidthPad * (i === centerPoints.length - 1 ? 0.35 : 1);
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
  const lastLower = lowerEdge[lowerEdge.length - 1];

  // Smooth rounded estuary mouth entering seamlessly into the lake body
  const midX = (lastUpper.x + lastLower.x) / 2 + 0.15;
  const midY = (lastUpper.y + lastLower.y) / 2 - 0.08;
  shape.quadraticCurveTo(lastUpper.x, lastUpper.y, midX, midY);
  shape.quadraticCurveTo(midX, midY, lastLower.x, lastLower.y);

  for (let i = lowerEdge.length - 2; i >= 0; i--) {
    const prev = lowerEdge[i + 1];
    const curr = lowerEdge[i];
    shape.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2);
  }
  shape.lineTo(lowerEdge[0].x, lowerEdge[0].y);
  shape.closePath();
  return shape;
}

export function generateStarsData() {
  const list: { pos: [number, number, number]; size: number; phase: number }[] = [];
  // 360-degree celestial star dome surrounding the diorama from all angles (North, South, East, West, Overhead)
  for (let i = 0; i < 180; i++) {
    const angle = seeded(i * 11 + 1) * Math.PI * 2;
    const radius = 13.5 + seeded(i * 11 + 2) * 13.5; // radius 13.5 to 27.0
    const elevation = 2.2 + seeded(i * 11 + 3) * 13.5; // height 2.2 to 15.7
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    list.push({
      pos: [x, elevation, z],
      size: 0.024 + seeded(i * 11 + 4) * 0.038,
      phase: seeded(i * 11 + 5) * Math.PI * 2,
    });
  }
  return list;
}

export function generateButterfliesData() {
  return [
    { base: [-3.1, 0.05, -0.4] as [number, number, number], radius: 0.65, speed: 1.1, phase: 0, color: "#FDE047" },
    { base: [2.3, -0.22, -0.85] as [number, number, number], radius: 0.55, speed: 1.35, phase: 2.1, color: "#F472B6" },
    { base: [3.3, 0.02, 0.75] as [number, number, number], radius: 0.5, speed: 0.95, phase: 4.0, color: "#38BDF8" },
    { base: [-1.4, -0.1, 1.4] as [number, number, number], radius: 0.55, speed: 1.2, phase: 5.2, color: "#C084FC" },
  ];
}

export function generateRoundTreesData() {
  const list: { pos: [number, number, number]; scale: number }[] = [
    { pos: [-6.4, -0.82, -3.6], scale: 1.05 },
    { pos: [-5.8, -0.82, -2.4], scale: 0.95 },
    { pos: [-2.8, -0.84, -4.8], scale: 0.82 },
    { pos: [1.55, -0.85, -4.7], scale: 0.8 },
    { pos: [3.2, -0.82, -4.2], scale: 0.95 },
    { pos: [5.9, -0.82, -4.2], scale: 1.05 },
    { pos: [-5.9, -0.82, -1.6], scale: 1.05 },
    { pos: [-5.5, -0.82, 0.25], scale: 0.92 },
    { pos: [-4.8, -0.84, 2.2], scale: 0.85 },
    { pos: [-3.9, -0.44, -1.35], scale: 0.78 },
    { pos: [6.2, -0.82, -1.6], scale: 1.0 },
    { pos: [5.6, -0.82, 0.85], scale: 0.95 },
    { pos: [4.9, -0.84, 2.35], scale: 0.82 },
    { pos: [4.85, -0.82, 1.55], scale: 0.85 },
    // Western & South-Western Horizon Tree Belt (Framing West Knoll & Horizon Hills)
    { pos: [-6.8, -0.82, -0.6], scale: 0.98 },
    { pos: [-6.4, -0.82, 0.95], scale: 1.02 },
    { pos: [-5.7, -0.82, 1.85], scale: 0.92 },
    { pos: [-5.4, -0.82, 3.2], scale: 0.88 },
    { pos: [-4.2, -0.84, 3.8], scale: 0.85 },
    { pos: [-2.6, -0.84, 4.8], scale: 0.92 },
    { pos: [-7.5, -0.82, 1.2], scale: 1.05 },
  ];

  // Dense multi-layered woodland canopy spanning the entire terrain out to radius 24.8
  for (let i = 0; i < 350; i++) {
    const angle = seeded(i * 19 + 1) * Math.PI * 2;
    const radius = 4.8 + seeded(i * 19 + 2) * 20.0;
    const x = Math.cos(angle) * radius * 1.08;
    const z = Math.sin(angle) * radius * 0.92;

    // Keep central playable valley completely clear & walkable
    if (Math.abs(x) < 4.4 && z > -3.3 && z < 2.5) continue;
    if (Math.abs(x) < 3.2 && z >= 2.5 && z < 3.8) continue;
    // Water stream & lake clearances
    if (isWaterAt(x, z) || isNearWater(x, z, 0.72)) continue;
    // Landmark clearances
    if (Math.hypot(x - 4.55, z - -2.55) < 2.0) continue; // Shop
    if (Math.hypot(x - -4.35, z - -4.05) < 2.35) continue; // Mine
    if (Math.hypot(x - 3.65, z - 1.15) < 1.65) continue; // East knoll bench
    if (Math.hypot(x - -3.24, z - -0.52) < 1.55) continue; // West knoll bed
    if (Math.hypot(x - 2.50, z - -2.80) < 1.45) continue; // Trampoline left of shop

    const scale = 0.52 + seeded(i * 19 + 3) * 0.58;
    list.push({ pos: [x, -0.86, z], scale });
  }
  return list;
}

export function generatePineTreesData() {
  const list: { pos: [number, number, number]; scale: number }[] = [
    { pos: [-6.2, -0.84, -5.6], scale: 1.05 },
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
    // Western & South-Western Horizon Pine Belt
    { pos: [-7.1, -0.84, 0.1], scale: 1.05 },
    { pos: [-6.6, -0.84, -1.8], scale: 0.98 },
    { pos: [-6.8, -0.84, 2.4], scale: 0.96 },
    { pos: [-5.9, -0.84, 3.7], scale: 0.92 },
    { pos: [-3.5, -0.84, 4.4], scale: 0.88 },
    { pos: [-7.6, -0.84, -1.2], scale: 1.02 },
  ];

  // Deep evergreen pine forest enclosing mountains, ridges and outer perimeter
  for (let i = 0; i < 350; i++) {
    const angle = seeded(i * 23 + 7) * Math.PI * 2;
    const radius = 5.0 + seeded(i * 23 + 8) * 19.8;
    const x = Math.cos(angle) * radius * 1.1;
    const z = Math.sin(angle) * radius * 0.92;

    // Keep central playable valley completely clear & walkable
    if (Math.abs(x) < 4.4 && z > -3.3 && z < 2.5) continue;
    if (Math.abs(x) < 3.2 && z >= 2.5 && z < 3.8) continue;
    // Water stream & lake clearances
    if (isWaterAt(x, z) || isNearWater(x, z, 0.72)) continue;
    // Landmark clearances
    if (Math.hypot(x - 4.55, z - -2.55) < 2.0) continue; // Shop
    if (Math.hypot(x - -4.35, z - -4.05) < 2.35) continue; // Mine
    if (Math.hypot(x - 3.65, z - 1.15) < 1.65) continue; // East knoll bench
    if (Math.hypot(x - -3.24, z - -0.52) < 1.55) continue; // West knoll bed
    if (Math.hypot(x - 2.50, z - -2.80) < 1.45) continue; // Trampoline left of shop

    const scale = 0.54 + seeded(i * 23 + 9) * 0.65;
    list.push({ pos: [x, -0.86, z], scale });
  }
  return list;
}

export function generateBushesData() {
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
    { pos: [4.65, -0.78, 1.85], scale: [0.32, 0.24, 0.28] },
    { pos: [-3.9, -0.78, 2.35], scale: [0.34, 0.25, 0.3] },
    { pos: [3.8, -0.78, 2.55], scale: [0.32, 0.24, 0.28] },
    { pos: [-1.48, -0.78, -4.05], scale: [0.32, 0.24, 0.3] },
    { pos: [6.15, -0.78, -2.4], scale: [0.34, 0.26, 0.32] },
    { pos: [-5.6, -0.78, -3.4], scale: [0.38, 0.28, 0.34] },
    // Western & South-Western Horizon Foothill Bushes
    { pos: [-5.6, -0.78, -0.3], scale: [0.36, 0.26, 0.32] },
    { pos: [-5.3, -0.78, 1.3], scale: [0.34, 0.25, 0.3] },
    { pos: [-4.6, -0.78, 2.9], scale: [0.32, 0.24, 0.28] },
    { pos: [-3.2, -0.78, 4.1], scale: [0.34, 0.25, 0.3] },
  ];

  for (let i = 0; i < 160; i++) {
    const angle = seeded(i * 29 + 3) * Math.PI * 2;
    const radius = 4.5 + seeded(i * 29 + 4) * 19.5;
    const x = Math.cos(angle) * radius * 1.08;
    const z = Math.sin(angle) * radius * 0.92;
    if (Math.abs(x) < 4.4 && z > -3.3 && z < 2.5) continue;
    if (Math.abs(x) < 3.2 && z >= 2.5 && z < 3.8) continue;
    if (isWaterAt(x, z) || isNearWater(x, z, 0.55)) continue;
    if (Math.hypot(x - 4.55, z - -2.55) < 1.95) continue; // Shop
    if (Math.hypot(x - -4.35, z - -4.05) < 2.15) continue; // Mine
    if (Math.hypot(x - 3.65, z - 1.15) < 1.55) continue; // East knoll bench
    if (Math.hypot(x - -3.24, z - -0.52) < 1.45) continue; // West knoll bed
    if (Math.hypot(x - 2.50, z - -2.80) < 1.35) continue; // Trampoline left of shop
    const s = 0.22 + seeded(i * 29 + 5) * 0.25;
    list.push({ pos: [x, -0.82, z], scale: [s * 1.15, s * 0.82, s] });
  }
  return list;
}

export function generateFenceSegmentsData() {
  const pts: [number, number, number][] = [
    [-5.2, 1.5, 1.35],
    [-5.05, 0.8, 1.48],
    [-4.95, 0.1, 1.55],
    [-4.85, -0.6, 1.65],
    [-4.65, -1.3, 1.8],
    [3.4, -2.95, 0.12],
    [4.1, -3.05, 0.08],
    [4.8, -3.1, 0.0],
    [5.5, -2.95, -0.35],
  ];
  return pts.map(([x, z, rotY]) => ({ x, z, rotY }));
}

export function generateGrassBladesData() {
  const clusterCenters: [number, number, number][] = [
    [-1.85, 0.55, BASE_GROUND_Y], [-2.25, 0.95, BASE_GROUND_Y], [-1.35, -1.15, BASE_GROUND_Y],
    [-1.12, 1.58, BASE_GROUND_Y], [1.18, 1.52, BASE_GROUND_Y], [1.78, 0.32, BASE_GROUND_Y],
    [2.25, 0.22, BASE_GROUND_Y], [3.55, -0.75, BASE_GROUND_Y], [3.85, -1.62, BASE_GROUND_Y],
    [-0.48, -1.68, BASE_GROUND_Y], [-2.45, -2.15, BASE_GROUND_Y], [0.78, -1.15, BASE_GROUND_Y],
    [-3.45, 1.45, BASE_GROUND_Y], [2.45, 1.75, BASE_GROUND_Y], [-4.15, 0.95, BASE_GROUND_Y],
    [4.65, 0.15, BASE_GROUND_Y], [-2.05, 2.05, BASE_GROUND_Y], [0.45, 1.95, BASE_GROUND_Y],
    [-3.15, -2.35, BASE_GROUND_Y], [1.45, -2.55, BASE_GROUND_Y], [-4.55, -2.2, BASE_GROUND_Y],
    [1.55, -2.85, BASE_GROUND_Y], [-0.95, -3.25, BASE_GROUND_Y], [4.95, -1.15, BASE_GROUND_Y],
    [-4.85, -0.35, BASE_GROUND_Y], [1.95, 1.95, BASE_GROUND_Y], [-0.35, 2.15, BASE_GROUND_Y],
    [0.85, 0.65, BASE_GROUND_Y], [-0.95, -0.55, BASE_GROUND_Y], [-2.85, 1.95, BASE_GROUND_Y],
    [3.1, 2.2, BASE_GROUND_Y], [-4.35, 1.85, BASE_GROUND_Y], [4.55, 1.75, BASE_GROUND_Y],
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
}

export function generateOuterGrassBladesData() {
  const blades: {
    x: number;
    y: number;
    z: number;
    h: number;
    tiltZ: number;
    tiltX: number;
    rotY: number;
  }[] = [];

  // Rich forest floor grass tufts carpeting slopes and glades out to the tree line
  for (let ci = 0; ci < 360; ci++) {
    const angle = seeded(ci * 31 + 1) * Math.PI * 2;
    const radius = 2.4 + seeded(ci * 31 + 2) * 22.0;
    const cx = Math.cos(angle) * radius * 1.08;
    const cz = Math.sin(angle) * radius * 0.92;
    if (isWaterAt(cx, cz) || isNearWater(cx, cz, 0.35)) continue;
    if (Math.hypot(cx - 4.55, cz - -2.55) < 1.65) continue;
    if (Math.hypot(cx - -4.35, cz - -4.05) < 2.05) continue;
    if (Math.hypot(cx - 3.65, cz - 1.15) < 1.45) continue;
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
}

export function generateReedsData() {
  const spots: [number, number][] = [
    [1.38, -1.25], [1.45, -1.32], [1.5, -1.18],
    [3.42, -1.45], [3.5, -1.36], [3.35, -1.52],
    [3.25, -0.58], [3.32, -0.52],
    [-1.55, -2.55], [-1.45, -2.62], [-1.62, -2.48],
    [-2.85, -3.18], [-2.75, -3.26],
    [0.65, -2.48], [0.74, -2.55], [0.58, -2.42],
    [-2.45, -3.35], [-2.35, -3.42],
  ];
  return spots.map(([x, z], i) => ({
    x,
    z,
    h: 0.34 + seeded(i * 17 + 1) * 0.18,
    tilt: (seeded(i * 17 + 2) - 0.5) * 0.25,
    phase: seeded(i * 17 + 3) * Math.PI * 2,
  }));
}

export function generateRocksData() {
  const rocks = [
    { pos: [1.56, -0.9, -0.62] as [number, number, number], scale: [0.11, 0.06, 0.1] as [number, number, number], rotY: 1.2, shade: 1 },
    { pos: [2.95, -0.9, -0.45] as [number, number, number], scale: [0.18, 0.09, 0.14] as [number, number, number], rotY: -0.5, shade: 0 },
    { pos: [3.22, -0.9, -0.64] as [number, number, number], scale: [0.12, 0.065, 0.11] as [number, number, number], rotY: 0.8, shade: 2 },
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
  ];
  return rocks.filter((r) => !isWaterAt(r.pos[0], r.pos[2]));
}

export function generateSteppingStonesData() {
  const stones = [
    // 1. Gentle stones leading near South-West Mushroom Trampoline
    { pos: [-0.65, -0.908, 0.58] as [number, number, number], scale: [0.22, 0.03, 0.16] as [number, number, number], rotY: 0.35 },
    { pos: [-1.02, -0.908, 0.85] as [number, number, number], scale: [0.24, 0.03, 0.18] as [number, number, number], rotY: -0.2 },

    // 2. Gentle stones in West meadow
    { pos: [-0.95, -0.908, -0.2] as [number, number, number], scale: [0.22, 0.03, 0.16] as [number, number, number], rotY: 0.4 },
    { pos: [-1.45, -0.908, -0.32] as [number, number, number], scale: [0.24, 0.03, 0.17] as [number, number, number], rotY: 0.15 },

    // 3. Gentle stones in East meadow
    { pos: [0.85, -0.908, 0.22] as [number, number, number], scale: [0.22, 0.03, 0.16] as [number, number, number], rotY: -0.3 },
    { pos: [1.38, -0.908, 0.36] as [number, number, number], scale: [0.24, 0.03, 0.17] as [number, number, number], rotY: 0.2 },

    // 4. North-East Path leading towards Toko (Shop Porch) on dry land
    { pos: [1.35, -0.908, -0.65] as [number, number, number], scale: [0.22, 0.03, 0.16] as [number, number, number], rotY: -0.25 },
    { pos: [2.75, -0.908, -1.60] as [number, number, number], scale: [0.23, 0.03, 0.16] as [number, number, number], rotY: -0.35 },
    { pos: [3.85, -0.908, -2.22] as [number, number, number], scale: [0.26, 0.03, 0.18] as [number, number, number], rotY: 0.2 },
  ];
  return stones.filter((s) => !isWaterAt(s.pos[0], s.pos[2]));
}

export function generateMushroomsData() {
  return [
    { pos: [-4.15, -0.91, -1.4] as [number, number, number], scale: 1.0, capColor: "#EF4444" },
    { pos: [-3.98, -0.91, -1.28] as [number, number, number], scale: 0.68, capColor: "#F97316" },
    { pos: [3.85, -0.91, -2.05] as [number, number, number], scale: 0.95, capColor: "#EF4444" },
    { pos: [3.98, -0.91, -1.95] as [number, number, number], scale: 0.65, capColor: "#FB923C" },
    { pos: [-2.45, -0.91, 1.55] as [number, number, number], scale: 0.78, capColor: "#EF4444" },
    { pos: [2.05, -0.91, 1.78] as [number, number, number], scale: 0.75, capColor: "#F59E0B" },
    { pos: [-1.18, -0.91, -1.92] as [number, number, number], scale: 0.8, capColor: "#EF4444" },
    { pos: [-3.65, -0.46, -1.05] as [number, number, number], scale: 0.72, capColor: "#EF4444" },
    { pos: [4.25, -0.82, 0.85] as [number, number, number], scale: 0.76, capColor: "#F97316" },
    { pos: [-2.25, -0.91, 1.65] as [number, number, number], scale: 0.68, capColor: "#EF4444" },
  ];
}

export function generateWaterShimmersData() {
  return [
    { pos: [-3.4, -0.903, -3.65] as [number, number, number], width: 0.34, phase: 0.1 },
    { pos: [-2.4, -0.903, -3.05] as [number, number, number], width: 0.32, phase: 0.9 },
    { pos: [-1.25, -0.903, -2.6] as [number, number, number], width: 0.28, phase: 1.7 },
    { pos: [0.42, -0.903, -2.1] as [number, number, number], width: 0.32, phase: 2.5 },
    { pos: [1.45, -0.903, -1.62] as [number, number, number], width: 0.28, phase: 3.3 },
    { pos: [2.15, -0.902, -0.9] as [number, number, number], width: 0.36, phase: 4.1 },
    { pos: [2.75, -0.902, -1.25] as [number, number, number], width: 0.28, phase: 4.9 },
    { pos: [2.45, -0.902, -0.68] as [number, number, number], width: 0.24, phase: 5.5 },
  ];
}

// 12. Magical Glowing Night Fireflies (Kunang-Kunang Berpendar) across grassy meadows, banks & knolls
export interface FireflyItem {
  base: [number, number, number];
  radius: number;
  speed: number;
  phase: number;
  pulseSpeed: number;
  pulsePhase: number;
  color: string;
}

export function generateFirefliesData(): FireflyItem[] {
  return [
    // Near pond reeds & pond bank
    { base: [2.2, BASE_GROUND_Y + 0.38, -0.65], radius: 0.42, speed: 0.95, phase: 0.2, pulseSpeed: 2.4, pulsePhase: 0.1, color: "#FEF08A" },
    { base: [2.8, BASE_GROUND_Y + 0.45, -1.35], radius: 0.48, speed: 1.15, phase: 1.8, pulseSpeed: 2.8, pulsePhase: 1.2, color: "#A3E635" },
    { base: [1.8, BASE_GROUND_Y + 0.32, -1.05], radius: 0.38, speed: 0.85, phase: 3.4, pulseSpeed: 2.1, pulsePhase: 2.5, color: "#FACC15" },
    { base: [3.1, BASE_GROUND_Y + 0.42, -0.75], radius: 0.45, speed: 1.05, phase: 4.6, pulseSpeed: 2.6, pulsePhase: 3.8, color: "#FEF08A" },

    // Grassy central meadow valley
    { base: [-0.6, BASE_GROUND_Y + 0.35, 0.45], radius: 0.55, speed: 0.9, phase: 0.7, pulseSpeed: 2.2, pulsePhase: 0.5, color: "#A3E635" },
    { base: [0.75, BASE_GROUND_Y + 0.32, -0.25], radius: 0.45, speed: 1.2, phase: 2.3, pulseSpeed: 3.0, pulsePhase: 1.9, color: "#FACC15" },
    { base: [-1.25, BASE_GROUND_Y + 0.4, 0.95], radius: 0.52, speed: 0.8, phase: 3.9, pulseSpeed: 2.0, pulsePhase: 2.8, color: "#FEF08A" },
    { base: [0.25, BASE_GROUND_Y + 0.36, 1.25], radius: 0.46, speed: 1.0, phase: 5.1, pulseSpeed: 2.5, pulsePhase: 4.2, color: "#A3E635" },
    { base: [-0.2, BASE_GROUND_Y + 0.42, -1.2], radius: 0.4, speed: 1.1, phase: 1.3, pulseSpeed: 2.7, pulsePhase: 0.9, color: "#FACC15" },

    // West Knoll slope & near sofa bed
    { base: [-2.4, BASE_GROUND_Y + 0.46, 0.35], radius: 0.5, speed: 0.95, phase: 2.7, pulseSpeed: 2.3, pulsePhase: 1.7, color: "#FEF08A" },
    { base: [-3.1, BASE_GROUND_Y + 0.62, -0.1], radius: 0.42, speed: 0.75, phase: 4.1, pulseSpeed: 1.9, pulsePhase: 3.1, color: "#A3E635" },
    { base: [-2.0, BASE_GROUND_Y + 0.38, -0.8], radius: 0.48, speed: 1.05, phase: 0.5, pulseSpeed: 2.8, pulsePhase: 4.5, color: "#FACC15" },
    { base: [-3.6, BASE_GROUND_Y + 0.68, 0.55], radius: 0.38, speed: 0.88, phase: 5.5, pulseSpeed: 2.1, pulsePhase: 0.3, color: "#FEF08A" },

    // East Knoll & Wooden Bench
    { base: [2.35, BASE_GROUND_Y + 0.45, 0.75], radius: 0.46, speed: 1.0, phase: 1.5, pulseSpeed: 2.4, pulsePhase: 2.1, color: "#A3E635" },
    { base: [3.2, BASE_GROUND_Y + 0.58, 0.2], radius: 0.4, speed: 0.85, phase: 3.1, pulseSpeed: 2.0, pulsePhase: 3.5, color: "#FEF08A" },
    { base: [1.85, BASE_GROUND_Y + 0.36, 1.45], radius: 0.52, speed: 1.1, phase: 4.7, pulseSpeed: 2.9, pulsePhase: 1.0, color: "#FACC15" },

    // Near brook banks & wooden bridge
    { base: [-1.65, BASE_GROUND_Y + 0.32, -2.1], radius: 0.44, speed: 0.92, phase: 0.9, pulseSpeed: 2.2, pulsePhase: 0.6, color: "#FEF08A" },
    { base: [0.85, BASE_GROUND_Y + 0.34, -1.85], radius: 0.42, speed: 1.08, phase: 2.5, pulseSpeed: 2.6, pulsePhase: 2.3, color: "#A3E635" },
    { base: [-0.45, BASE_GROUND_Y + 0.38, -2.85], radius: 0.38, speed: 0.82, phase: 3.7, pulseSpeed: 2.0, pulsePhase: 3.9, color: "#FACC15" },

    // Forest borders
    { base: [-3.8, BASE_GROUND_Y + 0.36, -1.8], radius: 0.48, speed: 0.95, phase: 1.1, pulseSpeed: 2.4, pulsePhase: 1.4, color: "#FEF08A" },
    { base: [3.6, BASE_GROUND_Y + 0.38, -1.9], radius: 0.45, speed: 1.02, phase: 2.9, pulseSpeed: 2.5, pulsePhase: 2.7, color: "#A3E635" },
    { base: [-1.7, BASE_GROUND_Y + 0.35, 1.6], radius: 0.5, speed: 0.88, phase: 4.3, pulseSpeed: 2.1, pulsePhase: 4.0, color: "#FACC15" },
  ];
}

// 13. Dynamic Rain Streaks (Rintik Hujan Vertikal)
export interface PixelRainStreak {
  x: number;
  z: number;
  speed: number;
  offset: number;
  height: number;
}

export function generatePixelRainData(): PixelRainStreak[] {
  const list: PixelRainStreak[] = [];
  const count = 150;
  for (let i = 0; i < count; i++) {
    const x = (seeded(i * 17 + 3) - 0.5) * 14.0;
    const z = (seeded(i * 17 + 7) - 0.5) * 12.0;
    const speed = 7.2 + seeded(i * 17 + 11) * 3.6;
    const offset = seeded(i * 17 + 13) * 6.0;
    const height = 0.22 + seeded(i * 17 + 19) * 0.12;
    list.push({ x, z, speed, offset, height });
  }
  return list;
}

// 14. Water Ripples on River & Pond (Riak Air di Sungai & Kolam)
export interface RiverRippleItem {
  x: number;
  z: number;
  speed: number;
  phase: number;
  maxRadius: number;
}

export function generateRiverRipplesData(): RiverRippleItem[] {
  return [
    // Winding brook ripples along the stream curve from mine headwaters down to pond
    { x: -4.0, z: -3.9, speed: 1.1, phase: 0.1, maxRadius: 0.32 },
    { x: -3.5, z: -3.65, speed: 0.9, phase: 0.8, maxRadius: 0.36 },
    { x: -2.8, z: -3.3, speed: 1.15, phase: 1.2, maxRadius: 0.35 },
    { x: -2.2, z: -3.0, speed: 1.25, phase: 1.5, maxRadius: 0.34 },
    { x: -1.6, z: -2.75, speed: 1.0, phase: 2.2, maxRadius: 0.38 },
    { x: -1.0, z: -2.55, speed: 1.1, phase: 2.9, maxRadius: 0.36 },
    { x: -0.4, z: -2.32, speed: 1.05, phase: 3.6, maxRadius: 0.35 },
    { x: 0.25, z: -2.2, speed: 1.05, phase: 5.0, maxRadius: 0.34 },
    { x: 0.6, z: -2.05, speed: 0.92, phase: 5.7, maxRadius: 0.35 },
    { x: 1.15, z: -1.85, speed: 1.12, phase: 0.2, maxRadius: 0.33 },
    { x: 1.55, z: -1.65, speed: 0.98, phase: 0.8, maxRadius: 0.35 },
    { x: 1.9, z: -1.45, speed: 1.0, phase: 1.2, maxRadius: 0.34 },

    // Lily pond ripples
    { x: 2.45, z: -1.05, speed: 1.1, phase: 1.9, maxRadius: 0.42 },
    { x: 2.15, z: -0.85, speed: 0.95, phase: 2.6, maxRadius: 0.35 },
    { x: 2.75, z: -1.25, speed: 1.2, phase: 3.3, maxRadius: 0.38 },
    { x: 2.3, z: -1.35, speed: 1.05, phase: 4.0, maxRadius: 0.34 },
    { x: 2.8, z: -0.85, speed: 0.88, phase: 4.7, maxRadius: 0.36 },
    { x: 1.95, z: -1.1, speed: 1.15, phase: 5.4, maxRadius: 0.32 },
    { x: 2.6, z: -0.65, speed: 1.02, phase: 0.3, maxRadius: 0.35 },
  ];
}
