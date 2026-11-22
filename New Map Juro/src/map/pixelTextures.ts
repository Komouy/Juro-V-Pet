import * as THREE from 'three';

export interface PixelTextureSet {
  grass: THREE.CanvasTexture;
  cobble: THREE.CanvasTexture;
  woodPlank: THREE.CanvasTexture;
  bark: THREE.CanvasTexture;
  foliagePine: THREE.CanvasTexture;
  foliageRound: THREE.CanvasTexture;
  terracottaRoof: THREE.CanvasTexture;
  cafeWall: THREE.CanvasTexture;
  awningStripe: THREE.CanvasTexture;
  stoneBrick: THREE.CanvasTexture;
  sandstoneTile: THREE.CanvasTexture;
  mushroomCap: THREE.CanvasTexture;
  waterPixel: THREE.CanvasTexture;
  signTunnel: THREE.CanvasTexture;
  signCafe: THREE.CanvasTexture;
  signPost: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

function makeSoftCanvas(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  repeatX = 1,
  repeatY = 1,
  clamp = false,
  pixelated = false,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = !pixelated;
  draw(ctx);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = pixelated ? THREE.NearestFilter : THREE.LinearFilter;
  tex.minFilter = pixelated ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = !pixelated;
  tex.wrapS = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

export function createPixelTextureSet(): PixelTextureSet {
  const created: THREE.CanvasTexture[] = [];
  const track = (t: THREE.CanvasTexture) => {
    created.push(t);
    return t;
  };

  // 1. Soft sunlit pastel meadow (clean, airy, zero muddy dark noise)
  const grass = track(
    makeSoftCanvas(
      128,
      128,
      (ctx) => {
        ctx.fillStyle = '#f8fbf2';
        ctx.fillRect(0, 0, 128, 128);
        // Very subtle warm/pastel speckles (blended with vertex colors!)
        ctx.fillStyle = 'rgba(218, 236, 198, 0.45)';
        for (let i = 0; i < 45; i++) {
          const x = (i * 53) % 120;
          const y = (i * 89) % 120;
          ctx.beginPath();
          ctx.ellipse(x + 4, y + 4, 6, 3, 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        // Soft pastel tiny daisies
        ctx.fillStyle = 'rgba(255, 250, 224, 0.85)';
        ctx.beginPath();
        ctx.arc(28, 34, 2, 0, Math.PI * 2);
        ctx.arc(88, 96, 2, 0, Math.PI * 2);
        ctx.fill();
      },
      14,
      14,
    ),
  );

  // 2. Soft warm cobblestone / sandstone plaza
  const cobble = track(
    makeSoftCanvas(
      64,
      64,
      (ctx) => {
        ctx.fillStyle = '#dcd0ba';
        ctx.fillRect(0, 0, 64, 64);
        const stones = [
          [4, 4, 24, 20, '#eee4d0'],
          [32, 4, 28, 18, '#e8dcc6'],
          [4, 28, 18, 16, '#e5d9c2'],
          [26, 26, 34, 20, '#efe6d4'],
          [4, 48, 28, 12, '#e9dec8'],
          [36, 48, 24, 12, '#e2d5be'],
        ] as const;
        for (const [x, y, w, h, col] of stones) {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 4);
          ctx.fill();
        }
      },
      10,
      10,
    ),
  );

  // 3. Warm honey-oak timber planks
  const woodPlank = track(
    makeSoftCanvas(
      64,
      64,
      (ctx) => {
        ctx.fillStyle = '#b4743f';
        ctx.fillRect(0, 0, 64, 64);
        for (let row = 0; row < 4; row++) {
          const y = row * 16;
          ctx.fillStyle = row % 2 === 0 ? '#cc8a52' : '#c17f48';
          ctx.fillRect(0, y + 1, 64, 13);
          ctx.fillStyle = '#dba06a';
          ctx.fillRect(0, y + 2, 64, 3);
          ctx.fillStyle = '#8b5428';
          ctx.fillRect(0, y + 14, 64, 2);
        }
      },
      2,
      2,
    ),
  );

  // 4. Smooth warm tree bark
  const bark = track(
    makeSoftCanvas(64, 64, (ctx) => {
      ctx.fillStyle = '#9c5c2b';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#b06d38';
      ctx.fillRect(8, 0, 12, 64);
      ctx.fillRect(36, 0, 10, 64);
      ctx.fillStyle = '#82491f';
      ctx.fillRect(24, 0, 6, 64);
      ctx.fillRect(52, 0, 6, 64);
    }),
  );

  // 5. Soft layered pine foliage
  const foliagePine = track(
    makeSoftCanvas(64, 64, (ctx) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 64);
      grad.addColorStop(0, '#4ea64e');
      grad.addColorStop(1, '#2f7838');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = 'rgba(130, 212, 106, 0.25)';
      ctx.beginPath();
      ctx.arc(20, 20, 14, 0, Math.PI * 2);
      ctx.arc(48, 38, 12, 0, Math.PI * 2);
      ctx.fill();
    }),
  );

  // 6. Soft sunlit broadleaf foliage
  const foliageRound = track(
    makeSoftCanvas(64, 64, (ctx) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 64);
      grad.addColorStop(0, '#85d158');
      grad.addColorStop(1, '#4d9b42');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = 'rgba(205, 244, 138, 0.28)';
      ctx.beginPath();
      ctx.arc(24, 18, 14, 0, Math.PI * 2);
      ctx.arc(46, 32, 11, 0, Math.PI * 2);
      ctx.fill();
    }),
  );

  // 7. Soft pastel terracotta roof
  const terracottaRoof = track(
    makeSoftCanvas(
      64,
      64,
      (ctx) => {
        ctx.fillStyle = '#e06c4b';
        ctx.fillRect(0, 0, 64, 64);
        for (let row = 0; row < 4; row++) {
          const y = row * 16;
          ctx.fillStyle = '#ee8260';
          ctx.fillRect(0, y + 1, 64, 10);
          ctx.fillStyle = '#c45536';
          ctx.fillRect(0, y + 13, 64, 3);
        }
      },
      2,
      2,
    ),
  );

  // 8. Soft cream cafe wall
  const cafeWall = track(
    makeSoftCanvas(64, 64, (ctx) => {
      ctx.fillStyle = '#fbf0da';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#b4743f';
      ctx.fillRect(0, 54, 64, 10);
    }),
  );

  // 9. Pastel coral & cream striped awning
  const awningStripe = track(
    makeSoftCanvas(
      64,
      64,
      (ctx) => {
        for (let x = 0; x < 64; x += 16) {
          ctx.fillStyle = (x / 16) % 2 === 0 ? '#eb6b56' : '#fff7e6';
          ctx.fillRect(x, 0, 16, 64);
        }
      },
      2,
      1,
    ),
  );

  // 10. Soft warm slate stone brick
  const stoneBrick = track(
    makeSoftCanvas(
      64,
      64,
      (ctx) => {
        ctx.fillStyle = '#8b93a1';
        ctx.fillRect(0, 0, 64, 64);
        for (let row = 0; row < 4; row++) {
          const y = row * 16;
          const off = (row % 2) * 16;
          for (let x = -16; x < 64; x += 32) {
            ctx.fillStyle = '#a4acb8';
            ctx.beginPath();
            ctx.roundRect(x + off + 2, y + 2, 28, 12, 3);
            ctx.fill();
          }
        }
      },
      2,
      2,
    ),
  );

  // 11. Warm sandstone courtyard tiles
  const sandstoneTile = track(
    makeSoftCanvas(
      64,
      64,
      (ctx) => {
        ctx.fillStyle = '#f3dcb0';
        ctx.fillRect(0, 0, 64, 64);
        ctx.strokeStyle = '#dfbe86';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, 28, 28);
        ctx.strokeRect(34, 2, 28, 28);
        ctx.strokeRect(2, 34, 28, 28);
        ctx.strokeRect(34, 34, 28, 28);
      },
      3,
      3,
    ),
  );

  // 12. Soft coral-red mushroom cap with cream spots
  const mushroomCap = track(
    makeSoftCanvas(64, 64, (ctx) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 64);
      grad.addColorStop(0, '#f26b5e');
      grad.addColorStop(1, '#d94d43');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);

      ctx.fillStyle = '#fff5e0';
      const spots = [
        [14, 16, 7],
        [42, 14, 8],
        [26, 36, 6],
        [52, 42, 6],
        [10, 48, 5],
      ] as const;
      for (const [cx, cy, r] of spots) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }),
  );

  // 13. Soft sky-blue pond water with gentle ripples
  const waterPixel = track(
    makeSoftCanvas(
      128,
      128,
      (ctx) => {
        ctx.fillStyle = '#4baee8';
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = 'rgba(130, 212, 255, 0.45)';
        ctx.beginPath();
        ctx.roundRect(12, 20, 28, 6, 3);
        ctx.roundRect(72, 54, 34, 6, 3);
        ctx.roundRect(26, 94, 24, 5, 3);
        ctx.fill();
        ctx.fillStyle = 'rgba(230, 248, 255, 0.5)';
        ctx.beginPath();
        ctx.roundRect(18, 21, 12, 3, 2);
        ctx.roundRect(80, 55, 14, 3, 2);
        ctx.fill();
      },
      5,
      5,
    ),
  );

  // 14. Signs (keep crisp retro legibility)
  const signTunnel = track(
    makeSoftCanvas(
      128,
      32,
      (ctx) => {
        ctx.fillStyle = '#473629';
        ctx.fillRect(0, 0, 128, 32);
        ctx.strokeStyle = '#f2c15a';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, 124, 28);
        ctx.fillStyle = '#ffe599';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TEROWONGAN', 64, 17);
      },
      1,
      1,
      true,
      false,
    ),
  );

  const signCafe = track(
    makeSoftCanvas(
      128,
      32,
      (ctx) => {
        ctx.fillStyle = '#633926';
        ctx.fillRect(0, 0, 128, 32);
        ctx.strokeStyle = '#fae8cb';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, 124, 28);
        ctx.fillStyle = '#ffdf9e';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('KAFE SENJA', 64, 17);
      },
      1,
      1,
      true,
      false,
    ),
  );

  const signPost = track(
    makeSoftCanvas(
      96,
      32,
      (ctx) => {
        ctx.fillStyle = '#b4743f';
        ctx.fillRect(0, 0, 96, 32);
        ctx.fillStyle = '#8b5428';
        ctx.fillRect(0, 0, 96, 4);
        ctx.fillRect(0, 28, 96, 4);
        ctx.fillStyle = '#fff6e0';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('POS PANDANG', 48, 17);
      },
      1,
      1,
      true,
      false,
    ),
  );

  // 17. Soft contact shadow disc
  const contactShadowCanvas = document.createElement('canvas');
  contactShadowCanvas.width = 64;
  contactShadowCanvas.height = 64;
  const sctx = contactShadowCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(38, 62, 34, 0.34)');
  grad.addColorStop(0.65, 'rgba(38, 62, 34, 0.12)');
  grad.addColorStop(1, 'rgba(38, 62, 34, 0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 64, 64);
  const contactShadow = track(new THREE.CanvasTexture(contactShadowCanvas));
  contactShadow.colorSpace = THREE.SRGBColorSpace;
  contactShadow.needsUpdate = true;

  return {
    grass,
    cobble,
    woodPlank,
    bark,
    foliagePine,
    foliageRound,
    terracottaRoof,
    cafeWall,
    awningStripe,
    stoneBrick,
    sandstoneTile,
    mushroomCap,
    waterPixel,
    signTunnel,
    signCafe,
    signPost,
    contactShadow,
    dispose: () => {
      for (const tex of created) {
        tex.dispose();
      }
    },
  };
}
