/**
 * Sky, sun, environment map and the interior light manager.
 *
 * Interior lights are "virtual": a room builder registers a VirtualLight (position, colour,
 * intensity, range) and the LightManager maps the N nearest active ones onto a fixed pool of
 * real THREE lights every frame. Keeping the real light count constant avoids shader recompiles
 * and bounds the per-fragment lighting cost regardless of how many lamps the house contains.
 */
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { settings } from '../core/Settings';

export interface VirtualLight {
  position: THREE.Vector3;
  color: THREE.Color;
  intensity: number; // candela-ish (three physical units, decay 2)
  distance: number;
  on: boolean;
  /** 'point' or 'spot' (spot points straight down) */
  type: 'point' | 'spot';
  angle?: number;
  penumbra?: number;
  /** wants shadows (only the nearest few get them) */
  shadow?: boolean;
  /** flicker amplitude 0..1 */
  flicker?: number;
  /** switch group id (light switches toggle all lights in a group) */
  group?: string;
  /** internal */
  _seed?: number;
  /** optional emissive meshes toggled with the light */
  emissives?: { mesh: THREE.Mesh; on: THREE.Material; off: THREE.Material }[];
  /** user callback when toggled */
  onToggle?: (on: boolean) => void;
}

/** Options accepted by the light helpers (colour may be given as hex). */
export type LightOpts = Partial<Omit<VirtualLight, 'color' | 'position'>> & { color?: THREE.ColorRepresentation };
export type LightSpec = Omit<VirtualLight, 'color' | 'position'> & { position: THREE.Vector3 | { x: number; y: number; z: number }; color?: THREE.ColorRepresentation };

export class LightManager {
  readonly virtual: VirtualLight[] = [];
  private pointPool: THREE.PointLight[] = [];
  private spotPool: THREE.SpotLight[] = [];
  private shadowPool: THREE.PointLight[] = [];
  private groups = new Map<string, VirtualLight[]>();
  private time = 0;

