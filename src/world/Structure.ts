/**
 * Builds the house shell from Plan.ts: walls (two skins, openings), doors, windows, trim,
 * floors/ceilings with stair holes, stairs, railings, roof, chimney, porch and foundation.
 */
import * as THREE from 'three';
import { Prim, metricUV, mergeByMaterial } from './Builder';
import type { Ctx } from './Context';
import {
  HOUSE, LEVELS, ROOMS, WALLS, OPENINGS, STAIRS, FLOOR_HOLES, RAILINGS, PORCH, roomAt,
  type FloorId, type OpeningDef, type WallDef, type RoomDef,
} from './Plan';
import type { Interactable, InteractContext } from './Interactables';
import { GROUP } from '../core/Physics';

type Rect = [number, number, number, number]; // x0 z0 x1 z1

export function rectMinusHoles(rect: Rect, holes: Rect[]): Rect[] {
  let out: Rect[] = [rect];
  for (const h of holes) {
    const next: Rect[] = [];
    for (const r of out) {
      const [x0, z0, x1, z1] = r;
      const ix0 = Math.max(x0, h[0]), iz0 = Math.max(z0, h[1]), ix1 = Math.min(x1, h[2]), iz1 = Math.min(z1, h[3]);
      if (ix0 >= ix1 || iz0 >= iz1) { next.push(r); continue; }
      if (iz0 > z0) next.push([x0, z0, x1, iz0]);
      if (iz1 < z1) next.push([x0, iz1, x1, z1]);
      if (ix0 > x0) next.push([x0, iz0, ix0, iz1]);
      if (ix1 < x1) next.push([ix1, iz0, x1, iz1]);
    }
    out = next;
  }
  return out.filter((r) => r[2] - r[0] > 0.01 && r[3] - r[1] > 0.01);
}

/** Door: hinged leaf with a kinematic collider and an interactable. */
export class Door implements Interactable {
  object: THREE.Group;
  pivot: THREE.Group;
  open = false;
  angle = 0;
  private target = 0;
  private maxAngle: number;
  private sign = 1;
  private body: any;
  private leafCenter: THREE.Vector3;
  private leafSize: THREE.Vector3;
  focus: THREE.Vector3;
  radius = 2.4;
  proximity = true;
  name: string;
  locked = false;
  private lastMoving = false;
  private wallNormal = new THREE.Vector3(0, 0, 1);

  constructor(private ctx: Ctx, readonly def: OpeningDef, wallAlongX: boolean, floorY: number, thickness: number, opts: { exterior?: boolean } = {}) {
    const w = def.w - 0.04, h = def.h - 0.02;
    const t = opts.exterior ? 0.05 : 0.04;
    this.name = def.id ?? 'door';
    this.object = new THREE.Group();
    this.pivot = new THREE.Group();
    this.object.add(this.pivot);
    const hingeLow = def.hinge !== 'right';
    // world hinge position
    const hx = wallAlongX ? def.x + (hingeLow ? -def.w / 2 + 0.02 : def.w / 2 - 0.02) : def.x;
    const hz = wallAlongX ? def.z : def.z + (hingeLow ? -def.w / 2 + 0.02 : def.w / 2 - 0.02);
    this.object.position.set(hx, floorY, hz);
    let base: number;
    if (wallAlongX) base = hingeLow ? 0 : Math.PI;
    else base = hingeLow ? -Math.PI / 2 : Math.PI / 2;
    this.object.rotation.y = base;
    // determine sign so that a positive angle swings toward def.swing * normal
    const normal = wallAlongX ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    this.wallNormal = normal.clone();
    const testDir = new THREE.Vector3(Math.cos(base + 0.1), 0, -Math.sin(base + 0.1));
    const towards = Math.sign(testDir.dot(normal)) || 1;
    this.sign = towards === (def.swing ?? 1) ? 1 : -1;
    this.maxAngle = Math.PI * 0.52;

    // leaf
    const mats = ctx.mats;
    const leafMat = opts.exterior ? mats.mahogany : mats.solid(0xf4f1ea, { roughness: 0.45, envMapIntensity: 0.5 });
    const leaf = new THREE.Group();
    const slab = Prim.rbox(w, h, t, 0.006, leafMat, { name: 'doorLeaf' });
    slab.position.set(w / 2, h / 2, 0);
    leaf.add(slab);
    // raised panels (2 columns x 3 rows) on both faces
    const panelMat = opts.exterior ? mats.mahogany : mats.solid(0xece8df, { roughness: 0.5, envMapIntensity: 0.4 });
    const cols = 2, rows = 3;
    const pw = (w - 0.1 * (cols + 1)) / cols;
    const rowHeights = [0.34, 0.34, 0.2];
    const totalH = rowHeights.reduce((a, b) => a + b, 0);
    const gap = (h - 0.16) * (1 - totalH) / (rows + 1);
    for (let side = -1; side <= 1; side += 2) {
      let y = 0.1 + gap;
      for (let r = rows - 1; r >= 0; r--) {
        const ph = (h - 0.16) * rowHeights[r];
        for (let c = 0; c < cols; c++) {
          const px = 0.1 + c * (pw + 0.1) + pw / 2;
          const p = Prim.box(pw, ph, 0.012, panelMat);
          p.position.set(px, y + ph / 2, side * (t / 2 + 0.003));
          leaf.add(p);
          const inner = Prim.box(pw - 0.08, ph - 0.08, 0.012, leafMat);
          inner.position.set(px, y + ph / 2, side * (t / 2 + 0.008));
          leaf.add(inner);
        }
        y += ph + gap;
      }
    }
    // handle (lever) both sides
    const handleMat = opts.exterior ? mats.darkMetal : mats.brass;
    for (let side = -1; side <= 1; side += 2) {
      const rose = Prim.cylinder(0.03, 0.03, 0.012, handleMat);
      rose.rotation.x = Math.PI / 2;
      rose.position.set(w - 0.09, 1.02, side * (t / 2 + 0.006));
      leaf.add(rose);
      const lever = Prim.rbox(0.12, 0.018, 0.018, 0.006, handleMat);
      lever.position.set(w - 0.09 - 0.045, 1.02, side * (t / 2 + 0.03));
      leaf.add(lever);
      const stem = Prim.cylinder(0.009, 0.009, 0.03, handleMat);
      stem.rotation.x = Math.PI / 2;
      stem.position.set(w - 0.09, 1.02, side * (t / 2 + 0.018));
      leaf.add(stem);
    }
    if (opts.exterior) {
      // small window in the top of an exterior door
      const glass = Prim.box(w * 0.5, 0.35, t + 0.01, mats.glassFrosted, { cast: false });
      glass.position.set(w / 2, h - 0.35, 0);
      leaf.add(glass);
      const kick = Prim.box(w - 0.1, 0.18, 0.006, mats.brass);
      kick.position.set(w / 2, 0.12, t / 2 + 0.004);
      leaf.add(kick);
    }
    // merge the leaf into one mesh per material (a door is ~45 parts otherwise)
    this.pivot.add(mergeByMaterial(leaf));
    ctx.dynamic.add(this.object);
    this.leafCenter = new THREE.Vector3(w / 2, h / 2, 0);
    this.leafSize = new THREE.Vector3(w, h, t + 0.02);
    this.focus = new THREE.Vector3(def.x, floorY + 1, def.z);
    // kinematic collider
    const c = this.worldLeafCenter();
    const q = this.pivot.getWorldQuaternion(new THREE.Quaternion());
    const kb = ctx.physics.addKinematicBox(c, this.leafSize, q, { group: GROUP.DOOR, meta: { door: this } });
    this.body = kb.body;
    void thickness;
  }

