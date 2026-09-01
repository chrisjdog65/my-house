/**
 * Pure (DOM-free) procedural material painters. Each painter fills a pixel record for a
 * point (u, v) given in metres inside one tile of `period` metres. The generator turns
 * height into a tangent-space normal map and packs AO / roughness / metalness into an ORM map.
 *
 * Runs inside a Web Worker (see texWorker.ts) and on the main thread as a fallback.
 */
import { Simplex2D, hash2, worley, clamp, lerp, smoothstep, fract } from './Noise';

export interface Px {
  r: number; g: number; b: number; // linear-ish sRGB 0..1
  h: number;                       // height 0..1
  rough: number;                   // roughness 0..1
  metal: number;                   // metalness 0..1
  ao: number;                      // 0..1
}

export interface NoiseKit {
  a: Simplex2D;
  b: Simplex2D;
  c: Simplex2D;
  /** tileable fbm over a square period (period metres). Returns [-1,1] */
  tfbm(u: number, v: number, freq: number, oct: number, period: number, which?: 0 | 1 | 2): number;
  /** tileable ridged noise [0,1] */
  tridged(u: number, v: number, freq: number, oct: number, period: number): number;
}

export type PainterFn = (u: number, v: number, o: Px, k: NoiseKit) => void;

export interface TexSpec {
  /** repeat period in metres (square) */
  period: number;
  /** pixel resolution at "high" quality */
  size: number;
  /** strength for height -> normal conversion */
  normalStrength: number;
  painter: PainterFn;
  /** aspect ratio for non-square textures (height = size / aspect). period applies to U; V period = period / aspect */
  aspect?: number;
}

export function makeKit(seed = 1): NoiseKit {
  const a = new Simplex2D(seed * 101 + 7);
  const b = new Simplex2D(seed * 211 + 13);
  const c = new Simplex2D(seed * 307 + 29);
  const pick = (w: number) => (w === 1 ? b : w === 2 ? c : a);
  const kit: NoiseKit = {
    a, b, c,
    tfbm(u, v, freq, oct, period, which = 0) {
      const s = pick(which);
      const wx = u / period, wy = v / period;
      const n00 = s.fbm(u * freq, v * freq, oct);
      const n10 = s.fbm((u - period) * freq, v * freq, oct);
      const n01 = s.fbm(u * freq, (v - period) * freq, oct);
      const n11 = s.fbm((u - period) * freq, (v - period) * freq, oct);
      return lerp(lerp(n00, n10, wx), lerp(n01, n11, wx), wy);
    },
    tridged(u, v, freq, oct, period) {
      const wx = u / period, wy = v / period;
      const n00 = c.ridged(u * freq, v * freq, oct);
      const n10 = c.ridged((u - period) * freq, v * freq, oct);
      const n01 = c.ridged(u * freq, (v - period) * freq, oct);
      const n11 = c.ridged((u - period) * freq, (v - period) * freq, oct);
      return lerp(lerp(n00, n10, wx), lerp(n01, n11, wx), wy);
    },
  };
  return kit;
}

const setRGB = (o: Px, r: number, g: number, b: number, m = 1) => { o.r = r * m; o.g = g * m; o.b = b * m; };
const mod = (a: number, n: number) => ((a % n) + n) % n;

// ---------------------------------------------------------------------------------------------
// Wood
// ---------------------------------------------------------------------------------------------

interface WoodPalette { base: [number, number, number]; dark: [number, number, number]; variance: number }
export const WOOD = {
  oak: { base: [0.74, 0.55, 0.36], dark: [0.45, 0.30, 0.17], variance: 0.12 } as WoodPalette,
  walnut: { base: [0.40, 0.26, 0.16], dark: [0.20, 0.12, 0.07], variance: 0.10 } as WoodPalette,
  maple: { base: [0.86, 0.72, 0.52], dark: [0.62, 0.47, 0.31], variance: 0.06 } as WoodPalette,
  mahogany: { base: [0.47, 0.22, 0.14], dark: [0.25, 0.10, 0.06], variance: 0.10 } as WoodPalette,
  pine: { base: [0.85, 0.68, 0.45], dark: [0.60, 0.42, 0.24], variance: 0.14 } as WoodPalette,
  espresso: { base: [0.22, 0.14, 0.09], dark: [0.10, 0.06, 0.04], variance: 0.08 } as WoodPalette,
  grey: { base: [0.55, 0.52, 0.48], dark: [0.32, 0.30, 0.27], variance: 0.10 } as WoodPalette,
};

