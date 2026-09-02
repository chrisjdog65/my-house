/**
 * Renderer + main loop.
 */
import * as THREE from 'three';
import { settings } from './Settings';
import { PostFX } from '../graphics/PostFX';

export class Engine {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  postfx!: PostFX;
  private lastTime = performance.now();
  lastStats = { calls: 0, triangles: 0 };
  /** enable dynamic resolution scaling (disabled for deterministic screenshots) */
  adaptive = true;
  private updaters: ((dt: number, t: number) => void)[] = [];
  private running = false;
  private frames = 0;
  private fpsAccum = 0;
  fps = 60;
  time = 0;
  private renderScale = 1;
  onFps?: (fps: number) => void;

  constructor(readonly canvas: HTMLCanvasElement, opts: { preserveDrawingBuffer?: boolean } = {}) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      alpha: false,
      logarithmicDepthBuffer: false,
      preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.75;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.info.autoReset = false;
    this.renderer.setClearColor(0x0b0f14, 1);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(settings.get('fov'), 1, 0.08, 400);
    this.applyResolution();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    settings.onChange((s, k) => {
      if (k === 'fov' || k === null) { this.camera.fov = s.fov; this.camera.updateProjectionMatrix(); }
      if (k === 'resolutionScale' || k === 'quality' || k === null) { this.applyResolution(); this.resize(); }
      if (k === 'shadows' || k === null) { this.renderer.shadowMap.enabled = s.shadows; this.scene.traverse((o) => { if ((o as any).material) (o as any).material.needsUpdate = true; }); }
    });
  }

  initPostFX() {
    this.postfx = new PostFX(this.renderer, this.scene, this.camera);
    this.resize();
  }

  /**
   * Dynamic resolution multiplier applied on top of the user's render scale to hold a smooth frame
   * rate. The floor is deliberately shallow: dropping to 0.6 bought frames by making the whole
   * picture soft, which is the "foggy" look this is meant to avoid. Frames come from rendering less
   * work, not from resolving it more coarsely.
   */
  private dynamicScale = 1;
  private slowFrames = 0;
  private fastTime = 0;

  private applyResolution() {
    this.renderScale = settings.get('resolutionScale');
    // One render pixel per CSS pixel, not per device pixel. Following devicePixelRatio up to 2 on a
    // HiDPI screen quadruples every pixel the frame touches -- main pass, AO, bloom and SMAA all
    // scale with it -- for a sharpness gain SMAA already covers most of. Anyone with headroom can
    // supersample again by raising resolutionScale (the ultra preset sets it to 1.5).
    const dpr = Math.min(window.devicePixelRatio || 1, 1) * this.renderScale * this.dynamicScale;
    this.renderer.setPixelRatio(Math.max(0.5, Math.min(3, dpr)));
  }

  /** Lower the internal resolution when frames are consistently slow; raise it back when there is headroom. */
  private adaptResolution(dt: number) {
    if (dt > 1 / 40) { this.slowFrames++; this.fastTime = 0; } else { this.slowFrames = Math.max(0, this.slowFrames - 1); }
    if (dt < 1 / 70) this.fastTime += dt; else this.fastTime = 0;
    if (this.slowFrames > 45 && this.dynamicScale > 0.85) {
      this.dynamicScale = Math.max(0.85, this.dynamicScale - 0.05);
      this.slowFrames = 0;
      this.applyResolution(); this.resize();
    } else if (this.fastTime > 6 && this.dynamicScale < 1) {
      this.dynamicScale = Math.min(1, this.dynamicScale + 0.05);
      this.fastTime = 0;
      this.applyResolution(); this.resize();
    }
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.postfx?.setSize(w, h);
  }

  onUpdate(fn: (dt: number, t: number) => void) {
    this.updaters.push(fn);
    return () => { const i = this.updaters.indexOf(fn); if (i >= 0) this.updaters.splice(i, 1); };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = () => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      this.time += dt;
      if (this.adaptive) this.adaptResolution(dt);
      for (const u of this.updaters) u(dt, this.time);
      this.lastStats = { calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles };
      this.renderer.info.reset();
      if (this.postfx) this.postfx.render(dt); else this.renderer.render(this.scene, this.camera);
      this.frames++;
      this.fpsAccum += dt;
      if (this.fpsAccum >= 0.5) {
        this.fps = this.frames / this.fpsAccum;
        this.frames = 0; this.fpsAccum = 0;
        this.onFps?.(this.fps);
      }
    };
    requestAnimationFrame(loop);
  }

  stop() { this.running = false; }
}
