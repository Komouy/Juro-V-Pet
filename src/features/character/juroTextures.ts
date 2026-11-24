import * as THREE from "three";

/**
 * Procedural offscreen canvas textures for Juro's facial expressions,
 * dizzy states, sleeping Zzz particles, and soft ground contact shadow.
 * Cached to prevent duplicate canvas allocations and conserve RAM/VRAM.
 */

let _cachedSleepZ: THREE.CanvasTexture | null = null;
let _cachedSoftShadow: THREE.CanvasTexture | null = null;
let _cachedDizzyEye: THREE.CanvasTexture | null = null;
let _cachedDizzyMouth: THREE.CanvasTexture | null = null;
let _cachedDizzyStar: THREE.CanvasTexture | null = null;

const isTestEnv = typeof import.meta !== "undefined" && Boolean(import.meta.env?.MODE === "test");

export function clearJuroTextureCache(): void {
  _cachedSleepZ = null;
  _cachedSoftShadow = null;
  _cachedDizzyEye = null;
  _cachedDizzyMouth = null;
  _cachedDizzyStar = null;
}

// Generate a crisp pixel-art "Z" sprite texture on an offscreen canvas
export function createSleepZTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (_cachedSleepZ && !isTestEnv) return _cachedSleepZ;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 128);

  // Soft lavender glow behind the Z
  ctx.shadowColor = "rgba(196, 181, 253, 0.85)";
  ctx.shadowBlur = 14;

  // Draw crisp blocky pixel-style "Z"
  const drawZPath = (offsetX: number, offsetY: number) => {
    // Top bar
    ctx.fillRect(24 + offsetX, 22 + offsetY, 80, 18);
    // Diagonal pixel steps
    ctx.fillRect(80 + offsetX, 40 + offsetY, 20, 14);
    ctx.fillRect(62 + offsetX, 52 + offsetY, 22, 14);
    ctx.fillRect(44 + offsetX, 64 + offsetY, 22, 14);
    ctx.fillRect(28 + offsetX, 76 + offsetY, 20, 14);
    // Bottom bar
    ctx.fillRect(24 + offsetX, 88 + offsetY, 80, 18);
  };

  // Hard charcoal pixel drop shadow
  ctx.fillStyle = "#1E1B4B";
  drawZPath(5, 5);

  // Crisp bright pastel-white/sky letter face
  ctx.fillStyle = "#F5F3FF";
  drawZPath(0, 0);

  // Inner top highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#DDD6FE";
  ctx.fillRect(24, 34, 80, 5);
  ctx.fillRect(24, 100, 80, 5);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  _cachedSleepZ = texture;
  return texture;
}

// Generate a soft radial contact shadow texture with feathered edges (no hard circle!)
export function createSoftShadowTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (_cachedSoftShadow && !isTestEnv) return _cachedSoftShadow;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 128);
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, "rgba(24, 14, 8, 0.52)");
  grad.addColorStop(0.42, "rgba(42, 22, 10, 0.34)");
  grad.addColorStop(0.72, "rgba(74, 34, 12, 0.12)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  _cachedSoftShadow = texture;
  return texture;
}

// Generate a crisp cartoon spiral eye ("@") texture for Dizzy Juro
export function createDizzyEyeTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (_cachedDizzyEye && !isTestEnv) return _cachedDizzyEye;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 128);

  // Soft warm-white disc backing so the spiral stands out on any Juro skin
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 247, 237, 0.92)";
  ctx.fill();

  // Bold dark-espresso Archimedean spiral
  ctx.beginPath();
  const turns = 2.6;
  const steps = 110;
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const angle = p * Math.PI * 2 * turns;
    const r = 4 + p * 44;
    const x = 64 + Math.cos(angle) * r;
    const y = 64 + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#1E140E";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  _cachedDizzyEye = texture;
  return texture;
}

// Generate a cute wavy squiggle ("~") mouth texture for Dizzy Juro
export function createDizzyMouthTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (_cachedDizzyMouth && !isTestEnv) return _cachedDizzyMouth;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 64);
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const p = i / 40;
    const x = 14 + p * 100;
    const y = 32 + Math.sin(p * Math.PI * 3) * 11;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#7C2D12";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  _cachedDizzyMouth = texture;
  return texture;
}

// Generate a crisp golden pixel star sprite orbiting above Juro's head when dizzy
export function createDizzyStarTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (_cachedDizzyStar && !isTestEnv) return _cachedDizzyStar;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, 64, 64);

  const drawStar = (cx: number, cy: number, outerR: number, innerR: number) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  drawStar(32, 32, 26, 12);
  ctx.fillStyle = "#171717";
  ctx.fill();

  drawStar(32, 32, 21, 9.5);
  ctx.fillStyle = "#FDE047";
  ctx.fill();

  drawStar(32, 32, 11, 5.5);
  ctx.fillStyle = "#FFFBEB";
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  _cachedDizzyStar = texture;
  return texture;
}
