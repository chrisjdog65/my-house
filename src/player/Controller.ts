/**
 * Third-person character controller on top of Rapier's KinematicCharacterController.
 * Smooth acceleration, sprint, crouch, jump with coyote time and input buffering,
 * step climbing, slope handling, and render interpolation.
 */
import * as THREE from 'three';
import { Physics, RAPIER, GROUP, groups } from '../core/Physics';
import type { Input } from '../core/Input';
import { Character } from './Character';
import type { AudioManager } from '../core/Audio';

export const WALK_SPEED = 2.3;
export const RUN_SPEED = 5.2;
export const CROUCH_SPEED = 1.1;

export class PlayerController {
  readonly position = new THREE.Vector3(); // feet, interpolated for rendering
  private prevPos = new THREE.Vector3();
  private currPos = new THREE.Vector3();
  yaw = 0; // facing direction (radians), +Z forward when 0
  velocity = new THREE.Vector3(); // horizontal
  verticalVel = 0;
  grounded = true;
  crouching = false;
  sprinting = false;
  private wasGrounded = true;
  private coyote = 0;
  private jumpBuffer = 0;
  private body: RAPIER.RigidBody;
  private collider: RAPIER.Collider;
  private cc: RAPIER.KinematicCharacterController;
  readonly radius = 0.28;
  /** rounded-cylinder half height (flat bottom climbs stairs cleanly; the border keeps it from snagging) */
  readonly halfHeight = 0.82;
  readonly border = 0.06;
  character: Character;
  private footAcc = 0;
  private surface = 'wood';
  private airTime = 0;
  speed = 0;
  /** camera yaw provided each frame so movement is camera relative */
  cameraYaw = 0;
  moveInput = new THREE.Vector2();
  private landImpulse = 0;
  lastGroundSurface = 'oak';
  private headOffset = new THREE.Vector3();

  constructor(private physics: Physics, private input: Input, private audio: AudioManager, spawn: THREE.Vector3, yaw: number) {
    this.character = new Character();
    this.position.copy(spawn);
    this.prevPos.copy(spawn);
    this.currPos.copy(spawn);
    this.yaw = yaw;
    const c = this.capsuleCenter(spawn);
    const bd = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(c.x, c.y, c.z);
    this.body = physics.world.createRigidBody(bd);
    const cd = RAPIER.ColliderDesc.roundCylinder(this.halfHeight, this.radius, this.border)
      .setCollisionGroups(groups(GROUP.PLAYER, GROUP.ALL))
      .setFriction(0.0);
    this.collider = physics.world.createCollider(cd, this.body);
    physics.setMeta(this.collider, { player: true });
    this.cc = physics.world.createCharacterController(0.03);
    this.cc.enableAutostep(0.38, 0.1, true);
    this.cc.enableSnapToGround(0.35);
    // stair nosings produce steep edge contacts; allow them, but still slide off true walls
    this.cc.setMaxSlopeClimbAngle((72 * Math.PI) / 180);
    this.cc.setMinSlopeSlideAngle((78 * Math.PI) / 180);
    this.cc.setApplyImpulsesToDynamicBodies(true);
    this.cc.setCharacterMass(78);
    this.cc.setSlideEnabled(true);
  }

  get rigidBody() { return this.body; }

  /** distance from the feet to the collider centre */
  private get centerOffset() { return this.halfHeight + this.border + 0.01; }

  private capsuleCenter(feet: THREE.Vector3) {
    return new THREE.Vector3(feet.x, feet.y + this.centerOffset, feet.z);
  }

  /** Teleport */
  setPosition(p: THREE.Vector3, yaw?: number) {
    this.position.copy(p); this.prevPos.copy(p); this.currPos.copy(p);
    const c = this.capsuleCenter(p);
    this.body.setTranslation({ x: c.x, y: c.y, z: c.z }, true);
    this.body.setNextKinematicTranslation({ x: c.x, y: c.y, z: c.z });
    this.velocity.set(0, 0, 0);
    this.verticalVel = 0;
    if (yaw !== undefined) this.yaw = yaw;
  }

  /** Called once per render frame BEFORE physics stepping, to gather input. */
  gatherInput(dt: number) {
    const ax = this.input.axes;
    this.moveInput.set(ax.moveX, ax.moveY);
    this.sprinting = this.input.isDown('sprint') && ax.moveY > 0.2 && !this.crouching;
    if (this.input.justPressed('crouch')) this.crouching = !this.crouching;
    if (this.input.justPressed('jump')) this.jumpBuffer = 0.14;
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
  }

