/**
 * Geometry building helpers and static batching.
 *
 * Conventions:
 *  - Units are metres. Y is up.
 *  - `Prim.*` create meshes with metric UVs (1 texture repeat = material.userData.texSize metres).
 *  - Static scenery goes through `StaticBatch.add()` which merges geometry per material into a
 *    handful of draw calls (big perf win for hundreds of furniture parts).
 *  - Anything animated or interactable stays a normal Mesh added to the scene directly.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m3 = new THREE.Matrix3();

/**
 * Compute box-projected ("triplanar-per-face") UVs from vertex positions. Works on any geometry:
 * each vertex is projected onto the plane best aligned with its normal, in metres / texSize.
 * If `matrix` is given, positions & normals are transformed first (world-space alignment).
 */
export function metricUV(geometry: THREE.BufferGeometry, texSize = 1, texSizeV = texSize, matrix?: THREE.Matrix4, rotate = false): THREE.BufferGeometry {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  let nor = geometry.attributes.normal as THREE.BufferAttribute | undefined;
  if (!nor) { geometry.computeVertexNormals(); nor = geometry.attributes.normal as THREE.BufferAttribute; }
  const uv = new Float32Array(pos.count * 2);
  if (matrix) _m3.getNormalMatrix(matrix);
  const su = 1 / (texSize || 1), sv = 1 / (texSizeV || texSize || 1);
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i);
    _n.fromBufferAttribute(nor, i);
    if (matrix) { _v.applyMatrix4(matrix); _n.applyMatrix3(_m3).normalize(); }
    const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
    let u: number, v: number;
    if (ay >= ax && ay >= az) { u = _v.x; v = _v.z; }
    else if (ax >= az) { u = _v.z; v = _v.y; }
    else { u = _v.x; v = _v.y; }
    if (rotate) { const t = u; u = v; v = t; }
    uv[i * 2] = u * su;
    uv[i * 2 + 1] = v * sv;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

/** Scale existing UVs (for lathe/cylinder geometry that should tile in metres). */
export function scaleUV(geometry: THREE.BufferGeometry, su: number, sv: number): THREE.BufferGeometry {
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  if (!uv) return geometry;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return geometry;
}

export interface MeshOpts {
  /** cast shadows (default true) */
  cast?: boolean;
  /** receive shadows (default true) */
  receive?: boolean;
  /** keep the geometry's own UVs (for image-mapped meshes) */
  keepUV?: boolean;
  name?: string;
}

function finishMesh(mesh: THREE.Mesh, material: THREE.Material, opts: MeshOpts) {
  mesh.castShadow = opts.cast ?? true;
  mesh.receiveShadow = opts.receive ?? true;
  if (opts.name) mesh.name = opts.name;
  const ts = material.userData?.texSize;
  if (!opts.keepUV && ts) metricUV(mesh.geometry, ts, material.userData.texSizeV ?? ts, undefined, !!material.userData.rotate);
  return mesh;
}

