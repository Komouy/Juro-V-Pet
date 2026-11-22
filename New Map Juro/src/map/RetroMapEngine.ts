import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import {
  NavGrid,
  WorldPoint,
  buildNavGrid,
  compassDirectionLabel,
  computePathLength,
  findPath,
  worldToGrid,
} from './pathfinding';
import { createPixelTextureSet } from './pixelTextures';
import { RetroAudioEngine } from './retroAudio';
import { BuiltWorld, buildRetroWorld } from './worldBuilder';
import {
  CameraMode,
  LANDMARKS,
  Landmark,
  PixelLevel,
  WeatherMode,
  generateWorldProps,
  isBridgeDeck,
  walkableHeightAt,
} from './worldData';

export interface TelemetrySnapshot {
  playerX: number;
  playerZ: number;
  yaw: number;
  isMoving: boolean;
  currentZone: string;
  nearestLandmark: Landmark | null;
  activeTargetLabel: string | null;
  activeDestination: WorldPoint | null;
  routeWaypoints: WorldPoint[];
  remainingMeters: number;
  etaSeconds: number;
  bearingLabel: string;
  vitals: {
    energy: number;
    hydration: number;
    stamina: number;
    health: number;
  };
  arrivedLandmark: Landmark | null;
}

interface WeatherPalette {
  sky: THREE.Color;
  fogDensity: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  fillIntensity: number;
  envIntensity: number;
  lanternIntensity: number;
  bulbEmissive: number;
  rainOpacity: number;
}

const WEATHER_PRESETS: Record<WeatherMode, WeatherPalette> = {
  cerah: {
    sky: new THREE.Color('#b6dff2'),
    fogDensity: 0.0055,
    sunColor: new THREE.Color('#fff1d4'),
    sunIntensity: 1.35,
    hemiSky: new THREE.Color('#dff2ff'),
    hemiGround: new THREE.Color('#7aa85c'),
    hemiIntensity: 0.68,
    fillIntensity: 0.22,
    envIntensity: 0.22,
    lanternIntensity: 0.2,
    bulbEmissive: 0.35,
    rainOpacity: 0,
  },
  hujan: {
    sky: new THREE.Color('#83a3b8'),
    fogDensity: 0.011,
    sunColor: new THREE.Color('#cfe0ed'),
    sunIntensity: 0.82,
    hemiSky: new THREE.Color('#acc7d9'),
    hemiGround: new THREE.Color('#527058'),
    hemiIntensity: 0.62,
    fillIntensity: 0.18,
    envIntensity: 0.16,
    lanternIntensity: 1.5,
    bulbEmissive: 1.35,
    rainOpacity: 1,
  },
  senja: {
    sky: new THREE.Color('#e89e76'),
    fogDensity: 0.0085,
    sunColor: new THREE.Color('#ffa866'),
    sunIntensity: 1.25,
    hemiSky: new THREE.Color('#ffd0a6'),
    hemiGround: new THREE.Color('#6b5254'),
    hemiIntensity: 0.56,
    fillIntensity: 0.18,
    envIntensity: 0.18,
    lanternIntensity: 1.9,
    bulbEmissive: 1.65,
    rainOpacity: 0,
  },
  malam: {
    sky: new THREE.Color('#131f33'),
    fogDensity: 0.0135,
    sunColor: new THREE.Color('#7ca3eb'),
    sunIntensity: 0.45,
    hemiSky: new THREE.Color('#2d446e'),
    hemiGround: new THREE.Color('#16241f'),
    hemiIntensity: 0.34,
    fillIntensity: 0.1,
    envIntensity: 0.06,
    lanternIntensity: 3.2,
    bulbEmissive: 2.3,
    rainOpacity: 0,
  },
};