  private worldLeafCenter() {
    this.object.updateWorldMatrix(true, true);
    return this.leafCenter.clone().applyMatrix4(this.pivot.matrixWorld);
  }

  getPrompt() {
    if (this.locked) return 'Locked';
    return this.open ? 'Close door' : 'Open door';
  }

  interact(ictx: InteractContext) {
    if (this.locked) { this.ctx.audio.play('click', this.focus); return; }
    this.setOpen(!this.open, ictx.playerPos);
  }

  setOpen(open: boolean, from?: THREE.Vector3) {
    this.open = open;
    if (open) {
      // swing AWAY from whoever opens it (never shove the player); default to the plan's swing side
      let side = this.def.swing ?? 1;
      if (from) {
        const hinge = this.object.position;
        const n = this.wallNormal;
        const playerSide = Math.sign((from.x - hinge.x) * n.x + (from.z - hinge.z) * n.z) || -side;
        side = -playerSide as 1 | -1;
      }
      const angleSign = side === (this.def.swing ?? 1) ? this.sign : -this.sign;
      this.target = angleSign * this.maxAngle;
      this.ctx.audio.play('doorOpen', this.focus);
      this.ctx.audio.play('doorCreak', this.focus, 0.5);
    } else {
      this.target = 0;
    }
  }

  update(dt: number) {
    const diff = this.target - this.angle;
    const moving = Math.abs(diff) > 0.002;
    if (moving) {
      const k = 1 - Math.exp(-dt * 7);
      this.angle += diff * k;
      if (Math.abs(this.target - this.angle) < 0.002) {
        this.angle = this.target;
        if (this.target === 0) this.ctx.audio.play('doorClose', this.focus, 0.8);
      }
      this.pivot.rotation.y = this.angle;
      const c = this.worldLeafCenter();
      const q = this.pivot.getWorldQuaternion(new THREE.Quaternion());
      this.body.setNextKinematicTranslation({ x: c.x, y: c.y, z: c.z });
      this.body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    }
    this.lastMoving = moving;
  }
}

export class Structure {
  doors = new Map<string, Door>();
  bounds = new THREE.Box3(new THREE.Vector3(HOUSE.x0 - 1, -4, HOUSE.z0 - 1), new THREE.Vector3(HOUSE.x1 + 1, HOUSE.roofPeak + 1, HOUSE.z1 + 3));
  /** window glass meshes (for night-time emissive tricks etc.) */
  windows: THREE.Mesh[] = [];

  constructor(private ctx: Ctx) {}

  build() {
    for (const w of WALLS) this.buildWall(w);
    for (const floor of ['basement', 'ground', 'upper'] as FloorId[]) this.buildFloorsAndCeilings(floor);
    for (const s of STAIRS) this.buildStairs(s);
    for (const r of RAILINGS) this.buildRailing(r.floor, r.x0, r.z0, r.x1, r.z1);
    this.buildRoof();
    this.buildChimney();
    this.buildPorch();
    this.buildAtticFloor();
  }

  // ------------------------------------------------------------------------------------------
  // Walls
  // ------------------------------------------------------------------------------------------

  private floorMaterial(room: RoomDef) {
    const m = this.ctx.mats;
    switch (room.floorMat) {
      case 'oak': return m.oakFloor;
      case 'walnut': return m.walnutFloor;
      case 'tile': return m.tile;
      case 'tileDark': return m.tileDark;
      case 'tileCheck': return m.tileCheck;
      case 'carpet': return m.carpet(0xcfc6b4);
      case 'carpetBlue': return m.carpetBlue;
      case 'concrete': return m.concrete;
      case 'greyPlank': return m.greyPlank;
    }
  }

  private isUnfinished(room: RoomDef | null) {
    return !!room && room.floor === 'basement' && room.id !== 'rec';
  }

  private skinMaterial(wall: WallDef, sidePoint: THREE.Vector3): THREE.Material {
    const m = this.ctx.mats;
    const lvl = LEVELS[wall.floor];
    const room = roomAt(sidePoint.x, lvl.y + 1, sidePoint.z);
    if (!room) {
      if (wall.floor === 'basement') return m.tex('concrete', { color: 0xbdbcb8, normalScale: 0.6 });
      if (wall.material === 'brick') return m.brick;
      return m.siding(0xdfe3dc);
    }
    if (this.isUnfinished(room)) return m.tex('concrete', { color: 0xd8d8d4, normalScale: 0.5, envMapIntensity: 0.3 });
    return m.wall(room.wallColor);
  }

