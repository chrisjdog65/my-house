/**
 * Living-room fireplace fire: crossed billboard quads with a procedural fbm flame shader,
 * plus drifting ember particles. Both fade with a shared intensity (0..1).
 */
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import type { Ctx } from '../Context';

const FLAME_VERT = /* glsl */ `
attribute float aPhase;
varying vec2 vUv;
varying float vPhase;
void main() {
  vUv = uv;
  vPhase = aPhase;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FLAME_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;
varying float vPhase;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = vUv;
  float t = uTime + vPhase * 10.0;
  // turbulent noise scrolling upward (two scales)
  float n1 = fbm(vec2(uv.x * 3.0 + vPhase, uv.y * 2.5 - t * 1.7));
  float n2 = fbm(vec2(uv.x * 7.0 - vPhase * 3.0, uv.y * 5.0 - t * 2.8));
  // wobble the flame sideways, more toward the top
  float x = (uv.x - 0.5) + (n1 - 0.5) * (0.25 + 0.6 * uv.y);
  // silhouette: wide base tapering to licking tips
  float halfW = 0.42 * (1.0 - pow(uv.y, 1.4) * 0.85) * (0.75 + 0.5 * n2);
  float body = 1.0 - smoothstep(halfW * 0.35, halfW, abs(x));
  // vertical envelope: fade in just above the logs, dissolve toward the top
  float env = smoothstep(0.0, 0.08, uv.y) * (1.0 - smoothstep(0.45, 1.0, uv.y + (n2 - 0.5) * 0.3));
  float f = clamp(body * env * (0.7 + 0.9 * n2), 0.0, 1.0);
  // heat: hottest at the base and centre
  float heat = f * (1.0 - uv.y * 0.55) * (1.0 - abs(x) * 1.2);
  vec3 col = mix(vec3(0.75, 0.10, 0.01), vec3(1.0, 0.45, 0.06), smoothstep(0.05, 0.45, heat));
  col = mix(col, vec3(1.0, 0.85, 0.45), smoothstep(0.45, 0.9, heat));
  float alpha = f * uIntensity;
  gl_FragColor = vec4(col * 1.8, alpha);
}`;

const EMBER_VERT = /* glsl */ `
attribute float aSeed;
attribute vec3 aVel;
uniform float uTime;
uniform float uIntensity;
uniform float uScale;
varying float vAlpha;
void main() {
  float life = 1.2 + aSeed * 1.6;
  float t = fract((uTime + aSeed * 37.0) / life);
  vec3 p = position + aVel * t;
  p.x += sin(uTime * 2.5 + aSeed * 40.0) * 0.035 * t;
  p.z += cos(uTime * 1.9 + aSeed * 23.0) * 0.035 * t;
  p.y += t * t * 0.25;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (0.012 + aSeed * 0.014) * uScale / max(0.2, -mv.z);
  vAlpha = (1.0 - t) * smoothstep(0.0, 0.1, t) * uIntensity;
}`;

const EMBER_FRAG = /* glsl */ `
precision highp float;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  if (d > 1.0) discard;
  float a = (1.0 - smoothstep(0.2, 1.0, d)) * vAlpha;
  gl_FragColor = vec4(vec3(1.0, 0.55, 0.12) * 2.0, a);
}`;

export class Fire {
  readonly object = new THREE.Group();
  /** current fade value 0..1 */
  intensity = 0;
  private target = 0;
  private flameMat: THREE.ShaderMaterial;
  private emberMat: THREE.ShaderMaterial;
  private time = 0;

  /**
   * `width` is the extent along z (the quad facing +x, i.e. the room), `depth` the extent along x
   * (into the firebox); the diagonal quads are sized to the ellipse between the two so no sheet
   * pokes out of the firebox opening.
   */
  constructor(private ctx: Ctx, position: THREE.Vector3, opts: { width?: number; depth?: number; height?: number; embers?: number } = {}) {
    const w = opts.width ?? 0.5, d = opts.depth ?? w, h = opts.height ?? 0.42;
    // crossed billboard quads (0 / 45 / 90 / 135 degrees) with a per-quad phase so they don't move in lockstep
    const geos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 4;
      // half extent of a quad spanning direction (cos a, 0, -sin a) inside the (d x w) ellipse
      const half = 1 / Math.sqrt((Math.cos(a) / (d / 2)) ** 2 + (Math.sin(a) / (w / 2)) ** 2);
      const g = new THREE.PlaneGeometry(half * 2, h * (i % 2 ? 0.9 : 1), 1, 1);
      g.translate(0, (h * (i % 2 ? 0.9 : 1)) / 2, 0);
      g.rotateY(a);
      const phase = new Float32Array(g.attributes.position.count).fill(i * 0.37);
      g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
      geos.push(g);
    }
    const flameGeo = BufferGeometryUtils.mergeGeometries(geos, false)!;
    for (const g of geos) g.dispose();
    this.flameMat = new THREE.ShaderMaterial({
      vertexShader: FLAME_VERT,
      fragmentShader: FLAME_FRAG,
      uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 } },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const flames = new THREE.Mesh(flameGeo, this.flameMat);
    flames.castShadow = false;
    flames.receiveShadow = false;
    flames.renderOrder = 20;
    this.object.add(flames);

    // embers
    const n = opts.embers ?? 70;
    const pos = new Float32Array(n * 3), seed = new Float32Array(n), vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * d * 0.5;
      pos[i * 3 + 1] = Math.random() * 0.06;
      pos[i * 3 + 2] = (Math.random() - 0.5) * w * 0.5;
      seed[i] = Math.random();
      vel[i * 3] = (Math.random() - 0.5) * 0.12;
      vel[i * 3 + 1] = 0.35 + Math.random() * 0.4;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
    }
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    eg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    eg.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
    eg.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.4, 0), 1.0);
    this.emberMat = new THREE.ShaderMaterial({
      vertexShader: EMBER_VERT,
      fragmentShader: EMBER_FRAG,
      uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 }, uScale: { value: 500 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const embers = new THREE.Points(eg, this.emberMat);
    embers.frustumCulled = false;
    embers.renderOrder = 21;
    this.object.add(embers);

    this.object.position.copy(position);
    this.object.visible = false;
    ctx.dynamic.add(this.object);
  }

  get on() { return this.target > 0.5; }

  setOn(on: boolean) {
    this.target = on ? 1 : 0;
    if (on) this.object.visible = true;
  }

  /** Call every frame. Fades over ~1 s. */
  update(dt: number) {
    if (this.intensity !== this.target) {
      const step = dt / 1.0;
      this.intensity = this.intensity < this.target ? Math.min(this.target, this.intensity + step) : Math.max(this.target, this.intensity - step);
      this.flameMat.uniforms.uIntensity.value = this.intensity;
      this.emberMat.uniforms.uIntensity.value = this.intensity;
      if (this.intensity <= 0) this.object.visible = false;
    }
    if (!this.object.visible) return;
    this.time += dt;
    this.flameMat.uniforms.uTime.value = this.time;
    this.emberMat.uniforms.uTime.value = this.time;
    this.emberMat.uniforms.uScale.value = (this.ctx.renderer.domElement.clientHeight || 576) * 0.87;
  }
}