const RetroDitherBlendShader = {
  uniforms: {
    tDiffuse: { value: null },
    uPixelSize: { value: 3.0 },
    uDitherStrength: { value: 0.032 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uPixelSize;
    uniform float uDitherStrength;
    varying vec2 vUv;

    float bayer4(vec2 p) {
      int x = int(mod(p.x, 4.0));
      int y = int(mod(p.y, 4.0));
      int idx = y * 4 + x;
      if (idx == 0) return 0.0 / 16.0;
      if (idx == 1) return 8.0 / 16.0;
      if (idx == 2) return 2.0 / 16.0;
      if (idx == 3) return 10.0 / 16.0;
      if (idx == 4) return 12.0 / 16.0;
      if (idx == 5) return 4.0 / 16.0;
      if (idx == 6) return 14.0 / 16.0;
      if (idx == 7) return 6.0 / 16.0;
      if (idx == 8) return 3.0 / 16.0;
      if (idx == 9) return 11.0 / 16.0;
      if (idx == 10) return 1.0 / 16.0;
      if (idx == 11) return 9.0 / 16.0;
      if (idx == 12) return 15.0 / 16.0;
      if (idx == 13) return 7.0 / 16.0;
      if (idx == 14) return 13.0 / 16.0;
      return 5.0 / 16.0;
    }

    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec2 cell = floor(gl_FragCoord.xy / max(1.0, uPixelSize));
      float d = (bayer4(cell) - 0.5) * uDitherStrength;
      vec3 col = clamp(tex.rgb + d, 0.0, 1.0);
      // Subtle retro palette blend warmth & edge contrast
      float dist = length(vUv - 0.5);
      col *= smoothstep(0.95, 0.25, dist * 0.42);
      gl_FragColor = vec4(col, tex.a);
    }
  `,
};

// Pre-allocated math helpers (Zero GC in render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _euler = new THREE.Euler();
const _pointer = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
const _skyColor = new THREE.Color();

export class RetroMapEngine {
  private container: HTMLElement;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private composer: EffectComposer | null = null;
  private pixelPass: RenderPixelatedPass | null = null;
  private ditherPass: ShaderPass | null = null;
  private envRenderTarget: THREE.WebGLRenderTarget;

  private sunLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private fog: THREE.FogExp2;

  private textures: ReturnType<typeof createPixelTextureSet>;
  private world: BuiltWorld;
  private navGrid: NavGrid;
  public audio: RetroAudioEngine;

  private weather: WeatherMode = 'cerah';
  private cameraMode: CameraMode = 'follow';
  private pixelLevel: PixelLevel = 'soft';
  private currentPalette: WeatherPalette;

  private playerPos = { x: -6.2, z: 0.2 };
  private playerYaw = Math.PI * 0.25;
  private walkPhase = 0;
  private stepTimer = 0;
  private moveSpeed = 5.4;

  private route: WorldPoint[] = [];
  private targetLabel: string | null = null;
  private targetLandmark: Landmark | null = null;
  private arrivedLandmark: Landmark | null = null;

  private keysPressed = new Set<string>();
  private virtualInput = { dx: 0, dz: 0 };
  private userCameraOverride = false;
  private cameraOffset = new THREE.Vector3(11.5, 13.5, 13.5);

  private vitals = {
    energy: 84,
    hydration: 78,
    stamina: 92,
    health: 96,
  };

  private pointerDownPos = { x: 0, y: 0 };
  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private lastTelemetryEmit = 0;
  private onTelemetry: (snap: TelemetrySnapshot) => void;
  private onContextLostChange?: (lost: boolean) => void;

  private gpsAnchor: { lat: number; lon: number } | null = null;

  constructor(
    container: HTMLElement,
    onTelemetry: (snap: TelemetrySnapshot) => void,
    onContextLostChange?: (lost: boolean) => void,
  ) {
    this.container = container;
    this.onTelemetry = onTelemetry;
    this.onContextLostChange = onContextLostChange;
    this.audio = new RetroAudioEngine();

    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.currentPalette = {
      sky: WEATHER_PRESETS[this.weather].sky.clone(),
      fogDensity: WEATHER_PRESETS[this.weather].fogDensity,
      sunColor: WEATHER_PRESETS[this.weather].sunColor.clone(),
      sunIntensity: WEATHER_PRESETS[this.weather].sunIntensity,
      hemiSky: WEATHER_PRESETS[this.weather].hemiSky.clone(),
      hemiGround: WEATHER_PRESETS[this.weather].hemiGround.clone(),
      hemiIntensity: WEATHER_PRESETS[this.weather].hemiIntensity,
      fillIntensity: WEATHER_PRESETS[this.weather].fillIntensity,
      envIntensity: WEATHER_PRESETS[this.weather].envIntensity,
      lanternIntensity: WEATHER_PRESETS[this.weather].lanternIntensity,
      bulbEmissive: WEATHER_PRESETS[this.weather].bulbEmissive,
      rainOpacity: WEATHER_PRESETS[this.weather].rainOpacity,
    };

    this.scene.background = this.currentPalette.sky.clone();
    this.fog = new THREE.FogExp2(
      this.currentPalette.sky.getHex(),
      this.currentPalette.fogDensity,
    );
    this.scene.fog = this.fog;

    // Studio Environment Reflection (RoomEnvironment) - calibrated low intensity for matte foliage/ground
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRenderTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    this.scene.environmentIntensity = this.currentPalette.envIntensity;
    pmrem.dispose();

    // Camera
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 180);
    this.camera.position.set(
      this.playerPos.x + this.cameraOffset.x,
      this.cameraOffset.y,
      this.playerPos.z + this.cameraOffset.z,
    );

    // 3-Point Warm/Cool Lighting Rig (<= 1 shadow caster)
    this.hemiLight = new THREE.HemisphereLight(
      this.currentPalette.hemiSky,
      this.currentPalette.hemiGround,
      this.currentPalette.hemiIntensity,
    );
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(
      this.currentPalette.sunColor,
      this.currentPalette.sunIntensity,
    );
    this.sunLight.position.set(22, 30, 14);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 90;
    this.sunLight.shadow.camera.left = -36;
    this.sunLight.shadow.camera.right = 36;
    this.sunLight.shadow.camera.top = 36;
    this.sunLight.shadow.camera.bottom = -36;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight('#9ec8ff', this.currentPalette.fillIntensity);
    this.fillLight.position.set(-20, 14, -18);
    this.scene.add(this.fillLight);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 46;
    this.controls.maxPolarAngle = Math.PI * 0.43;
    this.controls.minPolarAngle = Math.PI * 0.14;
    this.controls.target.set(this.playerPos.x, 1.0, this.playerPos.z);

    this.controls.addEventListener('start', () => {
      if (this.cameraMode === 'orbit') {
        this.userCameraOverride = true;
      }
    });

    // Build Procedural Pixel Textures & Composite World
    this.textures = createPixelTextureSet();
    this.world = buildRetroWorld(this.scene, this.textures, this.isSoftwareGl);
    const propsLayout = generateWorldProps();
    this.navGrid = buildNavGrid(propsLayout.trees, propsLayout.rocks);

    // Post-processing on real GPUs (Soft default, optional crisp/retro pixelation)
    if (!this.isSoftwareGl) {
      this.composer = new EffectComposer(this.renderer);
      this.pixelPass = new RenderPixelatedPass(1, this.scene, this.camera, {
        normalEdgeStrength: 0.0,
        depthEdgeStrength: 0.0,
      });
      this.composer.addPass(this.pixelPass);

      this.ditherPass = new ShaderPass(RetroDitherBlendShader);
      this.ditherPass.uniforms.uPixelSize.value = 1.0;
      this.ditherPass.uniforms.uDitherStrength.value = 0.0;
      this.composer.addPass(this.ditherPass);

      this.composer.addPass(new OutputPass());
      this.renderer.compile(this.scene, this.camera);
    }

    this.applyWeatherImmediate(this.weather);
    this.bindEvents();
    this.emitTelemetry(true);
    this.tick();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  private unbindEvents(): void {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.onContextLostChange?.(true);
  };

  private handleContextRestored = () => {
    this.onContextLostChange?.(false);
  };

  private handleResize = () => {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (
      e.code === 'KeyW' ||
      e.code === 'KeyA' ||
      e.code === 'KeyS' ||
      e.code === 'KeyD' ||
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight'
    ) {
      this.keysPressed.add(e.code);
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysPressed.delete(e.code);
  };

  private handlePointerDown = (e: PointerEvent) => {
    this.pointerDownPos.x = e.clientX;
    this.pointerDownPos.y = e.clientY;
  };

  private handlePointerUp = (e: PointerEvent) => {
    const moveDist = Math.hypot(
      e.clientX - this.pointerDownPos.x,
      e.clientY - this.pointerDownPos.y,
    );
    if (moveDist > 6 || e.button !== 0) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    _raycaster.setFromCamera(_pointer, this.camera);

    // First check landmark hitboxes
    const landmarkHits = _raycaster.intersectObjects(this.world.landmarkHitboxes, false);
    if (landmarkHits.length > 0) {
      const lmId = landmarkHits[0].object.userData.landmarkId as string;
      if (lmId) {
        this.navigateToLandmark(lmId);
        return;
      }
    }

    // Then check walkable terrain, cobble plaza, or bridge deck
    const groundHits = _raycaster.intersectObjects(this.world.walkableClickTargets, false);
    if (groundHits.length > 0) {
      const pt = groundHits[0].point;
      this.navigateToWorldPoint(pt.x, pt.z);
    }
  };

  public setWeather(mode: WeatherMode): void {
    this.weather = mode;
    this.audio.playBlip(mode === 'malam' ? 360 : 540);
    this.audio.setRainAmbiance(mode === 'hujan');
  }

  public setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
    this.userCameraOverride = false;
    this.audio.playBlip(620);
    if (mode === 'isometric') {
      this.cameraOffset.set(17.5, 19.0, 17.5);
    } else if (mode === 'follow') {
      this.cameraOffset.set(11.5, 13.5, 13.5);
    }
  }

  public setPixelLevel(level: PixelLevel): void {
    this.pixelLevel = level;
    this.audio.playBlip(680);
    if (!this.pixelPass || !this.ditherPass) return;

    if (level === 'soft') {
      this.pixelPass.setPixelSize(1);
      this.pixelPass.normalEdgeStrength = 0.0;
      this.pixelPass.depthEdgeStrength = 0.0;
      this.ditherPass.uniforms.uPixelSize.value = 1.0;
      this.ditherPass.uniforms.uDitherStrength.value = 0.0;
    } else if (level === 'crisp') {
      this.pixelPass.setPixelSize(2);
      this.pixelPass.normalEdgeStrength = 0.08;
      this.pixelPass.depthEdgeStrength = 0.14;
      this.ditherPass.uniforms.uPixelSize.value = 2.0;
      this.ditherPass.uniforms.uDitherStrength.value = 0.012;
    } else {
      this.pixelPass.setPixelSize(3);
      this.pixelPass.normalEdgeStrength = 0.16;
      this.pixelPass.depthEdgeStrength = 0.24;
      this.ditherPass.uniforms.uPixelSize.value = 3.0;
      this.ditherPass.uniforms.uDitherStrength.value = 0.022;
    }
  }

  public setVirtualInput(dx: number, dz: number): void {
    this.virtualInput.dx = dx;
    this.virtualInput.dz = dz;
  }

  public navigateToLandmark(id: string): void {
    const lm = LANDMARKS.find((l) => l.id === id);
    if (!lm) return;
    this.targetLandmark = lm;
    this.arrivedLandmark = null;
    this.navigateToWorldPoint(lm.entryPoint.x, lm.entryPoint.z, lm.name, lm);
  }

  public navigateToWorldPoint(
    x: number,
    z: number,
    label?: string,
    landmark: Landmark | null = null,
  ): void {
    const clampedX = Math.max(-32, Math.min(32, x));
    const clampedZ = Math.max(-32, Math.min(32, z));

    const path = findPath(this.navGrid, this.playerPos, { x: clampedX, z: clampedZ });
    if (path.length === 0) return;

    this.route = path;
    this.targetLandmark = landmark;
    this.arrivedLandmark = null;
    this.targetLabel =
      label ??
      `Titik (${Math.round(clampedX)}, ${Math.round(clampedZ)})`;
    this.audio.playBlip(580, 0.07);
    this.updateRouteBreadcrumbs();
    this.emitTelemetry(true);
  }

  public cancelNavigation(): void {
    this.route = [];
    this.targetLabel = null;
    this.targetLandmark = null;
    this.updateRouteBreadcrumbs();
    this.emitTelemetry(true);
  }

  public focusCameraOnPlayer(): void {
    this.userCameraOverride = false;
    if (this.cameraMode === 'orbit') {
      this.cameraMode = 'follow';
    }
    this.audio.playBlip(640);
  }

  public syncRealGps(lat: number, lon: number): void {
    if (!this.gpsAnchor) {
      this.gpsAnchor = { lat, lon };
      return;
    }
    // Convert lat/lon delta to approximate local meters (scaled down 0.25x for cozy valley)
    const dNorth = (lat - this.gpsAnchor.lat) * 111320 * 0.25;
    const dEast =
      (lon - this.gpsAnchor.lon) *
      111320 *
      Math.cos((lat * Math.PI) / 180) *
      0.25;
    this.gpsAnchor = { lat, lon };

    if (Math.hypot(dEast, dNorth) > 0.15) {
      const targetX = Math.max(-31, Math.min(31, this.playerPos.x + dEast));
      const targetZ = Math.max(-31, Math.min(31, this.playerPos.z - dNorth));
      this.navigateToWorldPoint(targetX, targetZ, 'Sinkronisasi GPS');
    }
  }

  public resetGpsAnchor(): void {
    this.gpsAnchor = null;
  }

  private applyWeatherImmediate(mode: WeatherMode): void {
    const p = WEATHER_PRESETS[mode];
    this.fog.color.copy(p.sky);
    this.fog.density = p.fogDensity;
    (this.scene.background as THREE.Color).copy(p.sky);
    this.sunLight.color.copy(p.sunColor);
    this.sunLight.intensity = p.sunIntensity;
    this.hemiLight.color.copy(p.hemiSky);
    this.hemiLight.groundColor.copy(p.hemiGround);
    this.hemiLight.intensity = p.hemiIntensity;
    this.fillLight.intensity = p.fillIntensity;
    this.scene.environmentIntensity = p.envIntensity;
  }

  private updateWeatherBlend(dt: number): void {
    const target = WEATHER_PRESETS[this.weather];
    const cur = this.currentPalette;
    const lambda = 2.5;

    const k = 1 - Math.exp(-lambda * dt);
    cur.sky.lerp(target.sky, k);
    cur.sunColor.lerp(target.sunColor, k);
    cur.hemiSky.lerp(target.hemiSky, k);
    cur.hemiGround.lerp(target.hemiGround, k);

    cur.fogDensity = THREE.MathUtils.damp(cur.fogDensity, target.fogDensity, lambda, dt);
    cur.sunIntensity = THREE.MathUtils.damp(cur.sunIntensity, target.sunIntensity, lambda, dt);
    cur.hemiIntensity = THREE.MathUtils.damp(cur.hemiIntensity, target.hemiIntensity, lambda, dt);
    cur.fillIntensity = THREE.MathUtils.damp(cur.fillIntensity, target.fillIntensity, lambda, dt);
    cur.envIntensity = THREE.MathUtils.damp(cur.envIntensity, target.envIntensity, lambda, dt);
    cur.lanternIntensity = THREE.MathUtils.damp(
      cur.lanternIntensity,
      target.lanternIntensity,
      lambda,
      dt,
    );
    cur.bulbEmissive = THREE.MathUtils.damp(cur.bulbEmissive, target.bulbEmissive, lambda, dt);
    cur.rainOpacity = THREE.MathUtils.damp(cur.rainOpacity, target.rainOpacity, lambda * 1.4, dt);

    _skyColor.copy(cur.sky);
    (this.scene.background as THREE.Color).copy(_skyColor);
    this.fog.color.copy(_skyColor);
    this.fog.density = cur.fogDensity;

    this.sunLight.color.copy(cur.sunColor);
    this.sunLight.intensity = cur.sunIntensity;
    this.hemiLight.color.copy(cur.hemiSky);
    this.hemiLight.groundColor.copy(cur.hemiGround);
    this.hemiLight.intensity = cur.hemiIntensity;
    this.fillLight.intensity = cur.fillIntensity;
    this.scene.environmentIntensity = cur.envIntensity;

    for (const light of this.world.lanternLights) {
      light.intensity = cur.lanternIntensity;
    }
    for (const bulb of this.world.lanternBulbs) {
      const mat = bulb.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = cur.bulbEmissive;
    }
  }

  private updateRain(dt: number, elapsed: number): void {
    const rain = this.world.rain;
    const opacity = this.currentPalette.rainOpacity;
    const active = opacity > 0.04;
    rain.mesh.visible = active;

    if (active) {
      const mat = rain.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.56 * opacity;

      for (let i = 0; i < rain.count; i++) {
        const i3 = i * 3;
        rain.positions[i3 + 1] -= rain.speeds[i] * dt;
        rain.positions[i3] -= 1.8 * dt;
        if (rain.positions[i3 + 1] < -0.5) {
          rain.positions[i3 + 1] = 17 + (i % 5);
          rain.positions[i3] = this.playerPos.x + (((i * 73) % 50) - 25);
          rain.positions[i3 + 2] = this.playerPos.z + (((i * 137) % 50) - 25);
        }
        _v1.set(rain.positions[i3], rain.positions[i3 + 1], rain.positions[i3 + 2]);
        _euler.set(0, 0, -0.1);
        _quat.setFromEuler(_euler);
        _scale.set(1, 1, 1);
        _mat4.compose(_v1, _quat, _scale);
        rain.mesh.setMatrixAt(i, _mat4);
      }
      rain.mesh.instanceMatrix.needsUpdate = true;
    }

    // Water ripples (always gentle, stronger in rain)
    for (let r = 0; r < rain.ripples.length; r++) {
      const rm = rain.ripples[r];
      const showRipple = active || r < 4;
      rm.visible = showRipple;
      if (!showRipple) continue;

      const phase = (rain.ripplePhases[r] + elapsed * (active ? 0.95 : 0.42)) % 1;
      const s = 0.35 + phase * 2.1;
      rm.scale.set(s, s, 1);
      const rMat = rm.material as THREE.MeshBasicMaterial;
      rMat.opacity = (1 - phase) * (active ? 0.55 : 0.25);
    }
  }

  private updateRouteBreadcrumbs(): void {
    const nv = this.world.navVisuals;
    if (this.route.length === 0) {
      nv.breadcrumbs.count = 0;
      nv.beaconGroup.visible = false;
      return;
    }

    // Place evenly spaced markers along remaining route segments
    const samples: WorldPoint[] = [];
    let prev = this.playerPos;
    for (const pt of this.route) {
      const segLen = Math.hypot(pt.x - prev.x, pt.z - prev.z);
      const count = Math.max(1, Math.floor(segLen / 1.15));
      for (let i = 1; i <= count; i++) {
        if (samples.length >= nv.maxBreadcrumbs) break;
        const t = i / count;
        samples.push({
          x: prev.x + (pt.x - prev.x) * t,
          z: prev.z + (pt.z - prev.z) * t,
        });
      }
      prev = pt;
    }

    nv.breadcrumbs.count = samples.length;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const y = walkableHeightAt(s.x, s.z) + 0.28;
      _v1.set(s.x, y, s.z);
      _euler.set(0, i * 0.4, 0);
      _quat.setFromEuler(_euler);
      _scale.set(1, 1, 1);
      _mat4.compose(_v1, _quat, _scale);
      nv.breadcrumbs.setMatrixAt(i, _mat4);
    }
    nv.breadcrumbs.instanceMatrix.needsUpdate = true;

    const dest = this.route[this.route.length - 1];
    nv.beaconGroup.visible = true;
    nv.beaconGroup.position.set(dest.x, walkableHeightAt(dest.x, dest.z), dest.z);
  }

  private canStepTo(x: number, z: number): boolean {
    if (Math.abs(x) > 32.0 || Math.abs(z) > 32.0) return false;
    const g = worldToGrid(x, z);
    return this.navGrid.walkable[g.gz * this.navGrid.size + g.gx] === 1;
  }

  private updateMovement(dt: number, elapsed: number): boolean {
    let manualDx = this.virtualInput.dx;
    let manualDz = this.virtualInput.dz;

    if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp')) manualDz -= 1;
    if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) manualDz += 1;
    if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft')) manualDx -= 1;
    if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) manualDx += 1;

    let isMoving = false;
    let moveDirX = 0;
    let moveDirZ = 0;

    if (manualDx !== 0 || manualDz !== 0) {
      // Manual control overrides active A* route
      if (this.route.length > 0) {
        this.cancelNavigation();
      }
      const len = Math.hypot(manualDx, manualDz);
      moveDirX = manualDx / len;
      moveDirZ = manualDz / len;

      const step = this.moveSpeed * dt;
      const nx = this.playerPos.x + moveDirX * step;
      const nz = this.playerPos.z + moveDirZ * step;

      if (this.canStepTo(nx, nz)) {
        this.playerPos.x = nx;
        this.playerPos.z = nz;
        isMoving = true;
      } else if (this.canStepTo(nx, this.playerPos.z)) {
        this.playerPos.x = nx;
        isMoving = true;
      } else if (this.canStepTo(this.playerPos.x, nz)) {
        this.playerPos.z = nz;
        isMoving = true;
      }
    } else if (this.route.length > 0) {
      const target = this.route[0];
      const dx = target.x - this.playerPos.x;
      const dz = target.z - this.playerPos.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.28) {
        this.route.shift();
        if (this.route.length === 0) {
          this.audio.playArrivalChime();
          this.arrivedLandmark = this.targetLandmark;
          this.targetLabel = null;
          this.targetLandmark = null;
        }
        this.updateRouteBreadcrumbs();
      } else {
        moveDirX = dx / dist;
        moveDirZ = dz / dist;
        const step = Math.min(dist, this.moveSpeed * dt);
        this.playerPos.x += moveDirX * step;
        this.playerPos.z += moveDirZ * step;
        isMoving = true;

        // Periodically refresh breadcrumbs as player consumes path
        if (Math.floor(elapsed * 5) !== Math.floor((elapsed - dt) * 5)) {
          this.updateRouteBreadcrumbs();
        }
      }
    }

    // Update Explorer 3D Transform & Limb Animation
    const rig = this.world.explorer;
    const py = walkableHeightAt(this.playerPos.x, this.playerPos.z);
    rig.root.position.set(this.playerPos.x, py, this.playerPos.z);

    if (isMoving) {
      const targetYaw = Math.atan2(moveDirX, moveDirZ);
      // Shortest angular interpolation
      let diff = targetYaw - this.playerYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.playerYaw += diff * (1 - Math.exp(-12 * dt));

      this.walkPhase += dt * 13.5;
      const swing = Math.sin(this.walkPhase);
      rig.legL.rotation.x = swing * 0.65;
      rig.legR.rotation.x = -swing * 0.65;
      rig.armL.rotation.x = -swing * 0.55;
      rig.armR.rotation.x = swing * 0.55;
      rig.bodyGroup.position.y = Math.abs(swing) * 0.1;
      rig.hatGroup.rotation.z = Math.cos(this.walkPhase) * 0.05;

      this.stepTimer += dt;
      if (this.stepTimer >= 0.3) {
        this.stepTimer = 0;
        this.audio.playFootstep(isBridgeDeck(this.playerPos.x, this.playerPos.z));
      }
    } else {
      // Gentle idle breathing
      rig.legL.rotation.x = THREE.MathUtils.damp(rig.legL.rotation.x, 0, 10, dt);
      rig.legR.rotation.x = THREE.MathUtils.damp(rig.legR.rotation.x, 0, 10, dt);
      rig.armL.rotation.x = THREE.MathUtils.damp(rig.armL.rotation.x, 0, 10, dt);
      rig.armR.rotation.x = THREE.MathUtils.damp(rig.armR.rotation.x, 0, 10, dt);
      rig.bodyGroup.position.y = Math.sin(elapsed * 2.8) * 0.03;
      rig.hatGroup.rotation.z = THREE.MathUtils.damp(rig.hatGroup.rotation.z, 0, 8, dt);
    }

    rig.root.rotation.y = this.playerYaw;

    // Animate destination beacon
    const nv = this.world.navVisuals;
    if (nv.beaconGroup.visible) {
      nv.beaconDiamond.rotation.y = elapsed * 2.6;
      nv.beaconDiamond.position.y = 1.4 + Math.sin(elapsed * 4.0) * 0.2;
      const ringPulse = 0.88 + Math.sin(elapsed * 4.5) * 0.14;
      nv.beaconRing.scale.set(ringPulse, ringPulse, 1);
    }

    // Update vitals gently based on activity & weather/landmarks
    const nearCafeOrLounge =
      Math.hypot(this.playerPos.x - 16.5, this.playerPos.z + 2.2) < 5.5 ||
      Math.hypot(this.playerPos.x + 15, this.playerPos.z - 4) < 5.0;

    if (isMoving) {
      this.vitals.stamina = Math.max(38, this.vitals.stamina - dt * 2.4);
      this.vitals.hydration = Math.max(
        30,
        this.vitals.hydration - dt * (this.weather === 'hujan' ? -1.4 : 0.7),
      );
    } else {
      this.vitals.stamina = Math.min(100, this.vitals.stamina + dt * 6.5);
    }

    if (nearCafeOrLounge) {
      this.vitals.energy = Math.min(100, this.vitals.energy + dt * 5.0);
      this.vitals.hydration = Math.min(100, this.vitals.hydration + dt * 4.0);
      this.vitals.health = Math.min(100, this.vitals.health + dt * 2.5);
    } else if (this.weather === 'hujan') {
      this.vitals.hydration = Math.min(100, this.vitals.hydration + dt * 1.2);
    }

    return isMoving;
  }

  private updateCamera(dt: number): void {
    const py = walkableHeightAt(this.playerPos.x, this.playerPos.z);

    if (this.cameraMode !== 'orbit' || !this.userCameraOverride) {
      _v1.set(this.playerPos.x, py + 1.0, this.playerPos.z);
      this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, _v1.x, 6.5, dt);
      this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, _v1.y, 6.5, dt);
      this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, _v1.z, 6.5, dt);

      if (this.cameraMode === 'follow' || this.cameraMode === 'isometric') {
        _v2.set(
          this.playerPos.x + this.cameraOffset.x,
          py + this.cameraOffset.y,
          this.playerPos.z + this.cameraOffset.z,
        );
        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _v2.x, 4.5, dt);
        this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _v2.y, 4.5, dt);
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _v2.z, 4.5, dt);
      }
    }

    this.controls.update();
  }

  private updateEnvironmentAnimations(dt: number, elapsed: number): void {
    // Scroll water pixel caustics
    this.textures.waterPixel.offset.x = (elapsed * 0.05) % 1;
    this.textures.waterPixel.offset.y = (elapsed * 0.05) % 1;

    // Swim koi fish & bobbing ducklings along ellipses
    for (const koi of this.world.kois) {
      const ang = elapsed * koi.speed + koi.phase;
      const nx = koi.centerX + Math.cos(ang) * koi.radiusX;
      const nz = koi.centerZ + Math.sin(ang) * koi.radiusZ;
      const dx = -Math.sin(ang) * koi.radiusX;
      const dz = Math.cos(ang) * koi.radiusZ;
      const yPos = koi.isDuck
        ? -0.25 + Math.sin(elapsed * 3.2 + koi.phase) * 0.022
        : -0.37;
      koi.group.position.set(nx, yPos, nz);
      koi.group.rotation.y = Math.atan2(dx, dz);
      if (koi.isDuck) {
        koi.group.rotation.z = Math.sin(elapsed * 2.8 + koi.phase) * 0.05;
      } else {
        koi.tail.rotation.y = Math.sin(elapsed * 10 + koi.phase) * 0.42;
      }
    }

    // Subtle flicker on lantern lights in rain/dusk/night
    if (this.weather !== 'cerah') {
      this.world.lanternLights.forEach((l, i) => {
        l.intensity =
          this.currentPalette.lanternIntensity +
          Math.sin(elapsed * 6.5 + i * 1.7) * 0.12;
      });
    }

    void dt;
  }

  private getNearestLandmark(): { landmark: Landmark | null; dist: number } {
    let best: Landmark | null = null;
    let bestDist = Infinity;
    for (const lm of LANDMARKS) {
      const d = Math.hypot(
        this.playerPos.x - lm.position.x,
        this.playerPos.z - lm.position.z,
      );
      if (d < bestDist) {
        bestDist = d;
        best = lm;
      }
    }
    return { landmark: best, dist: bestDist };
  }

  private emitTelemetry(force = false): void {
    const now = performance.now();
    if (!force && now - this.lastTelemetryEmit < 85) return;
    this.lastTelemetryEmit = now;

    const { landmark, dist } = this.getNearestLandmark();
    let zone = 'Padang Rumput Tengah';
    if (isBridgeDeck(this.playerPos.x, this.playerPos.z)) {
      zone = 'Jembatan Kayu';
    } else if (landmark && dist < 7.2) {
      zone = landmark.name;
    }

    const remainingMeters =
      this.route.length > 0
        ? computePathLength(this.playerPos, this.route)
        : 0;
    const etaSeconds = remainingMeters / this.moveSpeed;

    let bearingLabel = 'U';
    if (this.route.length > 0) {
      const dest = this.route[this.route.length - 1];
      bearingLabel = compassDirectionLabel(
        dest.x - this.playerPos.x,
        dest.z - this.playerPos.z,
      );
    } else {
      bearingLabel = compassDirectionLabel(
        Math.sin(this.playerYaw),
        Math.cos(this.playerYaw),
      );
    }

    this.onTelemetry({
      playerX: this.playerPos.x,
      playerZ: this.playerPos.z,
      yaw: this.playerYaw,
      isMoving: this.route.length > 0 || this.keysPressed.size > 0 || this.virtualInput.dx !== 0 || this.virtualInput.dz !== 0,
      currentZone: zone,
      nearestLandmark: landmark && dist < 7.5 ? landmark : null,
      activeTargetLabel: this.targetLabel,
      activeDestination:
        this.route.length > 0 ? this.route[this.route.length - 1] : null,
      routeWaypoints: this.route.slice(),
      remainingMeters,
      etaSeconds,
      bearingLabel,
      vitals: {
        energy: Math.round(this.vitals.energy),
        hydration: Math.round(this.vitals.hydration),
        stamina: Math.round(this.vitals.stamina),
        health: Math.round(this.vitals.health),
      },
      arrivedLandmark: this.arrivedLandmark,
    });
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.disposed) return;

    const dt = Math.min(0.05, this.clock.getDelta());
    const elapsed = this.clock.elapsedTime;

    this.updateMovement(dt, elapsed);
    this.updateWeatherBlend(dt);
    this.updateRain(dt, elapsed);
    this.updateEnvironmentAnimations(dt, elapsed);
    this.updateCamera(dt);
    this.emitTelemetry(false);

    if (this.composer && !this.isSoftwareGl) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.unbindEvents();
    this.audio.dispose();
    this.controls.dispose();
    this.world.dispose();
    this.textures.dispose();
    this.envRenderTarget.dispose();
    if (this.composer) {
      this.composer.dispose();
    }
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
