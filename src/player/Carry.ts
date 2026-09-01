/**
 * Pick up / carry / throw dynamic props.
 */
import * as THREE from 'three';
import { RAPIER, GROUP, groups } from '../core/Physics';
import type { Physics } from '../core/Physics';
import type { Pickup } from '../world/Props';
import type { AudioManager } from '../core/Audio';

export class CarrySystem {
  held: Pickup | null = null;
  private holdPoint = new THREE.Vector3();
  onChange?: (held: Pickup | null) => void;

  constructor(private physics: Physics, private audio: AudioManager) {}

  pickUp(p: Pickup) {
    if (this.held) this.drop();
    this.held = p;
    p.held = true;
    const body = p.dyn.body;
    body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    p.dyn.collider.setCollisionGroups(groups(GROUP.PROP, GROUP.STATIC));
    this.audio.play('pickup', p.object.getWorldPosition(new THREE.Vector3()));
    this.onChange?.(p);
  }

  private release(): Pickup | null {
    const p = this.held;
    if (!p) return null;
    this.held = null;
    p.held = false;
    const body = p.dyn.body;
    body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    p.dyn.collider.setCollisionGroups(groups(GROUP.PROP, GROUP.ALL));
    body.wakeUp();
    this.onChange?.(null);
    return p;
  }

  drop() {
    const p = this.release();
    if (!p) return;
    p.dyn.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    p.dyn.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.audio.play('drop', p.object.getWorldPosition(new THREE.Vector3()));
  }

  throw(dir: THREE.Vector3, power = 9) {
    const p = this.release();
    if (!p) return;
    const v = dir.clone().normalize().multiplyScalar(power / Math.max(0.4, Math.sqrt(p.dyn.mass)));
    v.y += 1.2;
    p.dyn.body.setLinvel({ x: v.x, y: v.y, z: v.z }, true);
    p.dyn.body.setAngvel({ x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6, z: (Math.random() - 0.5) * 6 }, true);
    this.audio.play('pickup', undefined, 0.5);
  }

  /** Move the held object to a point in front of the camera each fixed step. */
  fixedUpdate(headPos: THREE.Vector3, camDir: THREE.Vector3, camQuat: THREE.Quaternion) {
    if (!this.held) return;
    const d = this.held.dyn;
    const flat = camDir.clone();
    // hold point ~0.75m ahead, slightly below eye level, keep it from entering walls
    const target = headPos.clone().addScaledVector(flat, 0.8);
    target.y -= 0.35;
    const frac = this.physics.sphereCastFraction(headPos, target, 0.12, undefined, undefined);
    this.holdPoint.lerpVectors(headPos, target, Math.max(0.3, frac));
    const cur = d.body.translation();
    const next = new THREE.Vector3(cur.x, cur.y, cur.z).lerp(this.holdPoint, 0.55);
    d.body.setNextKinematicTranslation({ x: next.x, y: next.y, z: next.z });
    // face the camera
    const q = new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(d.body.rotation().x, d.body.rotation().y, d.body.rotation().z, d.body.rotation().w), camQuat, 0.25);
    d.body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
  }
}