/** Continuous wood grain (for furniture). Grain runs along U. */
export function woodGrain(p: WoodPalette, period = 1, ringScale = 9): PainterFn {
  return (u, v, o, k) => {
    // low frequency warp of the ring pattern
    const warp = k.tfbm(u, v, 1.2, 3, period, 1) * 0.35;
    const rings = k.tfbm(u * 0.25, v, 1.0, 2, period, 0) * 0.6 + v * 0.8 + warp;
    const ringT = fract(rings * ringScale);
    const ring = smoothstep(0.0, 0.4, ringT) * (1 - smoothstep(0.55, 1.0, ringT)); // 0..1 band
    const fine = k.tfbm(u, v, 55, 2, period, 2); // fine along-grain streaks
    const streak = k.tfbm(u * 0.15, v, 140, 1, period, 1);
    const t = clamp(ring * 0.55 + fine * 0.22 + streak * 0.12 + 0.3, 0, 1);
    const var1 = k.tfbm(u, v, 0.7, 2, period, 2) * p.variance;
    const r = lerp(p.base[0], p.dark[0], t) * (1 + var1);
    const g = lerp(p.base[1], p.dark[1], t) * (1 + var1);
    const b = lerp(p.base[2], p.dark[2], t) * (1 + var1);
    setRGB(o, r, g, b);
    o.h = 0.5 + (1 - t) * 0.08 + streak * 0.03;
    o.rough = clamp(0.42 + t * 0.2 + streak * 0.05, 0, 1);
    o.metal = 0;
    o.ao = 1;
  };
}

/** Hardwood plank floor. period 2m, 14 planks across, 1m plank length with staggered rows. */
export function plankFloor(p: WoodPalette, period = 2, planksAcross = 14, plankLen = 1, gap = 0.0022): PainterFn {
  const plankW = period / planksAcross;
  const perRow = Math.round(period / plankLen);
  return (u, v, o, k) => {
    const row = Math.floor(v / plankW);
    const rowW = mod(row, planksAcross);
    const offset = Math.floor(hash2(rowW, 3, 5) * 5) * (plankLen / 5); // stagger in fifths
    const uu = u + offset;
    const col = Math.floor(uu / plankLen);
    const colW = mod(col, perRow);
    const id = hash2(rowW, colW, 17);
    const id2 = hash2(rowW, colW, 23);
    const lu = uu - col * plankLen;
    const lv = v - row * plankW;
    const eU = Math.min(lu, plankLen - lu);
    const eV = Math.min(lv, plankW - lv);
    const e = Math.min(eU, eV);
    const bevel = smoothstep(gap, gap * 3.5, e);

    // grain in plank-local space
    const s = id < 0.5 ? k.a : k.b;
    const rings = s.fbm(lu * 1.6 + id * 90, lv * 9 + id2 * 40, 2) * 0.8 + lv * 12 + id * 4;
    const ringT = fract(rings);
    const ring = smoothstep(0, 0.35, ringT) * (1 - smoothstep(0.5, 1, ringT));
    const fine = s.fbm(lu * 40 + id * 30, lv * 260 + id2 * 60, 2);
    const t = clamp(ring * 0.5 + fine * 0.25 + 0.28, 0, 1);

    // knot
    let knot = 0;
    if (id2 < 0.22) {
      const kx = 0.2 + id * 0.6 * plankLen, ky = plankW * (0.3 + id2 * 1.5);
      const d = Math.hypot((lu - kx) * 1.0, (lv - ky) * 2.2);
      if (d < 0.05) knot = (1 - smoothstep(0.02, 0.05, d)) * (0.5 + 0.5 * Math.sin(d * 240));
    }
    const tt = clamp(t + knot * 0.6, 0, 1);
    const tone = 1 + (id - 0.5) * 2 * p.variance + (id2 - 0.5) * 0.06;
    const r = lerp(p.base[0], p.dark[0], tt) * tone;
    const g = lerp(p.base[1], p.dark[1], tt) * tone;
    const b = lerp(p.base[2], p.dark[2], tt) * tone;
    const dark = 0.55 + 0.45 * bevel;
    setRGB(o, r, g, b, dark);
    o.h = bevel * (0.62 + (1 - tt) * 0.06 + fine * 0.02) + (1 - bevel) * 0.2;
    o.rough = clamp(0.38 + tt * 0.22 + (1 - bevel) * 0.4, 0, 1);
    o.metal = 0;
    o.ao = 0.6 + 0.4 * bevel;
  };
}

// ---------------------------------------------------------------------------------------------
// Walls & masonry
// ---------------------------------------------------------------------------------------------

export function plaster(period = 1, roughBase = 0.86): PainterFn {
  return (u, v, o, k) => {
    const n1 = k.tfbm(u, v, 9, 4, period, 0);
    const n2 = k.tfbm(u, v, 45, 2, period, 1);
    const tone = 1 + n1 * 0.035 + n2 * 0.02;
    setRGB(o, tone, tone, tone);
    o.h = 0.5 + n1 * 0.12 + n2 * 0.05;
    o.rough = clamp(roughBase + n2 * 0.08, 0, 1);
    o.metal = 0;
    o.ao = 1;
  };
}