  private buildWall(wall: WallDef) {
    const ctx = this.ctx;
    const lvl = LEVELS[wall.floor];
    const alongX = Math.abs(wall.z1 - wall.z0) < 1e-6;
    const len = alongX ? wall.x1 - wall.x0 : wall.z1 - wall.z0;
    const t = wall.thickness;
    const yBottom = lvl.y;
    const yTop = wall.height !== undefined ? lvl.y + wall.height : lvl.y + lvl.ceiling;
    // openings on this wall
    const ops = OPENINGS[wall.floor].filter((o) => {
      if (alongX) return Math.abs(o.z - wall.z0) < 0.01 && o.x >= wall.x0 - 0.01 && o.x <= wall.x1 + 0.01;
      return Math.abs(o.x - wall.x0) < 0.01 && o.z >= wall.z0 - 0.01 && o.z <= wall.z1 + 0.01;
    }).map((o) => ({ o, t: alongX ? o.x - wall.x0 : o.z - wall.z0 })).sort((a, b) => a.t - b.t);

    const ext = alongX ? (wall.exterior ? t / 2 : t / 2 - 0.01) : 0; // extend X walls to close corners
    const normal = alongX ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    const axis = alongX ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const origin = new THREE.Vector3(wall.x0, 0, wall.z0);

    // material per side
    const midAlong = len / 2;
    const midPoint = origin.clone().addScaledVector(axis, midAlong);
    const matPos = this.skinMaterial(wall, midPoint.clone().addScaledVector(normal, t / 2 + 0.2));
    const matNeg = this.skinMaterial(wall, midPoint.clone().addScaledVector(normal, -t / 2 - 0.2));
    const roomPos = roomAt(midPoint.x + normal.x * (t / 2 + 0.2), lvl.y + 1, midPoint.z + normal.z * (t / 2 + 0.2));
    const roomNeg = roomAt(midPoint.x - normal.x * (t / 2 + 0.2), lvl.y + 1, midPoint.z - normal.z * (t / 2 + 0.2));

    // exterior outer skins run taller to cover slabs; interior skins run floor->ceiling
    const outerRange: Record<FloorId, [number, number]> = { basement: [-3.3, 0], ground: [0, 3.05], upper: [3.05, HOUSE.roofBase] };

    const addPiece = (a: number, b: number, y0: number, y1: number, sideSign: number, material: THREE.Material, collide: boolean) => {
      if (b - a <= 0.001 || y1 - y0 <= 0.001) return;
      const L = b - a;
      const H = y1 - y0;
      const mesh = Prim.box(alongX ? L : t / 2, H, alongX ? t / 2 : L, material);
      const center = origin.clone().addScaledVector(axis, (a + b) / 2).addScaledVector(normal, sideSign * t / 4);
      mesh.position.set(center.x, (y0 + y1) / 2, center.z);
      ctx.batch.add(mesh, { worldUV: true });
      if (collide) ctx.physics.addBox(mesh.position, { x: alongX ? L : t / 2, y: H, z: alongX ? t / 2 : L }, 0, { meta: { surface: 'wall' } });
    };

    const buildSkin = (sideSign: number, material: THREE.Material, room: RoomDef | null) => {
      const isOutside = room === null;
      const [oy0, oy1] = isOutside && wall.exterior ? outerRange[wall.floor] : [yBottom, yTop];
      let cursor = -ext;
      for (const { o, t: ot } of ops) {
        const a = ot - o.w / 2, b = ot + o.w / 2;
        addPiece(cursor, a, oy0, oy1, sideSign, material, true);
        // below
        addPiece(a, b, oy0, yBottom + o.bottom, sideSign, material, true);
        // above
        addPiece(a, b, yBottom + o.bottom + o.h, oy1, sideSign, material, true);
        cursor = b;
      }
      addPiece(cursor, len + ext, oy0, oy1, sideSign, material, true);
      // baseboard + crown on interior finished sides
      if (room && !this.isUnfinished(room)) {
        const bbMat = ctx.mats.trim;
        const segs: [number, number][] = [];
        let c = 0;
        for (const { o, t: ot } of ops) {
          if (o.bottom > 0.05) continue; // windows don't interrupt the baseboard
          segs.push([c, ot - o.w / 2]);
          c = ot + o.w / 2;
        }
        segs.push([c, len]);
        for (const [a, b] of segs) {
          if (b - a < 0.05) continue;
          const L = b - a;
          const bb = Prim.box(alongX ? L : 0.016, 0.11, alongX ? 0.016 : L, bbMat);
          const center = origin.clone().addScaledVector(axis, (a + b) / 2).addScaledVector(normal, sideSign * (t / 2 + 0.008));
          bb.position.set(center.x, yBottom + 0.055, center.z);
          ctx.batch.add(bb, { worldUV: true });
        }
        // crown molding
        const cr = Prim.box(alongX ? len : 0.05, 0.06, alongX ? 0.05 : len, bbMat);
        const cc = origin.clone().addScaledVector(axis, len / 2).addScaledVector(normal, sideSign * (t / 2 + 0.025));
        cr.position.set(cc.x, yTop - 0.03, cc.z);
        ctx.batch.add(cr, { worldUV: true });
      }
    };

    buildSkin(1, matPos, roomPos);
    buildSkin(-1, matNeg, roomNeg);

    // openings: frames, doors, windows
    for (const { o } of ops) {
      const centerAlong = alongX ? o.x - wall.x0 : o.z - wall.z0;
      const cpos = origin.clone().addScaledVector(axis, centerAlong);
      this.buildOpening(wall, o, alongX, cpos, normal, axis, yBottom, t, roomPos, roomNeg);
    }
  }