  /** Fixed-step update (called by Physics.step's beforeStep). */
  fixedUpdate(dt: number) {
    this.prevPos.copy(this.currPos);
    // desired horizontal velocity relative to camera yaw
    const mx = this.moveInput.x, my = this.moveInput.y;
    const len = Math.hypot(mx, my);
    const targetSpeed = this.crouching ? CROUCH_SPEED : this.sprinting ? RUN_SPEED : WALK_SPEED;
    const desired = new THREE.Vector3();
    if (len > 0.001) {
      const sin = Math.sin(this.cameraYaw), cos = Math.cos(this.cameraYaw);
      // camera forward (on ground) = (sin(yaw), 0, cos(yaw))
      const fwd = new THREE.Vector3(sin, 0, cos);
      const right = new THREE.Vector3(cos, 0, -sin);
      desired.addScaledVector(fwd, my).addScaledVector(right, mx);
      desired.normalize().multiplyScalar(targetSpeed * Math.min(1, len));
    }
    const accel = this.grounded ? (len > 0.001 ? 24 : 30) : 6;
    const k = 1 - Math.exp(-accel * dt / 3);
    this.velocity.x += (desired.x - this.velocity.x) * k;
    this.velocity.z += (desired.z - this.velocity.z) * k;
    if (this.velocity.lengthSq() < 1e-6) this.velocity.set(0, 0, 0);

    // facing: turn toward movement direction
    if (desired.lengthSq() > 0.01) {
      const targetYaw = Math.atan2(desired.x, desired.z);
      let d = targetYaw - this.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const turn = 1 - Math.exp(-dt * (this.sprinting ? 9 : 12));
      this.yaw += d * turn;
    }

    // gravity & jump
    if (this.grounded) { this.coyote = 0.12; if (this.verticalVel < 0) this.verticalVel = -1.0; }
    else this.coyote = Math.max(0, this.coyote - dt);
    if (this.jumpBuffer > 0 && this.coyote > 0 && !this.crouching) {
      this.verticalVel = 4.6;
      this.jumpBuffer = 0; this.coyote = 0;
      this.grounded = false;
      this.audio.play('jump');
    }
    this.verticalVel -= 9.81 * dt * (this.verticalVel < 0 ? 1.35 : 1.0);
    this.verticalVel = Math.max(this.verticalVel, -20);

    const move = new THREE.Vector3(this.velocity.x * dt, this.verticalVel * dt, this.velocity.z * dt);
    this.cc.computeColliderMovement(this.collider, { x: move.x, y: move.y, z: move.z }, undefined, groups(GROUP.PLAYER, GROUP.STATIC | GROUP.DOOR | GROUP.PROP));
    const cm = this.cc.computedMovement();
    const t = this.body.translation();
    const next = { x: t.x + cm.x, y: t.y + cm.y, z: t.z + cm.z };
    this.body.setNextKinematicTranslation(next);
    const wasGrounded = this.grounded;
    this.grounded = this.cc.computedGrounded();
    if (this.grounded && this.verticalVel < 0 && cm.y > move.y - 1e-4) this.verticalVel = -0.5;
    if (!this.grounded && cm.y > move.y + 1e-4 && this.verticalVel > 0) this.verticalVel = 0; // hit head
    // landing
    if (this.grounded && !wasGrounded) {
      this.landImpulse = Math.min(1, this.airTime * 2);
      if (this.airTime > 0.25) this.audio.play('land', undefined, Math.min(1, this.airTime));
      this.airTime = 0;
    }
    if (!this.grounded) this.airTime += dt;
    this.currPos.set(next.x, next.y - this.centerOffset, next.z);
    this.wasGrounded = wasGrounded;
  }

  /** Per render frame: interpolate and animate. */
  update(dt: number, alpha: number) {
    this.position.lerpVectors(this.prevPos, this.currPos, alpha);
    this.speed = Math.hypot(this.velocity.x, this.velocity.z);
    this.character.root.position.copy(this.position);
    this.character.root.rotation.y = this.yaw;
    // crouch: dip the model a bit
    const crouchDip = this.crouching ? -0.25 : 0;
    this.character.root.position.y += crouchDip * 0 ;
    this.character.root.scale.y = 1 + (this.crouching ? -0.12 : 0);
    this.character.update(dt, this.speed, WALK_SPEED, RUN_SPEED, this.grounded);
    // footsteps
    if (this.grounded && this.speed > 0.3) {
      this.footAcc += this.speed * dt;
      const stride = this.sprinting ? 1.55 : 0.85;
      if (this.footAcc > stride) {
        this.footAcc = 0;
        this.playFootstep();
      }
    } else this.footAcc = 0.5;
    this.landImpulse = Math.max(0, this.landImpulse - dt * 3);
  }

  get landBob() { return this.landImpulse; }

  private playFootstep() {
    // surface below the feet
    const hit = this.physics.raycast(this.position.clone().add(new THREE.Vector3(0, 0.3, 0)), new THREE.Vector3(0, -1, 0), 0.8, groups(GROUP.PLAYER, GROUP.STATIC));
    let surface = 'oak';
    if (hit) {
      const meta = this.physics.getMeta(hit.collider);
      if (meta?.surface) surface = meta.surface;
    }
    this.lastGroundSurface = surface;
    const vol = this.sprinting ? 1 : 0.6;
    switch (surface) {
      case 'tile': case 'tileDark': case 'tileCheck': case 'glass': this.audio.play('footstepTile', undefined, vol); break;
      case 'carpet': case 'carpetBlue': this.audio.play('footstepCarpet', undefined, vol); break;
      case 'concrete': case 'asphalt': case 'pavers': this.audio.play('footstepConcrete', undefined, vol); break;
      case 'grass': case 'soil': this.audio.play('footstepGrass', undefined, vol); break;
      default: this.audio.play('footstepWood', undefined, vol);
    }
  }

  /** forward unit vector on the ground plane */
  get forward() {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  get headPosition() {
    return this.headOffset.set(this.position.x, this.position.y + (this.crouching ? 1.25 : 1.6), this.position.z);
  }
}