/** Running-bond brick. period 1m: 4 bricks per row, 13 rows. */
export function brick(color: [number, number, number] = [0.62, 0.30, 0.22], period = 1): PainterFn {
  const rows = 13, cols = 4;
  const bh = period / rows, bw = period / cols;
  const mortar = 0.009;
  return (u, v, o, k) => {
    const row = Math.floor(v / bh);
    const rowW = mod(row, rows);
    const off = (rowW % 2) * bw * 0.5;
    const uu = u + off;
    const col = Math.floor(uu / bw);
    const colW = mod(col, cols);
    const lu = uu - col * bw, lv = v - row * bh;
    const e = Math.min(lu, bw - lu, lv, bh - lv);
    const id = hash2(rowW, colW, 41);
    const id2 = hash2(rowW, colW, 43);
    const edgeN = k.a.noise(u * 250, v * 250) * 0.003;
    const inBrick = smoothstep(mortar + edgeN, mortar + 0.006 + edgeN, e);
    const speck = k.tfbm(u, v, 90, 2, period, 1);
    const grit = k.tfbm(u, v, 30, 3, period, 2);
    const tone = 0.78 + id * 0.44 + speck * 0.08;
    const hueShift = (id2 - 0.5) * 0.12;
    const br = [color[0] * tone * (1 + hueShift), color[1] * tone * (1 - hueShift * 0.5), color[2] * tone * (1 - hueShift)];
    const mr = [0.72 + grit * 0.06, 0.70 + grit * 0.06, 0.66 + grit * 0.06];
    o.r = lerp(mr[0], br[0], inBrick);
    o.g = lerp(mr[1], br[1], inBrick);
    o.b = lerp(mr[2], br[2], inBrick);
    o.h = lerp(0.35 + grit * 0.05, 0.72 + speck * 0.06 + id2 * 0.05, inBrick);
    o.rough = lerp(0.95, 0.82 + speck * 0.05, inBrick);
    o.metal = 0;
    o.ao = lerp(0.65, 1, inBrick);
  };
}

/** Stacked stone veneer (fireplace / foundation). period 1m */
export function stackedStone(period = 1): PainterFn {
  const rows = 7;
  return (u, v, o, k) => {
    // irregular row heights
    const rh = period / rows;
    const row = Math.floor(v / rh);
    const rowW = mod(row, rows);
    const jitterTop = (hash2(rowW + 1, 9, 71) - 0.5) * rh * 0.35;
    const jitterBot = (hash2(rowW, 9, 71) - 0.5) * rh * 0.35;
    const lvRaw = v - row * rh;
    // stone lengths vary per row
    const len = 0.18 + hash2(rowW, 5, 73) * 0.16;
    const off = hash2(rowW, 6, 79) * period;
    const uu = u + off;
    const col = Math.floor(uu / len);
    const colW = mod(col, Math.max(1, Math.round(period / len)));
    const lu = uu - col * len;
    const id = hash2(rowW, colW, 83);
    const id2 = hash2(rowW, colW, 89);
    const eU = Math.min(lu, len - lu);
    const eV = Math.min(lvRaw - jitterBot, rh + jitterTop - lvRaw);
    const e = Math.min(eU, eV);
    const joint = 0.006;
    const inStone = smoothstep(joint, joint + 0.012, e);
    const surf = k.tfbm(u, v, 25, 3, period, 0);
    const chip = k.tridged(u, v, 40, 2, period);
    const grey = 0.42 + id * 0.35;
    const warm = (id2 - 0.5) * 0.1;
    const sr = grey * (1 + warm) + surf * 0.05, sg = grey + surf * 0.05, sb = grey * (1 - warm) + surf * 0.04;
    const mr = 0.28 + surf * 0.03;
    o.r = lerp(mr, sr, inStone);
    o.g = lerp(mr, sg, inStone);
    o.b = lerp(mr, sb, inStone);
    o.h = lerp(0.2, 0.55 + id * 0.25 + surf * 0.08 + chip * 0.05, inStone);
    o.rough = lerp(0.95, 0.75 + surf * 0.1, inStone);
    o.metal = 0;
    o.ao = lerp(0.55, 1, inStone);
  };
}

export function concrete(period = 2, tint: [number, number, number] = [0.58, 0.58, 0.57]): PainterFn {
  return (u, v, o, k) => {
    const n1 = k.tfbm(u, v, 1.5, 4, period, 0);
    const n2 = k.tfbm(u, v, 12, 3, period, 1);
    const speck = k.tfbm(u, v, 120, 1, period, 2);
    const crack = k.tridged(u, v, 3, 3, period);
    const crackLine = smoothstep(0.86, 0.98, crack) * 0.5;
    const tone = 1 + n1 * 0.12 + n2 * 0.06 + speck * 0.04 - crackLine * 0.35;
    setRGB(o, tint[0] * tone, tint[1] * tone, tint[2] * tone);
    o.h = 0.5 + n1 * 0.06 + n2 * 0.04 + speck * 0.02 - crackLine * 0.3;
    o.rough = clamp(0.88 + n2 * 0.06, 0, 1);
    o.metal = 0;
    o.ao = 1 - crackLine * 0.5;
  };
}