  private buildOpening(wall: WallDef, o: OpeningDef, alongX: boolean, cpos: THREE.Vector3, normal: THREE.Vector3, axis: THREE.Vector3, yBottom: number, t: number, roomPos: RoomDef | null, roomNeg: RoomDef | null) {
    const ctx = this.ctx;
    const mats = ctx.mats;
    const trim = mats.trim;
    const yb = yBottom + o.bottom, yt = yb + o.h;
    const jambDepth = t + 0.02;

    const addBar = (alongPos: number, y: number, w: number, h: number, depth: number, mat: THREE.Material, offsetNormal = 0, collide = false) => {
      const m = Prim.box(alongX ? w : depth, h, alongX ? depth : w, mat);
      const c = cpos.clone().addScaledVector(axis, alongPos).addScaledVector(normal, offsetNormal);
      m.position.set(c.x, y, c.z);
      ctx.batch.add(m, { worldUV: true });
      if (collide) ctx.physics.addBox(m.position, { x: alongX ? w : depth, y: h, z: alongX ? depth : w });
      return m;
    };

    if (o.kind === 'door' || o.kind === 'exteriorDoor') {
      // jambs
      const jamb = 0.03;
      addBar(-o.w / 2 + jamb / 2, (yb + yt) / 2, jamb, o.h, jambDepth, trim, 0, true);
      addBar(o.w / 2 - jamb / 2, (yb + yt) / 2, jamb, o.h, jambDepth, trim, 0, true);
      addBar(0, yt - jamb / 2, o.w, jamb, jambDepth, trim, 0, true);
      // casing both sides (only on finished rooms / exterior)
      for (const [sign, room] of [[1, roomPos], [-1, roomNeg]] as [number, RoomDef | null][]) {
        if (this.isUnfinished(room)) continue;
        const cw = 0.08, cd = 0.018;
        const off = sign * (t / 2 + cd / 2);
        addBar(-o.w / 2 - cw / 2 + 0.005, (yb + yt + cw) / 2, cw, o.h + cw, cd, trim, off);
        addBar(o.w / 2 + cw / 2 - 0.005, (yb + yt + cw) / 2, cw, o.h + cw, cd, trim, off);
        addBar(0, yt + cw / 2, o.w + 2 * cw - 0.01, cw + 0.02, cd, trim, off);
      }
      // threshold for exterior doors
      if (o.kind === 'exteriorDoor') addBar(0, yb + 0.012, o.w, 0.024, t + 0.06, mats.oak, 0, false);
      const door = new Door(ctx, o, alongX, yBottom, t, { exterior: o.kind === 'exteriorDoor' });
      ctx.interact.add(door);
      if (o.id) this.doors.set(o.id, door);
    } else if (o.kind === 'arch' || o.kind === 'passage') {
      const jamb = 0.03;
      addBar(-o.w / 2 + jamb / 2, (yb + yt) / 2, jamb, o.h, jambDepth, trim, 0, true);
      addBar(o.w / 2 - jamb / 2, (yb + yt) / 2, jamb, o.h, jambDepth, trim, 0, true);
      addBar(0, yt - jamb / 2, o.w, jamb, jambDepth, trim, 0, true);
      for (const [sign, room] of [[1, roomPos], [-1, roomNeg]] as [number, RoomDef | null][]) {
        if (this.isUnfinished(room)) continue;
        const cw = 0.09, cd = 0.018;
        const off = sign * (t / 2 + cd / 2);
        addBar(-o.w / 2 - cw / 2 + 0.005, (yb + yt + cw) / 2, cw, o.h + cw, cd, trim, off);
        addBar(o.w / 2 + cw / 2 - 0.005, (yb + yt + cw) / 2, cw, o.h + cw, cd, trim, off);
        addBar(0, yt + cw / 2, o.w + 2 * cw - 0.01, cw + 0.02, cd, trim, off);
      }
    } else if (o.kind === 'window' || o.kind === 'basementWindow') {
      const frameMat = o.kind === 'basementWindow' ? mats.paintedMetal(0xcfcfcf) : mats.trim;
      const f = 0.05; // frame width
      const fd = t + 0.02;
      // outer frame
      addBar(-o.w / 2 + f / 2, (yb + yt) / 2, f, o.h, fd, frameMat, 0, true);
      addBar(o.w / 2 - f / 2, (yb + yt) / 2, f, o.h, fd, frameMat, 0, true);
      addBar(0, yt - f / 2, o.w, f, fd, frameMat, 0, true);
      addBar(0, yb + f / 2, o.w, f, fd, frameMat, 0, true);
      // sash + mullions
      const style = o.style ?? 'single';
      const iw = o.w - 2 * f, ih = o.h - 2 * f;
      const sash = 0.028;
      const gd = 0.02;
      if (style === 'double' || style === 'wide') {
        addBar(0, (yb + yt) / 2, sash, ih, t * 0.6, frameMat, 0); // centre mullion
      }
      if (style !== 'frosted') addBar(0, (yb + yt) / 2 + ih * 0.02, iw, sash, t * 0.6, frameMat, 0); // meeting rail
      if (style === 'wide') {
        addBar(-iw / 3, (yb + yt) / 2, sash * 0.6, ih, t * 0.5, frameMat, 0);
        addBar(iw / 3, (yb + yt) / 2, sash * 0.6, ih, t * 0.5, frameMat, 0);
      }
      // glass
      const glassMat = style === 'frosted' ? mats.glassFrosted : mats.glassClear;
      const glass = Prim.box(alongX ? iw : gd, ih, alongX ? gd : iw, glassMat, { cast: false, receive: false });
      glass.position.set(cpos.x, (yb + yt) / 2, cpos.z);
      glass.renderOrder = 10;
      ctx.dynamic.add(glass);
      this.windows.push(glass);
      ctx.physics.addBox(glass.position, { x: alongX ? iw : t, y: ih, z: alongX ? t : iw }, 0, { meta: { surface: 'glass' } });
      // sills and casing on finished interior sides; exterior trim outside
      for (const [sign, room] of [[1, roomPos], [-1, roomNeg]] as [number, RoomDef | null][]) {
        const outside = room === null;
        if (this.isUnfinished(room)) continue;
        const cw = outside ? 0.1 : 0.07, cd = outside ? 0.03 : 0.018;
        const off = sign * (t / 2 + cd / 2);
        const cm = outside ? mats.trim : trim;
        addBar(-o.w / 2 - cw / 2 + 0.005, (yb + yt) / 2 + cw / 4, cw, o.h + cw / 2, cd, cm, off);
        addBar(o.w / 2 + cw / 2 - 0.005, (yb + yt) / 2 + cw / 4, cw, o.h + cw / 2, cd, cm, off);
        addBar(0, yt + cw / 2, o.w + 2 * cw - 0.01, cw + 0.01, cd, cm, off);
        // sill
        const sillD = outside ? 0.09 : 0.11;
        addBar(0, yb - 0.015, o.w + 2 * cw + 0.02, 0.03, sillD, cm, sign * (t / 2 + sillD / 2 - 0.01), true);
        if (outside && o.kind === 'window' && (style === 'double' || style === 'wide')) {
          // shutters
          const shMat = mats.solid(0x2f4a3a, { roughness: 0.6 });
          for (const s of [-1, 1]) {
            const sh = Prim.box(alongX ? 0.3 : 0.03, o.h + 0.08, alongX ? 0.03 : 0.3, shMat);
            const c = cpos.clone().addScaledVector(axis, s * (o.w / 2 + cw + 0.16)).addScaledVector(normal, sign * (t / 2 + 0.02));
            sh.position.set(c.x, (yb + yt) / 2, c.z);
            ctx.batch.add(sh, { worldUV: true });
            for (let k = 0; k < 6; k++) {
              const slat = Prim.box(alongX ? 0.24 : 0.015, 0.02, alongX ? 0.015 : 0.24, shMat);
              slat.position.set(c.x + normal.x * sign * 0.02, yb + 0.1 + k * ((o.h - 0.2) / 5), c.z + normal.z * sign * 0.02);
              ctx.batch.add(slat);
            }
          }
        }
      }
    }
  }