  constructor(private scene: THREE.Scene, private opts = { points: 10, spots: 6, shadows: 2 }) {
    for (let i = 0; i < opts.points; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 10, 2);
      l.visible = true;
      l.castShadow = false;
      scene.add(l);
      this.pointPool.push(l);
    }
    for (let i = 0; i < opts.spots; i++) {
      const l = new THREE.SpotLight(0xffffff, 0, 8, Math.PI / 3, 0.6, 2);
      l.castShadow = false;
      l.target.position.set(0, -1, 0);
      l.add(l.target);
      scene.add(l);
      this.spotPool.push(l);
    }
    for (let i = 0; i < opts.shadows; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 10, 2);
      l.castShadow = true;
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.bias = -0.004;
      l.shadow.normalBias = 0.03;
      l.shadow.camera.near = 0.08;
      l.shadow.camera.far = 8;
      l.shadow.radius = 3;
      scene.add(l);
      this.shadowPool.push(l);
    }
  }

  add(v: LightSpec): VirtualLight {
    const vl: VirtualLight = {
      ...v,
      position: new THREE.Vector3(v.position.x, v.position.y, v.position.z),
      color: new THREE.Color(v.color ?? 0xffe0b8),
      _seed: Math.random() * 1000,
    };
    this.virtual.push(vl);
    if (vl.group) {
      let g = this.groups.get(vl.group);
      if (!g) { g = []; this.groups.set(vl.group, g); }
      g.push(vl);
    }
    this.applyEmissive(vl);
    return vl;
  }

  /** Convenience: a warm ceiling/lamp point light. */
  point(x: number, y: number, z: number, opts: LightOpts = {}): VirtualLight {
    return this.add({ position: { x, y, z }, intensity: opts.intensity ?? 14, distance: opts.distance ?? 9, on: opts.on ?? true, type: 'point', ...opts });
  }

  /** Convenience: downward spot (recessed can light). */
  spot(x: number, y: number, z: number, opts: LightOpts = {}): VirtualLight {
    return this.add({ position: { x, y, z }, intensity: opts.intensity ?? 16, distance: opts.distance ?? 7, on: opts.on ?? true, type: 'spot', angle: opts.angle ?? Math.PI / 3.2, penumbra: opts.penumbra ?? 0.7, ...opts });
  }

  setOn(v: VirtualLight, on: boolean) {
    if (v.on === on) return;
    v.on = on;
    this.applyEmissive(v);
    v.onToggle?.(on);
  }

  toggle(v: VirtualLight) { this.setOn(v, !v.on); }

  setGroup(group: string, on: boolean) {
    for (const v of this.groups.get(group) ?? []) this.setOn(v, on);
  }
  toggleGroup(group: string) {
    const g = this.groups.get(group) ?? [];
    const anyOn = g.some((v) => v.on);
    this.setGroup(group, !anyOn);
    return !anyOn;
  }
  groupOn(group: string) {
    return (this.groups.get(group) ?? []).some((v) => v.on);
  }

  private applyEmissive(v: VirtualLight) {
    if (!v.emissives) return;
    for (const e of v.emissives) e.mesh.material = v.on ? e.on : e.off;
  }

  /** Assign pools to nearest lights. Call every frame with the camera/player position. */
  update(dt: number, focus: THREE.Vector3, daylight: number) {
    this.time += dt;
    // score lights by distance (closer = better), only lights that are on
    const scored: { v: VirtualLight; d: number }[] = [];
    for (const v of this.virtual) {
      if (!v.on || v.intensity <= 0) continue;
      const d = v.position.distanceTo(focus);
      if (d > v.distance + 6) continue;
      scored.push({ v, d });
    }
    scored.sort((a, b) => a.d - b.d);

    const shadowsEnabled = settings.get('shadows');
    const usedShadow = new Set<VirtualLight>();
    // shadow pool: nearest lights flagged shadow
    let si = 0;
    for (const s of scored) {
      if (si >= this.shadowPool.length) break;
      if (!s.v.shadow || !shadowsEnabled) continue;
      const l = this.shadowPool[si++];
      this.applyPoint(l, s.v);
      usedShadow.add(s.v);
    }
    for (; si < this.shadowPool.length; si++) this.shadowPool[si].intensity = 0;

    let pi = 0, spi = 0;
    for (const s of scored) {
      if (usedShadow.has(s.v)) continue;
      if (s.v.type === 'spot') {
        if (spi < this.spotPool.length) this.applySpot(this.spotPool[spi++], s.v);
        else if (pi < this.pointPool.length) this.applyPoint(this.pointPool[pi++], s.v);
      } else {
        if (pi < this.pointPool.length) this.applyPoint(this.pointPool[pi++], s.v);
      }
      if (pi >= this.pointPool.length && spi >= this.spotPool.length) break;
    }
    for (; pi < this.pointPool.length; pi++) this.pointPool[pi].intensity = 0;
    for (; spi < this.spotPool.length; spi++) this.spotPool[spi].intensity = 0;
    void daylight;
  }

  private flick(v: VirtualLight) {
    if (!v.flicker) return 1;
    const t = this.time * 11 + (v._seed ?? 0);
    const n = Math.sin(t) * 0.5 + Math.sin(t * 2.7) * 0.3 + Math.sin(t * 6.1) * 0.2;
    return 1 - v.flicker * 0.5 + n * v.flicker * 0.5;
  }

  private applyPoint(l: THREE.PointLight, v: VirtualLight) {
    l.position.copy(v.position);
    l.color.copy(v.color);
    l.intensity = v.intensity * this.flick(v);
    l.distance = v.distance;
  }

  private applySpot(l: THREE.SpotLight, v: VirtualLight) {
    l.position.copy(v.position);
    l.color.copy(v.color);
    l.intensity = v.intensity * this.flick(v);
    l.distance = v.distance;
    l.angle = v.angle ?? Math.PI / 3;
    l.penumbra = v.penumbra ?? 0.6;
  }
}

/** Sun / sky / environment. */
export class DayLight {
  sky: Sky;
  sun: THREE.DirectionalLight;
  moon: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  ambient: THREE.AmbientLight;
  sunDir = new THREE.Vector3(0, 1, 0);
  private pmrem: THREE.PMREMGenerator;
  private envTarget: THREE.WebGLRenderTarget | null = null;
  private lastEnvHour = -99;
  /** 0 (night) .. 1 (full day) */
  daylight = 1;
  stars: THREE.Points;
  /** half-size of the sun shadow frustum; it follows the player (sharper shadows, fewer casters) */
  readonly shadowExtent = 14;
  private followTarget = new THREE.Vector3();
  private _m = new THREE.Matrix4();
  private _mi = new THREE.Matrix4();
  private _p = new THREE.Vector3();