/** Square floor tiles with grout. period 1m, n tiles per metre. */
export function floorTile(n = 3, base: [number, number, number] = [0.86, 0.84, 0.80], grout: [number, number, number] = [0.55, 0.53, 0.50], period = 1, glossy = true): PainterFn {
  const tw = period / n;
  const g = 0.0025;
  return (u, v, o, k) => {
    const col = Math.floor(u / tw), row = Math.floor(v / tw);
    const cw = mod(col, n), rw = mod(row, n);
    const lu = u - col * tw, lv = v - row * tw;
    const e = Math.min(lu, tw - lu, lv, tw - lv);
    const inTile = smoothstep(g, g + 0.004, e);
    const id = hash2(cw, rw, 97);
    const vein = k.a.warp((u + cw * 3) * 3.5, (v + rw * 5) * 3.5, 1.2, 3);
    const veins = smoothstep(0.35, 0.65, Math.abs(vein)) * 0.12;
    const tone = 0.95 + id * 0.08 - veins;
    const gn = k.tfbm(u, v, 60, 2, period, 2) * 0.05;
    o.r = lerp(grout[0] + gn, base[0] * tone, inTile);
    o.g = lerp(grout[1] + gn, base[1] * tone, inTile);
    o.b = lerp(grout[2] + gn, base[2] * tone, inTile);
    o.h = lerp(0.3, 0.7 + vein * 0.01, inTile);
    o.rough = lerp(0.9, glossy ? 0.22 + veins : 0.6, inTile);
    o.metal = 0;
    o.ao = lerp(0.7, 1, inTile);
  };
}

/** Subway tile (running bond, 2:1). period 0.5m */
export function subwayTile(base: [number, number, number] = [0.93, 0.93, 0.90], period = 0.5): PainterFn {
  const rows = 6, cols = 2;
  const th = period / rows, tw = period / cols;
  const g = 0.002;
  return (u, v, o, k) => {
    const row = Math.floor(v / th);
    const rw = mod(row, rows);
    const off = (rw % 2) * tw * 0.5;
    const uu = u + off;
    const col = Math.floor(uu / tw);
    const cw = mod(col, cols);
    const lu = uu - col * tw, lv = v - row * th;
    const e = Math.min(lu, tw - lu, lv, th - lv);
    const inTile = smoothstep(g, g + 0.004, e);
    // slightly pillowed tile face
    const pillow = smoothstep(0, 0.02, e) * 0.15;
    const id = hash2(rw, cw, 101);
    const tone = 0.97 + id * 0.04;
    const gn = k.tfbm(u, v, 80, 2, period, 1) * 0.04;
    o.r = lerp(0.72 + gn, base[0] * tone, inTile);
    o.g = lerp(0.71 + gn, base[1] * tone, inTile);
    o.b = lerp(0.68 + gn, base[2] * tone, inTile);
    o.h = lerp(0.3, 0.6 + pillow, inTile);
    o.rough = lerp(0.85, 0.12, inTile);
    o.metal = 0;
    o.ao = lerp(0.75, 1, inTile);
  };
}

export function marble(period = 1, light: [number, number, number] = [0.92, 0.91, 0.88], veinColor: [number, number, number] = [0.35, 0.34, 0.36]): PainterFn {
  return (u, v, o, k) => {
    const w1 = k.tfbm(u, v, 2.0, 4, period, 0);
    const w2 = k.tfbm(u, v, 1.3, 3, period, 1);
    const vein1 = Math.abs(Math.sin((u * 2.5 + v * 1.3 + w1 * 1.8) * Math.PI));
    const vein2 = Math.abs(Math.sin((u * 0.8 - v * 2.2 + w2 * 2.4) * Math.PI));
    const v1 = 1 - smoothstep(0.0, 0.12, vein1);
    const v2 = (1 - smoothstep(0.0, 0.06, vein2)) * 0.6;
    const cloud = k.tfbm(u, v, 5, 3, period, 2) * 0.05;
    const t = clamp(v1 * 0.9 + v2, 0, 1);
    o.r = lerp(light[0] + cloud, veinColor[0], t);
    o.g = lerp(light[1] + cloud, veinColor[1], t);
    o.b = lerp(light[2] + cloud, veinColor[2], t);
    o.h = 0.5 - t * 0.02;
    o.rough = 0.12 + t * 0.08;
    o.metal = 0;
    o.ao = 1;
  };
}

export function granite(period = 0.6): PainterFn {
  return (u, v, o, k) => {
    const w = worley(u * 60, v * 60, Math.round(period * 60), 5);
    const sp = k.tfbm(u, v, 160, 1, period, 2);
    const base = 0.16 + w.id * 0.22 + sp * 0.05;
    const fleck = w.f1 < 0.25 && w.id > 0.85 ? 0.5 : 0;
    const tone = base + fleck;
    setRGB(o, tone * 1.02, tone, tone * 1.05);
    o.h = 0.5 + sp * 0.02;
    o.rough = 0.18 + sp * 0.05;
    o.metal = 0;
    o.ao = 1;
  };
}

// ---------------------------------------------------------------------------------------------
// Soft materials
// ---------------------------------------------------------------------------------------------

export function carpet(period = 1, tint: [number, number, number] = [0.72, 0.68, 0.60]): PainterFn {
  return (u, v, o, k) => {
    const fiber = k.tfbm(u, v, 140, 2, period, 0);
    const tuft = k.tfbm(u, v, 45, 2, period, 1);
    const shade = k.tfbm(u, v, 3, 2, period, 2);
    const tone = 1 + fiber * 0.12 + tuft * 0.08 + shade * 0.05;
    setRGB(o, tint[0] * tone, tint[1] * tone, tint[2] * tone);
    o.h = 0.5 + fiber * 0.2 + tuft * 0.15;
    o.rough = 1;
    o.metal = 0;
    o.ao = 0.92 + tuft * 0.08;
  };
}

