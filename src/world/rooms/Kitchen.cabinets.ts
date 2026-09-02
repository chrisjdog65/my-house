/**
 * Kitchen.cabinets — shaker cabinet primitives used by the kitchen builder: recessed-panel
 * fronts, brushed bar pulls, base / upper runs (with optional hinged doors that open on
 * interaction) and countertops.
 *
 * Runs are built in a LOCAL frame: the run goes along +x from x=0, the back sits on z=0 and the
 * fronts face +z. Static parts are added to `group`; hinged doors are added to `dyn`, which must be
 * a group in ctx.dynamic carrying the same transform as `group`.
 */
import * as THREE from 'three';
import { Prim, mergeByMaterial } from '../Builder';
import type { Ctx } from '../Context';
import { hinged, type HingedPanel } from '../Props';

export const COUNTER_H = 0.9; // top surface of the counters
export const COUNTER_T = 0.04; // slab thickness
export const BASE_H = COUNTER_H - COUNTER_T; // carcass height (0.86)
export const BASE_D = 0.6;
export const TOE_H = 0.1;
export const TOE_IN = 0.05;
export const UPPER_H = 0.8;
export const UPPER_D = 0.35;
export const FRONT_T = 0.02;

export interface CabinetStyle {
  frame: THREE.Material;
  panel: THREE.Material;
  pull: THREE.Material;
  toe: THREE.Material;
  interior: THREE.Material;
}

export function cabinetStyle(ctx: Ctx, color: number, panelColor: number): CabinetStyle {
  const m = ctx.mats;
  return {
    frame: m.solid(color, { roughness: 0.42, envMapIntensity: 0.55 }),
    panel: m.solid(panelColor, { roughness: 0.5, envMapIntensity: 0.45 }),
    pull: m.steel,
    toe: m.solid(0x26272a, { roughness: 0.75 }),
    interior: m.maple,
  };
}

/** Shaker door / drawer front centred on (0,0) with its back on z=0 and its face at z=t. */
export function shakerFront(w: number, h: number, style: CabinetStyle, opts: { t?: number; frameW?: number } = {}): THREE.Group {
  const t = opts.t ?? FRONT_T;
  const g = new THREE.Group();
  if (h < 0.11 || w < 0.16) {
    const slab = Prim.rbox(w, h, t, 0.003, style.frame, { segments: 2 });
    slab.position.z = t / 2;
    g.add(slab);
    return g;
  }
  const fw = opts.frameW ?? Math.min(0.065, w * 0.22, h * 0.28);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -h / 2); shape.lineTo(w / 2, -h / 2); shape.lineTo(w / 2, h / 2); shape.lineTo(-w / 2, h / 2); shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-w / 2 + fw, -h / 2 + fw); hole.lineTo(-w / 2 + fw, h / 2 - fw); hole.lineTo(w / 2 - fw, h / 2 - fw); hole.lineTo(w / 2 - fw, -h / 2 + fw); hole.closePath();
  shape.holes.push(hole);
  const frame = Prim.extrude(shape, t, style.frame, { curveSegments: 1 });
  frame.position.z = t / 2;
  const panel = Prim.box(w - 2 * fw + 0.004, h - 2 * fw + 0.004, t * 0.5, style.panel);
  panel.position.z = t * 0.25;
  g.add(frame, panel);
  return g;
}

/** Brushed bar pull lying on the z=0 plane (the door face), standing 0.03 proud. */
export function barPull(len: number, mat: THREE.Material, vertical = false): THREE.Group {
  const g = new THREE.Group();
  const bar = Prim.rbox(len, 0.011, 0.011, 0.004, mat, { segments: 2 });
  bar.position.z = 0.034;
  g.add(bar);
  for (const s of [-1, 1]) {
    const post = Prim.cylinder(0.0045, 0.0045, 0.03, mat, { segments: 8 });
    post.rotation.x = Math.PI / 2;
    post.position.set(s * (len / 2 - 0.018), 0, 0.015);
    g.add(post);
  }
  if (vertical) g.rotation.z = Math.PI / 2;
  return g;
}

export interface Box { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }

export interface OpenSpec {
  label: string;
  sfx?: 'drawer' | 'fridge' | 'doorOpen';
  /** decorate the inside of the carcass (run-local coordinates) */
  interior?: (g: THREE.Group, box: Box) => void;
  /** hole in the carcass top (run-local x/z), e.g. for an undermount sink basin */
  topCut?: { x0: number; x1: number; z0: number; z1: number };
}

export type FrontSpec =
  | { kind: 'drawers'; n: number }
  | { kind: 'door'; hinge: 'left' | 'right'; drawer?: boolean; open?: OpenSpec }
  | { kind: 'doors'; drawer?: boolean; falseFront?: boolean; open?: OpenSpec & { side: 'left' | 'right' } }
  | { kind: 'blank' };

export interface Unit { w: number; front: FrontSpec }