export const Prim = {
  /** Box centred at origin. */
  box(w: number, h: number, d: number, material: THREE.Material, opts: MeshOpts = {}): THREE.Mesh {
    const g = new THREE.BoxGeometry(w, h, d);
    return finishMesh(new THREE.Mesh(g, material), material, opts);
  },
  /** Box with its bottom at y=0 (handy for furniture on the floor). */
  boxUp(w: number, h: number, d: number, material: THREE.Material, opts: MeshOpts = {}): THREE.Mesh {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(0, h / 2, 0);
    return finishMesh(new THREE.Mesh(g, material), material, opts);
  },
  /** Rounded box (bevelled edges) centred at origin. */
  rbox(w: number, h: number, d: number, radius: number, material: THREE.Material, opts: MeshOpts & { segments?: number } = {}): THREE.Mesh {
    const r = Math.min(radius, w / 2, h / 2, d / 2);
    const g = new RoundedBoxGeometry(w, h, d, opts.segments ?? 3, r);
    return finishMesh(new THREE.Mesh(g, material), material, opts);
  },
  /** Rounded box with bottom at y=0 */
  rboxUp(w: number, h: number, d: number, radius: number, material: THREE.Material, opts: MeshOpts & { segments?: number } = {}): THREE.Mesh {
    const r = Math.min(radius, w / 2, h / 2, d / 2);
    const g = new RoundedBoxGeometry(w, h, d, opts.segments ?? 3, r);
    g.translate(0, h / 2, 0);
    return finishMesh(new THREE.Mesh(g, material), material, opts);
  },
  /** Cylinder along Y, centred. */
  cylinder(rTop: number, rBottom: number, h: number, material: THREE.Material, opts: MeshOpts & { segments?: number; open?: boolean } = {}): THREE.Mesh {
    const g = new THREE.CylinderGeometry(rTop, rBottom, h, opts.segments ?? 24, 1, opts.open ?? false);
    const m = new THREE.Mesh(g, material);
    m.castShadow = opts.cast ?? true; m.receiveShadow = opts.receive ?? true;
    const ts = material.userData?.texSize;
    if (!opts.keepUV && ts) scaleUV(g, (Math.PI * (rTop + rBottom)) / ts, h / ts);
    if (opts.name) m.name = opts.name;
    return m;
  },
  /** Cylinder with bottom at y=0 */
  cylinderUp(rTop: number, rBottom: number, h: number, material: THREE.Material, opts: MeshOpts & { segments?: number; open?: boolean } = {}): THREE.Mesh {
    const m = Prim.cylinder(rTop, rBottom, h, material, opts);
    m.geometry.translate(0, h / 2, 0);
    return m;
  },
  sphere(r: number, material: THREE.Material, opts: MeshOpts & { segments?: number } = {}): THREE.Mesh {
    const g = new THREE.SphereGeometry(r, opts.segments ?? 24, Math.max(8, Math.round((opts.segments ?? 24) * 0.66)));
    const m = new THREE.Mesh(g, material);
    m.castShadow = opts.cast ?? true; m.receiveShadow = opts.receive ?? true;
    const ts = material.userData?.texSize;
    if (!opts.keepUV && ts) scaleUV(g, (2 * Math.PI * r) / ts, (Math.PI * r) / ts);
    if (opts.name) m.name = opts.name;
    return m;
  },
  /** Capsule along Y, centred */
  capsule(r: number, length: number, material: THREE.Material, opts: MeshOpts = {}): THREE.Mesh {
    const g = new THREE.CapsuleGeometry(r, length, 6, 16);
    const m = new THREE.Mesh(g, material);
    m.castShadow = opts.cast ?? true; m.receiveShadow = opts.receive ?? true;
    if (opts.name) m.name = opts.name;
    return m;
  },
  /** Lathe (profile of [radius, y] points) */
  lathe(points: [number, number][], material: THREE.Material, opts: MeshOpts & { segments?: number } = {}): THREE.Mesh {
    const g = new THREE.LatheGeometry(points.map((p) => new THREE.Vector2(p[0], p[1])), opts.segments ?? 32);
    const m = new THREE.Mesh(g, material);
    m.castShadow = opts.cast ?? true; m.receiveShadow = opts.receive ?? true;
    const ts = material.userData?.texSize;
    if (!opts.keepUV && ts) {
      const maxR = Math.max(...points.map((p) => p[0]));
      const h = Math.max(...points.map((p) => p[1])) - Math.min(...points.map((p) => p[1]));
      scaleUV(g, (2 * Math.PI * maxR) / ts, h / ts);
    }
    if (opts.name) m.name = opts.name;
    return m;
  },
  /** Flat plane in XZ facing +Y, centred, w along X, d along Z. */
  plane(w: number, d: number, material: THREE.Material, opts: MeshOpts = {}): THREE.Mesh {
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    return finishMesh(new THREE.Mesh(g, material), material, opts);
  },
  /** Vertical quad facing +Z, centred, w along X, h along Y. */
  quad(w: number, h: number, material: THREE.Material, opts: MeshOpts = {}): THREE.Mesh {
    const g = new THREE.PlaneGeometry(w, h);
    return finishMesh(new THREE.Mesh(g, material), material, opts);
  },
  /** Extruded 2D shape along +Z (depth), centred on Z. */
  extrude(shape: THREE.Shape, depth: number, material: THREE.Material, opts: MeshOpts & { bevel?: number; curveSegments?: number } = {}): THREE.Mesh {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: (opts.bevel ?? 0) > 0,
      bevelThickness: opts.bevel ?? 0,
      bevelSize: opts.bevel ?? 0,
      bevelSegments: 2,
      curveSegments: opts.curveSegments ?? 12,
    });
    g.translate(0, 0, -depth / 2);
    return finishMesh(new THREE.Mesh(g, material), material, opts);
  },
  /** Torus centred, axis along Y. */
  torus(r: number, tube: number, material: THREE.Material, opts: MeshOpts & { arc?: number } = {}): THREE.Mesh {
    const g = new THREE.TorusGeometry(r, tube, 12, 32, opts.arc ?? Math.PI * 2);
    g.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, material);
    m.castShadow = opts.cast ?? true; m.receiveShadow = opts.receive ?? true;
    if (opts.name) m.name = opts.name;
    return m;
  },
  cone(r: number, h: number, material: THREE.Material, opts: MeshOpts & { segments?: number } = {}): THREE.Mesh {
    const g = new THREE.ConeGeometry(r, h, opts.segments ?? 16);
    const m = new THREE.Mesh(g, material);
    m.castShadow = opts.cast ?? true; m.receiveShadow = opts.receive ?? true;
    if (opts.name) m.name = opts.name;
    return m;
  },
};

/**
 * Merge all meshes under `root` into one mesh per material, expressed in root's local frame.
 * Returns a new Group (with root's transform) — use it for compound dynamic objects (doors,
 * appliances, lamps) that must stay separate from the static batch but shouldn't cost a draw
 * call per part. Meshes with `userData.keepSeparate` are cloned as-is.
 */