  // ------------------------------------------------------------------------------------------
  // Floors, ceilings, slabs
  // ------------------------------------------------------------------------------------------

  private buildFloorsAndCeilings(floor: FloorId) {
    const ctx = this.ctx;
    const lvl = LEVELS[floor];
    const above: FloorId | null = floor === 'basement' ? 'ground' : floor === 'ground' ? 'upper' : null;
    const holesHere = FLOOR_HOLES[floor];
    const holesAbove = above ? FLOOR_HOLES[above] : [];
    for (const room of ROOMS.filter((r) => r.floor === floor)) {
      const rect: Rect = [room.x0, room.z0, room.x1, room.z1];
      // floor
      for (const r of rectMinusHoles(rect, holesHere)) {
        const w = r[2] - r[0], d = r[3] - r[1];
        const mat = this.floorMaterial(room);
        const p = Prim.plane(w, d, mat, { cast: false });
        p.position.set((r[0] + r[2]) / 2, lvl.y + 0.001, (r[1] + r[3]) / 2);
        ctx.batch.add(p, { worldUV: true });
        ctx.physics.addBox({ x: p.position.x, y: lvl.y - 0.15, z: p.position.z }, { x: w + 0.02, y: 0.3, z: d + 0.02 }, 0, { meta: { surface: room.floorMat } });
      }
      // ceiling
      const ceilY = lvl.y + lvl.ceiling;
      if (this.isUnfinished(room)) {
        // exposed joists with subfloor above
        const sub = Prim.plane(rect[2] - rect[0], rect[3] - rect[1], ctx.mats.pine, { cast: false });
        sub.rotation.x = Math.PI; // face down
        sub.position.set((rect[0] + rect[2]) / 2, ceilY + 0.24, (rect[1] + rect[3]) / 2);
        ctx.batch.add(sub, { worldUV: true });
        for (let x = rect[0] + 0.2; x < rect[2]; x += 0.4) {
          const j = Prim.box(0.045, 0.24, rect[3] - rect[1], ctx.mats.pine);
          j.position.set(x, ceilY + 0.12, (rect[1] + rect[3]) / 2);
          ctx.batch.add(j, { worldUV: true });
        }
      } else {
        for (const r of rectMinusHoles(rect, holesAbove)) {
          const w = r[2] - r[0], d = r[3] - r[1];
          const p = Prim.plane(w, d, ctx.mats.ceiling, { cast: false });
          p.rotation.x = Math.PI; // face down
          p.position.set((r[0] + r[2]) / 2, ceilY - 0.001, (r[1] + r[3]) / 2);
          ctx.batch.add(p, { worldUV: true });
        }
      }
      // ceiling colliders (keep thrown props inside), leaving the stair openings free
      for (const r of rectMinusHoles(rect, holesAbove)) {
        ctx.physics.addBox({ x: (r[0] + r[2]) / 2, y: ceilY + 0.15, z: (r[1] + r[3]) / 2 }, { x: r[2] - r[0], y: 0.3, z: r[3] - r[1] });
      }
    }
    // slab edges at holes on this floor (visible band between the floor below's ceiling and this floor)
    for (const h of holesHere) {
      const slabTop = lvl.y, slabBot = lvl.y - lvl.slab;
      const mat = ctx.mats.trim;
      const edges: [number, number, number, number][] = [
        [h[0], h[1], h[2], h[1]], [h[0], h[3], h[2], h[3]], [h[0], h[1], h[0], h[3]], [h[2], h[1], h[2], h[3]],
      ];
      for (const e of edges) {
        const alongX = e[1] === e[3];
        const L = alongX ? e[2] - e[0] : e[3] - e[1];
        const b = Prim.box(alongX ? L : 0.02, slabTop - slabBot, alongX ? 0.02 : L, mat);
        b.position.set((e[0] + e[2]) / 2, (slabTop + slabBot) / 2, (e[1] + e[3]) / 2);
        ctx.batch.add(b, { worldUV: true });
      }
    }
  }

  private buildAtticFloor() {
    // nothing above the upper ceiling is visible from inside; the roof closes it from outside.
  }

  // ------------------------------------------------------------------------------------------
  // Stairs & railings
  // ------------------------------------------------------------------------------------------