export function fabricWeave(period = 0.5, tint: [number, number, number] = [0.8, 0.8, 0.8], threads = 160): PainterFn {
  return (u, v, o, k) => {
    const wu = Math.sin(u * threads * Math.PI * 2 / period * (period)) ;
    const wv = Math.sin(v * threads * Math.PI * 2);
    const weave = (wu * wv) * 0.5 + 0.5;
    const n = k.tfbm(u, v, 20, 2, period, 0);
    const shade = k.tfbm(u, v, 2, 2, period, 1);
    const tone = 0.9 + weave * 0.15 + n * 0.06 + shade * 0.04;
    setRGB(o, tint[0] * tone, tint[1] * tone, tint[2] * tone);
    o.h = 0.5 + weave * 0.25 + n * 0.05;
    o.rough = 0.92;
    o.metal = 0;
    o.ao = 1;
  };
}

export function leather(period = 0.5, tint: [number, number, number] = [0.45, 0.25, 0.14]): PainterFn {
  return (u, v, o, k) => {
    const w = worley(u * 90, v * 90, Math.round(period * 90), 9);
    const cell = smoothstep(0.02, 0.12, w.f2 - w.f1);
    const n = k.tfbm(u, v, 30, 3, period, 0);
    const wear = k.tfbm(u, v, 2.5, 3, period, 1);
    const tone = 0.85 + cell * 0.15 + n * 0.05 + wear * 0.12;
    setRGB(o, tint[0] * tone, tint[1] * tone, tint[2] * tone);
    o.h = 0.45 + cell * 0.25 + n * 0.05;
    o.rough = clamp(0.48 + (1 - cell) * 0.2 + wear * 0.1, 0, 1);
    o.metal = 0;
    o.ao = 0.9 + cell * 0.1;
  };
}

export function quilt(period = 0.6, tint: [number, number, number] = [0.9, 0.9, 0.92]): PainterFn {
  const cell = period / 3;
  return (u, v, o, k) => {
    // diamond lattice: rotate 45 degrees
    const a = (u + v) / cell, b = (u - v) / cell;
    const fa = Math.abs(fract(a) - 0.5) * 2, fb = Math.abs(fract(b) - 0.5) * 2;
    const seam = Math.min(fa, fb);
    const puff = smoothstep(0.0, 0.5, seam);
    const wrinkle = k.tfbm(u, v, 18, 3, period, 0);
    const weave = k.tfbm(u, v, 120, 1, period, 1);
    const tone = 0.9 + puff * 0.1 + wrinkle * 0.05 + weave * 0.03;
    setRGB(o, tint[0] * tone, tint[1] * tone, tint[2] * tone);
    o.h = 0.3 + puff * 0.5 + wrinkle * 0.1;
    o.rough = 0.9;
    o.metal = 0;
    o.ao = 0.85 + puff * 0.15;
  };
}

// ---------------------------------------------------------------------------------------------
// Exterior
// ---------------------------------------------------------------------------------------------

/** Horizontal clapboard siding. period 1m, 5 boards. */
export function siding(period = 1, boards = 5, tint: [number, number, number] = [0.86, 0.87, 0.84]): PainterFn {
  const bh = period / boards;
  return (u, v, o, k) => {
    const row = Math.floor(v / bh);
    const rw = mod(row, boards);
    const lv = v - row * bh;
    const t = lv / bh; // 0 at bottom lip, 1 at top (tucked under next)
    const lip = 1 - smoothstep(0.0, 0.08, t); // shadow line under the lip of the board above
    const grain = k.tfbm(u, v, 40, 2, period, 0) * 0.5 + k.tfbm(u * 0.2, v, 8, 2, period, 1) * 0.5;
    const dirt = k.tfbm(u, v, 3, 2, period, 2);
    const tone = 1 + grain * 0.035 + dirt * 0.03 - lip * 0.35 + hash2(rw, 1, 3) * 0.02;
    setRGB(o, tint[0] * tone, tint[1] * tone, tint[2] * tone);
    o.h = 0.35 + t * 0.4 + grain * 0.02; // each board slopes outward toward the bottom
    o.rough = 0.62 + grain * 0.06;
    o.metal = 0;
    o.ao = 1 - lip * 0.35;
  };
}

export function shingles(period = 1, rows = 4, tint: [number, number, number] = [0.22, 0.21, 0.20]): PainterFn {
  const rh = period / rows;
  const sw = period / 6;
  return (u, v, o, k) => {
    const row = Math.floor(v / rh);
    const rw = mod(row, rows);
    const off = (rw % 2) * sw * 0.5 + hash2(rw, 2, 211) * 0.05;
    const uu = u + off;
    const col = Math.floor(uu / sw);
    const cw = mod(col, 6);
    const lu = uu - col * sw, lv = v - row * rh;
    const t = lv / rh;
    const id = hash2(rw, cw, 223);
    const bottomJitter = id * 0.02;
    const lip = 1 - smoothstep(0.0, 0.12, t - bottomJitter);
    const sideGap = smoothstep(0.0, 0.004, Math.min(lu, sw - lu));
    const grit = k.tfbm(u, v, 110, 2, period, 0);
    const streak = k.tfbm(u * 0.5, v, 12, 2, period, 1);
    const tone = 0.85 + id * 0.35 + grit * 0.1 + streak * 0.08;
    const dark = (1 - lip * 0.6) * (0.6 + 0.4 * sideGap);
    setRGB(o, tint[0] * tone, tint[1] * tone, tint[2] * tone, dark);
    o.h = (0.3 + t * 0.5 + grit * 0.04) * sideGap;
    o.rough = 0.95;
    o.metal = 0;
    o.ao = dark;
  };
}