export interface RunOpts {
  depth?: number;
  height?: number;
  /** toe kick (base cabinets) */
  toe?: boolean;
  /** where door pulls sit: near the top (base) or bottom (uppers) */
  pullAt?: 'top' | 'bottom';
  /** light rail lip under the run (uppers) */
  lip?: boolean;
  /** exposed end panels [left, right] */
  ends?: [boolean, boolean];
}

const GAP = 0.004;
const EDGE = 0.003;

/** Build a run of cabinets. Returns the run length and the hinged panels created. */
export function buildRun(ctx: Ctx, group: THREE.Group, dyn: THREE.Group, style: CabinetStyle, units: Unit[], opts: RunOpts = {}): { length: number; panels: HingedPanel[] } {
  const D = opts.depth ?? BASE_D;
  const H = opts.height ?? BASE_H;
  const toe = opts.toe ?? true;
  const pullAt = opts.pullAt ?? 'top';
  const zFace = D - FRONT_T;
  const yFront0 = toe ? TOE_H : 0;
  const panels: HingedPanel[] = [];
  let x = 0;
  const add = (w: number, h: number, d: number, px: number, py: number, pz: number, mat: THREE.Material) => {
    const b = Prim.box(w, h, d, mat);
    b.position.set(px, py, pz);
    group.add(b);
    return b;
  };

  for (const u of units) {
    const { w } = u;
    const f = u.front;
    if (f.kind !== 'blank') {
      const open = f.kind === 'door' ? f.open : f.kind === 'doors' ? f.open : undefined;
      const y0 = yFront0, y1 = H;
      if (open) {
        // hollow carcass: bottom, top, sides, back (interior material)
        const im = style.interior;
        add(w, 0.02, zFace, x + w / 2, y0 + 0.01, zFace / 2, im);
        const tc = open.topCut;
        if (tc) {
          // top plate in four pieces around the cutout
          const piece = (a: number, b: number, c: number, d: number) => { if (b - a > 0.005 && d - c > 0.005) add(b - a, 0.02, d - c, (a + b) / 2, y1 - 0.01, (c + d) / 2, im); };
          const cx0 = Math.max(x, tc.x0), cx1 = Math.min(x + w, tc.x1), cz0 = Math.max(0, tc.z0), cz1 = Math.min(zFace, tc.z1);
          piece(x, cx0, 0, zFace);
          piece(cx1, x + w, 0, zFace);
          piece(cx0, cx1, 0, cz0);
          piece(cx0, cx1, cz1, zFace);
        } else {
          add(w, 0.02, zFace, x + w / 2, y1 - 0.01, zFace / 2, im);
        }
        // sides: painted skin on the outside (may be exposed next to a window/hood slot or a run end), maple inside
        add(0.004, y1 - y0, zFace, x + 0.002, (y0 + y1) / 2, zFace / 2, style.frame);
        add(0.014, y1 - y0, zFace, x + 0.011, (y0 + y1) / 2, zFace / 2, im);
        add(0.004, y1 - y0, zFace, x + w - 0.002, (y0 + y1) / 2, zFace / 2, style.frame);
        add(0.014, y1 - y0, zFace, x + w - 0.011, (y0 + y1) / 2, zFace / 2, im);
        add(w, y1 - y0, 0.012, x + w / 2, (y0 + y1) / 2, 0.006, im);
        open.interior?.(group, { x0: x + 0.018, x1: x + w - 0.018, y0: y0 + 0.02, y1: y1 - 0.02, z0: 0.012, z1: zFace });
      } else {
        add(w - 0.002, y1 - y0, zFace, x + w / 2, (y0 + y1) / 2, zFace / 2, style.frame);
      }
      if (toe) add(w, TOE_H, D - TOE_IN - FRONT_T, x + w / 2, TOE_H / 2, (D - TOE_IN - FRONT_T) / 2, style.toe);
      buildFronts(ctx, group, dyn, style, f, x, yFront0, w, H - yFront0, zFace, pullAt, panels);
    }
    x += w;
  }
  const L = x;
  if (opts.lip) {
    const lip = Prim.box(L, 0.035, FRONT_T, style.frame);
    lip.position.set(L / 2, -0.0175, zFace + FRONT_T / 2);
    group.add(lip);
  }
  if (opts.ends) {
    const eh = H - (toe ? 0 : 0);
    if (opts.ends[0]) add(0.02, eh, D, -0.01, eh / 2, D / 2, style.frame);
    if (opts.ends[1]) add(0.02, eh, D, L + 0.01, eh / 2, D / 2, style.frame);
  }
  return { length: L, panels };
}

