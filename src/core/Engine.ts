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

  /**
   * Performance governor. Rather than only scaling resolution -- which trades the whole picture's
   * sharpness for frames -- this steps individual effects off in order of cost-per-unit-of-looks,
   * and puts them back when there is headroom. Level 0 is everything on.
   */
  private perfLevel = 0;
  private perfWindow = 0;
  private perfFrames = 0;
  private perfHold = 0;
  private perfSteps = 0;
  private shadowTick = 0;
  /** How many frames between rebuilds of any one shadow map; raised by the governor. */
  private shadowInterval = 2;
  private shadowCasters: (THREE.Light & { shadow?: THREE.LightShadow })[] = [];
  private shadowScanAt = -1;

  /**
   * Refresh one shadow map per frame, round-robin, rather than all of them together.
   *
   * Rebuilding a shadow map means redrawing every caster into it, so doing them all on the same
   * frame makes that frame far more expensive than its neighbours -- a sawtooth that reads as
   * stutter even when the average frame rate looks fine. three gates each light separately
   * (WebGLShadowMap: `shadow.autoUpdate === false && shadow.needsUpdate === false` skips it), so
   * each light can take its turn and no single frame carries them all.
   */
  private stepShadows() {
    // The pool is built once, but rescan occasionally in case a light was added.
    if (this.time - this.shadowScanAt > 5) {
      this.shadowScanAt = this.time;
      this.shadowCasters = [];
      this.scene.traverse((o) => {
        const l = o as THREE.Light & { shadow?: THREE.LightShadow };
        if ((l as THREE.SpotLight).isSpotLight || (l as THREE.DirectionalLight).isDirectionalLight || (l as THREE.PointLight).isPointLight) {
          if (l.castShadow && l.shadow) { l.shadow.autoUpdate = false; this.shadowCasters.push(l); }
        }
      });
    }
    // The outer gate has to be open every frame; the per-light flags decide who actually redraws.
    this.renderer.shadowMap.needsUpdate = true;
    const n = this.shadowCasters.length;
    if (!n) return;
    const period = n * this.shadowInterval;
    const phase = this.shadowTick++ % period;
    for (let i = 0; i < n; i++) {
      const sh = this.shadowCasters[i].shadow;
      if (sh) sh.needsUpdate = phase === i * this.shadowInterval;
    }
  }
  /** Highest level the governor may climb to. */
  private static readonly MAX_PERF_LEVEL = 7;
  /** Reported so the UI can say what was turned down. */
  perfNote = '';

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
    // Shadow maps are rebuilt on a cadence rather than every frame. Redrawing several hundred
    // casters into a 2048 sun map and a 1024 lamp map 60 times a second is most of the frame on
    // modest hardware, and shadows barely change between two consecutive frames.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
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

  /**
   * Apply the current performance level. Ordered by how much frame time each buys against how much
   * of the look it costs: bloom is a subtle glow, ambient occlusion is soft contact shading, the
   * lamp's shadow is one light's, and resolution is the whole image -- so resolution goes last.
   */
  private applyPerfLevel() {
    const l = this.perfLevel;
    const s = settings.data;
    if (this.postfx) {
      this.postfx.bloom.enabled = s.bloom && l < 1;
      this.postfx.gtao.enabled = s.ao && l < 2;
    }
    this.shadowInterval = l >= 1 ? 3 : 2;
    // Level 3 drops the pooled lamp shadow, level 5 the sun's. Only lights explicitly marked as
    // shadow casters are touched -- the rest of the pool must never be switched ON here, or the
    // governor would add shadow maps while trying to save frames.
    this.scene.traverse((o) => {
      const u = (o as THREE.Object3D).userData;
      if (u.wantsShadow === 'lamp') (o as THREE.SpotLight).castShadow = s.shadows && l < 3;
      else if (u.wantsShadow === 'sun') (o as THREE.DirectionalLight).castShadow = s.shadows && l < 5;
    });
    if (this.postfx) this.postfx.smaa.enabled = settings.data.antialias && l < 6;
    const scale = l >= 7 ? 0.65 : l >= 6 ? 0.75 : l >= 4 ? 0.8 : l >= 2 ? 0.9 : 1;
    if (scale !== this.dynamicScale) { this.dynamicScale = scale; this.applyResolution(); this.resize(); }
    this.shadowScanAt = -1; // castShadow changed; rebuild the round-robin list
    const off = [];
    if (l >= 1) off.push('bloom');
    if (l >= 2) off.push('ambient occlusion');
    if (l >= 3) off.push('lamp shadows');
    if (l >= 5) off.push('sun shadows');
    if (l >= 6) off.push('antialiasing');
    if (scale < 1) off.push(`resolution ${Math.round(scale * 100)}%`);
    this.perfNote = off.length ? 'reduced: ' + off.join(', ') : '';
  }

  /**
   * Watch the frame rate over a window and move one step at a time. The windows are long and the
   * thresholds are far apart so the picture never flickers between settings while you play.
   */
  private governPerformance(dt: number) {
    this.perfWindow += dt;
    this.perfFrames++;
    if (this.perfHold > 0) this.perfHold -= dt;
    // Short windows while it is still finding the machine's level, long ones once it has settled,
    // so the opening seconds are not spent laggy but a settled game does not keep changing.
    const settling = this.perfSteps < 4;
    if (this.perfWindow < (settling ? 0.6 : 2)) return;
    const fps = this.perfFrames / this.perfWindow;
    this.perfWindow = 0; this.perfFrames = 0;
    if (this.perfHold > 0) return;
    if (fps < 52 && this.perfLevel < Engine.MAX_PERF_LEVEL) {
      // Jump several rungs at once when the frame rate is far off target rather than crawling down
      // one setting every couple of seconds.
      const jump = fps < 18 ? 3 : fps < 30 ? 2 : 1;
      this.perfLevel = Math.min(Engine.MAX_PERF_LEVEL, this.perfLevel + jump);
      this.perfSteps++;
      this.applyPerfLevel();
      this.perfHold = settling ? 0.8 : 3;
    } else if (fps > 75 && this.perfLevel > 0) {
      this.perfLevel--;
      this.perfSteps++;
      this.applyPerfLevel();
      this.perfHold = 6;
    }
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
      if (this.adaptive) this.governPerformance(dt);
      this.stepShadows();
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