export function grass(period = 2): PainterFn {
  return (u, v, o, k) => {
    const blade = k.tfbm(u, v, 90, 2, period, 0);
    const clump = k.tfbm(u, v, 6, 3, period, 1);
    const patch = k.tfbm(u, v, 1.2, 2, period, 2);
    const dry = smoothstep(0.2, 0.7, patch) * 0.5;
    const g = 0.36 + clump * 0.08 + blade * 0.10;
    const r = 0.20 + clump * 0.05 + blade * 0.06 + dry * 0.18;
    const b = 0.09 + clump * 0.03 + blade * 0.02;
    setRGB(o, r, g + dry * 0.05, b);
    o.h = 0.5 + blade * 0.3 + clump * 0.15;
    o.rough = 0.92;
    o.metal = 0;
    o.ao = 0.85 + blade * 0.15;
  };
}

export function asphalt(period = 2): PainterFn {
  return (u, v, o, k) => {
    const sp = k.tfbm(u, v, 200, 1, period, 0);
    const n = k.tfbm(u, v, 8, 3, period, 1);
    const wear = k.tfbm(u, v, 0.8, 2, period, 2);
    const tone = 0.20 + sp * 0.06 + n * 0.03 + wear * 0.04;
    setRGB(o, tone, tone, tone * 1.04);
    o.h = 0.5 + sp * 0.1 + n * 0.05;
    o.rough = 0.95;
    o.metal = 0;
    o.ao = 1;
  };
}

/** Herringbone/running-bond pavers. period 1m */
export function pavers(period = 1): PainterFn {
  const pw = period / 5, ph = period / 10;
  return (u, v, o, k) => {
    const row = Math.floor(v / ph);
    const rw = mod(row, 10);
    const off = (rw % 2) * pw * 0.5;
    const uu = u + off;
    const col = Math.floor(uu / pw);
    const cw = mod(col, 5);
    const lu = uu - col * pw, lv = v - row * ph;
    const e = Math.min(lu, pw - lu, lv, ph - lv);
    const inP = smoothstep(0.004, 0.012, e);
    const id = hash2(rw, cw, 307);
    const id2 = hash2(rw, cw, 311);
    const n = k.tfbm(u, v, 60, 2, period, 0);
    const base = 0.5 + id * 0.25;
    const warm = (id2 - 0.5) * 0.15;
    const r = base * (1 + warm) + n * 0.05, g = base + n * 0.05, b = base * (1 - warm * 0.8) + n * 0.04;
    const sand = 0.55 + n * 0.05;
    o.r = lerp(sand, r, inP);
    o.g = lerp(sand * 0.95, g, inP);
    o.b = lerp(sand * 0.85, b, inP);
    o.h = lerp(0.3, 0.6 + n * 0.05 + id2 * 0.05, inP);
    o.rough = lerp(0.95, 0.8, inP);
    o.metal = 0;
    o.ao = lerp(0.7, 1, inP);
  };
}

export function bark(period = 1): PainterFn {
  return (u, v, o, k) => {
    const ridge = k.tridged(u * 4, v, 3, 4, period * 4);
    const fine = k.tfbm(u, v, 40, 2, period, 0);
    const moss = smoothstep(0.3, 0.7, k.tfbm(u, v, 2, 2, period, 1));
    const t = ridge * 0.7 + fine * 0.15;
    const r = 0.22 + t * 0.2, g = 0.16 + t * 0.15 + moss * 0.1, b = 0.10 + t * 0.08;
    setRGB(o, r, g, b);
    o.h = 0.3 + ridge * 0.6 + fine * 0.1;
    o.rough = 0.95;
    o.metal = 0;
    o.ao = 0.6 + ridge * 0.4;
  };
}

// ---------------------------------------------------------------------------------------------
// Metal / misc
// ---------------------------------------------------------------------------------------------

export function brushedMetal(period = 0.5, tint: [number, number, number] = [0.8, 0.8, 0.82]): PainterFn {
  return (u, v, o, k) => {
    const streak = k.tfbm(u * 0.05, v, 400, 1, period, 0);
    const smudge = k.tfbm(u, v, 4, 3, period, 1);
    const tone = 1 + streak * 0.08 + smudge * 0.04;
    setRGB(o, tint[0] * tone, tint[1] * tone, tint[2] * tone);
    o.h = 0.5 + streak * 0.04;
    o.rough = clamp(0.32 + streak * 0.08 + smudge * 0.08, 0, 1);
    o.metal = 1;
    o.ao = 1;
  };
}