function buildFronts(ctx: Ctx, group: THREE.Group, dyn: THREE.Group, style: CabinetStyle, f: FrontSpec, x0: number, y0: number, w: number, fh: number, zFace: number, pullAt: 'top' | 'bottom', panels: HingedPanel[]) {
  const ix0 = x0 + EDGE, ix1 = x0 + w - EDGE;
  const iy0 = y0 + EDGE, iy1 = y0 + fh - EDGE;
  const iw = ix1 - ix0, ih = iy1 - iy0;

  const drawer = (cx: number, cy: number, dw: number, dh: number, withPull = true) => {
    const front = shakerFront(dw, dh, style);
    front.position.set(cx, cy, zFace);
    group.add(front);
    if (withPull) {
      const n = dw > 0.95 ? 2 : 1;
      const len = dw > 0.6 ? 0.2 : 0.13;
      for (let i = 0; i < n; i++) {
        const p = barPull(len, style.pull);
        p.position.set(cx + (n === 1 ? 0 : (i - 0.5) * dw * 0.5), cy, zFace + FRONT_T);
        group.add(p);
      }
    }
  };

  const door = (cx: number, cy: number, dw: number, dh: number, hinge: 'left' | 'right', open?: OpenSpec) => {
    const freeSign = hinge === 'left' ? 1 : -1;
    const pullX = freeSign * (dw / 2 - 0.05);
    const pullY = pullAt === 'top' ? dh / 2 - 0.12 : -dh / 2 + 0.12;
    if (!open) {
      const front = shakerFront(dw, dh, style);
      front.position.set(cx, cy, zFace);
      group.add(front);
      const p = barPull(0.13, style.pull, true);
      p.position.set(cx + pullX, cy + pullY, zFace + FRONT_T);
      group.add(p);
      return;
    }
    const hingeX = hinge === 'left' ? cx - dw / 2 : cx + dw / 2;
    const hp = hinged(ctx, dyn, new THREE.Vector3(hingeX, cy - dh / 2, zFace), (pivot) => {
      const tmp = new THREE.Group();
      const front = shakerFront(dw, dh, style);
      front.position.set(freeSign * dw / 2, dh / 2, 0);
      tmp.add(front);
      const p = barPull(0.13, style.pull, true);
      p.position.set(freeSign * dw / 2 + pullX, dh / 2 + pullY, FRONT_T);
      tmp.add(p);
      pivot.add(mergeByMaterial(tmp));
    }, open.label, { maxAngle: hinge === 'left' ? -1.75 : 1.75, sfx: open.sfx ?? 'drawer' });
    panels.push(hp);
  };

  if (f.kind === 'drawers') {
    const n = f.n;
    const dh = (ih - (n - 1) * GAP) / n;
    for (let i = 0; i < n; i++) drawer((ix0 + ix1) / 2, iy1 - dh / 2 - i * (dh + GAP), iw, dh);
  } else if (f.kind === 'door') {
    let top = iy1;
    if (f.drawer) {
      const dh = 0.15;
      drawer((ix0 + ix1) / 2, iy1 - dh / 2, iw, dh);
      top = iy1 - dh - GAP;
    }
    const dh = top - iy0;
    door((ix0 + ix1) / 2, iy0 + dh / 2, iw, dh, f.hinge, f.open);
  } else if (f.kind === 'doors') {
    let top = iy1;
    if (f.drawer || f.falseFront) {
      const dh = f.falseFront ? 0.13 : 0.15;
      drawer((ix0 + ix1) / 2, iy1 - dh / 2, iw, dh, !f.falseFront);
      top = iy1 - dh - GAP;
    }
    const dh = top - iy0;
    const dw = (iw - GAP) / 2;
    const lx = ix0 + dw / 2, rx = ix1 - dw / 2;
    door(lx, iy0 + dh / 2, dw, dh, 'left', f.open?.side === 'left' ? f.open : undefined);
    door(rx, iy0 + dh / 2, dw, dh, 'right', f.open?.side === 'right' ? f.open : undefined);
  }
}

/**
 * Countertop slab(s) in run-local coordinates covering x0..x1, z0..z1 at y BASE_H..COUNTER_H.
 * A rectangular `cutout` (sink) splits the slab into four pieces. Returns a group (unpositioned).
 */
export function countertop(mat: THREE.Material, x0: number, x1: number, z0: number, z1: number, cutout?: { x0: number; x1: number; z0: number; z1: number }, y = BASE_H, t = COUNTER_T): THREE.Group {
  const g = new THREE.Group();
  const slab = (a: number, b: number, c: number, d: number) => {
    if (b - a < 0.005 || d - c < 0.005) return;
    const m = Prim.box(b - a, t, d - c, mat);
    m.position.set((a + b) / 2, y + t / 2, (c + d) / 2);
    g.add(m);
  };
  if (!cutout) slab(x0, x1, z0, z1);
  else {
    slab(x0, cutout.x0, z0, z1);
    slab(cutout.x1, x1, z0, z1);
    slab(cutout.x0, cutout.x1, z0, cutout.z0);
    slab(cutout.x0, cutout.x1, cutout.z1, z1);
  }
  return g;
}

/** A simple shelf board inside a carcass box (run-local). */
export function shelf(g: THREE.Group, mat: THREE.Material, box: Box, y: number, inset = 0.01) {
  const s = Prim.box(box.x1 - box.x0 - 0.002, 0.018, box.z1 - box.z0 - inset, mat);
  s.position.set((box.x0 + box.x1) / 2, y, (box.z0 + box.z1 - inset) / 2);
  g.add(s);
}