  /** Centre the sun's shadow frustum on a point, snapped to the shadow-map texel grid to avoid shimmer. */
  follow(target: THREE.Vector3) {
    const dir = this.sunDir;
    // light-space basis
    this._m.lookAt(new THREE.Vector3(0, 0, 0), dir.clone().negate(), new THREE.Vector3(0, 1, 0));
    this._mi.copy(this._m).invert();
    this._p.copy(target).applyMatrix4(this._mi);
    const texel = (this.shadowExtent * 2) / this.sun.shadow.mapSize.x;
    this._p.x = Math.round(this._p.x / texel) * texel;
    this._p.y = Math.round(this._p.y / texel) * texel;
    this.followTarget.copy(this._p).applyMatrix4(this._m);
    this.sun.target.position.copy(this.followTarget);
    this.sun.position.copy(this.followTarget).addScaledVector(dir, 45);
    this.sun.target.updateMatrixWorld();
  }

  constructor(private renderer: THREE.WebGLRenderer, private scene: THREE.Scene) {
    this.sky = new Sky();
    this.sky.scale.setScalar(4000);
    scene.add(this.sky);
    const u = this.sky.material.uniforms;
    u.turbidity.value = 6;
    u.rayleigh.value = 1.2;
    u.mieCoefficient.value = 0.004;
    u.mieDirectionalG.value = 0.85;

    this.sun = new THREE.DirectionalLight(0xfff2dd, 3.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 90;
    const S = this.shadowExtent;
    this.sun.shadow.camera.left = -S; this.sun.shadow.camera.right = S;
    this.sun.shadow.camera.top = S; this.sun.shadow.camera.bottom = -S;
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.bias = -0.00015;
    this.sun.shadow.normalBias = 0.025;
    this.sun.shadow.radius = 1.5;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.moon = new THREE.DirectionalLight(0x9fb4d8, 0);
    this.moon.castShadow = false;
    scene.add(this.moon);
    scene.add(this.moon.target);

    this.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x6b5a3e, 0.55);
    scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.08);
    scene.add(this.ambient);