export function paintedMetal(period = 0.5, tint: [number, number, number] = [0.9, 0.9, 0.9]): PainterFn {
  return (u, v, o, k) => {
    const n = k.tfbm(u, v, 80, 2, period, 0);
    const smudge = k.tfbm(u, v, 3, 2, period, 1);
    const tone = 1 + n * 0.02 + smudge * 0.02;
    setRGB(o, tint[0] * tone, tint[1] * tone, tint[2] * tone);
    o.h = 0.5 + n * 0.02;
    o.rough = clamp(0.35 + smudge * 0.1, 0, 1);
    o.metal = 0.1;
    o.ao = 1;
  };
}

export function soil(period = 2): PainterFn {
  return (u, v, o, k) => {
    const n = k.tfbm(u, v, 14, 3, period, 0);
    const clod = k.tridged(u, v, 30, 2, period);
    const tone = 0.9 + n * 0.15 + clod * 0.1;
    setRGB(o, 0.28 * tone, 0.20 * tone, 0.14 * tone);
    o.h = 0.5 + n * 0.2 + clod * 0.2;
    o.rough = 1;
    o.metal = 0;
    o.ao = 0.9 + n * 0.1;
  };
}

export function ceilingPopcorn(period = 1): PainterFn {
  return (u, v, o, k) => {
    const n = k.tfbm(u, v, 30, 3, period, 0);
    const tone = 1 + n * 0.03;
    setRGB(o, tone, tone, tone);
    o.h = 0.5 + n * 0.08;
    o.rough = 0.95;
    o.metal = 0;
    o.ao = 1;
  };
}

export function woodPanel(p: WoodPalette, period = 1, boards = 8): PainterFn {
  // vertical beadboard/panels: boards run along V
  const bw = period / boards;
  const grain = woodGrain(p, period, 6);
  return (u, v, o, k) => {
    const col = Math.floor(u / bw);
    const lu = u - col * bw;
    const e = Math.min(lu, bw - lu);
    const groove = smoothstep(0.003, 0.010, e);
    grain(v, u + mod(col, boards) * 0.37, o, k);
    o.r *= 0.6 + 0.4 * groove;
    o.g *= 0.6 + 0.4 * groove;
    o.b *= 0.6 + 0.4 * groove;
    o.h = o.h * groove + 0.2 * (1 - groove);
    o.ao = 0.7 + 0.3 * groove;
  };
}

// ---------------------------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------------------------

export const TEXTURE_SPECS: Record<string, TexSpec> = {
  oakFloor: { period: 2, size: 2048, normalStrength: 2.2, painter: plankFloor(WOOD.oak) },
  walnutFloor: { period: 2, size: 2048, normalStrength: 2.2, painter: plankFloor(WOOD.walnut, 2, 12, 1) },
  greyPlank: { period: 2, size: 1024, normalStrength: 2.0, painter: plankFloor(WOOD.grey, 2, 10, 1) },
  oak: { period: 1, size: 1024, normalStrength: 0.8, painter: woodGrain(WOOD.oak) },
  walnut: { period: 1, size: 1024, normalStrength: 0.8, painter: woodGrain(WOOD.walnut) },
  maple: { period: 1, size: 1024, normalStrength: 0.7, painter: woodGrain(WOOD.maple) },
  mahogany: { period: 1, size: 1024, normalStrength: 0.8, painter: woodGrain(WOOD.mahogany) },
  pine: { period: 1, size: 1024, normalStrength: 0.8, painter: woodGrain(WOOD.pine) },
  espresso: { period: 1, size: 1024, normalStrength: 0.7, painter: woodGrain(WOOD.espresso) },
  beadboard: { period: 1, size: 1024, normalStrength: 1.6, painter: woodPanel(WOOD.maple) },
  plaster: { period: 1, size: 1024, normalStrength: 0.5, painter: plaster() },
  ceiling: { period: 1, size: 512, normalStrength: 0.8, painter: ceilingPopcorn() },
  brick: { period: 1, size: 1024, normalStrength: 3.0, painter: brick() },
  brickPale: { period: 1, size: 1024, normalStrength: 3.0, painter: brick([0.78, 0.66, 0.55]) },
  stone: { period: 1, size: 1024, normalStrength: 3.5, painter: stackedStone() },
  concrete: { period: 2, size: 1024, normalStrength: 1.2, painter: concrete() },
  concreteDark: { period: 2, size: 1024, normalStrength: 1.2, painter: concrete(2, [0.42, 0.42, 0.42]) },
  tile: { period: 1, size: 1024, normalStrength: 2.0, painter: floorTile(3) },
  tileDark: { period: 1, size: 1024, normalStrength: 2.0, painter: floorTile(2, [0.30, 0.30, 0.31], [0.22, 0.22, 0.22]) },
  tileCheck: { period: 1, size: 1024, normalStrength: 2.0, painter: floorTile(4, [0.9, 0.9, 0.88], [0.6, 0.6, 0.58], 1, true) },
  subway: { period: 0.5, size: 1024, normalStrength: 2.2, painter: subwayTile() },
  marble: { period: 1, size: 1024, normalStrength: 0.4, painter: marble() },
  marbleDark: { period: 1, size: 1024, normalStrength: 0.4, painter: marble(1, [0.25, 0.25, 0.27], [0.75, 0.74, 0.72]) },
  granite: { period: 0.6, size: 1024, normalStrength: 0.6, painter: granite() },
  carpet: { period: 1, size: 1024, normalStrength: 1.4, painter: carpet() },
  carpetBlue: { period: 1, size: 1024, normalStrength: 1.4, painter: carpet(1, [0.32, 0.38, 0.50]) },
  fabric: { period: 0.5, size: 1024, normalStrength: 1.2, painter: fabricWeave() },
  leather: { period: 0.5, size: 1024, normalStrength: 1.6, painter: leather() },
  leatherBlack: { period: 0.5, size: 1024, normalStrength: 1.6, painter: leather(0.5, [0.12, 0.11, 0.11]) },
  quilt: { period: 0.6, size: 1024, normalStrength: 2.2, painter: quilt() },
  siding: { period: 1, size: 1024, normalStrength: 3.0, painter: siding() },
  shingles: { period: 1, size: 1024, normalStrength: 3.0, painter: shingles() },
  grass: { period: 2, size: 1024, normalStrength: 1.6, painter: grass() },
  asphalt: { period: 2, size: 1024, normalStrength: 1.0, painter: asphalt() },
  pavers: { period: 1, size: 1024, normalStrength: 2.5, painter: pavers() },
  bark: { period: 1, size: 512, normalStrength: 3.0, painter: bark() },
  steel: { period: 0.5, size: 512, normalStrength: 0.4, painter: brushedMetal() },
  paintedMetal: { period: 0.5, size: 512, normalStrength: 0.3, painter: paintedMetal() },
  soil: { period: 2, size: 512, normalStrength: 2.0, painter: soil() },
};

