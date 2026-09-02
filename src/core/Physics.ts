/**
 * Rapier physics wrapper: static colliders for the house, dynamic props with render interpolation,
 * kinematic bodies for doors, and query helpers for the camera and interaction system.
 */
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export const GROUP = {
  STATIC: 0x0001,   // walls, floors, large furniture
  PLAYER: 0x0002,
  PROP: 0x0004,     // small dynamic props (camera ignores these)
  DOOR: 0x0008,
  ALL: 0xffff,
};

/** membership << 16 | filter */
export const groups = (membership: number, filter: number) => ((membership & 0xffff) << 16) | (filter & 0xffff);

export interface DynamicObject {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  mesh: THREE.Object3D;
  prevPos: THREE.Vector3;
  prevQuat: THREE.Quaternion;
  currPos: THREE.Vector3;
  currQuat: THREE.Quaternion;
  /** offset of the mesh origin relative to the body centre */
  offset: THREE.Vector3;
  name: string;
  mass: number;
}

const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();

export class Physics {
  world!: RAPIER.World;
  readonly dynamics: DynamicObject[] = [];
  readonly fixedDt = 1 / 60;
  private accumulator = 0;
  private colliderMeta = new Map<number, any>();
  eventQueue!: RAPIER.EventQueue;
  onCollision?: (a: RAPIER.Collider, b: RAPIER.Collider, started: boolean) => void;

  static async create(): Promise<Physics> {
    await RAPIER.init();
    const p = new Physics();
    p.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    p.world.timestep = p.fixedDt;
    p.eventQueue = new RAPIER.EventQueue(true);
    return p;
  }

  /** Attach arbitrary metadata to a collider (e.g. surface type or interactable). */
  setMeta(collider: RAPIER.Collider, meta: any) {
    this.colliderMeta.set(collider.handle, meta);
  }
  getMeta(collider: RAPIER.Collider | number): any {
    return this.colliderMeta.get(typeof collider === 'number' ? collider : collider.handle);
  }

  // -------------------------------------------------------------------------------------------
  // Static colliders
  // -------------------------------------------------------------------------------------------