    // stars
    const n = 1800;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.98 + 0.02);
      const r = 3500;
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 8, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false }));
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
    this.setTime(settings.get('timeOfDay'), true);
    settings.onChange((s, k) => { if (k === 'timeOfDay' || k === null) this.setTime(s.timeOfDay); if (k === 'shadows' || k === null) this.sun.castShadow = s.shadows; });
    this.sun.castShadow = settings.get('shadows');
  }

  /** hour 0..24 */
  setTime(hour: number, force = false) {
    // sun path: rises east (+x) at 6, peaks at 12 (south-ish, toward +z), sets west at 18
    const t = (hour - 6) / 12; // 0 sunrise .. 1 sunset
    const elev = Math.sin(t * Math.PI) * (Math.PI / 2) * 0.72; // max elevation ~65 deg
    const azim = Math.PI * 0.15 + t * Math.PI * 0.7;
    const dir = new THREE.Vector3(Math.cos(azim) * Math.cos(elev), Math.sin(elev), Math.sin(azim) * Math.cos(elev) * 0.6 + 0.35 * Math.cos(elev));
    dir.normalize();
    this.sunDir.copy(dir);
    const up = Math.max(0, dir.y);
    const daylight = Math.min(1, Math.max(0, (dir.y + 0.08) / 0.3));
    this.daylight = daylight;

    this.sky.material.uniforms.sunPosition.value.copy(dir);
    this.sun.position.copy(this.followTarget).addScaledVector(dir, 45);
    this.sun.target.position.copy(this.followTarget);
    const warmth = 1 - Math.min(1, up / 0.35);
    this.sun.color.setRGB(1, 0.94 - warmth * 0.3, 0.86 - warmth * 0.5);
    this.sun.intensity = 2.6 * daylight * (0.35 + 0.65 * Math.min(1, up * 2));
    this.sun.visible = daylight > 0.01;

    // moon opposite the sun
    this.moon.position.copy(dir).multiplyScalar(-45);
    this.moon.position.y = Math.abs(this.moon.position.y) + 12;
    this.moon.intensity = 0.28 * (1 - daylight);
    this.moon.visible = daylight < 0.99;
    this.moon.castShadow = false;

    this.hemi.intensity = 0.12 + 0.5 * daylight;
    this.hemi.color.setRGB(0.55 + 0.25 * daylight, 0.65 + 0.2 * daylight, 1.0);
    this.ambient.intensity = 0.04 + 0.05 * daylight;
    (this.stars.material as THREE.PointsMaterial).opacity = (1 - daylight) * 0.9;

    // environment map: regenerate only when the hour changes noticeably
    if (force || Math.abs(hour - this.lastEnvHour) > 0.25) {
      this.lastEnvHour = hour;
      this.updateEnvironment();
    }
  }

  private equirect: THREE.DataTexture | null = null;

  /**
   * Environment map from a CPU-generated HDR equirectangular sky. (Generating the PMREM from the
   * Sky shader directly produces Inf/NaN around the sun disc on some GPUs, which blackens every
   * PBR material, so we build a well-behaved analytic sky instead.)
   */
  private updateEnvironment() {
    const old = this.envTarget;
    const W = 256, H = 128;
    if (!this.equirect) {
      this.equirect = new THREE.DataTexture(new Float32Array(W * H * 4), W, H, THREE.RGBAFormat, THREE.FloatType);
      this.equirect.mapping = THREE.EquirectangularReflectionMapping;
      this.equirect.colorSpace = THREE.LinearSRGBColorSpace;
      this.equirect.minFilter = THREE.LinearFilter;
      this.equirect.magFilter = THREE.LinearFilter;
      this.equirect.generateMipmaps = false;
    }
    const data = this.equirect.image.data as Float32Array;
    const d = this.daylight;
    const sun = this.sunDir;
    const sunUp = Math.max(0, sun.y);
    const warmth = 1 - Math.min(1, sunUp / 0.3);
    // colours (linear)
    const zenith = new THREE.Color().setRGB(0.12, 0.28, 0.65).lerp(new THREE.Color(0.01, 0.015, 0.035), 1 - d);
    const horizon = new THREE.Color().setRGB(0.55 + warmth * 0.3, 0.62 - warmth * 0.15, 0.75 - warmth * 0.35).lerp(new THREE.Color(0.02, 0.025, 0.045), 1 - d);
    const ground = new THREE.Color().setRGB(0.16, 0.14, 0.1).lerp(new THREE.Color(0.006, 0.006, 0.006), 1 - d);
    const sunCol = new THREE.Color().setRGB(1, 0.92 - warmth * 0.35, 0.8 - warmth * 0.55);
    const c = new THREE.Color();
    for (let y = 0; y < H; y++) {
      const v = 1 - (y + 0.5) / H; // 1 at top
      const phi = (v - 0.5) * Math.PI; // elevation
      const cy = Math.sin(phi), cr = Math.cos(phi);
      for (let x = 0; x < W; x++) {
        const u = (x + 0.5) / W;
        const theta = (u - 0.5) * Math.PI * 2;
        // direction matching three's equirect convention (u around Y)
        const dx = -Math.sin(theta) * cr, dz = -Math.cos(theta) * cr;
        if (cy >= 0) {
          const t = Math.pow(cy, 0.55);
          c.copy(horizon).lerp(zenith, t);
          const cosA = dx * sun.x + cy * sun.y + dz * sun.z;
          const glow = Math.pow(Math.max(0, cosA), 12) * 0.35 * d + Math.pow(Math.max(0, cosA), 180) * 6 * d;
          c.r += sunCol.r * glow; c.g += sunCol.g * glow; c.b += sunCol.b * glow;
        } else {
          const t = Math.min(1, -cy * 6);
          c.copy(horizon).multiplyScalar(0.8).lerp(ground, t);
        }
        const i = (y * W + x) * 4;
        data[i] = c.r; data[i + 1] = c.g; data[i + 2] = c.b; data[i + 3] = 1;
      }
    }
    this.equirect.needsUpdate = true;
    this.envTarget = this.pmrem.fromEquirectangular(this.equirect);
    this.scene.environment = this.envTarget.texture;
    this.scene.environmentIntensity = 0.55 + 0.45 * d;
    if (old) old.dispose();
  }
}