export function mergeByMaterial(root: THREE.Object3D): THREE.Group {
  const out = new THREE.Group();
  out.position.copy(root.position);
  out.quaternion.copy(root.quaternion);
  out.scale.copy(root.scale);
  out.name = root.name;
  const wasParented = root.parent;
  root.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; cast: boolean; receive: boolean }>();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const rel = new THREE.Matrix4().multiplyMatrices(rootInv, o.matrixWorld);
    if (o.userData.keepSeparate || Array.isArray(o.material)) {
      const c = o.clone();
      c.matrix.copy(rel);
      c.matrix.decompose(c.position, c.quaternion, c.scale);
      out.add(c);
      return;
    }
    const g = o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) metricUV(g, (o.material as any).userData?.texSize || 1);
    g.applyMatrix4(rel);
    const ni = g.index ? g.toNonIndexed() : g;
    if (ni !== g) g.dispose();
    let grp = groups.get(o.material);
    if (!grp) { grp = { geos: [], cast: false, receive: false }; groups.set(o.material, grp); }
    grp.geos.push(ni);
    grp.cast = grp.cast || o.castShadow;
    grp.receive = grp.receive || o.receiveShadow;
  });
  for (const [mat, grp] of groups) {
    const merged = BufferGeometryUtils.mergeGeometries(grp.geos, false);
    for (const g of grp.geos) g.dispose();
    if (!merged) continue;
    merged.computeBoundingSphere();
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = grp.cast;
    m.receiveShadow = grp.receive;
    out.add(m);
  }
  void wasParented;
  return out;
}

/** Set position / rotation(y) on a mesh in one call and return it. */
export function place<T extends THREE.Object3D>(obj: T, x: number, y: number, z: number, rotY = 0, rotX = 0, rotZ = 0): T {
  obj.position.set(x, y, z);
  obj.rotation.set(rotX, rotY, rotZ);
  return obj;
}

/** Deterministic pseudo-random helper for placement variety. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Merges static meshes per material into as few draw calls as possible.
 * Call `add(mesh)` for each static mesh (its world matrix is baked in), then `build()` once.
 */
export class StaticBatch {
  private groups = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[]; cast: boolean; receive: boolean }>();
  private built: THREE.Mesh[] = [];
  private count = 0;

  constructor(readonly root: THREE.Object3D) {}

  /**
   * Add a mesh (or a group of meshes) to the batch. The object's current world transform is used.
   * Set `worldUV` to recompute metric UVs in world space (structure pieces so textures continue
   * seamlessly across walls/floors). Returns nothing; the object is NOT added to the scene.
   */
  add(obj: THREE.Object3D, opts: { worldUV?: boolean } = {}) {
    obj.updateWorldMatrix(true, true);
    obj.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const mesh = o as THREE.Mesh;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (mats.length !== 1) { this.addUnbatched(mesh); return; }
      const mat = mats[0];
      const g = mesh.geometry.clone();
      // drop attributes that would prevent merging
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) metricUV(g, mat.userData?.texSize || 1);
      if (opts.worldUV && mat.userData?.texSize) {
        metricUV(g, mat.userData.texSize, mat.userData.texSizeV ?? mat.userData.texSize, mesh.matrixWorld, !!mat.userData.rotate);
      }
      g.applyMatrix4(mesh.matrixWorld);
      if (g.index) {
        // non-indexed for easy merging with mixed geometries
        const ni = g.toNonIndexed();
        g.dispose();
        this.push(mat, ni, mesh.castShadow, mesh.receiveShadow);
      } else {
        this.push(mat, g, mesh.castShadow, mesh.receiveShadow);
      }
    });
  }

  private push(material: THREE.Material, g: THREE.BufferGeometry, cast: boolean, receive: boolean) {
    const key = material.uuid + (cast ? ':c' : '') + (receive ? ':r' : '');
    let grp = this.groups.get(key);
    if (!grp) { grp = { material, geometries: [], cast, receive }; this.groups.set(key, grp); }
    grp.geometries.push(g);
    this.count++;
  }

  private addUnbatched(mesh: THREE.Mesh) {
    const clone = mesh.clone();
    clone.matrix.copy(mesh.matrixWorld);
    clone.matrix.decompose(clone.position, clone.quaternion, clone.scale);
    this.root.add(clone);
  }

  /** Merge everything added so far into meshes and attach them to root. Can be called multiple times. */
  build(): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for (const [key, grp] of this.groups) {
      if (!grp.geometries.length) continue;
      // merge in chunks to keep vertex counts sane for culling
      const merged = BufferGeometryUtils.mergeGeometries(grp.geometries, false);
      for (const g of grp.geometries) g.dispose();
      grp.geometries = [];
      if (!merged) continue;
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      const mesh = new THREE.Mesh(merged, grp.material);
      mesh.castShadow = grp.cast;
      mesh.receiveShadow = grp.receive;
      mesh.name = 'batch:' + (grp.material.name || key);
      mesh.matrixAutoUpdate = false;
      this.root.add(mesh);
      out.push(mesh);
      this.built.push(mesh);
    }
    return out;
  }

  get stats() {
    return { added: this.count, meshes: this.built.length };
  }
}