export interface GeneratedTexture {
  name: string;
  size: number;
  height: number;
  color: Uint8Array;  // RGBA
  normal: Uint8Array; // RGBA
  orm: Uint8Array;    // RGBA (ao, roughness, metalness)
}

const srgbEncode = (c: number) => {
  c = clamp(c, 0, 1);
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
};

/** Generate one texture set at the given pixel size. Pure CPU work. */
export function generateTexture(name: string, size: number, seed = 1): GeneratedTexture {
  const spec = TEXTURE_SPECS[name];
  if (!spec) throw new Error('unknown texture ' + name);
  const kit = makeKit(seed + name.length * 7 + name.charCodeAt(0));
  const W = size;
  const H = spec.aspect ? Math.round(size / spec.aspect) : size;
  const periodU = spec.period;
  const periodV = spec.aspect ? spec.period / spec.aspect : spec.period;
  const color = new Uint8Array(W * H * 4);
  const orm = new Uint8Array(W * H * 4);
  const height = new Float32Array(W * H);
  const o: Px = { r: 0, g: 0, b: 0, h: 0.5, rough: 0.5, metal: 0, ao: 1 };
  // colour painters produce values in a perceptual (already gamma-ish) space; treat them as sRGB directly.
  for (let y = 0; y < H; y++) {
    const v = (y / H) * periodV;
    for (let x = 0; x < W; x++) {
      const u = (x / W) * periodU;
      o.r = 0; o.g = 0; o.b = 0; o.h = 0.5; o.rough = 0.5; o.metal = 0; o.ao = 1;
      spec.painter(u, v, o, kit);
      const i = (y * W + x) * 4;
      color[i] = clamp(o.r, 0, 1) * 255;
      color[i + 1] = clamp(o.g, 0, 1) * 255;
      color[i + 2] = clamp(o.b, 0, 1) * 255;
      color[i + 3] = 255;
      orm[i] = clamp(o.ao, 0, 1) * 255;
      orm[i + 1] = clamp(o.rough, 0, 1) * 255;
      orm[i + 2] = clamp(o.metal, 0, 1) * 255;
      orm[i + 3] = 255;
      height[y * W + x] = o.h;
    }
  }
  // Sobel -> normal map (tangent space, +Y up in texture space, OpenGL convention)
  const normal = new Uint8Array(W * H * 4);
  const s = spec.normalStrength * (W / 1024);
  for (let y = 0; y < H; y++) {
    const ym = (y - 1 + H) % H, yp = (y + 1) % H;
    for (let x = 0; x < W; x++) {
      const xm = (x - 1 + W) % W, xp = (x + 1) % W;
      const tl = height[ym * W + xm], t = height[ym * W + x], tr = height[ym * W + xp];
      const l = height[y * W + xm], r = height[y * W + xp];
      const bl = height[yp * W + xm], b = height[yp * W + x], br = height[yp * W + xp];
      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);
      let nx = -dx * s, ny = -dy * s, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      const i = (y * W + x) * 4;
      normal[i] = (nx * 0.5 + 0.5) * 255;
      normal[i + 1] = (ny * 0.5 + 0.5) * 255;
      normal[i + 2] = (nz * 0.5 + 0.5) * 255;
      normal[i + 3] = 255;
    }
  }
  void srgbEncode;
  return { name, size: W, height: H, color, normal, orm };
}