  private buildStairs(s: typeof STAIRS[number]) {
    const ctx = this.ctx;
    const w = s.x1 - s.x0;
    const riser = (s.yTop - s.yBottom) / s.risers;
    const treadMat = ctx.mats.oak;
    const riserMat = ctx.mats.trim;
    const stringerMat = ctx.mats.trim;
    const cx = (s.x0 + s.x1) / 2;
    const nTreads = s.risers - 1;
    for (let i = 0; i < nTreads; i++) {
      const y0 = s.yBottom, y1 = s.yBottom + (i + 1) * riser;
      const zA = s.zStart + s.dir * i * s.tread, zB = s.zStart + s.dir * (i + 1) * s.tread;
      const zc = (zA + zB) / 2;
      // solid block (riser face + underside)
      const block = Prim.box(w, y1 - y0 - 0.035, s.tread, riserMat);
      block.position.set(cx, (y0 + y1 - 0.035) / 2, zc);
      ctx.batch.add(block, { worldUV: true });
      // tread with a nosing overhang
      const tread = Prim.rbox(w + 0.02, 0.035, s.tread + 0.03, 0.008, treadMat);
      tread.position.set(cx, y1 - 0.0175, zc - s.dir * 0.015);
      ctx.batch.add(tread);
    }
    // one smooth ramp collider through the nosings (extended one tread into the lower floor so there is no lip)
    {
      const zBottom = s.zStart - s.dir * s.tread;
      const zTop = s.zStart + s.dir * nTreads * s.tread;
      ctx.physics.addStairRamp(s.x0, s.x1, zBottom, s.yBottom, zTop, s.yTop, { surface: 'oak', stairs: true });
    }
    // stringers (side boards) along the run
    const runLen = nTreads * s.tread;
    const zMid = s.zStart + s.dir * runLen / 2;
    const angle = Math.atan2(s.yTop - s.yBottom - riser, runLen);
    const stringerLen = Math.hypot(runLen, s.yTop - s.yBottom - riser);
    for (const x of [s.x0 + 0.02, s.x1 - 0.02]) {
      const st = Prim.box(0.04, 0.3, stringerLen + 0.3, stringerMat);
      st.position.set(x, (s.yBottom + s.yTop - riser) / 2 + 0.1, zMid);
      st.rotation.x = -s.dir * angle;
      ctx.batch.add(st);
    }
    // wall-mounted handrail on the +x side of the up stair / both sides for down stair
    const railMat = ctx.mats.walnut;
    const sides = s.id === 'up' ? [s.x1 - 0.06] : [s.x0 + 0.06, s.x1 - 0.06];
    for (const x of sides) {
      const rail = Prim.rbox(0.05, 0.05, stringerLen, 0.02, railMat);
      rail.position.set(x, (s.yBottom + s.yTop - riser) / 2 + 0.95, zMid);
      rail.rotation.x = -s.dir * angle;
      ctx.batch.add(rail);
      for (let k = 0; k <= 4; k++) {
        const f = k / 4;
        const br = Prim.box(0.03, 0.08, 0.03, ctx.mats.darkMetal);
        br.position.set(x + (x < cx ? 0.03 : -0.03), s.yBottom + riser + f * (s.yTop - 2 * riser - s.yBottom) + 0.88, s.zStart + s.dir * (0.15 + f * (runLen - 0.3)));
        ctx.batch.add(br);
      }
    }
    // newel post + balustrade on the open side at the bottom of the up stair
    if (s.id === 'up') {
      const newel = Prim.box(0.1, 1.05, 0.1, railMat);
      newel.position.set(s.x0 - 0.05, s.yBottom + 0.525, s.zStart + 0.05);
      ctx.batch.add(newel);
      const cap = Prim.sphere(0.07, railMat);
      cap.position.set(s.x0 - 0.05, s.yBottom + 1.1, s.zStart + 0.05);
      ctx.batch.add(cap);
    }
  }