  /** Axis-aligned (or rotated about Y) static box. `size` is full extents. */
  addBox(center: THREE.Vector3 | { x: number; y: number; z: number }, size: { x: number; y: number; z: number }, rotY = 0, opts: { friction?: number; group?: number; meta?: any; sensor?: boolean } = {}): RAPIER.Collider {
    const desc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
      .setTranslation(center.x, center.y, center.z)
      .setFriction(opts.friction ?? 0.8)
      .setCollisionGroups(groups(opts.group ?? GROUP.STATIC, GROUP.ALL));
    if (rotY) {
      _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      desc.setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w });
    }
    if (opts.sensor) desc.setSensor(true);
    const c = this.world.createCollider(desc);
    if (opts.meta) this.setMeta(c, opts.meta);
    return c;
  }

  /** Static box with an arbitrary orientation (ramps, roofs). */
  addBoxQuat(center: { x: number; y: number; z: number }, size: { x: number; y: number; z: number }, quat: THREE.Quaternion, opts: { friction?: number; group?: number; meta?: any } = {}): RAPIER.Collider {
    const desc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
      .setTranslation(center.x, center.y, center.z)
      .setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w })
      .setFriction(opts.friction ?? 0.8)
      .setCollisionGroups(groups(opts.group ?? GROUP.STATIC, GROUP.ALL));
    const c = this.world.createCollider(desc);
    if (opts.meta) this.setMeta(c, opts.meta);
    return c;
  }

  /**
   * Invisible ramp collider for a straight flight of stairs (smooth to walk, no per-step bumps).
   * The ramp surface passes through the tread nosings from (zBottom, yBottom) to (zTop, yTop).
   */
  addStairRamp(x0: number, x1: number, zBottom: number, yBottom: number, zTop: number, yTop: number, meta: any = { surface: 'oak' }): RAPIER.Collider {
    // The slab is symmetric, but the rotation below only yields an upward face when the length
    // axis has a positive z component; for a flight climbing toward -z, swap the endpoints so the
    // solid stays UNDER the treads instead of on top of them.
    if (zTop < zBottom) {
      [zBottom, zTop] = [zTop, zBottom];
      [yBottom, yTop] = [yTop, yBottom];
    }
    const dz = zTop - zBottom, dy = yTop - yBottom;
    const len = Math.hypot(dz, dy);
    const thick = 0.3;
    // local +z of the box should point along (0, dy, dz); rotation about X by theta maps +z to (0, -sin, cos)
    const theta = Math.atan2(-dy, dz);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), theta);
    const n = new THREE.Vector3(0, 1, 0).applyQuaternion(q); // ramp normal (up)
    const mid = new THREE.Vector3((x0 + x1) / 2, (yBottom + yTop) / 2, (zBottom + zTop) / 2).addScaledVector(n, -thick / 2);
    return this.addBoxQuat(mid, { x: x1 - x0, y: thick, z: len }, q, { meta });
  }

  /** Static box from a world-space bounding box. */
  addBoxFromBounds(box: THREE.Box3, opts: { friction?: number; group?: number; meta?: any } = {}): RAPIER.Collider {
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    return this.addBox(c, s, 0, opts);
  }

  /** Static box collider matching a mesh's local box of given size, using the mesh world transform. */
  addBoxForObject(obj: THREE.Object3D, size: { x: number; y: number; z: number }, localCenter = new THREE.Vector3(), opts: { friction?: number; group?: number; meta?: any } = {}): RAPIER.Collider {
    obj.updateWorldMatrix(true, false);
    const pos = localCenter.clone().applyMatrix4(obj.matrixWorld);
    const q = obj.getWorldQuaternion(new THREE.Quaternion());
    const desc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
      .setTranslation(pos.x, pos.y, pos.z)
      .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
      .setFriction(opts.friction ?? 0.8)
      .setCollisionGroups(groups(opts.group ?? GROUP.STATIC, GROUP.ALL));
    const c = this.world.createCollider(desc);
    if (opts.meta) this.setMeta(c, opts.meta);
    return c;
  }

  /** Static cylinder (axis Y). */
  addCylinder(center: { x: number; y: number; z: number }, radius: number, height: number, opts: { friction?: number; group?: number; meta?: any } = {}): RAPIER.Collider {
    const desc = RAPIER.ColliderDesc.cylinder(height / 2, radius)
      .setTranslation(center.x, center.y, center.z)
      .setFriction(opts.friction ?? 0.8)
      .setCollisionGroups(groups(opts.group ?? GROUP.STATIC, GROUP.ALL));
    const c = this.world.createCollider(desc);
    if (opts.meta) this.setMeta(c, opts.meta);
    return c;
  }

  /** Static triangle mesh from geometry (world matrix applied). Use sparingly (roofs, terrain). */
  addTrimesh(geometry: THREE.BufferGeometry, matrix?: THREE.Matrix4, opts: { friction?: number; group?: number; meta?: any } = {}): RAPIER.Collider {
    let g = geometry.index ? geometry : geometry.clone();
    if (!g.index) {
      const idx = new Uint32Array(g.attributes.position.count);
      for (let i = 0; i < idx.length; i++) idx[i] = i;
      g.setIndex(new THREE.BufferAttribute(idx, 1));
    }
    const pos = g.attributes.position as THREE.BufferAttribute;
    const verts = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i);
      if (matrix) _v.applyMatrix4(matrix);
      verts[i * 3] = _v.x; verts[i * 3 + 1] = _v.y; verts[i * 3 + 2] = _v.z;
    }
    const indices = new Uint32Array(g.index!.array as ArrayLike<number>);
    const desc = RAPIER.ColliderDesc.trimesh(verts, indices)
      .setFriction(opts.friction ?? 0.8)
      .setCollisionGroups(groups(opts.group ?? GROUP.STATIC, GROUP.ALL));
    const c = this.world.createCollider(desc);
    if (opts.meta) this.setMeta(c, opts.meta);
    return c;
  }

  /** Heightfield terrain (nrows x ncols samples over scale extents), centred at `center`. */
  addHeightfield(nrows: number, ncols: number, heights: Float32Array, scale: { x: number; y: number; z: number }, center: { x: number; y: number; z: number }, opts: { friction?: number } = {}): RAPIER.Collider {
    const desc = RAPIER.ColliderDesc.heightfield(nrows, ncols, heights, scale)
      .setTranslation(center.x, center.y, center.z)
      .setFriction(opts.friction ?? 0.9)
      .setCollisionGroups(groups(GROUP.STATIC, GROUP.ALL));
    return this.world.createCollider(desc);
  }

  // -------------------------------------------------------------------------------------------
  // Dynamic props
  // -------------------------------------------------------------------------------------------

  /**
   * Register a dynamic prop. `shape` describes the collider in the mesh's local frame; the body is
   * created at the mesh's current world position/rotation.
   */
  addDynamic(mesh: THREE.Object3D, shape: { type: 'box'; size: THREE.Vector3 } | { type: 'sphere'; radius: number } | { type: 'cylinder'; radius: number; height: number } | { type: 'capsule'; radius: number; height: number }, opts: { mass?: number; friction?: number; restitution?: number; name?: string; offset?: THREE.Vector3; damping?: number; meta?: any; ccd?: boolean } = {}): DynamicObject {
    mesh.updateWorldMatrix(true, false);
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    mesh.matrixWorld.decompose(pos, quat, scl);
    const offset = opts.offset ?? new THREE.Vector3();
    const bodyPos = pos.clone().add(offset.clone().applyQuaternion(quat));
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(bodyPos.x, bodyPos.y, bodyPos.z)
      .setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w })
      .setLinearDamping(opts.damping ?? 0.15)
      .setAngularDamping(opts.damping !== undefined ? opts.damping * 2 : 0.4)
      .setCanSleep(true);
    if (opts.ccd) bodyDesc.setCcdEnabled(true);
    const body = this.world.createRigidBody(bodyDesc);
    let cd: RAPIER.ColliderDesc;
    switch (shape.type) {
      case 'box': cd = RAPIER.ColliderDesc.cuboid(shape.size.x / 2, shape.size.y / 2, shape.size.z / 2); break;
      case 'sphere': cd = RAPIER.ColliderDesc.ball(shape.radius); break;
      case 'cylinder': cd = RAPIER.ColliderDesc.cylinder(shape.height / 2, shape.radius); break;
      case 'capsule': cd = RAPIER.ColliderDesc.capsule(shape.height / 2, shape.radius); break;
    }
    cd.setMass(opts.mass ?? 1)
      .setFriction(opts.friction ?? 0.7)
      .setRestitution(opts.restitution ?? 0.2)
      .setCollisionGroups(groups(GROUP.PROP, GROUP.ALL))
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const collider = this.world.createCollider(cd, body);
    const d: DynamicObject = {
      body, collider, mesh,
      prevPos: bodyPos.clone(), currPos: bodyPos.clone(),
      prevQuat: quat.clone(), currQuat: quat.clone(),
      offset: offset.clone(), name: opts.name ?? mesh.name ?? 'prop', mass: opts.mass ?? 1,
    };
    this.dynamics.push(d);
    this.setMeta(collider, { dynamic: d, ...(opts.meta ?? {}) });
    mesh.userData.dynamic = d;
    return d;
  }

  /** Kinematic body (doors, moving platforms). Returns body; you drive it with setNextKinematic*. */
  addKinematicBox(center: THREE.Vector3, size: THREE.Vector3, quat: THREE.Quaternion, opts: { group?: number; meta?: any; friction?: number } = {}): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    const bd = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(center.x, center.y, center.z)
      .setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });
    const body = this.world.createRigidBody(bd);
    const cd = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
      .setFriction(opts.friction ?? 0.5)
      .setCollisionGroups(groups(opts.group ?? GROUP.DOOR, GROUP.ALL));
    const collider = this.world.createCollider(cd, body);
    if (opts.meta) this.setMeta(collider, opts.meta);
    return { body, collider };
  }

  remove(d: DynamicObject) {
    const i = this.dynamics.indexOf(d);
    if (i >= 0) this.dynamics.splice(i, 1);
    this.colliderMeta.delete(d.collider.handle);
    this.world.removeRigidBody(d.body);
  }

  // -------------------------------------------------------------------------------------------
  // Stepping
  // -------------------------------------------------------------------------------------------

  /** Advance the simulation with a fixed timestep. `beforeStep` runs once per sub-step (character control). */
  step(dt: number, beforeStep?: (fixedDt: number) => void): number {
    this.accumulator += Math.min(dt, 0.1);
    let steps = 0;
    while (this.accumulator >= this.fixedDt && steps < 5) {
      for (const d of this.dynamics) {
        d.prevPos.copy(d.currPos);
        d.prevQuat.copy(d.currQuat);
      }
      beforeStep?.(this.fixedDt);
      this.world.step(this.eventQueue);
      if (this.onCollision) {
        this.eventQueue.drainCollisionEvents((h1, h2, started) => {
          const c1 = this.world.getCollider(h1), c2 = this.world.getCollider(h2);
          if (c1 && c2) this.onCollision!(c1, c2, started);
        });
      }
      for (const d of this.dynamics) {
        const t = d.body.translation();
        const r = d.body.rotation();
        d.currPos.set(t.x, t.y, t.z);
        d.currQuat.set(r.x, r.y, r.z, r.w);
      }
      this.accumulator -= this.fixedDt;
      steps++;
    }
    if (steps === 5) this.accumulator = 0;
    return this.accumulator / this.fixedDt; // interpolation alpha
  }

  /** Copy interpolated body transforms to meshes. */
  sync(alpha: number) {
    for (const d of this.dynamics) {
      if (d.body.isSleeping() && d.prevPos.equals(d.currPos)) {
        // still: write the exact transform once
      }
      _v.lerpVectors(d.prevPos, d.currPos, alpha);
      _q.slerpQuaternions(d.prevQuat, d.currQuat, alpha);
      const off = d.offset.clone().applyQuaternion(_q);
      d.mesh.position.copy(_v).sub(off);
      d.mesh.quaternion.copy(_q);
    }
  }

  // -------------------------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------------------------

  /** Ray cast. Returns hit distance and collider, or null. */
  raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number, filterGroups = groups(GROUP.ALL, GROUP.STATIC | GROUP.DOOR | GROUP.PROP), exclude?: RAPIER.RigidBody): { distance: number; collider: RAPIER.Collider; point: THREE.Vector3; normal: THREE.Vector3 } | null {
    const ray = new RAPIER.Ray({ x: origin.x, y: origin.y, z: origin.z }, { x: dir.x, y: dir.y, z: dir.z });
    const hit = this.world.castRayAndGetNormal(ray, maxDist, true, undefined, filterGroups, undefined, exclude);
    if (!hit) return null;
    const p = ray.pointAt(hit.timeOfImpact);
    return {
      distance: hit.timeOfImpact,
      collider: hit.collider,
      point: new THREE.Vector3(p.x, p.y, p.z),
      normal: new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z),
    };
  }

  /** Sphere cast from `from` toward `to`. Returns the fraction [0,1] of the way it can travel before touching STATIC geometry. */
  sphereCastFraction(from: THREE.Vector3, to: THREE.Vector3, radius: number, filterGroups = groups(GROUP.ALL, GROUP.STATIC), exclude?: RAPIER.RigidBody): number {
    const dir = to.clone().sub(from);
    const len = dir.length();
    if (len < 1e-5) return 1;
    dir.divideScalar(len);
    const shape = new RAPIER.Ball(radius);
    const hit = this.world.castShape(
      { x: from.x, y: from.y, z: from.z },
      { x: 0, y: 0, z: 0, w: 1 },
      { x: dir.x, y: dir.y, z: dir.z },
      shape,
      0,
      len,
      true,
      undefined,
      filterGroups,
      undefined,
      exclude,
    );
    if (!hit) return 1;
    return Math.max(0, Math.min(1, hit.time_of_impact / len));
  }
}

export { RAPIER };