  private buildRailing(floor: FloorId, x0: number, z0: number, x1: number, z1: number) {
    const ctx = this.ctx;
    const y = LEVELS[floor].y;
    const alongX = Math.abs(z1 - z0) < 1e-6;
    const L = alongX ? x1 - x0 : z1 - z0;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const railMat = ctx.mats.walnut;
    const balMat = ctx.mats.trim;
    const top = Prim.rbox(alongX ? L + 0.1 : 0.07, 0.05, alongX ? 0.07 : L + 0.1, 0.02, railMat);
    top.position.set(cx, y + 0.95, cz);
    ctx.batch.add(top);
    const shoe = Prim.box(alongX ? L : 0.06, 0.04, alongX ? 0.06 : L, railMat);
    shoe.position.set(cx, y + 0.02, cz);
    ctx.batch.add(shoe);
    const n = Math.max(2, Math.round(L / 0.12));
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const b = Prim.box(0.025, 0.9, 0.025, balMat);
      b.position.set(alongX ? x0 + f * L : cx, y + 0.47, alongX ? cz : z0 + f * L);
      ctx.batch.add(b);
    }
    for (const [px, pz] of [[x0, z0], [x1, z1]]) {
      const post = Prim.box(0.09, 1.0, 0.09, railMat);
      post.position.set(px, y + 0.5, pz);
      ctx.batch.add(post);
      const cap = Prim.sphere(0.06, railMat);
      cap.position.set(px, y + 1.04, pz);
      ctx.batch.add(cap);
    }
    ctx.physics.addBox({ x: cx, y: y + 0.5, z: cz }, { x: alongX ? L : 0.08, y: 1.0, z: alongX ? 0.08 : L });
  }

  // ------------------------------------------------------------------------------------------
  // Roof, chimney, porch
  // ------------------------------------------------------------------------------------------

  private buildRoof() {
    const ctx = this.ctx;
    const e = HOUSE.eave;
    const x0 = HOUSE.x0 - e, x1 = HOUSE.x1 + e;
    const halfSpan = (HOUSE.z1 - HOUSE.z0) / 2 + e; // 6.6
    const rise = HOUSE.roofPeak - HOUSE.roofBase; // 3.4
    const slopeLen = Math.hypot(halfSpan, rise);
    const angle = Math.atan2(rise, halfSpan);
    const thick = 0.22;
    const L = x1 - x0;
    for (const side of [1, -1]) {
      const g = new THREE.BoxGeometry(L, thick, slopeLen + 0.1);
      const m = new THREE.Mesh(g, ctx.mats.shingles);
      m.castShadow = true; m.receiveShadow = true;
      const zc = side * halfSpan / 2;
      m.position.set(0, HOUSE.roofBase + rise / 2 + thick / 2 * Math.cos(angle), zc);
      m.rotation.x = -side * angle;
      metricUV(m.geometry, 1, 1);
      // rotate UVs so shingle rows run along X: metricUV picks (x, y or z) for the tilted top face; fine.
      ctx.batch.add(m, { worldUV: false });
      m.updateWorldMatrix(true, false);
      ctx.physics.addTrimesh(g, m.matrixWorld);
      // soffit (underside board at the eave)
      const soffit = Prim.box(L, 0.04, e + 0.3, ctx.mats.trim, { cast: false });
      soffit.position.set(0, HOUSE.roofBase - 0.02, side * (HOUSE.z1 - e / 2 + 0.05));
      ctx.batch.add(soffit, { worldUV: true });
      // fascia
      const fascia = Prim.box(L, 0.24, 0.05, ctx.mats.trim);
      fascia.position.set(0, HOUSE.roofBase + 0.08, side * (halfSpan + HOUSE.z1 - halfSpan + 0.03) * 1 + side * 0.0);
      fascia.position.z = side * (HOUSE.z1 + e + 0.02);
      ctx.batch.add(fascia, { worldUV: true });
      // gutter
      const gutter = Prim.box(L, 0.12, 0.12, ctx.mats.paintedMetal(0xe8e8e4));
      gutter.position.set(0, HOUSE.roofBase + 0.02, side * (HOUSE.z1 + e + 0.1));
      ctx.batch.add(gutter);
    }
    // ridge cap
    const ridge = Prim.box(L, 0.1, 0.35, ctx.mats.shingles);
    ridge.position.set(0, HOUSE.roofPeak + thick / 2 * Math.cos(angle) + 0.02, 0);
    ctx.batch.add(ridge);
    // gable ends (triangles) with siding
    for (const side of [1, -1]) {
      const shape = new THREE.Shape();
      shape.moveTo(-halfSpan + e, HOUSE.roofBase - 0.05);
      shape.lineTo(halfSpan - e, HOUSE.roofBase - 0.05);
      shape.lineTo(0, HOUSE.roofPeak);
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, { depth: HOUSE.extWall, bevelEnabled: false });
      // shape is in (z, y) plane -> rotate so it faces ±x
      g.rotateY(-Math.PI / 2);
      const m = new THREE.Mesh(g, ctx.mats.siding(0xdfe3dc));
      m.castShadow = true; m.receiveShadow = true;
      m.position.set(side === 1 ? HOUSE.x1 - HOUSE.extWall : HOUSE.x0, 0, 0);
      ctx.batch.add(m, { worldUV: true });
      // attic vent
      const vent = Prim.box(0.05, 0.6, 0.45, ctx.mats.trim);
      vent.position.set(side === 1 ? HOUSE.x1 + 0.01 : HOUSE.x0 - 0.01, HOUSE.roofBase + 1.6, 0);
      ctx.batch.add(vent);
      // downspouts
      for (const z of [HOUSE.z0 - e - 0.05, HOUSE.z1 + e + 0.05]) {
        const ds = Prim.box(0.08, HOUSE.roofBase - HOUSE.groundY, 0.08, ctx.mats.paintedMetal(0xe8e8e4));
        ds.position.set(side * (HOUSE.x1 + 0.1), (HOUSE.roofBase + HOUSE.groundY) / 2, z * 0.98);
        ctx.batch.add(ds);
      }
    }
    // gable trim boards along the rake
    for (const side of [1, -1]) {
      for (const s2 of [1, -1]) {
        const rake = Prim.box(0.06, 0.2, slopeLen, ctx.mats.trim);
        rake.position.set(side * (x1 + 0.0), HOUSE.roofBase + rise / 2 + 0.1, s2 * halfSpan / 2);
        rake.rotation.x = -s2 * angle;
        ctx.batch.add(rake);
      }
    }
  }

  private buildChimney() {
    const ctx = this.ctx;
    const zc = 3.0, w = 1.6, d = 0.7;
    const x = HOUSE.x0 - d / 2 + 0.02;
    const top = HOUSE.roofPeak + 0.9;
    const bottom = HOUSE.groundY - 0.2;
    const body = Prim.box(d, top - bottom, w, ctx.mats.brick);
    body.position.set(x, (top + bottom) / 2, zc);
    ctx.batch.add(body, { worldUV: true });
    ctx.physics.addBox(body.position, { x: d, y: top - bottom, z: w });
    const cap = Prim.box(d + 0.16, 0.12, w + 0.16, ctx.mats.concrete);
    cap.position.set(x, top + 0.06, zc);
    ctx.batch.add(cap, { worldUV: true });
    for (const dz of [-0.35, 0.35]) {
      const flue = Prim.cylinder(0.14, 0.16, 0.3, ctx.mats.tex('concreteDark'));
      flue.position.set(x, top + 0.27, zc + dz);
      ctx.batch.add(flue);
    }
  }

  private buildPorch() {
    const ctx = this.ctx;
    const mats = ctx.mats;
    const { x0, x1, z0, z1 } = PORCH;
    const w = x1 - x0, d = z1 - z0;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    // deck boards
    const deck = Prim.box(w, 0.06, d, mats.tex('greyPlank', { normalScale: 0.8, envMapIntensity: 0.4 }));
    deck.position.set(cx, -0.03, cz);
    ctx.batch.add(deck, { worldUV: true });
    ctx.physics.addBox({ x: cx, y: -0.2, z: cz }, { x: w, y: 0.4, z: d }, 0, { meta: { surface: 'oak' } });
    // skirt / foundation under deck
    const skirt = Prim.box(w, -HOUSE.groundY - 0.05, d, mats.tex('concrete', { color: 0xbdbcb8 }));
    skirt.position.set(cx, HOUSE.groundY / 2 - 0.05, cz);
    ctx.batch.add(skirt, { worldUV: true });
    // steps down to the walk (front)
    const steps = 5, rise = -HOUSE.groundY / steps, tread = 0.3;
    const sw = 1.8;
    for (let i = 0; i < steps; i++) {
      const y1 = -(i + 1) * rise + 0.0;
      const z = z1 + i * tread + tread / 2;
      const block = Prim.box(sw, -HOUSE.groundY - (i + 1) * rise + rise + 0.001, tread, mats.tex('concrete', { color: 0xc8c7c2 }));
      const h = -HOUSE.groundY - (i + 1) * rise + rise;
      block.position.set(0, HOUSE.groundY + h / 2, z);
      ctx.batch.add(block, { worldUV: true });
      void y1;
    }
    // ramp collider for the porch steps (from the deck edge down to the walk)
    ctx.physics.addStairRamp(-sw / 2, sw / 2, z1, 0, z1 + steps * tread, HOUSE.groundY, { surface: 'concrete', stairs: true });
    // columns and roof
    const colMat = mats.trim;
    const cols: [number, number][] = [[x0 + 0.25, z1 - 0.25], [x1 - 0.25, z1 - 0.25], [x0 + 0.25, z0 + 0.5], [x1 - 0.25, z0 + 0.5]];
    for (const [px, pz] of cols) {
      const c = Prim.box(0.22, PORCH.roofY, 0.22, colMat);
      c.position.set(px, PORCH.roofY / 2, pz);
      ctx.batch.add(c, { worldUV: true });
      const base = Prim.box(0.3, 0.12, 0.3, colMat);
      base.position.set(px, 0.06, pz);
      ctx.batch.add(base);
      const capB = Prim.box(0.3, 0.1, 0.3, colMat);
      capB.position.set(px, PORCH.roofY - 0.05, pz);
      ctx.batch.add(capB);
      ctx.physics.addBox({ x: px, y: PORCH.roofY / 2, z: pz }, { x: 0.22, y: PORCH.roofY, z: 0.22 });
    }
    // porch roof: shallow shed roof
    const roofD = d + 0.5, roofW = w + 0.6;
    const beam = Prim.box(roofW, 0.25, 0.2, colMat);
    beam.position.set(cx, PORCH.roofY + 0.12, z1 + 0.05);
    ctx.batch.add(beam, { worldUV: true });
    // shed roof: starts just outside the house wall and slopes down toward the street
    const ang = 0.26;
    const roofLen = (z1 + 0.35 - (HOUSE.z1 + HOUSE.extWall / 2)) / Math.cos(ang);
    const prGeo = new THREE.BoxGeometry(roofW, 0.16, roofLen);
    prGeo.translate(0, 0, roofLen / 2);
    const pr = new THREE.Mesh(prGeo, mats.shingles);
    pr.castShadow = true; pr.receiveShadow = true;
    pr.position.set(cx, PORCH.roofY + 0.32 + Math.sin(ang) * roofLen, HOUSE.z1 + HOUSE.extWall / 2 + 0.01);
    pr.rotation.x = ang;
    metricUV(pr.geometry, 1, 1);
    ctx.batch.add(pr);
    // flashing board where the porch roof meets the wall
    const flash = Prim.box(roofW, 0.2, 0.05, mats.trim);
    flash.position.set(cx, PORCH.roofY + 0.32 + Math.sin(ang) * roofLen + 0.05, HOUSE.z1 + HOUSE.extWall / 2 + 0.03);
    ctx.batch.add(flash, { worldUV: true });
    const ceil = Prim.box(roofW, 0.05, roofD, mats.beadboard, { cast: false });
    ceil.position.set(cx, PORCH.roofY + 0.24, z0 + roofD / 2 - 0.2);
    ctx.batch.add(ceil, { worldUV: true });
    // railing around deck (except the step opening)
    const railMat = colMat;
    const runs: [number, number, number, number][] = [
      [x0, z1, -sw / 2 - 0.1, z1], [sw / 2 + 0.1, z1, x1, z1], [x0, z0 + 0.5, x0, z1], [x1, z0 + 0.5, x1, z1],
    ];
    for (const [ax, az, bx, bz] of runs) {
      const alongX = Math.abs(bz - az) < 1e-6;
      const L = alongX ? bx - ax : bz - az;
      if (L < 0.2) continue;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2;
      const top = Prim.rbox(alongX ? L : 0.08, 0.06, alongX ? 0.08 : L, 0.02, railMat);
      top.position.set(mx, 0.95, mz);
      ctx.batch.add(top);
      const bot = Prim.box(alongX ? L : 0.06, 0.05, alongX ? 0.06 : L, railMat);
      bot.position.set(mx, 0.12, mz);
      ctx.batch.add(bot);
      const n = Math.max(1, Math.round(L / 0.13));
      for (let i = 1; i < n; i++) {
        const f = i / n;
        const b = Prim.box(0.03, 0.8, 0.03, railMat);
        b.position.set(alongX ? ax + f * L : mx, 0.53, alongX ? mz : az + f * L);
        ctx.batch.add(b);
      }
      ctx.physics.addBox({ x: mx, y: 0.5, z: mz }, { x: alongX ? L : 0.08, y: 1.0, z: alongX ? 0.08 : L });
    }
    // porch light by the door + house number
    const lamp = Prim.box(0.14, 0.26, 0.12, mats.darkMetal);
    lamp.position.set(0.85, 2.05, HOUSE.z1 + 0.2);
    ctx.batch.add(lamp);
    const bulbOn = mats.emissive(0xffd9a0, 0.9, 0xfff2dd);
    const bulbOff = mats.glassFrosted;
    const bulb = Prim.box(0.1, 0.18, 0.08, bulbOn, { cast: false });
    bulb.position.set(0.85, 2.05, HOUSE.z1 + 0.2);
    ctx.dynamic.add(bulb);
    const porchLight = ctx.lights.point(0.85, 2.0, HOUSE.z1 + 0.5, { intensity: 10, distance: 7, color: 0xffd0a0, group: 'porch', on: true, emissives: [{ mesh: bulb, on: bulbOn, off: bulbOff }] });
    // porch light comes on automatically at dusk
    ctx.onUpdate(() => { const want = ctx.daylight() < 0.5; if (porchLight.on !== want) ctx.lights.setOn(porchLight, want); });
    const num = Prim.quad(0.36, 0.14, mats.image(ctx.tex.label('1224', { bg: '#2b2b2b', fg: '#e9c46a', w: 512, h: 200 })), { keepUV: true, cast: false });
    num.position.set(-0.85, 1.9, HOUSE.z1 + 0.17);
    ctx.dynamic.add(num);
    // doormat
    const mat = Prim.box(0.8, 0.02, 0.5, mats.tex('carpet', { color: 0x6b5a3e }));
    mat.position.set(0, 0.01, HOUSE.z1 + 0.6);
    ctx.batch.add(mat);
  }
}
